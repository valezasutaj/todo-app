/**
 * Restores the last release that passed verification and the E2E suite.
 *
 * The pipeline records a "last good" image tag only after a deployment has proven
 * itself, so a failed build can always fall back to a release that was observed
 * working, instead of leaving a broken stack serving traffic.
 */
def rollbackDeployment() {
    sh '''
        set -e

        if [ ! -f "$DEPLOY_DIR/last-good-tag" ]; then
            echo "No previously verified deployment recorded - leaving the stack untouched." >&2
            exit 0
        fi

        PREVIOUS=$(cat "$DEPLOY_DIR/last-good-tag")

        if ! docker image inspect "$BACKEND_IMAGE:$PREVIOUS" >/dev/null 2>&1 \
            || ! docker image inspect "$FRONTEND_IMAGE:$PREVIOUS" >/dev/null 2>&1; then
            echo "Images for the last good tag ($PREVIOUS) are no longer on this host - cannot roll back." >&2
            exit 0
        fi

        echo "Rolling the deployment back to image tag $PREVIOUS"
        cd "$DEPLOY_DIR"
        sed -i "s/^TAG=.*/TAG=$PREVIOUS/" .env
        docker compose -p "$DEPLOY_PROJECT" -f docker-compose.prod.yml --env-file .env \
            up -d --wait --wait-timeout 180 --remove-orphans

        echo "Rollback complete - release $PREVIOUS is serving traffic again."
    '''
}

pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    triggers {
        pollSCM('H/2 * * * *')
    }

    environment {
        BACKEND_IMAGE  = 'todoapi-backend'
        FRONTEND_IMAGE = 'todoapp-frontend'
        E2E_IMAGE      = 'todoapp-e2e'

        DEPLOY_PROJECT = 'todoapp'
        // Lives outside the workspace so the deployment survives cleanWs() and
        // stays available for a rollback on a later build.
        DEPLOY_DIR     = "${env.JENKINS_HOME}/deploy/todoapp"

        APP_HOST       = "${env.SMOKE_TEST_HOST ?: 'host.docker.internal'}"
        FRONTEND_PORT  = '3001'
        BACKEND_PORT   = '5000'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Test') {
            parallel {

                stage('Backend Tests') {
                    steps {
                        sh 'docker build --target test -t "$BACKEND_IMAGE-test:$BUILD_NUMBER" ./backend'
                        sh '''
                            set +e
                            docker rm -f "backend-test-$BUILD_NUMBER" >/dev/null 2>&1
                            docker create --name "backend-test-$BUILD_NUMBER" "$BACKEND_IMAGE-test:$BUILD_NUMBER"
                            docker start -a "backend-test-$BUILD_NUMBER"
                            TEST_EXIT=$?
                            mkdir -p backend/test-results
                            docker cp "backend-test-$BUILD_NUMBER:/src/test-results/." backend/test-results/ 2>/dev/null
                            docker rm -f "backend-test-$BUILD_NUMBER" >/dev/null 2>&1
                            exit $TEST_EXIT
                        '''
                    }
                    post {
                        always {
                            junit testResults: 'backend/test-results/*.xml', allowEmptyResults: true
                        }
                    }
                }

                stage('Frontend Tests') {
                    steps {
                        sh 'docker build --target test -t "$FRONTEND_IMAGE-test:$BUILD_NUMBER" ./frontend'
                        sh '''
                            set +e
                            docker rm -f "frontend-test-$BUILD_NUMBER" >/dev/null 2>&1
                            docker create --name "frontend-test-$BUILD_NUMBER" "$FRONTEND_IMAGE-test:$BUILD_NUMBER"
                            docker start -a "frontend-test-$BUILD_NUMBER"
                            TEST_EXIT=$?
                            mkdir -p frontend/test-results
                            docker cp "frontend-test-$BUILD_NUMBER:/app/test-results/." frontend/test-results/ 2>/dev/null
                            docker rm -f "frontend-test-$BUILD_NUMBER" >/dev/null 2>&1
                            exit $TEST_EXIT
                        '''
                    }
                    post {
                        always {
                            junit testResults: 'frontend/test-results/*.xml', allowEmptyResults: true
                        }
                    }
                }
            }
        }

        stage('Build Images') {
            parallel {

                stage('Backend Image') {
                    steps {
                        sh 'docker build --target final -t "$BACKEND_IMAGE:$BUILD_NUMBER" -t "$BACKEND_IMAGE:latest" ./backend'
                    }
                }

                stage('Frontend Image') {
                    steps {
                        sh 'docker build --target final -t "$FRONTEND_IMAGE:$BUILD_NUMBER" -t "$FRONTEND_IMAGE:latest" ./frontend'
                    }
                }

                stage('E2E Image') {
                    steps {
                        sh 'docker build -t "$E2E_IMAGE:$BUILD_NUMBER" ./e2e'
                    }
                }
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    set -e

                    mkdir -p "$DEPLOY_DIR"
                    cp docker-compose.prod.yml "$DEPLOY_DIR/"

                    # The release descriptor: which images this deployment pins, and how
                    # it is exposed. Rollback rewrites TAG in this same file.
                    cat > "$DEPLOY_DIR/.env" <<EOF
TAG=$BUILD_NUMBER
BACKEND_IMAGE=$BACKEND_IMAGE
FRONTEND_IMAGE=$FRONTEND_IMAGE
BACKEND_PORT=$BACKEND_PORT
FRONTEND_PORT=$FRONTEND_PORT
CORS_ALLOWED_ORIGIN=http://localhost:$FRONTEND_PORT
EOF

                    cd "$DEPLOY_DIR"
                    # --wait blocks until every container reports healthy, so the stage
                    # fails here rather than leaving a half-started stack behind.
                    docker compose -p "$DEPLOY_PROJECT" -f docker-compose.prod.yml --env-file .env \
                        up -d --wait --wait-timeout 180 --remove-orphans

                    docker compose -p "$DEPLOY_PROJECT" -f docker-compose.prod.yml --env-file .env ps
                '''
            }
        }

        stage('Verify Deployment') {
            steps {
                // Compose already confirmed the containers are healthy on the internal
                // network; these checks prove the published host ports work too.
                sh '''
                    for i in $(seq 1 15); do
                        curl -sf "http://$APP_HOST:$BACKEND_PORT/health" >/dev/null && exit 0
                        sleep 2
                    done
                    echo "Backend did not answer on the published port in time" >&2
                    exit 1
                '''
                sh 'curl -sf "http://$APP_HOST:$FRONTEND_PORT/" > /dev/null'
                sh 'curl -sf "http://$APP_HOST:$FRONTEND_PORT/api/todos/" > /dev/null'
            }
        }

        stage('E2E Tests') {
            steps {
                // Runs on the deployment network, so the browser reaches the real
                // frontend -> nginx -> backend -> Postgres chain by service name.
                sh '''
                    set +e
                    docker rm -f "e2e-test-$BUILD_NUMBER" >/dev/null 2>&1
                    docker create --name "e2e-test-$BUILD_NUMBER" \
                        --network "${DEPLOY_PROJECT}_default" \
                        --ipc=host \
                        -e BASE_URL=http://frontend \
                        -e E2E_RUN_ID="$BUILD_NUMBER" \
                        "$E2E_IMAGE:$BUILD_NUMBER"
                    docker start -a "e2e-test-$BUILD_NUMBER"
                    TEST_EXIT=$?
                    mkdir -p e2e/test-results
                    docker cp "e2e-test-$BUILD_NUMBER:/e2e/test-results/." e2e/test-results/ 2>/dev/null
                    docker rm -f "e2e-test-$BUILD_NUMBER" >/dev/null 2>&1
                    exit $TEST_EXIT
                '''
            }
            post {
                always {
                    junit testResults: 'e2e/test-results/*.xml', allowEmptyResults: true
                    archiveArtifacts artifacts: 'e2e/test-results/**', allowEmptyArchive: true, fingerprint: false
                }
            }
        }

        stage('Promote Release') {
            steps {
                // Only now is the release trusted enough to be a rollback target.
                sh 'echo "$BUILD_NUMBER" > "$DEPLOY_DIR/last-good-tag"'
                echo "Release ${env.BUILD_NUMBER} deployed and verified: http://localhost:${env.FRONTEND_PORT}"
            }
        }
    }

    post {
        failure {
            rollbackDeployment()
        }
        cleanup {
            sh '''
                docker rmi -f "$BACKEND_IMAGE-test:$BUILD_NUMBER" "$FRONTEND_IMAGE-test:$BUILD_NUMBER" \
                    "$E2E_IMAGE:$BUILD_NUMBER" >/dev/null 2>&1 || true
            '''
            cleanWs()
        }
    }
}
