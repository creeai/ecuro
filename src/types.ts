// ============================================================
// Ecuro Light MCP Server v2 - Type Definitions
// ============================================================

export interface EcuroApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode?: number;
}
