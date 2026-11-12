# Setup Required Before Terraform Deployment

**⏱️ Time Required**: 5-10 minutes

Before running `terraform apply`, you must complete these setup steps.

---

## Step 1: Create SSH Key Pair (Required)

Your Terraform configuration requires an SSH key pair to launch EC2 instances.

### Option A: Create via AWS CLI (Recommended)

```bash
# Create key pair in us-east-1
aws ec2 create-key-pair \
  --key-name pulsedesk-key \
  --region us-east-1 \
  --query 'KeyMaterial' \
  --output text > pulsedesk-key.pem

# Set proper permissions (REQUIRED for security)
chmod 600 pulsedesk-key.pem

# Verify key was created
aws ec2 describe-key-pairs --region us-east-1 --query 'KeyPairs[].KeyName'
# Expected output: pulsedesk-key
```

### Option B: Create via AWS Console

1. Go to **EC2 → Key Pairs**
2. Click **Create key pair**
3. Name: `pulsedesk-key`
4. File format: `.pem`
5. Click **Create key pair**
6. Save the file as `pulsedesk-key.pem`
7. Set permissions:
   ```bash
   chmod 600 ~/Downloads/pulsedesk-key.pem
   ```

### Verify Key Pair Exists

```bash
aws ec2 describe-key-pairs \
  --region us-east-1 \
  --key-names pulsedesk-key
```

Expected output:
```json
{
    "KeyPairs": [
        {
            "KeyName": "pulsedesk-key",
            "KeyType": "rsa",
            "CreateTime": "2024-11-12T...",
            "Tags": []
        }
    ]
}
```

---

## Step 2: Create terraform.tfvars (Required)

Terraform needs this file to know your configuration values.

### Copy Example File

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

### Edit terraform.tfvars

```bash
nano terraform.tfvars
# Or: code terraform.tfvars
```

### Configure Values

```hcl
aws_region       = "us-east-1"
instance_type    = "m7i-flex.large"
key_pair_name    = "pulsedesk-key"           # MUST match the key pair you created
allowed_ssh_cidr = "0.0.0.0/0"               # For security, restrict this
```

### ⚠️ IMPORTANT: Never Commit terraform.tfvars

```bash
# Verify it's in .gitignore
grep terraform.tfvars ../.gitignore
# Expected: terraform/*.tfvars

# This file is NOT tracked by git (security)
git status | grep tfvars
# Expected: (nothing)
```

---

## Step 3: Fix IAM Policy Issue

The Terraform file has been updated with correct IAM policies:

### What Was Wrong
```
Error: AttachRolePolicy, NoSuchEntity: 
Policy arn:aws:iam::aws:policy/AmazonEKSFullAccess does not exist
```

### What's Fixed
```hcl
# Correct policies now used:
- AmazonEKSWorkerNodePolicy    (valid)
- AmazonEKS_CNI_Policy          (valid)
- AmazonEC2FullAccess           (valid)
- AWSCloudFormationFullAccess   (valid)
- AmazonEC2ContainerRegistryPowerUser (valid)
- IAMFullAccess                 (valid)
```

**File Updated**: `terraform/main.tf` (lines 199-207)

---

## Step 4: Verify Everything Before Deploy

### Checklist

```bash
# 1. SSH key pair exists
aws ec2 describe-key-pairs --region us-east-1 --key-names pulsedesk-key
# Expected: Success (no error)

# 2. terraform.tfvars exists and is configured
cat terraform/terraform.tfvars | grep key_pair_name
# Expected: key_pair_name = "pulsedesk-key"

# 3. terraform.tfvars is NOT in git
git status | grep tfvars
# Expected: (nothing - not tracked)

# 4. Terraform can read your variables
cd terraform
terraform validate
# Expected: Success

# 5. Terraform plan works
terraform plan
# Expected: Plan: 17 to add (includes new EKS CNI policy)
```

---

## Step 5: Deploy

Once all checks pass:

```bash
# Create plan file
cd terraform
terraform plan -out=tfplan

# Review the plan
terraform show tfplan

# Apply when ready
terraform apply tfplan
```

---

## Troubleshooting

### Error: "The key pair 'pulsedesk-key' does not exist"

**Solution**: Create the key pair first
```bash
aws ec2 create-key-pair --key-name pulsedesk-key --region us-east-1 --query 'KeyMaterial' --output text > pulsedesk-key.pem
chmod 600 pulsedesk-key.pem
```

### Error: "NoSuchEntity: Policy... does not exist"

**Solution**: Already fixed in Terraform code. Run:
```bash
cd terraform
terraform validate
```

### Error: "variables.tf and terraform.tfvars are required"

**Solution**: Create terraform.tfvars
```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars
# Fill in the values
```

### Error: "key_pair_name variable not set"

**Solution**: Ensure terraform.tfvars is in the terraform/ directory
```bash
ls -la terraform/terraform.tfvars
# Should show the file exists
```

---

## Security Considerations

### SSH Key Security
```bash
# Protect your private key
chmod 600 pulsedesk-key.pem

# Never share or commit this file
echo "pulsedesk-key.pem" >> .gitignore
```

### terraform.tfvars Security
```bash
# This file contains sensitive values
# It's in .gitignore and should never be committed
git status | grep tfvars
# Expected: (nothing)

# If accidentally committed, remove from history
git rm --cached terraform/terraform.tfvars
git commit -m "Remove tfvars from tracking"
```

### AWS Credentials
```bash
# Ensure AWS credentials are configured
cat ~/.aws/credentials
# Should have aws_access_key_id and aws_secret_access_key

# Or use SSO
aws sts get-caller-identity
# Should show your AWS account
```

---

## Quick Start Commands (Copy & Paste)

### Step 1: Create SSH Key
```bash
aws ec2 create-key-pair --key-name pulsedesk-key --region us-east-1 --query 'KeyMaterial' --output text > pulsedesk-key.pem && chmod 600 pulsedesk-key.pem
```

### Step 2: Create terraform.tfvars
```bash
cd terraform && cp terraform.tfvars.example terraform.tfvars
```

### Step 3: Edit terraform.tfvars
```bash
# Edit with your editor
nano terraform/terraform.tfvars
```

### Step 4: Validate
```bash
cd terraform && terraform validate && terraform plan
```

### Step 5: Deploy
```bash
cd terraform && terraform plan -out=tfplan && terraform apply tfplan
```

---

## What Gets Created

When you run `terraform apply`, these AWS resources will be created:

### Networking
- VPC (10.0.0.0/16)
- Public Subnet (10.0.1.0/24)
- Internet Gateway
- Route Tables

### Security
- Security Group with all required ports
- IAM Role for Jenkins Worker
- 6 IAM Policy Attachments

### Compute
- Master EC2 Instance (m7i-flex.large)
- Jenkins Worker EC2 Instance (m7i-flex.large)

**Total Resources**: 17

---

## Next Steps After Deployment

Once `terraform apply` completes:

1. **Get outputs**:
   ```bash
   terraform output infrastructure_summary
   ```

2. **SSH into Master**:
   ```bash
   ssh -i pulsedesk-key.pem ec2-user@<master-public-ip>
   ```

3. **Follow deployment guide**:
   ```
   See: docs/DEPLOYMENT_GUIDE.md
   ```

---

**⚠️ CRITICAL**: Do NOT run `terraform apply` until you have completed Steps 1-4 above!

