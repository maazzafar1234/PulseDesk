/**
 * PulseDesk Structured Logger
 * Provides JSON structured logging for better observability
 * 
 * Usage:
 *   const logger = require('./logger');
 *   logger.info('User logged in', { userId: 123, ip: '192.168.1.1' });
 *   logger.error('Database error', { error: err.message, query: sql });
 */

const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log levels with severity
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// Get log level from environment
const LOG_LEVEL = process.env.LOG_LEVEL || 'INFO';
const MIN_LOG_LEVEL = LOG_LEVELS[LOG_LEVEL] || LOG_LEVELS.INFO;

/**
 * Format timestamp in ISO format with milliseconds
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Format log entry as JSON
 */
function formatLogEntry(level, message, data = {}, error = null) {
  const entry = {
    timestamp: getTimestamp(),
    level,
    service: 'pulsedesk-server',
    message,
    environment: process.env.NODE_ENV || 'development',
    ...data,
  };

  if (error) {
    entry.error = {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }

  return entry;
}

/**
 * Write log to console and file
 */
function writeLog(entry) {
  const logJson = JSON.stringify(entry);

  // Console output
  console.log(logJson);

  // File output for errors and above
  if (LOG_LEVELS[entry.level] >= LOG_LEVELS.WARN) {
    const logFile = path.join(logsDir, `${entry.level.toLowerCase()}.log`);
    fs.appendFileSync(logFile, logJson + '\n', { flag: 'a' });
  }

  // All logs to combined file
  const combinedFile = path.join(logsDir, 'combined.log');
  fs.appendFileSync(combinedFile, logJson + '\n', { flag: 'a' });
}

/**
 * Logger object with methods for each log level
 */
const logger = {
  debug(message, data = {}) {
    if (LOG_LEVELS.DEBUG >= MIN_LOG_LEVEL) {
      const entry = formatLogEntry('DEBUG', message, data);
      writeLog(entry);
    }
  },

  info(message, data = {}) {
    if (LOG_LEVELS.INFO >= MIN_LOG_LEVEL) {
      const entry = formatLogEntry('INFO', message, data);
      writeLog(entry);
    }
  },

  warn(message, data = {}) {
    if (LOG_LEVELS.WARN >= MIN_LOG_LEVEL) {
      const entry = formatLogEntry('WARN', message, data);
      writeLog(entry);
    }
  },

  error(message, data = {}, error = null) {
    if (LOG_LEVELS.ERROR >= MIN_LOG_LEVEL) {
      const entry = formatLogEntry('ERROR', message, data, error);
      writeLog(entry);
    }
  },
};

/**
 * Express middleware for request/response logging
 */
function requestLogger(req, res, next) {
  const startTime = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add requestId to request for correlation
  req.requestId = requestId;

  // Log incoming request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Capture response
  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Log response
    const logLevel = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO';
    logger[logLevel.toLowerCase()]('Request completed', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });

    // Call original send
    return originalSend.call(this, data);
  };

  next();
}

/**
 * Express middleware for error logging
 */
function errorLogger(err, req, res, next) {
  logger.error('Request error', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    statusCode: err.statusCode || 500,
    ip: req.ip,
  }, err);

  next(err);
}

module.exports = {
  logger,
  requestLogger,
  errorLogger,
  LOG_LEVELS,
  getLogsDirectory: () => logsDir,
};
