# 📧 Jenkins Email Notifications Setup Guide

## Problem
CD Pipeline completes but no email notifications are sent.

## Solution
Configure Jenkins email settings to send deployment notifications.

---

## Step 1: Configure Jenkins Email Plugin

### Option A: Using Gmail (Recommended for Testing)

**1. Enable "Less Secure Apps" on Gmail**
- Go to: https://myaccount.google.com/security
- Search for "Less secure app access"
- Turn it ON

**2. Create App Password (More Secure)**
- Go to: https://myaccount.google.com/apppasswords
- Select "Mail" and "Windows Computer"
- Google will generate a 16-character password
- Copy this password

### Option B: Using SMTP Relay (Production)

Use your company's SMTP server or service:
- AWS SES
- SendGrid
- Microsoft 365
- Gmail SMTP
- Custom SMTP server

---

## Step 2: Configure Jenkins

### Access Jenkins Configuration

1. Open Jenkins: `http://<JENKINS-URL>:8080`
2. Click **Manage Jenkins** (top left)
3. Click **Configure System**
4. Scroll down to **Email Notification** section

### Email Notification Settings

Fill in these fields:

```
SMTP server: smtp.gmail.com
SMTP Port: 587
Charset: UTF-8

✅ Use SMTP Authentication: Check
Username: your-email@gmail.com
Password: [Your App Password or Password]

✅ Use TLS: Check

Default user email suffix: @gmail.com
```

### Extended Email Notification Settings

If you need more advanced features:

1. Scroll to **Extended E-mail Notification** section
2. Configure:

```
SMTP server: smtp.gmail.com
SMTP Port: 587
Username: your-email@gmail.com
Password: [Your App Password]

✅ Use SMTP Authentication: Check
✅ Use TLS: Check

Default To: your-email@gmail.com
Default Suffix: @gmail.com
```

### Test Configuration

```
Test email recipient: your-email@gmail.com
Click "Test configuration by sending email"
```

You should receive a test email!

---

## Step 3: Configure Pipeline Recipients

### Method 1: Global Default Recipients

1. In **Manage Jenkins** → **Configure System**
2. Find **Email Notification**
3. Set **Default To** field:
```
your-email@gmail.com, team@example.com
```

### Method 2: Pipeline Parameters

Add this to your Jenkins job configuration:

```groovy
// In CD Pipeline
String DEFAULT_RECIPIENTS = "your-email@gmail.com,team@example.com"
```

### Method 3: Job-Specific Recipients

In Jenkins job → **Configure** → **Post-build Actions**:
- Add **Email Notification**
- Set recipients: `your-email@gmail.com`

---

## Step 4: Verify Email Configuration in Pipeline

The CD Pipeline now has better email handling:

```groovy
try {
    emailext(
        subject: "✅ PulseDesk CD Deployment #${BUILD_NUMBER} SUCCESS",
        body: "[HTML email content]",
        to: '${DEFAULT_RECIPIENTS}',
        recipientProviders: [developers(), requestor(), brokenBuildSuspects()],
        mimeType: 'text/html'
    )
    echo "✅ Email sent"
} catch (Exception e) {
    echo "⚠️  Email failed: ${e.message}"
}
```

---

## Step 5: Manual Email Test

### Test Directly from Jenkins

1. Go to **Manage Jenkins** → **Configure System**
2. In **Email Notification** section
3. Set **Test email recipient**: `your-email@gmail.com`
4. Click **Test configuration by sending email**
5. Check your email

### Test from Pipeline

Run this script in a test job:

```groovy
emailext(
    subject: "Test: PulseDesk Email Configuration",
    body: "If you received this, email is configured correctly!",
    to: "your-email@gmail.com",
    mimeType: 'text/html'
)
```

---

## Step 6: Check Email Headers

If emails don't arrive:

1. Check **spam/junk** folder
2. Add sender email to contacts
3. Check Jenkins logs:
   ```bash
   tail -f /var/log/jenkins/jenkins.log | grep -i email
   ```

4. Verify SMTP settings again

---

## Email Recipients Reference

The CD Pipeline sends emails to:

```groovy
recipientProviders: [
    developers(),           # Committers who changed code
    requestor(),           # Person who triggered the build
    brokenBuildSuspects()  # People from broken builds
]
```

Plus:
```groovy
to: '${DEFAULT_RECIPIENTS}'  # Your configured recipients
```

---

## Gmail Configuration Example

### Settings for Gmail SMTP

| Setting | Value |
|---------|-------|
| SMTP Server | smtp.gmail.com |
| SMTP Port | 587 |
| Username | your-email@gmail.com |
| Password | [Google App Password] |
| Use TLS | ✅ Yes |
| Use Authentication | ✅ Yes |

### Gmail App Password Steps

1. Go to https://myaccount.google.com/apppasswords
2. Select App: **Mail**
3. Select Device: **Windows Computer**
4. Click **Generate**
5. Google shows 16-character password
6. Copy and paste into Jenkins

---

## AWS SES Configuration Example

### Settings for AWS SES

| Setting | Value |
|---------|-------|
| SMTP Server | email-smtp.[region].amazonaws.com |
| SMTP Port | 587 |
| Username | [Your SMTP Username] |
| Password | [Your SMTP Password] |
| Use TLS | ✅ Yes |

### Getting AWS SES Credentials

1. Go to AWS SES Console
2. Click **Create SMTP Credentials**
3. Download CSV with username and password
4. Use in Jenkins configuration

---

## SendGrid Configuration Example

### Settings for SendGrid

| Setting | Value |
|---------|-------|
| SMTP Server | smtp.sendgrid.net |
| SMTP Port | 587 |
| Username | apikey |
| Password | [Your SendGrid API Key] |
| Use TLS | ✅ Yes |

---

## Troubleshooting

### Email Not Sending

**Check 1: Test Configuration**
```
Manage Jenkins → Configure System → Email Notification
Click "Test configuration by sending email"
```

**Check 2: Verify Credentials**
- Username correct?
- Password correct?
- 2FA or App Password used?

**Check 3: Check Firewall**
- SMTP Port 587 open?
- Outbound SMTP allowed?

**Check 4: Check Logs**
```bash
tail -f /var/log/jenkins/jenkins.log | grep -i "email\|smtp"
```

**Check 5: Verify Recipients**
- ${DEFAULT_RECIPIENTS} set?
- Email address format correct?
- Not blocked by email provider?

### Emails Going to Spam

**Solutions:**
1. Add Jenkins email to contacts
2. Whitelist Jenkins IP in email filters
3. Configure SPF/DKIM records
4. Use branded domain instead of Gmail

### Authentication Failed

**Gmail:**
- Use App Password (not regular password)
- Enable "Less secure apps"
- Check 2FA is enabled

**AWS SES:**
- Verify sender email address
- Check SMTP credentials match
- Check AWS region is correct

---

## Email Template Customization

The CD Pipeline sends HTML emails with:
- Build details
- Deployment information
- Access URLs
- Monitoring links
- Troubleshooting info

To customize:
1. Edit `PulseDesk-CD-Pipeline.groovy`
2. Modify the `body` section in `emailext()`
3. Add your custom HTML
4. Commit and push

Example custom fields:
```groovy
<li><b>Custom Field:</b> Your Value</li>
<li><b>Team:</b> Your Team Name</li>
<li><b>Slack Channel:</b> #deployments</li>
```

---

## Integration with Other Services

### Slack Integration

Add Slack notification in addition to email:

```groovy
sh '''
    curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"Deployment successful! 🎉"}' \
        YOUR_SLACK_WEBHOOK_URL
'''
```

### PagerDuty Integration

Add incident on failure:

```groovy
sh '''
    curl -X POST https://events.pagerduty.com/v2/enqueue \
        -H 'Content-Type: application/json' \
        -d '{
            "routing_key":"YOUR_ROUTING_KEY",
            "event_action":"trigger",
            "payload":{
                "summary":"CD Pipeline Failed",
                "severity":"critical",
                "source":"Jenkins"
            }
        }'
'''
```

---

## Summary Checklist

✅ Configure Jenkins Email Settings  
✅ Set SMTP Server (smtp.gmail.com or your server)  
✅ Set Username and Password  
✅ Enable TLS  
✅ Set Default Recipients  
✅ Test configuration  
✅ Verify emails arrive  
✅ Check spam folder  
✅ Pipeline will send emails on success/failure  

---

## Support

If emails still don't work:

1. Check Jenkins logs
2. Verify SMTP credentials
3. Test with simple email first
4. Check firewall/network
5. Review Jenkins documentation

Your CD Pipeline will send detailed HTML emails once configured! 📧✅
