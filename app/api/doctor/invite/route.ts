import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "doctor") {
    return NextResponse.json({ error: "Apenas médicos podem gerar convites" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("doctor_invites")
    .insert({ doctor_id: user.id })
    .select("token, expires_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const { inviteId } = await req.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  await supabase
    .from("doctor_invites")
    .delete()
    .eq("id", inviteId)
    .eq("doctor_id", user.id);

  return NextResponse.json({ ok: true });
}
