import { createClient } from "./server";

export async function getProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data;
}

export async function getBiomarkers() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("biomarkers")
    .select("*")
    .eq("user_id", user.id)
    .order("category");

  return data ?? [];
}

export async function getBiomarkerHistory(slug?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("biomarker_history")
    .select("*")
    .eq("user_id", user.id)
    .order("recorded_at");

  if (slug) query = query.eq("biomarker_slug", slug);

  const { data } = await query;
  return data ?? [];
}

export async function getDocuments() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  return data ?? [];
}

export async function getMedications() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("medications")
    .select("*")
    .eq("user_id", user.id)
    .eq("active", true)
    .order("name");

  return data ?? [];
}

export async function getFamilyHistory() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("family_history")
    .select("*")
    .eq("user_id", user.id);

  return data ?? [];
}

export async function getTimelineEvents() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("timeline_events")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  return data ?? [];
}

// Lembretes exclusivos do sexo feminino — ocultados para perfis masculinos.
const FEMALE_ONLY_TERMS = ["ginecolog", "papanicolau", "mamografia", "colposcopia", "citologia cervical"];

export async function getPreventiveReminders() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const [{ data: reminders }, { data: profile }] = await Promise.all([
    supabase
      .from("preventive_reminders")
      .select("*")
      .eq("user_id", user.id)
      .eq("done", false)
      .order("due_date"),
    supabase
      .from("profiles")
      .select("sex")
      .eq("id", user.id)
      .single(),
  ]);

  const all = reminders ?? [];
  if (profile?.sex !== "masculino") return all;

  return all.filter((r) => {
    const text = `${r.title} ${r.description ?? ""}`.toLowerCase();
    return !FEMALE_ONLY_TERMS.some((term) => text.includes(term));
  });
}

export async function getHealthScore() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("health_scores")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return data;
}

export async function getDoctors() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("doctors")
    .select("*")
    .eq("user_id", user.id)
    .order("last_exam_date", { ascending: false });

  return data ?? [];
}

export async function getHealthScoreHistory() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("health_scores_history")
    .select("*")
    .eq("user_id", user.id)
    .order("recorded_at");

  return data ?? [];
}

export async function getLatestMetabolicAnalysis() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("agent_runs")
    .select("id, output_json, confidence_score, completed_at")
    .eq("patient_id", user.id)
    .eq("agent_name", "metabolic_analysis")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}
