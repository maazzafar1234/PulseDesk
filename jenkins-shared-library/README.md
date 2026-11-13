# PulseDesk Jenkins Shared Library

This shared library provides reusable Groovy code and global variables for the PulseDesk CI/CD pipeline.

## Structure

```
jenkins-shared-library/
├── src/com/pulsedesk/          # Groovy classes
│   ├── BuildSteps.groovy       # Build operations
│   ├── QualityGates.groovy     # Code quality & security scanning
│   └── GitOps.groovy           # Git operations
├── vars/                       # Global variables
│   └── pipelineLogger.groovy   # Logging utility
└── resources/                  # Resources (config files, scripts)
```

## Classes

### BuildSteps
Provides build operations for backend and frontend

**Methods:**
- `buildBackend()` - Builds Node.js backend (server/)
- `buildFrontend()` - Builds Vite React frontend (client/)
- `buildDockerImages(repoUrl, buildNumber)` - Builds Docker images
- `pushDockerImages(repoUrl, buildNumber, credentialsId)` - Pushes to registry

**Usage:**
```groovy
def buildSteps = new com.pulsedesk.BuildSteps(this)
buildSteps.buildBackend()
buildSteps.buildFrontend()
```

### QualityGates
Provides security and code quality scanning

**Methods:**
- `owaspDependencyCheck()` - OWASP dependency scanning
- `sonarQubeAnalysis(hostUrl, token)` - Code quality analysis
- `trivyImageScan(repoUrl, buildNumber)` - Docker image vulnerability scan
- `waitForQualityGate()` - Wait for SonarQube quality gate result

**Usage:**
```groovy
def qualityGates = new com.pulsedesk.QualityGates(this)
qualityGates.owaspDependencyCheck()
qualityGates.sonarQubeAnalysis(SONARQUBE_HOST, SONARQUBE_TOKEN)
```

### GitOps
Provides Git operations for CI/CD

**Methods:**
- `updateKubernetesManifests(repoUrl, buildNumber)` - Updates k8s manifests
- `commitAndPush(message, credentialsId, repository)` - Commits and pushes changes
- `createAndPushTag(tagName, message, credentialsId, repository)` - Creates git tags
- `cleanWorkspace()` - Cleans Jenkins workspace

**Usage:**
```groovy
def gitOps = new com.pulsedesk.GitOps(this)
gitOps.updateKubernetesManifests(DOCKER_REPO, BUILD_NUMBER)
gitOps.commitAndPush("Update images", "github-credentials", "github.com/user/repo")
```

## Global Variables

### pipelineLogger
Provides consistent logging with emoji indicators

**Methods:**
- `info(message)` - Info logs with ℹ️
- `success(message)` - Success logs with ✅
- `warning(message)` - Warning logs with ⚠️
- `error(message)` - Error logs with ❌
- `debug(message)` - Debug logs (only if DEBUG=true)
- `section(title)` - Section header logs

**Usage:**
```groovy
pipelineLogger.info("Starting build")
pipelineLogger.success("Build completed")
```

## Installation

### Jenkins Configuration

1. **Add to Jenkins:**
   - Go to Jenkins Manage → Configure System → Global Pipeline Libraries
   - Add new library:
     - Name: `pulsedesk-pipeline`
     - Default version: `main`
     - Repository: `https://github.com/maazzafar1234/PulseDesk.git`
     - Credentials: GitHub credentials
     - Load implicitly: ✓
     - Allow default version to be overridden: ✓

2. **Or add to Jenkinsfile:**
   ```groovy
   @Library('pulsedesk-pipeline') _
   ```

## Example Jenkinsfile

```groovy
@Library('pulsedesk-pipeline') _

pipeline {
    agent any
    
    stages {
        stage('Build') {
            steps {
                script {
                    def buildSteps = new com.pulsedesk.BuildSteps(this)
                    buildSteps.buildBackend()
                    buildSteps.buildFrontend()
                    buildSteps.buildDockerImages('maazzafar07/pulsedesk', BUILD_NUMBER)
                }
            }
        }
        
        stage('Quality Gates') {
            steps {
                script {
                    def qualityGates = new com.pulsedesk.QualityGates(this)
                    qualityGates.owaspDependencyCheck()
                    qualityGates.sonarQubeAnalysis(SONARQUBE_HOST, SONARQUBE_TOKEN)
                }
            }
        }
        
        stage('Push') {
            steps {
                script {
                    def buildSteps = new com.pulsedesk.BuildSteps(this)
                    buildSteps.pushDockerImages('maazzafar07/pulsedesk', BUILD_NUMBER, 'docker-hub-credentials')
                }
            }
        }
    }
}
```

## Best Practices

1. **Always use the shared library for common operations** to maintain consistency
2. **Update the library versions** as new features are added
3. **Use pipelineLogger** for all logging to maintain uniform formatting
4. **Keep credentials in Jenkins** - never commit sensitive data
5. **Test shared library changes** in a separate branch first

## Troubleshooting

### Library not found
- Ensure the repository URL is correct
- Verify Jenkins has access to the repository
- Check Jenkins logs for detailed errors

### Methods not recognized
- Verify the library is loaded: `@Library('pulsedesk-pipeline') _`
- Check class paths match: `com.pulsedesk.ClassName`
- Ensure groovy-sandbox has permission for used methods

### Credentials issues
- Verify credential IDs exist in Jenkins
- Check Jenkins > Manage Credentials for stored credentials
- Ensure pipeline has permission to use credentials
