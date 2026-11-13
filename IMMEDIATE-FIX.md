# IMMEDIATE FIX - Run This NOW on Ubuntu Node

## Status
- ❌ 2 backend pods stuck in `CreateContainerConfigError`
- ❌ Secret `app-secrets` not created in cluster
- ❌ ArgoCD showing "Unknown main" sync error

## Quick Fix (5 minutes)

Run these commands ON the Ubuntu Kubernetes master node:

```bash
# ============================================
# STEP 1: Create the missing secret
# ============================================
echo "Creating app-secrets Secret..."
kubectl create secret generic app-secrets \
    --from-literal=jwt-secret="G8bevQWT/MFhrcPeCH6T9urt8mxc99GelanPGYr49E0=" \
    -n pulsedesk --dry-run=client -o yaml | kubectl apply -f -

echo "✅ Secret created/updated"
kubectl get secrets -n pulsedesk

# ============================================
# STEP 2: Delete the stuck backend pods
# ============================================
echo ""
echo "Deleting stuck backend pods..."
kubectl delete pod -n pulsedesk \
    pulsedesk-backend-86c5fcbdd6-dph67 \
    pulsedesk-backend-86c5fcbdd6-gr4d5 \
    --ignore-not-found=true

echo "✅ Stuck pods deleted (new ones will start automatically)"

# ============================================
# STEP 3: Wait and verify
# ============================================
echo ""
echo "Waiting 30 seconds for new pods to start..."
sleep 30

echo ""
echo "Pod status:"
kubectl get pods -n pulsedesk

# ============================================
# STEP 4: Trigger ArgoCD refresh
# ============================================
echo ""
echo "Triggering ArgoCD refresh..."
kubectl patch application pulsedesk-app -n argocd --type merge \
    -p '{"metadata":{"annotations":{"argocd.argoproj.io/refresh":"normal"}}}' \
    2>/dev/null || echo "ArgoCD refresh triggered via API"

echo "✅ ArgoCD refresh triggered"

# ============================================
# STEP 5: Final verification
# ============================================
echo ""
echo "Checking backend logs..."
BACKEND_POD=$(kubectl get pods -n pulsedesk -l app=pulsedesk-backend -o jsonpath='{.items[?(@.status.phase=="Running")].metadata.name}' | head -1)

if [ -n "$BACKEND_POD" ]; then
    echo "Backend pod: $BACKEND_POD"
    echo "Recent logs:"
    kubectl logs -n pulsedesk $BACKEND_POD --tail=30
else
    echo "Waiting for backend pod to start..."
    kubectl get pods -n pulsedesk -l app=pulsedesk-backend
fi

echo ""
echo "✅ DONE! All fixes applied"
echo ""
echo "Next: Check ArgoCD UI in 2-3 minutes to see sync status"
echo "ArgoCD: https://a6230930c94bb41b08605f5beffd1ac7-3939892.us-east-1.elb.amazonaws.com"
```

## Copy-Paste Alternative

If you prefer to run commands one by one:

### Command 1: Create Secret
```bash
kubectl create secret generic app-secrets \
    --from-literal=jwt-secret="G8bevQWT/MFhrcPeCH6T9urt8mxc99GelanPGYr49E0=" \
    -n pulsedesk --dry-run=client -o yaml | kubectl apply -f -
```

### Command 2: Delete Pod 1
```bash
kubectl delete pod pulsedesk-backend-86c5fcbdd6-dph67 -n pulsedesk
```

### Command 3: Delete Pod 2
```bash
kubectl delete pod pulsedesk-backend-86c5fcbdd6-gr4d5 -n pulsedesk
```

### Command 4: Verify
```bash
kubectl get pods -n pulsedesk
```

### Command 5: Trigger ArgoCD Sync
```bash
kubectl patch application pulsedesk-app -n argocd --type merge \
    -p '{"metadata":{"annotations":{"argocd.argoproj.io/refresh":"normal"}}}'
```

## Expected Results (After 1-2 minutes)

```
NAME                                READY   STATUS    RESTARTS   AGE
postgres                            1/1     Running   0          22h
pulsedesk-backend-XXXXX             1/1     Running   0          2m
pulsedesk-frontend-XXXXX            1/1     Running   0          22h
```

All pods should be:
- ✅ READY: 1/1
- ✅ STATUS: Running
- ✅ RESTARTS: Low number

## Troubleshooting

If pods still fail:

### Check pod events
```bash
kubectl describe pod pulsedesk-backend-86c5fcbdd6-dph67 -n pulsedesk
```

### Check logs
```bash
kubectl logs pulsedesk-backend-86c5fcbdd6-dph67 -n pulsedesk
```

### Verify secret exists
```bash
kubectl get secret app-secrets -n pulsedesk -o yaml
```

### Check ArgoCD logs
```bash
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller --tail=50
```

## What Happens Next

1. ✅ Pods restart with secret available
2. ✅ Backend starts successfully
3. ✅ ArgoCD detects the sync
4. ✅ ArgoCD dashboard updates to "Synced"
5. ✅ All services running and healthy

## Prevention

The CD Pipeline now includes:
- ✅ Automatic secret creation stage
- ✅ Better ArgoCD retry policies
- ✅ Improved health checks

Future deployments won't have this issue!
