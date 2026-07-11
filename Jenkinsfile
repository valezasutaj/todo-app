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
        DEPLOY_PROJECT = 'todoapp'
        APP_HOST       = "${env.SMOKE_TEST_HOST ?: 'host.docker.internal'}"
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
                sh "docker build --target final -t ${BACKEND_IMAGE}:${BUILD_NUMBER} -t ${BACKEND_IMAGE}:latest ./backend"
                sh "docker build --target final -t ${FRONTEND_IMAGE}:${BUILD_NUMBER} -t ${FRONTEND_IMAGE}:latest ./frontend"
            }
        }

        stage('Deploy') {
            steps {
                sh "TAG=${BUILD_NUMBER} docker compose -p ${DEPLOY_PROJECT} up -d"
            }
        }

        stage('Verify Deployment') {
            steps {
                sh """
                    for i in \$(seq 1 15); do
                        curl -sf http://${APP_HOST}:5000/health && exit 0
                        sleep 2
                    done
                    echo 'Backend did not become healthy in time' >&2
                    exit 1
                """
                sh "curl -sf http://${APP_HOST}:3001/ > /dev/null"
                sh "curl -sf http://${APP_HOST}:3001/api/todos/ > /dev/null"
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}
