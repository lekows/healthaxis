"use client";

import { useState, useRef } from "react";
import { X, Upload, FlaskConical, FileText, CheckCircle, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button, Badge } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { createDocument, saveExamBiomarkers } from "@/app/documents/actions";
import { cn } from "@/lib/utils";

// ── Catálogo de biomarcadores (slug → metadados + referências) ─────────────
const CATALOG = [
  { slug: "ldl",          name: "LDL Colesterol",     category: "Lipídios",         unit: "mg/dL", ref: { min: 0, optimal: 100, borderline: 129, high: 160 } },
  { slug: "hdl",          name: "HDL Colesterol",     category: "Lipídios",         unit: "mg/dL", ref: { optimal: 60, low: 40 } },
  { slug: "triglycerides",name: "Triglicerídeos",     category: "Lipídios",         unit: "mg/dL", ref: { optimal: 150, borderline: 199, high: 499 } },
  { slug: "total-chol",   name: "Colesterol Total",   category: "Lipídios",         unit: "mg/dL", ref: { optimal: 200, borderline: 239 } },
  { slug: "glucose",      name: "Glicemia em Jejum",  category: "Glicemia",         unit: "mg/dL", ref: { optimal: 99, prediabetes: 125 } },
  { slug: "hba1c",        name: "Hemoglobina Glicada",category: "Glicemia",         unit: "%",     ref: { optimal: 5.6, prediabetes: 6.4 } },
  { slug: "tsh",          name: "TSH",                category: "Tireoide",         unit: "mUI/L", ref: { min: 0.4, max: 4.0 } },
  { slug: "t4-livre",     name: "T4 Livre",           category: "Tireoide",         unit: "ng/dL", ref: { min: 0.8, max: 1.8 } },
  { slug: "hemoglobin",   name: "Hemoglobina",        category: "Hemograma",        unit: "g/dL",  ref: { min: 12.0, max: 17.5 } },
  { slug: "leukocytes",   name: "Leucócitos",         category: "Hemograma",        unit: "mil/mm³",ref: { min: 4.0, max: 11.0 } },
  { slug: "platelets",    name: "Plaquetas",          category: "Hemograma",        unit: "mil/mm³",ref: { min: 150, max: 400 } },
  { slug: "vitamin-d",    name: "Vitamina D",         category: "Vitaminas",        unit: "ng/mL", ref: { deficient: 20, insufficient: 30, optimal: 60 } },
  { slug: "b12",          name: "Vitamina B12",       category: "Vitaminas",        unit: "pg/mL", ref: { min: 200, optimal_min: 300 } },
  { slug: "ferritin",     name: "Ferritina",          category: "Vitaminas",        unit: "ng/mL", ref: { min: 15, optimal: 50 } },
  { slug: "creatinine",   name: "Creatinina",         category: "Função Renal",     unit: "mg/dL", ref: { min: 0.6, max: 1.2 } },
  { slug: "tgo",          name: "TGO (AST)",          category: "Função Hepática",  unit: "U/L",   ref: { max: 40 } },
  { slug: "tgp",          name: "TGP (ALT)",          category: "Função Hepática",  unit: "U/L",   ref: { max: 40 } },
] as const;

type CatalogEntry = typeof CATALOG[number];

type EntryField = CatalogEntry & {
  value: string;
  enabled: boolean;
};

const HIGH_IS_GOOD = new Set(["hdl", "vitamin-d", "b12", "ferritin", "hemoglobin"]);
const RANGE_BASED  = new Set(["tsh", "t4-livre", "hemoglobin", "leukocytes", "platelets", "creatinine"]);

function inferStatus(slug: string, value: number, ref: Record<string, number>): "optimal" | "attention" | "risk" {
  if (HIGH_IS_GOOD.has(slug)) {
    const good = ref.optimal ?? ref.optimal_min ?? ref.min ?? 0;
    const bad  = ref.low ?? ref.deficient ?? good * 0.6;
    if (value < bad)  return "risk";
    if (value < good) return "attention";
    return "optimal";
  }
  if (RANGE_BASED.has(slug) && "min" in ref && "max" in ref) {
    if (value < ref.min * 0.75 || value > ref.max * 1.3) return "risk";
    if (value < ref.min || value > ref.max)               return "attention";
    return "optimal";
  }
  if ("optimal" in ref) {
    const borderline = ref.borderline ?? ref.prediabetes ?? ref.optimal * 1.3;
    if (value <= ref.optimal)    return "optimal";
    if (value <= borderline)     return "attention";
    return "risk";
  }
  if ("max" in ref) {
    if (value > ref.max * 1.3) return "risk";
    if (value > ref.max)       return "attention";
    return "optimal";
  }
  return "optimal";
}

// ── Modal ──────────────────────────────────────────────────────────────────
interface ModalProps { onClose: () => void; }

function DocumentUploadModalInner({ onClose }: ModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 1
  const [step, setStep]       = useState<1 | 2>(1);
  const [file, setFile]       = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [title, setTitle]     = useState("");
  const [docType, setDocType] = useState("Exame Laboratorial");
  const [lab, setLab]         = useState("");
  const [date, setDate]       = useState(() => new Date().toISOString().split("T")[0]);
  const [tags, setTags]       = useState("");

  // Step 2
  const [entries, setEntries] = useState<EntryField[]>(
    CATALOG.map(c => ({ ...c, value: "", enabled: false }))
  );

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleFileChange = (f: File | null) => {
    if (!f) return;
    if (f.type !== "application/pdf" && !f.type.startsWith("image/")) {
      setError("Formato inválido. Use PDF, JPG ou PNG.");
      return;
    }
    setFile(f);
    setError(null);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileChange(e.dataTransfer.files[0] ?? null);
  };

  const canProceedStep1 = title.trim() && date && lab.trim();

  const handleNext = () => {
    if (!canProceedStep1) { setError("Preencha título, data e laboratório."); return; }
    setError(null);
    if (docType === "Exame Laboratorial") setStep(2);
    else handleSave();
  };

  const toggleEntry = (slug: string) =>
    setEntries(prev => prev.map(e => e.slug === slug ? { ...e, enabled: !e.enabled } : e));

  const updateValue = (slug: string, value: string) =>
    setEntries(prev => prev.map(e => e.slug === slug ? { ...e, value } : e));

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      // Upload arquivo ao Supabase Storage (falha silenciosa se o bucket não existir)
      let fileUrl: string | null = null;
      if (file) {
        const supabase = createClient();
        const ext = file.name.split(".").pop() ?? "pdf";
        const path = `${Date.now()}.${ext}`;
        const { data: up, error: upErr } = await supabase.storage
          .from("exam-files")
          .upload(path, file, { upsert: false });
        if (!upErr && up) {
          const { data: urlData } = supabase.storage.from("exam-files").getPublicUrl(up.path);
          fileUrl = urlData.publicUrl;
        }
      }

      await createDocument({
        title: title.trim(),
        type: docType,
        lab: lab.trim(),
        date,
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        file_url: fileUrl,
      });

      const active = entries.filter(e => e.enabled && e.value.trim() !== "" && !isNaN(parseFloat(e.value)));
      if (active.length > 0) {
        await saveExamBiomarkers(
          active.map(e => ({
            slug: e.slug,
            name: e.name,
            category: e.category,
            unit: e.unit,
            value: parseFloat(e.value),
            reference: e.ref as Record<string, number>,
            status: inferStatus(e.slug, parseFloat(e.value), e.ref as Record<string, number>),
          })),
          date
        );
      }

      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const categories = [...new Set(CATALOG.map(c => c.category))];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-3xl"
        style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.1)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: "#E8E4D9" }}>
              {step === 1 ? "Adicionar documento" : "Resultados do exame"}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "#5A5A50" }}>
              Passo {step} de {docType === "Exame Laboratorial" ? 2 : 1}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Step indicators */}
            <div className="flex items-center gap-1.5">
              {[1, 2].map(s => (
                <div key={s} className="w-2 h-2 rounded-full transition-all"
                  style={{ background: s === step ? "#52B788" : s < step ? "#52B78860" : "rgba(255,255,255,0.1)" }} />
              ))}
            </div>
            <button onClick={onClose} className="p-1.5 rounded-xl transition-colors hover:bg-white/5" style={{ color: "#5A5A50" }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {step === 1 && (
            <>
              {/* Drag & Drop */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all"
                style={{
                  borderColor: dragOver ? "#52B788" : file ? "#52B78860" : "rgba(255,255,255,0.12)",
                  background: dragOver ? "rgba(82,183,136,0.05)" : file ? "rgba(82,183,136,0.04)" : "rgba(255,255,255,0.02)",
                }}>
                <input ref={fileInputRef} type="file" accept=".pdf,image/*" className="hidden"
                  onChange={e => handleFileChange(e.target.files?.[0] ?? null)} />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle size={24} style={{ color: "#52B788" }} />
                    <p className="text-sm font-medium" style={{ color: "#E8E4D9" }}>{file.name}</p>
                    <p className="text-xs" style={{ color: "#5A5A50" }}>{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload size={24} style={{ color: "#5A5A50" }} />
                    <p className="text-sm" style={{ color: "#9A9688" }}>
                      Arraste o arquivo aqui ou <span style={{ color: "#52B788" }}>clique para selecionar</span>
                    </p>
                    <p className="text-xs" style={{ color: "#5A5A50" }}>PDF, JPG ou PNG</p>
                  </div>
                )}
              </div>

              {/* Campos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#9A9688" }}>Título *</label>
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder="ex: Hemograma Completo"
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
                    style={{ background: "#1C1C19", border: "1px solid rgba(255,255,255,0.08)", color: "#E8E4D9" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#9A9688" }}>Tipo</label>
                  <select value={docType} onChange={e => setDocType(e.target.value)}
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
                    style={{ background: "#1C1C19", border: "1px solid rgba(255,255,255,0.08)", color: "#E8E4D9" }}>
                    <option>Exame Laboratorial</option>
                    <option>Laudo Médico</option>
                    <option>Exame de Imagem</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#9A9688" }}>Data *</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)}
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
                    style={{ background: "#1C1C19", border: "1px solid rgba(255,255,255,0.08)", color: "#E8E4D9", colorScheme: "dark" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#9A9688" }}>Laboratório *</label>
                  <input value={lab} onChange={e => setLab(e.target.value)} placeholder="ex: Fleury, Sabin, DASA"
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
                    style={{ background: "#1C1C19", border: "1px solid rgba(255,255,255,0.08)", color: "#E8E4D9" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#9A9688" }}>
                    Tags <span style={{ color: "#5A5A50" }}>(separadas por vírgula)</span>
                  </label>
                  <input value={tags} onChange={e => setTags(e.target.value)} placeholder="sangue, rotina, colesterol"
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
                    style={{ background: "#1C1C19", border: "1px solid rgba(255,255,255,0.08)", color: "#E8E4D9" }} />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-start gap-3 p-3.5 rounded-2xl"
                style={{ background: "rgba(82,183,136,0.06)", border: "1px solid rgba(82,183,136,0.15)" }}>
                <FlaskConical size={14} className="mt-0.5 shrink-0" style={{ color: "#52B788" }} />
                <p className="text-xs leading-relaxed" style={{ color: "#9A9688" }}>
                  Marque os campos presentes no exame e insira os valores. Deixe em branco o que não constar.
                  Esses dados atualizam os biomarcadores e alimentam os gráficos históricos.
                </p>
              </div>

              {categories.map(cat => {
                const fields = entries.filter(e => e.category === cat);
                return (
                  <div key={cat}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#5A5A50" }}>{cat}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {fields.map(entry => (
                        <label key={entry.slug}
                          className={cn(
                            "flex items-center gap-3 rounded-2xl px-3.5 py-3 cursor-pointer transition-all",
                            entry.enabled ? "border" : "border"
                          )}
                          style={{
                            background: entry.enabled ? "rgba(82,183,136,0.06)" : "rgba(255,255,255,0.02)",
                            borderColor: entry.enabled ? "rgba(82,183,136,0.2)" : "rgba(255,255,255,0.06)",
                          }}>
                          <input type="checkbox" checked={entry.enabled}
                            onChange={() => toggleEntry(entry.slug)}
                            className="w-3.5 h-3.5 rounded accent-green-500" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium" style={{ color: entry.enabled ? "#E8E4D9" : "#9A9688" }}>
                              {entry.name}
                            </p>
                            <p className="text-xs" style={{ color: "#5A5A50" }}>{entry.unit}</p>
                          </div>
                          {entry.enabled && (
                            <input
                              type="number"
                              step="any"
                              value={entry.value}
                              onChange={e => updateValue(entry.slug, e.target.value)}
                              onClick={e => e.stopPropagation()}
                              placeholder="0"
                              className="w-20 rounded-xl px-2.5 py-1.5 text-sm text-right outline-none"
                              style={{ background: "#252520", border: "1px solid rgba(255,255,255,0.1)", color: "#E8E4D9" }}
                            />
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl text-sm"
              style={{ background: "rgba(193,68,14,0.08)", border: "1px solid rgba(193,68,14,0.2)", color: "#C1440E" }}>
              <AlertTriangle size={14} /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          {step === 2 ? (
            <button onClick={() => setStep(1)} className="text-sm transition-colors"
              style={{ color: "#9A9688" }}>
              ← Voltar
            </button>
          ) : (
            <button onClick={onClose} className="text-sm transition-colors" style={{ color: "#5A5A50" }}>
              Cancelar
            </button>
          )}

          <div className="flex items-center gap-2">
            {step === 2 && (
              <button onClick={handleSave} disabled={loading}
                className="px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-50"
                style={{ color: "#9A9688" }}>
                {loading ? "Salvando…" : "Salvar sem resultados"}
              </button>
            )}
            <Button
              variant="primary"
              disabled={loading}
              onClick={step === 1 ? handleNext : handleSave}
            >
              {loading ? "Salvando…" : step === 1 ? (docType === "Exame Laboratorial" ? "Próximo →" : "Salvar") : "Salvar resultados"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Export: botão + modal ──────────────────────────────────────────────────
export function UploadDocumentButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" className="gap-2" onClick={() => setOpen(true)}>
        <Upload size={14} /> Adicionar documento
      </Button>
      {open && <DocumentUploadModalInner onClose={() => setOpen(false)} />}
    </>
  );
}
