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

export interface LinkedDoctor {
  id: string;
  doctor_id: string;
  patient_id: string;
  consent_at: string;
  revoked_at: string | null;
  doctor: { name: string; doctor_profiles: { crm: string; crm_uf: string; specialty: string | null }[] } | null;
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
    name: string;
    value: string;
    unit: string;
    status: string;
    category: string;
    last_date: string | null;
    reference: Record<string, unknown> | null;
  }[];
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

  const [profileRes, biomarkersRes, documentsRes] = await Promise.all([
    supabase.from("profiles").select("id, name, dob, sex").eq("id", patientId).maybeSingle(),
    supabase
      .from("biomarkers")
      .select("id, name, value, unit, status, category, last_date, reference")
      .eq("user_id", patientId),
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
    documents: documentsRes.data ?? [],
  };
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
