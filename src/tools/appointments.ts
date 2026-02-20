// ============================================================
// Ecuro Light MCP Server v2 - Appointment Tools (7 tools)
// ============================================================

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ecuroApi } from "../services/ecuroApi.js";
import {
  CreateAppointmentSchema,
  UpdateAppointmentSchema,
  ConfirmAppointmentSchema,
  ListPatientAppointmentsSchema,
  ListDoctorAppointmentsSchema,
  ListAppointmentsSchema,
  ListReturnsSchema,
} from "../schemas/index.js";

export function registerAppointmentTools(server: McpServer): void {
  // ── 1. Criar agendamento ────────────────────────────────────
  server.registerTool(
    "ecuro_create_appointment",
    {
      title: "Criar Agendamento",
      description: `Cria uma consulta odontológica. Suporta pacientes novos e existentes.

Campos obrigatórios: fullName, phoneNumber, clinicId, date.
Campos opcionais: time, dateOfBirth, email, doctorId, specialityId, socialNumber, patientId, notes, durationMinutes, campaignToken, channelName.

Lógica de paciente: se patientId → usa direto. Se socialNumber → busca por CPF. Se phoneNumber → busca por tel. Se não encontrado → cria novo.

Retorna dados da consulta criada com ID, status, paciente e detalhes.`,
      inputSchema: CreateAppointmentSchema,
    },
    async (params) => {
      const payload: Record<string, unknown> = {
        method: "create_appointment",
        ...params,
      };
      const result = await ecuroApi.post("/", payload);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ── 2. Atualizar agendamento ────────────────────────────────
  server.registerTool(
    "ecuro_update_appointment",
    {
      title: "Atualizar Agendamento",
      description: `Atualiza uma consulta existente. Permite alterar data, horário, status, dentista, notas e cancelar com retorno.

Status: 1=PENDING, 2=NOT_ANSWERED, 3=RESCHEDULED, 4=CONFIRMED, 5=CANCELED.

Especial: createReturnRecord=true + status=CANCELED → cria registro de retorno em vez de cancelar definitivamente.

Para alterar dentista: envie doctorId (nome buscado automaticamente).
Para adicionar observações: envie notes (salvo como comentário com atribuição).`,
      inputSchema: UpdateAppointmentSchema,
    },
    async (params) => {
      const result = await ecuroApi.put("/update-appointment", params as unknown as Record<string, unknown>);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ── 3. Confirmar agendamento ────────────────────────────────
  server.registerTool(
    "ecuro_confirm_appointment",
    {
      title: "Confirmar Agendamento",
      description: `Confirma uma consulta pendente. Altera status para CONFIRMED.

Funciona em consultas com status: PENDING, NOT_ANSWERED ou RESCHEDULED.`,
      inputSchema: ConfirmAppointmentSchema,
    },
    async (params) => {
      const result = await ecuroApi.put("/", { appointmentId: params.appointmentId });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ── 4. Listar consultas do paciente ─────────────────────────
  server.registerTool(
    "ecuro_list_patient_appointments",
    {
      title: "Listar Consultas do Paciente",
      description: `Retorna histórico completo de consultas de um paciente específico.`,
      inputSchema: ListPatientAppointmentsSchema,
    },
    async (params) => {
      const result = await ecuroApi.post("/list-appointments-of-patient", {
        patientId: params.patientId,
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ── 5. Listar consultas do dentista ─────────────────────────
  server.registerTool(
    "ecuro_list_doctor_appointments",
    {
      title: "Listar Consultas do Dentista",
      description: `Retorna agenda de um dentista dentro de um período.

Ideal para: agenda diária, análise de carga, detecção de conflitos.
Otimizado para até 30 dias. Datas em formato ISO 8601.`,
      inputSchema: ListDoctorAppointmentsSchema,
    },
    async (params) => {
      const result = await ecuroApi.post("/list-appointments-of-doctor", {
        dentistId: params.dentistId,
        startTime: params.startTime,
        endTime: params.endTime,
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ── 6. Listar consultas por clínica/app ─────────────────────
  server.registerTool(
    "ecuro_list_appointments",
    {
      title: "Listar Consultas da Clínica",
      description: `Lista consultas por clínica com filtros avançados.

Modo 1 (consulta única): clinicId + appointmentId
Modo 2 (lista filtrada): clinicId + dateRange (YYYY-MM-DD,YYYY-MM-DD)

Filtros: status (1-5), dentistId, all (todos os consumers). Máx 3 meses.`,
      inputSchema: ListAppointmentsSchema,
    },
    async (params) => {
      const result = await ecuroApi.get("/appointments/appid", params as unknown as Record<string, unknown>);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ── 7. Listar registros de retorno ──────────────────────────
  server.registerTool(
    "ecuro_list_returns",
    {
      title: "Listar Registros de Retorno",
      description: `Lista pacientes que precisam reagendar (registros de retorno).

Obrigatório: pelo menos um de clinicId, patientId ou initialAppointmentId.
Filtros: specialtyId, dentistId, startDate, endDate, includeRescheduled.

Inclui dados do paciente, consulta original e informações de reagendamento.`,
      inputSchema: ListReturnsSchema,
    },
    async (params) => {
      const result = await ecuroApi.post("/list-returns", params as unknown as Record<string, unknown>);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
