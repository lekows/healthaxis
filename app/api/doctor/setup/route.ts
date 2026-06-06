import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { crm, crmUf, specialty, bio } = await req.json();

  if (!crm || !crmUf) {
    return NextResponse.json({ error: "CRM e UF são obrigatórios" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  await supabase
    .from("profiles")
    .update({ role: "doctor" })
    .eq("id", user.id);

  const { error } = await supabase
    .from("doctor_profiles")
    .upsert({ id: user.id, crm: crm.trim(), crm_uf: crmUf.trim().toUpperCase(), specialty: specialty ?? null, bio: bio ?? null });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
