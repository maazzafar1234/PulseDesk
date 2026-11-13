#!/bin/bash

# Complete Jenkins setup with admin user and security

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     SETTING UP JENKINS WITH ADMIN USER AND SECURITY           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Stop and remove Jenkins
echo "Step 1: Stopping Jenkins..."
docker stop jenkins 2>/dev/null || true
docker rm jenkins 2>/dev/null || true
echo "✅ Jenkins stopped and removed"
echo ""

# Step 2: Start fresh Jenkins
echo "Step 2: Starting fresh Jenkins..."
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

# Step 3: Wait for Jenkins to be ready
echo "Step 3: Waiting for Jenkins to fully start..."
for i in {1..60}; do
    if docker logs jenkins 2>&1 | grep -q "Jenkins is fully up and running"; then
        echo "✅ Jenkins is fully started"
        break
    fi
    echo "  Attempt $i/60..."
    sleep 2
done
echo ""

# Step 4: Create admin user and enable security
echo "Step 4: Configuring admin user and security..."

# Create the init.groovy.d directory
docker exec jenkins mkdir -p /var/jenkins_home/init.groovy.d

# Create Groovy script to setup admin user
docker exec jenkins bash -c 'cat > /var/jenkins_home/init.groovy.d/security.groovy << '\''EOF'\''
import jenkins.model.Jenkins
import hudson.security.HudsonPrivateSecurityRealm
import hudson.security.FullControlOnceLoggedInAuthorizationStrategy

def instance = Jenkins.getInstance()

// Create private security realm
def realm = new HudsonPrivateSecurityRealm(false)
instance.setSecurityRealm(realm)

// Create admin user
def adminUser = realm.createAccount("admin", "a156b927b4ff4692add4530c81f8da65")
adminUser.save()

// Set authorization strategy
instance.setAuthorizationStrategy(new FullControlOnceLoggedInAuthorizationStrategy())
instance.save()

println "Admin user created: admin / a156b927b4ff4692add4530c81f8da65"
EOF
'

echo "✅ Security configuration created"
echo ""

# Step 5: Restart Jenkins to apply security
echo "Step 5: Restarting Jenkins to apply security..."
docker restart jenkins
sleep 30
echo "✅ Jenkins restarted with security enabled"
echo ""

# Step 6: Verify
echo "Step 6: Verifying Jenkins..."
if curl -s http://localhost:8080 | grep -q "Jenkins"; then
    echo "✅ Jenkins is running"
else
    echo "⚠️ Jenkins may still be starting"
fi
echo ""

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                   SETUP COMPLETE!                             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Jenkins is now configured with admin user:"
echo ""
echo "🔐 Login Credentials:"
echo "   URL: http://44.198.186.67:8080"
echo "   Username: admin"
echo "   Password: a156b927b4ff4692add4530c81f8da65"
echo ""
echo "Next steps:"
echo "1. Go to http://44.198.186.67:8080"
echo "2. Login with credentials above"
echo "3. Create PulseDesk-CI pipeline"
echo "4. Run the pipeline"
echo ""
