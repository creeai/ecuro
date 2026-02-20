// ============================================================
// Ecuro Light MCP Server - Dentist Tools (Supabase)
// ============================================================

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { queryDentists } from "../services/supabase.js";
import {
  GetDentistByNameSchema,
  GetDentistBySpecialitySchema,
  GetDentistByAssessmentSchema,
} from "../schemas/index.js";

export function registerDentistTools(server: McpServer): void {
  // ── Buscar dentista por nome ───────────────────────────────
  server.registerTool(
    "ecuro_get_dentist_by_name",
    {
      title: "Buscar Dentista por Nome",
      description: `Busca dentistas pelo primeiro nome dentro de uma clínica específica.

Retorna os dados do dentista incluindo especialidades e IDs.

Args:
  - firstName (string): Primeiro nome do dentista
  - clinicId (string): UUID da clínica

Returns:
  Lista de dentistas encontrados com ID, nome, especialidade e clinic_id.`,
      inputSchema: GetDentistByNameSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      const results = await queryDentists({
        firstName: params.firstName,
        clinic_id: params.clinicId,
      });

      if (results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `Nenhum dentista encontrado com o nome "${params.firstName}" na clínica informada.`,
            },
          ],
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      };
    }
  );

  // ── Buscar dentista por especialidade ──────────────────────
  server.registerTool(
    "ecuro_get_dentist_by_speciality",
    {
      title: "Buscar Dentista por Especialidade",
      description: `Busca dentistas que atendem uma especialidade específica em uma clínica.

Retorna lista de dentistas com seus IDs e dados da especialidade.

Args:
  - specialityName (string): Nome da especialidade (ex: Ortodontia, Implante, Endodontia)
  - clinicId (string): UUID da clínica

Returns:
  Lista de dentistas com ID, nome e dados da especialidade.`,
      inputSchema: GetDentistBySpecialitySchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      const results = await queryDentists({
        speciality_name: params.specialityName,
        clinic_id: params.clinicId,
      });

      if (results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `Nenhum dentista encontrado para a especialidade "${params.specialityName}" na clínica informada.`,
            },
          ],
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      };
    }
  );

  // ── Buscar dentistas de avaliação ──────────────────────────
  server.registerTool(
    "ecuro_get_dentist_for_assessment",
    {
      title: "Buscar Dentistas de Avaliação",
      description: `Busca dentistas que realizam consultas de avaliação em uma clínica.

Retorna a lista de profissionais disponíveis para consultas de avaliação inicial.

Args:
  - clinicId (string): UUID da clínica

Returns:
  Lista de dentistas que atendem avaliação com ID, nome e dados.`,
      inputSchema: GetDentistByAssessmentSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      const results = await queryDentists({
        speciality_name: "Avaliação",
        clinic_id: params.clinicId,
      });

      if (results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "Nenhum dentista de avaliação encontrado para a clínica informada.",
            },
          ],
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      };
    }
  );
}
