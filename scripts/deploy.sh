#!/bin/bash

# Production deployment script
# Handles zero-downtime deployment with health checks

set -e

# Configuration
COMPOSE_FILE="docker-compose.yml"
BACKUP_BEFORE_DEPLOY=${BACKUP_BEFORE_DEPLOY:-true}
HEALTH_CHECK_TIMEOUT=60

echo "🚀 Starting production deployment..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
    echo "✅ Environment variables loaded"
else
    echo "❌ .env file not found. Please create it from .env.production template"
    exit 1
fi

# Validate required environment variables
required_vars=("POSTGRES_PASSWORD" "REDIS_PASSWORD" "JWT_SECRET" "JWT_REFRESH_SECRET")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set"
        exit 1
    fi
done
echo "✅ Required environment variables validated"

# Create backup before deployment
if [ "$BACKUP_BEFORE_DEPLOY" = "true" ]; then
    echo "📦 Creating backup before deployment..."
    ./scripts/backup-db.sh
fi

# Pull latest images
echo "📥 Pulling latest images..."
docker-compose -f "$COMPOSE_FILE" pull

# Build new images
echo "🔨 Building new images..."
docker-compose -f "$COMPOSE_FILE" build --no-cache

# Start database and redis first
echo "🗄️ Starting database and cache services..."
docker-compose -f "$COMPOSE_FILE" up -d db redis

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
timeout=30
while [ $timeout -gt 0 ]; do
    if docker-compose -f "$COMPOSE_FILE" exec db pg_isready -U "${POSTGRES_USER:-coupon_user}" -d "${POSTGRES_DB:-coupon_manager}" > /dev/null 2>&1; then
        echo "✅ Database is ready"
        break
    fi
    sleep 2
    timeout=$((timeout - 2))
done

if [ $timeout -le 0 ]; then
    echo "❌ Database failed to start within timeout"
    exit 1
fi

# Run database migrations
echo "🔄 Running database migrations..."
docker-compose -f "$COMPOSE_FILE" run --rm backend npm run db:migrate:prod

# Start backend service
echo "🖥️ Starting backend service..."
docker-compose -f "$COMPOSE_FILE" up -d backend

# Wait for backend to be healthy
echo "⏳ Waiting for backend to be healthy..."
timeout=$HEALTH_CHECK_TIMEOUT
while [ $timeout -gt 0 ]; do
    if docker-compose -f "$COMPOSE_FILE" exec backend curl -f http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ Backend is healthy"
        break
    fi
    sleep 2
    timeout=$((timeout - 2))
done

if [ $timeout -le 0 ]; then
    echo "❌ Backend failed to become healthy within timeout"
    echo "Backend logs:"
    docker-compose -f "$COMPOSE_FILE" logs backend
    exit 1
fi

# Start frontend service
echo "🌐 Starting frontend service..."
docker-compose -f "$COMPOSE_FILE" up -d frontend

# Wait for frontend to be healthy
echo "⏳ Waiting for frontend to be healthy..."
timeout=30
while [ $timeout -gt 0 ]; do
    if docker-compose -f "$COMPOSE_FILE" exec frontend curl -f http://localhost:80/health > /dev/null 2>&1; then
        echo "✅ Frontend is healthy"
        break
    fi
    sleep 2
    timeout=$((timeout - 2))
done

if [ $timeout -le 0 ]; then
    echo "❌ Frontend failed to become healthy within timeout"
    echo "Frontend logs:"
    docker-compose -f "$COMPOSE_FILE" logs frontend
    exit 1
fi

# Start nginx
echo "🔀 Starting nginx reverse proxy..."
docker-compose -f "$COMPOSE_FILE" up -d nginx

# Final health check
echo "🏥 Performing final health check..."
sleep 10

if [ -n "$DOMAIN_NAME" ]; then
    # Test HTTPS if domain is configured
    if curl -f "https://$DOMAIN_NAME/health" > /dev/null 2>&1; then
        echo "✅ HTTPS health check passed"
    elif curl -f "http://$DOMAIN_NAME/health" > /dev/null 2>&1; then
        echo "✅ HTTP health check passed (HTTPS not configured)"
    else
        echo "❌ Health check failed for domain $DOMAIN_NAME"
        exit 1
    fi
else
    # Test local health check
    if curl -f "http://localhost/health" > /dev/null 2>&1; then
        echo "✅ Local health check passed"
    else
        echo "❌ Local health check failed"
        exit 1
    fi
fi

# Clean up old images
echo "🧹 Cleaning up old images..."
docker image prune -f

echo "🎉 Deployment completed successfully!"
echo "Application is running at: ${DOMAIN_NAME:+https://$DOMAIN_NAME}"