import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
const DATES = ["2024-12-01", "2025-01-15", "2025-02-10", "2025-03-05", "2025-04-20", "2025-05-15"];

function trend(values: number[]): "up" | "down" | "stable" {
  const delta = values[values.length - 1] - values[0];
  if (delta > 2) return "up";
  if (delta < -2) return "down";
  return "stable";
}

const SAMPLE_BIOMARKERS: {
  slug: string; name: string; unit: string; category: string;
  refMin: number; refMax: number; history: number[];
}[] = [
  {
    slug: "ldl-colesterol", name: "LDL Colesterol", unit: "mg/dL", category: "Lipídios",
    refMin: 0, refMax: 130,
    history: [145, 142, 138, 135, 132, 131],
  },
  {
    slug: "hdl-colesterol", name: "HDL Colesterol", unit: "mg/dL", category: "Lipídios",
    refMin: 45, refMax: 90,
    history: [38, 39, 40, 41, 42, 43],
  },
  {
    slug: "triglicerides", name: "Triglicerídeos", unit: "mg/dL", category: "Lipídios",
    refMin: 0, refMax: 150,
    history: [180, 172, 165, 158, 152, 148],
  },
  {
    slug: "glicemia", name: "Glicemia em Jejum", unit: "mg/dL", category: "Glicemia",
    refMin: 70, refMax: 99,
    history: [98, 96, 95, 94, 93, 92],
  },
  {
    slug: "hemoglobina-glicada", name: "Hemoglobina Glicada", unit: "%", category: "Glicemia",
    refMin: 0, refMax: 5.7,
    history: [5.4, 5.3, 5.3, 5.2, 5.2, 5.1],
  },
  {
    slug: "vitamina-d", name: "Vitamina D", unit: "ng/mL", category: "Vitaminas",
    refMin: 30, refMax: 100,
    history: [12, 14, 16, 17, 18, 18],
  },
  {
    slug: "tsh", name: "TSH", unit: "mUI/L", category: "Tireoide",
    refMin: 0.4, refMax: 4.0,
    history: [2.1, 2.2, 2.0, 1.9, 2.1, 2.0],
  },
  {
    slug: "hemoglobina", name: "Hemoglobina", unit: "g/dL", category: "Hemograma",
    refMin: 12, refMax: 16,
    history: [13.8, 13.9, 14.0, 14.1, 14.1, 14.2],
  },
  {
    slug: "creatinina", name: "Creatinina", unit: "mg/dL", category: "Função Renal",
    refMin: 0.6, refMax: 1.2,
    history: [0.9, 0.9, 0.9, 0.8, 0.9, 0.9],
  },
  {
    slug: "vitamina-b12", name: "Vitamina B12", unit: "pg/mL", category: "Vitaminas",
    refMin: 200, refMax: 900,
    history: [320, 335, 340, 352, 361, 370],
  },
];

function computeStatus(val: number, refMin: number, refMax: number): string {
  if (val > refMax * 1.2) return "critical";
  if (val > refMax) return "high";
  if (val < refMin * 0.7) return "critical";
  if (val < refMin) return "low";
  if (val > refMax * 0.9 || val < refMin * 1.1) return "attention";
  return "optimal";
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const results: string[] = [];

  for (const bm of SAMPLE_BIOMARKERS) {
    const lastVal = bm.history[bm.history.length - 1];
    const status = computeStatus(lastVal, bm.refMin, bm.refMax);
    const t = trend(bm.history);

    const { error: upsertErr } = await supabase.from("biomarkers").upsert({
      user_id: user.id,
      slug: bm.slug,
      name: bm.name,
      value: String(lastVal),
      unit: bm.unit,
      category: bm.category,
      status,
      trend: t,
      reference: { min: bm.refMin, max: bm.refMax },
      last_date: DATES[DATES.length - 1],
    }, { onConflict: "user_id,slug" });

    if (upsertErr) { results.push(`❌ ${bm.name}: ${upsertErr.message}`); continue; }

    await supabase.from("biomarker_history").delete()
      .eq("user_id", user.id).eq("biomarker_slug", bm.slug);

    const historyRows = bm.history.map((val, i) => ({
      user_id: user.id,
      biomarker_slug: bm.slug,
      value: String(val),
      date_label: MONTHS[i],
      recorded_at: DATES[i],
    }));
    const { error: histErr } = await supabase.from("biomarker_history").insert(historyRows);

    if (histErr) results.push(`⚠ histórico ${bm.name}: ${histErr.message}`);
    else results.push(`✅ ${bm.name}`);
  }

  // Health scores
  await supabase.from("health_scores").upsert({
    user_id: user.id,
    overall: 74,
    metabolic: 78,
    cardiovascular: 80,
    lifestyle: 65,
    preventive: 72,
  }, { onConflict: "user_id" });
  results.push("✅ Health scores");

  // Preventive reminders
  const reminders = [
    { title: "Consulta cardiologista", description: "Acompanhamento LDL elevado", priority: "high", due_date: "2025-06-30" },
    { title: "Suplementação Vitamina D", description: "Iniciar 2000 UI/dia conforme orientação", priority: "high", due_date: "2025-06-10" },
    { title: "Hemograma anual", description: "Repetir em 6 meses", priority: "medium", due_date: "2025-11-15" },
    { title: "Densitometria óssea", description: "Primeira avaliação", priority: "low", due_date: "2025-12-01" },
  ];
  for (const r of reminders) {
    await supabase.from("preventive_reminders").upsert(
      { user_id: user.id, ...r, done: false },
      { onConflict: "user_id,title" }
    ).maybeSingle();
  }
  results.push(`✅ ${reminders.length} lembretes preventivos`);

  return NextResponse.json({ ok: true, user: user.email, results });
}
