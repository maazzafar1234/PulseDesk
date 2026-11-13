package com.pulsedesk

/**
 * Code quality and security scanning gates
 */
class QualityGates {
    
    def script
    
    QualityGates(script) {
        this.script = script
    }
    
    /**
     * Run OWASP Dependency Check for vulnerability scanning
     */
    void owaspDependencyCheck() {
        script.echo "🔍 Running OWASP Dependency Check..."
        script.sh '''
            docker run --rm -v ${WORKSPACE}:/src owasp/dependency-check:latest \
                --scan /src \
                --format HTML \
                --out /src/dependency-check-report \
                --project PulseDesk || true
            echo "✅ OWASP Dependency Check complete"
        '''
    }
    
    /**
     * Run SonarQube code analysis
     */
    void sonarQubeAnalysis(String sonarHostUrl, String sonarToken) {
        script.echo "📊 Running SonarQube code analysis..."
        script.sh """
            sonar-scanner \
              -Dsonar.projectKey=pulsedesk \
              -Dsonar.projectName=PulseDesk \
              -Dsonar.sources=server,client \
              -Dsonar.exclusions=**/node_modules/**,**/.git/**,**/dist/**,**/build/** \
              -Dsonar.host.url=${sonarHostUrl} \
              -Dsonar.login=${sonarToken}
            echo "✅ Code analysis complete"
        """
    }
    
    /**
     * Scan Docker images with Trivy for vulnerabilities
     */
    void trivyImageScan(String repoUrl, String buildNumber) {
        script.echo "🔐 Scanning Docker images with Trivy..."
        script.sh """
            trivy image --exit-code 0 --severity HIGH,CRITICAL \
                ${repoUrl}:frontend-${buildNumber}
            
            trivy image --exit-code 0 --severity HIGH,CRITICAL \
                ${repoUrl}:backend-${buildNumber}
            
            echo "✅ Trivy image scan complete"
        """
    }
    
    /**
     * Wait for SonarQube Quality Gate
     */
    void waitForQualityGate() {
        script.echo "⏳ Waiting for SonarQube Quality Gate..."
        script.timeout(time: 5, unit: 'MINUTES') {
            script.waitForQualityGate abortPipeline: false
        }
        script.echo "✅ Quality Gate check complete"
    }
}
