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

// Routes (to be implemented in modules 2 & 3)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tickets', require('./routes/tickets'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});
