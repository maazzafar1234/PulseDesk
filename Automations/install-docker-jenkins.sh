#!/bin/bash

# Install Docker and configure Jenkins for Docker builds
# Run this on the Jenkins master node

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          INSTALLING DOCKER FOR JENKINS CI/CD                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Update package manager
echo "Step 1: Updating package manager..."
sudo apt update
echo "✅ Package manager updated"
echo ""

# Step 2: Install Docker
echo "Step 2: Installing Docker..."
sudo apt install -y docker.io
echo "✅ Docker installed"
echo ""

# Step 3: Verify Docker installation
echo "Step 3: Verifying Docker installation..."
docker --version
echo "✅ Docker version verified"
echo ""

# Step 4: Add jenkins user to docker group
echo "Step 4: Configuring Jenkins user for Docker..."
sudo usermod -aG docker jenkins
echo "✅ Jenkins user added to docker group"
echo ""

# Step 5: Enable Docker service
echo "Step 5: Enabling Docker service..."
sudo systemctl enable docker
sudo systemctl start docker
echo "✅ Docker service enabled and started"
echo ""

# Step 6: Restart Jenkins
echo "Step 6: Restarting Jenkins to apply changes..."
sudo systemctl restart jenkins
echo "✅ Jenkins restarted"
echo ""

# Step 7: Wait for Jenkins to be ready
echo "Step 7: Waiting for Jenkins to be ready..."
sleep 30
echo "✅ Jenkins should be ready"
echo ""

# Step 8: Verify Docker daemon is accessible
echo "Step 8: Verifying Docker daemon..."
docker ps
echo "✅ Docker daemon is accessible"
echo ""

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                   SETUP COMPLETE!                             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Docker is now installed and configured for Jenkins CI/CD"
echo ""
echo "Next steps:"
echo "  1. Go to Jenkins: http://44.198.186.67:8080"
echo "  2. Run PulseDesk-CI pipeline again"
echo "  3. The pipeline should now succeed with Docker builds"
echo ""
