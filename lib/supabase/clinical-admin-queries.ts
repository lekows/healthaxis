import { createClient } from "@/lib/supabase/server";

export type ClinicalAdminRole = "clinical_admin" | "support_admin" | "security_admin";

export interface ClinicalAdminProfile {
  id: string;
  role: ClinicalAdminRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClinicalAdminPatient {
  id: string;
  name: string | null;
  dob: string | null;
  sex: string | null;
  role: string | null;
  created_at: string | null;
}

export async function getClinicalAdminProfile(): Promise<ClinicalAdminProfile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("platform_admin_profiles")
    .select("id, role, active, created_at, updated_at")
    .eq("id", user.id)
    .eq("active", true)
    .in("role", ["clinical_admin", "security_admin"])
    .maybeSingle();

  return (data as ClinicalAdminProfile | null) ?? null;
}

export async function logClinicalAdminAccess(params: {
  patientId?: string | null;
  accessType: "patient_list_view" | "patient_detail_view" | "search" | "export_attempt" | "support_review";
  accessReason: string;
  route?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const admin = await getClinicalAdminProfile();
  if (!admin) return;

  await supabase.from("clinical_admin_access_logs").insert({
    admin_user_id: user.id,
    patient_id: params.patientId ?? null,
    access_type: params.accessType,
    access_reason: params.accessReason,
    route: params.route ?? null,
    metadata: params.metadata ?? {},
  });
}

export async function getAllPatientsForClinicalAdmin(params?: {
  search?: string;
  limit?: number;
}): Promise<ClinicalAdminPatient[]> {
  const supabase = await createClient();
  const admin = await getClinicalAdminProfile();
  if (!admin) return [];

  await logClinicalAdminAccess({
    accessType: params?.search ? "search" : "patient_list_view",
    accessReason: "Visualização administrativa da lista de pacientes.",
    route: "/doctor/admin",
    metadata: {
      search: params?.search ?? null,
      limit: params?.limit ?? 100,
    },
  });

  let query = supabase
    .from("profiles")
    .select("id, name, dob, sex, role, created_at")
    .order("created_at", { ascending: false })
    .limit(params?.limit ?? 100);

  if (params?.search) {
    query = query.ilike("name", `%${params.search}%`);
  }

  const { data } = await query;
  return (data ?? []) as ClinicalAdminPatient[];
}
