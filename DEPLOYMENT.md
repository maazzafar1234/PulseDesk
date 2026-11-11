# PulseDesk Production Deployment Guide

Complete enterprise-grade AWS production deployment setup for PulseDesk with Terraform, Kubernetes, Jenkins CI/CD, and ArgoCD GitOps.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Deployment Pipeline](#deployment-pipeline)
4. [Monitoring & Observability](#monitoring--observability)
5. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

- **AWS Account** with appropriate permissions
- **Terraform** >= 1.0
- **kubectl** >= 1.28
- **Docker** >= 24.0
- **Git** with SSH configured
- **GitHub CLI** (optional, for PR management)
- **Helm** >= 3.12 (optional)

### AWS Requirements

- EKS cluster support enabled in your region
- RDS PostgreSQL available
- ECR (Elastic Container Registry) access
- IAM permissions for:
  - EC2, EKS, RDS, ECR
  - VPC, Subnets, Security Groups
  - IAM roles and policies
  - Secrets Manager

### Environment Variables

Set up your AWS credentials:

```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1
```

---

## Infrastructure Setup

### 1. Provision AWS Infrastructure with Terraform

#### Step 1: Initialize Terraform

```bash
cd terraform
terraform init
```

#### Step 2: Customize Variables

Create `terraform.tfvars`:

```hcl
aws_region           = "us-east-1"
environment          = "production"
cluster_name         = "pulsedesk-eks"
kubernetes_version   = "1.28"
instance_type        = "t3.medium"
desired_capacity     = 3
min_capacity         = 3
max_capacity         = 10
database_name        = "pulsedesk"
database_user        = "pulsedesk"
database_instance_type = "db.t4g.small"
postgres_version     = "15.3"
rds_instance_count   = 2
```

#### Step 3: Review and Apply

```bash
# Review planned changes
terraform plan -out=tfplan

# Apply infrastructure changes
terraform apply tfplan
```

#### Step 4: Save Outputs

```bash
# Export outputs for later use
terraform output -json > infrastructure-outputs.json

# Get kubeconfig
aws eks update-kubeconfig --name pulsedesk-eks --region us-east-1

# Verify cluster access
kubectl get nodes
```

### 2. Configure Kubernetes Secrets

#### Step 1: Create Namespace

```bash
kubectl create namespace production
kubectl label namespace production name=production
```

#### Step 2: Create Secrets

```bash
# Get RDS password from Terraform outputs
RDS_PASSWORD=$(terraform output -raw rds_database_password)

# Create database secret
kubectl create secret generic pulsedesk-secrets \
  --from-literal=database-url="postgresql://pulsedesk:${RDS_PASSWORD}@prod-rds-endpoint.us-east-1.rds.amazonaws.com:5432/pulsedesk" \
  --from-literal=jwt-secret="$(openssl rand -hex 32)" \
  -n production
```

#### Step 3: Create ConfigMaps

```bash
kubectl apply -f k8s/configmap.yaml -n production
```

### 3. Build and Push Docker Image

#### Step 1: Authenticate with ECR

```bash
# Get login token
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com
```

#### Step 2: Build Docker Image

```bash
docker build -f server/Dockerfile -t pulsedesk:v1.0.0 .

# Tag for ECR
docker tag pulsedesk:v1.0.0 \
  123456789012.dkr.ecr.us-east-1.amazonaws.com/pulsedesk:v1.0.0
```

#### Step 3: Push to ECR

```bash
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/pulsedesk:v1.0.0
```

### 4. Deploy to Kubernetes

#### Step 1: Update Image in Manifests

```bash
# Update deployment.yaml with correct image
sed -i 's|IMAGE_PLACEHOLDER|123456789012.dkr.ecr.us-east-1.amazonaws.com/pulsedesk:v1.0.0|g' k8s/deployment.yaml
```

#### Step 2: Apply Kubernetes Manifests

```bash
# Deploy application
kubectl apply -f k8s/deployment.yaml -n production
kubectl apply -f k8s/service.yaml -n production
kubectl apply -f k8s/ingress.yaml -n production
kubectl apply -f k8s/hpa.yaml -n production

# Wait for rollout
kubectl rollout status deployment/pulsedesk -n production --timeout=5m
```

#### Step 3: Verify Deployment

```bash
# Check pods
kubectl get pods -n production -l app=pulsedesk

# Check services
kubectl get svc -n production

# Check ingress
kubectl get ingress -n production

# Test health endpoint
POD_NAME=$(kubectl get pods -n production -l app=pulsedesk -o jsonpath='{.items[0].metadata.name}')
kubectl exec -it $POD_NAME -n production -- curl http://localhost:5000/api/health
```

---

## Deployment Pipeline

### Jenkins Configuration

#### Step 1: Install Jenkins

```bash
# Using Docker
docker run -d -p 8080:8080 -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  jenkins/jenkins:lts

# Access Jenkins: http://localhost:8080
```

#### Step 2: Install Required Plugins

In Jenkins UI:
- Manage Jenkins → Manage Plugins
- Install:
  - Kubernetes
  - Docker Pipeline
  - Git
  - GitHub Branch Source
  - Pipeline

#### Step 3: Create Pipeline Job

1. New Item → Pipeline
2. Pipeline section:
   - Definition: Pipeline script from SCM
   - SCM: Git
   - Repository URL: `https://github.com/maazzafar1234/PulseDesk.git`
   - Script Path: `Jenkinsfile`
3. Build Triggers:
   - GitHub hook trigger for GITScm polling

#### Step 4: Configure GitHub Webhook

In GitHub repository:
1. Settings → Webhooks
2. Add webhook:
   - Payload URL: `http://jenkins-url/github-webhook/`
   - Events: Push events, Pull request events
   - Active: ✓

### Manual Pipeline Execution

```bash
# Using Jenkins CLI
java -jar jenkins-cli.jar -s http://localhost:8080 \
  build pulsedesk \
  -p GIT_BRANCH=feature/production-prep \
  -p ENVIRONMENT=staging \
  -p RUN_TESTS=true
```

---

## ArgoCD GitOps Setup

### Step 1: Install ArgoCD

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for ArgoCD to be ready
kubectl rollout status deploy/argocd-server -n argocd
```

### Step 2: Access ArgoCD

```bash
# Get initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d

# Port forward
kubectl port-forward svc/argocd-server -n argocd 8443:443
```

### Step 3: Create ArgoCD Application

```bash
kubectl apply -f argocd/application.yaml -n argocd

# Monitor sync status
argocd app get pulsedesk
argocd app sync pulsedesk
```

---

## Monitoring & Observability

### Step 1: Install Prometheus

```bash
# Create monitoring namespace
kubectl create namespace monitoring

# Deploy Prometheus
kubectl apply -f monitoring/prometheus.yaml -n monitoring

# Wait for deployment
kubectl rollout status statefulset/prometheus -n monitoring
```

### Step 2: Install Grafana

```bash
# Add Helm repository
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Install Grafana
helm install grafana grafana/grafana \
  -n monitoring \
  --set adminPassword=admin
```

### Step 3: Access Dashboards

```bash
# Prometheus
kubectl port-forward svc/prometheus -n monitoring 9090:9090
# http://localhost:9090

# Grafana
kubectl port-forward svc/grafana -n monitoring 3000:3000
# http://localhost:3000 (admin/admin)
```

### Step 4: Add Prometheus Data Source

In Grafana:
1. Configuration → Data Sources
2. Add Prometheus
3. URL: `http://prometheus:9090`
4. Save

### Step 5: Import Grafana Dashboard

In Grafana:
1. Dashboards → Import
2. Upload `monitoring/prometheus.yaml`
3. Select Prometheus data source

---

## Troubleshooting

### Issue: EKS Cluster Creation Failed

```bash
# Check Terraform logs
terraform show
terraform destroy -auto-approve  # Clean up
terraform apply -auto-approve    # Retry
```

### Issue: Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n production

# Check logs
kubectl logs <pod-name> -n production

# Check events
kubectl get events -n production --sort-by='.lastTimestamp'
```

### Issue: Database Connection Failed

```bash
# Verify security group
aws ec2 describe-security-groups --region us-east-1

# Test RDS connectivity from pod
kubectl exec -it <pod-name> -n production -- \
  psql -h <rds-endpoint> -U pulsedesk -d pulsedesk
```

### Issue: High Latency or Errors

```bash
# Check metrics
kubectl port-forward svc/prometheus -n monitoring 9090:9090
# Query: http_requests_per_second, http_request_duration_seconds

# Check HPA status
kubectl get hpa -n production

# Check node resources
kubectl top nodes
kubectl top pods -n production
```

### Issue: Certificate Errors

```bash
# Regenerate ACM certificate
aws acm request-certificate \
  --domain-name api.pulsedesk.example.com \
  --validation-method DNS \
  --region us-east-1

# Update Ingress with new certificate ARN
kubectl edit ingress pulsedesk -n production
```

---

## Rollback Procedures

### Kubernetes Rollback

```bash
# Check rollout history
kubectl rollout history deployment/pulsedesk -n production

# Rollback to previous version
kubectl rollout undo deployment/pulsedesk -n production

# Rollback to specific revision
kubectl rollout undo deployment/pulsedesk -n production --to-revision=5
```

### ArgoCD Rollback

```bash
# List application history
argocd app history pulsedesk

# Rollback to previous sync
argocd app rollback pulsedesk 0
```

---

## Cost Optimization

### Recommended Settings

```hcl
# For development
instance_type      = "t3.small"    # Instead of t3.medium
desired_capacity   = 1
max_capacity       = 3

# For production
instance_type      = "t3.medium"   # Or m5.large
desired_capacity   = 3
max_capacity       = 10
```

### Enable Spot Instances (Cost Savings ~70%)

```bash
# Modify terraform/main.tf
# Add spot_price and use t3.medium for mixed instances
```

---

## Security Best Practices

✅ **Implemented:**
- SSL/TLS for data in transit
- JWT tokens in HTTP-only cookies
- Rate limiting (100 requests/15min)
- Security headers (Helmet)
- Private subnets for database
- RBAC for Kubernetes
- Network policies
- Regular backups (7-day retention)

⚠️ **Additional Recommendations:**
- Enable AWS WAF on ALB
- Use VPN for admin access
- Enable CloudTrail logging
- Implement secrets rotation
- Regular security audits
- DDoS protection (AWS Shield)

---

## Next Steps

1. **Configure domain**: Update DNS to point to ALB endpoint
2. **Set up monitoring alerts**: Configure SNS notifications
3. **Test failover**: Verify HA and recovery procedures
4. **Scale testing**: Load test the deployment
5. **Documentation**: Update runbooks for operations team

---

## Support & Resources

- [AWS EKS Documentation](https://docs.aws.amazon.com/eks/)
- [Kubernetes Official Docs](https://kubernetes.io/docs/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [PulseDesk GitHub](https://github.com/maazzafar1234/PulseDesk)
- [Jenkins Documentation](https://www.jenkins.io/doc/)
- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)

---

**Last Updated:** November 2026
**Status:** Production Ready
**Maintainers:** DevOps Team
