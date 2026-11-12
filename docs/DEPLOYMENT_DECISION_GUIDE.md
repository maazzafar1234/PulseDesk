# Deployment Architecture Decision Guide

## Single Source of Truth for Infrastructure

This guide clarifies which approach to use for infrastructure provisioning and eliminates conflicts between Terraform and shell scripts.

---

## Decision Matrix

### ✅ **RECOMMENDED: Terraform as Single Source of Truth**

Use this approach for:
- Production deployments
- Infrastructure that needs to be versioned and reviewed
- Teams with IaC experience
- Environments requiring state management

**Files to Use:**
```
terraform/
  ├── main.tf              (AWS VPC, EC2, IAM, security groups)
  ├── variables.tf         (Customizable inputs)
  └── outputs.tf           (Infrastructure summary)
```

**What Terraform Handles:**
- VPC and networking setup
- Security groups with all required ports
- IAM roles and policies
- Master EC2 instance provisioning
- Jenkins Worker EC2 instance with IAM role
- Outputs (IPs, URLs, credentials)

**What You Do Manually After Terraform:**
- SSH into instances
- Run kubeadm or use managed EKS
- Install applications
- Configure Jenkins

**Command Flow:**
```bash
cd terraform
terraform init
terraform plan
terraform apply
terraform output
# Then manually install Kubernetes, Jenkins, etc.
```

---

### ⚠️ **DEPRECATED: Automations Scripts (Kept for Reference)**

The shell scripts in `Automations/` are kept for **learning purposes only** but should NOT be used alongside Terraform.

**Why They Conflict:**
- `setup-master.sh` and `setup-worker.sh` assume self-managed infrastructure
- `create-eks-cluster.sh` duplicates Terraform's EC2 provisioning
- Managing both Terraform and shell scripts creates state drift

**When to Use Scripts:**
- Learning and understanding deployment steps
- Quick manual setup for lab environments
- Prototyping before IaC

**Scripts to Keep (for reference):**
- `Automations/setup-master.sh` - Shows what to install on master
- `Automations/setup-worker.sh` - Shows what to install on worker
- `Automations/create-eks-cluster.sh` - Shows EKS cluster creation steps

**Scripts to Replace:**
- Do NOT use Terraform + shell scripts together
- Choose ONE approach per environment

---

## Implementation Paths

### **Path A: Full Infrastructure as Code (RECOMMENDED)**

```
Step 1: Use Terraform
  terraform apply
  └─ Creates VPC, security groups, EC2 instances, IAM roles

Step 2: Manual Post-Deployment
  SSH into master → Install Docker, Jenkins, eksctl, kubectl
  SSH into worker → Install Docker, Java, Trivy
  Use eksctl or manually create EKS cluster

Step 3: Deploy Application
  kubectl apply -f kubernetes/
  ArgoCD handles continuous deployment
```

**Files Used:**
- `terraform/**` (for infrastructure)
- Kubernetes manifests manually applied or via ArgoCD

---

### **Path B: Manual Bash Scripts (Learning Only)**

```
Step 1: Manually create EC2 instances via AWS Console
  - Create security groups
  - Launch Master instance (m7i-flex.large)
  - Launch Worker instance (m7i-flex.large)
  - Attach IAM role to worker

Step 2: Run shell scripts for software installation
  bash setup-master.sh
  bash setup-worker.sh
  bash create-eks-cluster.sh

Step 3: Deploy Application
  ArgoCD or kubectl apply
```

**Files Used:**
- `Automations/setup-master.sh`
- `Automations/setup-worker.sh`
- `Automations/create-eks-cluster.sh`

**Not Recommended For:**
- Production deployments
- Team collaboration
- Infrastructure versioning

---

## Critical Rules

### ✋ **NEVER DO THIS:**

```bash
# ❌ WRONG: Mixing Terraform and shell scripts
terraform apply                    # Creates EC2 instances
bash Automations/setup-master.sh   # Tries to create instances again
bash create-eks-cluster.sh         # Duplicates EKS creation
# Result: Conflicts, state drift, failed deployments
```

### ✅ **DO THIS INSTEAD:**

**Option 1: Pure Terraform (Recommended)**
```bash
# ✅ CORRECT: Terraform for infrastructure
cd terraform
terraform init && terraform apply
# Then manually SSH and install software
```

**Option 2: Pure Bash Scripts**
```bash
# ✅ CORRECT: Manual AWS + bash scripts
# Manually create EC2 instances
cd Automations
bash setup-master.sh
bash setup-worker.sh
```

---

## Architecture Comparison

| Aspect | Terraform | Bash Scripts |
|--------|-----------|--------------|
| **Infrastructure Version Control** | ✅ Yes (Git tracked) | ❌ No |
| **State Management** | ✅ tfstate file | ❌ Manual tracking |
| **Reproducibility** | ✅ Identical every time | ⚠️ Depends on environment |
| **Production Ready** | ✅ Yes | ⚠️ For learning only |
| **Team Collaboration** | ✅ Excellent | ⚠️ Limited |
| **Rollback Capability** | ✅ Yes (terraform destroy) | ❌ Manual |
| **Learning Curve** | ⚠️ Medium | ✅ Easy |
| **Destroy Infrastructure** | ✅ One command | ❌ Manual AWS Console |

---

## Recommended Workflow

### **For Production/Professional Environments:**

```
1. Use Terraform to provision all AWS infrastructure
   └─ terraform/ folder is source of truth

2. Manual configuration after Terraform:
   └─ SSH → Install Docker, Jenkins, EKS tools

3. Application deployment via ArgoCD:
   └─ kubernetes/ folder tracked in Git
   └─ ArgoCD syncs automatically from repo

4. Manage everything as code:
   └─ terraform/ (infrastructure)
   └─ kubernetes/ (application)
   └─ GitOps/ (pipelines)
```

**Git Structure:**
```
Repository Root/
├── terraform/              (Infrastructure as Code)
├── kubernetes/             (Application manifests)
├── GitOps/                 (Pipeline definitions)
├── client/                 (Frontend app)
├── server/                 (Backend app)
└── docs/                   (Documentation)
```

### **For Learning/Quick Start:**

```
1. Use bash scripts to understand deployment steps
2. Modify variables in scripts for your environment
3. Deploy manually via AWS Console + scripts
4. Once comfortable, convert to Terraform
```

---

## Migration Path

If you started with bash scripts and want to move to Terraform:

```
1. Export current AWS infrastructure state
   aws ec2 describe-instances --region us-east-1 > infrastructure.json

2. Write Terraform to match current state
   terraform import aws_instance.master <instance-id>
   terraform import aws_security_group.pulsedesk <sg-id>

3. Test Terraform plan matches current resources
   terraform plan (should show no changes)

4. Destroy old resources and recreate via Terraform
   terraform destroy  # Removes resources
   terraform apply    # Recreates them identically
```

---

## Quick Decision Tree

```
┌─ Do you want version-controlled infrastructure?
│  ├─ YES → Use Terraform
│  └─ NO  → Use bash scripts
│
└─ Is this for production?
   ├─ YES → Use Terraform
   └─ NO  → Bash scripts OK for learning
```

---

## File Management

### **Files to Keep:**

✅ `terraform/` - Full IaC definition  
✅ `kubernetes/` - Application manifests  
✅ `GitOps/` - Pipeline definitions  
✅ `Automations/` - Scripts for reference/learning  

### **Files to Remove from Future Deployments:**

⚠️ Don't create duplicate provisioning files  
⚠️ Don't mix Terraform and shell provisioning scripts  
⚠️ Don't manually create resources if using Terraform  

---

## Environment Variables & Customization

### **With Terraform:**
Update `terraform/variables.tf` before deployment:
```hcl
variable "aws_region" {
  default = "us-east-1"
}

variable "instance_type" {
  default = "m7i-flex.large"
}
```

### **With Bash Scripts:**
Update variables in script headers:
```bash
CLUSTER_NAME="pulsedesk"
REGION="us-east-1"
NODE_TYPE="m7i-flex.large"
```

---

## Troubleshooting Conflicts

**Issue: Terraform says instance exists but shell script fails**
```
Cause: Both Terraform and shell script try to create same resource
Fix: Choose ONE approach per environment
   - Delete terraform.tfstate if using scripts
   - Destroy instances if switching from scripts to Terraform
```

**Issue: State drift between Terraform and reality**
```
Cause: Manual changes made outside Terraform
Fix: Either
   - Terraform destroy + reapply, or
   - Terraform import to sync state, or
   - Use terraform refresh to update state
```

---

## Summary

| Use Case | Tool | Command |
|----------|------|---------|
| Production deployment | Terraform | `terraform apply` |
| Learning steps | Bash scripts | `bash setup-master.sh` |
| Quick lab environment | Bash scripts | `bash setup-*.sh` |
| Infrastructure versioning | Terraform | `git + terraform` |
| Team CI/CD | Terraform + ArgoCD | `terraform apply + kubectl` |

---

**Golden Rule**: Choose **ONE** infrastructure provisioning method per environment.  
**Never** use Terraform and bash provisioning scripts together.

