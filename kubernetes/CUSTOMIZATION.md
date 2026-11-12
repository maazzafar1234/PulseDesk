# Kubernetes Manifests Customization Guide

Before deploying to your Kubernetes cluster, you must customize the manifest files with your environment-specific values.

## 🔧 Required Customizations

### 1. Update Docker Image Repositories

**Files Affected:**
- `frontend-deployment.yaml`
- `backend-deployment.yaml`

**Current Placeholder:**
```yaml
image: your-dockerhub-username/pulsedesk:frontend-latest
```

**What You Need:**
1. Get your DockerHub username
2. Ensure your images are pushed to DockerHub:
   ```bash
   docker build -t your-dockerhub-username/pulsedesk:frontend-latest ./client
   docker build -t your-dockerhub-username/pulsedesk:backend-latest ./server
   docker push your-dockerhub-username/pulsedesk:frontend-latest
   docker push your-dockerhub-username/pulsedesk:backend-latest
   ```

3. Update the manifests:
   ```bash
   sed -i 's/your-dockerhub-username/YOUR_ACTUAL_USERNAME/g' kubernetes/*.yaml
   ```

**Or manually for ECR (AWS):**
```yaml
image: 320746724302.dkr.ecr.ap-south-1.amazonaws.com/pulsedesk:frontend-latest
```

---

### 2. Create Secret Manifests from Examples

**Files Affected:**
- `kubernetes/app-secrets.yaml` (create from example)
- `kubernetes/postgres-secrets.yaml` (create from example)

**Steps:**

```bash
# 1. Copy example files
cp kubernetes/app-secrets.example.yaml kubernetes/app-secrets.yaml
cp kubernetes/postgres-secrets.example.yaml kubernetes/postgres-secrets.yaml

# 2. Generate strong JWT secret
JWT_SECRET=$(openssl rand -base64 32)
echo "JWT Secret: $JWT_SECRET"

# 3. Generate strong DB password
DB_PASSWORD=$(openssl rand -base64 16)
echo "DB Password: $DB_PASSWORD"

# 4. Update the secret files (use your editor)
nano kubernetes/app-secrets.yaml
# Replace: "CHANGE_ME_TO_A_STRONG_RANDOM_SECRET_KEY_MIN_32_CHARS"
# With:    "your-generated-jwt-secret"

nano kubernetes/postgres-secrets.yaml
# Replace: "CHANGE_ME_TO_A_STRONG_PASSWORD_MIN_16_CHARS"
# With:    "your-generated-db-password"

# 5. Verify secrets are not in git
git status | grep app-secrets.yaml postgres-secrets.yaml
# Should show: "not tracked"
```

---

### 3. Adjust Resource Limits (Optional)

**Files Affected:**
- `frontend-deployment.yaml`
- `backend-deployment.yaml`
- `postgres-deployment.yaml`

**Current Values:**
```yaml
Frontend:
  CPU: 100m request, 300m limit
  Memory: 256Mi request, 512Mi limit

Backend:
  CPU: 250m request, 500m limit
  Memory: 512Mi request, 1Gi limit

PostgreSQL:
  CPU: 250m request, 500m limit
  Memory: 512Mi request, 1Gi limit
```

**Adjust Based on Node Capacity:**

```bash
# Check available resources on nodes
kubectl top nodes
kubectl describe nodes

# For t3.micro nodes (1GB RAM): Scale DOWN
# For t3.medium nodes (4GB RAM): Keep DEFAULT
# For t3.large+ nodes (8GB+ RAM): Scale UP
```

**Example: For t3.medium (4GB RAM), increase replicas:**
```yaml
# Change from:
replicas: 2

# To:
replicas: 3
```

---

### 4. Update Database Connection (if using RDS)

**Files Affected:**
- `backend-deployment.yaml`

**For In-Cluster PostgreSQL:**
```yaml
- name: DATABASE_URL
  value: "postgresql://pulsedesk_user:password@postgres:5432/pulsedesk_db"
```

**For AWS RDS:**
```yaml
- name: DATABASE_URL
  value: "postgresql://pulsedesk_user:password@pulsedesk-db.xxxxx.rds.amazonaws.com:5432/pulsedesk_db"
```

---

### 5. Update Frontend API URL (if using external endpoint)

**Files Affected:**
- `frontend-deployment.yaml`

**Current:**
```yaml
- name: VITE_API_BASE_URL
  value: "http://pulsedesk-backend:5000"
```

**For External/LoadBalancer:**
```yaml
- name: VITE_API_BASE_URL
  value: "http://backend.example.com:5000"
```

**For NodePort:**
```yaml
- name: VITE_API_BASE_URL
  value: "http://<worker-node-ip>:31000"
```

---

## 📋 Customization Checklist

Use this checklist before deploying:

```bash
# 1. Update Docker image repositories
☐ Update `frontend-deployment.yaml` image URI
☐ Update `backend-deployment.yaml` image URI
☐ Verify images are built and pushed to registry

# 2. Create and secure secrets
☐ Create `app-secrets.yaml` from example
☐ Create `postgres-secrets.yaml` from example
☐ Generate strong JWT secret (32+ chars)
☐ Generate strong DB password (16+ chars)
☐ Verify secret files are NOT in git (ignored)

# 3. Resource limits
☐ Check cluster node capacity: `kubectl describe nodes`
☐ Adjust CPU/memory requests if needed
☐ Set appropriate replica counts

# 4. Database configuration
☐ Confirm using in-cluster PostgreSQL OR RDS
☐ Update DATABASE_URL if using RDS
☐ Verify database credentials in postgres-secrets.yaml

# 5. API endpoints
☐ Update frontend VITE_API_BASE_URL if using external endpoint
☐ Verify backend is reachable from frontend
☐ Check CORS configuration in backend

# 6. Pre-deployment verification
☐ Run: kubectl apply -f kubernetes/ --dry-run=client
☐ Check for any validation errors
☐ Review output for unintended changes

# 7. Final safety check
☐ Verify no secrets in git: git status | grep secret
☐ Verify no .env files staged
☐ Verify no credentials in manifests
```

---

## 🚀 Safe Deployment Commands

### Dry Run (RECOMMENDED First Step)
```bash
# Test manifests without applying
kubectl apply -f kubernetes/ --dry-run=client -o yaml

# Check what would be created
kubectl apply -f kubernetes/ --dry-run=server -o yaml
```

### Actual Deployment
```bash
# Option 1: Using kubectl
kubectl apply -f kubernetes/

# Option 2: Using Kustomize (recommended)
kubectl apply -k kubernetes/

# Option 3: Using ArgoCD (most recommended for GitOps)
argocd app create pulsedesk-app \
  --repo https://github.com/your-username/pulsedesk.git \
  --path kubernetes \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace pulsedesk
```

### Verify Deployment
```bash
# Check pods
kubectl get pods -n pulsedesk

# Check services
kubectl get svc -n pulsedesk

# Check logs
kubectl logs -n pulsedesk -l app=pulsedesk-backend

# Watch deployment progress
kubectl rollout status deployment/pulsedesk-backend -n pulsedesk
```

---

## 🔐 Security Before Deployment

```bash
# 1. Verify no secrets in manifests (except *-secrets.yaml)
grep -r "password\|secret\|token" kubernetes/*.yaml 2>/dev/null

# 2. Verify secrets are ignored by git
git status | grep app-secrets.yaml postgres-secrets.yaml

# 3. Confirm example files exist (for future use)
ls kubernetes/*example.yaml

# 4. Check manifest syntax
kubectl apply -f kubernetes/ --dry-run=client

# 5. List all manifests that will be applied
find kubernetes -name "*.yaml" -type f | grep -v example
```

---

## 📝 Manifest File Descriptions

| File | Purpose | Customization Required |
|------|---------|------------------------|
| `namespace.yaml` | Creates pulsedesk namespace | No |
| `app-secrets.yaml` | JWT and app secrets | **YES** (create from example) |
| `postgres-secrets.yaml` | Database credentials | **YES** (create from example) |
| `postgres-deployment.yaml` | In-cluster PostgreSQL | Optional (skip for RDS) |
| `backend-deployment.yaml` | Backend service | **YES** (image URI, DATABASE_URL) |
| `frontend-deployment.yaml` | Frontend service | **YES** (image URI, API_BASE_URL) |
| `kustomization.yaml` | Manifest orchestration | Optional (already configured) |
| `argocd-application.yaml` | ArgoCD configuration | Yes (repo URL) |

---

## 🎯 Common Customization Patterns

### Pattern 1: Using DockerHub Images
```yaml
image: myusername/pulsedesk:backend-latest
imagePullPolicy: Always
```

### Pattern 2: Using ECR Images
```yaml
image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/pulsedesk:backend-latest
imagePullPolicy: Always
imagePullSecrets:
- name: ecr-secret
```

### Pattern 3: Using GCR Images
```yaml
image: gcr.io/my-project/pulsedesk:backend-latest
imagePullPolicy: Always
imagePullSecrets:
- name: gcr-secret
```

### Pattern 4: High Availability Setup
```yaml
replicas: 3  # Increased from 2

resources:
  requests:
    cpu: 500m
    memory: 1Gi
  limits:
    cpu: 1000m
    memory: 2Gi
```

### Pattern 5: Using AWS RDS Database
```yaml
env:
- name: DATABASE_URL
  valueFrom:
    secretKeyRef:
      name: postgres-credentials
      key: rds-url
      # Store RDS connection string in secret
```

---

## 🆘 Troubleshooting Customization Issues

### Issue: ImagePullBackOff
```bash
# Cause: Image doesn't exist or can't be pulled
# Solution: Verify image exists in registry
docker images | grep your-username/pulsedesk
docker push your-username/pulsedesk:frontend-latest
```

### Issue: CrashLoopBackOff
```bash
# Cause: Application crashes on startup
# Solution: Check logs
kubectl logs -n pulsedesk <pod-name>
# Common: DATABASE_URL incorrect, secrets missing
```

### Issue: ImagePullSecrets Error
```bash
# Cause: Registry credentials not configured
# Solution: Create imagePullSecret
kubectl create secret docker-registry ecr-secret \
  --docker-server=xxx.dkr.ecr.us-east-1.amazonaws.com \
  --docker-username=AWS \
  --docker-password=$(aws ecr get-login-password) \
  -n pulsedesk
```

### Issue: Pending Pods
```bash
# Cause: Insufficient resources or node selectors
# Solution: Check node capacity
kubectl describe nodes
kubectl describe pod -n pulsedesk <pending-pod>
```

---

## ✅ Post-Deployment Verification

```bash
# 1. Verify all pods running
kubectl get pods -n pulsedesk
# Expected: All pods with status Running

# 2. Check services have endpoints
kubectl get svc -n pulsedesk
# Expected: ENDPOINTS column populated

# 3. Test connectivity
kubectl port-forward -n pulsedesk svc/pulsedesk-backend 5000:5000
curl http://localhost:5000/api/health

# 4. Check logs for errors
kubectl logs -n pulsedesk -l app=pulsedesk-backend --tail=50

# 5. Verify secrets loaded correctly
kubectl get secrets -n pulsedesk
kubectl describe secret app-secrets -n pulsedesk
```

---

**Last Updated**: November 2024  
**Version**: 1.0

