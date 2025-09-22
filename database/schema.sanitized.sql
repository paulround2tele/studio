-- Sanitized schema without unsupported transaction_timeout
-- Generated automatically for Docker Postgres 16 Alpine init

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
-- Removed: SET transaction_timeout = 0; (not supported on 16 alpine build)
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

\include_relative ../backend/database/schema.sql
