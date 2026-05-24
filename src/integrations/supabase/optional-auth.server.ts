import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Best-effort: returns { supabase, userId } when the request carries a valid
 * Supabase bearer token, otherwise { supabase: null, userId: null }. Never throws.
 * Use this in server fns that should work for both guests and logged-in users.
 */
export async function getOptionalUser(): Promise<{
  supabase: ReturnType<typeof createClient<Database>> | null;
  userId: string | null;
}> {
  try {
    const url = process.env.SUPABASE_URL;
    const anon = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !anon) return { supabase: null, userId: null };
    const req = getRequest();
    const authHeader = req?.headers?.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return { supabase: null, userId: null };
    const token = authHeader.slice(7);
    if (!token) return { supabase: null, userId: null };
    const supabase = createClient<Database>(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims?.sub) return { supabase: null, userId: null };
    return { supabase, userId: data.claims.sub as string };
  } catch {
    return { supabase: null, userId: null };
  }
}