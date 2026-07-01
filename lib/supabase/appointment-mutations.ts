"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { findConflicts, type TimeSlot } from "@/lib/appointments/conflicts";
import {
  BLOCKING_STATUSES,
  canMarkNoShow,
  isTerminal,
  type AppointmentStatus,
  type AppointmentType,
} from "@/lib/appointments/status";

type Result = { error: string | null };

// Auditoria fora do caminho crítico. appointment_events não tem policy de INSERT
// (deny-by-default), então a escrita usa service role; actor_id é o usuário real.
async function audit(appointmentId: string | null, actorId: string, action: string, metadata: Record<string, unknown> = {}) {
  try {
    const { createClient: createAdmin } = await import("@supabase/supabase-js");
    const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    await admin.from("appointment_events").insert({ appointment_id: appointmentId, actor_id: actorId, action, metadata });
  } catch (e) {
    console.error("appointment audit failed:", e instanceof Error ? e.message : e);
  }
}

function revalidate() {
  revalidatePath("/doctor/agenda");
  revalidatePath("/doctor");
  revalidatePath("/appointments");
}

// Janela do dia da consulta candidata, para buscar consultas que possam conflitar.
function dayBounds(startsAt: string): { from: string; to: string } {
  const d = new Date(startsAt);
  const from = new Date(d); from.setHours(0, 0, 0, 0);
  const to = new Date(d); to.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

const VALID_TYPES: AppointmentType[] = ["first_visit", "follow_up", "telemedicine", "exam_review", "other"];

function computeEnds(startsAt: string, durationMinutes: number): string | null {
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return null;
  const dur = Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : 30;
  return new Date(start.getTime() + dur * 60_000).toISOString();
}

// Busca consultas que bloqueiam horário de um lado (médico ou paciente) no dia, e
// retorna conflito se a candidata se sobrepõe a alguma. excludeId ignora a própria
// consulta (remarcação).
async function conflictError(
  supabase: Awaited<ReturnType<typeof createClient>>,
  side: { column: "doctor_id" | "patient_id"; id: string },
  candidate: TimeSlot,
  excludeId?: string,
): Promise<string | null> {
  const { from, to } = dayBounds(candidate.starts_at as string);
  const { data } = await supabase
    .from("appointments")
    .select("id, starts_at, ends_at, status")
    .eq(side.column, side.id)
    .in("status", BLOCKING_STATUSES as unknown as string[])
    .gte("starts_at", from)
    .lte("starts_at", to);

  const existing = (data ?? []) as TimeSlot[];
  const conflicts = findConflicts({ ...candidate, id: excludeId }, existing);
  return conflicts.length > 0 ? "Conflito de horário: já existe consulta nesse intervalo." : null;
}

// MÉDICO cria consulta para paciente vinculado (status 'scheduled').
export async function createAppointment(input: {
  patientId: string;
  startsAt: string;
  durationMinutes: number;
  appointmentType: AppointmentType;
  reason?: string;
}): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const endsAt = computeEnds(input.startsAt, input.durationMinutes);
  if (!endsAt) return { error: "Data/hora inválida." };
  const type: AppointmentType = VALID_TYPES.includes(input.appointmentType) ? input.appointmentType : "follow_up";

  const conflict = await conflictError(supabase, { column: "doctor_id", id: user.id }, { starts_at: input.startsAt, ends_at: endsAt });
  if (conflict) return { error: conflict };

  // RLS (appointments_doctor_manage) exige doctor_id = auth.uid() e vínculo ativo.
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      doctor_id: user.id,
      patient_id: input.patientId,
      created_by: user.id,
      source: "manual",
      status: "scheduled",
      starts_at: input.startsAt,
      ends_at: endsAt,
      appointment_type: type,
      reason: input.reason?.trim() || null,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Não foi possível criar a consulta. Verifique o vínculo com o paciente." };
  await audit(data.id, user.id, "created", { patient_id: input.patientId });
  revalidate();
  return { error: null };
}

// PACIENTE solicita consulta a médico vinculado (status 'requested').
export async function requestAppointment(input: {
  doctorId: string;
  startsAt: string;
  durationMinutes: number;
  appointmentType: AppointmentType;
  reason?: string;
}): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const endsAt = computeEnds(input.startsAt, input.durationMinutes);
  if (!endsAt) return { error: "Data/hora inválida." };
  const type: AppointmentType = VALID_TYPES.includes(input.appointmentType) ? input.appointmentType : "follow_up";

  // RLS (appointments_patient_request) exige patient_id = auth.uid(), created_by =
  // auth.uid(), status 'requested', source 'patient_request' e vínculo ativo.
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      doctor_id: input.doctorId,
      patient_id: user.id,
      created_by: user.id,
      source: "patient_request",
      status: "requested",
      starts_at: input.startsAt,
      ends_at: endsAt,
      appointment_type: type,
      reason: input.reason?.trim() || null,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Não foi possível solicitar a consulta. Verifique o vínculo com o médico." };
  await audit(data.id, user.id, "requested", { doctor_id: input.doctorId });
  revalidate();
  return { error: null };
}

// MÉDICO muda status (confirmar/chegou/concluir/no_show/cancelar/pending).
const DOCTOR_TRANSITIONS: AppointmentStatus[] = [
  "pending_confirmation", "scheduled", "confirmed", "arrived", "completed", "cancelled", "no_show",
];

export async function updateAppointmentStatus(input: {
  appointmentId: string;
  status: AppointmentStatus;
  reason?: string;
}): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };
  if (!DOCTOR_TRANSITIONS.includes(input.status)) return { error: "Transição de status inválida." };

  const { data: current } = await supabase
    .from("appointments")
    .select("id, status, starts_at")
    .eq("id", input.appointmentId)
    .maybeSingle();
  if (!current) return { error: "Consulta não encontrada." };
  if (isTerminal(current.status as AppointmentStatus)) return { error: "Consulta já encerrada não pode ser alterada." };
  if (input.status === "no_show" && !canMarkNoShow(current.starts_at as string)) {
    return { error: "Só é possível marcar falta após o horário da consulta." };
  }

  const patch: Record<string, unknown> = { status: input.status };
  if (input.status === "cancelled") {
    patch.cancellation_reason = input.reason?.trim() || null;
    patch.cancelled_at = new Date().toISOString();
    patch.cancelled_by = user.id;
  }

  // RLS garante que só o médico dono com vínculo ativo atualiza.
  const { data, error } = await supabase
    .from("appointments")
    .update(patch)
    .eq("id", input.appointmentId)
    .select("id")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Consulta não encontrada ou sem permissão." };
  await audit(input.appointmentId, user.id, input.status, {});
  revalidate();
  return { error: null };
}

// MÉDICO remarca: preserva a consulta original (status 'rescheduled') e cria uma
// nova vinculada por rescheduled_from_appointment_id.
export async function rescheduleAppointment(input: {
  appointmentId: string;
  startsAt: string;
  durationMinutes: number;
}): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const endsAt = computeEnds(input.startsAt, input.durationMinutes);
  if (!endsAt) return { error: "Data/hora inválida." };

  const { data: original } = await supabase
    .from("appointments")
    .select("id, doctor_id, patient_id, appointment_type, reason, status")
    .eq("id", input.appointmentId)
    .maybeSingle();
  if (!original) return { error: "Consulta não encontrada." };
  if (isTerminal(original.status as AppointmentStatus)) return { error: "Consulta já encerrada não pode ser remarcada." };

  const conflict = await conflictError(
    supabase,
    { column: "doctor_id", id: original.doctor_id as string },
    { starts_at: input.startsAt, ends_at: endsAt },
    input.appointmentId,
  );
  if (conflict) return { error: conflict };

  const { data: created, error: createErr } = await supabase
    .from("appointments")
    .insert({
      doctor_id: original.doctor_id,
      patient_id: original.patient_id,
      created_by: user.id,
      source: "manual",
      status: "scheduled",
      starts_at: input.startsAt,
      ends_at: endsAt,
      appointment_type: original.appointment_type,
      reason: original.reason,
      rescheduled_from_appointment_id: input.appointmentId,
    })
    .select("id")
    .single();
  if (createErr || !created) return { error: "Não foi possível remarcar a consulta." };

  const { error: updateErr } = await supabase
    .from("appointments")
    .update({ status: "rescheduled" })
    .eq("id", input.appointmentId);
  if (updateErr) return { error: "Nova consulta criada, mas falha ao arquivar a original." };

  await audit(input.appointmentId, user.id, "rescheduled", { new_appointment_id: created.id });
  await audit(created.id, user.id, "created", { rescheduled_from: input.appointmentId });
  revalidate();
  return { error: null };
}
