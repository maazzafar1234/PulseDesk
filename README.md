# PulseDesk

A lightweight internal customer support ticketing dashboard where authenticated support agents can manage, create, and update tickets in real time.

## Features

- **User Authentication**: Secure login and registration with JWT tokens stored in HTTP-only cookies
- **Ticket Management**: Create, read, update, and delete support tickets
- **Real-time Filtering**: Filter tickets by status (open, in-progress, resolved, closed) and priority (low, medium, high)
- **Responsive Design**: Modern dark-mode UI with Tailwind CSS
- **Stats Dashboard**: Visual overview of ticket counts by status
- **Secure API**: RESTful API with JWT authentication and CORS

## Tech Stack

### Frontend (`/client`)
- **Framework**: React 19 with Vite
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Routing**: React Router
- **State Management**: React Context API

### Backend (`/server`)
- **Runtime**: Node.js v24+
- **Framework**: Express.js
- **Authentication**: JWT with HTTP-only cookies
- **Password Hashing**: bcryptjs
- **Database**: SQLite3 (sql.js) for development, PostgreSQL ready
- **API Style**: RESTful

### Database
- **Local Development**: SQLite (zero-config)
- **Production**: PostgreSQL (Neon/Supabase supported)

## Project Structure

```
PulseDesk/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── context/        # React Context (Auth)
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service layer
│   │   ├── App.jsx         # Main app with routing
│   │   └── index.css       # Tailwind styles
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── server/                 # Express backend
│   ├── db/
│   │   └── init.js         # Database initialization
│   ├── middleware/
│   │   └── auth.js         # JWT middleware
│   ├── routes/
│   │   ├── auth.js         # Authentication endpoints
│   │   └── tickets.js      # Ticket CRUD endpoints
│   ├── data/               # SQLite database (created at runtime)
│   ├── index.js            # Server entry point
│   └── package.json
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

## Quick Start

### Prerequisites
- Node.js v24+ and npm/yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/maazzafar1234/PulseDesk.git
   cd PulseDesk
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   ```
   Update `.env` with your configuration:
   ```env
   VITE_API_BASE_URL=http://localhost:5000
   PORT=5000
   DATABASE_URL=file:./data/pulsedesk.db
   JWT_SECRET=dev-secret-key-change-in-production
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173
   ```

### Running Locally

**Option 1: Run both in separate terminals**
```bash
# Terminal 1: Start the backend
cd server
npm run dev

# Terminal 2: Start the frontend
cd client
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

**Option 2: Using the helper script (if configured)**
```bash
npm run dev:all
```

### Building for Production

```bash
# Build frontend
cd client && npm run build

# Build backend (Node.js serves directly)
cd ../server && npm run start
```

## API Documentation

### Authentication Endpoints

#### Register
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

#### Get Current User
```
GET /api/auth/me
Authorization: Bearer <jwt-token> (in cookie)

Response:
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "created_at": "2026-11-11T12:00:00.000Z"
  }
}
```

#### Logout
```
POST /api/auth/logout

Response:
{
  "message": "Logout successful"
}
```

### Ticket Endpoints (All require authentication)

#### Get Tickets
```
GET /api/tickets?status=open&priority=high
Authorization: Bearer <jwt-token>

Response:
{
  "tickets": [
    {
      "id": 1,
      "user_id": 1,
      "title": "Fix login bug",
      "description": "Users cannot login with special characters",
      "priority": "high",
      "status": "open",
      "created_at": "2026-11-11T12:00:00.000Z",
      "updated_at": "2026-11-11T12:00:00.000Z"
    }
  ]
}
```

#### Create Ticket
```
POST /api/tickets
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "title": "New feature request",
  "description": "Add dark mode toggle",
  "priority": "medium",
  "status": "open"
}

Response:
{
  "ticket": {
    "id": 2,
    "user_id": 1,
    "title": "New feature request",
    "description": "Add dark mode toggle",
    "priority": "medium",
    "status": "open",
    "created_at": "2026-11-11T12:00:00.000Z",
    "updated_at": "2026-11-11T12:00:00.000Z"
  }
}
```

#### Update Ticket
```
PUT /api/tickets/{id}
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "status": "in-progress",
  "priority": "low"
}

Response:
{
  "ticket": { ... updated ticket ... }
}
```

#### Delete Ticket
```
DELETE /api/tickets/{id}
Authorization: Bearer <jwt-token>

Response:
{
  "message": "Ticket deleted successfully"
}
```

## Environment Variables

Create a `.env` file in the root directory based on `.env.example`:

```env
# Frontend
VITE_API_BASE_URL=http://localhost:5000

# Backend
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=file:./data/pulsedesk.db
# For PostgreSQL: DATABASE_URL=postgresql://user:password@host:5432/pulsedesk

# Security
JWT_SECRET=your-super-secret-key-change-in-production

# CORS
FRONTEND_URL=http://localhost:5173
```

## Deployment

### Frontend Deployment (Vercel)

1. **Build the frontend**
   ```bash
   cd client && npm run build
   ```

2. **Deploy to Vercel**
   ```bash
   npm install -g vercel
   vercel deploy --prod
   ```

3. **Set environment variables**
   - Add `VITE_API_BASE_URL` pointing to your backend

### Backend Deployment (Render)

1. **Create Render account** at https://render.com

2. **Create New Web Service**
   - Connect your GitHub repository
   - Build Command: `npm install`
   - Start Command: `node server/index.js`

3. **Set environment variables**
   ```
   JWT_SECRET=<your-secret>
   NODE_ENV=production
   FRONTEND_URL=<your-vercel-frontend-url>
   DATABASE_URL=<your-postgresql-url>
   ```

### Database Migration to PostgreSQL

1. **Setup PostgreSQL** (Neon or Supabase)

2. **Update `.env`**
   ```env
   DATABASE_URL=postgresql://user:password@host:5432/pulsedesk
   ```

3. **The backend will automatically create tables** on first connection

## Development Notes

### Creating Features

Follow the Git workflow:

1. Create a feature branch
   ```bash
   git checkout -b feature/your-feature
   ```

2. Make your changes and commit
   ```bash
   git add .
   git commit -m "feat(module): Your feature description"
   ```

3. Push and create a PR
   ```bash
   git push -u origin feature/your-feature
   ```

4. Merge to main after review

### Database Schema

**Users Table**
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Tickets Table**
```sql
CREATE TABLE tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Troubleshooting

### "Cannot GET /api/tickets"
- Make sure backend is running on `http://localhost:5000`
- Check `FRONTEND_URL` in `.env` matches your frontend URL

### JWT Token Errors
- Clear browser cookies and try logging in again
- Ensure `JWT_SECRET` is set in `.env`

### Database Errors
- Check if `/server/data` directory exists (created automatically)
- For PostgreSQL, ensure connection string is correct

## Security Considerations

- ✅ Passwords hashed with bcryptjs
- ✅ JWT tokens in HTTP-only cookies (not accessible via JS)
- ✅ CORS configured for specific frontend origin
- ✅ Database foreign keys enforced
- ⚠️ Change `JWT_SECRET` in production
- ⚠️ Use HTTPS in production
- ⚠️ Implement rate limiting for auth endpoints
- ⚠️ Add CSRF protection for production

## Performance Tips

- Use ticket filtering (status/priority) to reduce data transfer
- Implement pagination for large ticket lists (future enhancement)
- Cache user data in AuthContext
- Use React.memo for ticket cards

## Future Enhancements

- [ ] Ticket assignment to agents
- [ ] Real-time updates with WebSockets
- [ ] Ticket comments and activity log
- [ ] File attachments
- [ ] Admin panel for user management
- [ ] Advanced search and sorting
- [ ] Email notifications
- [ ] Mobile app (React Native)
- [ ] Analytics dashboard

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues first
- Provide detailed reproduction steps

## Repository

https://github.com/maazzafar1234/PulseDesk

---

Built with ❤️ by the PulseDesk team
