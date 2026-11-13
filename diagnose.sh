#!/bin/bash

echo "=============================================="
echo "PulseDesk Deployment Diagnostic Report"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check 1: Kubernetes Connection
echo -e "${BLUE}[1] Kubernetes Connection${NC}"
if kubectl cluster-info &>/dev/null; then
    echo -e "${GREEN}✅ Connected to Kubernetes cluster${NC}"
    kubectl cluster-info | head -3
else
    echo -e "${RED}❌ Cannot connect to Kubernetes cluster${NC}"
    exit 1
fi
echo ""

# Check 2: Namespace
echo -e "${BLUE}[2] Namespace Status${NC}"
if kubectl get namespace pulsedesk &>/dev/null; then
    echo -e "${GREEN}✅ Namespace 'pulsedesk' exists${NC}"
else
    echo -e "${RED}❌ Namespace 'pulsedesk' not found${NC}"
fi
echo ""

# Check 3: Secrets
echo -e "${BLUE}[3] Secrets${NC}"
SECRETS=$(kubectl get secrets -n pulsedesk 2>/dev/null | wc -l)
if [ $SECRETS -gt 1 ]; then
    echo -e "${GREEN}✅ Secrets found:${NC}"
    kubectl get secrets -n pulsedesk
    
    if kubectl get secret app-secrets -n pulsedesk &>/dev/null; then
        echo -e "${GREEN}✅ app-secrets Secret exists${NC}"
        KEYS=$(kubectl get secret app-secrets -n pulsedesk -o jsonpath='{.data}' | grep -o 'jwt-secret' || echo "MISSING")
        if [ "$KEYS" != "MISSING" ]; then
            echo -e "${GREEN}  ✅ jwt-secret key present${NC}"
        else
            echo -e "${RED}  ❌ jwt-secret key MISSING${NC}"
        fi
    else
        echo -e "${RED}❌ app-secrets Secret NOT FOUND${NC}"
    fi
else
    echo -e "${RED}❌ No secrets found${NC}"
fi
echo ""

# Check 4: Pods
echo -e "${BLUE}[4] Pod Status${NC}"
kubectl get pods -n pulsedesk
echo ""

# Check 5: Pod Details
echo -e "${BLUE}[5] Pod Details${NC}"
PODS=$(kubectl get pods -n pulsedesk -o jsonpath='{.items[*].metadata.name}')
for POD in $PODS; do
    STATUS=$(kubectl get pod $POD -n pulsedesk -o jsonpath='{.status.phase}')
    READY=$(kubectl get pod $POD -n pulsedesk -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}')
    
    if [ "$STATUS" != "Running" ] || [ "$READY" != "True" ]; then
        echo -e "${YELLOW}Pod: $POD${NC}"
        echo "  Status: $STATUS"
        echo "  Ready: $READY"
        
        # Check for errors
        ERRORS=$(kubectl get pod $POD -n pulsedesk -o jsonpath='{.status.containerStatuses[0].state}')
        echo "  Container State: $ERRORS"
    fi
done
echo ""

# Check 6: Services
echo -e "${BLUE}[6] Services${NC}"
kubectl get svc -n pulsedesk
echo ""

# Check 7: Backend Pod Logs (if running)
echo -e "${BLUE}[7] Backend Pod Logs${NC}"
BACKEND=$(kubectl get pods -n pulsedesk -l app=pulsedesk-backend -o jsonpath='{.items[?(@.status.phase=="Running")].metadata.name}' | head -1)
if [ -n "$BACKEND" ]; then
    echo -e "${GREEN}Running backend pod found: $BACKEND${NC}"
    echo "Recent logs:"
    kubectl logs -n pulsedesk $BACKEND --tail=20
else
    echo -e "${YELLOW}⚠️  No running backend pod found${NC}"
    FAILED=$(kubectl get pods -n pulsedesk -l app=pulsedesk-backend -o jsonpath='{.items[0].metadata.name}')
    if [ -n "$FAILED" ]; then
        echo "Checking failed pod: $FAILED"
        kubectl describe pod $FAILED -n pulsedesk | grep -A 10 "Events:"
    fi
fi
echo ""

# Check 8: Deployments
echo -e "${BLUE}[8] Deployments${NC}"
kubectl get deployment -n pulsedesk
echo ""

# Check 9: ArgoCD Application
echo -e "${BLUE}[9] ArgoCD Application${NC}"
if kubectl get application pulsedesk-app -n argocd &>/dev/null; then
    echo -e "${GREEN}✅ ArgoCD Application found${NC}"
    kubectl get application pulsedesk-app -n argocd -o jsonpath='{.status}'
    echo ""
    
    # Check sync status
    SYNC_STATUS=$(kubectl get application pulsedesk-app -n argocd -o jsonpath='{.status.sync.status}')
    HEALTH=$(kubectl get application pulsedesk-app -n argocd -o jsonpath='{.status.health.status}')
    
    echo "Sync Status: $SYNC_STATUS"
    echo "Health Status: $HEALTH"
    
    if [ "$SYNC_STATUS" == "Synced" ]; then
        echo -e "${GREEN}✅ Application is synced${NC}"
    else
        echo -e "${RED}❌ Application is NOT synced${NC}"
    fi
else
    echo -e "${RED}❌ ArgoCD Application not found${NC}"
fi
echo ""

# Check 10: PersistentVolumes
echo -e "${BLUE}[10] Storage${NC}"
kubectl get pv,pvc -n pulsedesk
echo ""

# Summary
echo -e "${BLUE}=============================================="
echo "Diagnostic Summary"
echo "===============================================${NC}"

TOTAL_PODS=$(kubectl get pods -n pulsedesk --no-headers | wc -l)
RUNNING_PODS=$(kubectl get pods -n pulsedesk --no-headers 2>/dev/null | grep Running | wc -l)

if [ "$TOTAL_PODS" -eq "$RUNNING_PODS" ]; then
    echo -e "${GREEN}✅ ALL PODS RUNNING ($RUNNING_PODS/$TOTAL_PODS)${NC}"
else
    echo -e "${RED}❌ PODS NOT HEALTHY ($RUNNING_PODS/$TOTAL_PODS running)${NC}"
fi

if kubectl get secret app-secrets -n pulsedesk &>/dev/null; then
    echo -e "${GREEN}✅ Secrets configured${NC}"
else
    echo -e "${RED}❌ Secrets missing - RUN IMMEDIATE-FIX.md${NC}"
fi

echo ""
echo "For issues, check:"
echo "1. IMMEDIATE-FIX.md - Quick fixes for common issues"
echo "2. RESOLVE-POD-ERRORS.md - Detailed troubleshooting"
echo "3. kubectl logs <pod> -n pulsedesk - Pod logs"
echo ""
