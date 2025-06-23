--
-- Seed Data for DomainFlow Studio
-- This file contains basic test/demo data for development environments
--

-- Insert basic keyword categories
INSERT INTO keyword_categories (id, name, description, is_active, created_at) VALUES
  (gen_random_uuid(), 'Telecommunications', 'Keywords related to telecom services', true, NOW()),
  (gen_random_uuid(), 'Internet Services', 'Keywords related to internet and web services', true, NOW()),
  (gen_random_uuid(), 'Technology', 'General technology keywords', true, NOW())
ON CONFLICT (name) DO NOTHING;

-- Insert sample proxy pool
INSERT INTO proxy_pools (id, name, description, is_active, created_at) VALUES
  (gen_random_uuid(), 'Development Pool', 'Development proxy pool for testing', true, NOW())
ON CONFLICT (name) DO NOTHING;

-- Note: This is minimal seed data. 
-- For development, you may want to add test personas, keyword sets, etc.
-- Production environments should start with empty tables and create data through the API.
