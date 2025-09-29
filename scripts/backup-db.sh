#!/bin/bash

# Database backup script
# Creates compressed backups with timestamp

set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
fi

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="coupon_manager_backup_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Starting database backup..."

# Create backup
docker-compose exec -T db pg_dump \
    -U "${POSTGRES_USER:-coupon_user}" \
    -d "${POSTGRES_DB:-coupon_manager}" \
    --no-owner --no-privileges --clean --if-exists \
    | gzip > "$BACKUP_DIR/$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully: $BACKUP_DIR/$BACKUP_FILE"
    
    # Get backup size
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    echo "Backup size: $BACKUP_SIZE"
else
    echo "❌ Backup failed!"
    exit 1
fi

# Clean up old backups
echo "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "coupon_manager_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# List remaining backups
echo "Available backups:"
ls -lh "$BACKUP_DIR"/coupon_manager_backup_*.sql.gz 2>/dev/null || echo "No backups found"

echo "Database backup complete!"