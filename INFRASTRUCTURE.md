# Infrastructure Setup Documentation

## Overview

This document describes the complete infrastructure setup for PulseDesk CI/CD pipeline on AWS EKS.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         AWS Account (us-east-1)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                       VPC (10.0.0.0/16)                  │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │          Public Subnet (10.0.1.0/24)               │  │   │
│  │  │                                                     │  │   │
│  │  │  ┌──────────────────┐  ┌──────────────────────┐   │  │   │
│  │  │  │   Master Node    │  │  Jenkins Worker Node │   │  │   │
│  │  │  │ (m7i-flex.large) │  │ (m7i-flex.large)     │   │  │   │
│  │  │  │                  │  │                      │   │  │   │
│  │  │  │ • Jenkins        │  │ • Docker             │   │  │   │
│  │  │  │ • SonarQube      │  │ • Trivy              │   │  │   │
│  │  │  │ • ArgoCD         │  │ • Jenkins Agent      │   │  │   │
│  │  │  │ • eksctl         │  │ • AWSCLI             │   │  │   │
│  │  │  │ • kubectl        │  │                      │   │  │   │
│  │  │  │ • Helm           │  │                      │   │  │   │
│  │  │  └──────────────────┘  └──────────────────────┘   │  │   │
│  │  │                                                     │  │   │
│  │  │  ┌──────────────────────────────────────────┐     │  │   │
│  │  │  │      EKS Cluster (pulsedesk)             │     │  │   │
│  │  │  │   K8s Version: 1.27                      │     │  │   │
│  │  │  │                                          │     │  │   │
│  │  │  │   ┌────────────┐  ┌────────────┐       │     │  │   │
│  │  │  │   │ Node 1     │  │ Node 2     │       │     │  │   │
│  │  │  │   │ m7i-flex   │  │ m7i-flex   │       │     │  │   │
│  │  │  │   └────────────┘  └────────────┘       │     │  │   │
│  │  │  │                                          │     │  │   │
│  │  │  │   Workloads:                            │     │  │   │
│  │  │  │   • pulsedesk-frontend (NodePort 31100)│     │  │   │
│  │  │  │   • pulsedesk-backend (NodePort 31000) │     │  │   │
│  │  │  │   • PostgreSQL                         │     │  │   │
│  │  │  │   • ArgoCD                             │     │  │   │
│  │  │  │   • Prometheus (monitoring)            │     │  │   │
│  │  │  │   • Grafana (monitoring)               │     │  │   │
│  │  │  └──────────────────────────────────────────┘     │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌──────────────────┐
                    │  GitHub Repo     │
                    │  (Code Source)   │
                    └──────────────────┘
                              ↓
                    ┌──────────────────┐
                    │   DockerHub      │
                    │  (Image Registry)│
                    └──────────────────┘
```

## Infrastructure Components

### 1. EC2 Instances

#### Master Node
- **Type**: m7i-flex.large
- **Storage**: 29 GB (gp3)
- **Region**: us-east-1
- **AMI**: ami-0d97d7f07b25dd693
- **Software**:
  - Docker
  - Jenkins (CI/CD Orchestration)
  - SonarQube (Code Quality Analysis)
  - eksctl (EKS Management)
  - kubectl (Kubernetes Management)
  - AWSCLI (AWS Management)
  - Helm (Package Management)
  - ArgoCD (GitOps)

#### Jenkins Worker Node
- **Type**: m7i-flex.large
- **Storage**: 29 GB (gp3)
- **Region**: us-east-1
- **AMI**: ami-0d97d7f07b25dd693
- **IAM Role**: Attached with EKS, EC2, CloudFormation, ECR, and IAM permissions
- **Software**:
  - Docker
  - Java 17
  - Trivy (Container Scanning)
  - AWSCLI (AWS Management)

### 2. Networking

#### VPC
- **CIDR Block**: 10.0.0.0/16
- **DNS Hostnames**: Enabled
- **DNS Support**: Enabled

#### Public Subnet
- **CIDR Block**: 10.0.1.0/24
- **Availability Zone**: us-east-1a
- **Auto-assign Public IP**: Enabled

#### Internet Gateway
- Attached to VPC for external connectivity

#### Route Table
- Routes all traffic (0.0.0.0/0) to Internet Gateway
- Associated with Public Subnet

### 3. Security Group

**Name**: pulsedesk-sg

**Inbound Rules**:
| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 22 | TCP | 0.0.0.0/0 | SSH Access |
| 8080 | TCP | 0.0.0.0/0 | Jenkins UI |
| 9000 | TCP | 0.0.0.0/0 | SonarQube UI |
| 5000 | TCP | 0.0.0.0/0 | Docker Registry |
| 6443 | TCP | 0.0.0.0/0 | Kubernetes API |
| 30000-32767 | TCP | 0.0.0.0/0 | NodePort Services |
| 465 | TCP | 0.0.0.0/0 | SMTP (Email) |
| All | TCP | SG Internal | Internal Communication |

**Outbound Rules**:
- All traffic to 0.0.0.0/0

### 4. EKS Cluster

#### Cluster Details
- **Name**: pulsedesk
- **Version**: 1.27
- **Region**: us-east-1
- **VPC CIDR**: Managed by eksctl
- **OIDC Provider**: Associated for IAM integration

#### Node Group
- **Name**: pulsedesk-nodegroup
- **Node Type**: m7i-flex.large
- **Min Nodes**: 2
- **Max Nodes**: 3
- **Volume Size**: 29 GB
- **SSH Access**: Enabled

#### Kubernetes Namespaces
1. **pulsedesk** - Application workloads
2. **argocd** - GitOps deployment tool
3. **monitoring** - Prometheus and Grafana
4. **kube-system** - Kubernetes system components

### 5. Kubernetes Deployments

#### Frontend
- **Name**: pulsedesk-frontend
- **Replicas**: 2
- **Image**: pulsedesk:frontend-latest
- **Port**: 3000 (NodePort 31100)
- **Resources**:
  - CPU: 100m request, 300m limit
  - Memory: 256Mi request, 512Mi limit

#### Backend
- **Name**: pulsedesk-backend
- **Replicas**: 2
- **Image**: pulsedesk:backend-latest
- **Port**: 5000 (NodePort 31000)
- **Resources**:
  - CPU: 250m request, 500m limit
  - Memory: 512Mi request, 1Gi limit

#### Database
- **Name**: postgres
- **Type**: Deployment (not Statefulset)
- **Image**: postgres:15-alpine
- **Port**: 5432
- **Storage**: emptyDir (use PVC in production)

#### Monitoring
- **Prometheus**: Via Helm (kube-prometheus-stack)
- **Grafana**: Via Helm (kube-prometheus-stack)
- **Namespace**: monitoring

#### GitOps
- **ArgoCD**: Via kubectl apply
- **Namespace**: argocd

## Deployment Instructions

### Using Bash Scripts

```bash
# 1. Setup Master
cd Automations
./setup-master.sh

# 2. Setup Worker
./setup-worker.sh

# 3. Create EKS Cluster
./create-eks-cluster.sh

# 4. Setup ArgoCD
./setup-argocd.sh

# 5. Setup Monitoring
./setup-monitoring.sh
```

### Using Terraform

```bash
cd terraform

# Initialize Terraform
terraform init

# Validate configuration
terraform validate

# Plan deployment
terraform plan -out=tfplan

# Apply configuration
terraform apply tfplan

# Get outputs
terraform output
```

## Scaling and Updates

### Scaling EKS Nodegroup
```bash
eksctl scale nodegroup --cluster pulsedesk --nodes 3 --name pulsedesk-nodegroup
```

### Updating EKS Cluster
```bash
eksctl update cluster --name pulsedesk --version 1.28
eksctl upgrade nodegroup --cluster pulsedesk --name pulsedesk-nodegroup --kubernetes-version 1.28
```

### Scaling Kubernetes Deployments
```bash
kubectl scale deployment pulsedesk-backend -n pulsedesk --replicas=3
kubectl scale deployment pulsedesk-frontend -n pulsedesk --replicas=3
```

## Backup and Recovery

### Backup EBS Volumes
```bash
# Create snapshots of EBS volumes
aws ec2 create-snapshot --volume-id vol-xxxxx --description "Master backup"
```

### Backup Kubernetes Resources
```bash
# Backup all resources
kubectl get all -A -o yaml > backup.yaml

# Backup specific namespace
kubectl get all -n pulsedesk -o yaml > pulsedesk-backup.yaml
```

### Backup RDS (if using managed database)
```bash
# Automated backups are enabled by default
# Manual backup
aws rds create-db-snapshot --db-instance-identifier pulsedesk-db --db-snapshot-identifier pulsedesk-backup-$(date +%Y%m%d)
```

## Disaster Recovery Plan

1. **Data Loss**:
   - Use EBS snapshots or RDS backups
   - Restore from backup

2. **Node Failure**:
   - EKS automatically replaces unhealthy nodes
   - Pods are rescheduled on other nodes

3. **Complete Cluster Failure**:
   - Redeploy using Terraform
   - Restore data from backups
   - Reconfigure Jenkins and ArgoCD

## Cost Optimization

1. **Reserved Instances**: Use for long-term workloads
2. **Spot Instances**: Use for non-critical workloads
3. **Auto Scaling**: Scale down during off-hours
4. **Storage**: Use EBS lifecycle policies
5. **Data Transfer**: Use VPC endpoints to reduce NAT costs

## Security Best Practices

1. **IAM**:
   - Use least privilege principle
   - Separate roles for different services
   - Regular access reviews

2. **Network**:
   - Use VPC with private subnets for databases
   - Network policies in Kubernetes
   - WAF for API Gateway

3. **Secrets**:
   - Use AWS Secrets Manager or Kubernetes Secrets
   - Rotate credentials regularly
   - Never commit secrets to Git

4. **Monitoring**:
   - Enable CloudTrail for audit logs
   - CloudWatch for monitoring
   - GuardDuty for threat detection

## Compliance

- Data encryption at rest and in transit
- Regular patching and updates
- Access logging and monitoring
- Backup and disaster recovery testing

