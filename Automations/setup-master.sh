#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}PulseDesk Master Machine Setup${NC}"
echo -e "${YELLOW}========================================${NC}"

# Update system
echo -e "${GREEN}[1/10] Updating system packages...${NC}"
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install curl wget git unzip -y

# Install Docker
echo -e "${GREEN}[2/10] Installing Docker...${NC}"
sudo apt-get install docker.io -y
sudo usermod -aG docker ubuntu
newgrp docker
docker --version

# Install Java
echo -e "${GREEN}[3/10] Installing Java 17...${NC}"
sudo apt-get install fontconfig openjdk-17-jre -y
java -version

# Install Jenkins
echo -e "${GREEN}[4/10] Installing Jenkins...${NC}"
sudo apt-get install -y gnupg2 ca-certificates

# Download Jenkins key with retry
sudo wget -O /usr/share/keyrings/jenkins-keyring.asc \
  https://pkg.jenkins.io/debian-stable/jenkins.io.key || \
sudo wget -O /usr/share/keyrings/jenkins-keyring.asc \
  https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key || \
  echo "Warning: Could not download Jenkins key, continuing without signature verification"

echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc]" \
  https://pkg.jenkins.io/debian-stable binary/ | sudo tee \
  /etc/apt/sources.list.d/jenkins.list > /dev/null || \
echo "deb https://pkg.jenkins.io/debian-stable binary/" | sudo tee \
  /etc/apt/sources.list.d/jenkins.list > /dev/null

sudo apt-get update -y || echo "Warning: Some packages failed to update"
sudo apt-get install jenkins -y
sudo systemctl start jenkins
sudo systemctl enable jenkins

JENKINS_PASS=$(sudo cat /var/lib/jenkins/secrets/initialAdminPassword)
echo -e "${GREEN}Jenkins Initial Password: ${JENKINS_PASS}${NC}"

# Install AWSCLI
echo -e "${GREEN}[5/10] Installing AWSCLI...${NC}"
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
rm -rf aws awscliv2.zip
aws --version

# Install kubectl
echo -e "${GREEN}[6/10] Installing kubectl...${NC}"
curl -o kubectl https://amazon-eks.s3.us-east-1.amazonaws.com/1.27.0/2023-03-13/bin/linux/amd64/kubectl
chmod +x ./kubectl
sudo mv ./kubectl /usr/local/bin
kubectl version --short --client

# Install eksctl
echo -e "${GREEN}[7/10] Installing eksctl...${NC}"
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin
eksctl version

# Install Helm
echo -e "${GREEN}[8/10] Installing Helm...${NC}"
curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
chmod 700 get_helm.sh
./get_helm.sh
rm get_helm.sh
helm version

# Install ArgoCD CLI
echo -e "${GREEN}[9/10] Installing ArgoCD CLI...${NC}"
sudo curl --silent --location -o /usr/local/bin/argocd \
  https://github.com/argoproj/argo-cd/releases/download/v2.8.3/argocd-linux-amd64
sudo chmod +x /usr/local/bin/argocd
argocd version --client

# Install SonarQube via Docker
echo -e "${GREEN}[10/10] Starting SonarQube Server...${NC}"
docker run -itd \
  --name sonarqube-server \
  -p 9000:9000 \
  sonarqube:lts-community

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Master Machine Setup Completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "1. Configure AWS CLI: ${YELLOW}aws configure${NC}"
echo -e "2. Access Jenkins at: ${YELLOW}http://<master-ip>:8080${NC}"
echo -e "3. Jenkins Password: ${GREEN}${JENKINS_PASS}${NC}"
echo -e "4. Access SonarQube at: ${YELLOW}http://<master-ip>:9000${NC}"
echo -e "5. Create EKS Cluster: See DEPLOYMENT_GUIDE.md${NC}"
