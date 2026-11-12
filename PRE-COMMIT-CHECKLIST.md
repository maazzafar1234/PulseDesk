# Pre-Commit Security Checklist

**⏱️ Time to complete: 2-3 minutes**

Run this checklist BEFORE every `git commit` and `git push`.

## ✅ Step 1: Verify .gitignore is Correct (30 seconds)

```powershell
# Verify secrets are ignored
git status | Select-String -Pattern "secret"

# Expected output: (nothing - no secrets should appear)
```

**What to check:**
- [ ] No `app-secrets.yaml` in `git status` output
- [ ] No `postgres-secrets.yaml` in `git status` output
- [ ] No `.env.production` in output
- [ ] No `.tfstate` files in output

If any secrets appear in `git status`, **STOP** and fix before continuing:
```powershell
# Remove from staging if accidentally added
git reset HEAD kubernetes/app-secrets.yaml
git reset HEAD kubernetes/postgres-secrets.yaml

# Verify they're in .gitignore
Get-Content .gitignore | Select-String -Pattern "*secrets"
```

---

## ✅ Step 2: Check for Credential Strings (1 minute)

```powershell
# Search for common secret patterns in staged files
git diff --cached | Select-String -Pattern "password|secret|token|key|credential|AKIA" -CaseSensitive

# Expected output: (nothing - no credentials should be found)
```

**What to check:**
- [ ] No hardcoded passwords found
- [ ] No JWT secrets found
- [ ] No AWS access keys (AKIA...) found
- [ ] No API tokens found

If credentials found:
```powershell
# View what's being staged
git diff --cached --name-only

# Remove problematic files
git reset HEAD <filename>

# Fix the file (remove credentials)
# Then re-add only safe changes
```

---

## ✅ Step 3: Verify Placeholder Values are Removed (1 minute)

Kubernetes manifests should have placeholders replaced:

```powershell
# Check for unfinished placeholders
Get-ChildItem -Path "kubernetes" -Filter "*.yaml" -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match "your-username|your-dockerhub|CHANGE_ME|changeme" -and $_.Name -notmatch "example") {
        Write-Host "⚠️  $($_.Name) contains placeholder values!"
    }
}
```

**What to check:**
- [ ] No `your-username` in manifests
- [ ] No `your-dockerhub-username` in manifests  
- [ ] No `CHANGE_ME` strings in actual (non-example) files
- [ ] Docker image URIs are complete and valid

**Note:** Example files can have CHANGE_ME placeholders - these are safe.

If placeholders found, fix before committing:
```powershell
# Update image URIs
(Get-Content kubernetes/backend-deployment.yaml) -replace 'your-dockerhub-username', 'myusername' | 
    Set-Content kubernetes/backend-deployment.yaml
```

---

## ✅ Step 4: Verify Example Files Exist (30 seconds)

```powershell
# Check that safe example files exist
$examples = @(
    "kubernetes/app-secrets.example.yaml",
    "kubernetes/postgres-secrets.example.yaml"
)

foreach ($file in $examples) {
    if (Test-Path $file) {
        Write-Host "✅ $file exists"
    } else {
        Write-Host "❌ MISSING: $file"
    }
}
```

**What to check:**
- [ ] `kubernetes/app-secrets.example.yaml` exists
- [ ] `kubernetes/postgres-secrets.example.yaml` exists

If missing, create them (safe to commit):
```bash
# Create from current secret files, removing values
cp kubernetes/app-secrets.yaml kubernetes/app-secrets.example.yaml
# Then edit to replace real values with "CHANGE_ME_..."
nano kubernetes/app-secrets.example.yaml
```

---

## ✅ Step 5: Check Documentation Structure (30 seconds)

```powershell
# Verify docs/ folder exists
if (Test-Path "docs") {
    Write-Host "✅ docs/ folder exists"
    Get-ChildItem docs/ | Write-Host
} else {
    Write-Host "❌ MISSING: docs/ folder"
}
```

**What to check:**
- [ ] `docs/` folder exists
- [ ] Documentation files are in `docs/`, not root
- [ ] Root has only `README.md` (no extra `.md` files)

---

## ✅ Step 6: Verify Terraform State is Ignored (30 seconds)

```powershell
# Check for terraform state files (should NOT exist or be ignored)
Get-ChildItem -Path "terraform" -Include "*.tfstate*" -ErrorAction SilentlyContinue | 
    ForEach-Object {
        Write-Host "⚠️  WARNING: Unignored Terraform state file: $($_.Name)"
    }

# Verify .gitignore has terraform rules
Get-Content .gitignore | Select-String -Pattern "terraform.*tfstate"
```

**What to check:**
- [ ] No `terraform.tfstate` files visible
- [ ] No `terraform.tfstate.backup` files visible
- [ ] No `*.tfstate.d/` directories visible
- [ ] `.gitignore` contains terraform state rules

---

## ✅ Step 7: Run Final Safety Check (30 seconds)

```powershell
# Final comprehensive check
Write-Host "Running final safety checks..."

# 1. No secrets in changes
$secrets_found = git diff --cached | Select-String -Pattern "password|secret|token|api.key|AKIA" -CaseSensitive
if ($secrets_found) {
    Write-Host "❌ FAIL: Secrets detected in staged changes!"
    exit 1
}

# 2. No .env files
$env_files = git diff --cached --name-only | Select-String -Pattern "\.env"
if ($env_files) {
    Write-Host "❌ FAIL: Environment files detected!"
    exit 1
}

# 3. No tfstate files
$tfstate = git diff --cached --name-only | Select-String -Pattern "\.tfstate"
if ($tfstate) {
    Write-Host "❌ FAIL: Terraform state files detected!"
    exit 1
}

# 4. Check docs folder structure
if (-not (Test-Path "docs")) {
    Write-Host "⚠️  WARNING: docs/ folder not found"
}

Write-Host "✅ All safety checks passed!"
```

---

## ✅ Step 8: Review What You're About to Commit

```powershell
# Show what will be committed
Write-Host "Files to be committed:"
git diff --cached --name-only | Sort-Object | ForEach-Object { Write-Host "  $_" }

Write-Host ""
Write-Host "File count: $(git diff --cached --name-only | Measure-Object -Line | Select-Object -ExpandProperty Lines)"
```

**What to check:**
- [ ] Only intended files are listed
- [ ] No secret files listed
- [ ] No `.tfstate` files listed
- [ ] No `.env` files listed

---

## ✅ Step 9: Commit With Safe Message

```powershell
# Stage changes
git add .

# Verify what's staged (final check)
git status

# Commit with descriptive message
git commit -m "feat(deployment): add Kubernetes manifests, Jenkins pipelines, and documentation"

# Verify commit was created
git log --oneline -1
```

---

## ✅ Step 10: Verify Before Push

```powershell
# Check local commits not yet pushed
git log --oneline origin/main..HEAD

# View file changes in commits
git log --name-status origin/main..HEAD

# FINAL CHECK: Does it contain secrets?
git log -p origin/main..HEAD | Select-String -Pattern "password|secret|AKIA" -CaseSensitive
if ($?) {
    Write-Host "❌ ABORT: Secrets found in commits!"
    git reset --soft origin/main
    exit 1
} else {
    Write-Host "✅ Safe to push"
}
```

---

## 🚀 Safe Push

```powershell
# Push to repository (only after all checks pass)
git push origin main

# Verify push succeeded
git log --oneline -5
Write-Host "✅ Successfully pushed to remote"

# Final verification on GitHub
Write-Host "Verify on GitHub:"
Write-Host "  1. Visit: https://github.com/YOUR_USERNAME/pulsedesk"
Write-Host "  2. Check recent commits"
Write-Host "  3. Verify NO secret files in repository"
```

---

## ⚠️ If You Pushed Secrets Accidentally

**IMMEDIATE ACTIONS:**

1. **Notify security team immediately**

2. **Rotate compromised secrets:**
   ```bash
   # Generate new JWT
   openssl rand -base64 32
   
   # Generate new DB password
   openssl rand -base64 16
   
   # Update in AWS Secrets Manager or deployment
   ```

3. **Remove from history:**
   ```bash
   # Option 1: Rewrite history (DESTRUCTIVE)
   git filter-branch --tree-filter 'rm -f kubernetes/app-secrets.yaml' -- --all
   git push --force origin main
   
   # Option 2: Use BFG cleaner (safer)
   bfg --delete-files app-secrets.yaml
   git push --force origin main
   ```

4. **Mark repository as compromised:**
   - Update repository security warnings
   - Notify all team members
   - Consider forced password rotations

---

## 📋 Quick Reference Checklist

Print this for quick verification:

```
☐ Secrets ignored by git? (no app-secrets.yaml in git status)
☐ No credential strings in diffs? (no password/token/key patterns)
☐ Example files exist? (app-secrets.example.yaml, etc.)
☐ Documentation in docs/ folder?
☐ Terraform state ignored? (no .tfstate files)
☐ Placeholder values removed? (no CHANGE_ME strings)
☐ All checks passed? (final safety check runs clean)
☐ Files to commit look right? (git status review)
☐ Commit message is descriptive?
☐ Ready to push? (verified no secrets in commits)
```

---

## 🤖 Automated Verification Script

Save as `pre-commit-check.ps1`:

```powershell
param(
    [switch]$Strict
)

$errors = @()
$warnings = @()

# Check 1: Secrets
$secrets = git diff --cached | Select-String -Pattern "password|secret|token|AKIA"
if ($secrets) {
    $errors += "Secrets detected in staged changes"
}

# Check 2: Environment files
$env = git diff --cached --name-only | Select-String -Pattern "\.env"
if ($env) {
    $errors += "Environment files detected"
}

# Check 3: Terraform state
$tfstate = git diff --cached --name-only | Select-String -Pattern "\.tfstate"
if ($tfstate) {
    $errors += "Terraform state files detected"
}

# Check 4: Examples exist
if (-not (Test-Path "kubernetes/app-secrets.example.yaml")) {
    $warnings += "Missing kubernetes/app-secrets.example.yaml"
}

# Report
if ($errors.Count -gt 0) {
    Write-Host "❌ ERRORS:" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "  - $_" }
    exit 1
}

if ($warnings.Count -gt 0) {
    Write-Host "⚠️  WARNINGS:" -ForegroundColor Yellow
    $warnings | ForEach-Object { Write-Host "  - $_" }
    if ($Strict) { exit 1 }
}

Write-Host "✅ All checks passed!" -ForegroundColor Green
exit 0
```

Run before commit:
```powershell
.\pre-commit-check.ps1 -Strict
```

---

**Version**: 1.0  
**Last Updated**: November 2024  
**Mandatory**: YES - Follow before every commit

