# Family Coupon Manager - Backup and Recovery Procedures

## Table of Contents
- [Overview](#overview)
- [Backup Strategy](#backup-strategy)
- [Automated Backup Procedures](#automated-backup-procedures)
- [Manual Backup Procedures](#manual-backup-procedures)
- [Recovery Procedures](#recovery-procedures)
- [Disaster Recovery](#disaster-recovery)
- [Testing and Validation](#testing-and-validation)
- [Monitoring and Alerts](#monitoring-and-alerts)

## Overview

### Backup Objectives

- **Recovery Point Objective (RPO)**: Maximum 24 hours of data loss
- **Recovery Time Objective (RTO)**: Maximum 30 minutes downtime
- **Backup Retention**: 30 days of daily backups, 12 months of monthly backups
- **Backup Verification**: All backups tested for integrity

### What Gets Backed Up

1. **Database**: All user data, coupons, and audit logs
2. **Configuration**: Environment variables and settings
3. **SSL Certificates**: Let's Encrypt certificates and keys
4. **Application Code**: Current deployment version
5. **Logs**: Application and system logs (last 7 days)

### Backup Types

- **Full Backup**: Complete database dump (daily)
- **Incremental Backup**: Transaction logs (hourly, if enabled)
- **Configuration Backup**: Settings and certificates (daily)
- **Code Backup**: Git repository state (on deployment)

## Backup Strategy

### Backup Schedule

```
Daily Backups (2:00 AM):
├── Database full backup
├── Configuration backup
├── SSL certificates backup
└── Log files backup

Weekly Backups (Sunday 3:00 AM):
├── Full system backup
├── Docker images backup
└── Backup verification test

Monthly Backups (1st of month, 4:00 AM):
├── Archive monthly backup
├── Cleanup old backups
└── Disaster recovery test
```

### Backup Locations

1. **Local Storage**: `/opt/family-coupon-manager/backups/`
2. **Off-site Storage**: AWS S3, Google Cloud, or similar (optional)
3. **Archive Storage**: Long-term retention for monthly backups

### Backup Naming Convention

```
Database Backups:
coupon_manager_backup_YYYYMMDD_HHMMSS.sql.gz

Configuration Backups:
config_backup_YYYYMMDD_HHMMSS.tar.gz

Full System Backups:
system_backup_YYYYMMDD_HHMMSS.tar.gz

Archive Backups:
archive_YYYYMM_full_backup.tar.gz
```

## Automated Backup Procedures

### Setting Up Automated Backups

1. **Install Backup Scripts**
   ```bash
   # Scripts are included in the repository
   chmod +x scripts/backup-db.sh
   chmod +x scripts/backup-config.sh
   chmod +x scripts/backup-system.sh
   ```

2. **Configure Cron Jobs**
   ```bash
   # Run the setup script
   ./scripts/setup-cron.sh
   
   # Or manually add to crontab
   sudo crontab -e
   
   # Add these lines:
   # Daily database backup at 2:00 AM
   0 2 * * * /opt/family-coupon-manager/scripts/backup-db.sh
   
   # Daily configuration backup at 2:15 AM
   15 2 * * * /opt/family-coupon-manager/scripts/backup-config.sh
   
   # Weekly full backup on Sunday at 3:00 AM
   0 3 * * 0 /opt/family-coupon-manager/scripts/backup-system.sh
   
   # Monthly cleanup on 1st of month at 4:00 AM
   0 4 1 * * /opt/family-coupon-manager/scripts/cleanup-backups.sh
   ```

3. **Configure Backup Retention**
   ```bash
   # Edit .env file
   nano .env
   
   # Add backup configuration
   BACKUP_RETENTION_DAYS=30
   BACKUP_MONTHLY_RETENTION=12
   BACKUP_LOCATION=/opt/family-coupon-manager/backups
   BACKUP_OFFSITE_ENABLED=false
   BACKUP_S3_BUCKET=your-backup-bucket
   ```

### Database Backup Script

The `backup-db.sh` script performs the following:

1. **Pre-backup Checks**
   - Verify database connectivity
   - Check available disk space
   - Validate backup directory

2. **Backup Process**
   - Create compressed database dump
   - Verify backup integrity
   - Calculate backup checksum
   - Log backup completion

3. **Post-backup Tasks**
   - Clean up old backups
   - Update backup inventory
   - Send notifications (if configured)

### Configuration Backup Script

The `backup-config.sh` script backs up:

- Environment variables (`.env`)
- Docker Compose files
- Nginx configuration
- SSL certificates
- Application logs (last 7 days)

### System Backup Script

The `backup-system.sh` script creates:

- Complete database backup
- Configuration backup
- Docker images backup
- Application code snapshot
- System state information

## Manual Backup Procedures

### Creating Manual Database Backup

```bash
# Navigate to application directory
cd /opt/family-coupon-manager

# Create manual backup
./scripts/backup-db.sh --manual

# Create backup with custom name
./scripts/backup-db.sh --name "before-major-update"

# Create backup to specific location
./scripts/backup-db.sh --output /path/to/backup/location
```

### Creating Configuration Backup

```bash
# Backup current configuration
./scripts/backup-config.sh --manual

# Backup with description
./scripts/backup-config.sh --description "before-ssl-update"
```

### Creating Full System Backup

```bash
# Create complete system backup
./scripts/backup-system.sh --manual

# Create backup before major changes
./scripts/backup-system.sh --name "pre-deployment-$(date +%Y%m%d)"
```

### Verifying Backup Integrity

```bash
# Verify database backup
./scripts/verify-backup.sh /path/to/backup.sql.gz

# Test backup restoration (in test environment)
./scripts/test-restore.sh /path/to/backup.sql.gz

# Verify all recent backups
./scripts/verify-all-backups.sh
```

## Recovery Procedures

### Database Recovery

#### Complete Database Recovery

```bash
# 1. Stop application services
docker-compose stop backend frontend

# 2. Backup current database (if possible)
./scripts/backup-db.sh --name "before-recovery-$(date +%Y%m%d_%H%M%S)"

# 3. Restore from backup
./scripts/restore-db.sh /path/to/backup.sql.gz

# 4. Verify restoration
docker-compose exec db psql -U coupon_user -d coupon_manager -c "\dt"

# 5. Start application services
docker-compose start backend frontend

# 6. Verify application functionality
./scripts/verify-deployment.sh
```

#### Partial Database Recovery

```bash
# 1. Connect to database
docker-compose exec db psql -U coupon_user -d coupon_manager

# 2. Identify affected tables
\dt

# 3. Restore specific tables from backup
# (This requires manual SQL extraction from backup)

# 4. Verify data integrity
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM coupons;
```

### Configuration Recovery

```bash
# 1. Stop all services
docker-compose down

# 2. Restore configuration
./scripts/restore-config.sh /path/to/config_backup.tar.gz

# 3. Verify configuration
cat .env
docker-compose config

# 4. Start services
docker-compose up -d

# 5. Verify functionality
./scripts/verify-deployment.sh
```

### Full System Recovery

```bash
# 1. Stop all services
docker-compose down

# 2. Restore system backup
./scripts/restore-system.sh /path/to/system_backup.tar.gz

# 3. Verify restoration
docker-compose config
./scripts/verify-deployment.sh

# 4. Start services
docker-compose up -d

# 5. Comprehensive verification
./scripts/verify-deployment.sh --comprehensive
```

### Point-in-Time Recovery

If PostgreSQL WAL archiving is enabled:

```bash
# 1. Stop database
docker-compose stop db

# 2. Restore base backup
./scripts/restore-base-backup.sh /path/to/base_backup.tar.gz

# 3. Restore to specific time
./scripts/restore-pit.sh "2024-01-15 14:30:00"

# 4. Start database
docker-compose start db

# 5. Verify recovery
docker-compose exec db psql -U coupon_user -d coupon_manager -c "SELECT NOW();"
```

## Disaster Recovery

### Disaster Recovery Plan

#### Scenario 1: Server Hardware Failure

1. **Immediate Response**
   ```bash
   # Provision new server
   # Install Docker and dependencies
   # Clone application repository
   git clone <repository-url>
   cd family-coupon-manager
   ```

2. **Restore Application**
   ```bash
   # Restore configuration
   ./scripts/restore-config.sh /path/to/latest_config_backup.tar.gz
   
   # Restore database
   ./scripts/restore-db.sh /path/to/latest_db_backup.sql.gz
   
   # Deploy application
   ./scripts/deploy.sh
   ```

3. **Verify and Resume Service**
   ```bash
   # Comprehensive verification
   ./scripts/verify-deployment.sh --comprehensive
   
   # Update DNS if necessary
   # Notify users of service restoration
   ```

#### Scenario 2: Data Corruption

1. **Assess Damage**
   ```bash
   # Check database integrity
   docker-compose exec db psql -U coupon_user -d coupon_manager -c "
   SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del 
   FROM pg_stat_user_tables;"
   
   # Identify corruption extent
   ./scripts/check-data-integrity.sh
   ```

2. **Recovery Strategy**
   ```bash
   # Option A: Restore from latest backup
   ./scripts/restore-db.sh /path/to/latest_backup.sql.gz
   
   # Option B: Repair corruption (if possible)
   docker-compose exec db psql -U coupon_user -d coupon_manager -c "REINDEX DATABASE coupon_manager;"
   
   # Option C: Partial recovery from multiple backups
   ./scripts/partial-recovery.sh
   ```

#### Scenario 3: Security Breach

1. **Immediate Containment**
   ```bash
   # Stop all services
   docker-compose down
   
   # Isolate system
   sudo ufw deny incoming
   
   # Preserve evidence
   ./scripts/backup-logs.sh --security-incident
   ```

2. **Clean Recovery**
   ```bash
   # Restore from clean backup (before breach)
   ./scripts/restore-system.sh /path/to/clean_backup.tar.gz
   
   # Update all secrets
   # Generate new JWT secrets
   # Change all passwords
   # Rotate SSL certificates
   
   # Deploy with new configuration
   ./scripts/deploy.sh
   ```

3. **Security Hardening**
   ```bash
   # Update all components
   # Apply security patches
   # Review and update security configuration
   # Implement additional monitoring
   ```

### Recovery Time Estimates

| Scenario | Estimated Recovery Time |
|----------|------------------------|
| Database corruption | 15-30 minutes |
| Configuration loss | 10-15 minutes |
| Complete server failure | 1-2 hours |
| Security breach recovery | 2-4 hours |
| Partial data recovery | 30-60 minutes |

## Testing and Validation

### Backup Testing Schedule

- **Daily**: Automated backup integrity checks
- **Weekly**: Test database restoration in development environment
- **Monthly**: Full disaster recovery simulation
- **Quarterly**: Off-site backup verification

### Backup Validation Procedures

#### Daily Validation

```bash
# Automated validation (runs after each backup)
./scripts/validate-backup.sh /path/to/latest_backup.sql.gz

# Checks performed:
# - File integrity (checksum verification)
# - Backup completeness
# - Compression integrity
# - Backup size validation
```

#### Weekly Testing

```bash
# Test database restoration
./scripts/test-restore.sh /path/to/weekly_backup.sql.gz

# Verification steps:
# 1. Restore to test database
# 2. Verify table structure
# 3. Validate data integrity
# 4. Test application connectivity
# 5. Clean up test environment
```

#### Monthly Simulation

```bash
# Full disaster recovery simulation
./scripts/disaster-recovery-test.sh

# Simulation includes:
# 1. Complete system restoration
# 2. Configuration recovery
# 3. SSL certificate restoration
# 4. Application functionality testing
# 5. Performance validation
```

### Validation Checklist

#### Database Backup Validation
- [ ] Backup file exists and is not empty
- [ ] Checksum matches expected value
- [ ] Backup can be decompressed successfully
- [ ] SQL dump contains expected tables
- [ ] Data counts match source database
- [ ] Foreign key constraints are intact

#### Configuration Backup Validation
- [ ] All configuration files present
- [ ] Environment variables complete
- [ ] SSL certificates included
- [ ] Docker configurations valid
- [ ] Nginx configurations syntactically correct

#### System Backup Validation
- [ ] All components included
- [ ] Backup size within expected range
- [ ] Archive integrity verified
- [ ] Restoration test successful
- [ ] Application starts correctly after restoration

## Monitoring and Alerts

### Backup Monitoring

#### Automated Monitoring

```bash
# Monitor backup completion
./scripts/monitor-backups.sh

# Checks:
# - Backup completion status
# - Backup file sizes
# - Backup age
# - Available disk space
# - Backup integrity
```

#### Alert Conditions

1. **Backup Failure**
   - Backup script exits with error
   - Backup file not created
   - Backup integrity check fails

2. **Storage Issues**
   - Disk space below 20%
   - Backup directory not accessible
   - Off-site sync failures

3. **Retention Issues**
   - Old backups not cleaned up
   - Backup count exceeds limits
   - Archive process failures

### Notification Setup

#### Email Notifications

```bash
# Configure email notifications
nano .env

# Add email configuration
BACKUP_NOTIFICATIONS_ENABLED=true
BACKUP_NOTIFICATION_EMAIL=admin@yourdomain.com
SMTP_SERVER=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USERNAME=notifications@yourdomain.com
SMTP_PASSWORD=your_smtp_password
```

#### Slack Notifications

```bash
# Configure Slack webhook
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
SLACK_CHANNEL=#backups
```

### Log Management

#### Backup Logs

All backup operations are logged to:
- `/var/log/coupon-manager-backup.log`
- `/var/log/coupon-manager-restore.log`
- `/var/log/coupon-manager-cleanup.log`

#### Log Rotation

```bash
# Configure log rotation
sudo nano /etc/logrotate.d/coupon-manager-backups

# Add configuration:
/var/log/coupon-manager-*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}
```

## Best Practices

### Backup Best Practices

1. **Regular Testing**: Test backups regularly, not just when you need them
2. **Multiple Locations**: Store backups in multiple locations
3. **Encryption**: Encrypt sensitive backups
4. **Documentation**: Keep recovery procedures up to date
5. **Automation**: Automate as much as possible
6. **Monitoring**: Monitor backup success and failures
7. **Retention**: Follow appropriate retention policies
8. **Verification**: Always verify backup integrity

### Recovery Best Practices

1. **Stay Calm**: Follow procedures methodically
2. **Document**: Record all recovery steps taken
3. **Verify**: Always verify recovery before resuming service
4. **Communicate**: Keep stakeholders informed
5. **Learn**: Conduct post-incident reviews
6. **Update**: Update procedures based on lessons learned

### Security Considerations

1. **Access Control**: Limit access to backup files
2. **Encryption**: Encrypt backups containing sensitive data
3. **Secure Transfer**: Use secure methods for off-site transfers
4. **Audit Trail**: Maintain logs of backup and recovery operations
5. **Regular Updates**: Keep backup tools and scripts updated

---

## Emergency Contacts

### Internal Contacts
- **System Administrator**: [Contact Information]
- **Database Administrator**: [Contact Information]
- **Security Team**: [Contact Information]

### External Contacts
- **Hosting Provider**: [Contact Information]
- **Domain Registrar**: [Contact Information]
- **SSL Certificate Provider**: [Contact Information]

---

*This document should be reviewed and updated quarterly to ensure accuracy and completeness.*