// Nome de paciente para exibição na UI do médico.
// Vários registros (sobretudo contas de teste) têm `profiles.name` preenchido com valores
// técnicos — e-mail, UUID ou placeholders. Estas funções centralizam a limpeza para que a
// interface nunca mostre um valor técnico como nome principal do paciente.

const PLACEHOLDER_NAMES = new Set(["paciente", "undefined", "null", "sem nome", "n/a", "na"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /\S+@\S+\.\S+/;
const HAS_LETTER_RE = /[a-zA-ZÀ-ÿ]/;

type PatientLike = { name?: string | null } | null | undefined;

const FALLBACK_NAME = "Paciente sem nome cadastrado";

// Um nome só é considerado "humano" quando não é vazio, placeholder, UUID puro, e-mail puro
// e contém ao menos uma letra. Aceita acentos e hífens (ex.: "Salazar Hildalgo", "Ana-Júlia").
export function isValidPatientName(raw: string | null | undefined): raw is string {
  if (!raw) return false;
  const name = raw.trim();
  if (name.length < 2) return false;
  if (PLACEHOLDER_NAMES.has(name.toLowerCase())) return false;
  if (UUID_RE.test(name)) return false;
  if (EMAIL_RE.test(name)) return false;
  if (!HAS_LETTER_RE.test(name)) return false;
  return true;
}

export function getPatientDisplayName(patient: PatientLike, _patientId?: string): string {
  const name = patient?.name?.trim();
  return isValidPatientName(name) ? name : FALLBACK_NAME;
}

// Iniciais (primeira + última palavra) para o avatar. Retorna null quando não há nome humano,
// sinalizando ao componente que ele deve mostrar um ícone em vez de iniciais.
export function getPatientInitials(patient: PatientLike): string | null {
  const name = patient?.name?.trim();
  if (!isValidPatientName(name)) return null;
  const parts = name.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  const initials = (first + last).toUpperCase();
  return initials || null;
}
