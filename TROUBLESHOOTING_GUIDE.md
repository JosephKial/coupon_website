# Family Coupon Manager - Troubleshooting Guide

## Table of Contents
- [Quick Diagnostics](#quick-diagnostics)
- [Service-Specific Issues](#service-specific-issues)
- [Database Issues](#database-issues)
- [Network and Connectivity](#network-and-connectivity)
- [Performance Issues](#performance-issues)
- [Security Issues](#security-issues)
- [SSL/TLS Issues](#ssltls-issues)
- [Common Error Messages](#common-error-messages)
- [Recovery Procedures](#recovery-procedures)

## Quick Diagnostics

### First Steps for Any Issue

1. **Check Service Status**
   ```bash
   docker-compose ps
   ```

2. **Run System Monitor**
   ```bash
   ./scripts/monitor.sh
   ```

3. **Check Recent Logs**
   ```bash
   docker-compose logs --tail=50
   ```

4. **Verify System Resources**
   ```bash
   df -h          # Disk space
   free -h        # Memory usage
   docker stats   # Container resources
   ```

### Quick Health Check

```bash
# All-in-one health check
curl -f http://localhost/health && echo "✅ Frontend OK" || echo "❌ Frontend Failed"
curl -f http://localhost/api/health && echo "✅ Backend OK" || echo "❌ Backend Failed"
docker-compose exec db pg_isready -U coupon_user -d coupon_manager && echo "✅ Database OK" || echo "❌ Database Failed"
docker-compose exec redis redis-cli -a $REDIS_PASSWORD ping && echo "✅ Redis OK" || echo "❌ Redis Failed"
```

## Service-Specific Issues

### Frontend Issues

#### Symptom: Frontend not loading
```bash
# Check frontend container status
docker-compose ps frontend

# Check frontend logs
docker-compose logs frontend

# Check nginx configuration
docker-compose exec nginx nginx -t

# Common solutions:
# 1. Restart frontend
docker-compose restart frontend

# 2. Check nginx configuration
docker-compose exec nginx cat /etc/nginx/conf.d/default.conf

# 3. Rebuild frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

#### Symptom: API calls failing from frontend
```bash
# Check backend connectivity from frontend
docker-compose exec frontend curl -f http://backend:3001/health

# Check CORS configuration
docker-compose logs backend | grep -i cors

# Check environment variables
docker-compose exec frontend env | grep VITE_API_URL
```

### Backend Issues

#### Symptom: Backend API not responding
```bash
# Check backend container status
docker-compose ps backend

# Check backend logs
docker-compose logs backend

# Check backend health endpoint
docker-compose exec backend curl -f http://localhost:3001/health

# Common solutions:
# 1. Check environment variables
docker-compose exec backend env | grep -E "(DATABASE_URL|REDIS_URL|JWT_SECRET)"

# 2. Restart backend
docker-compose restart backend

# 3. Check database connectivity
docker-compose exec backend npm run db:check
```

#### Symptom: Authentication not working
```bash
# Check JWT configuration
docker-compose exec backend node -e "console.log(process.env.JWT_SECRET?.length || 'NOT SET')"

# Check Redis connectivity
docker-compose exec backend npm run redis:check

# Check authentication logs
docker-compose logs backend | grep -i "auth\|jwt\|token"

# Test authentication endpoint
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'
```

### Database Issues

#### Symptom: Database connection refused
```bash
# Check database container status
docker-compose ps db

# Check database logs
docker-compose logs db

# Check database connectivity
docker-compose exec db pg_isready -U coupon_user -d coupon_manager

# Common solutions:
# 1. Check database credentials
echo $POSTGRES_PASSWORD

# 2. Restart database
docker-compose restart db

# 3. Check database initialization
docker-compose exec db psql -U coupon_user -d coupon_manager -c "\dt"
```

#### Symptom: Database queries slow
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

# Solutions:
# 1. Analyze and vacuum
VACUUM ANALYZE;

# 2. Check for missing indexes
SELECT schemaname, tablename, seq_tup_read
FROM pg_stat_user_tables 
WHERE seq_tup_read > 1000
ORDER BY seq_tup_read DESC;

# 3. Restart database
docker-compose restart db
```

### Redis Issues

#### Symptom: Redis connection failed
```bash
# Check Redis container status
docker-compose ps redis

# Check Redis logs
docker-compose logs redis

# Test Redis connectivity
docker-compose exec redis redis-cli -a $REDIS_PASSWORD ping

# Common solutions:
# 1. Check Redis password
echo $REDIS_PASSWORD

# 2. Restart Redis
docker-compose restart redis

# 3. Clear Redis data (if corrupted)
docker-compose exec redis redis-cli -a $REDIS_PASSWORD FLUSHALL
```

#### Symptom: High Redis memory usage
```bash
# Check Redis memory usage
docker-compose exec redis redis-cli -a $REDIS_PASSWORD info memory

# Check Redis configuration
docker-compose exec redis redis-cli -a $REDIS_PASSWORD config get maxmemory*

# Solutions:
# 1. Set memory limit and eviction policy
docker-compose exec redis redis-cli -a $REDIS_PASSWORD config set maxmemory 256mb
docker-compose exec redis redis-cli -a $REDIS_PASSWORD config set maxmemory-policy allkeys-lru

# 2. Clear cache
docker-compose exec redis redis-cli -a $REDIS_PASSWORD FLUSHALL
```

### Nginx Issues

#### Symptom: Nginx not starting
```bash
# Check nginx container status
docker-compose ps nginx

# Check nginx logs
docker-compose logs nginx

# Test nginx configuration
docker-compose exec nginx nginx -t

# Common solutions:
# 1. Check configuration syntax
docker-compose exec nginx nginx -T

# 2. Check port conflicts
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443

# 3. Restart nginx
docker-compose restart nginx
```

#### Symptom: 502 Bad Gateway
```bash
# Check upstream services
curl -f http://localhost:3001/health  # Backend
curl -f http://localhost:5173/health  # Frontend (dev)

# Check nginx upstream configuration
docker-compose exec nginx cat /etc/nginx/conf.d/default.conf

# Check nginx error logs
docker-compose logs nginx | grep error

# Solutions:
# 1. Restart upstream services
docker-compose restart backend frontend

# 2. Check service discovery
docker-compose exec nginx nslookup backend
docker-compose exec nginx nslookup frontend
```

## Database Issues

### Migration Issues

#### Symptom: Migration failed
```bash
# Check migration status
docker-compose exec backend npx prisma migrate status

# Check migration logs
docker-compose logs backend | grep -i migrate

# Solutions:
# 1. Reset migration state (development only)
docker-compose exec backend npx prisma migrate reset

# 2. Force migration (production)
docker-compose exec backend npx prisma migrate deploy

# 3. Manual migration
docker-compose exec db psql -U coupon_user -d coupon_manager -f /path/to/migration.sql
```

### Data Corruption

#### Symptom: Database corruption detected
```bash
# Check database integrity
docker-compose exec db psql -U coupon_user -d coupon_manager -c "
SELECT datname, pg_size_pretty(pg_database_size(datname)) 
FROM pg_database 
WHERE datname = 'coupon_manager';"

# Check for corruption
docker-compose exec db psql -U coupon_user -d coupon_manager -c "
SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del 
FROM pg_stat_user_tables;"

# Solutions:
# 1. Restore from backup
./scripts/restore-db.sh ./backups/latest_backup.sql.gz

# 2. Repair corruption (if possible)
docker-compose exec db psql -U coupon_user -d coupon_manager -c "REINDEX DATABASE coupon_manager;"
```

### Connection Pool Issues

#### Symptom: Too many database connections
```bash
# Check active connections
docker-compose exec db psql -U coupon_user -d coupon_manager -c "
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';"

# Check connection limits
docker-compose exec db psql -U coupon_user -d coupon_manager -c "SHOW max_connections;"

# Solutions:
# 1. Restart backend to reset connections
docker-compose restart backend

# 2. Kill idle connections
docker-compose exec db psql -U coupon_user -d coupon_manager -c "
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' AND state_change < now() - interval '1 hour';"
```

## Network and Connectivity

### Port Conflicts

#### Symptom: Port already in use
```bash
# Check what's using the port
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443
sudo netstat -tulpn | grep :3000

# Find process using port
sudo lsof -i :80

# Solutions:
# 1. Kill conflicting process
sudo kill -9 <PID>

# 2. Change port in docker-compose.yml
# 3. Stop conflicting service
sudo systemctl stop apache2  # Example
```

### DNS Issues

#### Symptom: Domain not resolving
```bash
# Check DNS resolution
nslookup your-domain.com
dig your-domain.com

# Check from container
docker-compose exec nginx nslookup your-domain.com

# Solutions:
# 1. Update DNS records
# 2. Clear DNS cache
sudo systemctl flush-dns

# 3. Use IP address temporarily
curl -H "Host: your-domain.com" http://your-server-ip/
```

### Firewall Issues

#### Symptom: External access blocked
```bash
# Check firewall status
sudo ufw status

# Check iptables rules
sudo iptables -L

# Solutions:
# 1. Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 2. Check cloud provider security groups
# 3. Temporarily disable firewall for testing
sudo ufw disable  # Re-enable after testing!
```

## Performance Issues

### High CPU Usage

#### Symptom: System running slow
```bash
# Check CPU usage
top
htop
docker stats

# Check which container is using CPU
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Solutions:
# 1. Restart high-CPU containers
docker-compose restart <container-name>

# 2. Check for infinite loops in logs
docker-compose logs backend | grep -i error

# 3. Scale down if needed
docker-compose up -d --scale backend=1
```

### High Memory Usage

#### Symptom: Out of memory errors
```bash
# Check memory usage
free -h
docker stats

# Check container memory limits
docker-compose exec backend cat /sys/fs/cgroup/memory/memory.limit_in_bytes

# Solutions:
# 1. Restart memory-heavy containers
docker-compose restart backend

# 2. Clear caches
docker-compose exec redis redis-cli -a $REDIS_PASSWORD FLUSHALL

# 3. Add memory limits to docker-compose.yml
```

### Slow Database Queries

#### Symptom: API responses slow
```bash
# Check slow queries
docker-compose exec db psql -U coupon_user -d coupon_manager -c "
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;"

# Check database locks
docker-compose exec db psql -U coupon_user -d coupon_manager -c "
SELECT blocked_locks.pid AS blocked_pid,
       blocked_activity.usename AS blocked_user,
       blocking_locks.pid AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query AS blocked_statement,
       blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;"

# Solutions:
# 1. Analyze and vacuum
docker-compose exec db psql -U coupon_user -d coupon_manager -c "VACUUM ANALYZE;"

# 2. Add missing indexes
# 3. Restart database
docker-compose restart db
```

## Security Issues

### Authentication Failures

#### Symptom: Users can't log in
```bash
# Check authentication logs
docker-compose logs backend | grep -i "auth\|login\|jwt"

# Test authentication endpoint
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'

# Check JWT configuration
docker-compose exec backend node -e "
console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length || 'NOT SET');
console.log('JWT_REFRESH_SECRET length:', process.env.JWT_REFRESH_SECRET?.length || 'NOT SET');
"

# Solutions:
# 1. Check environment variables
# 2. Restart backend
docker-compose restart backend

# 3. Clear Redis sessions
docker-compose exec redis redis-cli -a $REDIS_PASSWORD FLUSHALL
```

### Rate Limiting Issues

#### Symptom: Requests being blocked
```bash
# Check rate limiting logs
docker-compose logs nginx | grep -i "rate limit"
docker-compose logs backend | grep -i "rate limit"

# Check current rate limits
curl -I http://localhost/api/auth/login

# Solutions:
# 1. Adjust rate limits in configuration
# 2. Whitelist IP addresses
# 3. Clear rate limit cache
docker-compose exec redis redis-cli -a $REDIS_PASSWORD FLUSHALL
```

### Suspicious Activity

#### Symptom: Unusual traffic patterns
```bash
# Check access logs
docker-compose logs nginx | grep -E "(40[0-9]|50[0-9])"

# Check for failed authentication attempts
docker-compose logs backend | grep -i "authentication failed"

# Check for unusual API usage
docker-compose logs backend | grep -E "(POST|PUT|DELETE)" | tail -50

# Solutions:
# 1. Block suspicious IPs
# 2. Increase rate limiting
# 3. Review and rotate secrets
```

## SSL/TLS Issues

### Certificate Issues

#### Symptom: SSL certificate expired or invalid
```bash
# Check certificate status
openssl x509 -in /etc/letsencrypt/live/yourdomain.com/cert.pem -text -noout

# Check certificate expiry
openssl x509 -in /etc/letsencrypt/live/yourdomain.com/cert.pem -noout -dates

# Check certificate from external
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates

# Solutions:
# 1. Renew certificate
./scripts/renew-ssl.sh

# 2. Force certificate renewal
./scripts/init-ssl.sh --force

# 3. Check DNS configuration
nslookup yourdomain.com
```

### HTTPS Redirect Issues

#### Symptom: HTTP not redirecting to HTTPS
```bash
# Test HTTP redirect
curl -I http://yourdomain.com

# Check nginx configuration
docker-compose exec nginx cat /etc/nginx/conf.d/default.conf

# Solutions:
# 1. Update nginx configuration
# 2. Restart nginx
docker-compose restart nginx

# 3. Check SSL certificate installation
```

## Common Error Messages

### "Connection refused"
```bash
# Cause: Service not running or wrong port
# Check: docker-compose ps
# Solution: docker-compose restart <service>
```

### "No such file or directory"
```bash
# Cause: Missing files or incorrect paths
# Check: File permissions and paths
# Solution: Verify file locations and permissions
```

### "Permission denied"
```bash
# Cause: Incorrect file permissions
# Check: ls -la
# Solution: chmod +x scripts/*.sh
```

### "Port already in use"
```bash
# Cause: Another service using the port
# Check: sudo netstat -tulpn | grep :<port>
# Solution: Kill conflicting process or change port
```

### "Out of memory"
```bash
# Cause: Insufficient memory
# Check: free -h && docker stats
# Solution: Add memory limits or increase server memory
```

### "Database connection failed"
```bash
# Cause: Database not running or wrong credentials
# Check: docker-compose ps db && echo $POSTGRES_PASSWORD
# Solution: Restart database or fix credentials
```

### "SSL certificate verification failed"
```bash
# Cause: Invalid or expired SSL certificate
# Check: openssl x509 -in cert.pem -noout -dates
# Solution: Renew certificate with ./scripts/renew-ssl.sh
```

## Recovery Procedures

### Emergency Recovery

#### Complete System Failure
```bash
# 1. Stop all services
docker-compose down

# 2. Check system resources
df -h && free -h

# 3. Restore from backup
./scripts/restore-db.sh ./backups/latest_backup.sql.gz

# 4. Deploy fresh
./scripts/deploy.sh

# 5. Verify system
./scripts/verify-deployment.sh
```

#### Data Loss Recovery
```bash
# 1. Stop application
docker-compose stop backend frontend

# 2. Assess data loss
docker-compose exec db psql -U coupon_user -d coupon_manager -c "\dt"

# 3. Restore from most recent backup
./scripts/restore-db.sh ./backups/latest_backup.sql.gz

# 4. Restart application
docker-compose start backend frontend

# 5. Verify data integrity
./scripts/verify-deployment.sh
```

### Rollback Procedures

#### Application Rollback
```bash
# 1. Identify last known good version
git log --oneline -10

# 2. Checkout previous version
git checkout <commit-hash>

# 3. Restore database if needed
./scripts/restore-db.sh ./backups/backup_before_update.sql.gz

# 4. Deploy previous version
./scripts/deploy.sh
```

#### Configuration Rollback
```bash
# 1. Restore previous configuration
cp .env.backup .env

# 2. Restart services
docker-compose restart

# 3. Verify configuration
./scripts/verify-deployment.sh
```

### Prevention Strategies

1. **Regular Backups**: Automated daily backups
2. **Monitoring**: Continuous health monitoring
3. **Testing**: Regular deployment testing
4. **Documentation**: Keep troubleshooting steps updated
5. **Alerts**: Set up alerts for critical issues

---

## Getting Help

If you can't resolve an issue using this guide:

1. **Gather Information**:
   ```bash
   # Run diagnostics
   ./scripts/monitor.sh --detailed > diagnostics.txt
   
   # Collect logs
   docker-compose logs > application.log
   
   # System information
   uname -a > system.info
   docker version >> system.info
   docker-compose version >> system.info
   ```

2. **Check Documentation**:
   - [Deployment Guide](DEPLOYMENT.md)
   - [Operations Guide](OPERATIONS_GUIDE.md)
   - [Developer Guide](DEVELOPER_GUIDE.md)

3. **Contact Support**:
   - Include diagnostic information
   - Describe steps taken to resolve
   - Provide error messages and logs

Remember: When in doubt, check the logs first!