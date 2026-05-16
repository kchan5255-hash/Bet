"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "./supabase/client";

export function getSupabase(): SupabaseClient {
  return getSupabaseBrowser();
}
