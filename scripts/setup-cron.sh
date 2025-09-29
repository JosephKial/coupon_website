#!/bin/bash

# Setup cron jobs for automated maintenance
# This script configures automated backups and SSL renewal

set -e

# Get the absolute path to the application directory
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🕐 Setting up automated maintenance tasks..."
echo "Application directory: $APP_DIR"

# Load environment variables to get backup schedule
if [ -f "$APP_DIR/.env" ]; then
    export $(cat "$APP_DIR/.env" | grep -v '#' | awk '/=/ {print $1}')
fi

# Default backup schedule (daily at 2 AM)
BACKUP_SCHEDULE=${BACKUP_SCHEDULE:-"0 2 * * *"}

# Create temporary cron file
TEMP_CRON=$(mktemp)

# Get existing cron jobs (excluding our managed jobs)
crontab -l 2>/dev/null | grep -v "# Family Coupon Manager" > "$TEMP_CRON" || true

# Add our managed cron jobs
cat >> "$TEMP_CRON" << EOF

# Family Coupon Manager - Automated Tasks
# Database backup
$BACKUP_SCHEDULE $APP_DIR/scripts/backup-db.sh >> /var/log/coupon-manager-backup.log 2>&1

# SSL certificate renewal (twice daily)
0 12,0 * * * $APP_DIR/scripts/renew-ssl.sh >> /var/log/coupon-manager-ssl.log 2>&1

# System monitoring (every 6 hours)
0 */6 * * * $APP_DIR/scripts/monitor.sh >> /var/log/coupon-manager-monitor.log 2>&1

# Log rotation (daily at 1 AM)
0 1 * * * /usr/sbin/logrotate $APP_DIR/config/logrotate.conf --state $APP_DIR/config/logrotate.state

EOF

# Install the new cron jobs
crontab "$TEMP_CRON"

# Clean up
rm "$TEMP_CRON"

# Create log directory
sudo mkdir -p /var/log
sudo touch /var/log/coupon-manager-backup.log
sudo touch /var/log/coupon-manager-ssl.log
sudo touch /var/log/coupon-manager-monitor.log
sudo chown $USER:$USER /var/log/coupon-manager-*.log

# Set up logrotate
sudo cp "$APP_DIR/config/logrotate.conf" /etc/logrotate.d/coupon-manager

echo "✅ Cron jobs configured successfully!"
echo ""
echo "Scheduled tasks:"
echo "  - Database backup: $BACKUP_SCHEDULE"
echo "  - SSL renewal: Twice daily (12:00 and 00:00)"
echo "  - System monitoring: Every 6 hours"
echo "  - Log rotation: Daily at 01:00"
echo ""
echo "Log files:"
echo "  - Backup logs: /var/log/coupon-manager-backup.log"
echo "  - SSL logs: /var/log/coupon-manager-ssl.log"
echo "  - Monitor logs: /var/log/coupon-manager-monitor.log"
echo ""
echo "To view current cron jobs: crontab -l"
echo "To remove cron jobs: crontab -e (and delete the Family Coupon Manager section)"