import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: "Token inválido" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  // Resolve o convite via SECURITY DEFINER (sem expor RLS)
  const { data: invite, error: resolveErr } = await supabase
    .rpc("resolve_doctor_invite", { p_token: token })
    .single();

  if (resolveErr || !invite) {
    return NextResponse.json({ error: "Convite inválido ou expirado" }, { status: 404 });
  }

  const doctorId = (invite as { doctor_id: string }).doctor_id;

  if (doctorId === user.id) {
    return NextResponse.json({ error: "Médico não pode aceitar o próprio convite" }, { status: 400 });
  }

  // Cria o vínculo com timestamp de consentimento (LGPD)
  const { error: linkError } = await supabase
    .from("doctor_patient_links")
    .upsert(
      { doctor_id: doctorId, patient_id: user.id, consent_at: new Date().toISOString(), revoked_at: null },
      { onConflict: "doctor_id,patient_id", ignoreDuplicates: false }
    );

  if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 });

  // Marca o convite como utilizado
  const { data: inviteRecord } = await supabase
    .from("doctor_invites")
    .select("id")
    .eq("token", token)
    .single();

  if (inviteRecord) {
    await supabase
      .from("doctor_invites")
      .update({ used_at: new Date().toISOString(), used_by: user.id })
      .eq("id", inviteRecord.id);
  }

  return NextResponse.json({ ok: true, doctor_id: doctorId });
}
