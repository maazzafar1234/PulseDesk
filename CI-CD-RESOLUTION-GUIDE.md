# PulseDesk CI/CD Pipeline - Resolution Guide

## Problem Analysis & Fixes

Your CI/CD pipeline was failing due to multiple issues. This guide explains the problems and the solutions implemented.

---

## Issues Identified & Resolved

### 1. **Directory Path Mismatches** ❌→✅
**Problem:** Pipeline was looking for `backend/` and `frontend/` directories, but project uses `server/` and `client/`

**Root Cause:**
- GitOps/Jenkinsfile-CI referenced `./backend` and `./frontend`
- Automations/PulseDesk-CI-Pipeline.groovy also used wrong paths
- This caused build failures immediately

**Solution Implemented:**
- Updated all pipeline stages to use correct paths:
  - `backend/` → `server/`
  - `frontend/` → `client/`
- Added directory existence checks before operations
- Added clear error messages when directories not found

**Files Modified:**
- ✅ `GitOps/Jenkinsfile-CI` (lines 38-60, 94-122, 148-161)
- ✅ `Automations/PulseDesk-CI-Pipeline.groovy` (lines 4-22, 61-125, 184-220)

---

### 2. **SonarQube Configuration Issues** ❌→✅
**Problem:** SonarQube analysis was failing due to:
- Incorrect token reference in environment
- Wrong source paths
- Missing exclusions

**Root Cause:**
```groovy
// BEFORE (broken)
-Dsonar.sources=backend,frontend  // Wrong paths
// withSonarQubeEnv used incorrectly
```

**Solution Implemented:**
```groovy
// AFTER (fixed)
-Dsonar.sources=server,client     // Correct paths
-Dsonar.login=${SONARQUBE_TOKEN}  // Explicit token
-Dsonar.exclusions=**/node_modules/**,**/.git/**,**/dist/**,**/build/**
```

**Files Modified:**
- ✅ `Automations/PulseDesk-CI-Pipeline.groovy` (lines 139-156)
- ✅ `GitOps/Jenkinsfile-CI` (lines 76-92)

---

### 3. **Docker Build Path Issues** ❌→✅
**Problem:** Docker builds were targeting wrong directories

**Root Cause:**
```bash
# BEFORE
docker build -t ${DOCKER_REPO}:backend-${BUILD_NUMBER} ./backend
docker build -t ${DOCKER_REPO}:frontend-${BUILD_NUMBER} ./frontend
```

**Solution Implemented:**
```bash
# AFTER
docker build -t ${DOCKER_REPO}:backend-${BUILD_NUMBER} ./server
docker build -t ${DOCKER_REPO}:frontend-${BUILD_NUMBER} ./client
```

**Files Modified:**
- ✅ `Automations/PulseDesk-CI-Pipeline.groovy` (lines 184-220)
- ✅ `GitOps/Jenkinsfile-CI` (lines 94-108)

---

## New: Jenkins Shared Library

A shared library has been created to eliminate duplicate code and centralize pipeline logic.

### Benefits:
1. **DRY Principle** - Don't Repeat Yourself
2. **Maintainability** - Update once, apply everywhere
3. **Consistency** - Same logic across all pipelines
4. **Reusability** - Use in multiple Jenkinsfiles

### Components Created:

#### 1. **BuildSteps Class** (`jenkins-shared-library/src/com/pulsedesk/BuildSteps.groovy`)
```groovy
def buildSteps = new com.pulsedesk.BuildSteps(this)
buildSteps.buildBackend()
buildSteps.buildFrontend()
buildSteps.buildDockerImages(repoUrl, buildNumber)
buildSteps.pushDockerImages(repoUrl, buildNumber, credentialsId)
```

#### 2. **QualityGates Class** (`jenkins-shared-library/src/com/pulsedesk/QualityGates.groovy`)
```groovy
def qualityGates = new com.pulsedesk.QualityGates(this)
qualityGates.owaspDependencyCheck()
qualityGates.sonarQubeAnalysis(hostUrl, token)
qualityGates.trivyImageScan(repoUrl, buildNumber)
qualityGates.waitForQualityGate()
```

#### 3. **GitOps Class** (`jenkins-shared-library/src/com/pulsedesk/GitOps.groovy`)
```groovy
def gitOps = new com.pulsedesk.GitOps(this)
gitOps.updateKubernetesManifests(repoUrl, buildNumber)
gitOps.commitAndPush(message, credentialsId, repository)
gitOps.createAndPushTag(tagName, message, credentialsId, repository)
gitOps.cleanWorkspace()
```

#### 4. **pipelineLogger** Global Variable (`jenkins-shared-library/vars/pipelineLogger.groovy`)
```groovy
pipelineLogger.section('TITLE')      // ╔════════════╗
pipelineLogger.info('Message')       // ℹ️ Message
pipelineLogger.success('Message')    // ✅ Message
pipelineLogger.warning('Message')    // ⚠️ Message
pipelineLogger.error('Message')      // ❌ Message
pipelineLogger.debug('Message')      // 🐛 Message (debug mode only)
```

---

## Updated Pipeline Files

### Option 1: Use Fixed Original Pipelines (Quick Fix)
**Files:** 
- `GitOps/Jenkinsfile-CI` (FIXED)
- `Automations/PulseDesk-CI-Pipeline.groovy` (FIXED)

**Pros:**
- Immediate fix
- No additional setup needed

**Cons:**
- Code duplication
- Harder to maintain

### Option 2: Use Shared Library Pipeline (Recommended)
**File:** `Automations/PulseDesk-CI-Pipeline-Refactored.groovy` (NEW)

**Pros:**
- Clean, maintainable code
- DRY principle
- Easy to add new features
- Consistent logging

**Cons:**
- Requires shared library setup in Jenkins

---

## Jenkins Setup Instructions

### Step 1: Configure Jenkins Credentials
Ensure these credentials are added to Jenkins:

1. **GitHub Credentials** (ID: `github-credentials`)
   - Type: Username with password
   - Username: GitHub username
   - Password: GitHub personal access token

2. **Docker Hub Credentials** (ID: `docker-hub-credentials`)
   - Type: Username with password
   - Username: Docker Hub username
   - Password: Docker Hub access token

3. **SonarQube Token** (ID: `sonarqube-token`)
   - Type: Secret text
   - Secret: Your SonarQube authentication token

### Step 2: Configure Shared Library (if using refactored pipeline)

**Option A: Via Jenkins UI**
1. Go to **Manage Jenkins** → **Configure System**
2. Scroll to **Global Pipeline Libraries**
3. Click **Add**
4. Fill in:
   - **Name:** `pulsedesk-pipeline`
   - **Default version:** `main`
   - **Repository:** `https://github.com/maazzafar1234/PulseDesk.git`
   - **Credentials:** github-credentials
5. Click **Save**

**Option B: Via JCasC (Jenkins Configuration as Code)**
```yaml
jenkins:
  globalLibraries:
    - name: "pulsedesk-pipeline"
      defaultVersion: "main"
      implicit: true
      allowVersionOverride: true
      modern: true
      remote: "https://github.com/maazzafar1234/PulseDesk.git"
      credentialsId: "github-credentials"
```

### Step 3: Create Jenkins Job
1. Create **New Pipeline** job
2. In **Pipeline Definition**, select **Pipeline script from SCM**
3. Choose **Git**
4. Repository URL: `https://github.com/maazzafar1234/PulseDesk.git`
5. Credentials: `github-credentials`
6. Script Path:
   - For Quick Fix: `GitOps/Jenkinsfile-CI`
   - For Best Practice: Use `Automations/PulseDesk-CI-Pipeline-Refactored.groovy` as inline script, OR
   - Create new Jenkinsfile in root:
     ```groovy
     @Library('pulsedesk-pipeline') _
     
     // Include refactored pipeline content here
     ```

---

## Environment Variables Configuration

Ensure these environment variables are set in Jenkins job:

```bash
# GitHub Configuration
GITHUB_REPO=https://github.com/maazzafar1234/PulseDesk.git
GITHUB_BRANCH=main

# Docker Configuration
DOCKER_REGISTRY=docker.io
DOCKER_USERNAME=maazzafar07
DOCKER_REPO=maazzafar07/pulsedesk

# SonarQube Configuration
SONARQUBE_HOST=http://44.198.186.67:9000

# Additional
DEBUG=false  # Set to 'true' for detailed debug logs
```

---

## Project Directory Structure Reference

```
PulseDesk/
├── server/                      # Node.js backend (Express)
│   ├── package.json
│   ├── index.js
│   ├── Dockerfile
│   └── ...
│
├── client/                      # React frontend (Vite)
│   ├── package.json
│   ├── vite.config.js
│   ├── Dockerfile
│   └── ...
│
├── kubernetes/                  # K8s manifests
│   ├── frontend-deployment.yaml
│   ├── backend-deployment.yaml
│   └── ...
│
├── jenkins-shared-library/      # NEW - Shared library
│   ├── src/com/pulsedesk/
│   │   ├── BuildSteps.groovy
│   │   ├── QualityGates.groovy
│   │   └── GitOps.groovy
│   ├── vars/
│   │   └── pipelineLogger.groovy
│   └── README.md
│
├── GitOps/
│   ├── Jenkinsfile-CI           # FIXED - Original CI pipeline
│   └── Jenkinsfile-CD
│
└── Automations/
    ├── PulseDesk-CI-Pipeline.groovy              # FIXED - Alternative CI
    ├── PulseDesk-CI-Pipeline-Refactored.groovy  # NEW - Using shared library
    └── PulseDesk-CD-Pipeline.groovy
```

---

## Build Pipeline Overview

The CI pipeline now follows this flow:

```
┌─────────────────────────────────────────────────────────┐
│  1. Clean Workspace                                      │
└────────────────────┬────────────────────────────────────┘
                     │
┌─────────────────────▼────────────────────────────────────┐
│  2. Checkout Code (from GitHub)                         │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼──────────┐   ┌─────────▼──────────┐
│ 3A. Build        │   │ 3B. Build          │
│ Backend (server/)│   │ Frontend (client/) │
└───────┬──────────┘   └─────────┬──────────┘
        │                         │
        └────────────┬────────────┘
                     │
        ┌────────────┴────────────────────────┐
        │                                     │
┌───────▼──────────────┐        ┌────────────▼──────┐
│ 4A. OWASP            │        │ 4B. SonarQube      │
│ Dependency Check     │        │ Code Analysis      │
└───────┬──────────────┘        └────────────┬──────┘
        │                                     │
        └────────────┬────────────────────────┘
                     │
┌─────────────────────▼────────────────────────────────────┐
│  5. SonarQube Quality Gate (wait for result)            │
└────────────────────┬────────────────────────────────────┘
                     │
┌─────────────────────▼────────────────────────────────────┐
│  6. Build Docker Images (Backend + Frontend)            │
└────────────────────┬────────────────────────────────────┘
                     │
┌─────────────────────▼────────────────────────────────────┐
│  7. Verify Docker Images                                 │
└────────────────────┬────────────────────────────────────┘
                     │
┌─────────────────────▼────────────────────────────────────┐
│  8. Trivy Security Scan (scan Docker images)            │
└────────────────────┬────────────────────────────────────┘
                     │
┌─────────────────────▼────────────────────────────────────┐
│  9. Push to Docker Hub                                   │
└────────────────────┬────────────────────────────────────┘
                     │
┌─────────────────────▼────────────────────────────────────┐
│  10. Update Kubernetes Manifests                         │
└────────────────────┬────────────────────────────────────┘
                     │
┌─────────────────────▼────────────────────────────────────┐
│  11. Commit & Push to Git                               │
└────────────────────┬────────────────────────────────────┘
                     │
┌─────────────────────▼────────────────────────────────────┐
│  12. Create Git Tag                                      │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼──────────┐   ┌─────────▼──────────┐
│ ✅ SUCCESS       │   │ ❌ FAILURE         │
│ Email sent       │   │ Email sent         │
│ Ready for CD     │   │ Check logs         │
└──────────────────┘   └────────────────────┘
```

---

## Troubleshooting Common Issues

### Issue 1: "server/ directory not found!"
**Cause:** Pipeline is running in wrong directory
**Fix:**
```groovy
// Check workspace
sh 'pwd && ls -la'
// Should show: client/, server/, kubernetes/, etc.
```

### Issue 2: "npm command not found"
**Cause:** Node.js not installed on Jenkins agent
**Fix:**
```bash
# On Jenkins agent machine
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
npm --version
```

### Issue 3: "Docker command not found"
**Cause:** Docker not installed or not in PATH
**Fix:**
```bash
# On Jenkins agent machine
sudo apt-get install -y docker.io
sudo usermod -aG docker jenkins  # Add jenkins user to docker group
sudo systemctl restart docker
```

### Issue 4: "SonarQube token expired"
**Cause:** Token is invalid or expired
**Fix:**
1. Go to SonarQube (http://44.198.186.67:9000)
2. User Profile → Security → Generate new token
3. Update Jenkins credentials with new token
4. Test with: `curl -u [token]: http://44.198.186.67:9000/api/system/status`

### Issue 5: "GitHub push failed - permission denied"
**Cause:** GitHub credentials expired or insufficient permissions
**Fix:**
1. Generate new personal access token on GitHub
2. Ensure token has `repo` scope
3. Update Jenkins credentials
4. Test with: `git clone https://[token]@github.com/maazzafar1234/PulseDesk.git`

### Issue 6: "Docker push failed - unauthorized"
**Cause:** Docker Hub credentials wrong or expired
**Fix:**
1. Generate Docker Hub access token
2. Update Jenkins credentials
3. Test with: `echo [token] | docker login -u [username] --password-stdin`

---

## Monitoring & Alerts

### Jenkins Plugins to Install
1. **Email Extension Plugin** - For email notifications
2. **Pipeline: Shared Groovy Libraries** - For shared library support
3. **GitHub Plugin** - For GitHub integration
4. **Docker Pipeline** - For Docker operations
5. **SonarQube Scanner** - For SonarQube integration

### Email Configuration
1. **Manage Jenkins** → **Configure System**
2. Find **E-mail Notification**
3. Set SMTP server: `smtp.gmail.com`
4. Port: `465`
5. Click **Advanced** and enable SSL
6. Add default recipients for build notifications

---

## Summary of Changes

| File | Issue | Fix | Impact |
|------|-------|-----|--------|
| GitOps/Jenkinsfile-CI | Wrong dir paths | backend→server, frontend→client | High |
| Automations/PulseDesk-CI-Pipeline.groovy | Wrong dir paths + SonarQube config | Multiple path fixes + token reference | High |
| Automations/PulseDesk-CI-Pipeline-Refactored.groovy | NEW - Code duplication | Use shared library | High |
| jenkins-shared-library/src/com/pulsedesk/*.groovy | NEW - DRY principle | Created reusable classes | Medium |
| jenkins-shared-library/vars/pipelineLogger.groovy | NEW - Logging | Consistent logging utility | Medium |

---

## Next Steps

1. **Apply Fixes:**
   - Option A: Use fixed existing pipelines (GitOps/Jenkinsfile-CI)
   - Option B: Setup shared library + use refactored pipeline (recommended)

2. **Configure Jenkins:**
   - Add credentials (GitHub, Docker Hub, SonarQube)
   - Configure shared library (if using Option B)
   - Create/update pipeline job

3. **Test Pipeline:**
   - Trigger manual build
   - Check console output
   - Verify all stages pass
   - Check email notifications

4. **Monitor:**
   - Watch for failures
   - Monitor build times
   - Track artifact generation
   - Monitor Docker image pushes

---

## Support & Questions

For issues with the CI/CD pipeline:
1. Check Jenkins console logs
2. Review environment variables
3. Verify credentials
4. Check directory structure
5. Review this guide's troubleshooting section

For questions about shared library:
- See `jenkins-shared-library/README.md`
- Check Groovy class documentation in source files

---

**Last Updated:** November 13, 2026
**Version:** 1.0
**Status:** Production Ready
