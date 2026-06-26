import { createClient } from "@/lib/supabase/server";
import { withTimeout } from "@/lib/supabase/clinical-admin-queries";
import type { AppointmentStatus, AppointmentType, AppointmentSource } from "@/lib/appointments/status";

export interface Appointment {
  id: string;
  doctor_id: string;
  patient_id: string;
  created_by: string;
  source: AppointmentSource;
  status: AppointmentStatus;
  starts_at: string;
  ends_at: string;
  timezone: string;
  appointment_type: AppointmentType;
  reason: string | null;
  location_name: string | null;
  telemedicine_url: string | null;
  cancellation_reason: string | null;
  rescheduled_from_appointment_id: string | null;
  // Nome resolvido em query separada (evita embedded join de profiles — lição do
  // commit df2bdec, onde join embutido quebrava a fila por RLS).
  counterpart_name: string | null;
}

const COLUMNS =
  "id, doctor_id, patient_id, created_by, source, status, starts_at, ends_at, timezone, appointment_type, reason, location_name, telemedicine_url, cancellation_reason, rescheduled_from_appointment_id";

// Resolve nomes de profiles para um conjunto de ids, num único select.
async function nameMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[],
): Promise<Record<string, string>> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return {};
  const { data } = await supabase.from("profiles").select("id, name").in("id", unique);
  const map: Record<string, string> = {};
  for (const row of data ?? []) map[row.id as string] = (row.name as string) ?? "";
  return map;
}

// Agenda do médico autenticado. RLS (appointments_doctor_manage) já restringe às
// consultas do médico com vínculo ativo; o counterpart exibido é o paciente.
export async function getDoctorAppointments(range?: { from?: string; to?: string }): Promise<Appointment[]> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
      .from("appointments")
      .select(COLUMNS)
      .eq("doctor_id", user.id)
      .order("starts_at", { ascending: true });
    if (range?.from) query = query.gte("starts_at", range.from);
    if (range?.to) query = query.lte("starts_at", range.to);

    const { data, error } = await withTimeout(query);
    if (error || !data) return [];

    const names = await nameMap(supabase, data.map((a) => a.patient_id as string));
    return data.map((a) => ({ ...a, counterpart_name: names[a.patient_id as string] ?? null })) as Appointment[];
  } catch (e) {
    console.error("getDoctorAppointments failed (migração aplicada?):", e instanceof Error ? e.message : e);
    return [];
  }
}

// Consultas do paciente autenticado. RLS (appointments_patient_read) restringe às
// próprias; o counterpart exibido é o médico.
export async function getMyAppointments(): Promise<Appointment[]> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await withTimeout(
      supabase
        .from("appointments")
        .select(COLUMNS)
        .eq("patient_id", user.id)
        .order("starts_at", { ascending: true }),
    );
    if (error || !data) return [];

    const names = await nameMap(supabase, data.map((a) => a.doctor_id as string));
    return data.map((a) => ({ ...a, counterpart_name: names[a.doctor_id as string] ?? null })) as Appointment[];
  } catch (e) {
    console.error("getMyAppointments failed (migração aplicada?):", e instanceof Error ? e.message : e);
    return [];
  }
}
