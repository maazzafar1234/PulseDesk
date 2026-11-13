package com.pulsedesk

/**
 * Shared build steps for PulseDesk CI/CD pipeline
 */
class BuildSteps {
    
    def script
    
    BuildSteps(script) {
        this.script = script
    }
    
    /**
     * Build backend (Node.js server)
     */
    void buildBackend() {
        script.echo "🏗️ Building backend application..."
        script.sh '''
            if [ -d "server" ]; then
                cd server
                echo "Installing backend dependencies..."
                npm install
                echo "Backend is Node.js - ready for deployment"
                cd ..
                echo "✅ Backend build complete"
            else
                echo "❌ server/ directory not found!"
                exit 1
            fi
        '''
    }
    
    /**
     * Build frontend (Vite React app)
     */
    void buildFrontend() {
        script.echo "🏗️ Building frontend application..."
        script.sh '''
            if [ -d "client" ]; then
                cd client
                echo "Installing frontend dependencies..."
                npm install
                echo "Building frontend (Vite)..."
                npm run build
                cd ..
                echo "✅ Frontend build complete"
            else
                echo "❌ client/ directory not found!"
                exit 1
            fi
        '''
    }
    
    /**
     * Build Docker images for both backend and frontend
     */
    void buildDockerImages(String repoUrl, String buildNumber) {
        script.echo "🐳 Building Docker images..."
        script.sh """
            if [ -d "client" ] && [ -d "server" ]; then
                docker build -t ${repoUrl}:frontend-${buildNumber} \
                           -t ${repoUrl}:frontend-latest \
                           ./client
                
                docker build -t ${repoUrl}:backend-${buildNumber} \
                           -t ${repoUrl}:backend-latest \
                           ./server
                
                echo "✅ Docker images built successfully"
            else
                echo "❌ Required directories not found (client/ and/or server/)"
                exit 1
            fi
        """
    }
    
    /**
     * Push Docker images to registry
     */
    void pushDockerImages(String repoUrl, String buildNumber, String credentialsId) {
        script.echo "📤 Pushing Docker images to registry..."
        script.withCredentials([
            script.usernamePassword(credentialsId: credentialsId, 
                                   usernameVariable: 'DOCKER_USER', 
                                   passwordVariable: 'DOCKER_PASS')
        ]) {
            script.sh """
                echo "\${DOCKER_PASS}" | docker login -u "\${DOCKER_USER}" --password-stdin
                docker push ${repoUrl}:frontend-${buildNumber}
                docker push ${repoUrl}:frontend-latest
                docker push ${repoUrl}:backend-${buildNumber}
                docker push ${repoUrl}:backend-latest
                docker logout
                echo "✅ Docker images pushed successfully"
            """
        }
    }
}
