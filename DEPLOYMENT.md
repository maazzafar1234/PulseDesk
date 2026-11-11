# PulseDesk Deployment Guide

Production deployment guide for PulseDesk on Vercel (Frontend) and Render (Backend).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Vercel (Frontend)                        │
│                   React + Vite + Tailwind CSS                   │
│                   https://pulsedesk.vercel.app                  │
└──────────────────────────────────────────┬──────────────────────┘
                                           │ (HTTPS)
                                           │
                    ┌──────────────────────▼───────────────────┐
                    │   Render (Backend API)                   │
                    │   Express.js + Node.js                   │
                    │   https://pulsedesk-api.onrender.com     │
                    └──────────────────────┬───────────────────┘
                                           │
                    ┌──────────────────────▼───────────────────┐
                    │   Neon (PostgreSQL Database)             │
                    │   Managed PostgreSQL Hosting             │
                    │   db.neondb.io                           │
                    └──────────────────────────────────────────┘
```

## Prerequisites

- GitHub account with PulseDesk repository
- Vercel account (https://vercel.com)
- Render account (https://render.com)
- Neon account (https://neon.tech) for PostgreSQL
- Custom domain (optional)

## Step 1: Prepare the Repository

### 1.1 Ensure main branch is ready

```bash
git checkout main
git pull origin main
git log --oneline -5
```

### 1.2 Create .env.production file

In the root directory, create `.env.production` (DON'T commit to git):

```env
# Backend
NODE_ENV=production
PORT=10000
JWT_SECRET=<generate-a-secure-random-string>

# Database (will be set after creating Neon database)
DATABASE_URL=<will-update-after-neon-setup>

# CORS
FRONTEND_URL=https://<your-vercel-url>
```

### 1.3 Commit deployment readiness

```bash
git add .
git commit -m "chore: prepare for production deployment"
git push origin main
```

## Step 2: Setup PostgreSQL Database (Neon)

### 2.1 Create Neon Account

1. Go to https://neon.tech
2. Sign up with GitHub
3. Create a new project

### 2.2 Create Database

1. Click "New Project"
2. Configure:
   - **Region**: US (or closest to your users)
   - **Postgres version**: 15+ recommended
3. Click "Create project"
4. You'll receive:
   - Connection string
   - Database name
   - Username

### 2.3 Save Connection String

Copy the full connection string:
```
postgresql://user:password@ep-cool-lake-123456.us-east-1.neon.tech/pulsedesk?sslmode=require
```

**Store this securely** - you'll need it for Render.

### 2.4 Initialize Database Tables (Optional)

The backend will automatically create tables on first connection. To verify structure:

1. Use Neon's web console
2. Or connect with pgAdmin

## Step 3: Deploy Backend (Render)

### 3.1 Create Render Account

1. Go to https://render.com
2. Sign up with GitHub
3. Accept authorization

### 3.2 Create Web Service

1. Click "New +" button
2. Select "Web Service"
3. Connect GitHub repository

### 3.3 Configure Web Service

**Basic Settings:**
- **Name**: `pulsedesk-api`
- **Region**: Oregon (US) recommended
- **Branch**: `main`
- **Runtime**: `Node`

**Build & Deploy:**
- **Build Command**: 
  ```
  npm install && cd client && npm install && cd ../server && npm install
  ```
- **Start Command**: 
  ```
  cd server && npm run start
  ```

### 3.4 Set Environment Variables

Click "Environment" and add:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | `<generate-secure-key>` |
| `DATABASE_URL` | `<from-neon>` |
| `PORT` | `10000` |
| `FRONTEND_URL` | `https://pulsedesk.vercel.app` |
| `CORS_ORIGIN` | `https://pulsedesk.vercel.app` |

**Generate JWT_SECRET** (run in terminal):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3.5 Deploy

1. Click "Create Web Service"
2. Render will:
   - Clone the repository
   - Install dependencies (3-5 minutes)
   - Build the project
   - Start the server

3. Monitor deployment in the "Logs" tab

### 3.6 Get Backend URL

Once deployed successfully:
1. Find the URL at the top of the page
2. Example: `https://pulsedesk-api.onrender.com`
3. **Save this URL** - needed for frontend

### 3.7 Verify Backend

```bash
curl https://pulsedesk-api.onrender.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-11-11T12:00:00.000Z"
}
```

## Step 4: Deploy Frontend (Vercel)

### 4.1 Create Vercel Account

1. Go to https://vercel.com
2. Sign up with GitHub
3. Accept authorization

### 4.2 Import Project

1. Click "Add New" > "Project"
2. Select your GitHub repository
3. Vercel will detect it's a monorepo

### 4.3 Configure Build Settings

1. **Root Directory**: `client`
2. **Framework Preset**: `Vite`
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`

### 4.4 Set Environment Variables

Click "Environment Variables" and add:

| Key | Value |
|-----|-------|
| `VITE_API_BASE_URL` | `https://pulsedesk-api.onrender.com` |

### 4.5 Deploy

1. Click "Deploy"
2. Vercel will:
   - Build the frontend (1-2 minutes)
   - Deploy to CDN
   - Provide a public URL

### 4.6 Get Frontend URL

Once deployed:
1. Find the URL at the top (example: `pulsedesk.vercel.app`)
2. **Update Render** with this URL:
   - Go back to Render dashboard
   - Select your web service
   - Edit environment variable `FRONTEND_URL`
   - Set to: `https://pulsedesk.vercel.app`
   - Click "Save Changes" (auto-redeploy)

## Step 5: Post-Deployment Verification

### 5.1 Test Authentication

```bash
# Register
curl -X POST https://pulsedesk-api.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@pulsedesk.com",
    "password": "TestPassword123"
  }'

# Login
curl -X POST https://pulsedesk-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "test@pulsedesk.com",
    "password": "TestPassword123"
  }'
```

### 5.2 Test Frontend

1. Visit https://pulsedesk.vercel.app
2. You should see the login page
3. Try registering a new account
4. After login, you should see the dashboard

### 5.3 Test API

1. Open browser DevTools (F12)
2. Try creating a new ticket
3. Check Network tab for successful requests
4. Verify ticket appears in dashboard

## Step 6: Custom Domain Setup (Optional)

### 6.1 For Frontend (Vercel)

1. Go to Vercel project settings
2. Click "Domains"
3. Add your custom domain
4. Update DNS records as shown
5. Wait for SSL certificate (5-10 minutes)

### 6.2 For Backend (Render)

1. Go to Render web service settings
2. Click "Custom Domains"
3. Add your custom domain
4. Update DNS records
5. SSL certificate is automatic

## Step 7: Monitoring & Maintenance

### 7.1 Monitor Logs

**Render Backend Logs:**
1. Go to web service
2. Click "Logs" tab
3. Watch for errors

**Vercel Frontend Logs:**
1. Go to project
2. Click "Deployments"
3. Select latest deployment
4. View build logs

### 7.2 Uptime Monitoring

Set up monitoring for:
- Backend health: `/api/health`
- Frontend: Root path `/`

Services:
- Uptime Robot (free tier)
- Datadog
- New Relic

### 7.3 Error Tracking

Implement error tracking:
```bash
cd client && npm install @sentry/react
cd ../server && npm install @sentry/node
```

Configure in `.env.production`.

## Step 8: Security Hardening

### 8.1 API Security

- ✅ HTTPS enforced (automatic on Vercel & Render)
- ✅ CORS configured to frontend domain
- ✅ JWT secrets are strong (change if exposed)
- ✅ HTTP-only cookies prevent XSS

**Additional:**
- Add rate limiting to auth endpoints
- Implement CSRF protection
- Add helmet.js for security headers

```bash
cd server && npm install helmet express-rate-limit
```

### 8.2 Database Security

- ✅ PostgreSQL with encrypted connection
- ✅ Connection string uses credentials
- ✅ Regular backups (Neon handles this)

**Additional:**
- Enable connection encryption
- Setup backups policy in Neon
- Monitor for suspicious access

### 8.3 Secrets Management

Render automatically masks environment variables in logs.

**Best practices:**
- Never commit `.env` files
- Rotate JWT_SECRET monthly
- Use different secrets per environment
- Store backups securely

## Troubleshooting

### Issue: Deployment fails

**Check:**
1. Push all commits: `git push origin main`
2. Check build logs in Vercel/Render dashboard
3. Verify `package.json` exists in root

### Issue: API requests return CORS error

**Solutions:**
1. Verify backend URL in Vercel env vars
2. Check `FRONTEND_URL` in Render env vars
3. Wait 5 minutes for Render to redeploy after env change

### Issue: Can't login in production

**Check:**
1. Verify database URL is correct in Render
2. Check JWT_SECRET is set
3. Verify cookies are being sent (browser DevTools > Application > Cookies)

### Issue: Database connection timeout

**Solutions:**
1. Check connection string format in Neon
2. Verify Render IP is whitelisted (automatic with Neon)
3. Test connection: `psql <connection-string>`

### Issue: Blank page after login

**Debugging:**
1. Open DevTools (F12)
2. Check Console for errors
3. Check Network tab for failed requests
4. Verify API base URL is correct

## Rollback Procedure

### If Deployment Goes Wrong:

**Vercel Frontend:**
```bash
# Go to Deployments tab
# Click the previous deployment
# Click "Redeploy"
```

**Render Backend:**
```bash
# Go to Deploys tab
# Click the previous deployment
# Click "Redeploy"
```

## Monitoring Checklist

- [ ] Backend health check succeeds
- [ ] Frontend loads without errors
- [ ] User can register new account
- [ ] User can login
- [ ] User can create ticket
- [ ] User can view tickets
- [ ] User can update ticket status
- [ ] User can delete ticket
- [ ] User can logout
- [ ] All API calls use HTTPS
- [ ] No sensitive data in logs
- [ ] Database backups are working

## Performance Targets

- **Frontend**: < 3 seconds load time
- **Backend**: < 200ms response time
- **Database**: < 50ms query time
- **Uptime**: 99.9%

Monitor with:
- Vercel Analytics
- Render metrics
- Custom monitoring script

## Scheduled Maintenance

### Monthly:
- Review logs for errors
- Update dependencies
- Check SSL certificates
- Rotate secrets if needed

### Quarterly:
- Performance audit
- Security audit
- Database optimization
- Backup verification

## Support

If issues occur:

1. Check Render logs first
2. Check Vercel logs
3. Verify environment variables
4. Test locally with same config
5. Check GitHub issues
6. Contact support:
   - Vercel: support@vercel.com
   - Render: support@render.com
   - Neon: support@neon.tech

## Next Steps

1. ✅ Deploy backend on Render
2. ✅ Deploy frontend on Vercel
3. ✅ Verify functionality
4. 📧 Set up email notifications
5. 📊 Set up monitoring
6. 🔐 Implement additional security
7. 📱 Plan mobile app

---

**Deployment Complete!** 🎉

Your PulseDesk application is now live and accessible to users.
