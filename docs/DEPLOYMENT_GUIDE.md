# PulseDesk DevOps CI/CD Deployment Guide

## Project Overview
This document outlines the complete deployment architecture for PulseDesk on AWS EKS using Jenkins CI/CD, ArgoCD for GitOps, and monitoring via Prometheus & Grafana.

**Region:** us-east-1  
**Instance Type:** m7i-flex.large  
**AMI ID:** ami-0d97d7f07b25dd693  

---

## Architecture Flow

```
GitHub (Code) → Jenkins CI (OWASP, SonarQube, Trivy) → Docker Registry
                                                        ↓
                                                   Jenkins CD
                                                        ↓
                                                   ArgoCD
                                                        ↓
                                                   AWS EKS
                                                        ↓
                                          Prometheus + Grafana (Monitoring)
```

---

## Phase 1: AWS Infrastructure Setup

### 1.1 Create Security Group
```bash
# Security Group: pulsedesk-sg
# Rules needed:
- SSH (22): 0.0.0.0/0
- Jenkins (8080): 0.0.0.0/0
- Docker Registry (5000): 0.0.0.0/0
- SonarQube (9000): 0.0.0.0/0
- ArgoCD (30000-32767): 0.0.0.0/0
- K8s API (6443): 0.0.0.0/0
- Custom TCP (SMTPS 465): 0.0.0.0/0
- All Traffic within SG: Internal (for EKS communication)
```

### 1.2 Create Master EC2 Instance
```bash
# Instance Configuration:
AMI: ami-0d97d7f07b25dd693
Instance Type: m7i-flex.large
Storage: 29 GB (gp3)
Region: us-east-1
Security Group: pulsedesk-sg
Key Pair: Create/use existing key pair
Name: pulsedesk-master
```

### 1.3 Create Jenkins Worker EC2 Instance
```bash
# Instance Configuration:
AMI: ami-0d97d7f07b25dd693
Instance Type: m7i-flex.large
Storage: 29 GB (gp3)
Region: us-east-1
Security Group: pulsedesk-sg
Key Pair: Same as Master
Name: pulsedesk-jenkins-worker
```

### 1.4 Create IAM Role for Jenkins Worker
```bash
# Permissions needed:
- AmazonEC2FullAccess
- AWSCloudFormationFullAccess
- IAMFullAccess
- AmazonEKSFullAccess
- EC2ContainerRegistryFullAccess
- EC2ContainerRegistryPowerUser

# Attach to pulsedesk-jenkins-worker instance
```

---

## Phase 2: Master Machine Setup

### 2.1 SSH into Master Instance
```bash
ssh -i your-key.pem ubuntu@<master-public-ip>
```

### 2.2 Update System and Install Prerequisites
```bash
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install curl wget git -y
```

### 2.3 Install and Configure Docker
```bash
sudo apt-get install docker.io -y
sudo usermod -aG docker ubuntu
newgrp docker
docker --version
```

### 2.4 Install Java (for Jenkins)
```bash
sudo apt-get update -y
sudo apt-get install fontconfig openjdk-17-jre -y
java -version
```

### 2.5 Install Jenkins
```bash
sudo wget -O /usr/share/keyrings/jenkins-keyring.asc \
  https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key

echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc]" \
  https://pkg.jenkins.io/debian-stable binary/ | sudo tee \
  /etc/apt/sources.list.d/jenkins.list > /dev/null

sudo apt-get update -y
sudo apt-get install jenkins -y
sudo systemctl start jenkins
sudo systemctl enable jenkins

# Get initial Jenkins password
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

### 2.6 Configure AWSCLI
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
sudo apt-get install unzip -y
unzip awscliv2.zip
sudo ./aws/install
aws configure

# Configure with your AWS Access Key and Secret Key
# Default region: us-east-1
# Default output: json
```

### 2.7 Install kubectl
```bash
curl -o kubectl https://amazon-eks.s3.us-east-1.amazonaws.com/1.27.0/2023-03-13/bin/linux/amd64/kubectl
chmod +x ./kubectl
sudo mv ./kubectl /usr/local/bin
kubectl version --short --client
```

### 2.8 Install eksctl
```bash
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin
eksctl version
```

### 2.9 Install Helm
```bash
curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
chmod 700 get_helm.sh
./get_helm.sh
helm version
```

### 2.10 Install ArgoCD CLI
```bash
sudo curl --silent --location -o /usr/local/bin/argocd \
  https://github.com/argoproj/argo-cd/releases/download/v2.8.3/argocd-linux-amd64
sudo chmod +x /usr/local/bin/argocd
argocd version --client
```

---

## Phase 3: EKS Cluster Creation

### 3.1 Create EKS Cluster (without nodegroup)
```bash
eksctl create cluster \
  --name=pulsedesk \
  --region=us-east-1 \
  --version=1.27 \
  --without-nodegroup \
  --zones=us-east-1a,us-east-1b
```

### 3.2 Associate IAM OIDC Provider
```bash
eksctl utils associate-iam-oidc-provider \
  --region us-east-1 \
  --cluster pulsedesk \
  --approve
```

### 3.3 Create Nodegroup
```bash
# First, generate SSH key pair if not exists
aws ec2 create-key-pair --key-name pulsedesk-eks-key --region us-east-1 --query 'KeyMaterial' --output text > pulsedesk-eks-key.pem
chmod 600 pulsedesk-eks-key.pem

# Create nodegroup
eksctl create nodegroup \
  --cluster=pulsedesk \
  --region=us-east-1 \
  --name=pulsedesk-nodegroup \
  --node-type=m7i-flex.large \
  --nodes=2 \
  --nodes-min=2 \
  --nodes-max=3 \
  --node-volume-size=29 \
  --ssh-access \
  --ssh-public-key=pulsedesk-eks-key

# Verify cluster
kubectl get nodes
```

---

## Phase 4: Jenkins Configuration

### 4.1 Access Jenkins Master
```
URL: http://<master-public-ip>:8080
Initial Password: Retrieved from /var/lib/jenkins/secrets/initialAdminPassword
```

### 4.2 Install Required Plugins
Navigate to: **Manage Jenkins → Plugins → Available plugins**

Install:
- OWASP Dependency-Check
- SonarQube Scanner
- Docker Pipeline
- Pipeline: Stage View
- Email Extension
- GitHub Integration
- Kubernetes CLI

### 4.3 Configure Jenkins Tools
Navigate to: **Manage Jenkins → Tools**

- **SonarQube Scanner Installations:**
  - Name: SonarQube
  - Install automatically: Yes

- **Docker Installations:**
  - Name: Docker
  - Install URL: https://download.docker.com

---

## Phase 5: Jenkins Worker Setup

### 5.1 SSH into Worker Instance
```bash
ssh -i your-key.pem ubuntu@<worker-public-ip>
```

### 5.2 Install Java
```bash
sudo apt-get update -y
sudo apt-get install fontconfig openjdk-17-jre -y
java -version
```

### 5.3 Install Docker
```bash
sudo apt-get install docker.io -y
sudo usermod -aG docker ubuntu
newgrp docker
docker --version
```

### 5.4 Configure AWSCLI
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
sudo apt-get install unzip -y
unzip awscliv2.zip
sudo ./aws/install
aws configure
```

### 5.5 Install Trivy (Container Scanning)
```bash
sudo apt-get install wget apt-transport-https gnupg lsb-release -y
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
sudo apt-get update -y
sudo apt-get install trivy -y
trivy --version
```

### 5.6 Fix Docker Permissions
```bash
sudo chmod 777 /var/run/docker.sock
```

### 5.7 Configure Worker in Jenkins
On Jenkins Master: **Manage Jenkins → Nodes → New Node**

Configuration:
```
Name: pulsedesk-worker-1
Type: Permanent Agent
# of executors: 2
Remote root directory: /home/ubuntu/jenkins
Labels: worker
Launch method: Via SSH
Host: <worker-public-ip>
Credentials: Add SSH username with private key
Username: ubuntu
Private key: Add your private key content
Host Key Verification: Non verifying
```

---

## Phase 6: CI/CD Tools Setup

### 6.1 Install SonarQube (Master Machine)
```bash
docker run -itd \
  --name sonarqube-server \
  -p 9000:9000 \
  sonarqube:lts-community
```

Access at: `http://<master-public-ip>:9000`  
Default credentials: `admin / admin`

### 6.2 Create SonarQube Token
1. Login to SonarQube
2. Go to: **Administration → Security → Users**
3. Click on your user → **Tokens**
4. Generate new token

### 6.3 Install ArgoCD (Master Machine)
```bash
# Create namespace
kubectl create namespace argocd

# Apply ArgoCD manifests
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for all pods
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=argocd-server -n argocd --timeout=300s

# Change service to NodePort
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "NodePort"}}'

# Get NodePort
kubectl get svc -n argocd

# Fetch initial password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d; echo
```

Access ArgoCD at: `http://<worker-public-ip>:<nodeport>`  
Default credentials: `admin / <generated-password>`

---

## Phase 7: Pipeline Configuration

### 7.1 Add GitHub Credentials to Jenkins
**Manage Jenkins → Credentials → Add Credentials**

```
Kind: Username with password
Username: <github-username>
Password: <github-personal-access-token>
ID: github-credentials
```

### 7.2 Add Docker Hub Credentials
**Manage Jenkins → Credentials → Add Credentials**

```
Kind: Username with password
Username: <dockerhub-username>
Password: <dockerhub-password>
ID: docker-credentials
```

### 7.3 Add SonarQube Credentials
**Manage Jenkins → Credentials → Add Credentials**

```
Kind: Secret text
Secret: <sonarqube-token>
ID: sonarqube-token
```

### 7.4 Configure Jenkins System Settings
**Manage Jenkins → System**

- **Jenkins Location:**
  - Jenkins URL: `http://<master-public-ip>:8080/`

- **SonarQube Installations:**
  - Name: SonarQube
  - Server URL: `http://<master-public-ip>:9000`
  - Server authentication token: Select sonarqube-token

- **Extended E-mail Notification:**
  - SMTP server: `smtp.gmail.com`
  - SMTP port: 465
  - Use SMTPS: Yes
  - Credentials: Add gmail app password

---

## Phase 8: Create CI/CD Pipelines

### 8.1 Create Wanderlust-CI Pipeline
Create new **Pipeline** job in Jenkins with:

```groovy
pipeline {
    agent {
        label 'worker'
    }
    
    environment {
        DOCKER_REGISTRY = 'docker.io'
        DOCKER_REPO = '<your-dockerhub-username>/pulsedesk'
        SONAR_HOST_URL = 'http://<master-ip>:9000'
    }
    
    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', 
                    credentialsId: 'github-credentials',
                    url: 'https://github.com/<username>/pulsedesk.git'
            }
        }
        
        stage('OWASP Dependency Check') {
            steps {
                sh 'dependency-check.sh --project PulseDesk --scan . --format HTML --out reports'
            }
        }
        
        stage('SonarQube Analysis') {
            steps {
                sh '''
                    sonar-scanner \
                      -Dsonar.projectKey=pulsedesk \
                      -Dsonar.sources=. \
                      -Dsonar.host.url=${SONAR_HOST_URL}
                '''
            }
        }
        
        stage('Build Docker Images') {
            steps {
                sh '''
                    docker build -t ${DOCKER_REPO}:frontend-${BUILD_NUMBER} ./client
                    docker build -t ${DOCKER_REPO}:backend-${BUILD_NUMBER} ./server
                '''
            }
        }
        
        stage('Trivy Scan') {
            steps {
                sh '''
                    trivy image ${DOCKER_REPO}:frontend-${BUILD_NUMBER}
                    trivy image ${DOCKER_REPO}:backend-${BUILD_NUMBER}
                '''
            }
        }
        
        stage('Push to Registry') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'docker-credentials', 
                                                   usernameVariable: 'DOCKER_USER', 
                                                   passwordVariable: 'DOCKER_PASS')]) {
                    sh '''
                        docker login -u ${DOCKER_USER} -p ${DOCKER_PASS}
                        docker push ${DOCKER_REPO}:frontend-${BUILD_NUMBER}
                        docker push ${DOCKER_REPO}:backend-${BUILD_NUMBER}
                    '''
                }
            }
        }
        
        stage('Update Manifest') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'github-credentials', 
                                                   usernameVariable: 'GIT_USER', 
                                                   passwordVariable: 'GIT_PASS')]) {
                    sh '''
                        cd kubernetes
                        sed -i "s|image: .*frontend.*|image: ${DOCKER_REPO}:frontend-${BUILD_NUMBER}|" deployment.yaml
                        sed -i "s|image: .*backend.*|image: ${DOCKER_REPO}:backend-${BUILD_NUMBER}|" deployment.yaml
                        
                        git config user.email "jenkins@pulsedesk.local"
                        git config user.name "Jenkins"
                        git add deployment.yaml
                        git commit -m "Update image tags - Build ${BUILD_NUMBER}"
                        git push https://${GIT_USER}:${GIT_PASS}@github.com/<username>/pulsedesk.git
                    '''
                }
            }
        }
    }
    
    post {
        always {
            archiveArtifacts artifacts: 'reports/**', allowEmptyArchive: true
            publishHTML([reportDir: 'reports', reportFiles: 'dependency-check-report.html', reportName: 'OWASP Report'])
        }
        failure {
            emailext subject: 'Build Failed: ${JOB_NAME} - ${BUILD_NUMBER}',
                     body: 'Build failed. Check console output.',
                     to: 'your-email@gmail.com'
        }
        success {
            emailext subject: 'Build Success: ${JOB_NAME} - ${BUILD_NUMBER}',
                     body: 'Build successful. Triggering CD pipeline.',
                     to: 'your-email@gmail.com'
        }
    }
}
```

### 8.2 Create Wanderlust-CD Pipeline
Create new **Pipeline** job in Jenkins with:

```groovy
pipeline {
    agent {
        label 'worker'
    }
    
    environment {
        DOCKER_REPO = '<your-dockerhub-username>/pulsedesk'
        ARGOCD_SERVER = '<argocd-nodeip>:<nodeport>'
    }
    
    stages {
        stage('Update ArgoCD') {
            steps {
                withCredentials([string(credentialsId: 'argocd-token', variable: 'ARGOCD_TOKEN')]) {
                    sh '''
                        argocd login ${ARGOCD_SERVER} --username admin --password ${ARGOCD_TOKEN} --insecure
                        argocd app sync pulsedesk-app --prune
                        argocd app wait pulsedesk-app --health
                    '''
                }
            }
        }
        
        stage('Verify Deployment') {
            steps {
                sh '''
                    kubectl rollout status deployment/pulsedesk-frontend -n pulsedesk
                    kubectl rollout status deployment/pulsedesk-backend -n pulsedesk
                '''
            }
        }
        
        stage('Health Check') {
            steps {
                sh '''
                    curl -f http://<frontend-service-ip>:3000 || exit 1
                    curl -f http://<backend-service-ip>:5000 || exit 1
                '''
            }
        }
    }
    
    post {
        failure {
            emailext subject: 'Deployment Failed: ${JOB_NAME}',
                     body: 'Deployment failed. Check logs.',
                     to: 'your-email@gmail.com'
        }
        success {
            emailext subject: 'Deployment Success: ${JOB_NAME}',
                     body: 'Application deployed successfully on EKS.',
                     to: 'your-email@gmail.com'
        }
    }
}
```

---

## Phase 9: ArgoCD Setup

### 9.1 Add Cluster to ArgoCD
```bash
# Login to ArgoCD
argocd login <argocd-server>:<nodeport> --username admin

# Get cluster context
kubectl config get-contexts

# Add cluster
argocd cluster add pulsedesk@pulsedesk.us-east-1.eksctl.io --name pulsedesk-eks-cluster
```

### 9.2 Create ArgoCD Application
```bash
# Or use UI: Applications → New App
argocd app create pulsedesk-app \
  --repo https://github.com/<username>/pulsedesk.git \
  --path kubernetes \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace pulsedesk \
  --sync-policy auto
```

---

## Phase 10: Monitoring Setup

### 10.1 Add Helm Repositories
```bash
helm repo add stable https://charts.helm.sh/stable
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```

### 10.2 Install Prometheus & Grafana
```bash
# Create namespace
kubectl create namespace monitoring

# Install Prometheus
helm install prometheus prometheus-community/kube-prometheus-stack \
  -n monitoring \
  --set prometheus.prometheusSpec.retention=30d

# Change to NodePort
kubectl patch svc prometheus-kube-prometheus-prometheus -n monitoring -p '{"spec": {"type": "NodePort"}}'
kubectl patch svc prometheus-grafana -n monitoring -p '{"spec": {"type": "NodePort"}}'

# Get Grafana credentials
kubectl get secret --namespace monitoring prometheus-grafana -o jsonpath="{.data.admin-password}" | base64 --decode; echo
```

### 10.3 Access Monitoring
- **Prometheus:** `http://<worker-ip>:<nodeport>`
- **Grafana:** `http://<worker-ip>:<nodeport>`
  - Username: `admin`
  - Password: Retrieved from secret

---

## Phase 11: Application Deployment

### 11.1 Create Kubernetes Namespace
```bash
kubectl create namespace pulsedesk
```

### 11.2 Create Kubernetes Manifests
See `kubernetes/` directory in the repository.

### 11.3 Deploy via ArgoCD
```bash
argocd app sync pulsedesk-app
```

### 11.4 Access Application
```bash
# Get service endpoints
kubectl get svc -n pulsedesk

# Frontend: http://<service-ip>:3000
# Backend: http://<service-ip>:5000
```

---

## Cleanup

### Delete EKS Cluster
```bash
eksctl delete cluster --name pulsedesk --region us-east-1
```

### Terminate EC2 Instances
```bash
# Delete via AWS Console or CLI
aws ec2 terminate-instances --instance-ids <instance-id> --region us-east-1
```

### Clean up volumes and security groups
```bash
# Delete in AWS Console after instances are terminated
```

---

## Troubleshooting

### Jenkins connectivity issues
```bash
# Check Jenkins service
sudo systemctl status jenkins
sudo systemctl restart jenkins
```

### EKS cluster issues
```bash
# Get cluster details
aws eks describe-cluster --name pulsedesk --region us-east-1
kubectl get all -A
```

### ArgoCD issues
```bash
# Check ArgoCD pods
kubectl get pods -n argocd
kubectl logs -n argocd <pod-name>
```

### Docker build issues
```bash
# Verify Docker daemon
docker ps
docker images
```

---

## Production Checklist

- [ ] Change all default credentials
- [ ] Configure proper SSL/TLS certificates
- [ ] Set up proper backup strategies for EBS volumes
- [ ] Configure CloudWatch for centralized logging
- [ ] Set up AWS IAM policies following least privilege principle
- [ ] Enable VPC Flow Logs
- [ ] Configure AWS WAF for API protection
- [ ] Set up automated AMI snapshots
- [ ] Document all custom configurations
- [ ] Create runbooks for common operational tasks

