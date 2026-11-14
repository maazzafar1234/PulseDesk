# 📊 PulseDesk Observability Stack Setup

Complete observability implementation with **Logs**, **Metrics**, and **Traces**.

---

## 🎯 Overview

The observability stack provides three pillars of observability:

```
┌─────────────────────────────────────────────────────┐
│           OBSERVABILITY STACK                        │
├─────────────────────────────────────────────────────┤
│                                                      │
│  📝 LOGGING         📊 METRICS        🔍 TRACING     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  │ Structured   │  │ Prometheus   │  │ Distributed  │
│  │ JSON Logs    │  │ + Grafana    │  │ Traces       │
│  │              │  │              │  │              │
│  │ • Request    │  │ • HTTP       │  │ • Request    │
│  │ • Errors     │  │ • Database   │  │ • Spans      │
│  │ • Database   │  │ • Business   │  │ • Latency    │
│  │ • Events     │  │ • Custom     │  │              │
│  └──────────────┘  └──────────────┘  └──────────────┘
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 📋 Components Implemented

### 1. **Structured Logging** (`server/utils/logger.js`)
- JSON structured logs for easy parsing
- Log levels: DEBUG, INFO, WARN, ERROR
- Request/Response logging middleware
- File output for errors and combined logs
- Request ID correlation

### 2. **Enhanced Metrics** (`server/utils/metrics.js`)
- HTTP request metrics (latency, size, errors)
- Database query metrics (duration, errors, connections)
- Business metrics (tickets, users, authentication)
- Performance metrics (CPU, memory, uptime)
- Cache hit/miss metrics

### 3. **Distributed Tracing** (`server/utils/tracing.js`)
- Request tracing across services
- Span creation for operations
- Error tracking in spans
- Ready for Jaeger integration

---

## 🚀 Quick Start

### Step 1: Update Dependencies

Add logging dependencies to `server/package.json`:

```bash
cd server
npm install winston pino pino-pretty  # Optional: for advanced logging
```

### Step 2: Configure Environment Variables

Create or update `.env.docker`:

```bash
# Logging Configuration
LOG_LEVEL=INFO  # Options: DEBUG, INFO, WARN, ERROR
NODE_ENV=production

# Tracing Configuration (Optional)
JAEGER_ENABLED=false
JAEGER_HOST=localhost
JAEGER_PORT=6832
JAEGER_SAMPLER=0.1

# Prometheus
METRICS_PORT=9090
```

### Step 3: Server is Already Updated

The `server/index.js` has been updated to use the new observability utilities:

```javascript
// Logging middleware
app.use(requestLogger);

// Tracing middleware
app.use(tracingMiddleware);

// Metrics collection
app.use(metrics.metricsMiddleware);
```

### Step 4: Access Metrics

Metrics endpoint: `http://localhost:5000/metrics`

---

## 📊 Prometheus Configuration

### ServiceMonitor (Kubernetes)

```bash
kubectl apply -f kubernetes/grafana-dashboards.yaml
```

This deploys:
- ServiceMonitor for Prometheus scraping
- PrometheusRule for alerting

### Prometheus scrape_configs

Add to `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'pulsedesk-backend'
    static_configs:
      - targets: ['localhost:5000']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

---

## 📈 Grafana Dashboards

Four dashboards are available in `kubernetes/grafana-dashboards.yaml`:

### 1. **PulseDesk Application Overview**
- HTTP requests per second
- Request latency (P95)
- Error rate
- Memory and CPU usage
- Database query duration
- Ticket metrics

### 2. **PulseDesk Backend Services**
- Backend uptime
- Active database connections
- API endpoint response times
- Database query errors
- Request/Response size distribution

### 3. **PulseDesk Business Metrics**
- Tickets by priority and category
- Ticket creation rate
- Ticket resolution rate
- Active users by role
- Authentication attempts and failures

### 4. **PulseDesk Alerts**
- High error rate alerts
- High memory usage alerts
- High API latency alerts
- Database connection pool alerts

---

## 🔔 Alert Rules

Automated alerts configured:

| Alert | Threshold | Severity |
|-------|-----------|----------|
| High Error Rate | > 5% errors | Warning |
| High Latency | P95 > 2s | Warning |
| High Memory | > 800MB | Warning |
| High DB Latency | P95 > 1s | Warning |
| DB Query Errors | Any errors | Critical |

---

## 📝 Available Metrics

### HTTP Metrics

```
http_request_duration_seconds - Request latency histogram
http_request_size_bytes - Request size histogram
http_response_size_bytes - Response size histogram
http_requests_total - Total request counter
http_errors_total - Total error counter
```

### Database Metrics

```
db_query_duration_seconds - Query duration histogram
db_query_errors_total - Query error counter
db_connections_active - Active connection gauge
```

### Business Metrics

```
tickets_created_total - Tickets created counter
tickets_resolved_total - Tickets resolved counter
tickets_open_current - Open tickets gauge
users_active_current - Active users gauge
auth_attempts_total - Auth attempt counter
auth_failures_total - Auth failure counter
```

### Performance Metrics

```
process_cpu_usage_percent - CPU usage gauge
process_memory_usage_bytes - Memory usage gauge
process_uptime_seconds - Uptime gauge
```

### Cache Metrics

```
cache_hits_total - Cache hits counter
cache_misses_total - Cache misses counter
```

---

## 🔌 Using Observability in Code

### Record a Metric

```javascript
const metrics = require('./utils/metrics');

// Record ticket creation
metrics.recordTicketCreated('high', 'bug');

// Record authentication
metrics.recordAuthAttempt('password', 'success');

// Record database query
const start = Date.now();
// ... do query ...
metrics.recordDatabaseQuery('SELECT', 'tickets', Date.now() - start);
```

### Log a Message

```javascript
const { logger } = require('./utils/logger');

// Info log
logger.info('Ticket created', {
  ticketId: 123,
  userId: 456,
  priority: 'high'
});

// Error log
logger.error('Database query failed', {
  query: 'SELECT * FROM tickets',
  error: err.message
}, err);
```

### Create a Trace Span

```javascript
const { tracer, startDatabaseSpan } = require('./utils/tracing');

const span = startDatabaseSpan('query_tickets', 'SELECT * FROM tickets');

try {
  const result = await db.query('SELECT * FROM tickets');
  span.setTag('result_count', result.length);
  span.finish();
  return result;
} catch (err) {
  span.setTag('error', true);
  span.log({ 'event': 'error', 'message': err.message });
  span.finish();
  throw err;
}
```

---

## 📂 Log Files

Logs are stored in `logs/` directory:

```
logs/
├── combined.log      - All logs
├── info.log         - Info level logs
├── warn.log         - Warning level logs
└── error.log        - Error level logs
```

Example log entry (JSON):

```json
{
  "timestamp": "2026-11-14T10:30:45.123Z",
  "level": "INFO",
  "service": "pulsedesk-server",
  "message": "Incoming request",
  "environment": "production",
  "requestId": "1731576645123-abc123xyz",
  "method": "GET",
  "path": "/api/tickets",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}
```

---

## 🔄 Integration Points

### In Routes (`server/routes/tickets.js`)

```javascript
const { logger } = require('../utils/logger');
const metrics = require('../utils/metrics');

router.get('/', async (req, res) => {
  try {
    logger.info('Fetching tickets', { userId: req.user.id });
    const tickets = await db.getTickets();
    metrics.updateOpenTickets(tickets.length);
    res.json(tickets);
  } catch (err) {
    logger.error('Failed to fetch tickets', { userId: req.user.id }, err);
    res.status(500).json({ error: err.message });
  }
});
```

### In Auth Routes (`server/routes/auth.js`)

```javascript
router.post('/login', async (req, res) => {
  try {
    const user = await authenticate(req.body.email, req.body.password);
    metrics.recordAuthAttempt('password', 'success');
    logger.info('User logged in', { userId: user.id, email: user.email });
    res.json({ token });
  } catch (err) {
    metrics.recordAuthFailure('password', 'invalid_credentials');
    logger.warn('Login failed', { email: req.body.email });
    res.status(401).json({ error: 'Invalid credentials' });
  }
});
```

---

## 📊 Grafana Setup

### 1. Add Prometheus Data Source

1. Go to Grafana: `http://grafana:3000`
2. **Configuration** → **Data Sources**
3. **Add data source** → **Prometheus**
4. URL: `http://prometheus:9090`
5. Click **Save & Test**

### 2. Import Dashboards

1. **Dashboards** → **Import**
2. Upload JSON from `kubernetes/grafana-dashboards.yaml`
3. Select Prometheus data source
4. Click **Import**

### 3. Create Alerts

1. Edit any panel
2. Click **Alert** tab
3. Set conditions and notification channels

---

## 🚨 Common Issues

### Issue: No metrics showing in Grafana

**Check:**
```bash
# Verify metrics endpoint
curl http://localhost:5000/metrics

# Check Prometheus is scraping
curl http://localhost:9090/api/v1/targets
```

### Issue: Logs not being written

**Check:**
```bash
# Verify logs directory exists
ls -la logs/

# Check permissions
chmod 755 logs/

# Check LOG_LEVEL
echo $LOG_LEVEL
```

### Issue: High memory usage

**Monitor:**
```promql
process_memory_usage_bytes{type="heap_used"}
```

**Reduce:**
- Lower NODE memory limit
- Increase garbage collection intervals
- Check for memory leaks in code

---

## 🔒 Security Considerations

- ✅ Logs stored securely in `logs/` directory
- ✅ Sensitive data (passwords) excluded from logs
- ✅ Request IDs for security audit trails
- ✅ Error stacks only in development mode
- ⚠️ Keep logs directory outside Git repo

Add to `.gitignore`:

```
logs/
*.log
```

---

## 📈 Next Steps

1. **Deploy to Kubernetes**
   ```bash
   kubectl apply -f kubernetes/grafana-dashboards.yaml
   ```

2. **Enable Jaeger Tracing**
   - Install Jaeger: `docker run -d jaegertracing/all-in-one`
   - Set `JAEGER_ENABLED=true`
   - Install package: `npm install jaeger-client`

3. **Add Log Aggregation** (ELK/Loki)
   - Export logs to Elasticsearch or Loki
   - Query logs from Kibana or Grafana

4. **Configure Alerts**
   - Set up notification channels (Slack, PagerDuty)
   - Define custom alert thresholds
   - Test alert firing

5. **Monitor Business Metrics**
   - Add more custom metrics
   - Create business dashboards
   - Set SLO alerts

---

## 📚 References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [OpenTelemetry](https://opentelemetry.io/)
- [Jaeger Tracing](https://www.jaegertracing.io/)

---

## ✅ Verification Checklist

- [ ] Logger utility module created (`server/utils/logger.js`)
- [ ] Metrics utility module created (`server/utils/metrics.js`)
- [ ] Tracing utility module created (`server/utils/tracing.js`)
- [ ] Server updated to use observability middleware
- [ ] Grafana dashboards deployed
- [ ] Prometheus alerts configured
- [ ] Logs directory created
- [ ] Metrics endpoint accessible at `/metrics`
- [ ] Logs being written to `logs/` directory
- [ ] Grafana dashboards showing data

---

**Observability is now fully integrated into PulseDesk!** 📊✨

Next: Deploy to Kubernetes and verify metrics flow to Grafana.
