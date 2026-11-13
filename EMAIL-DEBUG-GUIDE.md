# 📧 Email Debug Guide - SMTP Connection Error Fix

## The Problem

```
Sending email to: maazzafar156@gmail.com
SMTP connection error while sending email
Failed after second try sending email
```

Pipeline uses `emailext()` which needs **Extended Email Notification** configured.

---

## Two Email Sections in Jenkins

### 1. Email Notification (Basic)
- Uses `mail()` step in pipeline
- **Status**: ✅ WORKING (test email succeeded)
- **Test Result**: "Email was successfully sent"

### 2. Extended Email Notification (Advanced)
- Uses `emailext()` step in pipeline
- **Status**: ❌ NOT WORKING (pipeline failing)
- **Issue**: SMTP connection error

---

## Solution: Configure Extended Email Notification

### Step 1: Open Jenkins Configuration

1. Go to: `http://your-jenkins:8080`
2. Click: **Manage Jenkins**
3. Click: **Configure System**
4. Scroll down to find **Extended Email Notification** section

---

### Step 2: Check Extended Email Configuration

Look for these fields in **Extended Email Notification**:

```
[ ] Enable debug mode
SMTP server: __________ (should be: smtp.gmail.com)
Default SMTP Port: __________ (should be: 465)
Default user email suffix: __________ (should be: @gmail.com)
[ ] Use SMTP Authentication
SMTP User: __________ (should be: maazzafar156@gmail.com)
SMTP Password: __________ (should be: YOUR 16-CHAR APP PASSWORD)
[ ] Use SSL (important!)
[ ] Use TLS
```

---

### Step 3: Fill in Extended Email Settings

**IMPORTANT**: These settings must match your basic Email Notification!

```
Enable debug mode: ☑️ CHECK (helps with troubleshooting)

SMTP server: smtp.gmail.com
Default SMTP Port: 465
Default user email suffix: @gmail.com

[ ] Use SMTP Authentication: ☑️ CHECK
SMTP User: maazzafar156@gmail.com
SMTP Password: [Your 16-char Gmail App Password]

Use SSL: ☑️ CHECK
Use TLS: ☐ UNCHECK

Default Charset: UTF-8
```

---

### Step 4: Save Configuration

1. Click: **Save**
2. Jenkins restarts email service

---

### Step 5: Test Extended Email

**Option A: Use Script Console (Recommended)**

1. Go to: **Manage Jenkins** → **Script Console**
2. Paste this code:

```groovy
import javax.mail.Message
import javax.mail.Session
import javax.mail.Transport
import javax.mail.internet.InternetAddress
import javax.mail.internet.MimeMessage
import java.util.Properties

def recipientEmail = "maazzafar156@gmail.com"
def senderEmail = "maazzafar156@gmail.com"

try {
    def config = Jenkins.getInstance().getDescriptor(hudson.tasks.Mailer.class)
    def descriptor = Jenkins.getInstance().getDescriptor(hudson.plugins.emailext.ExtendedEmailPublisher.class)
    
    println("Extended Email Notification Configuration:")
    println("SMTP Server: " + descriptor.smtpServer)
    println("SMTP Port: " + descriptor.smtpPort)
    println("Default suffix: " + descriptor.defaultSuffix)
    println("Use SSL: " + descriptor.useSSL)
    println("Use Authentication: " + descriptor.smtpAuthenticationUsername ? "YES" : "NO")
    
    println("\nConfiguration loaded successfully!")
    
} catch (Exception e) {
    println("Error: " + e.message)
    e.printStackTrace()
}
```

3. Click: **Run**
4. Check output for SMTP settings

---

## Common Issues

### Issue 1: "SMTP connection error" with port 465

**Possible causes:**
- Extended Email section not configured
- Different credentials than Email Notification
- SSL setting incorrect

**Fix:**
- Verify Extended Email Notification has same credentials
- Ensure SSL is ☑️ CHECKED
- Ensure TLS is ☐ UNCHECKED

### Issue 2: "Authentication failed"

**Possible causes:**
- Gmail App Password wrong
- Username not set to `maazzafar156@gmail.com`
- Password has spaces or special characters

**Fix:**
- Regenerate App Password from: https://myaccount.google.com/apppasswords
- Copy fresh 16-char password (remove spaces)
- Update in Extended Email Notification

### Issue 3: "Connection refused"

**Possible causes:**
- Firewall blocking port 465
- Jenkins can't reach smtp.gmail.com
- Network issue

**Check:**
```bash
# SSH to Jenkins server
ssh jenkins@your-jenkins

# Test connectivity
telnet smtp.gmail.com 465
nc -v smtp.gmail.com 465

# Expected: Connection successful
```

---

## Comparison: Basic Email vs Extended Email

### Basic Email Notification (Working)
```
SMTP Server: smtp.gmail.com
Port: 465
Method: mail() step
Status: ✅ Works
```

### Extended Email Notification (Broken)
```
SMTP Server: [NOT SET or different]
Port: [NOT SET or different]
Method: emailext() step
Status: ❌ Broken - needs configuration
```

---

## Quick Checklist

- [ ] Go to: Manage Jenkins → Configure System
- [ ] Find: **Extended Email Notification** section
- [ ] Set: SMTP server = smtp.gmail.com
- [ ] Set: SMTP Port = 465
- [ ] Set: SMTP User = maazzafar156@gmail.com
- [ ] Set: SMTP Password = [16-char App Password]
- [ ] Check: ✅ Use SMTP Authentication
- [ ] Check: ✅ Use SSL
- [ ] Uncheck: ☐ Use TLS
- [ ] Set: Default suffix = @gmail.com
- [ ] Set: Default Charset = UTF-8
- [ ] Click: Save
- [ ] Run CD Pipeline
- [ ] Check: Email received at maazzafar156@gmail.com

---

## What Happens After Fix

```
Pipeline runs
    ↓
Reaches success/failure post block
    ↓
Calls emailext() step
    ↓
Connects to smtp.gmail.com:465
    ↓
Authenticates with maazzafar156@gmail.com
    ↓
Sends HTML email
    ↓
✅ Email delivered to maazzafar156@gmail.com
```

---

## Debug Logs

After configuring, check Jenkins logs:

```bash
ssh jenkins@your-jenkins
tail -f /var/log/jenkins/jenkins.log | grep -i "extended\|emailext\|smtp"

# Look for:
# - "Extended Email initialization"
# - "SMTP Connected"
# - "Authentication successful"
# - "Email sent"
```

---

## If Still Broken

Check Jenkins Plugin Manager:

1. Go to: **Manage Jenkins** → **Manage Plugins**
2. Search: "Email Extension Plugin" or "emailext"
3. Verify: **Installed and Enabled**

If missing:
1. Click: **Available** tab
2. Search: "Email Extension"
3. Click: Install
4. Restart Jenkins

---

## Important Note

The pipeline code is correct:
- ✅ Uses `emailext()` properly
- ✅ HTML email formatting correct
- ✅ Variable interpolation fixed (double quotes)

The issue is **Jenkins is missing or misconfigured Extended Email Notification**.

Once you configure it, emails will send successfully!

---

**Configure Extended Email Notification and you're done!** 📧✨
