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

export interface CorrectBiomarkerInput {
  slug: string;
  name: string;
  value: number;
  unit: string;
  ref_min: number | null;
  ref_max: number | null;
  original: {
    value: number;
    unit: string;
    name: string;
    ref_min: number | null;
    ref_max: number | null;
  };
}

export async function correctBiomarker(input: CorrectBiomarkerInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { slug, name, value, unit, ref_min, ref_max, original } = input;
  if (!slug || !name.trim() || isNaN(value) || !unit.trim()) {
    throw new Error("Campos obrigatórios ausentes");
  }

  const refRange = {
    ...(ref_min !== null ? { min: ref_min } : {}),
    ...(ref_max !== null ? { max: ref_max } : {}),
  };
  const status = (ref_min !== null || ref_max !== null) ? inferStatus(value, refRange) : "optimal";
  const reference = ref_min !== null || ref_max !== null ? { min: ref_min, max: ref_max } : null;

  const { error: updErr } = await supabase
    .from("biomarkers")
    .update({ name: name.trim(), value: String(value), unit: unit.trim(), reference, status })
    .eq("user_id", user.id)
    .eq("slug", slug);
  if (updErr) throw new Error(updErr.message);

  // Atualiza o ponto mais recente do histórico para o gráfico bater com o valor corrigido.
  const { data: latest } = await supabase
    .from("biomarker_history")
    .select("id")
    .eq("user_id", user.id)
    .eq("biomarker_slug", slug)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latest?.id) {
    await supabase.from("biomarker_history").update({ value: String(value) }).eq("id", latest.id);
  }

  // Captura dos diffs como dado de treino (best-effort: nunca bloqueia a correção).
  const diffs: { field: string; original_value: string; corrected_value: string }[] = [];
  if (value !== original.value) diffs.push({ field: "value", original_value: String(original.value), corrected_value: String(value) });
  if (unit.trim() !== original.unit) diffs.push({ field: "unit", original_value: original.unit, corrected_value: unit.trim() });
  if (name.trim() !== original.name) diffs.push({ field: "name", original_value: original.name, corrected_value: name.trim() });
  if (ref_min !== original.ref_min) diffs.push({ field: "ref_min", original_value: String(original.ref_min ?? ""), corrected_value: String(ref_min ?? "") });
  if (ref_max !== original.ref_max) diffs.push({ field: "ref_max", original_value: String(original.ref_max ?? ""), corrected_value: String(ref_max ?? "") });

  if (diffs.length > 0) {
    try {
      await supabase.from("extraction_feedback").insert(
        diffs.map((d) => ({
          user_id: user.id,
          slug,
          biomarker_name: name.trim(),
          field: d.field,
          original_value: d.original_value,
          corrected_value: d.corrected_value,
          error_type: "edited",
        }))
      );
    } catch { /* feedback é best-effort */ }
  }

  revalidatePath("/exams");
  revalidatePath("/dashboard");
}
