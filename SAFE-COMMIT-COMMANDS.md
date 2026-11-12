# Safe Commit Commands - Step by Step

**⏱️ Time: 5 minutes**

This document provides the exact, copy-paste commands to safely commit and push your code.

## Step 1: Verify Repository Status (1 minute)

```bash
# Check current branch
git branch
# Expected: * main

# Check repository status
git status
# Expected: On branch main, nothing to commit, working tree clean
# OR: On branch main with changes to commit

# List all files that will be committed
git add .
git diff --cached --name-only | sort
```

## Step 2: Run Pre-Commit Security Check (2 minutes)

**CRITICAL: Do NOT skip this step**

```bash
# PowerShell
Write-Host "🔒 Running security checks..."

# Check 1: Look for secrets in staged files
$secrets = git diff --cached | Select-String -Pattern "password|secret|token|AKIA|api.key" -CaseSensitive
if ($secrets) {
    Write-Host "❌ FAIL: Secrets detected in staged changes!" -ForegroundColor Red
    Write-Host "Secrets found:" -ForegroundColor Red
    $secrets
    Write-Host ""
    Write-Host "ABORT commit! Remove secrets before proceeding." -ForegroundColor Red
    Write-Host "Run: git reset HEAD <filename>" -ForegroundColor Yellow
    exit 1
}

# Check 2: Look for .env files
$env_files = git diff --cached --name-only | Select-String -Pattern "\.env"
if ($env_files) {
    Write-Host "❌ FAIL: Environment files detected!" -ForegroundColor Red
    $env_files
    exit 1
}

# Check 3: Look for terraform state
$tfstate = git diff --cached --name-only | Select-String -Pattern "\.tfstate"
if ($tfstate) {
    Write-Host "❌ FAIL: Terraform state files detected!" -ForegroundColor Red
    $tfstate
    exit 1
}

# Check 4: Verify example files exist
$examples = @(
    "kubernetes/app-secrets.example.yaml",
    "kubernetes/postgres-secrets.example.yaml"
)

foreach ($file in $examples) {
    if (-not (Test-Path $file)) {
        Write-Host "⚠️  WARNING: Missing $file" -ForegroundColor Yellow
    }
}

Write-Host "✅ All security checks passed!" -ForegroundColor Green
```

## Step 3: Review Files to Be Committed (1 minute)

```bash
# List all files that will be committed
Write-Host "Files to be committed:" -ForegroundColor Cyan
git diff --cached --name-only | Sort-Object | ForEach-Object {
    Write-Host "  ✓ $_" -ForegroundColor Green
}

Write-Host ""
Write-Host "File count: $(git diff --cached --name-only | Measure-Object -Line | Select-Object -ExpandProperty Lines) files" -ForegroundColor Cyan

# Show only summary (not full diffs)
Write-Host ""
Write-Host "Verification:" -ForegroundColor Cyan
Write-Host "  ✓ No app-secrets.yaml (should be ignored)" -ForegroundColor Green
Write-Host "  ✓ No postgres-secrets.yaml (should be ignored)" -ForegroundColor Green
Write-Host "  ✓ No .env files (should be ignored)" -ForegroundColor Green
Write-Host "  ✓ No .tfstate files (should be ignored)" -ForegroundColor Green
Write-Host "  ✓ Example files included (safe)" -ForegroundColor Green
```

## Step 4: Commit Changes

```bash
# Set git config (one-time setup)
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Stage all changes
git add .

# Commit with descriptive message
git commit -m "feat(deployment): Add complete CI/CD infrastructure with Terraform, Jenkins, Kubernetes, and monitoring

- Add Terraform IaC for AWS infrastructure (VPC, EC2, IAM, security groups)
- Add Jenkins CI/CD pipelines (2 pipelines: CI and CD)
- Add complete Kubernetes manifests for EKS deployment
- Add Prometheus and Grafana monitoring setup via Helm
- Add ArgoCD configuration for GitOps workflow
- Add comprehensive security guidelines and pre-commit checks
- Add customization guide for Kubernetes manifests
- Organize documentation into docs/ directory for clarity
- Add secret management best practices
- Add implementation checklist (120 verification points)
- Add deployment decision guide (Terraform vs bash scripts)

SECURITY:
- No secrets committed (all secrets in .gitignore)
- Example files provided for secret creation
- Comprehensive .gitignore rules for sensitive files
- Pre-commit security checklist documented

Breaking: Documentation moved from root to docs/ directory"

# Verify commit was created
Write-Host "Commit created:" -ForegroundColor Green
git log --oneline -1
```

## Step 5: Verify Commit Content

```bash
# Show what was committed
Write-Host "Files in this commit:" -ForegroundColor Cyan
git log -1 --name-status | head -20

# Verify no secrets in commit
Write-Host ""
Write-Host "Verifying no secrets in commit..." -ForegroundColor Cyan
$secrets_in_commit = git show --name-only | Select-String -Pattern "password|secret|AKIA" -CaseSensitive
if ($secrets_in_commit) {
    Write-Host "❌ ABORT: Secrets found in commit!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ No secrets found in commit" -ForegroundColor Green
```

## Step 6: Push to Remote Repository

```bash
# Check what will be pushed
Write-Host "Checking what will be pushed..." -ForegroundColor Cyan
git log --oneline origin/main..HEAD
# Should show only 1 commit

# Push to main branch
Write-Host ""
Write-Host "Pushing to repository..." -ForegroundColor Cyan
git push origin main

# Verify push succeeded
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Push successful!" -ForegroundColor Green
} else {
    Write-Host "❌ Push failed!" -ForegroundColor Red
    exit 1
}
```

## Step 7: Verify on GitHub

```bash
# Confirm push is complete
git log --oneline -3

# Provide feedback
Write-Host ""
Write-Host "✅ Commit successfully pushed to GitHub!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Visit your repository on GitHub"
Write-Host "2. Verify latest commit appears with correct files"
Write-Host "3. Confirm NO secret files are visible"
Write-Host "4. Check that example files are present"
Write-Host ""
Write-Host "Repository URL:" -ForegroundColor Cyan
Write-Host "https://github.com/YOUR_USERNAME/pulsedesk"
```

---

## All Commands In One Block (Copy & Paste)

```powershell
# 1. Stage all changes
git add .

# 2. Verify nothing suspicious
git status

# 3. Final security check
$issues = git diff --cached | Select-String -Pattern "password|secret|token|AKIA" -CaseSensitive
if ($issues) {
    Write-Host "ABORT: Secrets detected!" -ForegroundColor Red
    exit 1
}

# 4. Commit
git commit -m "feat(deployment): Add complete CI/CD infrastructure with Terraform, Jenkins, Kubernetes

- Add Terraform IaC for AWS infrastructure
- Add Jenkins CI/CD pipelines (CI and CD)
- Add complete Kubernetes manifests for EKS deployment
- Add Prometheus and Grafana monitoring via Helm
- Add ArgoCD configuration for GitOps
- Add security guidelines and pre-commit checks
- Add customization guide for Kubernetes
- Organize documentation into docs/ directory
- Add secret management best practices
- Add 120-point implementation checklist
- Add deployment decision guide

SECURITY:
- No secrets committed (all in .gitignore)
- Example files provided for secret creation
- Comprehensive .gitignore rules
- Pre-commit security checklist documented"

# 5. Verify commit
git log --oneline -1

# 6. Push
git push origin main

# 7. Confirm
Write-Host "✅ Successfully pushed to GitHub!" -ForegroundColor Green
```

---

## Troubleshooting: If Something Goes Wrong

### Issue: "Permission denied" or "Authentication failed"

```bash
# Check SSH key (or use HTTPS)
ssh -T git@github.com

# If SSH doesn't work, use HTTPS instead
git remote set-url origin https://github.com/YOUR_USERNAME/pulsedesk.git
git push origin main
```

### Issue: "fatal: 'origin' does not appear to be a 'git' repository"

```bash
# List current remotes
git remote -v

# If empty, add remote
git remote add origin https://github.com/YOUR_USERNAME/pulsedesk.git

# Then push
git push -u origin main
```

### Issue: "Your branch is ahead by X commits"

This is normal after committing. Just push:
```bash
git push origin main
```

### Issue: Rejected push (someone pushed first)

```bash
# Pull latest changes
git pull origin main

# Resolve any conflicts if they exist
# Then push again
git push origin main
```

### Issue: "Changes not staged for commit"

Some files need to be staged:
```bash
# Stage everything
git add .

# Then commit
git commit -m "message"

# Then push
git push origin main
```

---

## Final Safety Check Before Pushing

Copy this command and run EXACTLY as shown:

```powershell
# FINAL SAFETY CHECK
Write-Host "════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "        FINAL SAFETY CHECK BEFORE PUSH" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# 1. Check for secrets in commits
Write-Host "1. Checking for secrets in staged commits..." -ForegroundColor Yellow
$secrets = git diff HEAD | Select-String -Pattern "password|secret|token|api.key|AKIA" -CaseSensitive
if ($secrets) {
    Write-Host "   ❌ SECRETS FOUND! ABORT PUSH!" -ForegroundColor Red
    $secrets
    exit 1
} else {
    Write-Host "   ✅ No secrets found" -ForegroundColor Green
}

# 2. Check for env files
Write-Host "2. Checking for .env files..." -ForegroundColor Yellow
$envs = git diff --cached --name-only | Select-String "\.env"
if ($envs) {
    Write-Host "   ❌ .env files found! ABORT PUSH!" -ForegroundColor Red
    exit 1
} else {
    Write-Host "   ✅ No .env files" -ForegroundColor Green
}

# 3. Check for tfstate
Write-Host "3. Checking for Terraform state files..." -ForegroundColor Yellow
$tfstate = git diff --cached --name-only | Select-String "\.tfstate"
if ($tfstate) {
    Write-Host "   ❌ .tfstate files found! ABORT PUSH!" -ForegroundColor Red
    exit 1
} else {
    Write-Host "   ✅ No .tfstate files" -ForegroundColor Green
}

# 4. Count files
Write-Host "4. Counting files to push..." -ForegroundColor Yellow
$count = git log --oneline origin/main..HEAD | Measure-Object -Line | Select-Object -ExpandProperty Lines
Write-Host "   ℹ️  $count commit(s) to push" -ForegroundColor Green

# 5. Show files
Write-Host "5. Files in commit:" -ForegroundColor Yellow
git log -1 --name-status --pretty="" | ForEach-Object {
    if ($_ -match "^[A-Z]") {
        Write-Host "   ✅ $_" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "════════════════════════════════════════════" -ForegroundColor Green
Write-Host "          ✅ SAFE TO PUSH!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "Run: git push origin main" -ForegroundColor Cyan
```

---

## After Successful Push

```bash
# Verify on GitHub
Write-Host "✅ Push Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Visit: https://github.com/YOUR_USERNAME/pulsedesk/commits/main" -ForegroundColor Cyan
Write-Host ""
Write-Host "You should see:" -ForegroundColor Yellow
Write-Host "  ✓ Latest commit with your message"
Write-Host "  ✓ All files visible in file list"
Write-Host "  ✓ NO secret files (app-secrets.yaml, postgres-secrets.yaml)"
Write-Host "  ✓ Example files present (app-secrets.example.yaml, etc.)"
Write-Host "  ✓ docs/ directory with all documentation"
Write-Host "  ✓ kubernetes/ directory with manifests"
Write-Host "  ✓ terraform/ directory with IaC"
```

---

**Version**: 1.0  
**Last Updated**: November 2024  
**Critical**: Follow these commands exactly to ensure security

