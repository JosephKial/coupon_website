#!/bin/bash

# Renew SSL certificates
# This script should be run periodically (e.g., via cron)

set -e

echo "Renewing SSL certificates..."

# Renew certificates
docker-compose --profile ssl run --rm certbot renew

# Reload nginx to use new certificates
docker-compose exec nginx nginx -s reload

echo "SSL certificate renewal complete!"

# Test HTTPS
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
fi

if [ -n "$DOMAIN_NAME" ]; then
    echo "Testing HTTPS configuration..."
    if curl -f "https://$DOMAIN_NAME/health" > /dev/null 2>&1; then
        echo "✅ HTTPS is working correctly!"
    else
        echo "❌ HTTPS test failed. Check nginx logs:"
        docker-compose logs nginx
        exit 1
    fi
fi