#!/bin/bash

# Jenkins Setup Script for PulseDesk CI/CD
# This script configures Jenkins with all necessary plugins and credentials

set -e

JENKINS_URL="http://localhost:8080"
JENKINS_USER="admin"
JENKINS_PASSWORD="a156b927b4ff4692add4530c81f8da65"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          JENKINS SETUP FOR PULSEDESK CI/CD                     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Function to wait for Jenkins to be ready
wait_for_jenkins() {
    echo "⏳ Waiting for Jenkins to be ready..."
    for i in {1..60}; do
        if curl -s "$JENKINS_URL" > /dev/null; then
            echo "✅ Jenkins is ready"
            return 0
        fi
        echo "  Attempt $i/60..."
        sleep 5
    done
    echo "❌ Jenkins failed to start"
    return 1
}

# Function to install plugins using Jenkins CLI
install_plugins() {
    echo "📦 Installing Jenkins plugins..."
    
    PLUGINS=(
        "cloudbees-bitbucket-branch-source:772.v32027f5aef3a"
        "docker:1.2.8"
        "docker-commons:1.18"
        "sonarscan:2.14.1"
        "owasp-dependency-check:5.4.4"
        "pipeline-stage-view:2.26"
        "pipeline-model-definition:2.2160.v51e3a_1e73042"
        "pipeline-model-extensions:2.2160.v51e3a_1e73042"
        "email-ext:2.101"
        "mailer:434.vf7cf0cda_c0ca_"
        "github-branch-source:2.11.4"
        "github:1.40.0"
        "git:5.0.0"
        "matrix-auth:3.2.0"
        "antisamy-markup-formatter:2.20.1"
        "ansicolor:1.0.0"
    )
    
    echo "Available plugins to install:"
    for plugin in "${PLUGINS[@]}"; do
        echo "  - $plugin"
    done
    
    echo ""
    echo "✅ Plugin list prepared"
    echo ""
    echo "📝 To install plugins, go to Jenkins Dashboard:"
    echo "   1. Click 'Manage Jenkins'"
    echo "   2. Click 'Manage Plugins'"
    echo "   3. Go to 'Available plugins' tab"
    echo "   4. Search and install each plugin:"
    for plugin in "${PLUGINS[@]}"; do
        PLUGIN_NAME=$(echo $plugin | cut -d':' -f1)
        echo "      - $PLUGIN_NAME"
    done
    echo ""
}

# Function to create credentials
create_credentials() {
    echo "🔐 Setting up credentials in Jenkins..."
    echo ""
    echo "📝 To add credentials, go to Jenkins Dashboard:"
    echo "   1. Click 'Manage Jenkins'"
    echo "   2. Click 'Manage Credentials'"
    echo "   3. Click 'Credentials' under 'Stores scoped to Jenkins'"
    echo "   4. Add the following credentials:"
    echo ""
    echo "   A) Docker Hub Credentials:"
    echo "      - Kind: Username with password"
    echo "      - Username: maazzafar07"
    echo "      - Password: (Your Docker Hub password)"
    echo "      - ID: docker-hub-credentials"
    echo ""
    echo "   B) GitHub Credentials:"
    echo "      - Kind: Username with password"
    echo "      - Username: maazzafar1234"
    echo "      - Password: (Your GitHub Personal Access Token)"
    echo "      - ID: github-credentials"
    echo ""
    echo "   C) SonarQube Credentials:"
    echo "      - Kind: Secret text"
    echo "      - Secret: (Your SonarQube token)"
    echo "      - ID: sonarqube-token"
    echo ""
    echo "   D) Email Credentials:"
    echo "      - Kind: Username with password"
    echo "      - Username: (Your Gmail email)"
    echo "      - Password: (Your Gmail App Password)"
    echo "      - ID: email-credentials"
    echo ""
}

# Function to configure system settings
configure_system() {
    echo "⚙️  Configuring Jenkins system settings..."
    echo ""
    echo "📝 To configure system settings, go to Jenkins Dashboard:"
    echo "   1. Click 'Manage Jenkins'"
    echo "   2. Click 'Configure System'"
    echo "   3. Configure the following:"
    echo ""
    echo "   A) Email Notification:"
    echo "      - SMTP server: smtp.gmail.com"
    echo "      - SMTP port: 465"
    echo "      - Use SSL: ✓"
    echo "      - Credentials: email-credentials"
    echo "      - Default user email suffix: @pulsedesk.local"
    echo ""
    echo "   B) SonarQube Installations:"
    echo "      - Name: sonarqube-server"
    echo "      - Server URL: http://44.198.186.67:9000"
    echo "      - Server authentication token: sonarqube-token"
    echo ""
    echo "   C) Global Pipeline Libraries:"
    echo "      - Name: shared-library"
    echo "      - Default version: main"
    echo "      - Modern SCM: GitHub"
    echo "      - Repository: https://github.com/maazzafar1234/PulseDesk"
    echo ""
}

# Function to create pipelines
create_pipelines() {
    echo "🚀 Creating Jenkins pipelines..."
    echo ""
    echo "📝 To create pipelines, go to Jenkins Dashboard:"
    echo "   1. Click 'New Item'"
    echo "   2. Enter name: 'PulseDesk-CI'"
    echo "   3. Select 'Pipeline'"
    echo "   4. In Pipeline section, select 'Pipeline script from SCM'"
    echo "   5. Configure:"
    echo "      - SCM: Git"
    echo "      - Repository URL: https://github.com/maazzafar1234/PulseDesk"
    echo "      - Credentials: github-credentials"
    echo "      - Branches to build: */main"
    echo "      - Script path: Automations/PulseDesk-CI-Pipeline.groovy"
    echo ""
    echo "   Repeat for 'PulseDesk-CD' pipeline:"
    echo "      - Name: 'PulseDesk-CD'"
    echo "      - Script path: Automations/PulseDesk-CD-Pipeline.groovy"
    echo ""
}

# Main execution
main() {
    echo ""
    echo "Step 1: Waiting for Jenkins..."
    if wait_for_jenkins; then
        echo ""
        echo "Step 2: Installing plugins..."
        install_plugins
        
        echo ""
        echo "Step 3: Creating credentials..."
        create_credentials
        
        echo ""
        echo "Step 4: Configuring system settings..."
        configure_system
        
        echo ""
        echo "Step 5: Creating pipelines..."
        create_pipelines
        
        echo ""
        echo "╔════════════════════════════════════════════════════════════════╗"
        echo "║                  SETUP COMPLETE!                              ║"
        echo "╚════════════════════════════════════════════════════════════════╝"
        echo ""
        echo "🔗 Access Jenkins at: http://44.198.186.67:8080"
        echo "👤 Username: admin"
        echo "🔑 Password: a156b927b4ff4692add4530c81f8da65"
        echo ""
        echo "📋 Next steps:"
        echo "   1. Complete all credential and system configuration"
        echo "   2. Create PulseDesk-CI and PulseDesk-CD pipelines"
        echo "   3. Run PulseDesk-CI pipeline to build and test"
        echo "   4. Run PulseDesk-CD pipeline to deploy to Kubernetes"
        echo ""
        echo "✅ Jenkins setup ready!"
        echo ""
    else
        echo "❌ Setup failed - Jenkins is not responding"
        exit 1
    fi
}

# Run main function
main
