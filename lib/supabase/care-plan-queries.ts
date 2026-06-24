import { createClient } from "@/lib/supabase/server";

export interface CareGoal {
  id: string;
  description: string;
  metric: string | null;
  target: string | null;
  due_date: string | null;
  status: string;
}

export interface PrescribedHabit {
  id: string;
  title: string;
  frequency: string | null;
  notes: string | null;
  active: boolean;
}

export interface CareCheckIn {
  id: string;
  note: string | null;
  adherence: number | null;
  created_at: string;
}

export interface CarePlan {
  id: string;
  patient_id: string;
  doctor_id: string;
  title: string;
  summary: string | null;
  status: string;
  updated_at: string;
  goals: CareGoal[];
  habits: PrescribedHabit[];
  latest_check_in: CareCheckIn | null;
}

// Leitura defensiva: se as tabelas de plano de cuidado ainda não foram criadas
// (migração 20260624000000_care_plans.sql não aplicada) ou não há plano ativo,
// retorna null sem quebrar a página. A RLS garante o acesso (médico vinculado).
export async function getCarePlan(patientId: string): Promise<CarePlan | null> {
  try {
    const supabase = await createClient();

    const { data: plan, error } = await supabase
      .from("care_plans")
      .select("id, patient_id, doctor_id, title, summary, status, updated_at")
      .eq("patient_id", patientId)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !plan) return null;

    const [goalsRes, habitsRes, checkInRes] = await Promise.all([
      supabase.from("care_goals").select("id, description, metric, target, due_date, status").eq("care_plan_id", plan.id).order("created_at", { ascending: true }),
      supabase.from("prescribed_habits").select("id, title, frequency, notes, active").eq("care_plan_id", plan.id).order("created_at", { ascending: true }),
      supabase.from("care_check_ins").select("id, note, adherence, created_at").eq("care_plan_id", plan.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    return {
      ...plan,
      goals: goalsRes.data ?? [],
      habits: habitsRes.data ?? [],
      latest_check_in: checkInRes.data ?? null,
    } as CarePlan;
  } catch (e) {
    console.error("getCarePlan failed (migration aplicada?):", e instanceof Error ? e.message : e);
    return null;
  }
}
