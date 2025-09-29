# Family Coupon Manager - Deployment Guide

This guide provides step-by-step instructions for deploying the Family Coupon Manager application in production on Ubuntu Linux.

## Prerequisites

- Ubuntu 22.04 LTS server
- Docker and Docker Compose installed
- Domain name pointing to your server (for HTTPS)
- At least 2GB RAM and 20GB disk space
- Sudo access

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd family-coupon-manager
   ```

2. **Configure environment**
   ```bash
   cp .env.production .env
   # Edit .env with your production values
   nano .env
   ```

3. **Deploy the application**
   ```bash
   chmod +x scripts/*.sh
   ./scripts/deploy.sh
   ```

4. **Set up SSL (optional but recommended)**
   ```bash
   ./scripts/init-ssl.sh
   ```

5. **Verify deployment**
   ```bash
   ./scripts/verify-deployment.sh
   ```

## Detailed Setup Instructions

### 1. Server Preparation

Update your Ubuntu server:
```bash
sudo apt update && sudo apt upgrade -y
```

Install Docker:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

Install Docker Compose:
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Environment Configuration

Copy the production environment template:
```bash
cp .env.production .env
```

Edit the `.env` file with your production values:
```bash
nano .env
```

**Required Configuration:**
- `POSTGRES_PASSWORD`: Strong password for PostgreSQL
- `REDIS_PASSWORD`: Strong password for Redis
- `JWT_SECRET`: 32+ character secret for JWT tokens
- `JWT_REFRESH_SECRET`: 32+ character secret for refresh tokens
- `DOMAIN_NAME`: Your domain name (for SSL)
- `SSL_EMAIL`: Your email for Let's Encrypt

**Example:**
```env
POSTGRES_PASSWORD=your_very_secure_database_password_here
REDIS_PASSWORD=your_very_secure_redis_password_here
JWT_SECRET=your_very_secure_jwt_secret_key_at_least_32_characters_long
JWT_REFRESH_SECRET=your_very_secure_jwt_refresh_secret_key_at_least_32_characters_long
DOMAIN_NAME=coupons.yourdomain.com
SSL_EMAIL=admin@yourdomain.com
```

### 3. DNS Configuration

Point your domain to your server's IP address:
- Create an A record for your domain pointing to your server's IP
- Wait for DNS propagation (can take up to 24 hours)

### 4. Deployment

Make scripts executable:
```bash
chmod +x scripts/*.sh
```

Deploy the application:
```bash
./scripts/deploy.sh
```

This script will:
- Validate environment variables
- Create a database backup (if existing)
- Pull and build Docker images
- Start services in the correct order
- Run database migrations
- Perform health checks
- Clean up old images

### 5. SSL Certificate Setup

If you have a domain name configured, set up SSL:
```bash
./scripts/init-ssl.sh
```

This script will:
- Generate SSL certificates using Let's Encrypt
- Configure Nginx for HTTPS
- Set up HTTP to HTTPS redirects
- Test the SSL configuration

### 6. Verification

Verify your deployment:
```bash
./scripts/verify-deployment.sh
```

This will run comprehensive tests including:
- Connectivity tests
- API endpoint tests
- Database connectivity
- Security headers
- Performance tests
- SSL configuration (if enabled)

## Maintenance

### Database Backups

Create a backup:
```bash
./scripts/backup-db.sh
```

Restore from backup:
```bash
./scripts/restore-db.sh ./backups/coupon_manager_backup_YYYYMMDD_HHMMSS.sql.gz
```

### SSL Certificate Renewal

Renew SSL certificates:
```bash
./scripts/renew-ssl.sh
```

Set up automatic renewal with cron:
```bash
sudo crontab -e
# Add this line to run renewal twice daily:
0 12,0 * * * /path/to/your/app/scripts/renew-ssl.sh
```

### System Monitoring

Check system status:
```bash
./scripts/monitor.sh
```

View logs:
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs nginx

# Follow logs in real-time
docker-compose logs -f
```

### Updates

To update the application:
1. Pull latest code: `git pull`
2. Run deployment: `./scripts/deploy.sh`
3. Verify: `./scripts/verify-deployment.sh`

## Security Considerations

### Firewall Configuration

Configure UFW firewall:
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Regular Maintenance

1. **Keep system updated:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Monitor disk space:**
   ```bash
   df -h
   docker system prune -f
   ```

3. **Review logs regularly:**
   ```bash
   ./scripts/monitor.sh
   ```

4. **Test backups:**
   ```bash
   ./scripts/backup-db.sh
   # Test restore in development environment
   ```

## Troubleshooting

### Common Issues

**Services won't start:**
```bash
# Check service status
docker-compose ps

# Check logs
docker-compose logs [service-name]

# Restart services
docker-compose restart [service-name]
```

**Database connection issues:**
```bash
# Check database status
docker-compose exec db pg_isready -U coupon_user -d coupon_manager

# Reset database (WARNING: destroys data)
docker-compose down
docker volume rm $(docker volume ls -q | grep postgres)
docker-compose up -d
```

**SSL certificate issues:**
```bash
# Check certificate status
openssl x509 -in /etc/letsencrypt/live/yourdomain.com/cert.pem -text -noout

# Regenerate certificate
./scripts/init-ssl.sh
```

**Performance issues:**
```bash
# Check resource usage
docker stats

# Check system resources
./scripts/monitor.sh

# Optimize database
docker-compose exec db psql -U coupon_user -d coupon_manager -c "VACUUM ANALYZE;"
```

### Log Locations

- Application logs: `docker-compose logs`
- Nginx logs: `/var/log/nginx/` (if mounted)
- System logs: `/var/log/syslog`

### Getting Help

1. Check the logs: `docker-compose logs`
2. Run the monitor script: `./scripts/monitor.sh`
3. Verify deployment: `./scripts/verify-deployment.sh`
4. Check system resources: `df -h`, `free -h`, `top`

## Performance Optimization

### Database Optimization

```bash
# Connect to database
docker-compose exec db psql -U coupon_user -d coupon_manager

# Run maintenance
VACUUM ANALYZE;

# Check index usage
SELECT schemaname,tablename,attname,n_distinct,correlation FROM pg_stats;
```

### Nginx Optimization

Edit `nginx/nginx.conf` to adjust:
- Worker processes
- Connection limits
- Buffer sizes
- Caching settings

### Container Resource Limits

Edit `docker-compose.yml` to adjust resource limits:
```yaml
deploy:
  resources:
    limits:
      memory: 512M
    reservations:
      memory: 256M
```

## Backup Strategy

### Automated Backups

Set up automated backups with cron:
```bash
sudo crontab -e
# Add daily backup at 2 AM:
0 2 * * * /path/to/your/app/scripts/backup-db.sh
```

### Backup Retention

Backups are automatically cleaned up based on `BACKUP_RETENTION_DAYS` in your `.env` file (default: 30 days).

### Off-site Backups

Consider copying backups to remote storage:
```bash
# Example: Copy to S3
aws s3 cp ./backups/ s3://your-backup-bucket/coupon-manager/ --recursive
```

## Scaling Considerations

For high-traffic deployments:

1. **Database scaling:** Consider PostgreSQL read replicas
2. **Cache scaling:** Use Redis Cluster
3. **Load balancing:** Add multiple backend instances
4. **CDN:** Use CloudFlare or similar for static assets
5. **Monitoring:** Implement Prometheus + Grafana

## Support

For issues and questions:
1. Check this documentation
2. Review application logs
3. Run diagnostic scripts
4. Check GitHub issues (if applicable)