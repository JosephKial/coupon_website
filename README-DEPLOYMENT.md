# Family Coupon Manager - Production Deployment

This document provides a quick reference for deploying and managing the Family Coupon Manager in production.

## Quick Commands

### Initial Deployment
```bash
# 1. Configure environment
cp .env.production .env
nano .env

# 2. Deploy application
./scripts/deploy.sh

# 3. Set up SSL (optional)
./scripts/init-ssl.sh

# 4. Verify deployment
./scripts/verify-deployment.sh

# 5. Set up automated maintenance
./scripts/setup-cron.sh
```

### Daily Operations
```bash
# Check system status
./scripts/monitor.sh

# Create backup
./scripts/backup-db.sh

# View logs
docker-compose logs -f

# Restart services
docker-compose restart [service-name]
```

### Maintenance
```bash
# Update application
git pull
./scripts/deploy.sh

# Renew SSL certificates
./scripts/renew-ssl.sh

# Restore from backup
./scripts/restore-db.sh ./backups/backup_file.sql.gz

# Clean up system
docker system prune -f
```

## File Structure

```
├── docker-compose.yml          # Main production compose file
├── docker-compose.prod.yml     # Production optimizations
├── .env.production            # Environment template
├── DEPLOYMENT.md              # Detailed deployment guide
├── backend/
│   └── Dockerfile            # Production backend image
├── frontend/
│   ├── Dockerfile            # Production frontend image
│   └── nginx.conf            # Frontend nginx config
├── nginx/
│   ├── nginx.conf            # Main nginx configuration
│   └── conf.d/
│       ├── default.conf      # HTTP/HTTPS proxy config
│       └── ssl.conf.template # SSL configuration template
├── scripts/
│   ├── deploy.sh             # Main deployment script
│   ├── backup-db.sh          # Database backup
│   ├── restore-db.sh         # Database restore
│   ├── init-ssl.sh           # SSL certificate setup
│   ├── renew-ssl.sh          # SSL certificate renewal
│   ├── monitor.sh            # System monitoring
│   ├── verify-deployment.sh  # Deployment verification
│   └── setup-cron.sh         # Automated maintenance setup
└── config/
    └── logrotate.conf        # Log rotation configuration
```

## Environment Variables

### Required
- `POSTGRES_PASSWORD` - Database password
- `REDIS_PASSWORD` - Redis password  
- `JWT_SECRET` - JWT signing secret (32+ chars)
- `JWT_REFRESH_SECRET` - JWT refresh secret (32+ chars)

### Optional
- `DOMAIN_NAME` - Your domain for SSL
- `SSL_EMAIL` - Email for Let's Encrypt
- `BACKUP_RETENTION_DAYS` - Backup retention (default: 30)
- `LOG_LEVEL` - Logging level (default: info)

## Service Ports

- **80** - HTTP (redirects to HTTPS in production)
- **443** - HTTPS (when SSL is configured)
- **5432** - PostgreSQL (internal only)
- **6379** - Redis (internal only)
- **3001** - Backend API (internal only)

## Health Checks

All services include health checks:
- **Database**: `pg_isready` command
- **Redis**: `redis-cli ping` command  
- **Backend**: `GET /health` endpoint
- **Frontend**: `GET /health` endpoint
- **Nginx**: `GET /health` endpoint

## Monitoring

The `monitor.sh` script provides:
- Service status checks
- Health check verification
- Resource usage monitoring
- Recent error detection
- SSL certificate status
- Backup status

## Security Features

- **HTTPS**: Automatic SSL with Let's Encrypt
- **Security Headers**: HSTS, CSP, X-Frame-Options, etc.
- **Rate Limiting**: API and authentication endpoints
- **Input Validation**: Server-side validation and sanitization
- **Container Security**: Non-root users, minimal images
- **Network Isolation**: Separate networks for frontend/backend

## Backup Strategy

- **Automated**: Daily backups via cron
- **Retention**: Configurable retention period
- **Compression**: Gzipped SQL dumps
- **Verification**: Backup integrity checks
- **Restoration**: Simple restore script

## Performance Optimizations

- **Database**: Optimized PostgreSQL configuration
- **Cache**: Redis with LRU eviction policy
- **Frontend**: Nginx with gzip compression and caching
- **Images**: Multi-stage Docker builds
- **Resources**: Container resource limits

## Troubleshooting

### Common Issues

1. **Services won't start**: Check `docker-compose logs`
2. **Database connection failed**: Verify credentials in `.env`
3. **SSL certificate failed**: Ensure DNS points to server
4. **High memory usage**: Check container resource limits
5. **Slow performance**: Run `./scripts/monitor.sh`

### Log Locations

- Application: `docker-compose logs [service]`
- Nginx: `/var/log/nginx/` (if mounted)
- Cron jobs: `/var/log/coupon-manager-*.log`
- System: `/var/log/syslog`

### Recovery Procedures

1. **Service failure**: `docker-compose restart [service]`
2. **Database corruption**: Restore from backup
3. **SSL expiry**: Run `./scripts/renew-ssl.sh`
4. **Disk full**: Clean up with `docker system prune -f`

## Support

For detailed instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

For issues:
1. Check service logs: `docker-compose logs`
2. Run diagnostics: `./scripts/monitor.sh`
3. Verify deployment: `./scripts/verify-deployment.sh`