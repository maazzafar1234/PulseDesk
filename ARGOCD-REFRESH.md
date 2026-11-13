# ArgoCD Refresh Instructions

## ❌ Previous Issue
ArgoCD was trying to find `app-secrets.yaml` in the repository, which was in `.gitignore` for security.

## ✅ Fix Applied
- Removed `app-secrets.yaml` reference from `kustomization.yaml`
- Secrets are now created by CD Pipeline via kubectl
- ArgoCD syncs only the safe manifests

## 🔄 How to Trigger ArgoCD Refresh

Run on Ubuntu Kubernetes node:

```bash
# Trigger ArgoCD to refresh and re-sync
kubectl patch application pulsedesk-app -n argocd --type merge \
    -p '{"metadata":{"annotations":{"argocd.argoproj.io/refresh":"normal"}}}'
```

Or from ArgoCD UI:
1. Go to https://a6230930c94bb41b08605f5beffd1ac7-3939892.us-east-1.elb.amazonaws.com
2. Click on `pulsedesk-app` application
3. Click **REFRESH** button
4. Wait for status to change
5. Click **SYNC** if needed

## ✅ Expected Result

After refresh:
- ArgoCD will re-read from Git (which now has correct manifests)
- Sync should show **"Synced"** status
- All pods will be running
- Error message will disappear

## 🔐 What Happens with Secrets

1. ✅ ArgoCD syncs deployments (without secrets)
2. ✅ CD Pipeline creates `app-secrets` Secret via kubectl
3. ✅ Backend pods reference the secret
4. ✅ Everything works together

## Verify It's Fixed

```bash
# Check ArgoCD sync status
kubectl get application pulsedesk-app -n argocd -o jsonpath='{.status.sync.status}'

# Should output: Synced

# Check pods
kubectl get pods -n pulsedesk

# Should show all Running
```

That's it! ArgoCD should now sync successfully. 🎉
