"use client";

import { useState, useRef } from "react";
import { X, Upload, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { createDocument, saveExamBiomarkers, saveDoctor } from "@/app/documents/actions";
import type { OCRExamData } from "@/app/api/extract-exam/route";

function inferStatus(
  valor: number,
  ref_min: number | null,
  ref_max: number | null,
  alterado: boolean
): "optimal" | "attention" | "critical" {
  if (!alterado) return "optimal";
  if (ref_max !== null && valor > ref_max) {
    return valor > ref_max * 1.5 ? "critical" : "attention";
  }
  if (ref_min !== null && valor < ref_min) {
    return valor < ref_min * 0.5 ? "critical" : "attention";
  }
  return "attention";
}

function normalizeName(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

function namesMismatch(profileName: string, examName: string): boolean {
  const profileWords = normalizeName(profileName).split(/\s+/).filter(w => w.length > 2);
  const examNorm = normalizeName(examName);
  return !profileWords.some(word => examNorm.includes(word));
}

// ── Modal ────────────────────────────────────────────────────────────────────
interface ModalProps { onClose: () => void; userName?: string; }

function DocumentUploadModalInner({ onClose, userName }: ModalProps) {
  const router       = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingOcr   = useRef<OCRExamData | null>(null);

  const [inputMode, setInputMode]   = useState<"file" | "text">("file");
  const [file, setFile]             = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [dragOver, setDragOver]     = useState(false);
  const [title, setTitle]           = useState("");
  const [docType, setDocType]       = useState("Exame Laboratorial");
  const [lab, setLab]               = useState("");
  const [date, setDate]             = useState(() => new Date().toISOString().split("T")[0]);
  const [tags, setTags]             = useState("");

  const [loading, setLoading]       = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError]           = useState<string | null>(null);
  const [nameWarning, setNameWarning] = useState<string | null>(null);

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

  const saveOcrResults = async (data: OCRExamData) => {
    if (data.medico_solicitante?.nome) {
      await saveDoctor({
        name: data.medico_solicitante.nome,
        crm: data.medico_solicitante.crm ?? null,
        crm_uf: data.medico_solicitante.crm_uf ?? null,
        examDate: data.data_exame ?? date,
      });
    }

    const resultados = data.resultados ?? [];
    if (resultados.length === 0 && !data.medico_solicitante) {
      setError(`Documento salvo. Resposta do Claude: vazia`);
      setLoading(false);
      router.refresh();
      return;
    }
    if (resultados.length > 0) {
      const bioResult = await saveExamBiomarkers(
        resultados.map(r => ({
          slug:      r.slug,
          name:      r.nome,
          category:  r.categoria ?? "Outros",
          unit:      r.unidade   ?? "",
          value:     r.valor,
          reference: {
            ...(r.ref_min !== null ? { min: r.ref_min } : {}),
            ...(r.ref_max !== null ? { max: r.ref_max } : {}),
          },
          status:    inferStatus(r.valor, r.ref_min, r.ref_max, r.alterado),
          historico: r.historico ?? [],
        })),
        date
      );
      if (bioResult?.error) {
        setError(`Documento salvo. Erro ao registrar biomarcadores: ${bioResult.error}`);
        setLoading(false);
        router.refresh();
        return;
      }
    }

    router.refresh();
    onClose();
  };

  const continueAfterWarning = async () => {
    const data = pendingOcr.current;
    if (!data) return;
    pendingOcr.current = null;
    setLoading(true);
    setLoadingMsg("Salvando biomarcadores…");
    try {
      await saveOcrResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar. Tente novamente.");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  };

  const handleSave = async () => {
    if (!title.trim()) { setError("Informe o título do documento."); return; }
    if (!lab.trim())   { setError("Informe o laboratório."); return; }
    setLoading(true);
    setError(null);
    setNameWarning(null);

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

      // 3. Extração automática via OCR (exames laboratoriais com arquivo ou texto colado)
      const hasContent = inputMode === "text" ? pastedText.trim().length > 10 : !!file;
      if (hasContent && docType === "Exame Laboratorial") {
        setLoadingMsg("Analisando exame…");
        try {
          const fd = new FormData();
          if (inputMode === "text") {
            fd.append("text", pastedText.trim());
          } else if (fileUrl) {
            // Arquivo já está no Storage — manda a URL para não estourar o limite de body do Vercel.
            fd.append("file_url", fileUrl);
            fd.append("file_type", file!.type);
          } else {
            fd.append("file", file!);
          }
          const res = await fetch("/api/extract-exam", { method: "POST", body: fd });
          const raw = await res.text();
          let data: (OCRExamData & { ocr_error?: string }) | null = null;
          try { data = JSON.parse(raw); } catch { /* resposta não-JSON (erro de infraestrutura) */ }
          if (!res.ok || !data) {
            setError(`Documento salvo. Falha na extração automática: ${res.status === 413 ? "arquivo muito grande" : "o servidor retornou um erro inesperado"}. Tente reenviar.`);
            setLoading(false);
            router.refresh();
            return;
          }

          if (data.ocr_error) {
            setError(`Documento salvo. Falha na extração automática: ${data.ocr_error}`);
            setLoading(false);
            router.refresh();
            return;
          }

          // 4. Verificação de nome do paciente
          if (userName && data.paciente?.nome && namesMismatch(userName, data.paciente.nome)) {
            pendingOcr.current = data;
            setNameWarning(
              `O exame parece ser de "${data.paciente.nome}". Seu perfil é "${userName}". Deseja salvar assim mesmo?`
            );
            setLoading(false);
            setLoadingMsg("");
            return;
          }

          await saveOcrResults(data);
        } catch (ocrErr) {
          setError(`Documento salvo. Erro na análise: ${ocrErr instanceof Error ? ocrErr.message : "tente novamente"}`);
          setLoading(false);
          router.refresh();
          return;
        }
      } else {
        router.refresh();
        onClose();
      }
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

          {/* Toggle arquivo / colar texto */}
          <div className="flex rounded-xl p-0.5 gap-0.5" style={{ background: "#1C1C19", border: "1px solid rgba(255,255,255,0.08)" }}>
            {(["file", "text"] as const).map(mode => (
              <button key={mode} disabled={loading} onClick={() => setInputMode(mode)}
                className="flex-1 py-1.5 rounded-[10px] text-xs font-medium transition-all"
                style={{
                  background: inputMode === mode ? "rgba(82,183,136,0.12)" : "transparent",
                  color: inputMode === mode ? "#52B788" : "#5A5A50",
                  border: inputMode === mode ? "1px solid rgba(82,183,136,0.2)" : "1px solid transparent",
                }}>
                {mode === "file" ? "Arquivo" : "Colar texto"}
              </button>
            ))}
          </div>

          {/* Drop zone */}
          {inputMode === "file" && (
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
          )}

          {/* Área de texto colado */}
          {inputMode === "text" && (
          <div>
            <textarea
              value={pastedText}
              onChange={e => setPastedText(e.target.value)}
              disabled={loading}
              placeholder="Cole aqui o texto do exame copiado do portal do laboratório (Fleury, Sabin, DASA…)"
              rows={6}
              className="w-full rounded-2xl px-4 py-3 text-sm outline-none resize-none"
              style={{ background: "rgba(255,255,255,0.02)", border: "2px dashed rgba(255,255,255,0.12)", color: "#E8E4D9" }}
            />
            {pastedText.length > 0 && (
              <p className="text-xs mt-1" style={{ color: "#5A5A50" }}>{pastedText.length} caracteres</p>
            )}
          </div>
          )}

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

          {/* Aviso de nome divergente */}
          {nameWarning && (
            <div className="p-4 rounded-2xl space-y-3"
              style={{ background: "rgba(244,162,97,0.08)", border: "1px solid rgba(244,162,97,0.25)" }}>
              <div className="flex items-start gap-2">
                <AlertTriangle size={15} style={{ color: "#F4A261", flexShrink: 0, marginTop: 1 }} />
                <p className="text-sm" style={{ color: "#F4A261" }}>{nameWarning}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setNameWarning(null); continueAfterWarning(); }}
                  className="flex-1 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ background: "rgba(244,162,97,0.15)", color: "#F4A261" }}>
                  Salvar assim mesmo
                </button>
                <button
                  onClick={() => { setNameWarning(null); pendingOcr.current = null; }}
                  className="flex-1 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#9A9688" }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

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
          {!nameWarning && (
            <Button variant="primary" onClick={handleSave} disabled={loading}>
              {loading ? loadingMsg || "Salvando…" : "Salvar"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
export function UploadDocumentButton({ userName }: { userName?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" className="gap-2" onClick={() => setOpen(true)}>
        <Upload size={14} /> Adicionar documento
      </Button>
      {open && <DocumentUploadModalInner onClose={() => setOpen(false)} userName={userName} />}
    </>
  );
}
