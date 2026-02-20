// ============================================================
// Ecuro Light MCP Server v2 - Zod Schemas (27 tools)
// ============================================================

import { z } from "zod";

// ── Helpers ──────────────────────────────────────────────────
const uuid = z.string().uuid();
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato: YYYY-MM-DD");
const timeStr = z.string().regex(/^\d{2}:\d{2}:\d{2}$/, "Formato: HH:MM:SS");

// ══════════════════════════════════════════════════════════════
// AGENDAMENTO
// ══════════════════════════════════════════════════════════════

export const CreateAppointmentSchema = z.object({
  fullName: z.string().min(2).describe("Nome completo do paciente"),
  phoneNumber: z.string().min(8).describe("Telefone (ex: 31999999999)"),
  clinicId: uuid.describe("ID da clínica (UUID)"),
  date: dateStr.describe("Data da consulta (YYYY-MM-DD)"),
  time: timeStr.optional().describe("Horário (HH:MM:SS). Padrão: 19:59:00"),
  dateOfBirth: dateStr.optional().describe("Data de nascimento (YYYY-MM-DD)"),
  email: z.string().email().optional().describe("Email do paciente"),
  doctorId: z.string().optional().describe("ID do dentista (UUID ou '0' para não especificado)"),
  specialityId: uuid.optional().describe("ID da especialidade (padrão: avaliação)"),
  socialNumber: z.string().optional().describe("CPF do paciente"),
  patientId: uuid.optional().describe("ID do paciente existente (pula busca)"),
  notes: z.string().max(500).optional().describe("Observações sobre a consulta"),
  durationMinutes: z.number().int().min(5).max(240).optional().describe("Duração em minutos"),
  campaignToken: z.string().optional().describe("Token de campanha de marketing"),
  channelName: z.string().optional().describe("Canal de marketing (ex: Radio, Website, Facebook)"),
  maxConcurrentAppointments: z.number().int().min(1).max(10).optional().describe("Máx consultas simultâneas (só sem dentista real)"),
  doctorName: z.string().optional().describe("Nome do dentista"),
  status: z.number().int().min(1).max(5).optional().describe("Status inicial"),
  enforceConcurrencyLimits: z.boolean().optional().describe("Aplicar limites de concorrência"),
});

export const UpdateAppointmentSchema = z.object({
  appointmentId: uuid.describe("ID da consulta a atualizar"),
  date: dateStr.optional().describe("Nova data (YYYY-MM-DD)"),
  time: timeStr.optional().describe("Novo horário (HH:MM:SS)"),
  dateTime: z.string().optional().describe("Data e hora combinados em ISO 8601"),
  status: z.union([
    z.number().int().min(1).max(5),
    z.enum(["PENDING", "NOT_ANSWERED", "RESCHEDULED", "CONFIRMED", "CANCELED"]),
  ]).optional().describe("Novo status (1-5 ou nome)"),
  doctorId: z.string().optional().describe("ID do novo dentista"),
  doctorName: z.string().optional().describe("Nome do novo dentista"),
  durationMinutes: z.number().optional().describe("Nova duração em minutos"),
  notes: z.string().max(500).optional().describe("Observações"),
  cancellationReason: z.string().max(500).optional().describe("Motivo do cancelamento"),
  createReturnRecord: z.boolean().optional().describe("Se true + status CANCELED = cria registro de retorno"),
});

export const ConfirmAppointmentSchema = z.object({
  appointmentId: uuid.describe("ID da consulta a confirmar"),
});

export const ListPatientAppointmentsSchema = z.object({
  patientId: uuid.describe("ID do paciente"),
});

export const ListDoctorAppointmentsSchema = z.object({
  dentistId: z.string().describe("ID do dentista"),
  startTime: z.string().describe("Data/hora início (ISO 8601)"),
  endTime: z.string().describe("Data/hora fim (ISO 8601)"),
});

export const ListAppointmentsSchema = z.object({
  clinicId: uuid.describe("ID da clínica"),
  dateRange: z.string().optional().describe("Intervalo: YYYY-MM-DD,YYYY-MM-DD"),
  appointmentId: uuid.optional().describe("ID de consulta específica"),
  status: z.number().int().min(1).max(5).optional().describe("Filtrar por status"),
  dentistId: z.string().optional().describe("Filtrar por dentista"),
  all: z.boolean().optional().describe("Incluir consultas de todos os consumers"),
});

export const ListReturnsSchema = z.object({
  clinicId: uuid.optional().describe("ID da clínica"),
  patientId: uuid.optional().describe("ID do paciente"),
  initialAppointmentId: uuid.optional().describe("ID da consulta original"),
  specialtyId: uuid.optional().describe("ID da especialidade"),
  dentistId: uuid.optional().describe("ID do dentista"),
  startDate: z.string().optional().describe("Data inicial (YYYY-MM-DD)"),
  endDate: z.string().optional().describe("Data final (YYYY-MM-DD)"),
  includeRescheduled: z.boolean().optional().describe("Incluir já reagendados"),
});

export const CreateAppointmentWebhookSchema = z.object({
  type: z.literal("APPOINTMENT_CREATED").describe("Tipo do webhook"),
  data: z.object({
    ecuro_clinic_id: uuid.describe("ID da clínica Ecuro"),
    specialty: z.string().optional().describe("Especialidade médica"),
    description: z.string().optional().describe("Descrição da consulta"),
    start_time: z.string().describe("Data/hora de início (ISO 8601)"),
    end_time: z.string().optional().describe("Data/hora de fim (ISO 8601)"),
    customer: z.object({
      name: z.string().describe("Nome do paciente"),
      email: z.string().email().optional().describe("Email do paciente"),
      phone: z.string().describe("Telefone do paciente"),
      cpf: z.string().optional().describe("CPF do paciente"),
      birthdate: z.string().optional().describe("Data de nascimento (YYYY-MM-DD)"),
    }).describe("Dados do paciente"),
  }).describe("Dados do agendamento"),
});

// ══════════════════════════════════════════════════════════════
// DISPONIBILIDADE
// ══════════════════════════════════════════════════════════════

export const SpecialtyAvailabilitySchema = z.object({
  clinicId: uuid.describe("ID da clínica"),
  specialtyId: uuid.optional().describe("ID da especialidade"),
  doctorId: z.string().optional().describe("ID do dentista"),
  startDate: z.string().optional().describe("Data início"),
  endDate: z.string().optional().describe("Data fim"),
  duration: z.number().int().min(5).max(240).optional().describe("Duração em minutos"),
  concurrent: z.number().int().min(1).max(10).optional().describe("Máx consultas simultâneas"),
  durationAware: z.boolean().optional().describe("Usar duração da especialidade"),
});

export const DentistAvailabilitySchema = z.object({
  dentistId: z.string().describe("ID do dentista"),
  date: dateStr.describe("Data (YYYY-MM-DD)"),
});

export const ClinicBlockersSchema = z.object({
  clinicId: uuid.describe("ID da clínica"),
});

export const FreeDatesSchema = z.object({
  clinicId: uuid.describe("ID da clínica"),
  dateMin: dateStr.describe("Data mínima (YYYY-MM-DD)"),
  dateMax: dateStr.describe("Data máxima (YYYY-MM-DD)"),
});

// ══════════════════════════════════════════════════════════════
// PACIENTES
// ══════════════════════════════════════════════════════════════

export const GetPatientByPhoneSchema = z.object({
  phone: z.string().min(8).describe("Telefone do paciente"),
});

export const GetPatientByCpfSchema = z.object({
  cpf: z.string().describe("CPF do paciente"),
  clinicId: uuid.optional().describe("ID da clínica"),
});

export const PatientDetailsSchema = z.object({
  clinicId: uuid.describe("ID da clínica"),
  patientId: uuid.optional().describe("ID do paciente"),
  cpf: z.string().optional().describe("CPF do paciente"),
});

export const ListPatientsSchema = z.object({
  clinicId: uuid.describe("ID da clínica"),
  all: z.boolean().optional().describe("Listar todos os pacientes"),
  lastAppointment: dateStr.optional().describe("Filtrar por última consulta"),
  dateOfBirth: dateStr.optional().describe("Filtrar por data de nascimento"),
});

export const PatientTreatmentsSchema = z.object({
  patientId: uuid.describe("ID do paciente"),
});

export const OrtoPatientsSchema = z.object({
  clinicId: uuid.describe("ID da clínica"),
  category: z.enum([
    "nao-remarcados", "active", "inactive", "atrazados",
    "fantasma", "indicacao", "cancelled", "finalized",
  ]).optional().describe("Categoria"),
  page: z.number().int().min(1).optional().describe("Página"),
  pageSize: z.number().int().min(1).max(100).optional().describe("Itens por página"),
  patientName: z.string().optional().describe("Buscar por nome, CPF ou ID"),
  startDate: z.string().optional().describe("Data início"),
  endDate: z.string().optional().describe("Data fim"),
});

export const OnboardingEventSchema = z.object({
  username: z.string().describe("CPF do paciente"),
  event: z.enum(["first_login_done", "push-permission-status"]).describe("Tipo do evento"),
  timestamp: z.string().describe("Timestamp do evento (ISO 8601)"),
  permissionStatus: z.string().optional().describe("Status de permissão push"),
});

// ══════════════════════════════════════════════════════════════
// CLÍNICAS & DENTISTAS
// ══════════════════════════════════════════════════════════════

export const ListClinicsSchema = z.object({
  clinicId: uuid.optional().describe("ID de clínica específica"),
});

export const ListSpecialtiesSchema = z.object({});

export const ActiveDentistsSchema = z.object({
  clinicId: uuid.describe("ID da clínica"),
});

// ══════════════════════════════════════════════════════════════
// RELATÓRIOS & FINANCEIRO
// ══════════════════════════════════════════════════════════════

export const ApiReportSchema = z.object({
  clinicId: uuid.describe("ID da clínica"),
  startDate: dateStr.optional().describe("Data início (YYYY-MM-DD)"),
  endDate: dateStr.optional().describe("Data fim (YYYY-MM-DD)"),
  appointmentId: uuid.optional().describe("ID de consulta específica"),
  patientId: uuid.optional().describe("ID de paciente específico"),
  nonApiExclusive: z.boolean().optional().describe("Incluir todas as consultas"),
});

export const ListBoletosSchema = z.object({
  clinicId: uuid.describe("ID da clínica"),
  patientId: uuid.optional().describe("ID do paciente"),
  dentistId: uuid.optional().describe("ID do dentista"),
  status: z.array(z.string()).optional().describe("Status"),
  dueSoon: z.enum(["today", "week", "month"]).optional().describe("Vencendo em breve"),
  overdue: z.boolean().optional().describe("Boletos vencidos"),
  page: z.number().int().min(1).optional().describe("Página"),
  pageSize: z.number().int().min(1).max(100).optional().describe("Itens por página"),
  issueStartDate: z.string().optional().describe("Data de emissão início"),
  issueEndDate: z.string().optional().describe("Data de emissão fim"),
  dueStartDate: z.string().optional().describe("Data de vencimento início"),
  dueEndDate: z.string().optional().describe("Data de vencimento fim"),
  minValue: z.number().optional().describe("Valor mínimo do boleto"),
  maxValue: z.number().optional().describe("Valor máximo do boleto"),
  orderBy: z.string().optional().describe("Ordenação"),
});

export const ExportCsvSchema = z.object({
  clinicId: uuid.describe("ID da clínica"),
  startDate: dateStr.optional().describe("Data início (YYYY-MM-DD)"),
  endDate: dateStr.optional().describe("Data fim (YYYY-MM-DD)"),
  appointmentId: uuid.optional().describe("ID de consulta específica"),
  patientId: uuid.optional().describe("ID de paciente específico"),
  nonApiExclusive: z.boolean().optional().describe("Incluir todas as consultas"),
});

export const GetClinicLogoSchema = z.object({
  logoId: uuid.describe("ID do arquivo de logo da clínica"),
});

// ══════════════════════════════════════════════════════════════
// COMUNICAÇÕES
// ══════════════════════════════════════════════════════════════

export const MarkCommunicationReadSchema = z.object({
  communicationId: uuid.describe("ID da comunicação a marcar como lida"),
});
