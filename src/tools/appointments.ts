// ============================================================
// Ecuro Light MCP Server - Appointment Tools
// ============================================================

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ecuroApi } from "../services/ecuroApi.js";
import {
  CreateAppointmentSchema,
  CreateAppointmentWithDoctorSchema,
} from "../schemas/index.js";
import type { AppointmentPayload } from "../types.js";

export function registerAppointmentTools(server: McpServer): void {
  // ── Criar agendamento (avaliação genérica) ─────────────────
  server.registerTool(
    "ecuro_create_appointment",
    {
      title: "Criar Agendamento",
      description: `Cria um agendamento de consulta de avaliação na clínica.

Envia os dados do paciente para criar uma consulta de avaliação.
O sistema atribui automaticamente um dentista disponível.

Args:
  - fullName (string): Nome completo do paciente
  - phoneNumber (string): Telefone de contato
  - clinicId (string): UUID da clínica
  - date (string): Data da consulta (yyyy-MM-dd)
  - time (string): Horário da consulta (HH:MM:SS)
  - dateOfBirth (string): Data de nascimento (yyyy-MM-dd)

Returns:
  Dados da consulta criada com ID, status e detalhes.`,
      inputSchema: CreateAppointmentSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      const payload: AppointmentPayload = {
        method: "create_appointment",
        fullName: params.fullName,
        phoneNumber: params.phoneNumber,
        clinicId: params.clinicId,
        date: params.date,
        time: params.time,
        dateOfBirth: params.dateOfBirth,
      };

      const result = await ecuroApi.post("/", payload as unknown as Record<string, unknown>);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // ── Criar agendamento para profissional específico ─────────
  server.registerTool(
    "ecuro_create_appointment_for_doctor",
    {
      title: "Criar Agendamento para Profissional Específico",
      description: `Cria um agendamento de consulta com um dentista específico.

Igual ao agendamento padrão, mas permite especificar o dentista desejado.

Args:
  - fullName (string): Nome completo do paciente
  - phoneNumber (string): Telefone de contato
  - clinicId (string): UUID da clínica
  - date (string): Data da consulta (yyyy-MM-dd)
  - time (string): Horário da consulta (HH:MM:SS)
  - dateOfBirth (string): Data de nascimento (yyyy-MM-dd)
  - doctorId (string): UUID do dentista desejado

Returns:
  Dados da consulta criada com ID, status e detalhes.`,
      inputSchema: CreateAppointmentWithDoctorSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      const payload: AppointmentPayload = {
        method: "create_appointment",
        fullName: params.fullName,
        phoneNumber: params.phoneNumber,
        clinicId: params.clinicId,
        date: params.date,
        time: params.time,
        dateOfBirth: params.dateOfBirth,
        doctorId: params.doctorId,
      };

      const result = await ecuroApi.post("/", payload as unknown as Record<string, unknown>);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
