SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
COMMENT ON SCHEMA "public" IS 'standard public schema';


---------------------------------
-- SECTION: EXTENSIONS
---------------------------------
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

---------------------------------
-- SECTION: FUNCTIONS
---------------------------------
-- FUNCTION - public.fn_gen_random_uuid_v7()
/**
 * Returns a time-ordered with Unix Epoch UUID (UUIDv7).
 * 
 * References:
 * - https://github.com/uuid6/uuid6-ietf-draft
 * - https://github.com/ietf-wg-uuidrev/rfc4122bis
 *
 * MIT License.
 *
 * Tags: uuid guid uuid-generator guid-generator generator time order rfc4122 rfc-4122
 */
CREATE OR REPLACE FUNCTION public.fn_gen_random_uuid_v7()
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
	v_time timestamp with time zone:= null;
	v_secs bigint := null;
	v_msec bigint := null;
	v_usec bigint := null;

	v_timestamp bigint := null;
	v_timestamp_hex varchar := null;

	v_random bigint := null;
	v_random_hex varchar := null;

	v_bytes bytea;

	c_variant bit(64):= x'8000000000000000'; -- RFC-4122 variant: b'10xx...'
BEGIN
	-- Get seconds and micros
	v_time := clock_timestamp();
	v_secs := EXTRACT(EPOCH FROM v_time);
	v_msec := mod(EXTRACT(MILLISECONDS FROM v_time)::numeric, 10^3::numeric);
	v_usec := mod(EXTRACT(MICROSECONDS FROM v_time)::numeric, 10^3::numeric);

	-- Generate timestamp hexadecimal (and set version 7)
	v_timestamp := (((v_secs * 10^3) + v_msec)::bigint << 12) | (v_usec << 2);
	v_timestamp_hex := lpad(to_hex(v_timestamp), 16, '0');
	v_timestamp_hex := substr(v_timestamp_hex, 2, 12) || '7' || substr(v_timestamp_hex, 14, 3);

	-- Generate the random hexadecimal (and set variant b'10xx')
	v_random := ((random()::numeric * 2^62::numeric)::bigint::bit(64) | c_variant)::bigint;
	v_random_hex := lpad(to_hex(v_random), 16, '0');

	-- Concat timestemp and random hexadecimal
	v_bytes := decode(v_timestamp_hex || v_random_hex, 'hex');

	RETURN encode(v_bytes, 'hex')::uuid;
END
$$;

-- FUNCTION - fn_handle_updated_at - Auto-update updated_at on profile changes
CREATE OR REPLACE FUNCTION public.fn_handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


---------------------------------
-- SECTION: ENUMS
---------------------------------

---------------------------------
-- SECTION: TABLES
---------------------------------

---------------------------------
-- SECTION: INDEXES
---------------------------------

---------------------------------
-- SECTION: CONSTRAINTS (FK)
---------------------------------

---------------------------------
-- SECTION: CONSTRAINTS (UNIQUE)
---------------------------------

---------------------------------
-- SECTION: TRIGGERS
---------------------------------

---------------------------------
-- SECTION: REALTIME
---------------------------------
ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";

---------------------------------
-- SECTION: PRIVILEGES
---------------------------------
-- Manage schema usage
REVOKE ALL ON SCHEMA public FROM public;
GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "service_role";
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- Manage table access
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";

-- Manage sequence access
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA public GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA public GRANT UPDATE ON SEQUENCES TO "service_role";

-- Manage function access
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA public GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA public GRANT ALL ON FUNCTIONS TO "service_role";

-- disable PostgREST API endpoint entirely for anon and authenticated roles, so that they cannot access any endpoints unless explicitly granted
ALTER ROLE anon SET pgrst.openapi_mode TO 'disabled';
ALTER ROLE authenticated SET pgrst.openapi_mode TO 'disabled';

-- Reload the PostgREST configuration to apply changes immediately
NOTIFY pgrst, 'reload config';
