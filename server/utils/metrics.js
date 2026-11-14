/**
 * PulseDesk Enhanced Metrics
 * Extends prom-client with custom application metrics
 * 
 * Exposes metrics at: GET /metrics
 */

const client = require('prom-client');

// Clear default metrics if needed to avoid duplicates
// client.register.clear();

// ============================================================================
// HTTP REQUEST METRICS
// ============================================================================

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
});

const httpRequestSize = new client.Histogram({
  name: 'http_request_size_bytes',
  help: 'Size of HTTP requests in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1000, 10000, 100000, 1000000],
});

const httpResponseSize = new client.Histogram({
  name: 'http_response_size_bytes',
  help: 'Size of HTTP responses in bytes',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [100, 1000, 10000, 100000, 1000000],
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const httpErrorsTotal = new client.Counter({
  name: 'http_errors_total',
  help: 'Total HTTP errors (4xx and 5xx)',
  labelNames: ['method', 'route', 'status_code'],
});

// ============================================================================
// DATABASE METRICS
// ============================================================================

const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

const dbQueryErrors = new client.Counter({
  name: 'db_query_errors_total',
  help: 'Total database query errors',
  labelNames: ['operation', 'table', 'error_type'],
});

const dbConnections = new client.Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections',
  labelNames: ['pool'],
});

// ============================================================================
// BUSINESS METRICS
// ============================================================================

const ticketsCreated = new client.Counter({
  name: 'tickets_created_total',
  help: 'Total tickets created',
  labelNames: ['priority', 'category'],
});

const ticketsResolved = new client.Counter({
  name: 'tickets_resolved_total',
  help: 'Total tickets resolved',
  labelNames: ['priority', 'resolution_time'],
});

const ticketsOpen = new client.Gauge({
  name: 'tickets_open_current',
  help: 'Current number of open tickets',
  labelNames: ['priority', 'category'],
});

const usersActive = new client.Gauge({
  name: 'users_active_current',
  help: 'Current number of active users',
  labelNames: ['role'],
});

const authAttempts = new client.Counter({
  name: 'auth_attempts_total',
  help: 'Total authentication attempts',
  labelNames: ['method', 'status'],
});

const authFailures = new client.Counter({
  name: 'auth_failures_total',
  help: 'Total authentication failures',
  labelNames: ['method', 'reason'],
});

// ============================================================================
// PERFORMANCE METRICS
// ============================================================================

const processCpuUsage = new client.Gauge({
  name: 'process_cpu_usage_percent',
  help: 'CPU usage percentage',
});

const processMemoryUsage = new client.Gauge({
  name: 'process_memory_usage_bytes',
  help: 'Memory usage in bytes',
  labelNames: ['type'], // 'rss', 'heap_total', 'heap_used', 'external'
});

const uptime = new client.Gauge({
  name: 'process_uptime_seconds',
  help: 'Process uptime in seconds',
});

// ============================================================================
// CACHE METRICS
// ============================================================================

const cacheHits = new client.Counter({
  name: 'cache_hits_total',
  help: 'Total cache hits',
  labelNames: ['cache_name'],
});

const cacheMisses = new client.Counter({
  name: 'cache_misses_total',
  help: 'Total cache misses',
  labelNames: ['cache_name'],
});

// ============================================================================
// MIDDLEWARE FOR METRICS
// ============================================================================

/**
 * Express middleware to collect HTTP metrics
 */
function metricsMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    const method = req.method;
    const statusCode = res.statusCode;

    // Record metrics
    httpRequestDuration
      .labels(method, route, statusCode)
      .observe(duration);

    if (req.get('content-length')) {
      httpRequestSize
        .labels(method, route)
        .observe(parseInt(req.get('content-length')));
    }

    if (res.get('content-length')) {
      httpResponseSize
        .labels(method, route, statusCode)
        .observe(parseInt(res.get('content-length')));
    }

    httpRequestsTotal
      .labels(method, route, statusCode)
      .inc();

    // Count errors
    if (statusCode >= 400) {
      httpErrorsTotal
        .labels(method, route, statusCode)
        .inc();
    }
  });

  next();
}

/**
 * Record database query metrics
 */
function recordDatabaseQuery(operation, table, duration, status = 'success', errorType = null) {
  dbQueryDuration
    .labels(operation, table, status)
    .observe(duration / 1000); // Convert to seconds

  if (status !== 'success') {
    dbQueryErrors
      .labels(operation, table, errorType || 'unknown')
      .inc();
  }
}

/**
 * Record ticket metrics
 */
function recordTicketCreated(priority = 'normal', category = 'general') {
  ticketsCreated
    .labels(priority, category)
    .inc();
}

function recordTicketResolved(priority = 'normal', resolutionTime = 'day') {
  ticketsResolved
    .labels(priority, resolutionTime)
    .inc();
}

function updateOpenTickets(count, priority = 'all', category = 'all') {
  ticketsOpen
    .labels(priority, category)
    .set(count);
}

/**
 * Record authentication metrics
 */
function recordAuthAttempt(method = 'password', status = 'success') {
  authAttempts
    .labels(method, status)
    .inc();
}

function recordAuthFailure(method = 'password', reason = 'invalid_credentials') {
  authFailures
    .labels(method, reason)
    .inc();
}

/**
 * Update performance metrics (call periodically)
 */
function updatePerformanceMetrics() {
  const memUsage = process.memoryUsage();

  processCpuUsage.set(process.cpuUsage().user / 1000000); // Convert to percentage
  processMemoryUsage.labels('rss').set(memUsage.rss);
  processMemoryUsage.labels('heap_total').set(memUsage.heapTotal);
  processMemoryUsage.labels('heap_used').set(memUsage.heapUsed);
  processMemoryUsage.labels('external').set(memUsage.external);

  uptime.set(process.uptime());
}

/**
 * Record cache metrics
 */
function recordCacheHit(cacheName) {
  cacheHits
    .labels(cacheName)
    .inc();
}

function recordCacheMiss(cacheName) {
  cacheMisses
    .labels(cacheName)
    .inc();
}

// Update performance metrics every 30 seconds
setInterval(updatePerformanceMetrics, 30000);

module.exports = {
  // Middleware
  metricsMiddleware,

  // HTTP Metrics
  httpRequestDuration,
  httpRequestSize,
  httpResponseSize,
  httpRequestsTotal,
  httpErrorsTotal,

  // Database Metrics
  dbQueryDuration,
  dbQueryErrors,
  dbConnections,
  recordDatabaseQuery,

  // Business Metrics
  ticketsCreated,
  ticketsResolved,
  ticketsOpen,
  usersActive,
  authAttempts,
  authFailures,
  recordTicketCreated,
  recordTicketResolved,
  updateOpenTickets,
  recordAuthAttempt,
  recordAuthFailure,

  // Performance Metrics
  processCpuUsage,
  processMemoryUsage,
  uptime,
  updatePerformanceMetrics,

  // Cache Metrics
  cacheHits,
  cacheMisses,
  recordCacheHit,
  recordCacheMiss,
};
