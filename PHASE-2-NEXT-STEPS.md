# Phase 2: Software Installation & Configuration

**Status**: AWS Infrastructure Deployed ✅  
**Next**: Install software on Master and Worker nodes  
**Time**: ~1-2 hours  

---

## 🎯 Your Infrastructure is Live!

### Master Node
- **IP**: 44.198.186.67
- **Purpose**: Jenkins Master, SonarQube, ArgoCD, EKS Management
- **Key URLs** (after setup):
  - Jenkins: http://44.198.186.67:8080
  - SonarQube: http://44.198.186.67:9000

### Worker Node  
- **IP**: 44.223.83.142
- **Purpose**: Jenkins Worker, Docker, Trivy, EKS Node
- **Key Software**: Docker daemon, Java, Trivy

---

## ⏱️ Wait 5-10 Minutes First!

Instances are starting up. The user data scripts are initializing.

```bash
# Check instance status
aws ec2 describe-instance-status \
  --instance-ids i-08b7928bc5d224f5f i-03f1dc80b868ed05f \
  --region us-east-1 \
  --query 'InstanceStatuses[].{State:InstanceStatus.Status,System:SystemStatus.Status}'

# Expected: Both "ok"
```

If status is "initializing", wait a few more minutes.

---

## 🔑 Step 1: SSH into Master Node

```bash
# From your local machine (where you have pulsedesk-key.pem)
ssh -i pulsedesk-key.pem ubuntu@44.198.186.67

# Expected output:
# Welcome to Ubuntu 22.04.3 LTS
# ubuntu@pulsedesk-master:~$
```

---

## 🛠️ Step 2: Run Master Setup Script

Once SSH'd into master:

```bash
# Navigate to Automations directory
cd /home/ubuntu
ls -la

# Check if setup script is there
# (It should be - it was embedded in user_data)

# Run the master setup script
bash setup-master.sh

# OR if the file isn't there, copy it from your local machine:
# scp -i pulsedesk-key.pem ./Automations/setup-master.sh ubuntu@44.198.186.67:~/
# ssh -i pulsedesk-key.pem ubuntu@44.198.186.67
# bash setup-master.sh
```

### What This Script Does (~15-20 minutes)

```
✅ Update system packages
✅ Install Docker
✅ Install Java 17
✅ Install Jenkins
✅ Install AWSCLI
✅ Install kubectl
✅ Install eksctl
✅ Install Helm
✅ Install ArgoCD CLI
✅ Start SonarQube (Docker container)
```

### Watch the Output

```bash
# The script will show:
[1/10] Updating system packages...
[2/10] Installing Docker...
[3/10] Installing Java 17...
# ... continues ...
[10/10] Starting SonarQube Server...

# At the end, it will show:
Jenkins Initial Password: xxxxxxxxxxxxxxxx
```

**💾 Save this Jenkins password!** You'll need it to login.

---

## 🔄 Step 3: SSH into Worker Node

While master is setting up (or after), open another terminal:

```bash
ssh -i pulsedesk-key.pem ubuntu@44.223.83.142

# Expected output:
# Welcome to Ubuntu 22.04.3 LTS
# ubuntu@pulsedesk-jenkins-worker:~$
```

---

## 🛠️ Step 4: Run Worker Setup Script

On the worker node:

```bash
# Copy setup script from master OR local
bash setup-worker.sh

# OR
scp -i pulsedesk-key.pem ./Automations/setup-worker.sh ubuntu@44.223.83.142:~/
ssh -i pulsedesk-key.pem ubuntu@44.223.83.142
bash setup-worker.sh
```

### What This Script Does (~5-10 minutes)

```
✅ Update system packages
✅ Install Java 17
✅ Install Docker
✅ Install AWSCLI
✅ Install Trivy
✅ Fix Docker socket permissions
```

---

## 🌐 Step 5: Create EKS Cluster

Back on master node (after setup-master.sh completes):

```bash
# From master
bash create-eks-cluster.sh

# This will:
# 1. Create EKS cluster (wait ~15-20 minutes)
# 2. Create IAM OIDC provider
# 3. Create SSH key pair
# 4. Create node group with 2 nodes
```

### Monitor Progress

```bash
# In another terminal, check cluster status
aws eks describe-cluster \
  --name pulsedesk \
  --region us-east-1 \
  --query 'Cluster.Status'

# Expected progression:
# CREATING → ACTIVE (when ready)

# When it says ACTIVE, cluster is ready
```

---

## 📋 Verification Checklist

After all scripts complete:

### Master Node Verification

```bash
# Check Jenkins
curl http://localhost:8080
# Expected: HTTP 200 or redirect

# Check SonarQube
curl http://localhost:9000
# Expected: HTTP 200 or redirect

# Check Docker
docker --version
# Expected: Docker version XX.XX.XX

# Check kubectl
kubectl version --short --client
# Expected: Version v1.XX.X

# Check EKS cluster
aws eks describe-cluster --name pulsedesk --region us-east-1
# Expected: Cluster status should be ACTIVE
```

### Worker Node Verification

```bash
# SSH to worker
ssh -i pulsedesk-key.pem ubuntu@44.223.83.142

# Check Docker
docker --version
docker ps
# Expected: Docker running

# Check Trivy
trivy --version
# Expected: Trivy version X.XX.X

# Check AWS CLI
aws --version
# Expected: AWS CLI version

# Check Docker socket permissions
ls -la /var/run/docker.sock
# Expected: read/write permissions
```

---

## 🌍 Access Services

### Jenkins
- **URL**: http://44.198.186.67:8080
- **Username**: admin
- **Password**: (shown at end of setup-master.sh output)
- **Action**: Save this password or change it immediately

### SonarQube  
- **URL**: http://44.198.186.67:9000
- **Username**: admin
- **Password**: admin (default - change it!)
- **Action**: Create token for Jenkins integration

### ArgoCD
- **Not yet exposed** - will be setup later
- **Port**: Will be on NodePort range (30000-32767)

---

## 🔐 Security Setup

### Configure AWS CLI on Master

```bash
# SSH to master
ssh -i pulsedesk-key.pem ubuntu@44.198.186.67

# Configure AWS credentials
aws configure

# Enter:
# AWS Access Key ID: [your-access-key]
# AWS Secret Access Key: [your-secret-key]
# Default region: us-east-1
# Default output: json

# Verify
aws sts get-caller-identity
# Should show your AWS account
```

### Configure Jenkins on Master

```bash
# Access Jenkins at http://44.198.186.67:8080
# 1. Enter the initial password from setup script output
# 2. Install suggested plugins
# 3. Create first admin user
# 4. Configure system settings (see docs/CI-CD-SETUP.md)
```

---

## 🔗 Next Phase: Configuration

Once all software is installed:

### Phase 2.1: Jenkins Master Configuration
- Follow: `docs/CI-CD-SETUP.md`
- Install plugins
- Add credentials
- Configure integrations

### Phase 2.2: Add Jenkins Worker Node
- Generate SSH keys on master
- Configure worker in Jenkins UI
- Test connectivity

### Phase 2.3: EKS Cluster Configuration
- Get kubeconfig
- Create namespaces
- Deploy initial applications

### Phase 2.4: ArgoCD Setup
- Setup ArgoCD on EKS cluster
- Add cluster to ArgoCD
- Configure GitOps workflow

---

## ⚠️ Troubleshooting

### SSH Connection Fails
```bash
# Check key permissions
ls -la pulsedesk-key.pem
# Should be: -rw------- (600)

# Fix permissions
chmod 600 pulsedesk-key.pem

# Check instance is running
aws ec2 describe-instances \
  --instance-ids i-08b7928bc5d224f5f \
  --region us-east-1 \
  --query 'Reservations[0].Instances[0].State.Name'
# Should be: running
```

### Setup Script Fails
```bash
# Check logs
cat /var/log/cloud-init-output.log | tail -100

# Or
journalctl -u cloud-final | tail -100

# Re-run script manually
bash setup-master.sh
```

### Jenkins Password Lost
```bash
# Reset Jenkins password
sudo systemctl stop jenkins
sudo vi /var/lib/jenkins/config.xml
# Find <authorizationStrategy> section
# Comment it out, restart
sudo systemctl start jenkins
# Access with any password, change it
```

### Docker Permission Denied
```bash
# Fix Docker permissions
sudo chmod 777 /var/run/docker.sock

# Or
sudo usermod -aG docker ubuntu
newgrp docker
```

---

## 💾 Save These IPs and URLs

```bash
# Master
Master IP: 44.198.186.67
Jenkins: http://44.198.186.67:8080
SonarQube: http://44.198.186.67:9000

# Worker
Worker IP: 44.223.83.142

# AWS
VPC ID: vpc-0eb607f413a5fe998
Security Group: sg-0ae27ab02eee67f04
Master Instance ID: i-08b7928bc5d224f5f
Worker Instance ID: i-03f1dc80b868ed05f

# SSH
ssh -i pulsedesk-key.pem ubuntu@44.198.186.67    # Master
ssh -i pulsedesk-key.pem ubuntu@44.223.83.142    # Worker
```

---

## ⏱️ Timeline

```
Now (00:00): Infrastructure deployed
 05:00: Instances ready for SSH
 25:00: Master setup complete
 35:00: Worker setup complete
 55:00: EKS cluster created
 60:00: Jenkins accessible & configured
```

---

## 📚 Documentation to Read

1. **docs/DEPLOYMENT_GUIDE.md** - Complete setup reference
2. **docs/CI-CD-SETUP.md** - Jenkins configuration
3. **kubernetes/CUSTOMIZATION.md** - Kubernetes manifest setup
4. **docs/DEPLOYMENT_DECISION_GUIDE.md** - Architecture decisions

---

## Next Command to Run

```bash
# SSH to master
ssh -i pulsedesk-key.pem ubuntu@44.198.186.67

# Run setup (inside master node)
bash setup-master.sh
```

---

**Status**: ✅ Infrastructure Ready | ⏳ Software Installation Next

