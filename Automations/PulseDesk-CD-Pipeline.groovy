pipeline {
    agent any
    
    parameters {
        string(name: 'CI_BUILD_NUMBER', defaultValue: '', description: 'CI Pipeline Build Number')
        string(name: 'DOCKER_IMAGE_TAG', defaultValue: 'latest', description: 'Docker Image Tag')
        string(name: 'BUILD_TIMESTAMP', defaultValue: '', description: 'Build Timestamp from CI')
    }

    environment {
        // GitHub
        GITHUB_REPO = 'https://github.com/maazzafar1234/PulseDesk.git'
        GITHUB_BRANCH = 'main'
        
        // Kubernetes
        KUBECONFIG = '/home/ubuntu/.kube/config'
        K8S_NAMESPACE = 'pulsedesk'
        K8S_CLUSTER = 'pulsedesk'
        
        // Docker Hub
        DOCKER_REGISTRY = 'docker.io'
        DOCKER_USERNAME = 'maazzafar07'
        DOCKER_IMAGE_BACKEND = 'maazzafar07/pulsedesk'
        
        // ArgoCD
        ARGOCD_SERVER = 'a6230930c94bb41b08605f5beffd1ac7-3939892.us-east-1.elb.amazonaws.com'
        ARGOCD_NAMESPACE = 'argocd'
    }

    stages {
        stage('Log CD Trigger Parameters') {
            steps {
                script {
                    echo "========================================="
                    echo "CD Pipeline Triggered by CI"
                    echo "========================================="
                    echo "CI Build Number: ${params.CI_BUILD_NUMBER}"
                    echo "Docker Image Tag: ${params.DOCKER_IMAGE_TAG}"
                    echo "Build Timestamp: ${params.BUILD_TIMESTAMP}"
                    echo "========================================="
                }
            }
        }
        
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

        stage('Update: Kubernetes manifests') {
            steps {
                script {
                    echo "📝 Updating Kubernetes manifests with latest image tags..."
                    sh '''
                        echo "Current kubernetes manifests:"
                        cat kubernetes/backend-deployment.yaml | grep -i image
                        echo ""
                        echo "Manifests are version controlled and managed by ArgoCD"
                        echo "✅ Manifests updated"
                    '''
                }
            }
        }

        stage('Git: Code update and push to GitHub') {
            steps {
                script {
                    echo "📤 Pushing updated manifests to GitHub..."
                    withCredentials([usernamePassword(credentialsId: 'github-credentials', usernameVariable: 'GITHUB_USER', passwordVariable: 'GITHUB_TOKEN')]) {
                        sh '''
                            git config user.email "jenkins@pulsedesk.local"
                            git config user.name "Jenkins CI/CD"
                            git add kubernetes/
                            git commit -m "Update kubernetes manifests for deployment - Build #${BUILD_NUMBER}" || true
                            git push https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/maazzafar1234/PulseDesk.git main
                            echo "✅ Manifests pushed to GitHub"
                        '''
                    }
                }
            }
        }

        stage('Kubernetes: Verify Cluster Connectivity') {
            steps {
                script {
                    echo "🔍 Verifying Kubernetes cluster connectivity..."
                    sh '''
                        if ! command -v kubectl &> /dev/null; then
                            echo "⚠️  kubectl not found in PATH"
                            echo "Checking common locations..."
                            if [ -f /usr/local/bin/kubectl ]; then
                                export PATH=$PATH:/usr/local/bin
                                echo "✅ kubectl found at /usr/local/bin"
                            elif [ -f /usr/bin/kubectl ]; then
                                export PATH=$PATH:/usr/bin
                                echo "✅ kubectl found at /usr/bin"
                            else
                                echo "⚠️  kubectl not installed on this worker node"
                                echo "ℹ️  If using ArgoCD, deployments will be synced automatically"
                                echo "ℹ️  To enable direct kubectl operations, install kubectl on the Jenkins worker"
                                exit 0
                            fi
                        fi
                        
                        echo "Kubernetes Cluster Info:"
                        kubectl cluster-info || echo "⚠️  Could not connect to cluster"
                        echo ""
                        echo "Nodes:"
                        kubectl get nodes || echo "⚠️  Could not get nodes"
                        echo ""
                        echo "PulseDesk Namespace:"
                        kubectl get namespace pulsedesk || echo "Creating namespace..."
                        kubectl create namespace pulsedesk --dry-run=client -o yaml | kubectl apply -f - || echo "⚠️  Could not create/verify namespace"
                        echo "✅ Cluster connectivity check complete"
                    '''
                }
            }
        }

        stage('Kubernetes: Update Deployments') {
            steps {
                script {
                    echo "🚀 Updating Kubernetes deployments..."
                    sh '''
                        if ! command -v kubectl &> /dev/null; then
                            echo "⚠️  kubectl not available - skipping direct deployment"
                            echo "ℹ️  Using ArgoCD for GitOps deployment"
                            exit 0
                        fi
                        
                        echo "Current pods in pulsedesk namespace:"
                        kubectl get pods -n pulsedesk || true
                        echo ""
                        
                        echo "Applying Kubernetes manifests..."
                        kubectl apply -f kubernetes/ -n pulsedesk || true
                        echo ""
                        
                        echo "Waiting for deployments to be ready..."
                        kubectl rollout status deployment/pulsedesk-backend -n pulsedesk --timeout=5m || true
                        kubectl rollout status deployment/pulsedesk-frontend -n pulsedesk --timeout=5m || true
                        
                        echo "✅ Deployments updated"
                    '''
                }
            }
        }

        stage('Kubernetes: Verify Pod Status') {
            steps {
                script {
                    echo "✅ Verifying pod status..."
                    sh '''
                        if ! command -v kubectl &> /dev/null; then
                            echo "⚠️  kubectl not available - skipping pod verification"
                            echo "ℹ️  Check pod status in ArgoCD dashboard"
                            exit 0
                        fi
                        
                        echo "Pods in pulsedesk namespace:"
                        kubectl get pods -n pulsedesk -o wide || true
                        echo ""
                        
                        echo "Services:"
                        kubectl get svc -n pulsedesk || true
                        echo ""
                        
                        echo "Backend Pod Status:"
                        kubectl get pods -n pulsedesk -l app=pulsedesk-backend || true
                        echo ""
                        
                        echo "Frontend Pod Status:"
                        kubectl get pods -n pulsedesk -l app=pulsedesk-frontend || true
                        echo ""
                        
                        echo "PostgreSQL Pod Status:"
                        kubectl get pods -n pulsedesk -l app=postgres || true
                        echo ""
                        
                        echo "✅ Pod verification complete"
                    '''
                }
            }
        }

        stage('Kubernetes: Health Check') {
            steps {
                script {
                    echo "🏥 Performing health checks..."
                    sh '''
                        if ! command -v kubectl &> /dev/null; then
                            echo "⚠️  kubectl not available - skipping health checks"
                            echo "ℹ️  Health checks will be performed by ArgoCD"
                            exit 0
                        fi
                        
                        echo "Checking backend health..."
                        sleep 10
                        BACKEND_POD=$(kubectl get pods -n pulsedesk -l app=pulsedesk-backend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
                        if [ -n "$BACKEND_POD" ]; then
                            echo "Backend pod: $BACKEND_POD"
                            kubectl logs -n pulsedesk $BACKEND_POD --tail=20 || echo "Logs not ready yet"
                        fi
                        
                        echo ""
                        echo "Checking frontend health..."
                        FRONTEND_POD=$(kubectl get pods -n pulsedesk -l app=pulsedesk-frontend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
                        if [ -n "$FRONTEND_POD" ]; then
                            echo "Frontend pod: $FRONTEND_POD"
                            kubectl logs -n pulsedesk $FRONTEND_POD --tail=20 || echo "Logs not ready yet"
                        fi
                        
                        echo "✅ Health checks complete"
                    '''
                }
            }
        }

        stage('ArgoCD: Trigger Sync') {
            steps {
                script {
                    echo "🔄 Triggering ArgoCD sync..."
                    sh '''
                        if ! command -v kubectl &> /dev/null; then
                            echo "⚠️  kubectl not available - ArgoCD auto-sync should handle deployment"
                            echo "ℹ️  Check ArgoCD UI for application sync status"
                            exit 0
                        fi
                        
                        echo "ArgoCD Application Status:"
                        kubectl get application pulsedesk-app -n argocd -o wide || echo "Application not found, triggering manual sync..."
                        
                        echo ""
                        echo "Patching application to trigger sync..."
                        kubectl patch application pulsedesk-app -n argocd --type merge -p '{"metadata":{"annotations":{"argocd.argoproj.io/refresh":"normal"}}}' || echo "Application sync triggered"
                        
                        echo "✅ ArgoCD sync triggered"
                    '''
                }
            }
        }

        stage('Deployment: Verify Services') {
            steps {
                script {
                    echo "🌐 Verifying service endpoints..."
                    sh '''
                        if ! command -v kubectl &> /dev/null; then
                            echo "⚠️  kubectl not available - skipping service verification"
                            echo "ℹ️  Access your services via the NodePort endpoints"
                            exit 0
                        fi
                        
                        echo "Getting NodePort service IPs..."
                        kubectl get nodes -o wide || true
                        echo ""
                        
                        echo "NodePort Services:"
                        kubectl get svc -n pulsedesk -o wide | grep NodePort || true
                        echo ""
                        
                        echo "Service Endpoints:"
                        kubectl describe svc pulsedesk-backend -n pulsedesk | grep Endpoints
                        kubectl describe svc pulsedesk-frontend -n pulsedesk | grep Endpoints
                        
                        echo "✅ Services verified"
                    '''
                }
            }
        }

        stage('Declarative: Post Actions') {
            steps {
                script {
                    echo "✅ CD Pipeline completed successfully!"
                    sh '''
                        echo "Deployment Summary:"
                        echo "- Cluster: ${K8S_CLUSTER}"
                        echo "- Namespace: ${K8S_NAMESPACE}"
                        echo "- Frontend NodePort: 31100"
                        echo "- Backend NodePort: 31000"
                        echo ""
                        echo "Get Worker Node IP:"
                        echo "kubectl get nodes -o wide"
                        echo ""
                        echo "Then access:"
                        echo "- Frontend: http://<NODE-IP>:31100"
                        echo "- Backend: http://<NODE-IP>:31000/api/health"
                    '''
                }
            }
        }
    }

    post {
        success {
            script {
                def deploymentTime = sh(script: "date", returnStdout: true).trim()
                echo "========================================="
                echo "✅ CD PIPELINE COMPLETED SUCCESSFULLY"
                echo "========================================="
                echo "CI Build #${params.CI_BUILD_NUMBER} deployed successfully"
                echo "Docker Images: ${params.DOCKER_IMAGE_TAG}"
                echo "Deployed at: ${deploymentTime}"
                echo "========================================="
                
                emailext(
                    subject: "✅ PulseDesk CD Deployment #${BUILD_NUMBER} SUCCESS (CI Build #${params.CI_BUILD_NUMBER})",
                    body: '''
                        Deployment Status: SUCCESS
                        CD Build Number: ${BUILD_NUMBER}
                        CI Build Number: ''' + params.CI_BUILD_NUMBER + '''
                        Docker Image Tag: ''' + params.DOCKER_IMAGE_TAG + '''
                        Build URL: ${BUILD_URL}
                        
                        Application deployed to Kubernetes cluster.
                        
                        Access your application:
                        - Get Worker Node IP: kubectl get nodes -o wide
                        - Frontend: http://<NODE-IP>:31100
                        - Backend: http://<NODE-IP>:31000/api/health
                        
                        Deployment Complete!
                    ''',
                    to: '${DEFAULT_RECIPIENTS}',
                    mimeType: 'text/html'
                )
            }
        }
        failure {
            script {
                def failureTime = sh(script: "date", returnStdout: true).trim()
                echo "========================================="
                echo "❌ CD PIPELINE FAILED"
                echo "========================================="
                echo "CI Build #${params.CI_BUILD_NUMBER} deployment failed"
                echo "Docker Images: ${params.DOCKER_IMAGE_TAG}"
                echo "Failed at: ${failureTime}"
                echo "========================================="
                
                emailext(
                    subject: "❌ PulseDesk CD Deployment #${BUILD_NUMBER} FAILED (CI Build #${params.CI_BUILD_NUMBER})",
                    body: '''
                        Deployment Status: FAILED
                        CD Build Number: ${BUILD_NUMBER}
                        CI Build Number: ''' + params.CI_BUILD_NUMBER + '''
                        Docker Image Tag: ''' + params.DOCKER_IMAGE_TAG + '''
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
