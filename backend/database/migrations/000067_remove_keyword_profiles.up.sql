-- 000067_remove_keyword_profiles.up.sql
-- Cleanup: remove deprecated keyword_profiles feature (tables created by 000051_keyword_profiles.up.sql)
-- Safe to run multiple times; tables are dropped only if present.

DROP TABLE IF EXISTS campaign_keyword_profile;
DROP TABLE IF EXISTS keyword_profiles;
