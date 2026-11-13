#!/bin/bash

echo "=================================================="
echo "PulseDesk - CREATE SECRETS NOW"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check kubectl
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl not found${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Ensuring namespace exists${NC}"
kubectl create namespace pulsedesk --dry-run=client -o yaml | kubectl apply -f -
echo -e "${GREEN}✅ Namespace ready${NC}"
echo ""

echo -e "${YELLOW}Step 2: Creating app-secrets${NC}"
kubectl create secret generic app-secrets \
    --from-literal=jwt-secret="G8bevQWT/MFhrcPeCH6T9urt8mxc99GelanPGYr49E0=" \
    -n pulsedesk \
    --dry-run=client -o yaml | kubectl apply -f -
echo -e "${GREEN}✅ app-secrets created/updated${NC}"
echo ""

echo -e "${YELLOW}Step 3: Verifying secret${NC}"
if kubectl get secret app-secrets -n pulsedesk &>/dev/null; then
    echo -e "${GREEN}✅ Secret verified${NC}"
    kubectl get secret app-secrets -n pulsedesk -o jsonpath='{.data.jwt-secret}' | base64 -d
    echo ""
else
    echo -e "${RED}❌ Secret not found${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}Step 4: Checking for failed pods${NC}"
FAILED_PODS=$(kubectl get pods -n pulsedesk --field-selector=status.phase=Failed -o jsonpath='{.items[*].metadata.name}' 2>/dev/null)

if [ -z "$FAILED_PODS" ]; then
    echo -e "${GREEN}✅ No failed pods${NC}"
else
    echo -e "${YELLOW}Found failed pods: $FAILED_PODS${NC}"
    echo "Deleting failed pods..."
    kubectl delete pod $FAILED_PODS -n pulsedesk 2>/dev/null || true
    echo -e "${GREEN}✅ Failed pods deleted${NC}"
fi
echo ""

echo -e "${YELLOW}Step 5: Checking for CreateContainerConfigError pods${NC}"
ERROR_PODS=$(kubectl get pods -n pulsedesk -o jsonpath='{.items[?(@.status.containerStatuses[0].state.waiting.reason=="CreateContainerConfigError")].metadata.name}' 2>/dev/null)

if [ -z "$ERROR_PODS" ]; then
    echo -e "${GREEN}✅ No CreateContainerConfigError pods${NC}"
else
    echo -e "${YELLOW}Found error pods: $ERROR_PODS${NC}"
    echo "Deleting error pods (new ones will start with secret)..."
    kubectl delete pod $ERROR_PODS -n pulsedesk 2>/dev/null || true
    echo -e "${GREEN}✅ Error pods deleted${NC}"
fi
echo ""

echo -e "${YELLOW}Step 6: Waiting for pods to start (30 seconds)...${NC}"
sleep 30
echo ""

echo -e "${YELLOW}Final Status:${NC}"
kubectl get pods -n pulsedesk
echo ""

RUNNING=$(kubectl get pods -n pulsedesk --no-headers 2>/dev/null | grep Running | wc -l)
TOTAL=$(kubectl get pods -n pulsedesk --no-headers 2>/dev/null | wc -l)

echo ""
if [ "$RUNNING" -eq "$TOTAL" ]; then
    echo -e "${GREEN}=================================================="
    echo "✅ ALL PODS RUNNING ($RUNNING/$TOTAL)"
    echo "==================================================${NC}"
else
    echo -e "${YELLOW}⚠️  Some pods still starting ($RUNNING/$TOTAL running)${NC}"
fi
