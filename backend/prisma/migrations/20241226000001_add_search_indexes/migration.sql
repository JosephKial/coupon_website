-- Add full-text search indexes for better search performance
-- Create GIN indexes for full-text search on code and description
CREATE INDEX CONCURRENTLY IF NOT EXISTS "coupons_code_gin_idx" ON "coupons" USING gin(to_tsvector('english', code));
CREATE INDEX CONCURRENTLY IF NOT EXISTS "coupons_description_gin_idx" ON "coupons" USING gin(to_tsvector('english', coalesce(description, '')));

-- Create combined full-text search index for code and description
CREATE INDEX CONCURRENTLY IF NOT EXISTS "coupons_fulltext_gin_idx" ON "coupons" USING gin(to_tsvector('english', coalesce(code, '') || ' ' || coalesce(description, '')));

-- Add trigram indexes for fuzzy search (requires pg_trgm extension)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "coupons_code_trgm_idx" ON "coupons" USING gin(code gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "coupons_description_trgm_idx" ON "coupons" USING gin(description gin_trgm_ops);

-- Add composite indexes for common filter combinations
CREATE INDEX CONCURRENTLY IF NOT EXISTS "coupons_status_expiration_idx" ON "coupons" (status, expiration_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "coupons_status_face_value_idx" ON "coupons" (status, face_value);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "coupons_discount_type_face_value_idx" ON "coupons" (discount_type, face_value);

-- Add index for tags array search
CREATE INDEX CONCURRENTLY IF NOT EXISTS "coupons_tags_gin_idx" ON "coupons" USING gin(tags);