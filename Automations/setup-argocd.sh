#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

NAMESPACE="argocd"
CLUSTER_NAME="pulsedesk"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Setting up ArgoCD${NC}"
echo -e "${YELLOW}========================================${NC}"

# Create namespace
echo -e "${GREEN}[1/5] Creating ArgoCD namespace...${NC}"
kubectl create namespace ${NAMESPACE} || echo "Namespace already exists"

# Apply ArgoCD manifests
echo -e "${GREEN}[2/5] Applying ArgoCD manifests...${NC}"
kubectl apply -n ${NAMESPACE} -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for pods to be ready
echo -e "${GREEN}[3/5] Waiting for ArgoCD pods to be ready...${NC}"
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=argocd-server -n ${NAMESPACE} --timeout=300s

# Change service to NodePort
echo -e "${GREEN}[4/5] Exposing ArgoCD server via NodePort...${NC}"
kubectl patch svc argocd-server -n ${NAMESPACE} -p '{"spec": {"type": "NodePort"}}'

# Get ArgoCD password
echo -e "${GREEN}[5/5] Retrieving ArgoCD credentials...${NC}"
ARGOCD_PASS=$(kubectl -n ${NAMESPACE} get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}ArgoCD Setup Completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}ArgoCD Access Details:${NC}"

ARGOCD_SERVER=$(kubectl get svc argocd-server -n ${NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "pending")
ARGOCD_NODEPORT=$(kubectl get svc argocd-server -n ${NAMESPACE} -o jsonpath='{.spec.ports[0].nodePort}')
WORKER_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="ExternalIP")].address}')

echo -e "URL: ${YELLOW}http://${WORKER_IP}:${ARGOCD_NODEPORT}${NC}"
echo -e "Username: ${YELLOW}admin${NC}"
echo -e "Password: ${GREEN}${ARGOCD_PASS}${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "1. Login to ArgoCD and change default password"
echo -e "2. Add your EKS cluster: ${YELLOW}./setup-argocd-cluster.sh${NC}"
echo -e "3. Connect repository in ArgoCD console"
