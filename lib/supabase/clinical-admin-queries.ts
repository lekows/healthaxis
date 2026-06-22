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

// Evita que uma query lenta/quebrada (ex.: recursão de RLS) pendure o render
// server-side indefinidamente. Em timeout, rejeita e o chamador degrada.
export function withTimeout<T>(p: PromiseLike<T>, ms = 5000): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`query timeout after ${ms}ms`)), ms)
    ),
  ]);
}

export async function getClinicalAdminProfile(): Promise<ClinicalAdminProfile | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await withTimeout(
      supabase
        .from("platform_admin_profiles")
        .select("id, role, active, created_at, updated_at")
        .eq("id", user.id)
        .eq("active", true)
        .in("role", ["clinical_admin", "security_admin"])
        .maybeSingle()
    );

    if (error) {
      console.error("getClinicalAdminProfile RLS/query error:", error.message);
      return null;
    }
    return (data as ClinicalAdminProfile | null) ?? null;
  } catch (e) {
    console.error("getClinicalAdminProfile failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

// Auditoria fora do caminho crítico de render: usa client de service role
// (como logDoctorAccess) e nunca lança — chamar com `void`.
export async function logClinicalAdminAccess(params: {
  patientId?: string | null;
  accessType: "patient_list_view" | "patient_detail_view" | "search" | "export_attempt" | "support_review";
  accessReason: string;
  route?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { createClient: createAdminClient } = await import("@supabase/supabase-js");
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await admin.from("clinical_admin_access_logs").insert({
      admin_user_id: user.id,
      patient_id: params.patientId ?? null,
      access_type: params.accessType,
      access_reason: params.accessReason,
      route: params.route ?? null,
      metadata: params.metadata ?? {},
    });
  } catch (e) {
    console.error("logClinicalAdminAccess failed:", e instanceof Error ? e.message : e);
  }
}

export async function getAllPatientsForClinicalAdmin(params?: {
  search?: string;
  limit?: number;
  admin?: ClinicalAdminProfile;
}): Promise<ClinicalAdminPatient[]> {
  try {
    const supabase = await createClient();
    const admin = params?.admin ?? (await getClinicalAdminProfile());
    if (!admin) return [];

    // Não bloqueia o render: auditoria em fire-and-forget.
    void logClinicalAdminAccess({
      accessType: params?.search ? "search" : "patient_list_view",
      accessReason: "Visualização administrativa da lista de pacientes.",
      route: "/doctor/admin",
      metadata: { search: params?.search ?? null, limit: params?.limit ?? 100 },
    });

    let query = supabase
      .from("profiles")
      .select("id, name, dob, sex, role, created_at")
      .order("created_at", { ascending: false })
      .limit(params?.limit ?? 100);

    if (params?.search) {
      query = query.ilike("name", `%${params.search}%`);
    }

    const { data, error } = await withTimeout(query);
    if (error) {
      console.error("getAllPatientsForClinicalAdmin error:", error.message);
      return [];
    }
    return (data ?? []) as ClinicalAdminPatient[];
  } catch (e) {
    console.error("getAllPatientsForClinicalAdmin failed:", e instanceof Error ? e.message : e);
    return [];
  }
}
