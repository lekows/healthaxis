"use client";

import { useState, useRef } from "react";
import { X, Upload, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { createDocument, saveExamBiomarkers } from "@/app/documents/actions";

// Catálogo interno — só usado para enriquecer os slugs retornados pelo OCR
const CATALOG = [
  { slug: "ldl",          name: "LDL Colesterol",     category: "Lipídios",        unit: "mg/dL", ref: { min: 0, optimal: 100, borderline: 129, high: 160 } },
  { slug: "hdl",          name: "HDL Colesterol",     category: "Lipídios",        unit: "mg/dL", ref: { optimal: 60, low: 40 } },
  { slug: "triglycerides",name: "Triglicerídeos",     category: "Lipídios",        unit: "mg/dL", ref: { optimal: 150, borderline: 199, high: 499 } },
  { slug: "total-chol",   name: "Colesterol Total",   category: "Lipídios",        unit: "mg/dL", ref: { optimal: 200, borderline: 239 } },
  { slug: "glucose",      name: "Glicemia em Jejum",  category: "Glicemia",        unit: "mg/dL", ref: { optimal: 99, prediabetes: 125 } },
  { slug: "hba1c",        name: "Hemoglobina Glicada",category: "Glicemia",        unit: "%",     ref: { optimal: 5.6, prediabetes: 6.4 } },
  { slug: "tsh",          name: "TSH",                category: "Tireoide",        unit: "mUI/L", ref: { min: 0.4, max: 4.0 } },
  { slug: "t4-livre",     name: "T4 Livre",           category: "Tireoide",        unit: "ng/dL", ref: { min: 0.8, max: 1.8 } },
  { slug: "hemoglobin",   name: "Hemoglobina",        category: "Hemograma",       unit: "g/dL",  ref: { min: 12.0, max: 17.5 } },
  { slug: "leukocytes",   name: "Leucócitos",         category: "Hemograma",       unit: "mil/mm³",ref: { min: 4.0, max: 11.0 } },
  { slug: "platelets",    name: "Plaquetas",          category: "Hemograma",       unit: "mil/mm³",ref: { min: 150, max: 400 } },
  { slug: "vitamin-d",    name: "Vitamina D",         category: "Vitaminas",       unit: "ng/mL", ref: { deficient: 20, insufficient: 30, optimal: 60 } },
  { slug: "b12",          name: "Vitamina B12",       category: "Vitaminas",       unit: "pg/mL", ref: { min: 200, optimal_min: 300 } },
  { slug: "ferritin",     name: "Ferritina",          category: "Vitaminas",       unit: "ng/mL", ref: { min: 15, optimal: 50 } },
  { slug: "creatinine",   name: "Creatinina",         category: "Função Renal",    unit: "mg/dL", ref: { min: 0.6, max: 1.2 } },
  { slug: "tgo",          name: "TGO (AST)",          category: "Função Hepática", unit: "U/L",   ref: { max: 40 } },
  { slug: "tgp",          name: "TGP (ALT)",          category: "Função Hepática", unit: "U/L",   ref: { max: 40 } },
] as const;

type CatalogEntry = typeof CATALOG[number];

const HIGH_IS_GOOD = new Set(["hdl", "vitamin-d", "b12", "ferritin", "hemoglobin"]);
const RANGE_BASED  = new Set(["tsh", "t4-livre", "hemoglobin", "leukocytes", "platelets", "creatinine"]);

// Retorna apenas valores aceitos pelo schema: optimal | attention | critical
function inferStatus(slug: string, value: number, ref: Record<string, number>): "optimal" | "attention" | "critical" {
  if (HIGH_IS_GOOD.has(slug)) {
    const good = ref.optimal ?? ref.optimal_min ?? ref.min ?? 0;
    const bad  = ref.low ?? ref.deficient ?? good * 0.6;
    if (value < bad)  return "critical";
    if (value < good) return "attention";
    return "optimal";
  }
  if (RANGE_BASED.has(slug) && "min" in ref && "max" in ref) {
    if (value < ref.min * 0.75 || value > ref.max * 1.3) return "critical";
    if (value < ref.min || value > ref.max)               return "attention";
    return "optimal";
  }
  if ("optimal" in ref) {
    const borderline = ref.borderline ?? ref.prediabetes ?? ref.optimal * 1.3;
    if (value <= ref.optimal)   return "optimal";
    if (value <= borderline)    return "attention";
    return "critical";
  }
  if ("max" in ref) {
    if (value > ref.max * 1.3) return "critical";
    if (value > ref.max)       return "attention";
    return "optimal";
  }
  return "optimal";
}

function lookupMeta(slug: string): CatalogEntry | undefined {
  return CATALOG.find(c => c.slug === slug);
}

// ── Modal ────────────────────────────────────────────────────────────────────
interface ModalProps { onClose: () => void; }

function DocumentUploadModalInner({ onClose }: ModalProps) {
  const router      = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile]         = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [title, setTitle]       = useState("");
  const [docType, setDocType]   = useState("Exame Laboratorial");
  const [lab, setLab]           = useState("");
  const [date, setDate]         = useState(() => new Date().toISOString().split("T")[0]);
  const [tags, setTags]         = useState("");

  const [loading, setLoading]       = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError]           = useState<string | null>(null);

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

  const handleSave = async () => {
    if (!title.trim()) { setError("Informe o título do documento."); return; }
    if (!lab.trim())   { setError("Informe o laboratório."); return; }
    setLoading(true);
    setError(null);

    try {
      // 1. Upload para Supabase Storage
      setLoadingMsg("Salvando documento…");
      let fileUrl: string | null = null;
      if (file) {
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const ext  = file.name.split(".").pop() ?? "pdf";
        const path = `${authUser?.id ?? "anon"}/${Date.now()}.${ext}`;
        const { data: up, error: upErr } = await supabase.storage
          .from("exam-files")
          .upload(path, file, { upsert: false });
        if (!upErr && up) {
          const { data: urlData } = supabase.storage.from("exam-files").getPublicUrl(up.path);
          fileUrl = urlData.publicUrl;
        }
      }

      // 2. Salva metadados do documento
      const docResult = await createDocument({
        title: title.trim(),
        type:  docType,
        lab:   lab.trim(),
        date,
        tags:  tags.split(",").map(t => t.trim()).filter(Boolean),
        file_url: fileUrl,
      });
      if (docResult?.error) { setError(docResult.error); return; }

      // 3. Extração automática via OCR (só para exames laboratoriais com arquivo)
      if (file && docType === "Exame Laboratorial") {
        setLoadingMsg("Analisando exame…");
        try {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/extract-exam", { method: "POST", body: fd });
          const data: { resultados: { slug: string; valor: number }[]; ocr_error?: string } = await res.json();

          if (data.ocr_error) {
            // OCR falhou — documento foi salvo, mas sem biomarcadores
            setError(`Documento salvo. Falha na extração automática: ${data.ocr_error}`);
            setLoading(false);
            router.refresh();
            return;
          }

          const resultados = data.resultados ?? [];
          if (resultados.length > 0) {
            const bioResult = await saveExamBiomarkers(
              resultados.map(r => {
                const meta = lookupMeta(r.slug);
                const ref  = (meta?.ref ?? {}) as Record<string, number>;
                return {
                  slug:      r.slug,
                  name:      meta?.name     ?? r.slug,
                  category:  meta?.category ?? "Outros",
                  unit:      meta?.unit     ?? "",
                  value:     r.valor,
                  reference: ref,
                  status:    inferStatus(r.slug, r.valor, ref),
                };
              }),
              date
            );
            if (bioResult?.error) {
              setError(`Documento salvo. Erro ao registrar biomarcadores: ${bioResult.error}`);
              setLoading(false);
              router.refresh();
              return;
            }
          }
        } catch (ocrErr) {
          setError(`Documento salvo. Erro na análise: ${ocrErr instanceof Error ? ocrErr.message : "tente novamente"}`);
          setLoading(false);
          router.refresh();
          return;
        }
      }

      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar. Tente novamente.");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-lg flex flex-col rounded-3xl"
        style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.1)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <h2 className="text-base font-semibold" style={{ color: "#E8E4D9" }}>Adicionar documento</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/5 transition-colors"
            style={{ color: "#5A5A50" }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !loading && fileInputRef.current?.click()}
            className="rounded-2xl border-2 border-dashed p-7 text-center transition-all"
            style={{
              borderColor: dragOver ? "#52B788" : file ? "#52B78860" : "rgba(255,255,255,0.12)",
              background:  dragOver ? "rgba(82,183,136,0.05)" : file ? "rgba(82,183,136,0.04)" : "rgba(255,255,255,0.02)",
              cursor: loading ? "default" : "pointer",
            }}>
            <input ref={fileInputRef} type="file" accept=".pdf,image/*" className="hidden"
              onChange={e => handleFileChange(e.target.files?.[0] ?? null)} />
            {file ? (
              <div className="flex flex-col items-center gap-1.5">
                <CheckCircle size={22} style={{ color: "#52B788" }} />
                <p className="text-sm font-medium" style={{ color: "#E8E4D9" }}>{file.name}</p>
                <p className="text-xs" style={{ color: "#5A5A50" }}>{(file.size / 1024).toFixed(0)} KB</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <Upload size={22} style={{ color: "#5A5A50" }} />
                <p className="text-sm" style={{ color: "#9A9688" }}>
                  Arraste o arquivo aqui ou <span style={{ color: "#52B788" }}>clique para selecionar</span>
                </p>
                <p className="text-xs" style={{ color: "#5A5A50" }}>PDF, JPG ou PNG — máx 8 MB</p>
              </div>
            )}
          </div>

          {/* Campos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#9A9688" }}>Título *</label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="ex: Hemograma Completo" disabled={loading}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
                style={{ background: "#1C1C19", border: "1px solid rgba(255,255,255,0.08)", color: "#E8E4D9" }} />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#9A9688" }}>Tipo</label>
              <select value={docType} onChange={e => setDocType(e.target.value)} disabled={loading}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
                style={{ background: "#1C1C19", border: "1px solid rgba(255,255,255,0.08)", color: "#E8E4D9" }}>
                <option>Exame Laboratorial</option>
                <option>Laudo Médico</option>
                <option>Exame de Imagem</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#9A9688" }}>Data *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} disabled={loading}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
                style={{ background: "#1C1C19", border: "1px solid rgba(255,255,255,0.08)", color: "#E8E4D9", colorScheme: "dark" }} />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#9A9688" }}>Laboratório *</label>
              <input value={lab} onChange={e => setLab(e.target.value)}
                placeholder="ex: Fleury, Sabin, DASA" disabled={loading}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
                style={{ background: "#1C1C19", border: "1px solid rgba(255,255,255,0.08)", color: "#E8E4D9" }} />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#9A9688" }}>
                Tags <span style={{ color: "#5A5A50" }}>(vírgula)</span>
              </label>
              <input value={tags} onChange={e => setTags(e.target.value)}
                placeholder="sangue, rotina" disabled={loading}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
                style={{ background: "#1C1C19", border: "1px solid rgba(255,255,255,0.08)", color: "#E8E4D9" }} />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl text-sm"
              style={{ background: "rgba(193,68,14,0.08)", border: "1px solid rgba(193,68,14,0.2)", color: "#C1440E" }}>
              <AlertTriangle size={13} /> {error}
            </div>
          )}

          {loading && loadingMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl text-sm"
              style={{ background: "rgba(82,183,136,0.06)", border: "1px solid rgba(82,183,136,0.15)", color: "#52B788" }}>
              <Loader2 size={13} className="animate-spin" /> {loadingMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <button onClick={onClose} disabled={loading}
            className="text-sm disabled:opacity-40" style={{ color: "#5A5A50" }}>
            Cancelar
          </button>
          <Button variant="primary" onClick={handleSave} disabled={loading}>
            {loading ? loadingMsg || "Salvando…" : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
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
