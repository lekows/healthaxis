import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConsultationBrief, TrendHighlight } from "@/lib/agents/types";

export async function getPatientClinicalContext(patientId: string, supabase: SupabaseClient) {
  const [profileRes, biomarkersRes, docsRes] = await Promise.all([
    supabase.from("profiles").select("name, dob, sex, weight, height, blood").eq("id", patientId).single(),
    supabase.from("biomarkers").select("name, slug, category, status, value, unit, last_date").eq("user_id", patientId).order("status"),
    supabase.from("documents").select("title, type, date, lab, doctor_name").eq("user_id", patientId).order("date", { ascending: false }).limit(5),
  ]);

  return {
    profile: profileRes.data ?? null,
    biomarkers: biomarkersRes.data ?? [],
    recentDocuments: docsRes.data ?? [],
  };
}

export async function getExamTimeline(patientId: string, supabase: SupabaseClient) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 24);

  const [historyRes, scoresRes] = await Promise.all([
    supabase.from("biomarker_history")
      .select("biomarker_slug, date_label, value, recorded_at")
      .eq("user_id", patientId)
      .gte("recorded_at", cutoff.toISOString().slice(0, 10))
      .order("recorded_at"),
    supabase.from("health_scores_history")
      .select("overall, metabolic, cardiovascular, preventive, lifestyle, date_label, recorded_at")
      .eq("user_id", patientId)
      .gte("recorded_at", cutoff.toISOString().slice(0, 10))
      .order("recorded_at"),
  ]);

  const bySlug: Record<string, { date: string; label: string; value: number }[]> = {};
  for (const row of historyRes.data ?? []) {
    if (!bySlug[row.biomarker_slug]) bySlug[row.biomarker_slug] = [];
    bySlug[row.biomarker_slug].push({ date: row.recorded_at, label: row.date_label, value: Number(row.value) });
  }

  return {
    biomarkerTimeline: bySlug,
    scoreHistory: scoresRes.data ?? [],
  };
}

export async function getWatchedBiomarkers(patientId: string, doctorId: string, supabase: SupabaseClient) {
  const { data } = await supabase
    .from("doctor_watched_biomarkers")
    .select("slug, name")
    .eq("patient_id", patientId)
    .eq("doctor_id", doctorId);
  return data ?? [];
}

function sanitizeClinicalText(text: string): string {
  const PRESCRIPTIVE = /prescrev|diagnos|tome\b|use\b|aplique|injete|cirurg/i;
  return PRESCRIPTIVE.test(text)
    ? text.replace(PRESCRIPTIVE, "[informação removida — linguagem prescritiva]")
    : text;
}

export function composeConsultationBrief(raw: {
  summary: string;
  trendHighlights: TrendHighlight[];
  openQuestions: string[];
  confidence: number;
}): ConsultationBrief {
  return {
    summary: sanitizeClinicalText(raw.summary ?? ""),
    trendHighlights: (raw.trendHighlights ?? []).slice(0, 10).map((h) => ({
      ...h,
      note: sanitizeClinicalText(h.note ?? ""),
    })),
    openQuestions: (raw.openQuestions ?? []).slice(0, 8).map(sanitizeClinicalText),
    confidence: Math.max(0, Math.min(1, raw.confidence ?? 0)),
  };
}
