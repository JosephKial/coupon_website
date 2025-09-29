# Multi-stage build for production frontend
FROM node:18-alpine AS builder

# Build arguments
ARG VITE_API_URL=/api
ARG VITE_APP_NAME="Family Coupon Manager"

# Set environment variables from build args
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_NAME=$VITE_APP_NAME

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create non-root user for nginx
RUN addgroup -g 1001 -S nginx-user && \
    adduser -S frontend -u 1001 -G nginx-user

# Set proper permissions
RUN chown -R frontend:nginx-user /usr/share/nginx/html && \
    chown -R frontend:nginx-user /var/cache/nginx && \
    chown -R frontend:nginx-user /var/log/nginx && \
    chown -R frontend:nginx-user /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R frontend:nginx-user /var/run/nginx.pid

# Switch to non-root user
USER frontend

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]