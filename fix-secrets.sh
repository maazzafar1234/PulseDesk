#!/bin/bash

echo "========================================"
echo "PulseDesk Secrets Fix Script"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Create namespace if it doesn't exist
echo -e "${YELLOW}Step 1: Ensuring pulsedesk namespace exists...${NC}"
kubectl create namespace pulsedesk --dry-run=client -o yaml | kubectl apply -f -
echo -e "${GREEN}✅ Namespace ready${NC}"
echo ""

# Step 2: Create app-secrets
echo -e "${YELLOW}Step 2: Creating app-secrets...${NC}"
kubectl create secret generic app-secrets \
    --from-literal=jwt-secret="G8bevQWT/MFhrcPeCH6T9urt8mxc99GelanPGYr49E0=" \
    -n pulsedesk \
    --dry-run=client -o yaml | kubectl apply -f -
echo -e "${GREEN}✅ app-secrets created/updated${NC}"
echo ""

# Step 3: Verify secrets
echo -e "${YELLOW}Step 3: Verifying secrets...${NC}"
kubectl get secrets -n pulsedesk
echo ""

# Step 4: Delete failing pods to trigger restart
echo -e "${YELLOW}Step 4: Deleting failed backend pods...${NC}"
kubectl delete pod -n pulsedesk \
    -l app=pulsedesk-backend \
    --field-selector=status.phase=Failed,status.containerStatuses[0].state.waiting.reason=CreateContainerConfigError \
    2>/dev/null || true

kubectl delete pod -n pulsedesk \
    pulsedesk-backend-86c5fcbdd6-dph67 \
    pulsedesk-backend-86c5fcbdd6-gr4d5 \
    2>/dev/null || echo "Some pods may have already been deleted"

echo -e "${GREEN}✅ Failed pods deleted (new pods will be created automatically)${NC}"
echo ""

# Step 5: Wait and check status
echo -e "${YELLOW}Step 5: Waiting for pods to restart (this may take a minute)...${NC}"
sleep 5
echo ""
echo "Pod status:"
kubectl get pods -n pulsedesk
echo ""

# Step 6: Check backend pod logs
echo -e "${YELLOW}Step 6: Checking backend pod logs...${NC}"
BACKEND_POD=$(kubectl get pods -n pulsedesk -l app=pulsedesk-backend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ -n "$BACKEND_POD" ]; then
    echo "Latest backend logs:"
    kubectl logs -n pulsedesk $BACKEND_POD --tail=20
else
    echo "No backend pod found yet"
fi
echo ""

echo -e "${GREEN}========================================"
echo "✅ Secrets fix complete!"
echo "========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Wait 1-2 minutes for all pods to be Running"
echo "2. Run: kubectl get pods -n pulsedesk"
echo "3. Check ArgoCD dashboard for sync status"
echo ""
