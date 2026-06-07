import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST { patient_id, slug, name } → adiciona marcador monitorado
export async function POST(req: Request) {
  const { patient_id, slug, name } = await req.json();
  if (!patient_id || !slug || !name)
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { error } = await supabase
    .from("doctor_watched_biomarkers")
    .upsert(
      { doctor_id: user.id, patient_id, slug, name },
      { onConflict: "doctor_id,patient_id,slug", ignoreDuplicates: true }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE { patient_id, slug } → remove marcador monitorado
export async function DELETE(req: Request) {
  const { patient_id, slug } = await req.json();
  if (!patient_id || !slug)
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { error } = await supabase
    .from("doctor_watched_biomarkers")
    .delete()
    .eq("doctor_id", user.id)
    .eq("patient_id", patient_id)
    .eq("slug", slug);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
