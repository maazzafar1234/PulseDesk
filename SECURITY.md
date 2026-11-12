# Security Guidelines

This document outlines security best practices and mandatory procedures for this repository.

## ⚠️ CRITICAL: Never Commit Secrets

### What NOT to Commit

❌ **DO NOT** commit any of these to Git:
- Real database passwords (postgres-secrets.yaml)
- Real JWT secrets (app-secrets.yaml)
- AWS credentials or API keys
- Private SSH keys
- OAuth tokens or API keys
- Environment files with production values (.env.production)
- Terraform state files (*.tfstate)

### Secret Files That Are Ignored

The following files are automatically ignored by `.gitignore`:

```
kubernetes/*secrets.yaml           # All secret manifests
kubernetes/app-secrets.yaml        # Specific: JWT secrets
kubernetes/postgres-secrets.yaml   # Specific: DB credentials
terraform/*.tfstate*               # Terraform state (private)
terraform/*.tfvars                 # Terraform variables (private)
.env.production                    # Production environment
.aws/credentials                   # AWS credentials
```

## ✅ Secret Management Strategies

### Strategy 1: Use Example Files (Current Approach)

**For Development/Testing:**

1. **Committed to Git** (public safe):
   ```
   kubernetes/app-secrets.example.yaml
   kubernetes/postgres-secrets.example.yaml
   ```

2. **Before Deployment**, create actual secret files:
   ```bash
   cp kubernetes/app-secrets.example.yaml kubernetes/app-secrets.yaml
   cp kubernetes/postgres-secrets.example.yaml kubernetes/postgres-secrets.yaml
   
   # Edit with real values
   nano kubernetes/app-secrets.yaml
   nano kubernetes/postgres-secrets.yaml
   ```

3. **Never commit** the actual secret files:
   ```bash
   git status
   # app-secrets.yaml and postgres-secrets.yaml should show as ignored
   ```

---

### Strategy 2: AWS Secrets Manager (RECOMMENDED for Production)

**For Production Environments:**

Instead of storing secrets in YAML, use AWS Secrets Manager:

1. **Create secret in AWS:**
   ```bash
   aws secretsmanager create-secret \
     --name pulsedesk/jwt-secret \
     --secret-string "your-actual-jwt-secret-here"
   
   aws secretsmanager create-secret \
     --name pulsedesk/postgres-password \
     --secret-string "your-actual-postgres-password-here"
   ```

2. **Update backend deployment** to retrieve from AWS:
   ```yaml
   # kubernetes/backend-deployment.yaml
   env:
   - name: JWT_SECRET
     valueFrom:
       secretKeyRef:
         name: aws-secretsmanager-secret
         key: jwt-secret
   ```

3. **Install External Secrets Operator:**
   ```bash
   helm repo add external-secrets https://charts.external-secrets.io
   helm install external-secrets \
     external-secrets/external-secrets \
     -n external-secrets-system \
     --create-namespace
   ```

---

### Strategy 3: Kubernetes Sealed Secrets

**For GitOps with Secret Encryption:**

1. **Install Sealed Secrets:**
   ```bash
   kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.18.0/controller.yaml
   ```

2. **Create and Seal Secret:**
   ```bash
   kubectl create secret generic app-secrets \
     --from-literal=jwt-secret="your-jwt-secret" \
     --dry-run=client -o yaml | \
     kubeseal -f - > kubernetes/app-secrets-sealed.yaml
   ```

3. **Commit sealed secret** (safe - encrypted):
   ```bash
   git add kubernetes/app-secrets-sealed.yaml
   git commit -m "Add sealed secrets for JWT"
   ```

---

## 🔐 How to Generate Strong Secrets

### JWT Secret (32+ characters)
```bash
# Linux/Mac
openssl rand -base64 32

# PowerShell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Random -Count 32 | ForEach-Object {[char]$_}) -join ''))

# Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Database Password (16+ characters, mixed)
```bash
# Linux/Mac
openssl rand -base64 16

# PowerShell
-join ((0..15) | ForEach-Object { ([char[]]'!@#$%^&*()-_+=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' | Get-Random) })
```

---

## 📋 Pre-Commit Checklist

Before committing or pushing, run:

```bash
# 1. Check for accidentally staged secrets
git diff --cached --name-only | grep -i secret

# 2. Verify no .env files are staged
git diff --cached --name-only | grep -i "\.env"

# 3. Check for AWS credentials
git diff --cached | grep -i "AKIA"

# 4. Verify Terraform state is ignored
ls -la terraform/*.tfstate* 2>/dev/null | wc -l  # Should be 0 or hidden

# 5. Final safety check
git status | grep -i "secret\|.env\|tfstate"  # Should return nothing
```

**Safe to commit ONLY:**
- `*.example.yaml` files
- Documentation (*.md)
- Source code (client/, server/)
- Configuration templates (without real values)
- Terraform templates (without sensitive data)

---

## 🔍 Git Pre-Commit Hooks (Optional)

Automatically prevent secret commits:

```bash
# Create .git/hooks/pre-commit
#!/bin/bash

# Check for secrets in staged changes
if git diff --cached | grep -iE 'password|secret|token|key|credential' > /dev/null; then
    echo "❌ ERROR: Potential secret detected in staged changes!"
    echo "Please remove secrets before committing."
    exit 1
fi

# Check for terraform state
if git diff --cached --name-only | grep -E '\.tfstate' > /dev/null; then
    echo "❌ ERROR: Terraform state file detected!"
    exit 1
fi

exit 0
```

Make executable:
```bash
chmod +x .git/hooks/pre-commit
```

---

## 🚨 If You Accidentally Committed Secrets

### Immediate Actions

1. **Rotate compromised secrets immediately** (before anything else)

2. **Remove from Git history:**
   ```bash
   # Option 1: Remove file from all commits (DESTRUCTIVE)
   git filter-branch --tree-filter 'rm -f kubernetes/app-secrets.yaml' HEAD
   
   # Option 2: Use BFG Repo-Cleaner (safer)
   bfg --delete-files app-secrets.yaml
   ```

3. **Force push** (if not shared with team):
   ```bash
   git push --force-with-lease origin main
   ```

4. **Notify the team:**
   - Notify about the compromise
   - New secrets must be regenerated
   - Anyone with repo access should rotate credentials

5. **Audit Git logs:**
   ```bash
   # See what was committed
   git log --all --oneline -- kubernetes/app-secrets.yaml
   
   # View content from specific commit
   git show <commit-hash>:kubernetes/app-secrets.yaml
   ```

---

## 🔐 Environment-Specific Secrets

### Development (.env.local - IGNORED)
```bash
JWT_SECRET=dev-secret-only-for-testing
DATABASE_URL=sqlite:./dev.db
POSTGRES_PASSWORD=dev-password
```

### Staging (.env.staging - IGNORED)
```bash
JWT_SECRET=<actual-staging-secret>
DATABASE_URL=postgresql://...
POSTGRES_PASSWORD=<actual-staging-password>
```

### Production (.env.production - IGNORED)
```bash
JWT_SECRET=<actual-production-secret>
DATABASE_URL=postgresql://...
POSTGRES_PASSWORD=<actual-production-password>
```

All environment files are in .gitignore:
```
.env
.env.local
.env.*.local
.env.production
.env.staging
```

---

## 📦 Secret Distribution to Team

### Method 1: Shared Secret Manager
1. Store all secrets in AWS Secrets Manager
2. Team members use `aws secretsmanager get-secret-value`
3. Only JSON content shared, never in Git

### Method 2: Manual Distribution
1. Generate secrets with strong algorithm
2. Share via secure channel (Signal, 1Password, etc.)
3. Team members create local `.env` files
4. Never commit `.env` files

### Method 3: CI/CD Secrets
1. Store secrets in Jenkins credentials
2. Jenkins injects at build time
3. Never stored in code or Git

---

## 🛡️ Security Best Practices

### Kubernetes Secrets
- ❌ Don't rely on base64 encoding (it's not encryption)
- ✅ Use Sealed Secrets or External Secrets for encryption at rest
- ✅ Enable RBAC to limit secret access
- ✅ Audit who accesses secrets

### AWS Credentials
- ❌ Don't use hardcoded AWS keys
- ✅ Use IAM roles for EC2/EKS
- ✅ Use temporary credentials with STS
- ✅ Rotate access keys regularly

### Database Passwords
- ❌ Don't commit to Git
- ✅ Generate with 16+ characters, mixed case
- ✅ Use AWS RDS managed passwords
- ✅ Rotate quarterly

### JWT Secrets
- ❌ Don't use simple passwords
- ✅ Use 32+ character random strings
- ✅ Rotate if compromised
- ✅ Use different secrets per environment

---

## 🔄 Secret Rotation Schedule

| Secret Type | Rotation Frequency | When to Rotate |
|-------------|-------------------|-----------------|
| JWT Secret | Quarterly | If leaked or on schedule |
| DB Password | Quarterly | If leaked or on schedule |
| AWS Access Keys | Quarterly | If leaked or on schedule |
| GitHub Tokens | Semi-annually | If leaked or on schedule |
| SSL Certificates | Annually | Before expiration |

---

## 📝 Audit Logging

### Enable Git Audit
```bash
# See who accessed secrets
git log --all --grep="secret"

# Check commits by author
git log --author="username" --all

# Full history with changes
git log -p -- kubernetes/app-secrets.yaml
```

### Enable Kubernetes Audit
```bash
# Check secret access logs
kubectl get events -n pulsedesk -w

# View audit logs
kubectl logs -n kube-system -l component=kube-apiserver
```

---

## 🚀 CI/CD Secret Injection

### Jenkins
```groovy
pipeline {
    environment {
        JWT_SECRET = credentials('jwt-secret-production')
        DB_PASSWORD = credentials('db-password-production')
    }
    
    stages {
        stage('Deploy') {
            steps {
                sh 'echo $JWT_SECRET' // Never print secrets!
            }
        }
    }
}
```

### GitHub Actions
```yaml
name: Deploy

on: [push]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: production
    steps:
      - uses: actions/checkout@v3
      - run: |
          export JWT_SECRET=${{ secrets.JWT_SECRET }}
          export DB_PASSWORD=${{ secrets.DB_PASSWORD }}
```

---

## ✅ Security Verification

Run this before each commit:

```bash
#!/bin/bash
echo "🔐 Running security checks..."

# 1. Check for common secret patterns
echo "Checking for secrets..."
if git diff HEAD | grep -iE '(password|secret|token|key|credential)' > /dev/null; then
    echo "⚠️  Warning: Potential secrets detected"
    exit 1
fi

# 2. Check file sizes (large files might contain secrets)
echo "Checking file sizes..."
git diff --cached --name-only | while read file; do
    size=$(wc -c < "$file" 2>/dev/null)
    if [ "$size" -gt 1000000 ]; then
        echo "⚠️  Warning: Large file detected: $file"
    fi
done

# 3. Verify example files exist
echo "Verifying example files..."
if [ ! -f "kubernetes/app-secrets.example.yaml" ]; then
    echo "❌ Missing kubernetes/app-secrets.example.yaml"
    exit 1
fi

echo "✅ Security checks passed!"
```

---

## 📞 Security Incident Response

If secrets are compromised:

1. **Immediately rotate** all affected secrets
2. **Revoke** any exposed credentials
3. **Check logs** for unauthorized access
4. **Notify team** of the incident
5. **Update** security procedures
6. **Document** what happened and how to prevent it

---

## Additional Resources

- [Git Secret Management](https://git-secret.io/)
- [Kubernetes Secrets Documentation](https://kubernetes.io/docs/concepts/configuration/secret/)
- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)
- [OWASP: Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [Sealed Secrets GitHub](https://github.com/bitnami-labs/sealed-secrets)

---

**Version**: 1.0  
**Last Updated**: November 2024  
**Compliance**: Mandatory for all contributors

