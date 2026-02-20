// ============================================================
// Ecuro Light MCP Server - Constants
// ============================================================

/** Base URL da API Ecuro Light */
export const ECURO_API_BASE_URL =
  process.env.ECURO_API_BASE_URL || "https://clinics.api.ecuro.com.br/api/v1/ecuro-light";

/** Token de acesso à API Ecuro (header: app-access-token) */
export const ECURO_ACCESS_TOKEN = process.env.ECURO_ACCESS_TOKEN || "";

/** Supabase URL */
export const SUPABASE_URL = process.env.SUPABASE_URL || "";

/** Supabase Service Key */
export const SUPABASE_KEY = process.env.SUPABASE_KEY || "";

/** Tabela de dentistas/especialidades no Supabase */
export const DENTIST_TABLE = "dentist_specialities_expanded";

/** Duração padrão da consulta em minutos */
export const DEFAULT_APPOINTMENT_DURATION = 60;

/** Limite de caracteres para respostas */
export const CHARACTER_LIMIT = 50_000;
