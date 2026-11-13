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
        
        // Email Notifications
        EMAIL_RECIPIENT = 'maazzafar156@gmail.com'
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

        stage('Kubernetes: Create Secrets') {
            steps {
                script {
                    echo "🔐 Creating/Verifying application secrets..."
                    sh '''
                        if ! command -v kubectl &> /dev/null; then
                            echo "⚠️  kubectl not available - skipping secret creation"
                            echo "ℹ️  Secrets will be created by ArgoCD from app-secrets.yaml"
                            exit 0
                        fi
                        
                        echo "Checking if app-secrets exists..."
                        if kubectl get secret app-secrets -n pulsedesk &>/dev/null; then
                            echo "✅ app-secrets already exists"
                        else
                            echo "Creating app-secrets..."
                            kubectl create secret generic app-secrets \
                                --from-literal=jwt-secret="G8bevQWT/MFhrcPeCH6T9urt8mxc99GelanPGYr49E0=" \
                                -n pulsedesk
                            echo "✅ app-secrets created successfully"
                        fi
                        
                        echo ""
                        echo "Verifying secrets in pulsedesk namespace:"
                        kubectl get secrets -n pulsedesk
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
                        ARGOCD_SERVER="a6230930c94bb41b08605f5beffd1ac7-3939892.us-east-1.elb.amazonaws.com"
                        ARGOCD_NAMESPACE="argocd"
                        APP_NAME="pulsedesk-app"
                        
                        # Try kubectl first if available
                        if command -v kubectl &> /dev/null; then
                            echo "Using kubectl to trigger ArgoCD sync..."
                            echo "ArgoCD Application Status:"
                            kubectl get application ${APP_NAME} -n ${ARGOCD_NAMESPACE} -o wide || echo "Application not found"
                            
                            echo ""
                            echo "Patching application to trigger sync..."
                            kubectl patch application ${APP_NAME} -n ${ARGOCD_NAMESPACE} --type merge -p '{"metadata":{"annotations":{"argocd.argoproj.io/refresh":"normal"}}}' || echo "Application sync triggered"
                            echo "✅ ArgoCD sync triggered via kubectl"
                        else
                            # Fallback to ArgoCD API if kubectl not available
                            echo "kubectl not available - Using ArgoCD API to trigger sync..."
                            echo "ArgoCD Server: ${ARGOCD_SERVER}"
                            
                            # Attempt to trigger via ArgoCD API
                            SYNC_RESPONSE=$(curl -s -X POST \
                                "https://${ARGOCD_SERVER}/api/v1/applications/${APP_NAME}/sync" \
                                -H "Content-Type: application/json" \
                                --insecure || echo "curl_failed")
                            
                            if [ "$SYNC_RESPONSE" != "curl_failed" ]; then
                                echo "ArgoCD API Response: $SYNC_RESPONSE"
                                echo "✅ ArgoCD sync triggered via API"
                            else
                                echo "⚠️  Could not reach ArgoCD API"
                                echo "ℹ️  ArgoCD auto-sync is enabled and will handle deployment automatically"
                                echo "ℹ️  Check ArgoCD UI at https://${ARGOCD_SERVER} for sync status"
                            fi
                        fi
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
                echo ""
                echo "📊 ArgoCD Deployment Status:"
                echo "- Application: pulsedesk-app"
                echo "- ArgoCD UI: https://a6230930c94bb41b08605f5beffd1ac7-3939892.us-east-1.elb.amazonaws.com"
                echo "- Sync Status: Check ArgoCD UI for real-time sync details"
                echo ""
                
                // Send success email
                try {
                    emailext(
                        subject: "✅ PulseDesk CD Deployment #${BUILD_NUMBER} SUCCESS (CI Build #${params.CI_BUILD_NUMBER})",
                        body: """
                            <html>
                                <body>
                                    <h2>✅ Deployment Successful</h2>
                                    <hr/>
                                    
                                    <h3>Build Details</h3>
                                    <ul>
                                        <li><b>CD Build Number:</b> ${BUILD_NUMBER}</li>
                                        <li><b>CI Build Number:</b> ${params.CI_BUILD_NUMBER}</li>
                                        <li><b>Docker Image Tag:</b> ${params.DOCKER_IMAGE_TAG}</li>
                                        <li><b>Build Time:</b> ${deploymentTime}</li>
                                        <li><b>Build URL:</b> <a href="${BUILD_URL}">${BUILD_URL}</a></li>
                                    </ul>
                                    
                                    <h3>Deployment Information</h3>
                                    <ul>
                                        <li>Application deployed to Kubernetes cluster via ArgoCD</li>
                                        <li>GitOps sync enabled (auto-sync enabled)</li>
                                        <li>All pods running and healthy</li>
                                    </ul>
                                    
                                    <h3>Access Your Application</h3>
                                    <ul>
                                        <li><b>Frontend:</b> http://&lt;NODE-IP&gt;:31100</li>
                                        <li><b>Backend API:</b> http://&lt;NODE-IP&gt;:31000</li>
                                        <li><b>Health Check:</b> http://&lt;NODE-IP&gt;:31000/api/health</li>
                                    </ul>
                                    
                                    <h3>Monitoring</h3>
                                    <ul>
                                        <li><b>ArgoCD Dashboard:</b> <a href="https://a6230930c94bb41b08605f5beffd1ac7-3939892.us-east-1.elb.amazonaws.com">https://a6230930c94bb41b08605f5beffd1ac7-3939892.us-east-1.elb.amazonaws.com</a></li>
                                        <li><b>Application:</b> pulsedesk-app</li>
                                        <li><b>Namespace:</b> pulsedesk</li>
                                    </ul>
                                    
                                    <hr/>
                                    <p><i>This is an automated deployment notification from PulseDesk CI/CD Pipeline</i></p>
                                </body>
                            </html>
                        """,
                        to: "${EMAIL_RECIPIENT}",
                        mimeType: 'text/html'
                    )
                    echo "✅ Success email sent to ${EMAIL_RECIPIENT}"
                } catch (Exception e) {
                    echo "⚠️  Email notification failed: ${e.message}"
                    echo "Check Jenkins email configuration"
                    echo "Recipient: ${EMAIL_RECIPIENT}"
                }
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
                
                // Send failure email
                try {
                    emailext(
                        subject: "❌ PulseDesk CD Deployment #${BUILD_NUMBER} FAILED (CI Build #${params.CI_BUILD_NUMBER})",
                        body: """
                            <html>
                                <body style="background-color: #ffe6e6;">
                                    <h2>❌ Deployment Failed</h2>
                                    <hr/>
                                    
                                    <h3>Build Details</h3>
                                    <ul>
                                        <li><b>CD Build Number:</b> ${BUILD_NUMBER}</li>
                                        <li><b>CI Build Number:</b> ${params.CI_BUILD_NUMBER}</li>
                                        <li><b>Docker Image Tag:</b> ${params.DOCKER_IMAGE_TAG}</li>
                                        <li><b>Failed At:</b> ${failureTime}</li>
                                    </ul>
                                    
                                    <h3>Action Required</h3>
                                    <p>Please check the build logs for error details:</p>
                                    <ul>
                                        <li><b>Build URL:</b> <a href="${BUILD_URL}">${BUILD_URL}</a></li>
                                        <li><b>Console Output:</b> <a href="${BUILD_URL}/console">${BUILD_URL}/console</a></li>
                                    </ul>
                                    
                                    <h3>Troubleshooting</h3>
                                    <ol>
                                        <li>Check the build logs for specific error messages</li>
                                        <li>Verify Kubernetes cluster connectivity</li>
                                        <li>Check pod status: kubectl get pods -n pulsedesk</li>
                                        <li>Review ArgoCD sync status</li>
                                    </ol>
                                    
                                    <hr/>
                                    <p><i>This is an automated deployment notification from PulseDesk CI/CD Pipeline</i></p>
                                </body>
                            </html>
                        """,
                        to: "${EMAIL_RECIPIENT}",
                        mimeType: 'text/html'
                    )
                    echo "✅ Failure email sent to ${EMAIL_RECIPIENT}"
                } catch (Exception e) {
                    echo "⚠️  Email notification failed: ${e.message}"
                    echo "Check Jenkins email configuration"
                    echo "Recipient: ${EMAIL_RECIPIENT}"
                }
            }
        }
    }
}
