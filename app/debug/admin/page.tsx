import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type DiagnosticResult = {
  label: string;
  status: "ok" | "error" | "timeout";
  durationMs: number;
  data?: unknown;
  error?: unknown;
};

async function withTimeout<T>(
  label: string,
  task: Promise<T>,
  timeoutMs = 5000
): Promise<DiagnosticResult> {
  const startedAt = Date.now();

  try {
    const result = await Promise.race([
      task,
      new Promise<"__timeout__">((resolve) => {
        setTimeout(() => resolve("__timeout__"), timeoutMs);
      }),
    ]);

    const durationMs = Date.now() - startedAt;

    if (result === "__timeout__") {
      return {
        label,
        status: "timeout",
        durationMs,
        error: `Query exceeded ${timeoutMs}ms`,
      };
    }

    return {
      label,
      status: "ok",
      durationMs,
      data: result,
    };
  } catch (error) {
    return {
      label,
      status: "error",
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : error,
    };
  }
}

export default async function DebugAdminPage() {
  const supabase = await createClient();

  const authResult = await withTimeout(
    "auth.getUser",
    supabase.auth.getUser(),
    5000
  );

  const authPayload = authResult.data as
    | { data?: { user?: { id: string; email?: string | null } | null }; error?: { message?: string } | null }
    | undefined;

  const user = authPayload?.data?.user ?? null;

  const diagnostics: DiagnosticResult[] = [authResult];

  if (user?.id) {
    const [ownProfile, adminProfile, ownDoctorProfile, profilesRead, logInsertProbe] =
      await Promise.all([
        withTimeout(
          "profiles.select own profile",
          supabase
            .from("profiles")
            .select("id, name, role, created_at")
            .eq("id", user.id)
            .maybeSingle(),
          5000
        ),
        withTimeout(
          "platform_admin_profiles.select own admin profile",
          supabase
            .from("platform_admin_profiles")
            .select("id, role, active, created_at, updated_at")
            .eq("id", user.id)
            .maybeSingle(),
          5000
        ),
        withTimeout(
          "doctor_profiles.select own doctor profile",
          supabase
            .from("doctor_profiles")
            .select("id, crm, crm_uf, specialty")
            .eq("id", user.id)
            .maybeSingle(),
          5000
        ),
        withTimeout(
          "profiles.select list through RLS",
          supabase
            .from("profiles")
            .select("id, name, role, created_at", { count: "exact" })
            .order("created_at", { ascending: false })
            .limit(20),
          5000
        ),
        withTimeout(
          "clinical_admin_access_logs.insert probe",
          supabase
            .from("clinical_admin_access_logs")
            .insert({
              admin_user_id: user.id,
              patient_id: null,
              access_type: "support_review",
              access_reason: "Debug probe from /debug/admin",
              route: "/debug/admin",
              metadata: {
                source: "debug_admin_page",
                timestamp: new Date().toISOString(),
              },
            })
            .select("id, created_at")
            .maybeSingle(),
          5000
        ),
      ]);

    diagnostics.push(
      ownProfile,
      adminProfile,
      ownDoctorProfile,
      profilesRead,
      logInsertProbe
    );
  }

  const response = {
    route: "/debug/admin",
    generatedAt: new Date().toISOString(),
    purpose:
      "Diagnose Supabase Auth/RLS behavior for clinical_admin without DashboardLayout or client hydration.",
    authenticated: Boolean(user),
    user: user
      ? {
          id: user.id,
          email: user.email,
        }
      : null,
    diagnostics,
    nextStep:
      "Open this route while logged in as admin@healthaxis.com.br and share the full JSON plus Vercel logs for this request if any diagnostic times out or errors.",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0D0D0B",
        color: "#E8E4D9",
        padding: 24,
      }}
    >
      <h1 style={{ fontSize: 20, marginBottom: 12 }}>HealthAxis Admin Debug</h1>
      <p style={{ color: "#9A9688", marginBottom: 16 }}>
        This page intentionally avoids DashboardLayout, motion and client-side Supabase calls.
      </p>
      <pre
        style={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          background: "#141412",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          padding: 16,
          fontSize: 12,
          lineHeight: 1.5,
        }}
      >
        {JSON.stringify(response, null, 2)}
      </pre>
    </main>
  );
}
