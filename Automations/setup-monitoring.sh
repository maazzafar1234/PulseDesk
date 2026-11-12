#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Setting up Prometheus & Grafana${NC}"
echo -e "${YELLOW}========================================${NC}"

# Add Helm repositories
echo -e "${GREEN}[1/6] Adding Helm repositories...${NC}"
helm repo add stable https://charts.helm.sh/stable
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Create monitoring namespace
echo -e "${GREEN}[2/6] Creating monitoring namespace...${NC}"
kubectl create namespace monitoring || echo "Namespace already exists"

# Install Prometheus
echo -e "${GREEN}[3/6] Installing Prometheus Stack...${NC}"
helm install prometheus prometheus-community/kube-prometheus-stack \
  -n monitoring \
  --set prometheus.prometheusSpec.retention=30d \
  --set grafana.enabled=true \
  --set grafana.adminPassword=admin123

# Expose Prometheus
echo -e "${GREEN}[4/6] Exposing Prometheus via NodePort...${NC}"
kubectl patch svc prometheus-kube-prometheus-prometheus -n monitoring -p '{"spec": {"type": "NodePort"}}' || true

# Expose Grafana
echo -e "${GREEN}[5/6] Exposing Grafana via NodePort...${NC}"
kubectl patch svc prometheus-grafana -n monitoring -p '{"spec": {"type": "NodePort"}}' || true

# Get access details
echo -e "${GREEN}[6/6] Retrieving access details...${NC}"

PROMETHEUS_PORT=$(kubectl get svc prometheus-kube-prometheus-prometheus -n monitoring -o jsonpath='{.spec.ports[0].nodePort}')
GRAFANA_PORT=$(kubectl get svc prometheus-grafana -n monitoring -o jsonpath='{.spec.ports[0].nodePort}')
WORKER_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="ExternalIP")].address}')

# Fallback to internal IP if external IP not available
if [ -z "$WORKER_IP" ]; then
  WORKER_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Monitoring Setup Completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Access Details:${NC}"
echo -e "Prometheus: ${YELLOW}http://${WORKER_IP}:${PROMETHEUS_PORT}${NC}"
echo -e "Grafana: ${YELLOW}http://${WORKER_IP}:${GRAFANA_PORT}${NC}"
echo ""
echo -e "${YELLOW}Grafana Credentials:${NC}"
echo -e "Username: ${YELLOW}admin${NC}"
echo -e "Password: ${YELLOW}admin123${NC}"
echo ""
echo -e "${YELLOW}Verify Installation:${NC}"
kubectl get pods -n monitoring
