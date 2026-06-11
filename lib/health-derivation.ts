export type BiomarkerStatus = "optimal" | "attention" | "high" | "low" | "critical";

const STATUS_POINTS: Record<BiomarkerStatus, number> = {
  optimal: 100,
  attention: 70,
  high: 40,
  low: 40,
  critical: 10,
};

const DIMENSION_WEIGHTS: Record<"metabolic" | "cardiovascular" | "preventive", Record<string, number>> = {
  metabolic: { "Glicemia": 3, "Lipídios": 2, "Função Hepática": 2, "Função Renal": 2, "Eletrólitos": 1 },
  cardiovascular: { "Lipídios": 3, "Inflamação": 2, "Coagulação": 2, "Glicemia": 1, "Hemograma": 1 },
  preventive: { "Vitaminas": 3, "Tireoide": 2, "Hormônios": 2, "Hemograma": 1 },
};

export function computeDimensionScores(
  biomarkers: { category: string; status: BiomarkerStatus }[]
): { metabolic: number | null; cardiovascular: number | null; preventive: number | null } {
  const result = { metabolic: null as number | null, cardiovascular: null as number | null, preventive: null as number | null };

  for (const dim of ["metabolic", "cardiovascular", "preventive"] as const) {
    const weights = DIMENSION_WEIGHTS[dim];
    let sum = 0;
    let totalWeight = 0;
    for (const b of biomarkers) {
      const w = weights[b.category];
      if (!w) continue;
      sum += w * STATUS_POINTS[b.status];
      totalWeight += w;
    }
    if (totalWeight > 0) result[dim] = Math.round(sum / totalWeight);
  }

  return result;
}

export function computeLifestyleScore(weightKg: number | null, heightCm: number | null): number | null {
  if (!weightKg || !heightCm) return null;
  const bmi = weightKg / Math.pow(heightCm / 100, 2);
  if (bmi < 17) return 40;
  if (bmi < 18.5) return 70;
  if (bmi < 25) return 95;
  if (bmi < 27.5) return 80;
  if (bmi < 30) return 65;
  if (bmi < 35) return 45;
  if (bmi < 40) return 30;
  return 15;
}

export function computeOverall(dims: {
  metabolic: number | null;
  cardiovascular: number | null;
  lifestyle: number | null;
  preventive: number | null;
}): number {
  const weights = { metabolic: 0.3, cardiovascular: 0.3, preventive: 0.25, lifestyle: 0.15 };
  let sum = 0;
  let totalWeight = 0;
  for (const key of ["metabolic", "cardiovascular", "preventive", "lifestyle"] as const) {
    const val = dims[key];
    if (val === null) continue;
    sum += weights[key] * val;
    totalWeight += weights[key];
  }
  return totalWeight > 0 ? Math.round(sum / totalWeight) : 0;
}

export function computeTrend(current: number, previous: number | null): "up" | "down" | "stable" {
  if (previous === null || previous === 0) return "stable";
  const delta = (current - previous) / Math.abs(previous);
  if (delta > 0.05) return "up";
  if (delta < -0.05) return "down";
  return "stable";
}

export function deriveReminders(
  entries: { name: string; status: BiomarkerStatus }[],
  examDate: string
): { title: string; description: string; priority: "medium" | "high"; due_date: string }[] {
  const reminders: { title: string; description: string; priority: "medium" | "high"; due_date: string }[] = [];
  const seen = new Set<string>();

  for (const e of entries) {
    if (e.status === "critical") {
      const title = `Consultar médico sobre ${e.name}`;
      if (seen.has(title)) continue;
      seen.add(title);
      reminders.push({
        title,
        description: `Valor crítico de ${e.name} detectado no exame de ${formatDate(examDate)}.`,
        priority: "high",
        due_date: addDays(examDate, 30),
      });
    } else if (e.status === "high" || e.status === "low") {
      const title = `Repetir exame de ${e.name}`;
      if (seen.has(title)) continue;
      seen.add(title);
      reminders.push({
        title,
        description: `Repetir exame de ${e.name} em 3 meses para acompanhamento.`,
        priority: "medium",
        due_date: addDays(examDate, 90),
      });
    }
  }

  return reminders;
}

export function resolvedReminderTitles(entries: { name: string; status: BiomarkerStatus }[]): string[] {
  return entries
    .filter((e) => e.status === "optimal")
    .flatMap((e) => [`Consultar médico sobre ${e.name}`, `Repetir exame de ${e.name}`]);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
