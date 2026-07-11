pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        BACKEND_IMAGE = "todoapi-backend"
        FRONTEND_IMAGE = "todoapp-frontend"
        COMPOSE_PROJECT = "todoapp-ci-${BUILD_NUMBER}"
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
                        // Uses `docker create`/`docker cp` instead of a bind-mounted volume:
                        // when Jenkins itself runs inside a container talking to the host's
                        // Docker daemon (docker-outside-of-docker), a `-v` path is resolved by
                        // the daemon's filesystem, not Jenkins' own, so bind mounts silently
                        // fail to line up. docker cp works regardless of where Jenkins runs.
                        sh "docker build --target test -t ${BACKEND_IMAGE}-test:${BUILD_NUMBER} ./backend"
                        sh """
                            set +e
                            docker rm -f backend-test-${BUILD_NUMBER} >/dev/null 2>&1
                            docker create --name backend-test-${BUILD_NUMBER} ${BACKEND_IMAGE}-test:${BUILD_NUMBER}
                            docker start -a backend-test-${BUILD_NUMBER}
                            TEST_EXIT=\$?
                            mkdir -p backend/test-results
                            docker cp backend-test-${BUILD_NUMBER}:/src/test-results/. backend/test-results/ 2>/dev/null
                            docker rm -f backend-test-${BUILD_NUMBER} >/dev/null 2>&1
                            exit \$TEST_EXIT
                        """
                    }
                    post {
                        always {
                            junit testResults: 'backend/test-results/*.xml', allowEmptyResults: true
                        }
                    }
                }

                stage('Frontend Tests') {
                    steps {
                        sh "docker build --target test -t ${FRONTEND_IMAGE}-test:${BUILD_NUMBER} ./frontend"
                        sh """
                            set +e
                            docker rm -f frontend-test-${BUILD_NUMBER} >/dev/null 2>&1
                            docker create --name frontend-test-${BUILD_NUMBER} ${FRONTEND_IMAGE}-test:${BUILD_NUMBER}
                            docker start -a frontend-test-${BUILD_NUMBER}
                            TEST_EXIT=\$?
                            mkdir -p frontend/test-results
                            docker cp frontend-test-${BUILD_NUMBER}:/app/test-results/. frontend/test-results/ 2>/dev/null
                            docker rm -f frontend-test-${BUILD_NUMBER} >/dev/null 2>&1
                            exit \$TEST_EXIT
                        """
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
            steps {
                sh "docker build --target final -t ${BACKEND_IMAGE}:${BUILD_NUMBER} ./backend"
                sh "docker build --target final -t ${FRONTEND_IMAGE}:${BUILD_NUMBER} ./frontend"
            }
        }

        stage('Integration Smoke Test') {
            steps {
                // SMOKE_TEST_HOST defaults to host.docker.internal because this pipeline
                // is designed to run from a containerized Jenkins agent talking to the host's
                // Docker daemon: published container ports land on that host, not on the
                // Jenkins container's own network namespace. Override to "localhost" if this
                // agent runs directly on the Docker host instead.
                sh "docker compose -p ${COMPOSE_PROJECT} up -d --build"
                sh """
                    HOST=\${SMOKE_TEST_HOST:-host.docker.internal}
                    for i in \$(seq 1 15); do
                        curl -sf http://\$HOST:5000/health && exit 0
                        sleep 2
                    done
                    echo 'Backend did not become healthy in time' >&2
                    exit 1
                """
                sh "HOST=\${SMOKE_TEST_HOST:-host.docker.internal}; curl -sf http://\$HOST:3001/ > /dev/null"
                sh "HOST=\${SMOKE_TEST_HOST:-host.docker.internal}; curl -sf http://\$HOST:3001/api/todos/ > /dev/null"
            }
            post {
                always {
                    sh "docker compose -p ${COMPOSE_PROJECT} down -v"
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}
