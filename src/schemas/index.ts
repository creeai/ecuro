// ============================================================
// Ecuro Light MCP Server - Zod Schemas
// ============================================================

import { z } from "zod";

// ── Agendamento ──────────────────────────────────────────────

export const CreateAppointmentSchema = z.object({
  fullName: z
    .string()
    .min(2)
    .describe("Nome completo do paciente"),
  phoneNumber: z
    .string()
    .min(8)
    .describe("Telefone de contato do paciente (ex: 31999999999)"),
  clinicId: z
    .string()
    .uuid()
    .describe("ID da clínica (UUID)"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato deve ser yyyy-MM-dd")
    .describe("Data da consulta no formato yyyy-MM-dd"),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}:\d{2}$/, "Formato deve ser HH:MM:SS")
    .describe("Horário da consulta no formato HH:MM:SS"),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato deve ser yyyy-MM-dd")
    .describe("Data de nascimento do paciente no formato yyyy-MM-dd"),
}).strict();

export const CreateAppointmentWithDoctorSchema = CreateAppointmentSchema.extend({
  doctorId: z
    .string()
    .uuid()
    .describe("ID do dentista específico (UUID)"),
}).strict();

// ── Disponibilidade ──────────────────────────────────────────

export const SearchAvailabilitySchema = z.object({
  clinicId: z
    .string()
    .uuid()
    .describe("ID da clínica (UUID)"),
  startDate: z
    .string()
    .describe("Data/hora de início da busca no formato ISO 8601 (ex: 2025-06-15T10:00:00)"),
  endDate: z
    .string()
    .describe("Data/hora de fim da busca no formato ISO 8601 (ex: 2025-06-22T18:00:00)"),
  duration: z
    .number()
    .int()
    .positive()
    .default(60)
    .describe("Duração da consulta em minutos (padrão: 60)"),
}).strict();

export const SpecialtyAvailabilitySchema = z.object({
  clinicId: z
    .string()
    .uuid()
    .describe("ID da clínica (UUID)"),
  specialtyId: z
    .string()
    .uuid()
    .describe("ID da especialidade (UUID)"),
  doctorId: z
    .string()
    .uuid()
    .describe("ID do dentista (UUID)"),
  durationAware: z
    .boolean()
    .default(true)
    .describe("Se deve considerar a duração do procedimento (padrão: true)"),
}).strict();

export const DentistAvailabilitySchema = z.object({
  dentistId: z
    .string()
    .uuid()
    .describe("ID do dentista (UUID)"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato deve ser yyyy-MM-dd")
    .describe("Data para verificar disponibilidade no formato yyyy-MM-dd"),
}).strict();

// ── Pacientes ────────────────────────────────────────────────

export const GetPatientByPhoneSchema = z.object({
  phone: z
    .string()
    .min(8)
    .describe("Número de telefone do paciente (ex: 31989354137)"),
}).strict();

// ── Dentistas (Supabase) ─────────────────────────────────────

export const GetDentistByNameSchema = z.object({
  firstName: z
    .string()
    .min(1)
    .describe("Primeiro nome do dentista para busca"),
  clinicId: z
    .string()
    .uuid()
    .describe("ID da clínica (UUID)"),
}).strict();

export const GetDentistBySpecialitySchema = z.object({
  specialityName: z
    .string()
    .min(1)
    .describe("Nome da especialidade (ex: Ortodontia, Implante, Avaliação)"),
  clinicId: z
    .string()
    .uuid()
    .describe("ID da clínica (UUID)"),
}).strict();

export const GetDentistByAssessmentSchema = z.object({
  clinicId: z
    .string()
    .uuid()
    .describe("ID da clínica (UUID)"),
}).strict();
