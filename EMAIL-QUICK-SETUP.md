# 📧 Email Setup - Quick Start (5 Minutes)

## Get Email Notifications from CD Pipeline

### Quick Setup (Gmail)

#### Step 1: Create Google App Password (2 minutes)

1. Go to: https://myaccount.google.com/apppasswords
2. Select:
   - App: **Mail**
   - Device: **Windows Computer**
3. Click **Generate**
4. Copy the 16-character password shown

#### Step 2: Configure Jenkins (3 minutes)

1. Open Jenkins: `http://your-jenkins:8080`
2. Click **Manage Jenkins** → **Configure System**
3. Scroll to **Email Notification**
4. Fill in:
   ```
   SMTP server: smtp.gmail.com
   SMTP Port: 587
   Username: your-email@gmail.com
   Password: [Paste the 16-char password from Step 1]
   ✅ Use SMTP Authentication: Check
   ✅ Use TLS: Check
   ```
5. In **Default To**: `your-email@gmail.com`
6. Click **Test configuration by sending email**
7. Check your email (or spam folder)

#### Step 3: Done! 🎉

Next time CD Pipeline completes, you'll get an email!

---

## What Email Contains

### On Success ✅

```
Subject: ✅ PulseDesk CD Deployment #42 SUCCESS (CI Build #40)

Content:
- CD Build Number
- CI Build Number
- Docker Image Tag
- Frontend URL: http://<NODE-IP>:31100
- Backend URL: http://<NODE-IP>:31000
- ArgoCD Dashboard URL
- Build URL
```

### On Failure ❌

```
Subject: ❌ PulseDesk CD Deployment #42 FAILED (CI Build #40)

Content:
- Build details
- Failed at: [timestamp]
- Link to build logs
- Troubleshooting steps
- Link to console output
```

---

## Troubleshooting

### "Test email failed"

**Check:**
1. Gmail password is correct (use App Password, not regular password)
2. "Less secure app access" is ON at https://myaccount.google.com/security
3. SMTP port is 587 (not 25 or 465)
4. TLS is checked ✅

### "Email not arriving"

**Check:**
1. Spam/Junk folder
2. Sender email address (jenkins@...)
3. Jenkins logs: `tail -f /var/log/jenkins/jenkins.log | grep -i email`

### "Test succeeds but CD Pipeline emails don't send"

**Check:**
1. DEFAULT_RECIPIENTS is set
2. Email address format is correct
3. Jenkins has permission to send

---

## Advanced Setup

For more options, see: **JENKINS-EMAIL-SETUP.md**

- AWS SES
- SendGrid
- Microsoft 365
- Custom SMTP
- Slack integration
- PagerDuty integration

---

## Commands to Verify

### Check Jenkins Email Config

```bash
# SSH to Jenkins server
ssh jenkins@your-jenkins-server

# Check Jenkins logs for email
tail -f /var/log/jenkins/jenkins.log | grep -i email

# Search for email errors
grep -i "smtp\|email" /var/log/jenkins/jenkins.log
```

### Test Email Manually

In Jenkins script console:

```groovy
emailext(
    subject: "Test Email",
    body: "If you got this, email works!",
    to: "your-email@gmail.com"
)
```

---

## Done! 📧

After Jenkins email is configured, you'll receive:

✅ Email when CD Pipeline succeeds  
❌ Email when CD Pipeline fails  
📊 All deployment details included  
🔗 Direct links to access your app  

**Happy deploying!** 🚀
