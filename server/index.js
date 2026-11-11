require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

// Initialize database
const dbModule = require('./db/init');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize database before starting server
let db = null;
(async () => {
  db = await dbModule.initialize();
  // Make db available globally for routes
  global.db = dbModule;
  
  app.listen(PORT, () => {
    console.log(`PulseDesk Server running on http://localhost:${PORT}`);
  });
})();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Root route
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'PulseDesk API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tickets', require('./routes/tickets'));

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  
  // Structured error response
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(status).json({
    error: message,
    status: status,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});
