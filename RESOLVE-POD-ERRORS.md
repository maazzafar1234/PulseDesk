# Fix: Resolve CreateContainerConfigError in Backend Pods

## Problem
Backend pods are showing `CreateContainerConfigError` because the `app-secrets` Secret is missing from the Kubernetes cluster.

## Root Cause
- The `app-secrets.yaml` file was created in Git but ArgoCD hasn't synced it yet
- OR the file wasn't applied when manifests were deployed
- Backend deployment tries to reference `app-secrets.jwt-secret` which doesn't exist

## Symptoms
```
pulsedesk-backend-86c5fcbdd6-dph67   0/1     CreateContainerConfigError   0                 8h
pulsedesk-backend-86c5fcbdd6-gr4d5   0/1     CreateContainerConfigError   0                 8h
```

## Solution

### Option 1: Automatic Fix (Recommended)
Run the provided fix script on the Kubernetes master node:

```bash
# From the Kubernetes node where kubectl is configured
cd /path/to/PulseDesk
chmod +x fix-secrets.sh
./fix-secrets.sh
```

This script will:
1. ✅ Ensure pulsedesk namespace exists
2. ✅ Create the app-secrets Secret with JWT key
3. ✅ Delete the failed pods (automatic restart)
4. ✅ Show pod status

### Option 2: Manual Steps

**Step 1: Create the Secret**
```bash
kubectl create secret generic app-secrets \
    --from-literal=jwt-secret="G8bevQWT/MFhrcPeCH6T9urt8mxc99GelanPGYr49E0=" \
    -n pulsedesk
```

**Step 2: Verify Secret was created**
```bash
kubectl get secrets -n pulsedesk
kubectl describe secret app-secrets -n pulsedesk
```

**Step 3: Delete failed pods (they'll restart automatically)**
```bash
# Delete specific failed pods
kubectl delete pod pulsedesk-backend-86c5fcbdd6-dph67 -n pulsedesk
kubectl delete pod pulsedesk-backend-86c5fcbdd6-gr4d5 -n pulsedesk
```

**Step 4: Wait and verify**
```bash
# Watch pods restart
kubectl get pods -n pulsedesk --watch

# Should see something like:
# pulsedesk-backend-7fbb4684b4-txkcv   1/1     Running      ...
```

### Option 3: Force ArgoCD Sync

If you prefer ArgoCD to handle it:

1. Go to ArgoCD UI: `https://a6230930c94bb41b08605f5beffd1ac7-3939892.us-east-1.elb.amazonaws.com`
2. Click on `pulsedesk-app` application
3. Click `REFRESH` button
4. Click `SYNC` button
5. Select sync policy and confirm

This will re-apply all manifests including `app-secrets.yaml`.

## Expected Result

After running the fix, you should see:

```bash
$ kubectl get pods -n pulsedesk
NAME                                 READY   STATUS    RESTARTS   AGE
postgres                             1/1     Running   0          22h
pulsedesk-backend-7fbb4684b4-txkcv   1/1     Running   0          5m
pulsedesk-frontend-786fdbb77-bfprv   1/1     Running   0          22h
```

All pods should be:
- ✅ READY: 1/1
- ✅ STATUS: Running
- ✅ No CreateContainerConfigError

## Verification

```bash
# Check backend logs
kubectl logs -n pulsedesk -l app=pulsedesk-backend --tail=50

# Check if backend is responding
kubectl exec -n pulsedesk -it <backend-pod-name> -- curl http://localhost:5000/api/health

# Check ArgoCD sync status
# Should show "Synced" in green
```

## What Changed
- **Commit 7967c7e**: Created `kubernetes/app-secrets.yaml` with JWT secret
- **Commit c030a0a**: Added automatic secret creation to CD Pipeline

## Prevention
The CD Pipeline now includes an explicit "Kubernetes: Create Secrets" stage that will:
- Automatically create secrets if they don't exist
- Run before deployments are updated
- Ensure secrets are always available when pods start

This means this issue won't happen again on future deployments.

## Need Help?
If pods are still failing after running the fix:

```bash
# Check detailed pod information
kubectl describe pod <pod-name> -n pulsedesk

# Check pod logs for specific error
kubectl logs <pod-name> -n pulsedesk -p

# Check secret contents
kubectl get secret app-secrets -n pulsedesk -o yaml
```
