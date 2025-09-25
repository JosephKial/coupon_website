-- Database initialization script
-- This script sets up the initial database configuration and sample data

-- Ensure the database is using UTF-8 encoding
SET client_encoding = 'UTF8';

-- Create extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Create indexes for better performance (these will be created by SQLAlchemy, but ensuring they exist)
-- Indexes are defined in the SQLAlchemy models, so this is mainly for documentation

-- Sample data for testing (optional - will be created by the application)
-- This data will only be inserted in development mode

DO $$
BEGIN
    -- Check if we're in development mode (you can customize this logic)
    IF current_setting('server_version_num')::int >= 140000 THEN
        -- PostgreSQL 14+ specific optimizations
        
        -- Enable JIT compilation for better performance
        SET jit = on;
        SET jit_above_cost = 100000;
        SET jit_inline_above_cost = 500000;
        SET jit_optimize_above_cost = 500000;
        
        -- Optimize for OLTP workloads
        SET random_page_cost = 1.1;
        SET effective_cache_size = '1GB';
        SET shared_buffers = '256MB';
        
    END IF;
END $$;

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Note: Tables will be created automatically by SQLAlchemy migrations
-- This init script focuses on database configuration and optimization