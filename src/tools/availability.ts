// ============================================================
// Ecuro Light MCP Server - Availability Tools
// ============================================================

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ecuroApi } from "../services/ecuroApi.js";
import {
  SearchAvailabilitySchema,
  SpecialtyAvailabilitySchema,
  DentistAvailabilitySchema,
} from "../schemas/index.js";

export function registerAvailabilityTools(server: McpServer): void {
  // ── Buscar disponibilidade geral ───────────────────────────
  server.registerTool(
    "ecuro_search_availability",
    {
      title: "Buscar Disponibilidade na Agenda",
      description: `Consulta os horários disponíveis na agenda da clínica.

Retorna datas e horários livres para agendamento dentro do período informado.
Use para sugerir horários ao paciente.

Args:
  - clinicId (string): UUID da clínica
  - startDate (string): Data/hora de início (ISO 8601)
  - endDate (string): Data/hora de fim (ISO 8601)
  - duration (number): Duração em minutos (padrão: 60)

Returns:
  Lista de slots disponíveis com datas e horários.`,
      inputSchema: SearchAvailabilitySchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      const result = await ecuroApi.get("/specialty-availability", {
        clinicId: params.clinicId,
        startDate: params.startDate,
        endDate: params.endDate,
        duration: params.duration,
      });

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // ── Buscar disponibilidade por especialidade ───────────────
  server.registerTool(
    "ecuro_specialty_availability",
    {
      title: "Buscar Disponibilidade por Especialidade",
      description: `Consulta disponibilidade de horários filtrada por especialidade e dentista.

Retorna os horários disponíveis considerando a duração do procedimento da especialidade.

Args:
  - clinicId (string): UUID da clínica
  - specialtyId (string): UUID da especialidade
  - doctorId (string): UUID do dentista
  - durationAware (boolean): Considerar duração do procedimento (padrão: true)

Returns:
  Lista de slots disponíveis para a especialidade/dentista.`,
      inputSchema: SpecialtyAvailabilitySchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      const result = await ecuroApi.get("/specialty-availability", {
        clinicId: params.clinicId,
        specialtyId: params.specialtyId,
        doctorId: params.doctorId,
        durationAware: params.durationAware,
      });

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // ── Buscar disponibilidade de um dentista específico ───────
  server.registerTool(
    "ecuro_dentist_availability",
    {
      title: "Buscar Disponibilidade do Dentista",
      description: `Retorna informações detalhadas da disponibilidade de um dentista em uma data específica.

Mostra os horários ocupados (consultas agendadas) e livres do dentista.

Args:
  - dentistId (string): UUID do dentista
  - date (string): Data para verificar (yyyy-MM-dd)

Returns:
  Lista de slots ocupados com horário de início/fim, nome do paciente e status.
  Slots não listados estão disponíveis.`,
      inputSchema: DentistAvailabilitySchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      const result = await ecuroApi.post("/dentist-availabilty", {
        dentistId: params.dentistId,
        date: params.date,
      });

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
