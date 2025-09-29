-- Add additional indexes for better query performance

-- Full-text search indexes for PostgreSQL
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coupons_fulltext_search 
ON coupons USING gin(to_tsvector('english', coalesce(code, '') || ' ' || coalesce(description, '')));

-- Composite indexes for common filter combinations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coupons_status_created_at 
ON coupons (status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coupons_status_expiration_date 
ON coupons (status, expiration_date) WHERE expiration_date IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coupons_created_by_status 
ON coupons (created_by, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coupons_created_by_created_at 
ON coupons (created_by, created_at DESC);

-- Index for discount type and value range queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coupons_discount_type_face_value 
ON coupons (discount_type, face_value);

-- Index for tags array queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coupons_tags_gin 
ON coupons USING gin(tags);

-- Partial indexes for active coupons (most commonly queried)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coupons_active_created_at 
ON coupons (created_at DESC) WHERE status = 'ACTIVE';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coupons_active_expiration_date 
ON coupons (expiration_date) WHERE status = 'ACTIVE' AND expiration_date IS NOT NULL;

-- Index for audit logs performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_action_created_at 
ON audit_logs (user_id, action, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_resource_type_resource_id 
ON audit_logs (resource_type, resource_id) WHERE resource_id IS NOT NULL;