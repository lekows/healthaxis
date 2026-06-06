"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { inferStatus } from "@/lib/biomarker-references";

const CATEGORIES = ["Lipídios", "Glicemia", "Tireoide", "Hemograma", "Vitaminas", "Função Renal", "Função Hepática", "Hormônios", "Inflamação", "Outros"] as const;

export async function saveBiomarkerManual(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const name = String(formData.get("name") ?? "").trim();
  const value = parseFloat(String(formData.get("value") ?? ""));
  const unit = String(formData.get("unit") ?? "").trim();
  const category = String(formData.get("category") ?? "Outros");
  const dateStr = String(formData.get("date") ?? new Date().toISOString().slice(0, 10));
  const refMin = formData.get("ref_min") ? parseFloat(String(formData.get("ref_min"))) : null;
  const refMax = formData.get("ref_max") ? parseFloat(String(formData.get("ref_max"))) : null;

  if (!name || isNaN(value) || !unit) throw new Error("Campos obrigatórios ausentes");

  const slug = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const refRange = {
    ...(refMin !== null ? { min: refMin } : {}),
    ...(refMax !== null ? { max: refMax } : {}),
  };
  const status = (refMin !== null || refMax !== null) ? inferStatus(value, refRange) : "optimal";
  const reference = refMin !== null || refMax !== null ? { min: refMin, max: refMax } : null;
  const dateLabel = new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", { month: "short", year: "numeric" });

  await supabase.from("biomarkers").upsert({
    user_id: user.id,
    slug,
    name,
    value: String(value),
    unit,
    category,
    status,
    trend: "stable",
    reference,
    last_date: dateStr,
  }, { onConflict: "user_id,slug" });

  await supabase.from("biomarker_history").insert({
    user_id: user.id,
    biomarker_slug: slug,
    value: String(value),
    date_label: dateLabel,
    recorded_at: new Date(dateStr + "T12:00:00").toISOString(),
  });

  revalidatePath("/exams");
  revalidatePath("/dashboard");
}
