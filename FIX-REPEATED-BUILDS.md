# Fix Repeated Builds - Stop Build Loop

## Problem

Your builds are succeeding ✅ but running too frequently:
- Build #16 (20:05)
- Build #15 (20:04)
- Build #14 (20:04)
- Build #13 (20:02)

All within minutes of each other.

## Root Causes

### 1. **Git Push Loop** (Most Likely Culprit)
Your pipeline commits changes to Git:
```groovy
stage('Commit & Push to Git') {
    git add kubernetes/
    git commit -m "Update container images - Build #${BUILD_NUMBER}"
    git push ...
}
```

**Problem:** Git push → GitHub webhook triggers → New build → Git push again → Infinite loop!

### 2. **Multiple Trigger Sources Active**
Possible triggers configured simultaneously:
- ✅ GitHub webhook (on push)
- ✅ Poll SCM (continuously checking for changes)
- ✅ Manual trigger (you clicking Build Now)

All of these combined create rapid-fire builds.

### 3. **No Build Prevention for Git Commits**
When Jenkins commits to Git, it triggers itself because:
- Jenkins modifies kubernetes/ manifests
- Commits and pushes changes
- GitHub webhook detects the push
- Triggers another build
- Repeat...

---

## Solution

### Option A: Disable All Automatic Triggers (Simplest)

#### In Jenkins Job Configuration:

1. Go to: **Jenkins → PulseDesk-CI → Configure**

2. Find: **Build Triggers**

3. **Uncheck ALL of these:**
   - ☐ GitHub hook trigger for GITScm polling
   - ☐ Poll SCM
   - ☐ Build periodically
   - ☐ Trigger builds remotely

4. Keep **only manual triggers** or use **manual "Build Now"**

5. Click **Save**

**Result:** Builds only run when YOU click "Build Now"

**Pros:**
- ✅ No infinite loops
- ✅ Simple and clear
- ✅ You have full control

**Cons:**
- ❌ Need to trigger manually
- ❌ No automatic deploys

---

### Option B: Keep GitHub Webhook, Disable Poll SCM (Recommended)

#### Step 1: Configure GitHub Webhook

1. Go to: **Jenkins → PulseDesk-CI → Configure**

2. Find: **Build Triggers**

3. **Check only:**
   - ☑ GitHub hook trigger for GITScm polling

4. **Uncheck:**
   - ☐ Poll SCM
   - ☐ Build periodically
   - ☐ Other triggers

5. Click **Save**

#### Step 2: Prevent Git Commits from Triggering Builds

Edit your pipeline to **skip Git commits that come from Jenkins**:

**In the "Commit & Push to Git" stage, add this check:**

```groovy
stage('Commit & Push to Git') {
    steps {
        script {
            sh '''
                # Check if we're in a Jenkins-initiated build
                if git log -1 --pretty=%B | grep -q "Build #"; then
                    echo "⚠️ This is a Jenkins-triggered build, skipping Git commit"
                else
                    echo "📤 Pushing changes to Git..."
                    # ... your git commit and push commands
                fi
            '''
        }
    }
}
```

Or simpler: **Add [ci skip] to commit message:**

```groovy
git commit -m "Update images - Build #${BUILD_NUMBER} [ci skip]"
```

Then configure GitHub to **skip builds** for commits with `[ci skip]`

---

### Option C: Create Separate Manual Pipeline (Most Control)

Create two jobs:
1. **PulseDesk-CI-Auto** - Triggered by GitHub webhook
2. **PulseDesk-CI-Manual** - Triggered manually

**PulseDesk-CI-Auto** skips the Git commit stage:
```groovy
// Remove the "Commit & Push to Git" stage
// Only run: Build, Docker, Push stages
```

**PulseDesk-CI-Manual** includes everything:
```groovy
// Run all stages including Git commits
// Triggered manually when needed
```

---

## Recommended Solution (Best Practices)

### Step 1: Stop Git Commits from Triggering Builds

Edit: `Automations/PulseDesk-CI-Pipeline-WORKING.groovy`

Find the **"Commit & Push to Git"** stage and change it to:

```groovy
stage('Commit & Push to Git') {
    when {
        expression {
            // Skip this stage if we're just updating manifests
            // This prevents infinite build loops
            return env.BUILD_CAUSE != 'GitPushCause'
        }
    }
    steps {
        script {
            pipelineLogger.section('GIT COMMIT & PUSH')
            withCredentials([usernamePassword(
                credentialsId: 'github-credentials',
                usernameVariable: 'GIT_USER',
                passwordVariable: 'GIT_TOKEN'
            )]) {
                sh '''
                    git config user.email "jenkins@pulsedesk.local"
                    git config user.name "Jenkins CI"
                    
                    git add kubernetes/ 2>/dev/null || true
                    # Add [ci skip] to prevent recursive builds
                    git commit -m "Update container images - Build #${BUILD_NUMBER} [ci skip]" || echo "No changes"
                    
                    git push https://${GIT_USER}:${GIT_TOKEN}@github.com/maazzafar1234/PulseDesk.git main 2>/dev/null || true
                    echo "✅ Changes pushed"
                '''
            }
        }
    }
}
```

### Step 2: Configure Jenkins Build Triggers

1. Go to: **Jenkins → PulseDesk-CI → Configure**

2. Find: **Build Triggers**

3. **Configure as follows:**
   - ☑ GitHub hook trigger for GITScm polling
   - ☐ Poll SCM (UNCHECKED)
   - ☐ Build periodically (UNCHECKED)

4. Click **Save**

### Step 3: Configure GitHub to Skip [ci skip] Commits

1. Go to: **GitHub → Settings → Webhooks**

2. Find your Jenkins webhook

3. In webhook settings, GitHub will automatically respect `[ci skip]` in commit messages

---

## What Causes Repeated Builds

### Scenario 1: Poll SCM + GitHub Webhook
```
User pushes → Webhook triggers build #1
Poll SCM finds new commit → triggers build #2
Jenkins commits k8s update → Webhook triggers build #3
Poll SCM finds new commit → triggers build #4
...infinite loop
```

**Fix:** Disable Poll SCM

### Scenario 2: Git Push Creates Infinite Loop
```
Build #1 runs → Commits to kubernetes/ → Pushes to Git
GitHub webhook sees push → Triggers build #2
Build #2 runs → Commits to kubernetes/ → Pushes to Git
GitHub webhook sees push → Triggers build #3
...infinite loop
```

**Fix:** Add `[ci skip]` to Jenkins-created commits

### Scenario 3: Multiple Commits in Same Build
```
Pipeline commits AND pushes multiple times
Each push triggers webhook
Multiple builds queue up
All run simultaneously or back-to-back
```

**Fix:** Combine all Git operations into single commit/push

---

## Quick Checklist to Fix

### ✅ Immediate (5 minutes)

- [ ] Go to Jenkins job configuration
- [ ] Find **Build Triggers** section
- [ ] Uncheck **Poll SCM** (if checked)
- [ ] Keep only **GitHub hook trigger** or **Manual**
- [ ] Save configuration
- [ ] Trigger one manual build to verify

### ✅ Better (10 minutes)

- [ ] Add `[ci skip]` to Git commit message
- [ ] Use `when` condition to skip Git stage on webhook triggers
- [ ] Save configuration
- [ ] Test: Push code → Build should run once

### ✅ Best (15 minutes)

- [ ] Create separate jobs (CI Auto vs Manual)
- [ ] Configure webhooks properly
- [ ] Add proper condition checks
- [ ] Add logging to identify trigger sources
- [ ] Document trigger configuration

---

## Comparison of Solutions

| Solution | Time | Control | Auto Deploy | Issues |
|----------|------|---------|------------|--------|
| No auto triggers | 5 min | Full | ❌ Manual only | Need manual clicks |
| Webhook only | 5 min | Good | ✅ On push | May loop if not fixed |
| Webhook + [ci skip] | 10 min | Excellent | ✅ Clean | Best option |
| Separate jobs | 15 min | Perfect | ✅ Full control | More complex |

---

## Recommended Configuration

**For Production:**

1. **GitHub webhook** enabled → Triggers on code push
2. **Poll SCM** disabled → No continuous polling
3. **[ci skip]** in Jenkins commits → Prevents loops
4. **When conditions** to skip stages → Better control
5. **Build discard** to keep last 15 builds → Clean history

---

## Test Your Fix

### Test 1: Manual Build
```
Click "Build Now"
Build #N should run
Should NOT trigger #N+1
```

### Test 2: Git Push
```
Push code to GitHub
Build should trigger once
Should NOT trigger multiple times
```

### Test 3: Watch Console
```
Look for: "Started by GitHub push"
Should see only ONE build trigger per push
```

---

## Files to Update

**File:** `Automations/PulseDesk-CI-Pipeline-WORKING.groovy`

Changes:
1. Add `[ci skip]` to commit message
2. Add `when` condition to skip stages on certain triggers
3. Better logging of trigger sources

---

## Debugging: What Triggered Your Build?

To see what triggered each build, check the console:

```
Started by GitHub push by username
Started by user admin
Started by Poll SCM
Started by GitHub hook trigger
```

Look at your build history - what's the pattern?

---

## Summary

**Problem:** Builds triggering repeatedly

**Causes:** 
- Poll SCM continuously checking
- Git push triggering webhook
- Multiple triggers active simultaneously

**Solutions:**
1. **Disable Poll SCM** (simplest)
2. **Add [ci skip] to commits** (recommended)
3. **Use when conditions** (professional)

**Next Step:** Go to Jenkins Configure and disable Poll SCM!

---

## Questions?

**Why are my builds in green/success?**
- Your pipeline is working! All stages pass ✅

**Why do they keep running?**
- Triggers are set to run automatically
- Git pushes creating new commits
- Multiple triggers firing simultaneously

**How do I stop it?**
- Go to Jenkins job → Build Triggers
- Disable automatic triggers
- Keep only manual "Build Now"

---

**Status:** Build works ✅, Need to stop repeated triggers
**Time to fix:** 5 minutes
**Difficulty:** Easy
