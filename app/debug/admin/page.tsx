import { createClient } from "@/lib/supabase/server";
import { getClinicalAdminProfile, withTimeout } from "@/lib/supabase/clinical-admin-queries";

export const dynamic = "force-dynamic";

// Página de diagnóstico temporária — sem DashboardLayout, sem motion, sem
// redirect. Isola se o freeze é de dados/RLS (não de layout/hydration).
// Remover após validar o login do admin clínico.
export default async function DebugAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = await getClinicalAdminProfile();

  let profilesCount: number | null = null;
  let profilesError: string | null = null;
  try {
    const { count, error } = await withTimeout(
      supabase.from("profiles").select("id", { count: "exact", head: true })
    );
    if (error) profilesError = error.message;
    else profilesCount = count ?? null;
  } catch (e) {
    profilesError = e instanceof Error ? e.message : String(e);
  }

  const report = {
    user: user?.email ?? null,
    userId: user?.id ?? null,
    clinicalAdmin: admin ? { role: admin.role, active: admin.active } : null,
    profilesCount,
    profilesError,
  };

  return (
    <pre style={{ padding: 24, color: "#E8E4D9", background: "#0D0D0B", minHeight: "100vh", fontSize: 13 }}>
      {JSON.stringify(report, null, 2)}
    </pre>
  );
}
