// ============================================================
// Ecuro Light MCP Server v2 - Availability Tools (4 tools)
// ============================================================

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ecuroApi } from "../services/ecuroApi.js";
import {
  SpecialtyAvailabilitySchema,
  DentistAvailabilitySchema,
  ClinicBlockersSchema,
  FreeDatesSchema,
} from "../schemas/index.js";

export function registerAvailabilityTools(server: McpServer): void {
  // ── 8. Disponibilidade por especialidade ────────────────────
  server.registerTool(
    "ecuro_specialty_availability",
    {
      title: "Buscar Horários Disponíveis",
      description: `Consulta horários disponíveis por especialidade/dentista.

Retorna slots livres considerando: horários da clínica, consultas existentes, bloqueadores e limites de concorrência.

Parâmetros opcionais: specialtyId (padrão: avaliação), doctorId (padrão: "0"), startDate/endDate (padrão: 30 dias), duration, concurrent, durationAware.

Formatos de data aceitos: YYYY-MM-DD (dia inteiro BRT) ou ISO 8601.
Horários retornados em BRT. Máximo 90 dias.`,
      inputSchema: SpecialtyAvailabilitySchema,
    },
    async (params) => {
      const result = await ecuroApi.get("/specialty-availability", params as unknown as Record<string, unknown>);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ── 9. Disponibilidade do dentista ──────────────────────────
  server.registerTool(
    "ecuro_dentist_availability",
    {
      title: "Agenda do Dentista",
      description: `Retorna agenda detalhada de um dentista em uma data específica.

Mostra horários ocupados (consultas agendadas) com horário de início/fim, nome do paciente e status. Slots não listados estão disponíveis.`,
      inputSchema: DentistAvailabilitySchema,
    },
    async (params) => {
      const result = await ecuroApi.post("/dentist-availabilty", {
        dentistId: params.dentistId,
        date: params.date,
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ── 10. Bloqueadores da clínica ─────────────────────────────
  server.registerTool(
    "ecuro_clinic_blockers",
    {
      title: "Bloqueadores da Clínica",
      description: `Retorna todos os bloqueadores (próximos 3 meses) para a clínica.

Tipos: bloqueadores da clínica (férias, manutenção), bloqueadores do dentista (ausências) e feriados.
Útil para: interfaces de agendamento, planejamento e detecção de conflitos.`,
      inputSchema: ClinicBlockersSchema,
    },
    async (params) => {
      const result = await ecuroApi.post("/blockers-for-a-clinic", {
        clinicId: params.clinicId,
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ── 11. Datas livres da clínica ─────────────────────────────
  server.registerTool(
    "ecuro_free_dates",
    {
      title: "Datas Livres da Clínica",
      description: `Retorna datas e horários de funcionamento livres da clínica.

Considera: horários de funcionamento, bloqueadores existentes e intervalos.
Horários em BRT. Útil para seleção de data/hora em interfaces.`,
      inputSchema: FreeDatesSchema,
    },
    async (params) => {
      const result = await ecuroApi.get("/dates", {
        clinicId: params.clinicId,
        dateMin: params.dateMin,
        dateMax: params.dateMax,
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
