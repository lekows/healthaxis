import { createClient } from "@/lib/supabase/server";

export interface DoctorProfile {
  id: string;
  crm: string;
  crm_uf: string;
  specialty: string | null;
  bio: string | null;
}

export interface DoctorInvite {
  id: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
  created_at: string;
}

export interface LinkedPatient {
  id: string;
  doctor_id: string;
  patient_id: string;
  consent_at: string;
  revoked_at: string | null;
  patient: { name: string };
}

export type DoctorCockpitSignal = "review" | "followup" | "stable";

export interface DoctorCockpitPatient {
  id: string;
  doctor_id: string;
  patient_id: string;
  consent_at: string;
  revoked_at: string | null;
  patient: {
    id: string;
    name: string;
    dob: string | null;
    sex: string | null;
  } | null;
  signal: DoctorCockpitSignal;
  signal_reason: string;
  next_action: string;
  days_linked: number;
  total_biomarkers: number;
  altered_biomarkers: number;
  critical_biomarkers: number;
  document_count: number;
  latest_document_date: string | null;
  latest_data_date: string | null;
  days_since_latest_data: number | null;
  pending_ai: number;
}

export interface LinkedDoctor {
  id: string;
  doctor_id: string;
  patient_id: string;
  consent_at: string;
  revoked_at: string | null;
  doctor: { name: string; doctor_profiles: { crm: string; crm_uf: string; specialty: string | null }[] } | null;
}

export interface WatchedBiomarker {
  id: string;
  slug: string;
  name: string;
}

export interface SharedExamToken {
  id: string;
  token: string;
  document_ids: string[];
  expires_at: string;
  viewed_at: string | null;
  revoked_at: string | null;
  created_at: string;
  doctor_id: string | null;
}

function daysSince(date: string | null) {
  if (!date) return null;
  const time = new Date(date).getTime();
  if (Number.isNaN(time)) return null;
  return Math.max(0, Math.floor((Date.now() - time) / 86400000));
}

function mostRecentDate(dates: Array<string | null | undefined>) {
  const validDates = dates
    .filter((date): date is string => Boolean(date))
    .map((date) => new Date(date).getTime())
    .filter((time) => !Number.isNaN(time));

  if (validDates.length === 0) return null;
  return new Date(Math.max(...validDates)).toISOString();
}

function classifyCockpitPatient(params: {
  alteredBiomarkers: number;
  criticalBiomarkers: number;
  documentCount: number;
  daysSinceLatestData: number | null;
  daysLinked: number;
}): Pick<DoctorCockpitPatient, "signal" | "signal_reason" | "next_action"> {
  if (params.criticalBiomarkers > 0) {
    return {
      signal: "review",
      signal_reason: "Biomarcadores críticos ou fora da faixa relevante",
      next_action: "Revisar exame e contexto clínico",
    };
  }

  if (params.alteredBiomarkers >= 3) {
    return {
      signal: "review",
      signal_reason: "Múltiplos biomarcadores alterados",
      next_action: "Revisar painel cardiometabólico",
    };
  }

  if (params.documentCount === 0 && params.daysLinked > 7) {
    return {
      signal: "followup",
      signal_reason: "Paciente vinculado sem documentos enviados",
      next_action: "Orientar envio de exames ou dados iniciais",
    };
  }

  if (params.daysSinceLatestData !== null && params.daysSinceLatestData > 90) {
    return {
      signal: "followup",
      signal_reason: "Sem dados recentes há mais de 90 dias",
      next_action: "Solicitar atualização antes da próxima consulta",
    };
  }

  if (params.alteredBiomarkers > 0) {
    return {
      signal: "followup",
      signal_reason: "Há biomarcadores para acompanhamento",
      next_action: "Acompanhar tendência e evolução",
    };
  }

  return {
    signal: "stable",
    signal_reason: "Sem prioridade operacional imediata",
    next_action: "Manter acompanhamento longitudinal",
  };
}

export async function getDoctorProfile(): Promise<DoctorProfile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("doctor_profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return data ?? null;
}

export async function getIsDoctor(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("doctor_profiles")
    .select("id")
    .eq("id", user.id)
    .single();
  return data !== null;
}

export async function getMyInvites(): Promise<DoctorInvite[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("doctor_invites")
    .select("*")
    .eq("doctor_id", user.id)
    .gt("expires_at", new Date().toISOString())
    .is("used_at", null)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getLinkedPatients(): Promise<LinkedPatient[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("doctor_patient_links")
    .select("*, patient:patient_id(name)")
    .eq("doctor_id", user.id)
    .is("revoked_at", null)
    .order("consent_at", { ascending: false });
  return (data ?? []) as LinkedPatient[];
}

export async function getDoctorCockpitPatients(): Promise<DoctorCockpitPatient[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: links } = await supabase
    .from("doctor_patient_links")
    .select("id, doctor_id, patient_id, consent_at, revoked_at, patient:patient_id(id, name, dob, sex)")
    .eq("doctor_id", user.id)
    .is("revoked_at", null)
    .order("consent_at", { ascending: false });

  const linkedPatients = links ?? [];
  const patientIds = linkedPatients.map((link) => link.patient_id).filter(Boolean);
  if (patientIds.length === 0) return [];

  const [biomarkersRes, documentsRes, pendingRunsRes] = await Promise.all([
    supabase
      .from("biomarkers")
      .select("id, user_id, status, last_date")
      .in("user_id", patientIds),
    supabase
      .from("documents")
      .select("id, user_id, date, created_at")
      .in("user_id", patientIds)
      .order("date", { ascending: false }),
    supabase
      .from("agent_runs")
      .select("id, patient_id")
      .in("patient_id", patientIds)
      .eq("human_decision", "pending"),
  ]);

  const biomarkers = biomarkersRes.data ?? [];
  const documents = documentsRes.data ?? [];
  const pendingRuns = pendingRunsRes.data ?? [];
  const nonOptimalStatuses = new Set(["critical", "high", "low", "attention"]);
  const criticalStatuses = new Set(["critical", "high", "low"]);

  const rows = linkedPatients.map((link) => {
    const patientBiomarkers = biomarkers.filter((item) => item.user_id === link.patient_id);
    const patientDocuments = documents.filter((item) => item.user_id === link.patient_id);
    const pendingAi = pendingRuns.filter((item) => item.patient_id === link.patient_id).length;
    const alteredBiomarkers = patientBiomarkers.filter((item) => nonOptimalStatuses.has(item.status)).length;
    const criticalBiomarkers = patientBiomarkers.filter((item) => criticalStatuses.has(item.status)).length;
    const latestDocumentDate = mostRecentDate(patientDocuments.map((item) => item.date ?? item.created_at));
    const latestBiomarkerDate = mostRecentDate(patientBiomarkers.map((item) => item.last_date));
    const latestDataDate = mostRecentDate([latestDocumentDate, latestBiomarkerDate]);
    const daysLinked = daysSince(link.consent_at) ?? 0;
    const daysSinceLatestData = daysSince(latestDataDate);
    const classification = classifyCockpitPatient({
      alteredBiomarkers,
      criticalBiomarkers,
      documentCount: patientDocuments.length,
      daysSinceLatestData,
      daysLinked,
    });

    return {
      ...link,
      patient: Array.isArray(link.patient) ? link.patient[0] ?? null : link.patient ?? null,
      signal: classification.signal,
      signal_reason: classification.signal_reason,
      next_action: classification.next_action,
      days_linked: daysLinked,
      total_biomarkers: patientBiomarkers.length,
      altered_biomarkers: alteredBiomarkers,
      critical_biomarkers: criticalBiomarkers,
      document_count: patientDocuments.length,
      latest_document_date: latestDocumentDate,
      latest_data_date: latestDataDate,
      days_since_latest_data: daysSinceLatestData,
      pending_ai: pendingAi,
    } as DoctorCockpitPatient;
  });

  const signalOrder: Record<DoctorCockpitSignal, number> = { review: 0, followup: 1, stable: 2 };
  return rows.sort((a, b) => {
    const signalDiff = signalOrder[a.signal] - signalOrder[b.signal];
    if (signalDiff !== 0) return signalDiff;
    return (b.altered_biomarkers + b.critical_biomarkers) - (a.altered_biomarkers + a.critical_biomarkers);
  });
}

export interface ExamChange {
  slug: string;
  name: string;
  unit: string | null;
  value: number;
  previous: number | null;
  delta: number | null;
  status: string;
}

export interface DoctorNewExam {
  id: string;
  patient_id: string;
  patient_name: string;
  title: string;
  lab: string | null;
  date: string | null;
  measured_count: number;
  altered_count: number;
  changes: ExamChange[];
  reviewed: boolean;
  is_new: boolean;
}

const EXAM_NON_OPTIMAL = new Set(["critical", "high", "low", "attention"]);

// Exames novos da carteira: documentos recentes dos pacientes vinculados, com
// "o que mudou" (delta vs. valor anterior, via biomarker_history.document_id) e
// status de revisão (proxy: houve panel_view do médico após a data do exame).
export async function getDoctorNewExams(limit = 50): Promise<DoctorNewExam[]> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: links } = await supabase
      .from("doctor_patient_links")
      .select("patient_id, patient:patient_id(id, name)")
      .eq("doctor_id", user.id)
      .is("revoked_at", null);
    const linked = links ?? [];
    const patientIds = linked.map((l) => l.patient_id).filter(Boolean);
    if (patientIds.length === 0) return [];

    const nameById = new Map<string, string>();
    linked.forEach((l) => {
      const p = Array.isArray(l.patient) ? l.patient[0] : l.patient;
      if (p) nameById.set(l.patient_id, p.name);
    });

    const [docsRes, biomarkersRes, accessRes, allHistRes] = await Promise.all([
      supabase.from("documents").select("id, user_id, title, lab, date").in("user_id", patientIds).order("date", { ascending: false }).limit(limit),
      supabase.from("biomarkers").select("user_id, slug, name, unit, status").in("user_id", patientIds),
      supabase.from("doctor_access_logs").select("patient_id, access_type, created_at").eq("doctor_id", user.id).eq("access_type", "panel_view"),
      supabase.from("biomarker_history").select("user_id, biomarker_slug, value, recorded_at, document_id").in("user_id", patientIds).order("recorded_at", { ascending: true }),
    ]);

    const docs = docsRes.data ?? [];
    const biomarkers = biomarkersRes.data ?? [];
    const accessLogs = accessRes.data ?? [];
    const history = allHistRes.data ?? [];

    const bioByKey = new Map<string, { name: string; unit: string | null; status: string }>();
    biomarkers.forEach((b) => bioByKey.set(`${b.user_id}:${b.slug}`, { name: b.name, unit: b.unit, status: b.status }));

    const histByKey = new Map<string, { value: number; recorded_at: string }[]>();
    const measuredByDoc = new Map<string, { user_id: string; slug: string; value: number; recorded_at: string }[]>();
    history.forEach((h) => {
      const key = `${h.user_id}:${h.biomarker_slug}`;
      const series = histByKey.get(key) ?? [];
      series.push({ value: Number(h.value), recorded_at: h.recorded_at });
      histByKey.set(key, series);
      if (h.document_id) {
        const arr = measuredByDoc.get(h.document_id) ?? [];
        arr.push({ user_id: h.user_id, slug: h.biomarker_slug, value: Number(h.value), recorded_at: h.recorded_at });
        measuredByDoc.set(h.document_id, arr);
      }
    });

    return docs.map((doc) => {
      const measured = measuredByDoc.get(doc.id) ?? [];
      const changes: ExamChange[] = measured.map((m) => {
        const meta = bioByKey.get(`${m.user_id}:${m.slug}`);
        const series = histByKey.get(`${m.user_id}:${m.slug}`) ?? [];
        let previous: number | null = null;
        for (const point of series) {
          if (new Date(point.recorded_at).getTime() < new Date(m.recorded_at).getTime()) previous = point.value;
          else break;
        }
        return {
          slug: m.slug,
          name: meta?.name ?? m.slug,
          unit: meta?.unit ?? null,
          value: m.value,
          previous,
          delta: previous !== null ? Number((m.value - previous).toFixed(2)) : null,
          status: meta?.status ?? "optimal",
        };
      });

      changes.sort((a, b) => {
        const aAlt = EXAM_NON_OPTIMAL.has(a.status) ? 1 : 0;
        const bAlt = EXAM_NON_OPTIMAL.has(b.status) ? 1 : 0;
        if (aAlt !== bAlt) return bAlt - aAlt;
        const aPct = a.previous ? Math.abs((a.delta ?? 0) / a.previous) : 0;
        const bPct = b.previous ? Math.abs((b.delta ?? 0) / b.previous) : 0;
        return bPct - aPct;
      });

      const docTime = doc.date ? new Date(doc.date).getTime() : 0;
      const reviewed = accessLogs.some((l) => l.patient_id === doc.user_id && l.created_at && new Date(l.created_at).getTime() >= docTime);
      const dAge = daysSince(doc.date);

      return {
        id: doc.id,
        patient_id: doc.user_id,
        patient_name: nameById.get(doc.user_id) ?? "Paciente",
        title: doc.title,
        lab: doc.lab,
        date: doc.date,
        measured_count: measured.length,
        altered_count: changes.filter((c) => EXAM_NON_OPTIMAL.has(c.status)).length,
        changes: changes.slice(0, 4),
        reviewed,
        is_new: dAge !== null && dAge <= 14,
      };
    });
  } catch (e) {
    console.error("getDoctorNewExams failed:", e instanceof Error ? e.message : e);
    return [];
  }
}

export async function getLinkedDoctors(): Promise<LinkedDoctor[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("doctor_patient_links")
    .select("*, doctor:doctor_id(name, doctor_profiles(crm, crm_uf, specialty))")
    .eq("patient_id", user.id)
    .is("revoked_at", null)
    .order("consent_at", { ascending: false });
  return (data ?? []) as LinkedDoctor[];
}

export interface PatientPanel {
  patient: { id: string; name: string; dob: string | null; sex: string | null } | null;
  biomarkers: {
    id: string;
    slug: string;
    name: string;
    value: string;
    unit: string;
    status: string;
    trend: string;
    category: string;
    last_date: string | null;
    reference: Record<string, unknown> | null;
  }[];
  history: { biomarker_slug: string; date_label: string; value: number }[];
  documents: {
    id: string;
    title: string;
    date: string;
    lab: string | null;
    type: string | null;
    status: string;
  }[];
}

/**
 * Carrega o painel de um paciente vinculado para o médico autenticado.
 * Retorna null se não houver vínculo ativo (médico não autorizado).
 * O acesso aos dados é garantido pela RLS de doctor-read-linked-patient-data.sql.
 */
export async function getLinkedPatientPanel(patientId: string): Promise<PatientPanel | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Guard de autorização: confirma vínculo ativo médico ↔ paciente.
  const { data: link } = await supabase
    .from("doctor_patient_links")
    .select("id")
    .eq("doctor_id", user.id)
    .eq("patient_id", patientId)
    .is("revoked_at", null)
    .maybeSingle();
  if (!link) return null;

  const [profileRes, biomarkersRes, historyRes, documentsRes] = await Promise.all([
    supabase.from("profiles").select("id, name, dob, sex").eq("id", patientId).maybeSingle(),
    supabase
      .from("biomarkers")
      .select("id, slug, name, value, unit, status, trend, category, last_date, reference")
      .eq("user_id", patientId),
    supabase
      .from("biomarker_history")
      .select("biomarker_slug, date_label, value, recorded_at")
      .eq("user_id", patientId)
      .order("recorded_at", { ascending: true }),
    supabase
      .from("documents")
      .select("id, title, date, lab, type, status")
      .eq("user_id", patientId)
      .order("date", { ascending: false })
      .limit(5),
  ]);

  return {
    patient: profileRes.data ?? null,
    biomarkers: biomarkersRes.data ?? [],
    history: historyRes.data ?? [],
    documents: documentsRes.data ?? [],
  };
}

export async function getWatchedBiomarkers(patientId: string): Promise<WatchedBiomarker[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("doctor_watched_biomarkers")
    .select("id, slug, name")
    .eq("doctor_id", user.id)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: true });
  return (data ?? []) as WatchedBiomarker[];
}

export async function getWatchedBiomarkersByPatient(patientId: string): Promise<Array<{ doctor_id: string; slug: string; name: string }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("doctor_watched_biomarkers")
    .select("doctor_id, slug, name")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function getPatientLatestMetabolicAnalysis(patientId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("agent_runs")
    .select("id, output_json, confidence_score, completed_at")
    .eq("patient_id", patientId)
    .eq("agent_name", "metabolic_analysis")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

export async function getMySharedTokens(): Promise<SharedExamToken[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("shared_exam_tokens")
    .select("*")
    .eq("patient_id", user.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function logDoctorAccess(
  doctorId: string,
  patientId: string,
  accessType: "panel_view" | "link_created" | "link_revoked"
): Promise<void> {
  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  await admin.from("doctor_access_logs").insert({
    doctor_id: doctorId,
    patient_id: patientId,
    access_type: accessType,
  });
}
