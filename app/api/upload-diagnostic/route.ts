import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const body = await req.json() as { storagePath?: string };
  if (!body.storagePath?.startsWith(`${user.id}/diagnostics/`)) {
    return NextResponse.json({ error: "Caminho de diagnostico invalido" }, { status: 400 });
  }

  const { data: urlData } = supabase.storage.from("exam-files").getPublicUrl(body.storagePath);
  const response = await fetch(urlData.publicUrl, { cache: "no-store" });
  const buffer = Buffer.from(await response.arrayBuffer());

  return NextResponse.json({
    ok: response.ok,
    status: response.status,
    bytes: buffer.byteLength,
    contentType: response.headers.get("content-type"),
    magic: buffer.subarray(0, 8).toString("hex"),
  });
}
