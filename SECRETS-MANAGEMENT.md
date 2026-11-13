# 🔐 Kubernetes Secrets Management Guide

## Problem That Was Fixed

**Error**: `Unable to generate manifests in kubernetes: app-secrets.yaml: no such file or directory`

**Root Cause**: ArgoCD was trying to read `app-secrets.yaml` from Git, but the file was in `.gitignore` for security reasons.

**Solution**: Separate secrets from GitOps manifests. Secrets are created by the CI/CD pipeline, not stored in Git.

---

## ❌ Why Secrets Should NEVER Be in Git

### Security Risks
- 🔓 Anyone with Git access sees all secrets
- 🔓 Secrets exposed in commit history forever
- 🔓 Difficult to rotate compromised secrets
- 🔓 Accidental pushes expose credentials

### What Could Be Compromised
- Database passwords
- API keys
- JWT secrets
- OAuth tokens
- SSH keys

---

## ✅ Correct Approach: CD Pipeline Creates Secrets

### Current Implementation

```
GitHub (Clean Manifests)
    ↓
ArgoCD Syncs (Deployments only, no secrets)
    ↓
CD Pipeline Creates Secrets via kubectl
    ↓
Backend Pods Start (with secrets available)
```

### How It Works

**1. Git Repository** (Public safe)
```yaml
# kustomization.yaml - Only deployment manifests
resources:
  - namespace.yaml
  - postgres-deployment.yaml
  - backend-deployment.yaml
  - frontend-deployment.yaml
  # ❌ NO app-secrets.yaml here!
```

**2. CD Pipeline** (Secure, creates secrets)
```groovy
// Stage: "Kubernetes: Create Secrets"
kubectl create secret generic app-secrets \
    --from-literal=jwt-secret="<ACTUAL_SECRET>" \
    -n pulsedesk
```

**3. Kubernetes Cluster** (Only place secrets exist)
```bash
$ kubectl get secrets -n pulsedesk
NAME          TYPE     DATA   AGE
app-secrets   Opaque   1      5m
```

---

## 📁 File Structure

### What's In Git (Safe ✅)
```
kubernetes/
├── namespace.yaml              ✅ Safe
├── postgres-deployment.yaml    ✅ Safe
├── backend-deployment.yaml     ✅ Safe (references secret)
├── frontend-deployment.yaml    ✅ Safe
├── kustomization.yaml          ✅ Safe
├── argocd-application.yaml     ✅ Safe
└── app-secrets.example.yaml    ✅ Safe (template only)
```

### What's NOT In Git (Protected 🔒)
```
kubernetes/
└── app-secrets.yaml            🔒 In .gitignore (NOT in repo)
```

### .gitignore Rules (Security)
```
# Line 62-66 in .gitignore
kubernetes/*secrets.yaml         # Block all *secrets.yaml
kubernetes/app-secrets.yaml      # Explicitly block app-secrets
kubernetes/postgres-secrets.yaml # Explicitly block postgres-secrets
!kubernetes/*secrets.example.yaml # BUT allow example files
```

---

## 🔧 Creating Secrets

### Method 1: CD Pipeline (Automatic - Recommended ✅)

The CD Pipeline automatically creates secrets:

```groovy
stage('Kubernetes: Create Secrets') {
    steps {
        script {
            echo "🔐 Creating application secrets..."
            sh '''
                kubectl create secret generic app-secrets \
                    --from-literal=jwt-secret="<SECRET>" \
                    -n pulsedesk --dry-run=client -o yaml | kubectl apply -f -
            '''
        }
    }
}
```

**When it runs**: During every CD Pipeline execution  
**Who runs it**: Jenkins  
**Where secrets come from**: Environment variables (secure)  

### Method 2: Manual kubectl (When needed)

```bash
# Create secret manually
kubectl create secret generic app-secrets \
    --from-literal=jwt-secret="G8bevQWT/MFhrcPeCH6T9urt8mxc99GelanPGYr49E0=" \
    -n pulsedesk

# Verify
kubectl get secrets -n pulsedesk
kubectl describe secret app-secrets -n pulsedesk

# Update existing secret
kubectl delete secret app-secrets -n pulsedesk
kubectl create secret generic app-secrets \
    --from-literal=jwt-secret="<NEW_SECRET>" \
    -n pulsedesk
```

### Method 3: From File (For complex secrets)

```bash
# Create from file
kubectl create secret generic app-secrets \
    --from-file=config.json \
    -n pulsedesk

# Create from literal values
kubectl create secret generic app-secrets \
    --from-literal=jwt-secret="value1" \
    --from-literal=db-password="value2" \
    -n pulsedesk
```

---

## 🎯 Using Secrets in Deployments

### In backend-deployment.yaml

```yaml
env:
  - name: JWT_SECRET
    valueFrom:
      secretKeyRef:
        name: app-secrets      # Reference to secret
        key: jwt-secret        # Key in the secret
```

### How It Works

1. **Secret exists in cluster**: `kubectl get secret app-secrets`
2. **Deployment references it**: `secretKeyRef: app-secrets`
3. **Pod receives value**: `JWT_SECRET` environment variable
4. **Application uses it**: `process.env.JWT_SECRET`

---

## 🔄 Updating Secrets

### Step 1: Generate New Secret
```bash
# Generate new random JWT secret
openssl rand -base64 32
# Output: G8bevQWT/MFhrcPeCH6T9urt8mxc99GelanPGYr49E0=
```

### Step 2: Update in Kubernetes

**Option A: Replace Secret**
```bash
kubectl delete secret app-secrets -n pulsedesk
kubectl create secret generic app-secrets \
    --from-literal=jwt-secret="<NEW_SECRET>" \
    -n pulsedesk
```

**Option B: Patch Secret**
```bash
kubectl patch secret app-secrets -n pulsedesk \
    --type json \
    -p='[{"op": "replace", "path": "/data/jwt-secret", "value":"<BASE64_ENCODED_SECRET>"}]'
```

### Step 3: Restart Pods (to pick up new secret)
```bash
kubectl rollout restart deployment/pulsedesk-backend -n pulsedesk
```

---

## 🛡️ Security Best Practices

### DO ✅
- ✅ Store secrets ONLY in Kubernetes cluster
- ✅ Use CI/CD pipeline to create secrets automatically
- ✅ Keep .gitignore rules for secrets files
- ✅ Use strong, random secret values
- ✅ Rotate secrets regularly
- ✅ Use RBAC to limit secret access
- ✅ Use secret encryption at rest (if available)

### DON'T ❌
- ❌ Store secrets in Git repositories
- ❌ Commit .env files with real values
- ❌ Hardcode secrets in deployment YAML
- ❌ Share secrets in chat or email
- ❌ Use weak or predictable secrets
- ❌ Leave secrets in logs
- ❌ Use same secret in multiple environments

---

## 🚨 If Secret Is Compromised

### Immediate Actions
```bash
# 1. Generate new secret
NEW_SECRET=$(openssl rand -base64 32)
echo $NEW_SECRET

# 2. Update secret in cluster
kubectl delete secret app-secrets -n pulsedesk
kubectl create secret generic app-secrets \
    --from-literal=jwt-secret="$NEW_SECRET" \
    -n pulsedesk

# 3. Restart pods to use new secret
kubectl rollout restart deployment/pulsedesk-backend -n pulsedesk

# 4. Verify new pods are running
kubectl get pods -n pulsedesk
```

### Audit Trail
```bash
# Check when secret was last updated
kubectl describe secret app-secrets -n pulsedesk

# View secret (if needed for debugging)
kubectl get secret app-secrets -n pulsedesk -o jsonpath='{.data.jwt-secret}' | base64 -d
```

---

## 📚 Alternative Approaches (Advanced)

### Option 1: External Secrets Operator
```yaml
# Fetch secrets from AWS Secrets Manager
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
spec:
  source:
    aws:
      service: SecretsManager
```

### Option 2: HashiCorp Vault
```yaml
# Fetch secrets from Vault
apiVersion: v1
kind: ServiceAccount
metadata:
  annotations:
    vault.hashicorp.com/agent-inject: "true"
    vault.hashicorp.com/agent-inject-secret-config: "secret/data/app-config"
```

### Option 3: Sealed Secrets
```yaml
# Encrypt secrets so they can be in Git safely
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: app-secrets
```

---

## ✅ Verification Checklist

Before deploying, verify:

- ✅ `app-secrets.yaml` is in `.gitignore`
- ✅ `kustomization.yaml` does NOT reference secrets
- ✅ Backend deployment references secret via `valueFrom`
- ✅ CD Pipeline has secret creation stage
- ✅ Secret exists in cluster: `kubectl get secrets -n pulsedesk`
- ✅ Pods are running: `kubectl get pods -n pulsedesk`
- ✅ No secrets in Git history: `git log -p -- "*.yaml" | grep "secret"`

---

## 📞 Troubleshooting

### Secret not found error
```bash
# Check if secret exists
kubectl get secret app-secrets -n pulsedesk

# If missing, create it
kubectl create secret generic app-secrets \
    --from-literal=jwt-secret="<SECRET>" \
    -n pulsedesk
```

### Pod can't access secret
```bash
# Check pod events
kubectl describe pod <pod-name> -n pulsedesk

# Check if secret is mounted
kubectl exec -it <pod-name> -n pulsedesk -- env | grep JWT_SECRET
```

### Secret is wrong
```bash
# View current secret (base64 encoded)
kubectl get secret app-secrets -n pulsedesk -o jsonpath='{.data.jwt-secret}'

# Decode to see actual value
kubectl get secret app-secrets -n pulsedesk -o jsonpath='{.data.jwt-secret}' | base64 -d
```

---

## 📝 Summary

**Before (❌ Not Secure)**:
- Secrets in Git repository
- Anyone with Git access sees all secrets
- Secrets exposed in commit history

**Now (✅ Secure)**:
- Secrets ONLY in Kubernetes cluster
- CD Pipeline creates secrets automatically
- Git only contains safe manifests
- Secrets never exposed to Git

**Result**: Production-ready secure secret management! 🔒
