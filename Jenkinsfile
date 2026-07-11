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
                        sh "docker build --target test -t ${BACKEND_IMAGE}-test:${BUILD_NUMBER} ./backend"
                        sh "mkdir -p backend/test-results"
                        sh """
                            docker run --rm \
                                -v "${WORKSPACE}/backend/test-results:/src/test-results" \
                                ${BACKEND_IMAGE}-test:${BUILD_NUMBER}
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
                        sh "mkdir -p frontend/test-results"
                        sh """
                            docker run --rm \
                                -v "${WORKSPACE}/frontend/test-results:/app/test-results" \
                                ${FRONTEND_IMAGE}-test:${BUILD_NUMBER}
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
                sh "docker compose -p ${COMPOSE_PROJECT} up -d --build"
                sh """
                    for i in \$(seq 1 15); do
                        curl -sf http://localhost:5000/health && exit 0
                        sleep 2
                    done
                    echo 'Backend did not become healthy in time' >&2
                    exit 1
                """
                sh "curl -sf http://localhost:3001/ > /dev/null"
                sh "curl -sf http://localhost:3001/api/todos/ > /dev/null"
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
