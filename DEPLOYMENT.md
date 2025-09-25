# Deployment Guide - Family Coupon Manager

This guide provides detailed instructions for deploying the Family Coupon Manager to production on Ubuntu Linux with automatic HTTPS.

## 🎯 Deployment Overview

The application uses a containerized architecture with:
- **Nginx Proxy**: Reverse proxy with automatic SSL
- **React Frontend**: Served by Nginx
- **FastAPI Backend**: Python API server
- **PostgreSQL**: Primary database
- **Redis**: Session storage and caching
- **Let's Encrypt**: Automatic SSL certificates

## 🖥️ Server Requirements

### Minimum Requirements
- **OS**: Ubuntu 20.04 LTS or newer
- **CPU**: 1 core (2+ recommended)
- **RAM**: 2GB (4GB+ recommended)
- **Storage**: 20GB (50GB+ recommended)
- **Network**: Public IP address
- **Domain**: Registered domain pointing to your server

### Recommended Setup
- **VPS/Cloud Instance**: DigitalOcean, AWS EC2, Linode, etc.
- **OS**: Ubuntu 22.04 LTS
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 50GB SSD
- **Bandwidth**: Unmetered or generous allowance

## 🔧 Server Preparation

### 1. Initial Server Setup

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git ufw fail2ban

# Create non-root user (if not exists)
sudo adduser coupon-admin
sudo usermod -aG sudo coupon-admin

# Switch to non-root user
su - coupon-admin
```

### 2. Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version

# Log out and back in for group changes
exit
su - coupon-admin
```

### 3. Configure Firewall

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (adjust port if needed)
sudo ufw allow 22

# Allow HTTP and HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Check status
sudo ufw status
```

### 4. Configure Fail2Ban

```bash
# Create jail configuration
sudo tee /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
backend = %(sshd_backend)s

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
EOF

# Restart fail2ban
sudo systemctl restart fail2ban
```

## 📦 Application Deployment

### 1. Download Application

```bash
# Create application directory
mkdir -p ~/apps
cd ~/apps

# Clone repository (replace with your repository URL)
git clone <your-repository-url> coupon-manager
cd coupon-manager

# Or if using uploaded files
# Upload your application files to ~/apps/coupon-manager/
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit environment file
nano .env
```

**Important Environment Variables:**

```env
# Database - Use a strong password
DB_PASSWORD=your_very_secure_database_password_2024

# Redis - Use a strong password
REDIS_PASSWORD=your_very_secure_redis_password_2024

# JWT Secret - Generate a random 32+ character string
SECRET_KEY=your-super-secret-jwt-key-at-least-32-characters-long

# Domain Configuration
DOMAIN=yourdomain.com
SSL_EMAIL=admin@yourdomain.com

# Security Settings
ENVIRONMENT=production
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**Generate Secure Secrets:**
```bash
# Generate SECRET_KEY
openssl rand -hex 32

# Generate passwords
openssl rand -base64 32
```

### 3. Configure Domain

Before deployment, ensure your domain is properly configured:

```bash
# Check DNS resolution
nslookup yourdomain.com
dig yourdomain.com A

# Should return your server's IP address
```

**DNS Configuration:**
- Create an A record pointing `yourdomain.com` to your server IP
- Create an A record pointing `www.yourdomain.com` to your server IP
- Allow 24-48 hours for DNS propagation

### 4. Deploy Application

```bash
# Pull latest Docker images
docker-compose pull

# Build and start services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### 5. Initialize Application

```bash
# Wait for services to be healthy
sleep 30

# Create sample users and coupons
docker-compose exec backend python utils/seed_data.py

# Verify deployment
curl -k https://yourdomain.com/health
```

## 🔍 Verification Steps

### 1. Health Checks

```bash
# Check all containers
docker-compose ps

# Should show all services as "Up" and "healthy"
# If any service shows "unhealthy", check logs:
docker-compose logs [service-name]
```

### 2. SSL Certificate

```bash
# Check SSL certificate
curl -I https://yourdomain.com

# Should return HTTP 200 with security headers
# Check certificate details
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

### 3. Application Access

1. **Website**: https://yourdomain.com
2. **Login**: Use seed data credentials
3. **API Health**: https://yourdomain.com/health
4. **API Docs**: https://yourdomain.com/api/docs (if enabled)

## 🔧 Production Hardening

### 1. Security Headers

Verify security headers are present:
```bash
curl -I https://yourdomain.com

# Should include:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY  
# X-XSS-Protection: 1; mode=block
# Strict-Transport-Security: max-age=31536000
```

### 2. SSL Configuration

Test SSL configuration:
```bash
# Test SSL Labs (online tool)
# Visit: https://www.ssllabs.com/ssltest/
# Enter your domain for comprehensive SSL analysis
```

### 3. Performance Optimization

```bash
# Enable log compression
sudo tee /etc/logrotate.d/docker-containers << EOF
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size=1M
    missingok
    delaycompress
    copytruncate
}
EOF
```

## 📊 Monitoring Setup

### 1. Log Monitoring

```bash
# Create log monitoring script
sudo tee /usr/local/bin/check-coupon-app << EOF
#!/bin/bash
cd ~/apps/coupon-manager

# Check container health
if ! docker-compose ps | grep -q "Up.*healthy"; then
    echo "WARNING: Some containers are not healthy"
    docker-compose ps
    exit 1
fi

# Check disk space
DISK_USAGE=\$(df / | awk 'NR==2{printf "%.1f", \$5}' | sed 's/%//')
if (( \$(echo "\$DISK_USAGE > 90" | bc -l) )); then
    echo "WARNING: Disk usage is \${DISK_USAGE}%"
    exit 1
fi

echo "All systems healthy"
exit 0
EOF

sudo chmod +x /usr/local/bin/check-coupon-app

# Test the script
/usr/local/bin/check-coupon-app
```

### 2. Automated Monitoring

```bash
# Add cron job for monitoring
crontab -e

# Add this line to check every 5 minutes:
*/5 * * * * /usr/local/bin/check-coupon-app >> /var/log/coupon-app-check.log 2>&1
```

## 🔄 Maintenance & Updates

### 1. Regular Updates

```bash
# Update system packages monthly
sudo apt update && sudo apt upgrade -y

# Update Docker images monthly
cd ~/apps/coupon-manager
docker-compose pull
docker-compose up -d --build

# Clean up old images
docker image prune -f
```

### 2. Backup Strategy

```bash
# Create backup script
sudo tee /usr/local/bin/backup-coupon-app << EOF
#!/bin/bash
BACKUP_DIR="/home/coupon-admin/backups"
DATE=\$(date +%Y%m%d_%H%M%S)
APP_DIR="/home/coupon-admin/apps/coupon-manager"

mkdir -p \$BACKUP_DIR

cd \$APP_DIR

# Backup database
docker-compose exec -T database pg_dump -U coupon_user coupon_db | gzip > "\$BACKUP_DIR/database_\$DATE.sql.gz"

# Backup environment files
tar -czf "\$BACKUP_DIR/config_\$DATE.tar.gz" .env docker-compose.yml

# Backup user uploads (if any)
if [ -d "uploads" ]; then
    tar -czf "\$BACKUP_DIR/uploads_\$DATE.tar.gz" uploads/
fi

# Clean old backups (keep last 7 days)
find \$BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: \$DATE"
EOF

sudo chmod +x /usr/local/bin/backup-coupon-app

# Add to crontab for daily backups
crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-coupon-app >> /var/log/coupon-app-backup.log 2>&1
```

### 3. SSL Certificate Renewal

Let's Encrypt certificates auto-renew, but you can force renewal:

```bash
# Check certificate expiry
docker-compose exec letsencrypt certbot certificates

# Force renewal (if needed)
docker-compose exec letsencrypt certbot renew --force-renewal
docker-compose restart proxy
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Services Won't Start
```bash
# Check logs
docker-compose logs

# Common fixes:
# - Check .env file syntax
# - Ensure ports 80/443 are available
# - Verify file permissions
sudo chown -R $USER:$USER ~/apps/coupon-manager
```

#### 2. SSL Certificate Issues
```bash
# Check domain DNS
nslookup yourdomain.com

# Check certificate logs
docker-compose logs letsencrypt

# Common fixes:
# - Verify domain points to server
# - Check firewall allows ports 80/443
# - Ensure no other services using ports
```

#### 3. Database Connection Issues
```bash
# Check database logs
docker-compose logs database

# Reset database (DANGER: loses data)
docker-compose down
docker volume rm coupon-manager_postgres_data
docker-compose up -d
```

#### 4. Performance Issues
```bash
# Check resource usage
docker stats

# Check disk space
df -h

# Check memory usage
free -h

# Increase Docker resources if needed
```

### Log Locations

```bash
# Application logs
docker-compose logs -f backend
docker-compose logs -f frontend  
docker-compose logs -f proxy
docker-compose logs -f database

# System logs
sudo journalctl -u docker
sudo tail -f /var/log/syslog
```

## 📞 Emergency Procedures

### 1. Quick Restart
```bash
cd ~/apps/coupon-manager
docker-compose restart
```

### 2. Full Reset (DANGER)
```bash
cd ~/apps/coupon-manager
docker-compose down
docker system prune -f
docker volume prune -f
docker-compose up -d
```

### 3. Rollback
```bash
# If you have a backup
cd ~/apps/coupon-manager
docker-compose down

# Restore database
zcat /home/coupon-admin/backups/database_YYYYMMDD_HHMMSS.sql.gz | docker-compose exec -T database psql -U coupon_user coupon_db

# Restore config
tar -xzf /home/coupon-admin/backups/config_YYYYMMDD_HHMMSS.tar.gz

docker-compose up -d
```

## ✅ Production Checklist

- [ ] Server hardened (firewall, fail2ban, non-root user)
- [ ] Domain DNS configured correctly
- [ ] Environment variables set securely
- [ ] All services started and healthy
- [ ] SSL certificate obtained and valid
- [ ] Security headers present
- [ ] Application accessible via HTTPS
- [ ] Default passwords changed
- [ ] Monitoring and alerting configured
- [ ] Backup strategy implemented
- [ ] Documentation updated

## 🎉 Success!

Your Family Coupon Manager is now deployed and secure! 

**Next Steps:**
1. Change all default passwords
2. Create your family user accounts
3. Start managing your coupons
4. Set up regular backups
5. Monitor application health

**Access Your Application:**
- Website: https://yourdomain.com
- Health Check: https://yourdomain.com/health

---

**Need help?** Check the troubleshooting section or review the logs for specific error messages.