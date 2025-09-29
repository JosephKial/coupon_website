-- Initialize database for development
-- This file is executed when the PostgreSQL container starts

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone
SET timezone = 'UTC';

-- Create initial database user if not exists (handled by environment variables)
-- Additional initialization can be added here as needed