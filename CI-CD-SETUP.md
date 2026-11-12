# PulseDesk CI/CD Setup Guide

## Quick Start

This guide covers the complete setup of the PulseDesk CI/CD pipeline on AWS EKS with Jenkins, ArgoCD, SonarQube, and monitoring via Prometheus & Grafana.

## Prerequisites

- AWS Account with appropriate permissions
- SSH key pair for EC2 instances
- GitHub account and personal access token
- DockerHub account
- Email account (Gmail recommended) for notifications

## Step-by-Step Deployment

### Step 1: Create AWS Infrastructure

1. **Create Security Group**
   - Name: `pulsedesk-sg`
   - Open ports: 22, 8080, 9000, 5000, 30000-32767, 6443, 465

2. **Create Master EC2 Instance**
   ```
   AMI: ami-0d97d7f07b25dd693
   Instance Type: m7i-flex.large
   Storage: 29 GB
   Region: us-east-1
   Name: pulsedesk-master
   ```

3. **Create Jenkins Worker EC2 Instance**
   ```
   Same configuration as Master
   Name: pulsedesk-jenkins-worker
   Attach IAM Role with EKS and EC2 permissions
   ```

### Step 2: Setup Master Machine

1. **SSH into Master**
   ```bash
   ssh -i your-key.pem ubuntu@<master-public-ip>
   ```

2. **Run Setup Script**
   ```bash
   cd Automations
   chmod +x setup-master.sh
   ./setup-master.sh
   ```

3. **Configure AWS CLI**
   ```bash
   aws configure
   # Enter your AWS credentials and set region to us-east-1
   ```

### Step 3: Create EKS Cluster

1. **Run Cluster Creation Script**
   ```bash
   cd Automations
   chmod +x create-eks-cluster.sh
   ./create-eks-cluster.sh
   ```

2. **Verify Cluster**
   ```bash
   kubectl get nodes
   kubectl get pods --all-namespaces
   ```

### Step 4: Setup Jenkins Worker

1. **SSH into Worker**
   ```bash
   ssh -i your-key.pem ubuntu@<worker-public-ip>
   ```

2. **Run Worker Setup Script**
   ```bash
   cd Automations
   chmod +x setup-worker.sh
   ./setup-worker.sh
   ```

3. **Generate SSH Keys on Master (for Jenkins master-worker communication)**
   ```bash
   ssh-keygen -t rsa -N "" -f ~/.ssh/jenkins-key
   ```

4. **Copy Public Key to Worker**
   ```bash
   cat ~/.ssh/jenkins-key.pub | ssh -i your-key.pem ubuntu@<worker-ip> 'cat >> ~/.ssh/authorized_keys'
   ```

### Step 5: Configure Jenkins Master

1. **Access Jenkins**
   - URL: `http://<master-ip>:8080`
   - Password: Retrieved from setup script output

2. **Install Plugins**
   - Navigate to: **Manage Jenkins → Plugins → Available plugins**
   - Search and install:
     - OWASP Dependency-Check
     - SonarQube Scanner
     - Docker Pipeline
     - Pipeline: Stage View
     - Email Extension
     - GitHub Integration
     - Kubernetes CLI

3. **Configure Jenkins Tools**
   - **Manage Jenkins → Tools → SonarQube Scanner Installations**
     - Name: `SonarQube`
     - Install automatically: Yes

4. **Add Jenkins Worker Node**
   - **Manage Jenkins → Nodes → New Node**
     - Name: `pulsedesk-worker-1`
     - Type: Permanent Agent
     - # of executors: 2
     - Remote root directory: `/home/ubuntu/jenkins`
     - Labels: `worker`
     - Launch method: Via SSH
     - Host: `<worker-public-ip>`
     - Credentials: Add SSH username with private key
       - Username: `ubuntu`
       - Private key: Content of ~/.ssh/jenkins-key
     - Host Key Verification: Non verifying

### Step 6: Configure Jenkins Credentials

Add the following credentials in **Manage Jenkins → Credentials**:

1. **GitHub Credentials**
   - Type: Username with password
   - Username: Your GitHub username
   - Password: Your GitHub Personal Access Token
   - ID: `github-credentials`

2. **Docker Hub Credentials**
   - Type: Username with password
   - Username: Your DockerHub username
   - Password: Your DockerHub password
   - ID: `docker-credentials`

3. **SonarQube Token**
   - Type: Secret text
   - Secret: Your SonarQube token (from SonarQube → Administration → Security → Users → Tokens)
   - ID: `sonarqube-token`

4. **ArgoCD Token**
   - Type: Secret text
   - Secret: Your ArgoCD admin password
   - ID: `argocd-token`

### Step 7: Configure Jenkins System Settings

1. **Manage Jenkins → System**

2. **Jenkins Location**
   - Jenkins URL: `http://<master-ip>:8080/`

3. **SonarQube Installations**
   - Name: `SonarQube`
   - Server URL: `http://<master-ip>:9000`
   - Server authentication token: Select `sonarqube-token`

4. **Extended E-mail Notification**
   - SMTP server: `smtp.gmail.com`
   - SMTP port: 465
   - Use SMTPS: Yes
   - Add credentials for email (use Gmail app password)

5. **Email Notification**
   - SMTP server: `smtp.gmail.com`
   - SMTP port: 465
   - Click Advanced:
     - Use SMTPS: Yes
     - Credentials: Your email credentials
     - TLS: Yes

### Step 8: Setup ArgoCD

1. **Run ArgoCD Setup Script** (on Master)
   ```bash
   cd Automations
   chmod +x setup-argocd.sh
   ./setup-argocd.sh
   ```

2. **Add Cluster to ArgoCD** (on Master)
   ```bash
   ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
   argocd login <argocd-server>:<nodeport> --username admin --password $ARGOCD_PASSWORD --insecure
   
   argocd cluster add pulsedesk@pulsedesk.us-east-1.eksctl.io --name pulsedesk-eks-cluster
   ```

3. **Create ArgoCD Application** (via UI or CLI)
   ```bash
   argocd app create pulsedesk-app \
     --repo https://github.com/your-username/pulsedesk.git \
     --path kubernetes \
     --dest-server https://kubernetes.default.svc \
     --dest-namespace pulsedesk \
     --sync-policy auto
   ```

### Step 9: Setup Monitoring

1. **Run Monitoring Setup Script** (on Master)
   ```bash
   cd Automations
   chmod +x setup-monitoring.sh
   ./setup-monitoring.sh
   ```

2. **Access Dashboards**
   - Prometheus: Get URL and port from script output
   - Grafana: Same as Prometheus, default credentials: `admin / admin123`

### Step 10: Create Jenkins Pipelines

1. **Create CI Pipeline Job**
   - **New Item → Pipeline**
   - Name: `Wanderlust-CI`
   - Definition: Pipeline script from SCM
   - SCM: Git
   - Repository URL: `https://github.com/your-username/pulsedesk.git`
   - Branches to build: `*/main`
   - Script path: `GitOps/Jenkinsfile-CI`

2. **Create CD Pipeline Job**
   - **New Item → Pipeline**
   - Name: `Wanderlust-CD`
   - Definition: Pipeline script from SCM
   - SCM: Git
   - Repository URL: `https://github.com/your-username/pulsedesk.git`
   - Branches to build: `*/main`
   - Script path: `GitOps/Jenkinsfile-CD`
   - Allow parameters: Yes

### Step 11: Deploy Application

1. **Create Kubernetes Secrets**
   ```bash
   kubectl apply -f kubernetes/namespace.yaml
   kubectl apply -f kubernetes/app-secrets.yaml
   kubectl apply -f kubernetes/postgres-secrets.yaml
   ```

2. **Trigger CI Pipeline**
   - Go to Jenkins → Wanderlust-CI → Build Now

3. **Monitor Deployment**
   ```bash
   kubectl get pods -n pulsedesk
   kubectl get svc -n pulsedesk
   ```

4. **Access Application**
   - Frontend: `http://<worker-ip>:31100`
   - Backend: `http://<worker-ip>:31000`

## File Structure

```
pulsedesk/
├── Automations/
│   ├── setup-master.sh                 # Master machine setup
│   ├── setup-worker.sh                 # Jenkins worker setup
│   ├── create-eks-cluster.sh           # EKS cluster creation
│   ├── setup-argocd.sh                 # ArgoCD setup
│   └── setup-monitoring.sh             # Prometheus & Grafana setup
├── GitOps/
│   ├── Jenkinsfile-CI                  # CI Pipeline definition
│   └── Jenkinsfile-CD                  # CD Pipeline definition
├── kubernetes/
│   ├── namespace.yaml                  # K8s namespace
│   ├── app-secrets.yaml                # Application secrets
│   ├── postgres-secrets.yaml           # Database secrets
│   ├── postgres-deployment.yaml        # PostgreSQL deployment
│   ├── frontend-deployment.yaml        # Frontend deployment
│   ├── backend-deployment.yaml         # Backend deployment
│   └── kustomization.yaml              # Kustomize configuration
├── client/
│   └── Dockerfile                      # Frontend Docker image
├── server/
│   └── Dockerfile                      # Backend Docker image
└── DEPLOYMENT_GUIDE.md                 # Comprehensive deployment guide
```

## Environment Variables

Update these files with your specific values:

1. **Frontend Environment**
   - `client/Dockerfile`: Update base image references if needed
   - `kubernetes/frontend-deployment.yaml`: Update `VITE_API_BASE_URL`

2. **Backend Environment**
   - `server/Dockerfile`: Update base image references if needed
   - `kubernetes/backend-deployment.yaml`: Update `DATABASE_URL`, `FRONTEND_URL`, `JWT_SECRET`

3. **Jenkins Environment**
   - `GitOps/Jenkinsfile-CI`: Update `DOCKER_REPO`, `SONAR_HOST_URL`
   - `GitOps/Jenkinsfile-CD`: Update `ARGOCD_SERVER`, `CLUSTER_NAME`

4. **GitHub Repository**
   - Update repository URLs in all scripts and Jenkinsfiles
   - Update `your-username` to your actual GitHub username
   - Update `your-dockerhub-username` to your actual DockerHub username

## Monitoring Dashboards

### Prometheus
- Default URL: `http://<worker-ip>:<nodeport>`
- Metrics available:
  - JVM metrics
  - HTTP request metrics
  - Node metrics
  - Pod metrics

### Grafana
- Default URL: `http://<worker-ip>:<nodeport>`
- Default credentials: `admin / admin123`
- Pre-installed dashboards for Kubernetes cluster monitoring

### ArgoCD
- Access URL: `http://<worker-ip>:<nodeport>`
- Application sync status
- Deployment history
- Resource health

## Troubleshooting

### Jenkins won't start
```bash
sudo systemctl status jenkins
sudo systemctl restart jenkins
sudo tail -f /var/log/jenkins/jenkins.log
```

### EKS cluster issues
```bash
aws eks describe-cluster --name pulsedesk --region us-east-1
kubectl get events --all-namespaces --sort-by='.lastTimestamp'
```

### Docker build failures on worker
```bash
docker ps
docker images
docker system df
```

### ArgoCD sync issues
```bash
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller
kubectl get applications -n pulsedesk
```

### Pod not starting
```bash
kubectl describe pod <pod-name> -n pulsedesk
kubectl logs <pod-name> -n pulsedesk
```

## Cleanup

To destroy all resources:

1. **Delete EKS Cluster**
   ```bash
   eksctl delete cluster --name pulsedesk --region us-east-1
   ```

2. **Terminate EC2 Instances**
   ```bash
   aws ec2 terminate-instances --instance-ids i-xxxxx i-xxxxx --region us-east-1
   ```

3. **Delete Security Group**
   ```bash
   aws ec2 delete-security-group --group-name pulsedesk-sg --region us-east-1
   ```

4. **Delete S3 Buckets** (if any)
   ```bash
   aws s3 rb s3://bucket-name --force
   ```

## Best Practices

- [ ] Change all default credentials immediately
- [ ] Enable encryption for EBS volumes
- [ ] Use IAM roles instead of access keys
- [ ] Enable VPC Flow Logs
- [ ] Setup automated backups
- [ ] Configure CloudWatch alarms
- [ ] Document custom configurations
- [ ] Use Kubernetes RBAC for access control
- [ ] Implement network policies
- [ ] Regular security audits

## Support & Documentation

- Jenkins: https://www.jenkins.io/
- AWS EKS: https://docs.aws.amazon.com/eks/
- ArgoCD: https://argo-cd.readthedocs.io/
- SonarQube: https://docs.sonarqube.org/
- Prometheus: https://prometheus.io/docs/
- Grafana: https://grafana.com/docs/

