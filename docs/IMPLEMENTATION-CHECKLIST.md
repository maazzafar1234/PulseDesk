# PulseDesk CI/CD Implementation Checklist

Complete this checklist to ensure a successful deployment of the PulseDesk CI/CD pipeline on AWS EKS.

## Pre-Deployment Preparation

### AWS Account Setup
- [ ] AWS account created and active
- [ ] Appropriate IAM permissions configured
- [ ] AWS CLI installed and configured locally
- [ ] AWS credentials with access key and secret key
- [ ] Region set to **us-east-1**

### GitHub Repository
- [ ] Repository created and code pushed
- [ ] GitHub Personal Access Token generated
- [ ] Repository access permissions verified
- [ ] Webhook configuration understood

### DockerHub Account
- [ ] DockerHub account created
- [ ] Username and password available
- [ ] Repository namespace ready for images

### Email Configuration (Gmail)
- [ ] Gmail account with 2FA enabled
- [ ] App password generated for Jenkins
- [ ] Email notification preferences set

### SSH Keys
- [ ] EC2 key pair created and downloaded
- [ ] Key pair saved in secure location
- [ ] Key pair permissions set (chmod 600)

## Phase 1: Infrastructure Setup

### AWS Resources
- [ ] Security Group created (pulsedesk-sg) with required ports
  - [ ] Port 22 (SSH)
  - [ ] Port 8080 (Jenkins)
  - [ ] Port 9000 (SonarQube)
  - [ ] Port 5000 (Docker Registry)
  - [ ] Port 6443 (K8s API)
  - [ ] Ports 30000-32767 (NodePort)
  - [ ] Port 465 (SMTP)
- [ ] VPC configuration verified (or use default)
- [ ] Subnet configuration verified
- [ ] Internet Gateway configured

### EC2 Instances
- [ ] Master instance created (m7i-flex.large, 29GB storage)
  - [ ] Instance running
  - [ ] Public IP assigned
  - [ ] Security group attached
  - [ ] SSH access verified
- [ ] Jenkins Worker instance created (m7i-flex.large, 29GB storage)
  - [ ] Instance running
  - [ ] Public IP assigned
  - [ ] Security group attached
  - [ ] IAM role attached with appropriate permissions
  - [ ] SSH access verified

## Phase 2: Master Node Configuration

### System Setup
- [ ] SSH into master instance successful
- [ ] System packages updated
- [ ] curl, wget, git installed

### Docker Installation
- [ ] Docker installed on master
- [ ] Docker daemon running
- [ ] Docker commands executable without sudo
- [ ] Docker version verified

### Java & Jenkins
- [ ] Java 17 installed
- [ ] Jenkins package repository added
- [ ] Jenkins installed
- [ ] Jenkins service running
- [ ] Jenkins initial password retrieved
- [ ] Jenkins accessible on port 8080

### AWS CLI Setup
- [ ] AWSCLI v2 installed
- [ ] Credentials configured
- [ ] Region set to us-east-1
- [ ] AWS CLI commands working

### Kubernetes Tools
- [ ] kubectl installed
- [ ] kubectl version verified
- [ ] eksctl installed
- [ ] eksctl version verified

### Additional Tools
- [ ] Helm installed
- [ ] Helm version verified
- [ ] ArgoCD CLI installed
- [ ] ArgoCD CLI version verified

### SonarQube
- [ ] SonarQube Docker container running
- [ ] SonarQube accessible on port 9000
- [ ] Initial login successful (admin/admin)

## Phase 3: EKS Cluster Creation

### Cluster Setup
- [ ] EKS cluster creation initiated
- [ ] Cluster name set to "pulsedesk"
- [ ] Region set to us-east-1
- [ ] Kubernetes version 1.27 selected
- [ ] Creation completed without nodegroup

### OIDC Provider
- [ ] OIDC provider associated with cluster
- [ ] Association successful

### Node Group
- [ ] SSH key pair created/verified
- [ ] Node group creation initiated
- [ ] Node type: m7i-flex.large
- [ ] Min nodes: 2
- [ ] Max nodes: 3
- [ ] Volume size: 29GB
- [ ] Creation completed successfully

### Cluster Verification
- [ ] kubectl connectivity verified
- [ ] Cluster nodes visible
- [ ] Pods running in kube-system namespace
- [ ] All nodes in Ready state
- [ ] kube-proxy and coredns working

## Phase 4: Jenkins Configuration

### Initial Setup
- [ ] Jenkins UI accessed and unlocked
- [ ] Suggested plugins installed
- [ ] Admin user created
- [ ] Jenkins URL configured
- [ ] Jenkins location set correctly

### Plugin Installation
- [ ] OWASP Dependency-Check plugin installed
- [ ] SonarQube Scanner plugin installed
- [ ] Docker Pipeline plugin installed
- [ ] Pipeline: Stage View plugin installed
- [ ] Email Extension plugin installed
- [ ] GitHub Integration plugin installed
- [ ] Kubernetes CLI plugin installed
- [ ] All plugins installed and enabled

### Tool Configuration
- [ ] SonarQube Scanner tool added
- [ ] Docker tool added
- [ ] JAVA_HOME configured

### Credentials Setup
- [ ] GitHub credentials added
  - [ ] Type: Username with password
  - [ ] ID: github-credentials
- [ ] Docker credentials added
  - [ ] Type: Username with password
  - [ ] ID: docker-credentials
- [ ] SonarQube token added
  - [ ] Type: Secret text
  - [ ] ID: sonarqube-token
- [ ] ArgoCD token added (optional at this stage)
  - [ ] Type: Secret text
  - [ ] ID: argocd-token

### System Configuration
- [ ] Jenkins Location configured
- [ ] SonarQube server added
  - [ ] Server URL correct
  - [ ] Token configured
- [ ] Email Notification configured
  - [ ] SMTP server: smtp.gmail.com
  - [ ] SMTP port: 465
  - [ ] Credentials configured
  - [ ] Default email address set
- [ ] Extended Email Notification configured
  - [ ] All settings matching Email Notification

## Phase 5: Jenkins Worker Setup

### System Setup
- [ ] SSH into worker instance successful
- [ ] System packages updated

### Java Installation
- [ ] Java 17 installed
- [ ] Java version verified

### Docker Installation
- [ ] Docker installed
- [ ] Docker daemon running
- [ ] Docker socket permissions fixed (chmod 777)
- [ ] Docker commands executable without sudo

### Security Tools
- [ ] Trivy installed
- [ ] Trivy version verified
- [ ] OWASP Dependency-Check available

### AWS CLI
- [ ] AWSCLI installed
- [ ] Credentials configured
- [ ] AWS CLI working

### Jenkins Agent Configuration
- [ ] SSH keys generated on master
- [ ] Public key copied to worker's authorized_keys
- [ ] SSH connectivity verified

### Jenkins Master Configuration
- [ ] Worker node added to Jenkins
  - [ ] Name: pulsedesk-worker-1
  - [ ] Type: Permanent Agent
  - [ ] Executors: 2
  - [ ] Labels: worker
  - [ ] Launch method: Via SSH
  - [ ] Host: <worker-ip>
  - [ ] Credentials: SSH key configured
- [ ] Worker node online and ready

## Phase 6: CI/CD Tools Integration

### SonarQube Configuration
- [ ] SonarQube user logged in
- [ ] Token generated
  - [ ] Admin → Security → Users → Tokens
  - [ ] Token created
- [ ] Token copied to Jenkins credentials
- [ ] SonarQube project created (optional)

### Repository Integration
- [ ] Repository cloned/verified
- [ ] Automations scripts accessible
- [ ] Kubernetes manifests ready
- [ ] Dockerfiles in place
  - [ ] client/Dockerfile
  - [ ] server/Dockerfile

## Phase 7: Pipeline Creation

### CI Pipeline
- [ ] New Pipeline job created: "Wanderlust-CI"
- [ ] Definition: Pipeline script from SCM
- [ ] Repository URL configured
- [ ] Branch: */main
- [ ] Script path: GitOps/Jenkinsfile-CI
- [ ] Trigger configuration (GitHub webhook optional)
- [ ] Pipeline definition reviewed

### CD Pipeline
- [ ] New Pipeline job created: "Wanderlust-CD"
- [ ] Definition: Pipeline script from SCM
- [ ] Repository URL configured
- [ ] Branch: */main
- [ ] Script path: GitOps/Jenkinsfile-CD
- [ ] Parameters configured
- [ ] Dependency on CI pipeline configured

### Pipeline Customization
- [ ] DOCKER_REPO updated with actual username
- [ ] SONAR_HOST_URL updated with master IP
- [ ] ARGOCD_SERVER updated with correct address
- [ ] GitHub repository URL updated
- [ ] All credentials properly referenced

## Phase 8: ArgoCD Setup

### Installation
- [ ] ArgoCD namespace created
- [ ] ArgoCD manifests applied
- [ ] All ArgoCD pods running
- [ ] ArgoCD server service created

### Service Exposure
- [ ] Service changed to NodePort
- [ ] NodePort assigned
- [ ] Service accessible externally

### Initial Configuration
- [ ] ArgoCD admin password retrieved
- [ ] ArgoCD CLI installed on master
- [ ] ArgoCD login successful
  - [ ] Username: admin
  - [ ] Password: generated password

### Cluster Integration
- [ ] Cluster context retrieved
- [ ] EKS cluster added to ArgoCD
- [ ] Cluster visible in ArgoCD UI

### Repository Connection
- [ ] GitHub repository connected
  - [ ] Repo URL: https://github.com/your-username/pulsedesk.git
  - [ ] Credentials: github-credentials
  - [ ] Connection successful

### Application Creation
- [ ] ArgoCD application created: "pulsedesk-app"
  - [ ] Repository URL configured
  - [ ] Path: kubernetes
  - [ ] Destination server: Kubernetes default
  - [ ] Namespace: pulsedesk
  - [ ] Sync policy: Automatic
  - [ ] Auto-create namespace: Enabled
- [ ] Application visible in ArgoCD UI
- [ ] Initial sync status checked

## Phase 9: Kubernetes Deployment

### Namespace & Secrets
- [ ] Pulsedesk namespace created
- [ ] App secrets created
  - [ ] JWT_SECRET configured
- [ ] Postgres secrets created
  - [ ] Username, password, database configured

### Manifests Review
- [ ] Frontend deployment manifest reviewed
  - [ ] Image tag correct
  - [ ] Port 3000 exposed
  - [ ] NodePort 31100 configured
  - [ ] Resources configured
- [ ] Backend deployment manifest reviewed
  - [ ] Image tag correct
  - [ ] Port 5000 exposed
  - [ ] NodePort 31000 configured
  - [ ] Database connection string correct
  - [ ] Resources configured
- [ ] PostgreSQL deployment reviewed
  - [ ] Configuration correct
  - [ ] Storage configured
- [ ] All manifests in kubernetes/ directory

### Initial Deployment
- [ ] Manifests applied via kubectl
  - [ ] `kubectl apply -f kubernetes/`
- [ ] All pods created
- [ ] All pods in Running state
- [ ] Services created and assigned IPs

## Phase 10: Monitoring Setup

### Helm Configuration
- [ ] Helm stable repository added
- [ ] Prometheus repository added
- [ ] Helm repositories updated

### Prometheus Installation
- [ ] Monitoring namespace created
- [ ] Prometheus stack installed via Helm
- [ ] All Prometheus pods running
- [ ] Prometheus service changed to NodePort
- [ ] NodePort assigned

### Grafana Installation
- [ ] Grafana running (included in stack)
- [ ] Grafana service changed to NodePort
- [ ] NodePort assigned
- [ ] Initial login successful
  - [ ] Username: admin
  - [ ] Password: configured in Helm

### Dashboards
- [ ] Kubernetes cluster dashboard visible
- [ ] Node metrics displayed
- [ ] Pod metrics displayed
- [ ] Custom dashboards created (optional)

## Phase 11: Application Deployment & Testing

### Manual Deployment (Before CI/CD)
- [ ] Frontend pod running and healthy
- [ ] Backend pod running and healthy
- [ ] Database pod running and healthy
- [ ] Services accessible via IPs

### Endpoint Testing
- [ ] Frontend accessible: `http://<worker-ip>:31100`
- [ ] Backend health check: `http://<worker-ip>:31000/api/health`
- [ ] Database connectivity verified
- [ ] Logs checked and clean

### CI Pipeline Testing
- [ ] Trigger CI pipeline manually
- [ ] Code checkout successful
- [ ] Dependencies installed
- [ ] OWASP scan completed
- [ ] SonarQube analysis completed
- [ ] Docker images built
- [ ] Trivy scan completed
- [ ] Images pushed to DockerHub
- [ ] Manifests updated
- [ ] Pipeline completed successfully

### CD Pipeline Testing
- [ ] Trigger CD pipeline manually
- [ ] ArgoCD sync initiated
- [ ] Deployment rolled out
- [ ] All pods updated with new images
- [ ] Health checks passed
- [ ] Application functioning correctly

### End-to-End Testing
- [ ] Make code change and push to GitHub
- [ ] GitHub webhook triggers CI pipeline
- [ ] CI pipeline runs completely
- [ ] CD pipeline triggered automatically
- [ ] Application updated on EKS
- [ ] Changes visible in live application

## Phase 12: Monitoring & Verification

### Prometheus Verification
- [ ] Access Prometheus UI
- [ ] Check metrics collection
- [ ] Query for Kubernetes metrics
- [ ] Pod metrics available
- [ ] Node metrics available

### Grafana Verification
- [ ] Access Grafana UI
- [ ] Default dashboards visible
- [ ] Kubernetes cluster dashboard operational
- [ ] Metrics updating in real-time

### Application Health
- [ ] Frontend responding
- [ ] Backend responding
- [ ] Database connected
- [ ] Logs showing normal operation
- [ ] No errors in event logs

### Jenkins Monitoring
- [ ] Build job successful
- [ ] Artifact archiving working
- [ ] Email notifications delivered (if configured)
- [ ] Pipeline logs accessible

## Post-Deployment

### Documentation
- [ ] All URLs and IPs documented
- [ ] Credentials stored securely
- [ ] Access instructions documented
- [ ] Troubleshooting guide created

### Security Hardening
- [ ] Default credentials changed
- [ ] Encryption enabled (if applicable)
- [ ] IAM roles verified
- [ ] Security groups reviewed
- [ ] Unused ports closed

### Backup Configuration
- [ ] EBS snapshots scheduled (optional)
- [ ] Database backups configured (optional)
- [ ] Configuration backups created
- [ ] Disaster recovery plan documented

### Cost Monitoring
- [ ] AWS Cost Explorer reviewed
- [ ] Budget alerts configured (recommended)
- [ ] Resource tagging in place
- [ ] Unused resources removed

### Team Training
- [ ] Team members trained on Jenkins UI
- [ ] Team members trained on ArgoCD UI
- [ ] Pipeline operation documented
- [ ] Rollback procedures documented
- [ ] Escalation procedures established

## Ongoing Maintenance

### Weekly Tasks
- [ ] Monitor Jenkins job execution
- [ ] Review application logs
- [ ] Check resource utilization
- [ ] Verify backup completion

### Monthly Tasks
- [ ] Update Jenkins plugins
- [ ] Review and rotate credentials
- [ ] Update EKS cluster patches
- [ ] Review security policies
- [ ] Analyze monitoring dashboards

### Quarterly Tasks
- [ ] Major version updates (EKS, K8s)
- [ ] Security audit
- [ ] Performance optimization
- [ ] Disaster recovery drill
- [ ] Documentation review

## Success Criteria

- [ ] All infrastructure components running
- [ ] Jenkins CI pipeline working end-to-end
- [ ] Jenkins CD pipeline working end-to-end
- [ ] Application deployed on EKS
- [ ] Monitoring active and collecting metrics
- [ ] All endpoints accessible
- [ ] No critical errors in logs
- [ ] Team trained and ready
- [ ] Documentation complete

---

## Sign-Off

- **Deployed By**: ___________________
- **Date**: ___________________
- **Status**: [ ] Complete  [ ] In Progress  [ ] On Hold
- **Notes**: _________________________________________________

---

## Emergency Contacts

- **AWS Support**: https://console.aws.amazon.com/support/
- **Jenkins Issues**: Check jenkins.log and browser console
- **Kubernetes Issues**: `kubectl describe` and `kubectl logs`
- **Application Issues**: Check application logs in pods

---

**Last Updated**: November 2024
**Version**: 1.0
