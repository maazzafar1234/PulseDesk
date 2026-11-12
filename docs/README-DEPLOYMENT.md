# PulseDesk Enterprise CI/CD Deployment

A production-ready CI/CD pipeline for the PulseDesk application on AWS EKS with Jenkins, ArgoCD, SonarQube, and comprehensive monitoring.

## Quick Navigation

- **[Deployment Guide](./DEPLOYMENT_GUIDE.md)** - Complete step-by-step deployment instructions
- **[CI/CD Setup](./CI-CD-SETUP.md)** - Jenkins pipeline configuration and setup
- **[Infrastructure](./INFRASTRUCTURE.md)** - AWS infrastructure and Kubernetes architecture
- **[Automations](./Automations/)** - Automated setup scripts
- **[Kubernetes](./kubernetes/)** - K8s manifests and configurations
- **[GitOps](./GitOps/)** - Jenkins pipeline definitions
- **[Terraform](./terraform/)** - Infrastructure as Code

## Technology Stack

### DevOps & CI/CD
- **Jenkins** - Continuous Integration & Deployment orchestration
- **ArgoCD** - GitOps-based deployment and synchronization
- **GitHub** - Source control and version management
- **DockerHub** - Container image registry

### Code Quality & Security
- **SonarQube** - Code quality analysis and metrics
- **OWASP Dependency-Check** - Dependency vulnerability scanning
- **Trivy** - Container image scanning and vulnerability assessment

### Container & Orchestration
- **Docker** - Container runtime and image building
- **Kubernetes (EKS)** - Container orchestration platform
- **Helm** - Kubernetes package manager

### Infrastructure
- **AWS EKS** - Managed Kubernetes service
- **AWS EC2** - Compute instances
- **AWS VPC** - Network infrastructure
- **Terraform** - Infrastructure as Code

### Monitoring & Observability
- **Prometheus** - Metrics collection and time-series database
- **Grafana** - Metrics visualization and dashboards
- **Kubernetes Events** - Cluster event logging

## Architecture Overview

```
Developer Push → GitHub Webhook → Jenkins CI Pipeline
                                        ↓
                    Code Quality (SonarQube, OWASP)
                                        ↓
                    Container Security (Trivy)
                                        ↓
                    Docker Build & Push
                                        ↓
                    Update K8s Manifests
                                        ↓
                    Jenkins CD Pipeline → ArgoCD
                                        ↓
                    AWS EKS Deployment
                                        ↓
                    Application Live & Monitored
                    (Prometheus + Grafana)
```

## Prerequisites Checklist

- [ ] AWS Account with appropriate IAM permissions
- [ ] SSH key pair for EC2 instances
- [ ] GitHub account with Personal Access Token
- [ ] DockerHub account
- [ ] Gmail account with 2FA enabled (for email notifications)
- [ ] Terraform installed (v1.0+) for IaC deployment
- [ ] AWS CLI configured
- [ ] kubectl installed locally

## Deployment Methods

### Method 1: Automated Bash Scripts (Recommended for Learning)

```bash
# Navigate to Automations directory
cd Automations

# Step 1: Setup Master Machine
bash setup-master.sh

# Step 2: Setup Jenkins Worker
bash setup-worker.sh

# Step 3: Create EKS Cluster
bash create-eks-cluster.sh

# Step 4: Setup ArgoCD
bash setup-argocd.sh

# Step 5: Setup Monitoring
bash setup-monitoring.sh
```

**Time**: ~45-60 minutes (excluding EKS cluster creation which takes ~15-20 minutes)

### Method 2: Terraform (Recommended for Production)

```bash
# Navigate to terraform directory
cd terraform

# Initialize
terraform init

# Validate
terraform validate

# Plan
terraform plan -out=tfplan

# Apply
terraform apply tfplan

# Get outputs
terraform output infrastructure_summary
```

**Time**: ~30 minutes (IaC deployment) + manual configuration

### Method 3: Manual Step-by-Step

Follow the detailed instructions in [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

**Time**: ~90 minutes (manual configuration)

## Directory Structure

```
pulsedesk/
├── Automations/                    # Automated setup scripts
│   ├── setup-master.sh             # Master node setup
│   ├── setup-worker.sh             # Jenkins worker setup
│   ├── create-eks-cluster.sh       # EKS cluster creation
│   ├── setup-argocd.sh             # ArgoCD configuration
│   └── setup-monitoring.sh         # Monitoring stack setup
│
├── GitOps/                         # Jenkins pipeline definitions
│   ├── Jenkinsfile-CI              # CI pipeline script
│   └── Jenkinsfile-CD              # CD pipeline script
│
├── kubernetes/                     # K8s manifests
│   ├── namespace.yaml              # Application namespace
│   ├── app-secrets.yaml            # Application secrets
│   ├── postgres-secrets.yaml       # Database secrets
│   ├── postgres-deployment.yaml    # PostgreSQL
│   ├── frontend-deployment.yaml    # Frontend service
│   ├── backend-deployment.yaml     # Backend service
│   └── kustomization.yaml          # Kustomize config
│
├── terraform/                      # Infrastructure as Code
│   ├── main.tf                     # Main infrastructure
│   ├── variables.tf                # Input variables
│   └── outputs.tf                  # Output values
│
├── client/                         # Frontend application
│   ├── Dockerfile                  # Frontend Docker image
│   └── ...
│
├── server/                         # Backend application
│   ├── Dockerfile                  # Backend Docker image
│   └── ...
│
├── DEPLOYMENT_GUIDE.md             # Comprehensive deployment guide
├── CI-CD-SETUP.md                  # CI/CD configuration guide
├── INFRASTRUCTURE.md               # Infrastructure documentation
└── README-DEPLOYMENT.md            # This file
```

## Key Configurations

### AWS Specifications
- **Region**: us-east-1
- **Instance Type**: m7i-flex.large
- **AMI**: ami-0d97d7f07b25dd693
- **Storage**: 29 GB (gp3)

### Kubernetes Specifications
- **EKS Version**: 1.27
- **Node Count**: 2 (min) - 3 (max)
- **Node Type**: m7i-flex.large
- **Namespaces**: pulsedesk, argocd, monitoring, kube-system

### Application Specifications
- **Frontend Port**: 3000 (NodePort 31100)
- **Backend Port**: 5000 (NodePort 31000)
- **Database**: PostgreSQL 15 (in-cluster)
- **Cache**: Optional (Redis)

## Deployment Workflow

### Stage 1: Infrastructure Setup (15 minutes)
1. Create EC2 instances (Master & Worker)
2. Configure security groups and networking
3. Attach IAM roles to instances

### Stage 2: Master Configuration (20 minutes)
1. Install Docker and essential tools
2. Install Jenkins and configure initial setup
3. Install SonarQube for code quality analysis
4. Configure AWSCLI with credentials

### Stage 3: EKS Cluster Creation (20 minutes)
1. Create EKS cluster without nodegroup
2. Associate IAM OIDC provider
3. Create node group with EC2 instances
4. Verify cluster connectivity

### Stage 4: CI/CD Tools Installation (15 minutes)
1. Setup Jenkins worker node
2. Install Docker and Trivy on worker
3. Configure Jenkins master-worker connection
4. Install required Jenkins plugins

### Stage 5: Pipeline Configuration (15 minutes)
1. Create CI pipeline (code → test → build → push)
2. Create CD pipeline (sync → deploy → verify)
3. Configure webhooks and integrations
4. Setup email notifications

### Stage 6: GitOps & Deployment (15 minutes)
1. Install and configure ArgoCD
2. Add EKS cluster to ArgoCD
3. Connect GitHub repository
4. Create ArgoCD applications

### Stage 7: Monitoring & Observability (10 minutes)
1. Install Prometheus stack via Helm
2. Install Grafana for visualization
3. Configure dashboards
4. Setup alerting rules

### Stage 8: Application Deployment (5 minutes)
1. Deploy application via ArgoCD
2. Verify all services are running
3. Test application endpoints
4. Monitor logs and metrics

**Total Time**: ~2-3 hours for complete deployment

## Access Information

After deployment, you'll have access to:

| Service | URL | Credentials |
|---------|-----|-------------|
| Jenkins | `http://<master-ip>:8080` | Initial password from script |
| SonarQube | `http://<master-ip>:9000` | admin / admin (default) |
| ArgoCD | `http://<worker-ip>:<nodeport>` | admin / generated password |
| Prometheus | `http://<worker-ip>:<nodeport>` | No auth |
| Grafana | `http://<worker-ip>:<nodeport>` | admin / admin123 |
| Frontend | `http://<worker-ip>:31100` | None required |
| Backend API | `http://<worker-ip>:31000` | JWT token in header |

## Common Commands

### Jenkins
```bash
# View Jenkins logs
sudo tail -f /var/log/jenkins/jenkins.log

# Restart Jenkins
sudo systemctl restart jenkins

# Get Jenkins initial password
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

### Kubernetes
```bash
# Get all resources
kubectl get all -A

# Check pod status
kubectl get pods -n pulsedesk

# View pod logs
kubectl logs -n pulsedesk <pod-name>

# Describe resource
kubectl describe pod -n pulsedesk <pod-name>

# Port forward to service
kubectl port-forward -n pulsedesk svc/pulsedesk-backend 5000:5000

# Get service details
kubectl get svc -n pulsedesk
```

### Docker
```bash
# List images
docker images

# Build image
docker build -t image-name:tag .

# Run container
docker run -d -p 8080:8080 image-name:tag

# View logs
docker logs <container-id>
```

### EKS
```bash
# Get cluster info
aws eks describe-cluster --name pulsedesk --region us-east-1

# Get nodegroup info
aws eks describe-nodegroup --cluster-name pulsedesk --nodegroup-name pulsedesk-nodegroup --region us-east-1

# Scale nodegroup
eksctl scale nodegroup --cluster pulsedesk --name pulsedesk-nodegroup --nodes 3

# Update cluster
eksctl update cluster --name pulsedesk --version 1.28
```

### ArgoCD
```bash
# Login to ArgoCD
argocd login <server> --username admin

# List applications
argocd app list

# Sync application
argocd app sync pulsedesk-app

# Get application details
argocd app get pulsedesk-app

# View logs
argocd app logs pulsedesk-app
```

## Troubleshooting Guide

### Issue: Jenkins won't start
```bash
sudo systemctl status jenkins
sudo journalctl -u jenkins -n 50
```

### Issue: Pods not starting
```bash
kubectl describe pod <pod-name> -n pulsedesk
kubectl logs <pod-name> -n pulsedesk
```

### Issue: ArgoCD can't sync
```bash
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller
```

### Issue: EKS cluster issues
```bash
aws eks describe-cluster --name pulsedesk --region us-east-1
kubectl get nodes
```

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed troubleshooting.

## Security Considerations

- Change all default credentials immediately
- Enable encryption for EBS volumes
- Use IAM roles instead of access keys
- Implement network policies in Kubernetes
- Regular security updates and patches
- Enable audit logging
- Use RBAC for access control

## Monitoring & Alerts

- **Prometheus**: Collect metrics from all components
- **Grafana**: Visualize metrics and health status
- **Email Notifications**: Configure in Jenkins for pipeline events
- **Kubernetes Events**: Track cluster activities

## Scaling & Performance

- Horizontal Pod Autoscaling (HPA) configured for deployments
- EKS nodegroup can scale from 2 to 3 nodes
- Load balancing across replicas
- Database connection pooling

## Backup & Recovery

- Automated EBS snapshots
- Kubernetes resource backups
- Database backup strategy
- Disaster recovery procedures

See [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) for detailed backup procedures.

## Cost Optimization

- Use on-demand instances for production
- Consider reserved instances for long-term workloads
- Use Spot instances for non-critical workloads
- Implement auto-scaling policies
- Monitor and optimize resource usage

## Cleanup & Removal

To destroy all deployed resources:

```bash
# Delete EKS cluster
eksctl delete cluster --name pulsedesk --region us-east-1

# Terminate EC2 instances
aws ec2 terminate-instances --instance-ids <instance-id> --region us-east-1

# Delete other resources via AWS console
```

## Support & Documentation

- **Jenkins**: https://www.jenkins.io/doc/
- **Kubernetes**: https://kubernetes.io/docs/
- **AWS EKS**: https://docs.aws.amazon.com/eks/
- **ArgoCD**: https://argo-cd.readthedocs.io/
- **Terraform**: https://www.terraform.io/docs/
- **SonarQube**: https://docs.sonarqube.org/
- **Prometheus**: https://prometheus.io/docs/
- **Grafana**: https://grafana.com/docs/

## Contributing

For improvements or issues with the deployment:
1. Test changes in a development environment
2. Document any modifications
3. Update relevant documentation
4. Create pull request with changes

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Getting Help

If you encounter issues:
1. Check the [Troubleshooting Guide](./DEPLOYMENT_GUIDE.md#troubleshooting)
2. Review [Infrastructure Documentation](./INFRASTRUCTURE.md)
3. Check component logs (Jenkins, K8s, Docker)
4. Verify AWS credentials and permissions
5. Ensure all prerequisites are met

---

**Last Updated**: November 2024  
**Deployment Version**: 1.0.0  
**AWS Region**: us-east-1  
**EKS Version**: 1.27+

