import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ReviewAction = "accepted" | "edited" | "rejected";

const allowedActions = new Set<ReviewAction>(["accepted", "edited", "rejected"]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as {
    agentRunId?: string;
    patientId?: string;
    action?: ReviewAction;
    editedOutput?: Record<string, unknown> | null;
  } | null;

  if (!body?.agentRunId || !body.patientId || !body.action || !allowedActions.has(body.action)) {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const { data: doctorProfile } = await supabase
    .from("doctor_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!doctorProfile) {
    return NextResponse.json({ error: "Apenas médicos podem revisar análises." }, { status: 403 });
  }

  const { data: link } = await supabase
    .from("doctor_patient_links")
    .select("id")
    .eq("doctor_id", user.id)
    .eq("patient_id", body.patientId)
    .is("revoked_at", null)
    .maybeSingle();

  if (!link) {
    return NextResponse.json({ error: "Paciente não vinculado ao médico." }, { status: 403 });
  }

  const patch: Record<string, unknown> = {
    human_decision: body.action,
    human_decision_by: user.id,
    human_decision_at: new Date().toISOString(),
  };

  if (body.action === "edited") {
    patch.edited_output = body.editedOutput ?? {};
  }

  if (body.action === "rejected") {
    patch.edited_output = body.editedOutput ?? null;
  }

  const { data, error } = await supabase
    .from("agent_runs")
    .update(patch)
    .eq("id", body.agentRunId)
    .eq("patient_id", body.patientId)
    .select("id, human_decision, human_decision_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Análise não encontrada ou sem permissão." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data });
}
