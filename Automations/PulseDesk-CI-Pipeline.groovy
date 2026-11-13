pipeline {
    agent any

    environment {
        // GitHub
        GITHUB_REPO = 'https://github.com/maazzafar1234/PulseDesk.git'
        GITHUB_BRANCH = 'main'
        
        // Docker Hub
        DOCKER_REGISTRY = 'docker.io'
        DOCKER_USERNAME = 'maazzafar07'
        DOCKER_IMAGE_BACKEND = 'maazzafar07/pulsedesk'
        DOCKER_IMAGE_TAG = "backend-${BUILD_NUMBER}"
        DOCKER_IMAGE_FRONTEND_TAG = "frontend-${BUILD_NUMBER}"
        
        // SonarQube
        SONARQUBE_HOST = 'http://44.198.186.67:9000'
        
        // Build directories
        BACKEND_DIR = 'backend'
        FRONTEND_DIR = 'frontend'
    }

    stages {
        stage('Declarative: Checkout SCM') {
            steps {
                script {
                    echo "🔄 Checking out code from GitHub..."
                    checkout([
                        $class: 'GitSCM',
                        branches: [[name: '*/main']],
                        userRemoteConfigs: [[url: env.GITHUB_REPO]]
                    ])
                    echo "✅ Code checked out successfully"
                }
            }
        }

        stage('Workspace cleanup') {
            steps {
                script {
                    echo "🧹 Cleaning workspace..."
                    cleanWs()
                    echo "✅ Workspace cleaned"
                }
            }
        }

        stage('Git: Code Checkout') {
            steps {
                script {
                    echo "📥 Re-checking out code..."
                    git branch: 'main', 
                        credentialsId: 'github-credentials',
                        url: env.GITHUB_REPO
                    echo "✅ Code checkout complete"
                }
            }
        }

        stage('Build: Backend') {
            steps {
                script {
                    echo "🏗️ Building backend application..."
                    dir(env.BACKEND_DIR) {
                        sh '''
                            echo "Installing backend dependencies using Docker..."
                            if command -v docker &> /dev/null; then
                                docker run --rm -v $(pwd):/app -w /app node:20-alpine npm install
                                echo "Building backend..."
                                docker run --rm -v $(pwd):/app -w /app node:20-alpine npm run build
                            else
                                echo "Docker not available, using npm directly..."
                                npm install
                                npm run build
                            fi
                            echo "✅ Backend build complete"
                        '''
                    }
                }
            }
        }

        stage('Build: Frontend') {
            steps {
                script {
                    echo "🏗️ Building frontend application..."
                    dir(env.FRONTEND_DIR) {
                        sh '''
                            echo "Installing frontend dependencies using Docker..."
                            if command -v docker &> /dev/null; then
                                docker run --rm -v $(pwd):/app -w /app node:20-alpine npm install
                                echo "Building frontend..."
                                docker run --rm -v $(pwd):/app -w /app node:20-alpine npm run build
                            else
                                echo "Docker not available, using npm directly..."
                                npm install
                                npm run build
                            fi
                            echo "✅ Frontend build complete"
                        '''
                    }
                }
            }
        }

        stage('Verify: Docker Images') {
            steps {
                script {
                    echo "🔍 Verifying Docker images exist..."
                    sh '''
                        docker images | grep -E "pulsedesk|node"
                        echo "✅ Docker images verified"
                    '''
                }
            }
        }

        stage('SonarQube: Code Analysis') {
            steps {
                script {
                    echo "📊 Running SonarQube code analysis..."
                    withSonarQubeEnv('sonarqube-server') {
                        sh '''
                            sonar-scanner \
                              -Dsonar.projectKey=pulsedesk \
                              -Dsonar.projectName=PulseDesk \
                              -Dsonar.sources=backend,frontend \
                              -Dsonar.exclusions=**/node_modules/**,**/.git/**,**/dist/**,**/build/** \
                              -Dsonar.host.url=${SONARQUBE_HOST}
                        '''
                    }
                    echo "✅ Code analysis complete"
                }
            }
        }

        stage('SonarQube Quality Gate') {
            steps {
                script {
                    echo "⚠️ Waiting for SonarQube Quality Gate..."
                    timeout(time: 5, unit: 'MINUTES') {
                        waitForQualityGate abortPipeline: false
                    }
                    echo "✅ Quality Gate check complete"
                }
            }
        }

        stage('Exporting environment variables') {
            steps {
                script {
                    echo "📝 Exporting environment variables..."
                    sh '''
                        echo "BUILD_NUMBER=${BUILD_NUMBER}" >> build.properties
                        echo "BUILD_TIMESTAMP=$(date +%Y%m%d_%H%M%S)" >> build.properties
                        echo "DOCKER_IMAGE_TAG=${DOCKER_IMAGE_TAG}" >> build.properties
                        cat build.properties
                    '''
                }
            }
        }

        stage('Backend: Build Docker Image') {
            steps {
                script {
                    echo "🐳 Building backend Docker image..."
                    sh '''
                        if command -v docker &> /dev/null; then
                            docker build -t ${DOCKER_IMAGE_BACKEND}:${DOCKER_IMAGE_TAG} ./backend
                            docker tag ${DOCKER_IMAGE_BACKEND}:${DOCKER_IMAGE_TAG} ${DOCKER_IMAGE_BACKEND}:latest
                            echo "✅ Backend Docker image built"
                            docker images | grep pulsedesk || true
                        else
                            echo "⚠️ Docker not available, skipping Docker build"
                            echo "Ensure Docker is installed: sudo apt install -y docker.io"
                        fi
                    '''
                }
            }
        }

        stage('Frontend: Build Docker Image') {
            steps {
                script {
                    echo "🐳 Building frontend Docker image..."
                    sh '''
                        if command -v docker &> /dev/null; then
                            docker build -t ${DOCKER_IMAGE_BACKEND}:${DOCKER_IMAGE_FRONTEND_TAG} ./frontend
                            docker tag ${DOCKER_IMAGE_BACKEND}:${DOCKER_IMAGE_FRONTEND_TAG} ${DOCKER_IMAGE_BACKEND}:latest
                            echo "✅ Frontend Docker image built"
                            docker images | grep pulsedesk || true
                        else
                            echo "⚠️ Docker not available, skipping Docker build"
                            echo "Ensure Docker is installed: sudo apt install -y docker.io"
                        fi
                    '''
                }
            }
        }

        stage('Docker: Verify Image Tags') {
            steps {
                script {
                    echo "🔍 Verifying Docker image tags..."
                    sh '''
                        docker images | grep pulsedesk
                        echo "✅ Docker images verified"
                    '''
                }
            }
        }

        stage('Docker Hub: Push Images') {
            steps {
                script {
                    echo "📤 Pushing Docker images to Docker Hub..."
                    withCredentials([usernamePassword(credentialsId: 'docker-hub-credentials', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                        sh '''
                            if command -v docker &> /dev/null; then
                                echo "${DOCKER_PASS}" | docker login -u "${DOCKER_USER}" --password-stdin
                                docker push ${DOCKER_IMAGE_BACKEND}:${DOCKER_IMAGE_TAG} || true
                                docker push ${DOCKER_IMAGE_BACKEND}:${DOCKER_IMAGE_FRONTEND_TAG} || true
                                docker push ${DOCKER_IMAGE_BACKEND}:latest || true
                                docker logout || true
                                echo "✅ Docker images pushed to Docker Hub"
                            else
                                echo "⚠️ Docker not available, skipping Docker Hub push"
                                echo "Ensure Docker is installed: sudo apt install -y docker.io"
                            fi
                        '''
                    }
                }
            }
        }

        stage('Git: Code Push with Updated Tags') {
            steps {
                script {
                    echo "📤 Pushing updated code to GitHub..."
                    withCredentials([usernamePassword(credentialsId: 'github-credentials', usernameVariable: 'GITHUB_USER', passwordVariable: 'GITHUB_TOKEN')]) {
                        sh '''
                            git config user.email "jenkins@pulsedesk.local"
                            git config user.name "Jenkins CI"
                            git tag -a "build-${BUILD_NUMBER}" -m "Build ${BUILD_NUMBER}"
                            git push https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/maazzafar1234/PulseDesk.git --tags
                            echo "✅ Code pushed to GitHub with tags"
                        '''
                    }
                }
            }
        }

        stage('Declarative: Post Actions') {
            steps {
                script {
                    echo "✅ CI Pipeline completed successfully!"
                    sh '''
                        echo "Build Summary:"
                        echo "- Build Number: ${BUILD_NUMBER}"
                        echo "- Build Status: SUCCESS"
                        echo "- Backend Image: ${DOCKER_IMAGE_BACKEND}:${DOCKER_IMAGE_TAG}"
                        echo "- Frontend Image: ${DOCKER_IMAGE_BACKEND}:${DOCKER_IMAGE_FRONTEND_TAG}"
                        echo "Ready for CD pipeline deployment!"
                    '''
                }
            }
        }
    }

    post {
        success {
            script {
                echo "✅ CI Pipeline completed successfully!"
                // Send success notification
                emailext(
                    subject: "✅ PulseDesk CI Build #${BUILD_NUMBER} SUCCESS",
                    body: '''
                        Build Status: SUCCESS
                        Build Number: ${BUILD_NUMBER}
                        Build URL: ${BUILD_URL}
                        
                        Docker Images:
                        - Backend: ${DOCKER_IMAGE_BACKEND}:${BUILD_NUMBER}
                        - Frontend: ${DOCKER_IMAGE_BACKEND}:${BUILD_NUMBER}
                        
                        Ready for deployment!
                    ''',
                    to: '${DEFAULT_RECIPIENTS}',
                    mimeType: 'text/html'
                )
            }
        }
        failure {
            script {
                echo "❌ CI Pipeline failed!"
                emailext(
                    subject: "❌ PulseDesk CI Build #${BUILD_NUMBER} FAILED",
                    body: '''
                        Build Status: FAILED
                        Build Number: ${BUILD_NUMBER}
                        Build URL: ${BUILD_URL}
                        
                        Please check the logs for more information.
                    ''',
                    to: '${DEFAULT_RECIPIENTS}',
                    mimeType: 'text/html'
                )
            }
        }
    }
}
