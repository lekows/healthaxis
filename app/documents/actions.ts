"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createDocument(data: {
  title: string;
  type: string;
  lab: string;
  date: string;
  tags: string[];
  file_url: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { error } = await supabase.from("documents").insert({
    user_id: user.id,
    title: data.title,
    type: data.type,
    lab: data.lab,
    date: data.date,
    tags: data.tags,
    file_url: data.file_url,
    status: "pending",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/documents");
  revalidatePath("/exams");
  revalidatePath("/dashboard");
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
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  await supabase.from("biomarkers").upsert(
    entries.map((e) => ({
      user_id: user.id,
      slug: e.slug,
      name: e.name,
      category: e.category,
      unit: e.unit,
      value: String(e.value),
      reference: e.reference,
      status: e.status,
      trend: "stable",
      last_date: examDate,
    })),
    { onConflict: "user_id,slug" }
  );

  const dateLabel = toDateLabel(examDate);
  await supabase.from("biomarker_history").insert(
    entries.map((e) => ({
      user_id: user.id,
      biomarker_slug: e.slug,
      date_label: dateLabel,
      value: e.value,
      recorded_at: examDate,
    }))
  );

  revalidatePath("/exams");
  revalidatePath("/dashboard");
}

function toDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${months[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}
