"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { error: string | null };

const GOAL_STATUSES = ["open", "met", "missed", "paused"] as const;
type GoalStatus = (typeof GOAL_STATUSES)[number];

// Auditoria fora do caminho crítico. care_plan_events não tem policy de INSERT
// (deny-by-default), então a escrita usa service role; actor_id é o usuário real.
async function audit(planId: string | null, actorId: string, action: string, metadata: Record<string, unknown> = {}) {
  try {
    const { createClient: createAdmin } = await import("@supabase/supabase-js");
    const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    await admin.from("care_plan_events").insert({ care_plan_id: planId, actor_id: actorId, action, metadata });
  } catch (e) {
    console.error("care_plan audit failed:", e instanceof Error ? e.message : e);
  }
}

function revalidatePatient(patientId: string) {
  revalidatePath(`/doctor/patient/${patientId}`);
}

export async function createCarePlan(patientId: string, title: string, summary: string): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  // RLS (care_plans_doctor_all) exige doctor_id = auth.uid() e vínculo ativo.
  const { data, error } = await supabase
    .from("care_plans")
    .insert({ patient_id: patientId, doctor_id: user.id, title: title.trim() || "Plano de cuidado", summary: summary.trim() || null })
    .select("id")
    .single();

  if (error || !data) return { error: "Não foi possível criar o plano. Verifique o vínculo com o paciente." };
  await audit(data.id, user.id, "plan_created", { patient_id: patientId });
  revalidatePatient(patientId);
  return { error: null };
}

export async function updateCarePlan(planId: string, patientId: string, title: string, summary: string): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const { error } = await supabase.from("care_plans").update({ title: title.trim() || "Plano de cuidado", summary: summary.trim() || null }).eq("id", planId);
  if (error) return { error: "Não foi possível atualizar o plano." };
  await audit(planId, user.id, "plan_updated", {});
  revalidatePatient(patientId);
  return { error: null };
}

export async function addGoal(planId: string, patientId: string, input: { description: string; metric: string; target: string; due_date: string }): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };
  if (!input.description.trim()) return { error: "Descreva a meta." };

  const { error } = await supabase.from("care_goals").insert({
    care_plan_id: planId,
    description: input.description.trim(),
    metric: input.metric.trim() || null,
    target: input.target.trim() || null,
    due_date: input.due_date || null,
  });
  if (error) return { error: "Não foi possível adicionar a meta." };
  await audit(planId, user.id, "goal_added", { description: input.description.trim() });
  revalidatePatient(patientId);
  return { error: null };
}

export async function updateGoalStatus(goalId: string, planId: string, patientId: string, status: string): Promise<Result> {
  if (!GOAL_STATUSES.includes(status as GoalStatus)) return { error: "Status inválido." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const { error } = await supabase.from("care_goals").update({ status }).eq("id", goalId);
  if (error) return { error: "Não foi possível atualizar a meta." };
  await audit(planId, user.id, "goal_status_changed", { goal_id: goalId, status });
  revalidatePatient(patientId);
  return { error: null };
}

export async function addHabit(planId: string, patientId: string, input: { title: string; frequency: string; notes: string }): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };
  if (!input.title.trim()) return { error: "Descreva o hábito." };

  const { error } = await supabase.from("prescribed_habits").insert({
    care_plan_id: planId,
    title: input.title.trim(),
    frequency: input.frequency.trim() || null,
    notes: input.notes.trim() || null,
  });
  if (error) return { error: "Não foi possível prescrever o hábito." };
  await audit(planId, user.id, "habit_prescribed", { title: input.title.trim() });
  revalidatePatient(patientId);
  return { error: null };
}

export async function toggleHabit(habitId: string, planId: string, patientId: string, active: boolean): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const { error } = await supabase.from("prescribed_habits").update({ active }).eq("id", habitId);
  if (error) return { error: "Não foi possível atualizar o hábito." };
  await audit(planId, user.id, active ? "habit_reactivated" : "habit_paused", { habit_id: habitId });
  revalidatePatient(patientId);
  return { error: null };
}
