# PulseDesk Setup Guide

Complete setup instructions for local development and deployment.

## Table of Contents
1. [Local Development Setup](#local-development-setup)
2. [Running the Application](#running-the-application)
3. [Testing the API](#testing-the-api)
4. [Deployment to Production](#deployment-to-production)
5. [Troubleshooting](#troubleshooting)

## Local Development Setup

### System Requirements
- Node.js v24.0.0 or higher
- npm v10.0.0 or higher (comes with Node.js)
- Git v2.30.0 or higher
- 2GB free disk space

### Step 1: Clone the Repository

```bash
git clone https://github.com/maazzafar1234/PulseDesk.git
cd PulseDesk
```

### Step 2: Install Dependencies

```bash
npm run install:all
```

This command:
- Installs root dependencies
- Installs client dependencies in `/client`
- Installs server dependencies in `/server`

### Step 3: Configure Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` with your local settings (defaults are pre-configured):
```env
VITE_API_BASE_URL=http://localhost:5000
PORT=5000
DATABASE_URL=file:./data/pulsedesk.db
JWT_SECRET=dev-secret-key-change-in-production
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Step 4: Verify Installation

Check if everything is installed:

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check if dependencies are installed
ls -la client/node_modules
ls -la server/node_modules
```

## Running the Application

### Option A: Run in Separate Terminals (Recommended for Development)

**Terminal 1 - Start Backend**
```bash
cd server
npm run dev
```

Expected output:
```
Database initialized at C:\Users\Maaz\Desktop\Project\server\data\pulsedesk.db
PulseDesk Server running on http://localhost:5000
```

**Terminal 2 - Start Frontend**
```bash
cd client
npm run dev
```

Expected output:
```
VITE v8.3.8  building for development
ready in 200ms
➜  Local:   http://localhost:5173/
```

### Option B: Run with npm Scripts

```bash
npm run dev
```

This will show instructions to run in separate terminals.

### Accessing the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

### First Time Login

1. Navigate to http://localhost:5173
2. You'll be redirected to `/login`
3. Click "Sign Up" to create a new account
4. Enter email and password (minimum 6 characters)
5. After registration, you'll be logged in and redirected to the dashboard

## Testing the API

### Using cURL

#### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

#### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"user@example.com","password":"password123"}'
```

#### Get Current User
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -b cookies.txt
```

#### Create Ticket
```bash
curl -X POST http://localhost:5000/api/tickets \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title":"Bug fix needed",
    "description":"Fix login issue",
    "priority":"high",
    "status":"open"
  }'
```

#### Get Tickets
```bash
curl -X GET http://localhost:5000/api/tickets?status=open \
  -b cookies.txt
```

### Using Postman

1. Open Postman
2. Create a new collection called "PulseDesk"
3. Add requests for each endpoint:
   - POST `http://localhost:5000/api/auth/login`
   - GET `http://localhost:5000/api/auth/me`
   - GET `http://localhost:5000/api/tickets`
   - POST `http://localhost:5000/api/tickets`

**Enable cookie support in Postman:**
- Go to Settings > Cookies > Add cookie for `localhost:5000`

## Deployment to Production

### Frontend Deployment (Vercel)

1. **Build the frontend**
   ```bash
   npm run build:client
   ```

2. **Connect to Vercel**
   ```bash
   npm install -g vercel
   cd client
   vercel
   ```

3. **Configure environment variables**
   - In Vercel dashboard: Settings > Environment Variables
   - Add: `VITE_API_BASE_URL=https://your-backend-url.com`

4. **Deploy**
   ```bash
   vercel --prod
   ```

### Backend Deployment (Render)

1. **Prepare the repository**
   ```bash
   git add .
   git commit -m "Deploy to production"
   git push origin main
   ```

2. **Create Render account** at https://render.com

3. **Create Web Service**
   - Click "New +" > "Web Service"
   - Connect your GitHub repository
   - Select the PulseDesk repo
   - Configure:
     - **Name**: pulsedesk-api
     - **Environment**: Node
     - **Build Command**: `npm install && npm install -g concurrently && npm run install:all`
     - **Start Command**: `cd server && npm run start`

4. **Set Environment Variables**
   - Go to Environment tab
   - Add these variables:
     ```
     JWT_SECRET=<generate-secure-key>
     NODE_ENV=production
     FRONTEND_URL=https://your-vercel-frontend.vercel.app
     DATABASE_URL=<postgresql-url>
     PORT=10000
     ```

5. **Deploy**
   - Click "Deploy"
   - Wait for deployment (5-10 minutes)
   - Copy the URL from the deploy logs

### Database Setup (PostgreSQL with Neon)

1. **Create Neon account** at https://neon.tech

2. **Create a new project**
   - Choose PostgreSQL
   - Note the connection string

3. **Update backend `.env`**
   ```env
   DATABASE_URL=postgresql://user:password@host/database
   ```

4. **The backend will automatically**:
   - Create tables on first connection
   - Apply foreign keys
   - Create indexes

## Troubleshooting

### Issue: "Cannot GET /api/tickets"

**Symptoms:**
- Error message in browser console
- API calls fail with 404

**Solutions:**
1. Verify backend is running:
   ```bash
   curl http://localhost:5000/api/health
   ```

2. Check CORS configuration in `.env`:
   ```env
   FRONTEND_URL=http://localhost:5173
   ```

3. Verify `VITE_API_BASE_URL` in client is correct:
   ```bash
   echo $VITE_API_BASE_URL
   ```

### Issue: "Invalid token" after login

**Symptoms:**
- Can register/login but get 401 on dashboard

**Solutions:**
1. Clear browser cookies:
   - Open DevTools (F12)
   - Application > Cookies > Delete all

2. Verify JWT_SECRET is set:
   ```bash
   echo $JWT_SECRET
   ```

3. Try logging out and in again

### Issue: Database errors

**Symptoms:**
- "Cannot connect to database"
- "Database locked" errors

**Solutions:**
1. Check database file exists:
   ```bash
   ls -la server/data/pulsedesk.db
   ```

2. Delete and recreate database:
   ```bash
   rm -rf server/data/pulsedesk.db
   npm run dev:server
   ```

3. Verify permissions:
   ```bash
   chmod 755 server/data/
   ```

### Issue: Node modules not found

**Symptoms:**
- "Cannot find module 'express'"
- After cloning the repo

**Solution:**
```bash
npm run install:all
```

### Issue: Port already in use

**Symptoms:**
- "Address already in use :5000" or ":5173"

**Solutions:**
1. Find process using the port:
   ```bash
   # On Windows
   netstat -ano | findstr :5000
   
   # On Mac/Linux
   lsof -i :5000
   ```

2. Kill the process:
   ```bash
   # On Windows
   taskkill /PID <PID> /F
   
   # On Mac/Linux
   kill -9 <PID>
   ```

3. Or use different ports:
   ```bash
   PORT=5001 npm run dev:server
   ```

### Issue: CORS errors

**Symptoms:**
- "Access to XMLHttpRequest blocked by CORS policy"

**Solutions:**
1. Verify frontend URL in `.env`:
   ```env
   FRONTEND_URL=http://localhost:5173
   ```

2. Restart backend after changing `.env`:
   ```bash
   npm run dev:server
   ```

3. Check request headers:
   - Open DevTools > Network
   - Check `Origin` header matches `FRONTEND_URL`

## Development Workflow

### Creating a New Feature

1. Create feature branch:
   ```bash
   git checkout -b feature/my-feature
   ```

2. Make changes and test:
   ```bash
   npm run dev
   ```

3. Commit changes:
   ```bash
   git add .
   git commit -m "feat(module): Add my feature"
   ```

4. Push and create PR:
   ```bash
   git push -u origin feature/my-feature
   ```

### Running Tests

Currently, the project doesn't have automated tests. To add tests:

1. **Frontend Tests**:
   ```bash
   cd client
   npm install --save-dev vitest @testing-library/react
   npm run test
   ```

2. **Backend Tests**:
   ```bash
   cd server
   npm install --save-dev jest
   npm run test
   ```

## Performance Optimization

### Frontend
- Build size: ~330KB uncompressed, ~106KB gzipped
- Load time: < 2 seconds
- Performance optimizations:
  - Code splitting with Vite
  - Tree shaking
  - Tailwind CSS purging

### Backend
- Response time: < 100ms (local)
- Database indexes on status, priority, user_id
- Connection pooling ready

### Database
- SQLite: < 5MB file size
- PostgreSQL: Ready for horizontal scaling

## Next Steps

1. Start development:
   ```bash
   npm run dev:client
   npm run dev:server
   ```

2. Read the [API Documentation](./README.md#api-documentation)

3. Explore the [codebase structure](./README.md#project-structure)

4. Check out [future enhancements](./README.md#future-enhancements)

---

Need help? Check the [README.md](./README.md) or open an issue on GitHub.
