#!/bin/bash

# System monitoring script
# Checks health of all services and system resources

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Family Coupon Manager - System Monitor"
echo "========================================"

# Check if services are running
echo -e "\n📊 Service Status:"
services=("db" "redis" "backend" "frontend" "nginx")

for service in "${services[@]}"; do
    if docker-compose ps "$service" | grep -q "Up"; then
        echo -e "  ✅ $service: ${GREEN}Running${NC}"
    else
        echo -e "  ❌ $service: ${RED}Not Running${NC}"
    fi
done

# Health checks
echo -e "\n🏥 Health Checks:"

# Database health
if docker-compose exec -T db pg_isready > /dev/null 2>&1; then
    echo -e "  ✅ Database: ${GREEN}Healthy${NC}"
else
    echo -e "  ❌ Database: ${RED}Unhealthy${NC}"
fi

# Redis health
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo -e "  ✅ Redis: ${GREEN}Healthy${NC}"
else
    echo -e "  ❌ Redis: ${RED}Unhealthy${NC}"
fi

# Backend health
if docker-compose exec -T backend curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "  ✅ Backend API: ${GREEN}Healthy${NC}"
else
    echo -e "  ❌ Backend API: ${RED}Unhealthy${NC}"
fi

# Frontend health
if docker-compose exec -T frontend curl -f http://localhost:80/health > /dev/null 2>&1; then
    echo -e "  ✅ Frontend: ${GREEN}Healthy${NC}"
else
    echo -e "  ❌ Frontend: ${RED}Unhealthy${NC}"
fi

# Nginx health
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo -e "  ✅ Nginx: ${GREEN}Healthy${NC}"
else
    echo -e "  ❌ Nginx: ${RED}Unhealthy${NC}"
fi

# System resources
echo -e "\n💻 System Resources:"

# Docker stats
echo "  📈 Container Resource Usage:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | head -n 10

# Disk usage
echo -e "\n  💾 Disk Usage:"
df -h / | tail -n 1 | awk '{print "    Root: " $3 "/" $2 " (" $5 " used)"}'

# Docker volumes
echo -e "\n  📦 Docker Volume Usage:"
docker system df --format "table {{.Type}}\t{{.TotalCount}}\t{{.Size}}\t{{.Reclaimable}}"

# Log file sizes
echo -e "\n📝 Log File Sizes:"
if [ -d "/var/log/nginx" ]; then
    du -sh /var/log/nginx/* 2>/dev/null | head -5 || echo "    No nginx logs found"
fi

# Recent errors in logs
echo -e "\n🚨 Recent Errors (last 10):"
docker-compose logs --tail=100 2>/dev/null | grep -i error | tail -10 || echo "    No recent errors found"

# SSL certificate status (if configured)
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
fi

if [ -n "$DOMAIN_NAME" ] && [ -d "/etc/letsencrypt/live/$DOMAIN_NAME" ]; then
    echo -e "\n🔒 SSL Certificate Status:"
    cert_expiry=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$DOMAIN_NAME/cert.pem" 2>/dev/null | cut -d= -f2)
    if [ -n "$cert_expiry" ]; then
        echo "    Certificate expires: $cert_expiry"
        
        # Check if certificate expires in next 30 days
        if openssl x509 -checkend 2592000 -noout -in "/etc/letsencrypt/live/$DOMAIN_NAME/cert.pem" > /dev/null 2>&1; then
            echo -e "    Status: ${GREEN}Valid${NC}"
        else
            echo -e "    Status: ${YELLOW}Expires Soon${NC}"
        fi
    fi
fi

# Backup status
echo -e "\n💾 Backup Status:"
if [ -d "./backups" ]; then
    backup_count=$(ls -1 ./backups/coupon_manager_backup_*.sql.gz 2>/dev/null | wc -l)
    if [ "$backup_count" -gt 0 ]; then
        latest_backup=$(ls -t ./backups/coupon_manager_backup_*.sql.gz 2>/dev/null | head -1)
        backup_date=$(stat -c %y "$latest_backup" 2>/dev/null | cut -d' ' -f1)
        backup_size=$(du -h "$latest_backup" 2>/dev/null | cut -f1)
        echo "    Latest backup: $backup_date ($backup_size)"
        echo "    Total backups: $backup_count"
    else
        echo -e "    ${YELLOW}No backups found${NC}"
    fi
else
    echo -e "    ${YELLOW}Backup directory not found${NC}"
fi

echo -e "\n✅ Monitoring complete!"