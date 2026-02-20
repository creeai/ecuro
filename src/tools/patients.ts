// ============================================================
// Ecuro Light MCP Server - Patient Tools
// ============================================================

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ecuroApi } from "../services/ecuroApi.js";
import { GetPatientByPhoneSchema } from "../schemas/index.js";

export function registerPatientTools(server: McpServer): void {
  // ── Buscar paciente por telefone ───────────────────────────
  server.registerTool(
    "ecuro_get_patient_by_phone",
    {
      title: "Buscar Paciente por Telefone",
      description: `Consulta um paciente cadastrado usando o número de telefone.

Retorna os dados do paciente se encontrado (nome, ID, dados de contato, etc).
Útil para verificar se o paciente já tem cadastro antes de agendar.

Args:
  - phone (string): Número de telefone do paciente (ex: 31989354137)

Returns:
  Dados do paciente (nome, ID, contato) ou mensagem de não encontrado.`,
      inputSchema: GetPatientByPhoneSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      const result = await ecuroApi.post("/get-patient-by-phone", {
        phone: params.phone,
      });

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
