# Production Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the professional algorithmic trading platform in production environments.

## Prerequisites

### System Requirements
- **CPU**: 8+ cores (16+ recommended for high-load)
- **RAM**: 32GB+ (64GB+ recommended)
- **Storage**: 500GB+ SSD (1TB+ recommended)
- **Network**: 1Gbps+ connection
- **OS**: Ubuntu 20.04+ or CentOS 8+

### Software Requirements
- Docker 20.10+
- Docker Compose 2.0+
- Git
- SSL certificates (Let's Encrypt recommended)
- Domain name for production deployment

## Environment Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-org/algo-trading-platform.git
cd algo-trading-platform
```

### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

### 3. Generate Security Keys
```bash
# Generate strong secret key
SECRET_KEY=$(openssl rand -hex 32)
echo "SECRET_KEY=$SECRET_KEY" >> .env

# Generate database password
POSTGRES_PASSWORD=$(openssl rand -base64 32)
echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD" >> .env
```

## SSL Certificate Setup

### 1. Let's Encrypt (Recommended)
```bash
# Install certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com

# Setup auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. Self-Signed (Development Only)
```bash
# Create SSL directory
mkdir -p nginx/ssl

# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/private.key \
  -out nginx/ssl/certificate.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=yourdomain.com"
```

## Database Setup

### 1. Initialize Database
```bash
# Start database service
docker-compose -f docker-compose.prod.yml up -d postgres

# Wait for database to be ready
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U algotrader

# Run database migrations
docker-compose -f docker-compose.prod.yml exec api-gateway python -m alembic upgrade head
```

### 2. Create Admin User
```bash
# Access auth service container
docker-compose -f docker-compose.prod.yml exec auth-service python

# Run admin creation script
from auth.database import get_db
from auth.models import User, UserRole
from auth.auth import get_password_hash

async def create_admin():
    async for db in get_db():
        admin_user = User(
            username="admin",
            email="admin@yourdomain.com",
            hashed_password=get_password_hash("your_admin_password"),
            role=UserRole.ADMIN
        )
        db.add(admin_user)
        await db.commit()
        print("Admin user created")

# Execute
import asyncio
asyncio.run(create_admin())
```

## Production Deployment

### 1. Build and Deploy Services
```bash
# Build all services
docker-compose -f docker-compose.prod.yml build

# Deploy all services
docker-compose -f docker-compose.prod.yml up -d

# Check service status
docker-compose -f docker-compose.prod.yml ps
```

### 2. Verify Deployment
```bash
# Check API Gateway
curl -k https://api.yourdomain.com/health

# Check individual services
curl -k https://api.yourdomain.com/auth/health
curl -k https://api.yourdomain.com/market-data/health
curl -k https://api.yourdomain.com/strategy/health
```

### 3. Frontend Deployment
```bash
# Build production frontend
docker-compose -f docker-compose.prod.yml up -d --build frontend

# Verify frontend
curl -I https://yourdomain.com
```

## Monitoring Setup

### 1. Prometheus Configuration
```bash
# Create monitoring directory
mkdir -p monitoring

# Copy prometheus configuration
cp monitoring/prometheus.yml.example monitoring/prometheus.yml

# Edit configuration
nano monitoring/prometheus.yml
```

### 2. Grafana Dashboard
```bash
# Access Grafana
# URL: https://yourdomain.com:3001
# Username: admin
# Password: (from .env file)

# Import dashboards
# - Trading Platform Overview
# - System Performance
# - Risk Metrics
```

### 3. Log Aggregation
```bash
# Setup ELK stack
docker-compose -f docker-compose.prod.yml up -d elasticsearch logstash kibana

# Access Kibana
# URL: https://yourdomain.com:5601
```

## Performance Optimization

### 1. Database Optimization
```sql
-- Create indexes for performance
CREATE INDEX CONCURRENTLY idx_market_data_symbol_timestamp 
ON market_data(symbol, timestamp);

CREATE INDEX CONCURRENTLY idx_orders_user_status 
ON orders(user_id, status);

CREATE INDEX CONCURRENTLY idx_positions_symbol_open 
ON positions(symbol, is_open);

-- Update PostgreSQL configuration
-- Edit postgresql.conf for optimal performance
```

### 2. Redis Optimization
```bash
# Edit Redis configuration
docker-compose -f docker-compose.prod.yml exec redis redis-cli CONFIG SET maxmemory 2gb
docker-compose -f docker-compose.prod.yml exec redis redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### 3. Nginx Optimization
```nginx
# Add to nginx.conf
worker_processes auto;
worker_connections 1024;

# Enable gzip compression
gzip on;
gzip_types text/plain application/json application/javascript text/css;

# Enable caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## Security Hardening

### 1. Firewall Configuration
```bash
# Setup UFW firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 5432/tcp  # Block external DB access
sudo ufw deny 6379/tcp  # Block external Redis access
```

### 2. Container Security
```bash
# Run containers as non-root user
# Add to Dockerfiles:
# RUN addgroup -g 1001 -S nodejs
# RUN adduser -S nextjs -u 1001
# USER nextjs

# Enable Docker content trust
export DOCKER_CONTENT_TRUST=1
```

### 3. Network Security
```bash
# Create isolated networks
docker network create --driver bridge algo-internal
docker network connect algo-internal postgres
docker network connect algo-internal redis
```

## Backup Strategy

### 1. Database Backups
```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U algotrader algotrading > $BACKUP_DIR/backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/backup_$DATE.sql

# Remove old backups (keep 30 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
EOF

chmod +x backup.sh

# Setup cron job
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

### 2. Redis Backups
```bash
# Enable Redis persistence
docker-compose -f docker-compose.prod.yml exec redis redis-cli CONFIG SET save "900 1 300 10 60 10000"

# Backup Redis data
docker cp $(docker-compose -f docker-compose.prod.yml ps -q redis):/data /backups/redis/
```

## Scaling Configuration

### 1. Horizontal Scaling
```bash
# Scale specific services
docker-compose -f docker-compose.prod.yml up -d --scale strategy-service=3
docker-compose -f docker-compose.prod.yml up -d --scale celery-worker=5
```

### 2. Load Balancer Setup
```nginx
# Add to nginx.conf
upstream strategy_service {
    server strategy-service_1:8003;
    server strategy-service_2:8003;
    server strategy-service_3:8003;
}

server {
    location /strategy/ {
        proxy_pass http://strategy_service;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Health Monitoring

### 1. Health Checks
```bash
# Create health check script
cat > health_check.sh << 'EOF'
#!/bin/bash

SERVICES=("api-gateway" "auth-service" "market-data-service" "strategy-service" "backtest-service" "execution-service" "risk-service")

for service in "${SERVICES[@]}"; do
    if curl -f -s http://localhost:8000/health > /dev/null; then
        echo "✓ $service is healthy"
    else
        echo "✗ $service is unhealthy"
        # Send alert
        curl -X POST "https://api.slack.com/webhooks/..." -d '{"text":"'$service' is unhealthy!"}'
    fi
done
EOF

chmod +x health_check.sh

# Setup monitoring cron
crontab -e
# Add: */5 * * * * /path/to/health_check.sh
```

### 2. Performance Monitoring
```bash
# Monitor resource usage
docker stats --no-stream

# Monitor logs
docker-compose -f docker-compose.prod.yml logs -f --tail=100

# Monitor database performance
docker-compose -f docker-compose.prod.yml exec postgres psql -U algotrader -c "SELECT * FROM pg_stat_activity;"
```

## Troubleshooting

### 1. Common Issues

#### Service Won't Start
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs service-name

# Check port conflicts
netstat -tulpn | grep :8000

# Restart service
docker-compose -f docker-compose.prod.yml restart service-name
```

#### Database Connection Issues
```bash
# Check database status
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# Check connection string
docker-compose -f docker-compose.prod.yml exec api-gateway env | grep DATABASE_URL
```

#### High Memory Usage
```bash
# Check memory usage
docker stats --no-stream

# Restart high-memory services
docker-compose -f docker-compose.prod.yml restart service-name

# Optimize memory limits in docker-compose.yml
```

### 2. Performance Issues

#### Slow API Response
```bash
# Check database queries
docker-compose -f docker-compose.prod.yml exec postgres psql -U algotrader -c "SELECT query, calls, total_time FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"

# Check Redis performance
docker-compose -f docker-compose.prod.yml exec redis redis-cli INFO stats
```

#### High CPU Usage
```bash
# Identify CPU-intensive processes
docker-compose -f docker-compose.prod.yml exec service-name top

# Scale services if needed
docker-compose -f docker-compose.prod.yml up -d --scale service-name=3
```

## Maintenance Procedures

### 1. Rolling Updates
```bash
# Update individual services without downtime
docker-compose -f docker-compose.prod.yml up -d --no-deps service-name

# Update all services
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### 2. Database Maintenance
```bash
# Vacuum database
docker-compose -f docker-compose.prod.yml exec postgres psql -U algotrader -c "VACUUM ANALYZE;"

# Update statistics
docker-compose -f docker-compose.prod.yml exec postgres psql -U algotrader -c "ANALYZE;"
```

### 3. Log Rotation
```bash
# Setup log rotation
sudo nano /etc/logrotate.d/docker-containers

# Add configuration:
/var/lib/docker/containers/*/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
}
```

## Emergency Procedures

### 1. Service Recovery
```bash
# Restart all services
docker-compose -f docker-compose.prod.yml restart

# Recover from backup
docker-compose -f docker-compose.prod.yml exec postgres psql -U algotrader -c "DROP DATABASE algotrading;"
docker-compose -f docker-compose.prod.yml exec postgres psql -U algotrader -c "CREATE DATABASE algotrading;"
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U algotrading algotrading < backup.sql
```

### 2. Disaster Recovery
```bash
# Full system restore
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# Restore from latest backup
# (See backup section above)
```

## Support and Monitoring

### 1. Alert Configuration
- Set up Slack/Email alerts for critical failures
- Configure monitoring thresholds
- Create escalation procedures

### 2. Documentation
- Maintain runbooks for common issues
- Document custom configurations
- Keep contact information updated

### 3. Regular Maintenance
- Weekly system health checks
- Monthly security updates
- Quarterly performance reviews
- Annual disaster recovery testing
