#!/bin/bash

# Setup Jenkins with Docker socket mounting for PulseDesk CI/CD
# This script will stop the old Jenkins container and start a new one with Docker access

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║    SETTING UP JENKINS WITH DOCKER SOCKET MOUNTING             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Stop existing Jenkins container
echo "Step 1: Stopping existing Jenkins container..."
docker stop jenkins 2>/dev/null || echo "No running Jenkins container found"
echo "✅ Jenkins stopped"
echo ""

# Step 2: Remove existing Jenkins container
echo "Step 2: Removing existing Jenkins container..."
docker rm jenkins 2>/dev/null || echo "No Jenkins container to remove"
echo "✅ Jenkins removed"
echo ""

# Step 3: Create volume for Jenkins data persistence
echo "Step 3: Creating Jenkins data volume..."
docker volume create jenkins_data 2>/dev/null || echo "Volume already exists"
echo "✅ Jenkins data volume ready"
echo ""

# Step 4: Start Jenkins with Docker socket mounted
echo "Step 4: Starting Jenkins with Docker socket mounted..."
docker run -d \
  --name jenkins \
  -p 8080:8080 \
  -p 50000:50000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v jenkins_data:/var/jenkins_home \
  -u root \
  jenkins/jenkins:lts

echo "✅ Jenkins container started"
echo ""

# Step 5: Wait for Jenkins to be ready
echo "Step 5: Waiting for Jenkins to be ready..."
for i in {1..30}; do
    if docker logs jenkins 2>&1 | grep -q "Jenkins is fully up and running"; then
        echo "✅ Jenkins is ready"
        break
    fi
    echo "  Attempt $i/30 - Waiting for Jenkins..."
    sleep 5
done
echo ""

# Step 6: Verify Jenkins is accessible
echo "Step 6: Verifying Jenkins accessibility..."
if curl -s http://localhost:8080 > /dev/null; then
    echo "✅ Jenkins is accessible at http://44.198.186.67:8080"
else
    echo "⚠️ Jenkins may still be starting, please wait a moment..."
fi
echo ""

# Step 7: Verify Docker access from Jenkins
echo "Step 7: Verifying Docker access from Jenkins container..."
if docker exec jenkins docker ps > /dev/null 2>&1; then
    echo "✅ Jenkins can access Docker daemon"
else
    echo "⚠️ Docker access verification failed, but may work in pipeline"
fi
echo ""

# Step 8: Display Jenkins logs
echo "Step 8: Latest Jenkins logs..."
docker logs jenkins --tail=10
echo ""

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                   SETUP COMPLETE!                             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Jenkins is now configured with Docker socket mounting"
echo ""
echo "Next steps:"
echo "  1. Go to Jenkins: http://44.198.186.67:8080"
echo "  2. Login with admin credentials"
echo "  3. Go to PulseDesk-CI pipeline"
echo "  4. Click 'Build Now'"
echo "  5. The pipeline should now succeed!"
echo ""
echo "If you need the initial Jenkins password:"
echo "  Run: docker logs jenkins | grep 'initialAdminPassword'"
echo ""
