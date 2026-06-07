export function normalizeExamIdentifier(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return normalized || null;
}

export function normalizeLabName(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\b(laboratorio|laboratorios|medicina diagnostica|diagnosticos|saude)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
  return normalized || null;
}

export function buildExamSemanticInput(data: {
  lab: string | null;
  examDate: string | null;
  results: { slug: string; value: number; unit: string }[];
}): string | null {
  if (!data.examDate || data.results.length < 5) return null;
  const results = data.results
    .map((result) => `${result.slug.trim().toLowerCase()}:${result.value}:${result.unit.trim().toLowerCase()}`)
    .sort()
    .join("|");
  return `${normalizeLabName(data.lab) ?? "unknown"}|${data.examDate}|${results}`;
}

export async function sha256Hex(value: Blob | string): Promise<string> {
  const bytes = typeof value === "string"
    ? new TextEncoder().encode(value)
    : new Uint8Array(await value.arrayBuffer());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
