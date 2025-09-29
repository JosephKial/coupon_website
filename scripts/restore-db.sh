#!/bin/bash

# Database restore script
# Restores database from backup file

set -e

# Check if backup file is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup_file>"
    echo "Available backups:"
    ls -1 ./backups/coupon_manager_backup_*.sql.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file '$BACKUP_FILE' not found"
    exit 1
fi

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
fi

echo "Restoring database from: $BACKUP_FILE"

# Confirm restoration
read -p "This will replace all existing data. Are you sure? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restoration cancelled"
    exit 0
fi

# Stop backend to prevent connections during restore
echo "Stopping backend service..."
docker-compose stop backend

# Wait a moment for connections to close
sleep 5

# Restore database
echo "Restoring database..."
gunzip -c "$BACKUP_FILE" | docker-compose exec -T db psql \
    -U "${POSTGRES_USER:-coupon_user}" \
    -d "${POSTGRES_DB:-coupon_manager}"

if [ $? -eq 0 ]; then
    echo "✅ Database restored successfully!"
else
    echo "❌ Database restoration failed!"
    exit 1
fi

# Restart backend
echo "Starting backend service..."
docker-compose start backend

# Wait for backend to be ready
echo "Waiting for backend to be ready..."
sleep 10

# Test database connection
if docker-compose exec backend curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Backend is running and database connection is working!"
else
    echo "❌ Backend health check failed. Check logs:"
    docker-compose logs backend
    exit 1
fi

echo "Database restoration complete!"