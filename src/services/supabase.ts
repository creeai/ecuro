// ============================================================
// Ecuro Light MCP Server - Supabase Client Service
// ============================================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_KEY, DENTIST_TABLE } from "../constants.js";
import type { DentistRecord } from "../types.js";

let supabase: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!supabase) {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error(
        "Variáveis SUPABASE_URL e SUPABASE_KEY são obrigatórias. " +
          "Configure-as no .env ou nas variáveis de ambiente."
      );
    }
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return supabase;
}

/** Buscar dentistas por filtros genéricos */
export async function queryDentists(
  filters: Record<string, string>
): Promise<DentistRecord[]> {
  let query = getClient().from(DENTIST_TABLE).select("*");

  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Supabase Error: ${error.message}`);
  }

  return (data ?? []) as DentistRecord[];
}
