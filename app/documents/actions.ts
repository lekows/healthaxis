"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getReference, inferStatus } from "@/lib/biomarker-references";
import {
  computeDimensionScores, computeLifestyleScore, computeOverall,
  computeTrend, deriveReminders, resolvedReminderTitles,
  type BiomarkerStatus,
} from "@/lib/health-derivation";

export type ImportSummary = {
  updatedCurrent: number;
  addedHistoryOnly: number;
  newBiomarkers: number;
  duplicateSkipped: number;
};

type ActionResult = { error?: string; duplicate?: boolean; id?: string; importSummary?: ImportSummary };

export async function createDocument(data: {
  title: string;
  type: string;
  lab: string | null;
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
      lab:      data.lab?.trim() || null,
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
  examDate?: string | null;
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
      ...(data.examDate ? { date: data.examDate } : {}),
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
  examDate: string,
  documentId?: string | null
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
        status: hasLabRef ? e.status : (staticRef ? inferStatus(e.value, staticRef) : e.status),
        trend: computeTrend(e.value, priorValue(e.slug, e.historico ?? [])),
      };
    });

    // Só atualiza o snapshot atual se este exame for o mais recente para cada slug.
    // Evita que um upload de exame antigo sobrescreva valores de um exame mais novo.
    const latestDateBySlug = (existing ?? []).reduce<Record<string, string>>((acc, r) => {
      const d = r.recorded_at as string;
      if (!acc[r.biomarker_slug] || d > acc[r.biomarker_slug]) acc[r.biomarker_slug] = d;
      return acc;
    }, {});
    const toUpsert = resolved.filter((e) => {
      const latest = latestDateBySlug[e.slug];
      return !latest || examDate >= latest;
    });

    if (toUpsert.length > 0) {
      const { error: upsertErr } = await supabase.from("biomarkers").upsert(
        toUpsert.map((e) => ({
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
    }

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
        ...(documentId ? { document_id: documentId } : {}),
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

    // Gatilho de reconexão: se o exame veio com CRM de médico não vinculado,
    // sugerir ao paciente que convide esse médico. Best-effort, não bloqueia.
    try {
      const { data: doc } = await supabase
        .from("documents")
        .select("doctor_crm, doctor_crm_uf, doctor_name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (doc?.doctor_crm) {
        const { data: linked } = await supabase
          .from("doctor_patient_links")
          .select("id")
          .eq("patient_id", user.id)
          .is("revoked_at", null);

        const linkedDoctorIds = (linked ?? []).map((l) => l.id);
        const { data: isLinked } = linkedDoctorIds.length > 0
          ? await supabase
              .from("doctor_profiles")
              .select("id")
              .eq("crm", doc.doctor_crm)
              .eq("crm_uf", doc.doctor_crm_uf ?? "")
              .in("id", linkedDoctorIds)
              .maybeSingle()
          : { data: null };

        if (!isLinked) {
          await supabase.from("preventive_reminders").upsert({
            user_id: user.id,
            title: `Convidar Dr. ${doc.doctor_name ?? "solicitante"} para o HealthAxis`,
            description: `O médico que solicitou este exame ainda não está vinculado. Convide-o para acompanhar seus resultados diretamente.`,
            priority: "low",
            done: false,
          }, { onConflict: "user_id,title" });
        }
      }
    } catch (reconnectErr) {
      console.error("Falha no gatilho de reconexão:", reconnectErr);
    }

    revalidatePath("/exams");
    revalidatePath("/dashboard");
    revalidatePath("/overview");
    return {
      importSummary: {
        updatedCurrent:   toUpsert.filter((e) => !!latestDateBySlug[e.slug]).length,
        newBiomarkers:    toUpsert.filter((e) => !latestDateBySlug[e.slug]).length,
        addedHistoryOnly: resolved.length - toUpsert.length,
        duplicateSkipped: allPoints.length - toInsert.length,
      },
    };
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

async function recalculateBiomarkersAfterDelete(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  slugs: string[]
): Promise<void> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("sex, dob, weight, height")
    .eq("id", userId)
    .single();
  const sex = (profile?.sex as string | null) ?? null;
  const ageYears = profile?.dob
    ? Math.floor((Date.now() - new Date(profile.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  for (const slug of slugs) {
    const { data: history } = await supabase
      .from("biomarker_history")
      .select("value, recorded_at, date_label")
      .eq("user_id", userId)
      .eq("biomarker_slug", slug)
      .order("recorded_at", { ascending: false })
      .limit(2);

    if (!history || history.length === 0) {
      await supabase.from("biomarkers").delete().eq("user_id", userId).eq("slug", slug);
      continue;
    }

    const latest = history[0];
    const latestValue = Number(latest.value);
    const priorValue = history.length > 1 ? Number(history[1].value) : null;

    const { data: existing } = await supabase
      .from("biomarkers")
      .select("name, category, unit, reference")
      .eq("user_id", userId)
      .eq("slug", slug)
      .single();

    if (!existing) continue;

    const reference = existing.reference as Record<string, number>;
    const staticRef = getReference(slug, sex, ageYears);
    const effectiveRef = staticRef ?? reference;
    const status = inferStatus(latestValue, effectiveRef);
    const trend = computeTrend(latestValue, priorValue);

    await supabase.from("biomarkers").update({
      value:     String(latestValue),
      last_date: latest.recorded_at as string,
      status,
      trend,
    }).eq("user_id", userId).eq("slug", slug);
  }

  const { data: allBiomarkers } = await supabase
    .from("biomarkers")
    .select("category, status")
    .eq("user_id", userId);

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
      .from("health_scores")
      .select("lifestyle")
      .eq("user_id", userId)
      .maybeSingle();
    storedLifestyle = currentScore?.lifestyle ?? 0;
  }

  const overall = computeOverall({ ...dims, lifestyle });
  await supabase.from("health_scores").upsert(
    {
      user_id:        userId,
      overall,
      metabolic:      dims.metabolic ?? 0,
      cardiovascular: dims.cardiovascular ?? 0,
      preventive:     dims.preventive ?? 0,
      lifestyle:      storedLifestyle ?? 0,
      updated_at:     new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

export async function deleteDocument(documentId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { data: doc } = await supabase
    .from("documents")
    .select("file_url, date")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .single();

  const { data: fkLinked } = await supabase
    .from("biomarker_history")
    .select("biomarker_slug")
    .eq("user_id", user.id)
    .eq("document_id", documentId);

  const { data: legacyLinked } = doc?.date
    ? await supabase
        .from("biomarker_history")
        .select("biomarker_slug")
        .eq("user_id", user.id)
        .eq("recorded_at", doc.date)
        .is("document_id", null)
    : { data: [] };

  const affectedSlugs = [
    ...new Set([
      ...((fkLinked ?? []).map((r) => r.biomarker_slug as string)),
      ...((legacyLinked ?? []).map((r) => r.biomarker_slug as string)),
    ]),
  ];

  if (fkLinked && fkLinked.length > 0) {
    await supabase
      .from("biomarker_history")
      .delete()
      .eq("user_id", user.id)
      .eq("document_id", documentId);
  }

  if (doc?.date && legacyLinked && legacyLinked.length > 0) {
    await supabase
      .from("biomarker_history")
      .delete()
      .eq("user_id", user.id)
      .eq("recorded_at", doc.date)
      .is("document_id", null);
  }

  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  if (affectedSlugs.length > 0) {
    try {
      await recalculateBiomarkersAfterDelete(supabase, user.id, affectedSlugs);
    } catch (recalcErr) {
      console.error("Falha na recalculação pós-exclusão:", recalcErr);
    }
  }

  if (doc?.file_url) {
    const storagePath = doc.file_url.split("/exam-files/")[1]?.split("?")[0];
    if (storagePath) await supabase.storage.from("exam-files").remove([storagePath]);
  }

  revalidatePath("/documents");
  revalidatePath("/dashboard");
  revalidatePath("/exams");
  revalidatePath("/overview");
  return {};
}

function toDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${months[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}
