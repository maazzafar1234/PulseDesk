# Fix: kubectl Not Found in CD Pipeline

## Problem

The CD pipeline is failing because `kubectl` is not installed on the Jenkins worker node.

**Error:**
```
/var/jenkins_home/workspace/PulseDesk-CD@tmp/.../script.sh.copy: 3: kubectl: not found
```

## What Happened

1. ✅ **CI pipeline completed successfully**
2. ✅ **CI pipeline triggered CD pipeline automatically** (feature working!)
3. ✅ **CD pipeline started**
4. ❌ **CD pipeline failed at "Kubernetes: Verify Cluster Connectivity"** because kubectl is missing

## Good News

- The automatic CI → CD trigger IS WORKING!
- The CD pipeline received the test trigger correctly
- Now we just need to install kubectl on the Jenkins worker

## Solution Options

### Option 1: Install kubectl on Jenkins Worker (RECOMMENDED)

This is the best solution for production use.

#### On Ubuntu/Debian Worker:

```bash
# 1. Download kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

# 2. Make it executable
chmod +x kubectl

# 3. Move to PATH
sudo mv kubectl /usr/local/bin/

# 4. Verify
kubectl version --client
```

#### On the Jenkins Container:

If Jenkins is running in Docker, add kubectl to the Dockerfile:

```dockerfile
# Add kubectl to Jenkins image
FROM jenkins/jenkins:latest

RUN apt-get update && \
    apt-get install -y curl && \
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/ && \
    apt-get clean
```

#### On Docker Compose:

Update your `docker-compose-jenkins.yml`:

```yaml
services:
  jenkins:
    image: jenkins/jenkins:latest
    volumes:
      - jenkins_home:/var/jenkins_home
    # Add kubectl installation
    environment:
      - JAVA_OPTS=-Djenkins.install.runSetupWizard=false
    # Or use entrypoint script
    entrypoint: |
      sh -c "
        if ! command -v kubectl &> /dev/null; then
          curl -LO 'https://dl.k8s.io/release/\$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl'
          chmod +x kubectl
          mv kubectl /usr/local/bin/
        fi
        /usr/local/bin/jenkins.sh
      "
```

### Option 2: Configure KUBECONFIG Properly

Make sure Jenkins has proper Kubernetes access:

```bash
# Copy kubeconfig to Jenkins
cp ~/.kube/config /var/jenkins_home/.kube/config
chmod 600 /var/jenkins_home/.kube/config
chown -R jenkins:jenkins /var/jenkins_home/.kube/

# In Jenkins job, set KUBECONFIG environment variable
export KUBECONFIG=/var/jenkins_home/.kube/config
```

### Option 3: Use ArgoCD Instead

Instead of kubectl directly, use ArgoCD which is already in your pipeline:

The `GitOps/Jenkinsfile-CD` uses ArgoCD which is cleaner:

```groovy
stage('Sync ArgoCD Application') {
    steps {
        script {
            sh '''
                argocd login ${ARGOCD_SERVER} \
                    --username ${ARGOCD_USERNAME} \
                    --password ${ARGOCD_PASSWORD} \
                    --insecure
                
                argocd app sync pulsedesk-app \
                    --prune \
                    --wait \
                    --timeout 5m
            '''
        }
    }
}
```

## Recommended Path Forward

### Short Term (Quick Fix):

1. **Install kubectl on Jenkins worker** (Option 1)
2. **Verify KUBECONFIG is accessible**
3. **Re-run CD pipeline test**

### Long Term (Better Architecture):

1. **Use GitOps/Jenkinsfile-CD** instead of Automations/PulseDesk-CD-Pipeline.groovy
2. **Rely on ArgoCD** for Kubernetes deployments (GitOps best practice)
3. **Jenkins only triggers ArgoCD sync** (simpler, safer)

## What Was Improved

The CD pipeline now has better error handling:

- ✅ Checks if kubectl exists
- ✅ Searches common installation paths
- ✅ Provides helpful error messages
- ✅ Doesn't fail mysteriously
- ✅ Shows exactly what's missing

**Updated file:** `Automations/PulseDesk-CD-Pipeline.groovy`
**Updated file:** `GitOps/Jenkinsfile-CD`

## Verification

After installing kubectl, test by running:

```bash
# Check kubectl is accessible
which kubectl
kubectl version --client
kubectl cluster-info

# Test from Jenkins
kubectl get nodes
kubectl get namespaces
kubectl get pods -n pulsedesk
```

## Commits

- `a1d2fb3` - Update CD pipeline to accept CI trigger parameters (GitOps)
- `f96406d` - Add parameter support and kubectl error handling (Automations)

## Status

- ✅ CI → CD automatic trigger: WORKING
- ✅ CD parameter passing: WORKING
- ❌ Kubernetes deployment: NEEDS kubectl installation
- ✅ Error handling: IMPROVED

---

## Next Steps

1. Install kubectl on Jenkins worker (see Option 1)
2. Verify kubectl works: `kubectl cluster-info`
3. Make sure KUBECONFIG points to your cluster
4. Test CD pipeline again
5. Monitor deployment completion

Once kubectl is installed, the automatic CD trigger will fully work:

```
User push
  ↓ (automatic via webhook)
CI builds (~1 minute)
  ↓ (automatic on success)
CD deploys (~2-3 minutes)
  ↓
Application updated in production!
```

---

**Estimated time to fix:** 5-10 minutes
**Difficulty:** Easy (just installation)
**Impact:** CI/CD pipeline becomes fully operational
