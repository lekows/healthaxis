import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { documentIds, doctorId, expiresInHours = 24 } = await req.json();

  if (!Array.isArray(documentIds) || documentIds.length === 0) {
    return NextResponse.json({ error: "Selecione ao menos um documento" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString();

  const { data, error } = await supabase
    .from("shared_exam_tokens")
    .insert({
      patient_id: user.id,
      doctor_id: doctorId ?? null,
      document_ids: documentIds,
      expires_at: expiresAt,
    })
    .select("token, expires_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const { tokenId } = await req.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  await supabase
    .from("shared_exam_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", tokenId)
    .eq("patient_id", user.id);

  return NextResponse.json({ ok: true });
}
