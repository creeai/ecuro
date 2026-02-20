// ============================================================
// Ecuro Light MCP Server v2 - Communication Tools (1 tool)
// ============================================================

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ecuroApi } from "../services/ecuroApi.js";
import { MarkCommunicationReadSchema } from "../schemas/index.js";

export function registerCommunicationTools(server: McpServer): void {
  // ── 25. Marcar comunicação como lida ──────────────────────────
  server.registerTool(
    "ecuro_mark_communication_read",
    {
      title: "Marcar Comunicação como Lida",
      description: `Marca uma comunicação do paciente como lida.

communicationId é o UUID da comunicação.
Usado para sinalizar que o paciente visualizou uma mensagem ou notificação.`,
      inputSchema: MarkCommunicationReadSchema,
    },
    async (params) => {
      const result = await ecuroApi.put(`/communications/${params.communicationId}/read`);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
