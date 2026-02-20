// ============================================================
// Ecuro Light MCP Server v2 - Patient Tools (7 tools)
// ============================================================

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ecuroApi } from "../services/ecuroApi.js";
import {
  GetPatientByPhoneSchema,
  GetPatientByCpfSchema,
  PatientDetailsSchema,
  ListPatientsSchema,
  PatientTreatmentsSchema,
  OrtoPatientsSchema,
  OnboardingEventSchema,
} from "../schemas/index.js";

export function registerPatientTools(server: McpServer): void {
  // ── 12. Buscar paciente por telefone ────────────────────────
  server.registerTool(
    "ecuro_get_patient_by_phone",
    {
      title: "Buscar Paciente por Telefone",
      description: `Busca paciente cadastrado pelo número de telefone.
Retorna: nome, ID, contato, CPF, email, data de nascimento.
Útil para verificar se o paciente já tem cadastro antes de agendar.`,
      inputSchema: GetPatientByPhoneSchema,
    },
    async (params) => {
      const result = await ecuroApi.post("/get-patient-by-phone", { phone: params.phone });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ── 13. Buscar paciente por CPF ─────────────────────────────
  server.registerTool(
    "ecuro_get_patient_by_cpf",
    {
      title: "Buscar Paciente por CPF",
      description: `Busca paciente pelo CPF brasileiro (com ou sem formatação).

Aceita: 12345678901 ou 123.456.789-01.
Se clinicId não fornecido, busca em todas as clínicas (multi-clínica).
Pode retornar múltiplos registros se o paciente está em várias clínicas.`,
      inputSchema: GetPatientByCpfSchema,
    },
    async (params) => {
      const payload: Record<string, unknown> = { cpf: params.cpf };
      if (params.clinicId) payload.clinicId = params.clinicId;
      const result = await ecuroApi.post("/get-patient-by-cpf", payload);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ── 14. Detalhes completos do paciente ──────────────────────
  server.registerTool(
    "ecuro_patient_details",
    {
      title: "Detalhes Completos do Paciente",
      description: `Retorna informações abrangentes do paciente incluindo:
- Perfil básico, histórico de pagamentos e transferências
- Saldos por especialidade
- Histórico de consultas, procedimentos e tratamentos
- Comunicações enviadas

Forneça patientId OU cpf (um dos dois é obrigatório).`,
      inputSchema: PatientDetailsSchema,
    },
    async (params) => {
      const result = await ecuroApi.get("/patient-details", params as unknown as Record<string, unknown>);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ── 15. Listar pacientes com filtros ────────────────────────
  server.registerTool(
    "ecuro_list_patients",
    {
      title: "Listar Pacientes",
      description: `Lista pacientes da clínica com filtros.

Obrigatório: clinicId + pelo menos um filtro (all, lastAppointment ou dateOfBirth).
all=true retorna todos os pacientes da clínica.`,
      inputSchema: ListPatientsSchema,
    },
    async (params) => {
      const result = await ecuroApi.get("/list-patients", params as unknown as Record<string, unknown>);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ── 16. Tratamentos não completados ─────────────────────────
  server.registerTool(
    "ecuro_patient_treatments",
    {
      title: "Tratamentos Pendentes do Paciente",
      description: `Retorna tratamentos não completados com procedimentos e histórico.

Status incluídos: OPENED, PLANNED, APPROVED, ONGOING, DISAPPROVE, UPDATED.
Exclui: COMPLETED, CANCELLED, ORTO_COMPLETED.`,
      inputSchema: PatientTreatmentsSchema,
    },
    async (params) => {
      const result = await ecuroApi.post("/patient-incomplete-treatments", {
        patientId: params.patientId,
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ── 17. Pacientes de ortodontia ─────────────────────────────
  server.registerTool(
    "ecuro_orto_patients",
    {
      title: "Pacientes de Ortodontia",
      description: `Lista pacientes de ortodontia por categoria com dados de consultas.

Categorias: nao-remarcados (padrão), active, inactive, atrazados, fantasma, indicacao, cancelled, finalized.

Cada paciente inclui: dados pessoais, última e próxima consulta de orto, primeiro pagamento, status de documentação.
Paginado e com contadores por categoria.`,
      inputSchema: OrtoPatientsSchema,
    },
    async (params) => {
      const result = await ecuroApi.post("/orto-patients", params as unknown as Record<string, unknown>);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ── 18. Evento de onboarding do paciente ──────────────────────
  server.registerTool(
    "ecuro_onboarding_event",
    {
      title: "Evento de Onboarding do Paciente",
      description: `Processa evento de onboarding do paciente no app mobile.

Eventos suportados:
- first_login_done: Primeiro login concluído
- push-permission-status: Status de permissão para notificações push

username deve ser o CPF do paciente (com ou sem formatação).
Para push-permission-status, permissionStatus é obrigatório (granted, denied, not_determined).`,
      inputSchema: OnboardingEventSchema,
    },
    async (params) => {
      const result = await ecuroApi.post("/onboarding-event", params as unknown as Record<string, unknown>);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
