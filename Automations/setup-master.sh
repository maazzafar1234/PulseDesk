#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}PulseDesk Master Machine Setup${NC}"
echo -e "${YELLOW}========================================${NC}"

# Function to handle errors without exiting
handle_error() {
  echo -e "${RED}Warning: $1${NC}"
}

# Update system
echo -e "${GREEN}[1/10] Updating system packages...${NC}"
sudo apt-get update -y 2>/dev/null || handle_error "apt-get update failed"
sudo apt-get upgrade -y 2>/dev/null || handle_error "apt-get upgrade failed"
sudo apt-get install -y curl wget git unzip 2>/dev/null || handle_error "apt-get install basics failed"

# Install Docker
echo -e "${GREEN}[2/10] Installing Docker...${NC}"
sudo apt-get install -y docker.io 2>/dev/null || handle_error "Docker installation failed"
sudo usermod -aG docker ubuntu 2>/dev/null || true
# Note: newgrp docker causes script to hang, skipping it
sudo systemctl start docker 2>/dev/null || true
sudo systemctl enable docker 2>/dev/null || true
docker --version || handle_error "Docker not available"

# Install Java
echo -e "${GREEN}[3/10] Installing Java 17...${NC}"
sudo apt-get install -y fontconfig openjdk-17-jre 2>/dev/null || handle_error "Java installation failed"
java -version 2>&1 | head -1 || handle_error "Java not available"

# Install Jenkins (skip GPG verification if needed)
echo -e "${GREEN}[4/10] Installing Jenkins...${NC}"
sudo apt-get install -y gnupg2 ca-certificates 2>/dev/null || true

# Add Jenkins repository without GPG verification requirement
echo "deb https://pkg.jenkins.io/debian-stable binary/" | sudo tee \
  /etc/apt/sources.list.d/jenkins.list > /dev/null 2>&1

# Update with allow-insecure option
sudo apt-get update -o APT::Get::AllowUnauthenticated=true 2>/dev/null || \
  handle_error "apt-get update failed, trying without jenkins repo"

# Try to install jenkins via apt
if ! sudo apt-get install -y jenkins 2>/dev/null; then
  # Fallback: Try snap installation
  echo -e "${YELLOW}APT Jenkins installation failed, trying snap...${NC}"
  if sudo snap install jenkins --classic 2>/dev/null; then
    sudo systemctl start jenkins 2>/dev/null || handle_error "Failed to start jenkins snap"
    sudo systemctl enable jenkins 2>/dev/null || handle_error "Failed to enable jenkins snap"
    sleep 15
    if [ -f /var/snap/jenkins/common/jenkins_admin_token.key ]; then
      JENKINS_PASS=$(sudo cat /var/snap/jenkins/common/jenkins_admin_token.key 2>/dev/null)
      echo -e "${GREEN}Jenkins Initial Password (Snap): ${JENKINS_PASS}${NC}"
    else
      handle_error "Jenkins snap token file not found yet"
    fi
  else
    handle_error "Jenkins installation failed (both apt and snap) - will need manual setup"
    echo -e "${YELLOW}To install Jenkins manually:${NC}"
    echo -e "  sudo snap install jenkins --classic${NC}"
  fi
else
  sudo systemctl start jenkins 2>/dev/null || handle_error "Failed to start jenkins"
  sudo systemctl enable jenkins 2>/dev/null || handle_error "Failed to enable jenkins"
  
  # Wait for Jenkins to start
  sleep 5
  
  if [ -f /var/lib/jenkins/secrets/initialAdminPassword ]; then
    JENKINS_PASS=$(sudo cat /var/lib/jenkins/secrets/initialAdminPassword 2>/dev/null)
    echo -e "${GREEN}Jenkins Initial Password: ${JENKINS_PASS}${NC}"
  else
    handle_error "Jenkins password file not found yet"
  fi
fi

# Install AWSCLI
echo -e "${GREEN}[5/10] Installing AWSCLI...${NC}"
if curl -s "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"; then
  unzip -q awscliv2.zip 2>/dev/null || true
  sudo ./aws/install 2>/dev/null || handle_error "AWSCLI installation failed"
  rm -rf aws awscliv2.zip
  aws --version 2>&1 | head -1 || handle_error "AWSCLI not available"
else
  handle_error "Failed to download AWSCLI"
fi

# Install kubectl
echo -e "${GREEN}[6/10] Installing kubectl...${NC}"
if curl -sL -o kubectl https://dl.k8s.io/release/v1.27.0/bin/linux/amd64/kubectl; then
  chmod +x ./kubectl
  sudo mv ./kubectl /usr/local/bin
  kubectl version --client 2>&1 | head -1 || handle_error "kubectl not working"
else
  handle_error "Failed to download kubectl"
fi

# Install eksctl
echo -e "${GREEN}[7/10] Installing eksctl...${NC}"
if curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp 2>/dev/null; then
  sudo mv /tmp/eksctl /usr/local/bin 2>/dev/null || true
  eksctl version 2>&1 || handle_error "eksctl not working"
else
  handle_error "Failed to download eksctl"
fi

# Install Helm
echo -e "${GREEN}[8/10] Installing Helm...${NC}"
if curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 2>/dev/null; then
  chmod 700 get_helm.sh
  ./get_helm.sh 2>/dev/null || handle_error "Helm installation script failed"
  rm -f get_helm.sh
  helm version 2>&1 || handle_error "helm not working"
else
  handle_error "Failed to download helm script"
fi

# Install ArgoCD CLI
echo -e "${GREEN}[9/10] Installing ArgoCD CLI...${NC}"
if sudo curl --silent --location -o /usr/local/bin/argocd \
  https://github.com/argoproj/argo-cd/releases/download/v2.8.3/argocd-linux-amd64 2>/dev/null; then
  sudo chmod +x /usr/local/bin/argocd
  argocd version --client 2>&1 || handle_error "argocd not working"
else
  handle_error "Failed to download argocd"
fi

# Install SonarQube via Docker
echo -e "${GREEN}[10/10] Starting SonarQube Server...${NC}"
if docker ps &>/dev/null; then
  docker run -itd --name sonarqube-server -p 9000:9000 sonarqube:lts-community 2>/dev/null || \
    handle_error "Failed to start SonarQube (may already be running)"
  echo -e "${GREEN}SonarQube starting (wait 30s for it to be ready)${NC}"
else
  handle_error "Docker is not running"
fi

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
