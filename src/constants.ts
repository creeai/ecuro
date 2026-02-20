// ============================================================
// Ecuro Light MCP Server v2 - Constants
// ============================================================

/** Base URL da API Ecuro Light */
export const ECURO_API_BASE_URL =
  process.env.ECURO_API_BASE_URL || "https://clinics.api.ecuro.com.br/api/v1/ecuro-light";

/** Token de acesso à API Ecuro (header: app-access-token) */
export const ECURO_ACCESS_TOKEN = process.env.ECURO_ACCESS_TOKEN || "";

/** Total de tools registradas */
export const TOOL_COUNT = 27;
