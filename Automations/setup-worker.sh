#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}PulseDesk Jenkins Worker Setup${NC}"
echo -e "${YELLOW}========================================${NC}"

# Update system
echo -e "${GREEN}[1/6] Updating system packages...${NC}"
sudo apt-get update -y
sudo apt-get upgrade -y

# Install Java
echo -e "${GREEN}[2/6] Installing Java 17...${NC}"
sudo apt-get install fontconfig openjdk-17-jre -y
java -version

# Install Docker
echo -e "${GREEN}[3/6] Installing Docker...${NC}"
sudo apt-get install docker.io -y
sudo usermod -aG docker ubuntu
newgrp docker
docker --version

# Fix Docker socket permissions
echo -e "${GREEN}[4/6] Configuring Docker socket permissions...${NC}"
sudo chmod 777 /var/run/docker.sock

# Install Trivy
echo -e "${GREEN}[5/6] Installing Trivy...${NC}"
sudo apt-get install wget apt-transport-https gnupg lsb-release -y
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
sudo apt-get update -y
sudo apt-get install trivy -y
trivy --version

# Install AWSCLI
echo -e "${GREEN}[6/6] Installing AWSCLI...${NC}"
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
sudo apt-get install unzip -y
unzip awscliv2.zip
sudo ./aws/install
rm -rf aws awscliv2.zip
aws --version

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Jenkins Worker Setup Completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "1. Configure AWS CLI: ${YELLOW}aws configure${NC}"
echo -e "2. Create SSH keys on Master and add to authorized_keys"
echo -e "3. Add this worker to Jenkins Master via UI"
echo -e "4. Verify Docker and Trivy installation"
