# Family Coupon Manager - Operations Guide

## Table of Contents
- [System Overview](#system-overview)
- [Environment Configuration](#environment-configuration)
- [Deployment Procedures](#deployment-procedures)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Backup and Recovery](#backup-and-recovery)
- [Troubleshooting](#troubleshooting)
- [Security Operations](#security-operations)
- [Performance Optimization](#performance-optimization)
- [Disaster Recovery](#disaster-recovery)

## System Overview

### Architecture
The Family Coupon Manager is deployed as a containerized application with the following components:

```
┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │      Nginx      │
│    (Optional)   │────│  Reverse Proxy  │
└─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐
                       │   React App     │
                       │   (Frontend)    │
                       └─────────────────┘
                                │
                       ┌─────────────────┐
                       │   Express API   │
                       │   (Backend)     │
                       └─────────────────┘
                                │
                    ┌─────────────────┐    ┌─────────────────┐
                    │   PostgreSQL    │    │     Redis       │
                    │   (Database)    │    │    (Cache)      │
                    └─────────────────┘    └─────────────────┘
```

### Service Dependencies
- **Frontend** → Backend API
- **Backend** → PostgreSQL + Redis
- **Nginx** → Frontend + Backend
- **SSL/TLS** → Let's Encrypt (optional)

### Resource Requirements

#### Minimum Requirements
- **CPU**: 2 cores
- **RAM**: 2GB
- **Storage**: 20GB SSD
- **Network**: 100 Mbps

#### Recommended Production
- **CPU**: 4 cores
- **RAM**: 4GB
- **Storage**: 50GB SSD
- **Network**: 1 Gbps

## Environment Configuration

### Production Environment Variables

Create and configure your `.env` file:

```bash
# Database Configuration
POSTGRES_DB=coupon_manager
POSTGRES_USER=coupon_user
POSTGRES_PASSWORD=your_secure_database_password_here
DATABASE_URL=postgresql://coupon_user:your_secure_database_password_here@db:5432/coupon_manager

# Redis Configuration
REDIS_PASSWORD=your_secure_redis_password_here
REDIS_URL=redis://:your_secure_redis_password_here@redis:6379

# JWT Configuration
JWT_SECRET=your_very_secure_jwt_secret_key_at_least_32_characters_long
JWT_REFRESH_SECRET=your_very_secure_jwt_refresh_secret_key_at_least_32_characters_long
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Application Configuration
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-domain.com
BACKEND_URL=https://your-domain.com/api

# SSL Configuration (optional)
DOMAIN_NAME=your-domain.com
SSL_EMAIL=admin@your-domain.com

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_REGISTRATION_MAX=5
RATE_LIMIT_LOGIN_MAX=10

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=json

# Backup Configuration
BACKUP_RETENTION_DAYS=30
BACKUP_SCHEDULE="0 2 * * *"

# Monitoring Configuration
HEALTH_CHECK_INTERVAL=30
METRICS_ENABLED=true
```

### Environment-Specific Configurations

#### Development
```bash
NODE_ENV=development
LOG_LEVEL=debug
RATE_LIMIT_MAX_REQUESTS=1000
```

#### Staging
```bash
NODE_ENV=staging
LOG_LEVEL=info
DOMAIN_NAME=staging.your-domain.com
```

#### Production
```bash
NODE_ENV=production
LOG_LEVEL=warn
RATE_LIMIT_MAX_REQUESTS=100
```

## Deployment Procedures

### Initial Deployment

1. **Server Preparation**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   
   # Reboot to apply group changes
   sudo reboot
   ```

2. **Application Setup**
   ```bash
   # Clone repository
   git clone <repository-url>
   cd family-coupon-manager
   
   # Configure environment
   cp .env.production .env
   nano .env  # Edit with your values
   
   # Make scripts executable
   chmod +x scripts/*.sh
   
   # Deploy application
   ./scripts/deploy.sh
   ```

3. **SSL Configuration** (if using domain)
   ```bash
   # Set up SSL certificates
   ./scripts/init-ssl.sh
   
   # Verify SSL configuration
   curl -I https://your-domain.com
   ```

4. **Verification**
   ```bash
   # Run comprehensive verification
   ./scripts/verify-deployment.sh
   
   # Check all services are running
   docker-compose ps
   ```

### Rolling Updates

For zero-downtime updates:

```bash
# 1. Pull latest code
git pull origin main

# 2. Create backup
./scripts/backup-db.sh

# 3. Deploy with health checks
./scripts/deploy.sh

# 4. Verify deployment
./scripts/verify-deployment.sh
```

### Rollback Procedure

If deployment fails:

```bash
# 1. Stop current deployment
docker-compose down

# 2. Checkout previous version
git checkout <previous-commit-hash>

# 3. Restore database if needed
./scripts/restore-db.sh ./backups/backup_before_deploy.sql.gz

# 4. Deploy previous version
./scripts/deploy.sh
```

## Monitoring and Maintenance

### System Monitoring

#### Automated Monitoring Script
```bash
# Run system health check
./scripts/monitor.sh

# Output includes:
# - Service status
# - Resource usage
# - Health checks
# - Recent errors
# - SSL certificate status
# - Backup status
```

#### Manual Health Checks
```bash
# Check service status
docker-compose ps

# Check service health
docker-compose exec backend curl -f http://localhost:3001/health
docker-compose exec frontend curl -f http://localhost:80/health

# Check database connectivity
docker-compose exec db pg_isready -U coupon_user -d coupon_manager

# Check Redis connectivity
docker-compose exec redis redis-cli -a $REDIS_PASSWORD ping
```

#### Log Monitoring
```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs nginx
docker-compose logs db
docker-compose logs redis

# Follow logs in real-time
docker-compose logs -f

# View recent errors
docker-compose logs --since="1h" | grep -i error
```

### Performance Monitoring

#### Resource Usage
```bash
# Container resource usage
docker stats

# System resource usage
htop
df -h
free -h
iostat -x 1
```

#### Database Performance
```bash
# Connect to database
docker-compose exec db psql -U coupon_user -d coupon_manager

# Check active connections
SELECT count(*) FROM pg_stat_activity;

# Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

# Check database size
SELECT pg_size_pretty(pg_database_size('coupon_manager'));

# Check table sizes
SELECT schemaname,tablename,pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### Application Metrics
```bash
# API response times (if metrics enabled)
curl -s http://localhost:3001/metrics | grep http_request_duration

# Cache hit rates
docker-compose exec redis redis-cli -a $REDIS_PASSWORD info stats
```

### Automated Maintenance

#### Set Up Cron Jobs
```bash
# Run the setup script
./scripts/setup-cron.sh

# Or manually add to crontab
sudo crontab -e

# Add these lines:
# Daily backup at 2 AM
0 2 * * * /path/to/family-coupon-manager/scripts/backup-db.sh

# SSL renewal check twice daily
0 12,0 * * * /path/to/family-coupon-manager/scripts/renew-ssl.sh

# System monitoring every 15 minutes
*/15 * * * * /path/to/family-coupon-manager/scripts/monitor.sh --cron

# Log cleanup weekly
0 3 * * 0 /path/to/family-coupon-manager/scripts/cleanup-logs.sh
```

#### Log Rotation
```bash
# Configure logrotate
sudo cp config/logrotate.conf /etc/logrotate.d/coupon-manager

# Test logrotate configuration
sudo logrotate -d /etc/logrotate.d/coupon-manager
```

## Backup and Recovery

### Backup Strategy

#### Automated Backups
```bash
# Daily backup (configured in cron)
./scripts/backup-db.sh

# Manual backup
./scripts/backup-db.sh --manual

# Backup with custom name
./scripts/backup-db.sh --name "before-major-update"
```

#### Backup Verification
```bash
# List all backups
ls -la ./backups/

# Verify backup integrity
./scripts/verify-backup.sh ./backups/latest_backup.sql.gz

# Test restore in development
./scripts/test-restore.sh ./backups/latest_backup.sql.gz
```

### Recovery Procedures

#### Database Recovery
```bash
# Stop application
docker-compose stop backend frontend

# Restore database
./scripts/restore-db.sh ./backups/backup_file.sql.gz

# Start application
docker-compose start backend frontend

# Verify restoration
./scripts/verify-deployment.sh
```

#### Full System Recovery
```bash
# 1. Restore from backup
git checkout <known-good-commit>
./scripts/restore-db.sh ./backups/backup_file.sql.gz

# 2. Rebuild and deploy
./scripts/deploy.sh

# 3. Verify system
./scripts/verify-deployment.sh
```

#### Point-in-Time Recovery
```bash
# If using PostgreSQL WAL archiving
# Restore to specific timestamp
./scripts/restore-pit.sh "2024-01-15 14:30:00"
```

### Off-site Backup

#### AWS S3 Integration
```bash
# Install AWS CLI
sudo apt install awscli

# Configure AWS credentials
aws configure

# Sync backups to S3
aws s3 sync ./backups/ s3://your-backup-bucket/coupon-manager/
```

#### Automated Off-site Backup
```bash
# Add to cron after local backup
5 2 * * * aws s3 sync /path/to/family-coupon-manager/backups/ s3://your-backup-bucket/coupon-manager/
```

## Troubleshooting

### Common Issues and Solutions

#### Service Won't Start
```bash
# Check service status
docker-compose ps

# Check logs for errors
docker-compose logs [service-name]

# Common solutions:
# 1. Check environment variables
cat .env

# 2. Check port conflicts
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443

# 3. Check disk space
df -h

# 4. Restart service
docker-compose restart [service-name]
```

#### Database Connection Issues
```bash
# Check database status
docker-compose exec db pg_isready -U coupon_user -d coupon_manager

# Check database logs
docker-compose logs db

# Common solutions:
# 1. Verify credentials in .env
# 2. Check database container health
docker-compose exec db ps aux

# 3. Reset database (WARNING: destroys data)
docker-compose down
docker volume rm $(docker volume ls -q | grep postgres)
docker-compose up -d db
```

#### SSL Certificate Issues
```bash
# Check certificate status
openssl x509 -in /etc/letsencrypt/live/yourdomain.com/cert.pem -text -noout

# Check certificate expiry
openssl x509 -in /etc/letsencrypt/live/yourdomain.com/cert.pem -noout -dates

# Renew certificate
./scripts/renew-ssl.sh

# Force certificate renewal
./scripts/init-ssl.sh --force
```

#### High Memory Usage
```bash
# Check container memory usage
docker stats

# Check system memory
free -h

# Solutions:
# 1. Restart high-memory containers
docker-compose restart backend

# 2. Adjust container memory limits in docker-compose.yml
# 3. Optimize database queries
# 4. Clear Redis cache
docker-compose exec redis redis-cli -a $REDIS_PASSWORD FLUSHALL
```

#### Performance Issues
```bash
# Check system load
uptime
iostat -x 1

# Check database performance
docker-compose exec db psql -U coupon_user -d coupon_manager -c "
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;"

# Solutions:
# 1. Optimize database
docker-compose exec db psql -U coupon_user -d coupon_manager -c "VACUUM ANALYZE;"

# 2. Clear application cache
docker-compose exec redis redis-cli -a $REDIS_PASSWORD FLUSHALL

# 3. Restart services
docker-compose restart
```

### Diagnostic Commands

#### System Diagnostics
```bash
# Comprehensive system check
./scripts/monitor.sh --detailed

# Check all service health
for service in backend frontend db redis nginx; do
  echo "Checking $service..."
  docker-compose exec $service echo "OK" || echo "FAILED"
done

# Check network connectivity
docker-compose exec backend curl -f http://db:5432 || echo "DB connection failed"
docker-compose exec backend curl -f http://redis:6379 || echo "Redis connection failed"
```

#### Application Diagnostics
```bash
# Check API endpoints
curl -f http://localhost/health
curl -f http://localhost/api/health

# Check database connectivity from backend
docker-compose exec backend npm run db:check

# Check Redis connectivity from backend
docker-compose exec backend npm run redis:check
```

## Security Operations

### Security Monitoring

#### Log Analysis
```bash
# Check for suspicious activity
grep -i "failed\|error\|unauthorized" /var/log/nginx/access.log

# Check authentication failures
docker-compose logs backend | grep -i "authentication failed"

# Check rate limiting
docker-compose logs nginx | grep -i "rate limit"
```

#### Security Scans
```bash
# Scan for vulnerabilities
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image family-coupon-manager_backend:latest

# Check SSL configuration
./scripts/check-ssl.sh

# Audit file permissions
find . -type f -perm /o+w -exec ls -l {} \;
```

### Security Updates

#### Container Updates
```bash
# Update base images
docker-compose pull

# Rebuild with latest security patches
docker-compose build --no-cache

# Deploy updates
./scripts/deploy.sh
```

#### System Updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Reboot if kernel updated
sudo reboot
```

### Access Control

#### User Management
```bash
# Add new system user
sudo adduser newuser
sudo usermod -aG docker newuser

# Remove user access
sudo deluser olduser docker
sudo userdel olduser
```

#### SSH Security
```bash
# Disable password authentication
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no

# Restart SSH
sudo systemctl restart ssh

# Configure fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

## Performance Optimization

### Database Optimization

#### Query Optimization
```sql
-- Connect to database
docker-compose exec db psql -U coupon_user -d coupon_manager

-- Enable query statistics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Analyze table statistics
ANALYZE;

-- Update table statistics
VACUUM ANALYZE;
```

#### Index Optimization
```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes 
ORDER BY idx_tup_read DESC;

-- Find missing indexes
SELECT schemaname, tablename, seq_tup_read
FROM pg_stat_user_tables 
WHERE seq_tup_read > 1000
ORDER BY seq_tup_read DESC;
```

### Application Optimization

#### Cache Optimization
```bash
# Check Redis memory usage
docker-compose exec redis redis-cli -a $REDIS_PASSWORD info memory

# Optimize Redis configuration
docker-compose exec redis redis-cli -a $REDIS_PASSWORD config set maxmemory-policy allkeys-lru

# Clear cache if needed
docker-compose exec redis redis-cli -a $REDIS_PASSWORD FLUSHALL
```

#### Container Optimization
```yaml
# Add to docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

### Network Optimization

#### Nginx Optimization
```nginx
# Add to nginx.conf
worker_processes auto;
worker_connections 1024;

# Enable gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript;

# Enable caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## Disaster Recovery

### Recovery Planning

#### Recovery Time Objectives (RTO)
- **Database Recovery**: < 30 minutes
- **Application Recovery**: < 15 minutes
- **Full System Recovery**: < 1 hour

#### Recovery Point Objectives (RPO)
- **Database**: < 24 hours (daily backups)
- **Configuration**: < 1 hour (version control)

### Disaster Scenarios

#### Server Failure
```bash
# 1. Provision new server
# 2. Install Docker and dependencies
# 3. Clone repository
git clone <repository-url>
cd family-coupon-manager

# 4. Restore configuration
cp .env.backup .env

# 5. Restore database
./scripts/restore-db.sh ./backups/latest_backup.sql.gz

# 6. Deploy application
./scripts/deploy.sh
```

#### Data Corruption
```bash
# 1. Stop application
docker-compose stop

# 2. Assess corruption extent
docker-compose exec db pg_dump -U coupon_user coupon_manager > corruption_check.sql

# 3. Restore from backup
./scripts/restore-db.sh ./backups/latest_good_backup.sql.gz

# 4. Restart application
docker-compose start
```

#### Security Breach
```bash
# 1. Immediate response
docker-compose down  # Stop all services

# 2. Assess damage
# Check logs for unauthorized access
grep -i "unauthorized\|failed" /var/log/nginx/access.log

# 3. Restore from clean backup
./scripts/restore-db.sh ./backups/pre_breach_backup.sql.gz

# 4. Update all secrets
# Generate new JWT secrets, database passwords, etc.

# 5. Deploy with new configuration
./scripts/deploy.sh

# 6. Monitor for continued threats
```

### Business Continuity

#### Maintenance Windows
- **Scheduled**: Sundays 2:00-4:00 AM
- **Emergency**: As needed with 1-hour notice
- **Updates**: Monthly security updates

#### Communication Plan
1. **Internal**: Slack/Email notifications
2. **Users**: Status page updates
3. **Stakeholders**: Email summaries

#### Documentation Updates
- Update this guide after major changes
- Maintain runbook for common procedures
- Document all configuration changes

---

This operations guide should be reviewed and updated quarterly to ensure accuracy and completeness.