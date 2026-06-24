"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getReference, inferStatus } from "@/lib/biomarker-references";

type ActionResult = { error?: string; duplicate?: boolean; id?: string };

async function getDoctorUserIdForPatient(patientId: string): Promise<{ error?: string; doctorId?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessao expirada. Faca login novamente." };

  const { data: doctorProfile } = await supabase
    .from("doctor_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (!doctorProfile) return { error: "Apenas medicos podem enviar exames para pacientes." };

  const { data: link } = await supabase
    .from("doctor_patient_links")
    .select("id")
    .eq("doctor_id", user.id)
    .eq("patient_id", patientId)
    .is("revoked_at", null)
    .maybeSingle();
  if (!link) return { error: "Paciente sem vinculo ativo com este medico." };

  return { doctorId: user.id };
}

export async function checkDoctorPatientDocumentDuplicate(patientId: string, contentHash: string): Promise<ActionResult> {
  const auth = await getDoctorUserIdForPatient(patientId);
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("id")
    .eq("user_id", patientId)
    .eq("content_hash", contentHash)
    .maybeSingle();
  if (error) return { error: error.message };
  return data ? { duplicate: true } : {};
}

export async function createDoctorPatientDocument(patientId: string, data: {
  title: string;
  type: string;
  lab: string;
  date: string;
  tags: string[];
  file_url: string | null;
  content_hash?: string | null;
}): Promise<ActionResult> {
  const auth = await getDoctorUserIdForPatient(patientId);
  if (auth.error || !auth.doctorId) return { error: auth.error };

  const supabase = await createClient();
  const { data: document, error } = await supabase.from("documents").insert({
    user_id: patientId,
    title: data.title,
    type: data.type,
    lab: data.lab,
    date: data.date,
    tags: data.tags,
    file_url: data.file_url,
    content_hash: data.content_hash ?? null,
    status: "pending",
    uploaded_by_doctor_id: auth.doctorId,
    source: "doctor_upload",
    patient_review_status: "pending_patient_review",
  }).select("id").single();

  if (error) {
    if (error.code === "23505") return { error: "Este exame ja foi enviado anteriormente.", duplicate: true };
    return { error: error.message };
  }

  revalidatePath(`/doctor/patient/${patientId}`);
  revalidatePath("/doctor");
  revalidatePath("/documents");
  revalidatePath("/exams");
  revalidatePath("/dashboard");
  return { id: document.id };
}

export async function registerDoctorPatientDocumentExamIdentity(patientId: string, data: {
  documentId: string;
  sourceLab: string | null;
  externalOrderId: string | null;
  externalOrderType: string | null;
  semanticFingerprint: string | null;
}): Promise<ActionResult> {
  const auth = await getDoctorUserIdForPatient(patientId);
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("documents")
    .update({
      source_lab: data.sourceLab,
      external_order_id: data.externalOrderId,
      external_order_type: data.externalOrderType,
      semantic_fingerprint: data.semanticFingerprint,
    })
    .eq("id", data.documentId)
    .eq("user_id", patientId);

  if (error?.code === "23505") {
    await supabase.from("documents").delete().eq("id", data.documentId).eq("user_id", patientId);
    return { error: "Este exame ja foi enviado anteriormente.", duplicate: true };
  }
  if (error) return { error: error.message };
  return {};
}

export async function saveDoctorPatientExamBiomarkers(
  patientId: string,
  documentId: string,
  entries: {
    slug: string;
    name: string;
    category: string;
    unit: string;
    value: number;
    ref_min: number | null;
    ref_max: number | null;
    reference: Record<string, number>;
    status: string;
    historico?: { data: string; valor: number }[];
  }[],
  examDate: string
): Promise<ActionResult> {
  const auth = await getDoctorUserIdForPatient(patientId);
  if (auth.error || !auth.doctorId) return { error: auth.error };

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("sex, dob").eq("id", patientId).single();
  const sex = (profile?.sex as string | null) ?? null;
  const ageYears = profile?.dob
    ? Math.floor((Date.now() - new Date(profile.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  const resolved = entries.map((e) => {
    const hasLabRef = e.ref_min !== null || e.ref_max !== null;
    const staticRef = getReference(e.slug, sex, ageYears);
    return {
      ...e,
      reference: staticRef ?? e.reference,
      status: hasLabRef ? e.status : (staticRef ? inferStatus(e.value, staticRef) : e.status),
    };
  });

  const { error: upsertErr } = await supabase.from("biomarkers").upsert(
    resolved.map((e) => ({
      user_id: patientId,
      slug: e.slug,
      name: e.name,
      category: e.category,
      unit: e.unit,
      value: String(e.value),
      reference: e.reference,
      status: e.status,
      trend: "stable",
      last_date: examDate,
      last_uploaded_by_doctor_id: auth.doctorId,
      last_source_document_id: documentId,
    })),
    { onConflict: "user_id,slug" }
  );
  if (upsertErr) return { error: upsertErr.message };

  const dateLabel = toDateLabel(examDate);
  const allPoints = [
    ...entries.map((e) => ({ slug: e.slug, recorded_at: examDate, date_label: dateLabel, value: e.value })),
    ...entries.flatMap((e) =>
      (e.historico ?? []).map((h) => ({
        slug: e.slug,
        recorded_at: h.data,
        date_label: toDateLabel(h.data),
        value: h.valor,
      }))
    ),
  ];

  const { data: existing } = await supabase
    .from("biomarker_history")
    .select("biomarker_slug, recorded_at")
    .eq("user_id", patientId);
  const seen = new Set((existing ?? []).map((r) => `${r.biomarker_slug}|${r.recorded_at}`));

  const toInsert = allPoints
    .filter((p) => {
      const key = `${p.slug}|${p.recorded_at}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((p) => ({
      user_id: patientId,
      biomarker_slug: p.slug,
      date_label: p.date_label,
      value: p.value,
      recorded_at: p.recorded_at,
      uploaded_by_doctor_id: auth.doctorId,
      source_document_id: documentId,
    }));

  if (toInsert.length > 0) {
    const { error: histErr } = await supabase.from("biomarker_history").insert(toInsert);
    if (histErr) return { error: histErr.message };
  }

  revalidatePath(`/doctor/patient/${patientId}`);
  revalidatePath("/exams");
  revalidatePath("/dashboard");
  return {};
}

function toDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}
