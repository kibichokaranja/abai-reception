import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  classifySupabaseKey,
  describeAnonKeySource,
  getSupabaseAnonKey,
  getSupabaseUrl,
} from "@/lib/supabase-env";

let anonClient: SupabaseClient | null = null;

/** Server/browser client using the anon or publishable key (RLS applies). */
export function getSupabaseAnonClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)",
    );
  }

  const kind = classifySupabaseKey(anonKey);
  if (kind === "service" || kind === "secret") {
    throw new Error(
      `${describeAnonKeySource()} looks like a service/secret key. Guest inserts must use the anon or sb_publishable_ key (never put the service role in NEXT_PUBLIC_*).`,
    );
  }

  if (!anonClient) {
    anonClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return anonClient;
}

/** @deprecated Use getSupabaseAnonClient — kept for existing imports. */
export const getSupabaseBrowserClient = getSupabaseAnonClient;
