// ============================================================
// Ecuro Light MCP Server - Type Definitions
// ============================================================

export interface EcuroApiResponse<T = unknown> {
  status: string;
  message?: string;
  data?: T;
}

export interface AppointmentPayload {
  method: "create_appointment";
  fullName: string;
  phoneNumber: string;
  clinicId: string;
  date: string;
  time: string;
  dateOfBirth: string;
  doctorId?: string;
}

export interface AvailabilityQuery {
  clinicId: string;
  startDate: string;
  endDate: string;
  duration?: number;
}

export interface SpecialtyAvailabilityQuery {
  clinicId: string;
  specialtyId: string;
  doctorId: string;
  durationAware?: boolean;
}

export interface DentistAvailabilityPayload {
  dentistId: string;
  date: string;
}

export interface PatientByPhonePayload {
  phone: string;
}

export interface DentistRecord {
  id: string;
  firstName: string;
  lastName?: string;
  clinic_id: string;
  speciality_name: string;
  speciality_id: string;
  dentist_id: string;
}

export interface AppointmentSlot {
  startTime: string;
  endTime: string;
  patientName?: string;
  status?: string;
}
