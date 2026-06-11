"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getReference, inferStatus } from "@/lib/biomarker-references";
import {
  computeDimensionScores, computeLifestyleScore, computeOverall,
  computeTrend, deriveReminders, resolvedReminderTitles,
  type BiomarkerStatus,
} from "@/lib/health-derivation";

type ActionResult = { error?: string; duplicate?: boolean; id?: string };

export async function createDocument(data: {
  title: string;
  type: string;
  lab: string;
  date: string;
  tags: string[];
  file_url: string | null;
  content_hash?: string | null;
}): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Sessão expirada. Faça login novamente." };

    const { data: document, error } = await supabase.from("documents").insert({
      user_id:  user.id,
      title:    data.title,
      type:     data.type,
      lab:      data.lab,
      date:     data.date,
      tags:     data.tags,
      file_url: data.file_url,
      content_hash: data.content_hash ?? null,
      status:   "pending",
    }).select("id").single();

    if (error) {
      if (error.code === "23505") return { error: "Este exame ja foi enviado anteriormente.", duplicate: true };
      return { error: error.message };
    }

    revalidatePath("/documents");
    revalidatePath("/exams");
    revalidatePath("/dashboard");
    return { id: document.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro inesperado ao salvar documento." };
  }
}

export async function checkDocumentContentDuplicate(contentHash: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessao expirada. Faca login novamente." };

  const { data, error } = await supabase
    .from("documents")
    .select("id")
    .eq("user_id", user.id)
    .eq("content_hash", contentHash)
    .maybeSingle();
  if (error) return { error: error.message };
  return data ? { duplicate: true } : {};
}

export async function registerDocumentExamIdentity(data: {
  documentId: string;
  sourceLab: string | null;
  externalOrderId: string | null;
  externalOrderType: string | null;
  semanticFingerprint: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessao expirada. Faca login novamente." };

  const { error } = await supabase
    .from("documents")
    .update({
      source_lab: data.sourceLab,
      external_order_id: data.externalOrderId,
      external_order_type: data.externalOrderType,
      semantic_fingerprint: data.semanticFingerprint,
    })
    .eq("id", data.documentId)
    .eq("user_id", user.id);

  if (error?.code === "23505") {
    await supabase.from("documents").delete().eq("id", data.documentId).eq("user_id", user.id);
    return { error: "Este exame ja foi enviado anteriormente.", duplicate: true };
  }
  if (error) return { error: error.message };
  return {};
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

    const { data: profile } = await supabase.from("profiles").select("sex, dob, weight, height").eq("id", user.id).single();
    const sex = (profile?.sex as string | null) ?? null;
    const ageYears = profile?.dob
      ? Math.floor((Date.now() - new Date(profile.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
      : null;

    const { data: existing } = await supabase
      .from("biomarker_history")
      .select("biomarker_slug, recorded_at, value")
      .eq("user_id", user.id);

    const priorValue = (slug: string, embedded: { data: string; valor: number }[]): number | null => {
      const candidates = [
        ...(existing ?? [])
          .filter((r) => r.biomarker_slug === slug && r.recorded_at < examDate)
          .map((r) => ({ date: r.recorded_at as string, value: Number(r.value) })),
        ...embedded
          .filter((h) => h.data < examDate)
          .map((h) => ({ date: h.data, value: h.valor })),
      ];
      if (candidates.length === 0) return null;
      candidates.sort((a, b) => (a.date < b.date ? 1 : -1));
      return candidates[0].value;
    };

    const resolved = entries.map((e) => {
      const hasLabRef = e.ref_min !== null || e.ref_max !== null;
      const staticRef = getReference(e.slug, sex, ageYears);
      return {
        ...e,
        reference: staticRef ?? e.reference,
        // Quando o laudo forneceu faixas de referência, confiar no status calculado pelo OCR.
        // Usar referência estática apenas como fallback quando o laudo não tem faixas.
        status: hasLabRef ? e.status : (staticRef ? inferStatus(e.value, staticRef) : e.status),
        trend: computeTrend(e.value, priorValue(e.slug, e.historico ?? [])),
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
        trend:     e.trend,
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

    // Dedup sem depender de unique constraint no banco: pontos já gravados foram
    // buscados acima; insere só os que faltam. Idempotente — reenviar o mesmo laudo não duplica.
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

    // Derivação best-effort: o exame já foi salvo, falha aqui não pode quebrar o upload.
    try {
      const { data: allBiomarkers } = await supabase
        .from("biomarkers")
        .select("name, category, status")
        .eq("user_id", user.id);

      const dims = computeDimensionScores(
        (allBiomarkers ?? []).map((b) => ({ category: b.category, status: b.status as BiomarkerStatus }))
      );
      const lifestyle = computeLifestyleScore(
        profile?.weight ? Number(profile.weight) : null,
        profile?.height ? Number(profile.height) : null
      );

      let storedLifestyle = lifestyle;
      if (lifestyle === null) {
        const { data: currentScore } = await supabase
          .from("health_scores").select("lifestyle").eq("user_id", user.id).maybeSingle();
        storedLifestyle = currentScore?.lifestyle ?? 0;
      }

      const overall = computeOverall({ ...dims, lifestyle });
      const scores = {
        overall,
        metabolic:      dims.metabolic ?? 0,
        cardiovascular: dims.cardiovascular ?? 0,
        preventive:     dims.preventive ?? 0,
        lifestyle:      storedLifestyle ?? 0,
      };

      await supabase.from("health_scores").upsert(
        { user_id: user.id, ...scores, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );

      await supabase.from("health_scores_history").upsert(
        { user_id: user.id, ...scores, recorded_at: examDate, date_label: dateLabel },
        { onConflict: "user_id,recorded_at" }
      );

      const statusEntries = resolved.map((e) => ({ name: e.name, status: e.status as BiomarkerStatus }));
      const reminders = deriveReminders(statusEntries, examDate);
      if (reminders.length > 0) {
        await supabase.from("preventive_reminders").upsert(
          reminders.map((r) => ({ user_id: user.id, ...r, done: false })),
          { onConflict: "user_id,title" }
        );
      }

      const resolvedTitles = resolvedReminderTitles(statusEntries);
      if (resolvedTitles.length > 0) {
        await supabase.from("preventive_reminders")
          .update({ done: true })
          .eq("user_id", user.id)
          .in("title", resolvedTitles);
      }
    } catch (derivErr) {
      console.error("Falha na derivação pós-upload:", derivErr);
    }

    revalidatePath("/exams");
    revalidatePath("/dashboard");
    revalidatePath("/overview");
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

export async function deleteDocument(documentId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { data: doc } = await supabase
    .from("documents")
    .select("file_url")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .single();

  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  if (doc?.file_url) {
    const storagePath = doc.file_url.split("/exam-files/")[1]?.split("?")[0];
    if (storagePath) await supabase.storage.from("exam-files").remove([storagePath]);
  }

  revalidatePath("/documents");
  revalidatePath("/dashboard");
  revalidatePath("/exams");
  return {};
}

function toDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${months[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}
