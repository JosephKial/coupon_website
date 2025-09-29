#!/bin/bash

# Initialize SSL certificates with Let's Encrypt
# This script should be run after the initial deployment

set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
fi

# Check required environment variables
if [ -z "$DOMAIN_NAME" ] || [ -z "$SSL_EMAIL" ]; then
    echo "Error: DOMAIN_NAME and SSL_EMAIL must be set in .env file"
    exit 1
fi

echo "Initializing SSL certificates for domain: $DOMAIN_NAME"

# Create nginx SSL configuration from template
envsubst '${DOMAIN_NAME}' < nginx/conf.d/ssl.conf.template > nginx/conf.d/ssl.conf

# Start services without SSL first
echo "Starting services without SSL..."
docker-compose up -d db redis backend frontend nginx

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 30

# Test that the domain is accessible
echo "Testing domain accessibility..."
if ! curl -f "http://$DOMAIN_NAME/health" > /dev/null 2>&1; then
    echo "Warning: Domain $DOMAIN_NAME is not accessible. Make sure DNS is configured correctly."
    echo "You can continue, but certificate generation may fail."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Generate SSL certificate
echo "Generating SSL certificate..."
docker-compose --profile ssl run --rm certbot

# Check if certificate was generated successfully
if [ ! -f "$(docker-compose exec nginx ls /etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem 2>/dev/null)" ]; then
    echo "Certificate generation failed. Check the logs above."
    exit 1
fi

# Update nginx configuration to redirect HTTP to HTTPS
echo "Updating nginx configuration for HTTPS redirect..."
sed -i 's/# location \/ {/location \/ {/' nginx/conf.d/default.conf
sed -i 's/# return 301 https/return 301 https/' nginx/conf.d/default.conf
sed -i 's/# }/}/' nginx/conf.d/default.conf

# Restart nginx to apply SSL configuration
echo "Restarting nginx with SSL configuration..."
docker-compose restart nginx

# Test HTTPS
echo "Testing HTTPS configuration..."
sleep 10
if curl -f "https://$DOMAIN_NAME/health" > /dev/null 2>&1; then
    echo "✅ SSL certificate successfully installed and HTTPS is working!"
else
    echo "❌ HTTPS test failed. Check nginx logs:"
    docker-compose logs nginx
    exit 1
fi

echo "SSL initialization complete!"
echo "Your application is now available at: https://$DOMAIN_NAME"