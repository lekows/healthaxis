"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string };

export async function createDocument(data: {
  title: string;
  type: string;
  lab: string;
  date: string;
  tags: string[];
  file_url: string | null;
}): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Sessão expirada. Faça login novamente." };

    const { error } = await supabase.from("documents").insert({
      user_id:  user.id,
      title:    data.title,
      type:     data.type,
      lab:      data.lab,
      date:     data.date,
      tags:     data.tags,
      file_url: data.file_url,
      status:   "pending",
    });

    if (error) return { error: error.message };

    revalidatePath("/documents");
    revalidatePath("/exams");
    revalidatePath("/dashboard");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro inesperado ao salvar documento." };
  }
}

export async function saveExamBiomarkers(
  entries: {
    slug: string;
    name: string;
    category: string;
    unit: string;
    value: number;
    reference: Record<string, number>;
    status: string;
  }[],
  examDate: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Sessão expirada." };

    const { error: upsertErr } = await supabase.from("biomarkers").upsert(
      entries.map((e) => ({
        user_id:   user.id,
        slug:      e.slug,
        name:      e.name,
        category:  e.category,
        unit:      e.unit,
        value:     String(e.value),
        reference: e.reference,
        status:    e.status,
        trend:     "stable",
        last_date: examDate,
      })),
      { onConflict: "user_id,slug" }
    );
    if (upsertErr) return { error: upsertErr.message };

    const dateLabel = toDateLabel(examDate);
    const { error: histErr } = await supabase.from("biomarker_history").insert(
      entries.map((e) => ({
        user_id:        user.id,
        biomarker_slug: e.slug,
        date_label:     dateLabel,
        value:          e.value,
        recorded_at:    examDate,
      }))
    );
    if (histErr) return { error: histErr.message };

    revalidatePath("/exams");
    revalidatePath("/dashboard");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro inesperado ao salvar biomarcadores." };
  }
}

function toDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${months[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}
