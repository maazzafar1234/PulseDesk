require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const client = require('prom-client');
const path = require('path');

// Import observability utilities
const { logger, requestLogger, errorLogger } = require('./utils/logger');
const { tracingMiddleware } = require('./utils/tracing');
const metrics = require('./utils/metrics');

// Initialize database
const dbModule = require('./db/init');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================================
// PROMETHEUS METRICS SETUP
// ============================================================================
// Collect default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ timeout: 5000 });

logger.info('Prometheus metrics initialized', {
  defaultMetrics: true,
  customMetrics: true,
});

// ============================================================================
// INITIALIZE DATABASE
// ============================================================================
let db = null;
let server = null;

(async () => {
  try {
    db = await dbModule.initialize();
    global.db = dbModule;
    
    server = app.listen(PORT, () => {
      logger.info('PulseDesk Server started', {
        port: PORT,
        database: dbModule.isPostgres() ? 'PostgreSQL (RDS)' : 'SQLite',
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
      });
      console.log(`✓ PulseDesk Server running on http://localhost:${PORT}`);
      console.log(`✓ Database: ${dbModule.isPostgres() ? 'PostgreSQL (RDS)' : 'SQLite'}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ Metrics endpoint: /metrics`);
      console.log(`✓ Logging enabled: ${process.env.LOG_LEVEL || 'INFO'}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      server.close(async () => {
        await dbModule.close();
        logger.info('Server shutdown complete');
        process.exit(0);
      });
    });
  } catch (err) {
    logger.error('Failed to initialize server', { port: PORT }, err);
    console.error('✗ Failed to initialize server:', err.message);
    process.exit(1);
  }
})();

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

// Helmet: Set security HTTP headers
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? true : false,
  hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000 } : false,
}));

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req) => req.path === '/metrics' || req.path === '/api/health', // Skip rate limiting for metrics and health endpoints
});

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Apply global rate limiter
app.use(limiter);

// ============================================================================
// CORE MIDDLEWARE
// ============================================================================

// Request/Response logging (must be before other middleware for accurate timing)
app.use(requestLogger);

// Distributed tracing
app.use(tracingMiddleware);

// Metrics collection (enhanced with custom metrics)
app.use(metrics.metricsMiddleware);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// Enhanced CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173,http://localhost:3000').split(',');
    // Allow requests without origin header or from allowed origins
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Note: Metrics middleware already added above in CORE MIDDLEWARE section

// ============================================================================
// ROUTES
// ============================================================================

// Root route
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'PulseDesk API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: dbModule.isPostgres() ? 'postgresql' : 'sqlite',
    timestamp: new Date().toISOString(),
  });
});

// Config endpoint for frontend (tells where backend is)
app.get('/api/config', (req, res) => {
  res.json({
    apiUrl: process.env.API_URL || `http://${req.get('host')}`,
    environment: process.env.NODE_ENV || 'development',
  });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  const metrics = await client.register.metrics();
  res.end(metrics);
});

// Apply stricter rate limiting to auth endpoints
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tickets', require('./routes/tickets'));

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// Error logging middleware (must be before final error handler)
app.use(errorLogger);

// Global error handling middleware
app.use((err, req, res, next) => {
  // Rate limit errors
  if (err.status === 429) {
    return res.status(429).json({
      error: err.message,
      retryAfter: err.retryAfter,
    });
  }

  // CORS errors
  if (err.message.includes('CORS')) {
    return res.status(403).json({
      error: 'CORS Policy Violation',
      details: err.message,
    });
  }

  // Structured error response
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(status).json({
    error: message,
    status: status,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    timestamp: new Date().toISOString(),
  });
});
