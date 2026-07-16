import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@repo/database-schema";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables",
  );
}

// Service-role client only — no anon client in this project.
// All DB access goes through the service_role key.
export const supabase: SupabaseClient<Database> = createClient<Database>(url, serviceRoleKey);