# Database Setup Guide

This document provides instructions for setting up and managing the PostgreSQL database for the Family Coupon Manager backend.

## Prerequisites

- Docker and Docker Compose (for development)
- Node.js and npm
- PostgreSQL (for production)

## Development Setup

### 1. Start the Development Environment

```bash
# From the project root directory
npm run dev
```

This will start all services including PostgreSQL and Redis using Docker Compose.

### 2. Database Setup (First Time)

Once the database container is running, set up the database schema and seed data:

```bash
# Navigate to backend directory
cd backend

# Generate Prisma client
npm run db:generate

# Push schema to database (creates tables)
npm run db:push

# Seed the database with sample data
npm run db:seed
```

Or use the combined setup command:

```bash
npm run db:setup
```

### 3. Database Management Commands

```bash
# Generate Prisma client after schema changes
npm run db:generate

# Push schema changes to database (development)
npm run db:push

# Create and run migrations (recommended for production)
npm run db:migrate

# Seed database with sample data
npm run db:seed

# Reset database (deletes all data and recreates schema)
npm run db:reset

# Reset data only (keeps schema, deletes data)
npm run db:reset-data

# Check database connection and schema
npm run db:check

# Open Prisma Studio (database GUI)
npm run db:studio
```

## Database Schema

### Users Table
- `id`: UUID primary key
- `email`: Unique email address
- `password_hash`: Argon2 hashed password
- `first_name`: User's first name
- `last_name`: User's last name
- `role`: User role (ADMIN, MEMBER)
- `is_active`: Account status
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp
- `last_login_at`: Last login timestamp

### Coupons Table
- `id`: UUID primary key
- `code`: Coupon code (unique identifier)
- `description`: Optional coupon description
- `discount_type`: Type of discount (AMOUNT, PERCENTAGE)
- `face_value`: Discount value
- `expiration_date`: Optional expiration date
- `usage_limit`: Optional usage limit
- `usage_count`: Current usage count
- `status`: Coupon status (ACTIVE, EXPIRED, USED, DISABLED)
- `tags`: Array of tags for categorization
- `created_by`: Foreign key to users table
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

### Audit Logs Table
- `id`: UUID primary key
- `user_id`: Optional foreign key to users table
- `action`: Action performed
- `resource_type`: Type of resource affected
- `resource_id`: Optional ID of affected resource
- `details`: JSON details of the action
- `ip_address`: IP address of the user
- `user_agent`: User agent string
- `created_at`: Action timestamp

## Sample Data

The seed script creates:

### Test Users
- **Admin User**: admin@family.com / AdminPass123!
- **Member 1**: john@family.com / MemberPass123!
- **Member 2**: jane@family.com / MemberPass123!

### Sample Coupons
- Various coupon types (percentage and amount discounts)
- Different statuses (active, expired, used, disabled)
- Different expiration dates for testing
- Various tags for filtering tests

### Audit Logs
- Sample authentication and coupon management actions
- Different IP addresses and user agents
- Timestamps spread over recent history

## Production Setup

### 1. Environment Variables

Create a `.env` file with production values:

```env
DATABASE_URL="postgresql://username:password@host:port/database"
REDIS_URL="redis://username:password@host:port"
JWT_SECRET="your-secure-jwt-secret"
JWT_REFRESH_SECRET="your-secure-refresh-secret"
NODE_ENV="production"
```

### 2. Database Migration

```bash
# Run migrations (creates/updates schema)
npm run db:migrate:prod

# Generate Prisma client
npm run db:generate
```

### 3. Optional: Seed Production Data

```bash
# Only if you want sample data in production (not recommended)
NODE_ENV=development npm run db:seed
```

## Troubleshooting

### Database Connection Issues

1. **Check if database is running**:
   ```bash
   docker-compose -f docker-compose.dev.yml ps
   ```

2. **Check database logs**:
   ```bash
   docker-compose -f docker-compose.dev.yml logs db
   ```

3. **Restart database service**:
   ```bash
   docker-compose -f docker-compose.dev.yml restart db
   ```

### Schema Issues

1. **Reset and recreate everything**:
   ```bash
   npm run db:reset
   npm run db:setup
   ```

2. **Check schema differences**:
   ```bash
   npx prisma db pull
   npx prisma format
   ```

### Migration Issues

1. **Check migration status**:
   ```bash
   npx prisma migrate status
   ```

2. **Resolve migration conflicts**:
   ```bash
   npx prisma migrate resolve --applied "migration-name"
   ```

## Backup and Restore

### Backup Database

```bash
# Using Docker
docker exec coupon-manager-db-dev pg_dump -U dev_user coupon_manager_dev > backup.sql

# Using pg_dump directly
pg_dump -h localhost -p 5432 -U dev_user -d coupon_manager_dev > backup.sql
```

### Restore Database

```bash
# Using Docker
docker exec -i coupon-manager-db-dev psql -U dev_user -d coupon_manager_dev < backup.sql

# Using psql directly
psql -h localhost -p 5432 -U dev_user -d coupon_manager_dev < backup.sql
```

## Performance Considerations

### Indexes

The schema includes indexes on frequently queried columns:
- `coupons.code` - for coupon lookups
- `coupons.status` - for status filtering
- `coupons.expiration_date` - for date-based queries
- `coupons.created_by` - for user-specific queries
- `audit_logs.user_id` - for user audit trails
- `audit_logs.action` - for action-based queries
- `audit_logs.resource_type` - for resource filtering
- `audit_logs.created_at` - for time-based queries

### Query Optimization

- Use `select` to limit returned fields
- Use pagination for large result sets
- Use appropriate filters to reduce query scope
- Consider caching for frequently accessed data

## Security Considerations

- All passwords are hashed using Argon2
- Database connections use SSL in production
- Sensitive data is not logged in audit trails
- User input is validated before database operations
- SQL injection is prevented through Prisma's query builder