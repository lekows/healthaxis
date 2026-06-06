"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getReference, inferStatus } from "@/lib/biomarker-references";

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

    if (error) {
      if (error.code === "23505")
        return { error: "Exame duplicado — já existe um documento com este título, laboratório e data." };
      return { error: error.message };
    }

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
    ref_min: number | null;
    ref_max: number | null;
    reference: Record<string, number>;
    status: string;
    historico?: { data: string; valor: number }[];
  }[],
  examDate: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Sessão expirada." };

    const { data: profile } = await supabase.from("profiles").select("sex, dob").eq("id", user.id).single();
    const sex = (profile?.sex as string | null) ?? null;
    const ageYears = profile?.dob
      ? Math.floor((Date.now() - new Date(profile.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
      : null;

    const resolved = entries.map((e) => {
      const hasLabRef = e.ref_min !== null || e.ref_max !== null;
      const staticRef = getReference(e.slug, sex, ageYears);
      return {
        ...e,
        reference: staticRef ?? e.reference,
        // Quando o laudo forneceu faixas de referência, confiar no status calculado pelo OCR.
        // Usar referência estática apenas como fallback quando o laudo não tem faixas.
        status: hasLabRef ? e.status : (staticRef ? inferStatus(e.value, staticRef) : e.status),
      };
    });

    const { error: upsertErr } = await supabase.from("biomarkers").upsert(
      resolved.map((e) => ({
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
    const allPoints = [
      ...entries.map((e) => ({ slug: e.slug, recorded_at: examDate, date_label: dateLabel, value: e.value })),
      ...entries.flatMap((e) =>
        (e.historico ?? []).map((h) => ({
          slug: e.slug, recorded_at: h.data, date_label: toDateLabel(h.data), value: h.valor,
        }))
      ),
    ];

    // Dedup sem depender de unique constraint no banco: busca pontos já gravados e
    // insere só os que faltam. Idempotente — reenviar o mesmo laudo não duplica.
    const { data: existing } = await supabase
      .from("biomarker_history")
      .select("biomarker_slug, recorded_at")
      .eq("user_id", user.id);
    const seen = new Set((existing ?? []).map((r) => `${r.biomarker_slug}|${r.recorded_at}`));

    const toInsert = allPoints
      .filter((p) => {
        const key = `${p.slug}|${p.recorded_at}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((p) => ({
        user_id:        user.id,
        biomarker_slug: p.slug,
        date_label:     p.date_label,
        value:          p.value,
        recorded_at:    p.recorded_at,
      }));

    if (toInsert.length > 0) {
      const { error: histErr } = await supabase.from("biomarker_history").insert(toInsert);
      if (histErr) return { error: histErr.message };
    }

    revalidatePath("/exams");
    revalidatePath("/dashboard");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro inesperado ao salvar biomarcadores." };
  }
}

export async function saveDoctor(data: {
  name: string;
  crm: string | null;
  crm_uf: string | null;
  examDate: string;
}): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Sessão expirada." };

    const hasCrm = !!(data.crm && data.crm.trim());

    const existingQuery = hasCrm
      ? supabase.from("doctors").select("id, exam_count").eq("user_id", user.id).eq("crm", data.crm!).eq("crm_uf", data.crm_uf ?? "")
      : supabase.from("doctors").select("id, exam_count").eq("user_id", user.id).ilike("name", data.name);

    const existing = await existingQuery.maybeSingle();

    if (existing.data) {
      await supabase.from("doctors").update({
        last_exam_date: data.examDate,
        exam_count: (existing.data.exam_count ?? 1) + 1,
        name: data.name,
      }).eq("id", existing.data.id);
    } else {
      await supabase.from("doctors").insert({
        user_id: user.id,
        name: data.name,
        crm: hasCrm ? data.crm : null,
        crm_uf: hasCrm ? (data.crm_uf ?? null) : null,
        first_exam_date: data.examDate,
        last_exam_date: data.examDate,
        exam_count: 1,
      });
    }

    revalidatePath("/doctors");
    revalidatePath("/dashboard");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao salvar médico." };
  }
}

function toDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${months[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}
