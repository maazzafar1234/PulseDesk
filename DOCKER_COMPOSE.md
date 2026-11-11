# PulseDesk Docker Compose Setup

Complete local development stack using Docker Compose - **Everything in one place!**

## Quick Start (30 seconds)

```bash
# 1. Clone the repository
git clone https://github.com/maazzafar1234/PulseDesk.git
cd PulseDesk

# 2. Start all services
docker-compose up -d

# 3. Access applications
# Frontend: http://localhost:5173
# Backend API: http://localhost:5000
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3000 (admin/admin)
# pgAdmin: http://localhost:5050 (admin@pulsedesk.local/admin)
```

---

## Prerequisites

- **Docker** >= 24.0 ([Install](https://docs.docker.com/install/))
- **Docker Compose** >= 2.20 (included with Docker Desktop)
- **Git**
- 4GB RAM minimum (8GB recommended)
- 10GB disk space

### Verify Installation

```bash
docker --version          # Docker version
docker-compose --version  # Docker Compose version
```

---

## Available Services

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| **Frontend** | 5173 | http://localhost:5173 | React Vite application |
| **Backend** | 5000 | http://localhost:5000 | Express.js API |
| **PostgreSQL** | 5432 | postgres://localhost:5432 | Database |
| **Prometheus** | 9090 | http://localhost:9090 | Metrics collection |
| **Grafana** | 3000 | http://localhost:3000 | Dashboards (admin/admin) |
| **pgAdmin** | 5050 | http://localhost:5050 | DB admin UI |
| **Redis** | 6379 | redis://localhost:6379 | Cache (optional) |

---

## Usage

### Start All Services

```bash
# Start in background
docker-compose up -d

# Start with logs
docker-compose up

# Start specific services
docker-compose up -d backend postgres
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100 backend

# Follow specific service with timestamps
docker-compose logs -f -t backend
```

### Stop Services

```bash
# Stop all services (keeps data)
docker-compose stop

# Stop specific service
docker-compose stop backend

# Remove containers (keeps volumes)
docker-compose down

# Remove everything including volumes
docker-compose down -v
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend

# Stop and remove, then recreate
docker-compose up -d --force-recreate backend
```

### Execute Commands

```bash
# Get shell access to container
docker-compose exec backend sh
docker-compose exec postgres psql -U pulsedesk -d pulsedesk

# Run one-off command
docker-compose exec backend npm run dev
docker-compose exec postgres pg_dump -U pulsedesk pulsedesk > backup.sql

# View container stats
docker stats
```

---

## Configuration

### Environment Variables

Edit `.env.docker` or pass via `docker-compose.yml`:

```bash
# Copy template
cp .env.docker .env

# Edit settings
nano .env

# Use custom .env file
docker-compose --env-file .env.custom up
```

### Change Ports

Edit `docker-compose.yml`:

```yaml
services:
  backend:
    ports:
      - "8000:5000"  # Changed from 5000 to 8000
```

### Enable Optional Services

#### Redis (Caching)
```bash
# Start with Redis
docker-compose --profile cache up -d

# Access Redis
docker-compose exec redis redis-cli

# Flush all keys
docker-compose exec redis redis-cli FLUSHALL
```

#### API Documentation (Swagger)
```bash
# Start with Swagger UI
docker-compose --profile docs up -d

# Access at http://localhost:8080
```

---

## Development Workflows

### Local Development (Frontend Only)

Keep backend running in Docker, run frontend locally:

```bash
# Start backend services
docker-compose up -d postgres backend redis prometheus grafana

# In another terminal, run frontend locally
cd client
npm install
npm run dev
```

### Database Management

#### Access PostgreSQL CLI

```bash
docker-compose exec postgres psql -U pulsedesk -d pulsedesk
```

Common commands:
```sql
\dt                    -- List tables
\d users              -- Describe users table
SELECT * FROM users;  -- View data
\q                    -- Exit
```

#### Backup Database

```bash
# Create backup
docker-compose exec postgres pg_dump -U pulsedesk -d pulsedesk > backup.sql

# Restore from backup
docker-compose exec -T postgres psql -U pulsedesk -d pulsedesk < backup.sql
```

#### Access pgAdmin Web UI

1. Open http://localhost:5050
2. Login: admin@pulsedesk.local / admin
3. Register Server:
   - Host: `postgres` (not localhost)
   - Port: `5432`
   - Username: `pulsedesk`
   - Password: `pulsedesk123`

### Monitoring & Debugging

#### Prometheus Queries

Open http://localhost:9090 and run queries:

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# Latency (P95)
histogram_quantile(0.95, http_request_duration_seconds)

# Uptime
up{job="pulsedesk-backend"}
```

#### Grafana Dashboards

1. Open http://localhost:3000 (admin/admin)
2. Datasources → Add Prometheus (http://prometheus:9090)
3. Dashboards → Create or Import
4. Build custom dashboards with Prometheus data

#### View Container Processes

```bash
# List all containers
docker-compose ps

# View detailed status
docker-compose ps -a

# View resource usage
docker stats pulsedesk-backend pulsedesk-postgres
```

---

## Testing

### Test Endpoints

#### Health Check
```bash
curl http://localhost:5000/api/health
```

#### Create User (Register)
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

#### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

#### Get Current User
```bash
curl http://localhost:5000/api/auth/me
```

#### Create Ticket
```bash
curl -X POST http://localhost:5000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","description":"Test ticket","priority":"high","status":"open"}'
```

#### Get Tickets
```bash
curl http://localhost:5000/api/tickets
curl http://localhost:5000/api/tickets?status=open&priority=high
```

#### Metrics Endpoint
```bash
curl http://localhost:5000/metrics
```

### Load Testing

```bash
# Install Apache Bench
# macOS: brew install ab
# Ubuntu: sudo apt-get install apache2-utils

# Test API performance
ab -n 1000 -c 10 http://localhost:5000/api/health

# Test frontend
ab -n 1000 -c 10 http://localhost:5173/
```

---

## Troubleshooting

### Issue: Port Already in Use

```bash
# Find process using port
lsof -i :5000       # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Kill process (macOS/Linux)
kill -9 <PID>

# Or change port in docker-compose.yml
```

### Issue: Container Fails to Start

```bash
# View error logs
docker-compose logs backend

# Check Docker system
docker system df        # Disk usage
docker system prune     # Clean up

# Rebuild image
docker-compose up -d --build
```

### Issue: Database Connection Error

```bash
# Check if postgres is healthy
docker-compose exec postgres pg_isready -U pulsedesk

# View postgres logs
docker-compose logs postgres

# Recreate database
docker-compose down -v
docker-compose up -d postgres
```

### Issue: Frontend Can't Connect to Backend

```bash
# Check backend is running
docker-compose ps backend

# Test backend from frontend container
docker-compose exec frontend curl http://backend:5000/api/health

# Check CORS settings in backend
# Verify FRONTEND_URL in docker-compose.yml
```

### Issue: High Memory Usage

```bash
# Check container stats
docker stats

# Limit memory in docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

# Restart services
docker-compose restart
```

### Issue: Prometheus Not Scraping

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Verify backend metrics endpoint
curl http://localhost:5000/metrics

# Check prometheus.yml is valid
docker-compose logs prometheus
```

---

## Performance Tuning

### Optimize Database

```bash
# Connect to postgres
docker-compose exec postgres psql -U pulsedesk -d pulsedesk

# Check database size
SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) AS size 
FROM pg_database;

# Analyze tables
ANALYZE;

# Vacuum
VACUUM ANALYZE;
```

### Optimize Memory Usage

```yaml
# In docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
  
  postgres:
    deploy:
      resources:
        limits:
          memory: 1G
  
  grafana:
    deploy:
      resources:
        limits:
          memory: 256M
```

### Enable Caching (Redis)

```bash
# Start with Redis profile
docker-compose --profile cache up -d

# Client code can now use Redis at redis:6379
```

---

## Production Deployment

While Docker Compose is for local development, to deploy to production:

### Use Kubernetes (EKS)

```bash
# See DEPLOYMENT.md for complete AWS EKS setup
cd terraform
terraform init
terraform apply
```

### Use Docker Swarm

```bash
docker swarm init
docker stack deploy -c docker-compose.yml pulsedesk
```

### Deploy to Single Server

```bash
# Copy files to server
scp -r . user@server:/opt/pulsedesk

# On server
cd /opt/pulsedesk
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## Cleanup

### Remove All Containers and Volumes

⚠️ **This will delete all data**

```bash
# Remove everything
docker-compose down -v --remove-orphans

# Clean up system
docker system prune -a

# Verify cleanup
docker ps -a
docker volume ls
```

### Backup Before Cleanup

```bash
# Backup database
docker-compose exec postgres pg_dump -U pulsedesk pulsedesk > backup.sql

# Backup Grafana dashboards
docker cp pulsedesk-grafana:/var/lib/grafana ./grafana-backup

# Remove containers but keep volumes
docker-compose down
```

---

## Monitoring with Prometheus & Grafana

### Access Prometheus

- URL: http://localhost:9090
- Query metrics: `http_requests_total`, `http_request_duration_seconds`, `process_resident_memory_bytes`

### Access Grafana

- URL: http://localhost:3000
- Default login: admin / admin
- Add Prometheus datasource: http://prometheus:9090
- Import dashboards

### Common Queries

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# P95 Latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Memory usage
process_resident_memory_bytes / 1024 / 1024

# CPU usage
rate(process_cpu_seconds_total[5m]) * 100
```

---

## Useful Commands Cheatsheet

```bash
# Status
docker-compose ps
docker-compose logs -f
docker stats

# Start/Stop
docker-compose up -d                    # Start all
docker-compose stop                     # Stop all
docker-compose restart                  # Restart all
docker-compose down                     # Remove all

# Build
docker-compose build                    # Build images
docker-compose up -d --build            # Build and start

# Containers
docker-compose exec backend sh           # Shell access
docker-compose cp file backend:/app      # Copy files

# Database
docker-compose exec postgres psql -U pulsedesk -d pulsedesk
docker-compose exec postgres pg_dump -U pulsedesk pulsedesk > backup.sql

# Cleanup
docker-compose down -v --remove-orphans  # Remove everything
docker system prune -a                   # Clean up system

# Profiles
docker-compose --profile cache up -d     # Start with Redis
docker-compose --profile docs up -d      # Start with Swagger
```

---

## Files Structure

```
PulseDesk/
├── docker-compose.yml              # Main compose file
├── Dockerfile.backend             # Backend image definition
├── Dockerfile.frontend            # Frontend image definition
├── .dockerignore                  # Docker build ignore
├── .env.docker                    # Docker environment variables
├── init-db.sql                    # Database initialization
│
├── monitoring/
│   ├── prometheus.yml             # Prometheus config
│   └── grafana/
│       └── provisioning/          # Grafana data sources
│
├── client/                        # React frontend
├── server/                        # Express backend
├── terraform/                     # Infrastructure as Code
├── k8s/                          # Kubernetes manifests
│
└── data/                         # Persistent volumes
    ├── postgres/                 # PostgreSQL data
    ├── prometheus/               # Prometheus data
    ├── grafana/                  # Grafana data
    └── redis/                    # Redis data
```

---

## Next Steps

- 📖 Read [README.md](README.md) for feature overview
- 🚀 Read [DEPLOYMENT.md](DEPLOYMENT.md) for production setup
- 📊 Check [monitoring/prometheus.yaml](monitoring/prometheus.yaml) for metrics
- 🔧 Explore [terraform/](terraform/) for infrastructure code

---

## Support

- GitHub Issues: https://github.com/maazzafar1234/PulseDesk/issues
- Docker Documentation: https://docs.docker.com/
- Docker Compose Reference: https://docs.docker.com/compose/compose-file/

---

**Last Updated:** November 2026
**Status:** Production Ready
**Docker Compose Version:** 3.8+
