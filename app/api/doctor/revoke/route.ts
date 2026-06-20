import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logDoctorAccess } from "@/lib/supabase/doctor-queries";

export async function POST(req: Request) {
  const { linkId } = await req.json();
  if (!linkId) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: link } = await supabase
    .from("doctor_patient_links")
    .select("doctor_id")
    .eq("id", linkId)
    .eq("patient_id", user.id)
    .single();

  const { error } = await supabase
    .from("doctor_patient_links")
    .update({ revoked_at: new Date().toISOString(), revoked_by: user.id })
    .eq("id", linkId)
    .eq("patient_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (link) void logDoctorAccess(link.doctor_id, user.id, "link_revoked");
  return NextResponse.json({ ok: true });
}
