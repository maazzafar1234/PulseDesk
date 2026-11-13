# Jenkins CI/CD Setup Guide for PulseDesk

## Overview
This guide walks through setting up a complete CI/CD pipeline for PulseDesk using Jenkins.

**Jenkins URL:** http://44.198.186.67:8080  
**Username:** admin  
**Password:** a156b927b4ff4692add4530c81f8da65

---

## Step 1: Install Required Plugins

### Access Plugin Manager
1. Go to **Manage Jenkins** → **Manage Plugins**
2. Go to **Available plugins** tab
3. Search for and install the following plugins:

#### List of Plugins to Install
```
- Docker
- Docker Commons
- SonarQube Scanner
- OWASP Dependency Check
- Pipeline: Stage View
- Pipeline: Model Definition
- Pipeline: Model Extensions
- Email Extension
- Mailer
- GitHub Branch Source
- GitHub API
- Git
- Matrix Authorization Strategy
- ANSI Color
```

**Installation Steps:**
1. Search for each plugin
2. Check the checkbox
3. Click "Install without restart"
4. Wait for installation to complete
5. Restart Jenkins when prompted

---

## Step 2: Configure Email Notifications

### Enable Gmail SMTP

#### 2.1 Configure Gmail Account
1. Go to **Gmail** → **Manage your Google Account**
2. Navigate to **Security**
3. Ensure **2-Step Verification** is enabled
4. Search for **App passwords**
5. Generate a new app password for Jenkins
6. Copy the 16-character password

#### 2.2 Configure Jenkins Email Settings
1. Go to **Manage Jenkins** → **Configure System**
2. Scroll down to **E-mail Notification**
3. Configure:
   - **SMTP server:** smtp.gmail.com
   - **SMTP port:** 465
   - **Click "Advanced"**
   - **Use SSL:** ✓ (checked)
   - **Default user email suffix:** @pulsedesk.local

#### 2.3 Add Email Credentials
1. Go to **Manage Jenkins** → **Manage Credentials**
2. Click on **Credentials** (under "Stores scoped to Jenkins")
3. Click **New credentials**
4. Configure:
   - **Kind:** Username with password
   - **Scope:** Global (Jenkins, nodes, items, all child items, etc.)
   - **Username:** your-gmail@gmail.com
   - **Password:** (paste the 16-character app password)
   - **ID:** email-credentials
   - **Description:** Gmail SMTP Credentials
5. Click **Create**

#### 2.4 Complete Email Configuration
1. Back in **Configure System** → **E-mail Notification**
2. Click **Advanced**
3. Configure:
   - **Credentials:** email-credentials
   - **TLS:** ✓ (checked)
   - **Send emails for every unstable build:** ✓
   - **Send emails for matrix project:** ✓

#### 2.5 Test Email Configuration
1. Scroll down to **Extended E-mail Notification**
2. Configure:
   - **SMTP server:** smtp.gmail.com
   - **SMTP port:** 465
   - **Credentials:** email-credentials
3. Click **Test Configuration** to verify

---

## Step 3: Create Credentials

### 3.1 Docker Hub Credentials
1. Go to **Manage Jenkins** → **Manage Credentials**
2. Click **New credentials**
3. Configure:
   - **Kind:** Username with password
   - **Username:** maazzafar07
   - **Password:** (Your Docker Hub password)
   - **ID:** docker-hub-credentials
   - **Description:** Docker Hub Credentials for PulseDesk
4. Click **Create**

### 3.2 GitHub Credentials
1. Go to **Manage Jenkins** → **Manage Credentials**
2. Click **New credentials**
3. Configure:
   - **Kind:** Username with password
   - **Username:** maazzafar1234
   - **Password:** (Your GitHub Personal Access Token with repo and admin:repo_hook scopes)
   - **ID:** github-credentials
   - **Description:** GitHub Credentials for PulseDesk
4. Click **Create**

### 3.3 SonarQube Credentials

#### Create SonarQube Token
1. Log in to **SonarQube** (http://44.198.186.67:9000)
2. Go to **Administration** → **Security** → **Users**
3. Find the admin user
4. Click **Tokens**
5. Generate a new token named "jenkins"
6. Copy the token

#### Add SonarQube Credentials in Jenkins
1. Go to **Manage Jenkins** → **Manage Credentials**
2. Click **New credentials**
3. Configure:
   - **Kind:** Secret text
   - **Secret:** (paste SonarQube token)
   - **ID:** sonarqube-token
   - **Description:** SonarQube Token for Jenkins
4. Click **Create**

---

## Step 4: Configure SonarQube Integration

### 4.1 Configure SonarQube Server
1. Go to **Manage Jenkins** → **Configure System**
2. Scroll down to **SonarQube installations**
3. Click **Add SonarQube**
4. Configure:
   - **Name:** sonarqube-server
   - **Server URL:** http://44.198.186.67:9000
   - **Server authentication token:** sonarqube-token
5. Click **Save**

### 4.2 Configure SonarQube Scanner
1. Go to **Manage Jenkins** → **Global Tool Configuration**
2. Scroll down to **SonarQube Scanner**
3. Click **Add SonarQube Scanner**
4. Configure:
   - **Name:** sonarqube-scanner
   - **Version:** Latest (or specify a version)
5. Check **Install automatically**
6. Click **Save**

### 4.3 Configure SonarQube Webhook (in SonarQube)
1. Log in to **SonarQube**
2. Go to **Administration** → **Configuration** → **Webhooks**
3. Click **Create**
4. Configure:
   - **Name:** Jenkins
   - **URL:** http://44.198.186.67:8080/sonarqube-webhook/
   - **Trigger events:** Code Quality Gate
5. Click **Create**

---

## Step 5: Create Jenkins Pipelines

### 5.1 Create PulseDesk-CI Pipeline (Build & Test)

1. Go to Jenkins Dashboard
2. Click **New Item**
3. Configure:
   - **Item name:** PulseDesk-CI
   - **Type:** Pipeline
4. Click **OK**
5. In the pipeline configuration:
   - **Description:** CI Pipeline for PulseDesk - Build, Test, and Push Docker Images
   - **GitHub project:** https://github.com/maazzafar1234/PulseDesk
6. Under **Build Triggers:**
   - ✓ GitHub hook trigger for GITScm polling
7. Under **Pipeline:**
   - **Definition:** Pipeline script from SCM
   - **SCM:** Git
   - **Repository URL:** https://github.com/maazzafar1234/PulseDesk
   - **Credentials:** github-credentials
   - **Branches to build:** */main
   - **Script path:** Automations/PulseDesk-CI-Pipeline.groovy
8. Click **Save**

### 5.2 Create PulseDesk-CD Pipeline (Deploy to K8s)

1. Go to Jenkins Dashboard
2. Click **New Item**
3. Configure:
   - **Item name:** PulseDesk-CD
   - **Type:** Pipeline
4. Click **OK**
5. In the pipeline configuration:
   - **Description:** CD Pipeline for PulseDesk - Deploy to Kubernetes
   - **GitHub project:** https://github.com/maazzafar1234/PulseDesk
6. Under **Build Triggers:**
   - ✓ Trigger builds remotely (e.g. from scripts)
   - **Authentication token:** pulsedesk-cd-token
7. Under **Pipeline:**
   - **Definition:** Pipeline script from SCM
   - **SCM:** Git
   - **Repository URL:** https://github.com/maazzafar1234/PulseDesk
   - **Credentials:** github-credentials
   - **Branches to build:** */main
   - **Script path:** Automations/PulseDesk-CD-Pipeline.groovy
8. Click **Save**

---

## Step 6: Configure GitHub Integration

### 6.1 Add GitHub Webhook to Repository

1. Go to **GitHub** → **PulseDesk repository**
2. Click **Settings** → **Webhooks**
3. Click **Add webhook**
4. Configure:
   - **Payload URL:** http://44.198.186.67:8080/github-webhook/
   - **Content type:** application/json
   - **Events:** Let me select individual events
     - ✓ Pushes
     - ✓ Pull requests
   - **Active:** ✓
5. Click **Add webhook**

---

## Step 7: AWS Security Group Configuration

### Allow Jenkins Communication

1. Go to **AWS EC2** → **Security Groups**
2. Find the security group for the master node (sg-0ae27ab02eee67f04)
3. Add inbound rules:
   - **Port 8080** (Jenkins UI)
   - **Port 50000** (Jenkins Agent Communication)
   - **Port 465** (SMTP for Email)

---

## Step 8: Run the First Build

### 8.1 Trigger PulseDesk-CI Pipeline

1. Go to Jenkins Dashboard
2. Click on **PulseDesk-CI**
3. Click **Build Now**
4. Monitor the build in **Console Output**

### 8.2 Expected Pipeline Stages

The CI pipeline will execute these stages:
1. ✅ Declarative: Checkout SCM
2. ✅ Workspace cleanup
3. ✅ Git: Code Checkout
4. ✅ Build: Backend
5. ✅ Build: Frontend
6. ✅ Verify: Docker Images
7. ✅ SonarQube: Code Analysis
8. ✅ SonarQube Quality Gate
9. ✅ Exporting environment variables
10. ✅ Backend: Build Docker Image
11. ✅ Frontend: Build Docker Image
12. ✅ Docker: Verify Image Tags
13. ✅ Docker Hub: Push Images
14. ✅ Git: Code Push with Updated Tags
15. ✅ Declarative: Post Actions

### 8.3 Trigger PulseDesk-CD Pipeline

1. Go to Jenkins Dashboard
2. Click on **PulseDesk-CD**
3. Click **Build Now**
4. Monitor the deployment in **Console Output**

### 8.4 Expected Deployment Stages

The CD pipeline will execute these stages:
1. ✅ Declarative: Checkout SCM
2. ✅ Workspace cleanup
3. ✅ Git: Code Checkout
4. ✅ Update: Kubernetes manifests
5. ✅ Git: Code update and push to GitHub
6. ✅ Kubernetes: Verify Cluster Connectivity
7. ✅ Kubernetes: Update Deployments
8. ✅ Kubernetes: Verify Pod Status
9. ✅ Kubernetes: Health Check
10. ✅ ArgoCD: Trigger Sync
11. ✅ Deployment: Verify Services
12. ✅ Declarative: Post Actions

---

## Step 9: Verify Deployment

### Check Application Status

```bash
# SSH into master node
ssh -i pulsedesk-key.pem ubuntu@44.198.186.67

# Check pods
kubectl get pods -n pulsedesk

# Check services
kubectl get svc -n pulsedesk

# Get worker node IP
kubectl get nodes -o wide

# Access application
# Frontend: http://<NODE-IP>:31100
# Backend: http://<NODE-IP>:31000/api/health
```

---

## Step 10: Setup Build Triggers

### Automatic Build on GitHub Push

1. Ensure GitHub webhook is configured (Step 6)
2. Every push to main branch will automatically trigger **PulseDesk-CI**
3. After CI completes, manually trigger **PulseDesk-CD** or set up webhook

---

## Troubleshooting

### Issue: Pipeline not triggering on GitHub push
**Solution:** 
- Verify GitHub webhook is configured
- Check Jenkins security groups allow GitHub IPs
- Check GitHub Personal Access Token has correct scopes

### Issue: Docker Hub login failing
**Solution:**
- Verify docker-hub-credentials are correct
- Check Docker Hub username and password

### Issue: Kubernetes deployment failing
**Solution:**
- Check kubeconfig is available on Jenkins master
- Verify service account has correct permissions
- Check cluster connectivity with `kubectl cluster-info`

### Issue: SonarQube Quality Gate failing
**Solution:**
- Check SonarQube server is running
- Verify sonarqube-token is correct
- Check webhook configuration in SonarQube

---

## Next Steps

1. ✅ Configure email notifications
2. ✅ Add all credentials
3. ✅ Install all plugins
4. ✅ Create both pipelines
5. ✅ Test CI pipeline
6. ✅ Test CD pipeline
7. ✅ Setup GitHub webhooks
8. ✅ Monitor deployments

---

## Resources

- **Jenkins Documentation:** https://www.jenkins.io/doc/
- **Docker Plugin:** https://plugins.jenkins.io/docker-commons/
- **SonarQube Scanner:** https://docs.sonarqube.org/latest/analysis/scan/sonarscanner-for-jenkins/
- **Kubernetes Plugin:** https://plugins.jenkins.io/kubernetes/
- **GitHub Integration:** https://plugins.jenkins.io/github/

---

**Created:** 2026-11-13  
**PulseDesk CI/CD Pipeline Setup Complete!** 🎉
