package com.pulsedesk

/**
 * Git operations for CI/CD pipeline
 */
class GitOps {
    
    def script
    
    GitOps(script) {
        this.script = script
    }
    
    /**
     * Update Kubernetes manifests with new image tags
     */
    void updateKubernetesManifests(String repoUrl, String buildNumber) {
        script.echo "📝 Updating Kubernetes manifests with new image tags..."
        script.sh """
            if [ -d "kubernetes" ]; then
                cd kubernetes
                
                # Update frontend image
                sed -i "s|image: .*frontend.*|image: ${repoUrl}:frontend-${buildNumber}|g" frontend-deployment.yaml || true
                
                # Update backend image
                sed -i "s|image: .*backend.*|image: ${repoUrl}:backend-${buildNumber}|g" backend-deployment.yaml || true
                
                echo "✅ Kubernetes manifests updated"
                cd ..
            else
                echo "⚠️ kubernetes/ directory not found - skipping manifest updates"
            fi
        """
    }
    
    /**
     * Commit and push changes to Git repository
     */
    void commitAndPush(String commitMessage, String credentialsId, String repository) {
        script.echo "📤 Committing and pushing changes to Git..."
        script.withCredentials([
            script.usernamePassword(credentialsId: credentialsId, 
                                   usernameVariable: 'GIT_USER', 
                                   passwordVariable: 'GIT_TOKEN')
        ]) {
            script.sh """
                git config user.email "jenkins@pulsedesk.local"
                git config user.name "Jenkins CI"
                
                git add kubernetes/ 2>/dev/null || true
                git commit -m "${commitMessage}" || echo "No changes to commit"
                
                git push https://\${GIT_USER}:\${GIT_TOKEN}@${repository} main || true
                echo "✅ Changes pushed to Git"
            """
        }
    }
    
    /**
     * Create and push Git tag
     */
    void createAndPushTag(String tagName, String tagMessage, String credentialsId, String repository) {
        script.echo "🏷️ Creating and pushing Git tag..."
        script.withCredentials([
            script.usernamePassword(credentialsId: credentialsId, 
                                   usernameVariable: 'GIT_USER', 
                                   passwordVariable: 'GIT_TOKEN')
        ]) {
            script.sh """
                git config user.email "jenkins@pulsedesk.local"
                git config user.name "Jenkins CI"
                
                git tag -a "${tagName}" -m "${tagMessage}"
                git push https://\${GIT_USER}:\${GIT_TOKEN}@${repository} --tags
                echo "✅ Git tag created and pushed"
            """
        }
    }
    
    /**
     * Clean workspace
     */
    void cleanWorkspace() {
        script.echo "🧹 Cleaning workspace..."
        script.cleanWs()
        script.echo "✅ Workspace cleaned"
    }
}
