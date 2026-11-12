#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

CLUSTER_NAME="pulsedesk"
REGION="us-east-1"
NODE_TYPE="m7i-flex.large"
NODES=2

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Creating EKS Cluster: ${CLUSTER_NAME}${NC}"
echo -e "${YELLOW}Region: ${REGION}${NC}"
echo -e "${YELLOW}========================================${NC}"

# Create cluster
echo -e "${GREEN}[1/4] Creating EKS cluster...${NC}"
eksctl create cluster \
  --name=${CLUSTER_NAME} \
  --region=${REGION} \
  --version=1.27 \
  --without-nodegroup \
  --zones=${REGION}a,${REGION}b \
  --vpc-cidr=10.0.0.0/16

# Associate OIDC provider
echo -e "${GREEN}[2/4] Associating IAM OIDC provider...${NC}"
eksctl utils associate-iam-oidc-provider \
  --region ${REGION} \
  --cluster ${CLUSTER_NAME} \
  --approve

# Generate SSH key if not exists
echo -e "${GREEN}[3/4] Creating SSH key pair...${NC}"
if [ ! -f "${CLUSTER_NAME}-eks-key.pem" ]; then
  aws ec2 create-key-pair \
    --key-name ${CLUSTER_NAME}-eks-key \
    --region ${REGION} \
    --query 'KeyMaterial' \
    --output text > ${CLUSTER_NAME}-eks-key.pem
  chmod 600 ${CLUSTER_NAME}-eks-key.pem
  echo -e "${GREEN}SSH key created: ${CLUSTER_NAME}-eks-key.pem${NC}"
else
  echo -e "${YELLOW}SSH key already exists${NC}"
fi

# Create nodegroup
echo -e "${GREEN}[4/4] Creating nodegroup...${NC}"
eksctl create nodegroup \
  --cluster=${CLUSTER_NAME} \
  --region=${REGION} \
  --name=${CLUSTER_NAME}-nodegroup \
  --node-type=${NODE_TYPE} \
  --nodes=${NODES} \
  --nodes-min=${NODES} \
  --nodes-max=3 \
  --node-volume-size=29 \
  --ssh-access \
  --ssh-public-key=${CLUSTER_NAME}-eks-key

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}EKS Cluster Created Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Cluster Details:${NC}"
kubectl cluster-info
echo ""
echo -e "${YELLOW}Nodes:${NC}"
kubectl get nodes
