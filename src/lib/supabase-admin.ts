import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  classifySupabaseKey,
  describeServiceKeySource,
  getSupabaseServiceKey,
  getSupabaseUrl,
} from "@/lib/supabase-env";

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceKey();

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)",
    );
  }

  const kind = classifySupabaseKey(serviceRoleKey);
  if (kind === "anon" || kind === "publishable") {
    throw new Error(
      `Staff reads need the service_role / secret key, but ${describeServiceKeySource()} looks like an anon/publishable key. In Supabase → Project Settings → API Keys, copy the service_role (legacy JWT) or sb_secret_… key into SUPABASE_SERVICE_ROLE_KEY (Production), then Redeploy.`,
    );
  }

  if (!adminClient) {
    adminClient = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return adminClient;
}
