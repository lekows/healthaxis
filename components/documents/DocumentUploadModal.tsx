"use client";

import { useState, useRef } from "react";
import { X, Upload, CheckCircle, AlertTriangle, Loader2, FileText, Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import {
  checkDocumentContentDuplicate,
  createDocument,
  registerDocumentExamIdentity,
  saveExamBiomarkers,
  saveDoctor,
} from "@/app/documents/actions";
import { inferStatus } from "@/lib/biomarker-references";
import {
  buildExamSemanticInput,
  normalizeExamIdentifier,
  normalizeLabName,
  sha256Hex,
} from "@/lib/exam-deduplication";
import type { OCRExamData } from "@/app/api/extract-exam/route";

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
  const router        = useRouter();
  const pdfInputRef   = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pendingOcr    = useRef<OCRExamData | null>(null);
  const pendingDocumentId = useRef<string | null>(null);
  const pendingStoragePath = useRef<string | null>(null);

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
    setFile(f);
    setError(null);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0] ?? null;
    if (f && (f.name.includes("drivesdk") || f.name.startsWith("view?") || f.size === 0)) {
      setError(
        "Arquivos do Google Drive não podem ser arrastados diretamente. " +
        "Abra o PDF no Drive → ⋮ → Download para salvar no dispositivo, depois use o botão PDF / Documento."
      );
      return;
    }
    handleFileChange(f);
  };

  const saveOcrResults = async (data: OCRExamData) => {
    const semanticInput = buildExamSemanticInput({
      lab: data.laboratorio?.nome ?? lab,
      examDate: data.data_exame ?? date,
      results: data.resultados.map((result) => ({
        slug: result.slug,
        value: result.valor,
        unit: result.unidade ?? "",
      })),
    });
    const documentId = pendingDocumentId.current;
    if (!documentId) {
      setError("Documento salvo sem identificador interno. Recarregue a pagina antes de tentar novamente.");
      setLoading(false);
      return;
    }
    const identityResult = await registerDocumentExamIdentity({
      documentId,
      sourceLab: normalizeLabName(data.laboratorio?.nome ?? lab),
      externalOrderId: normalizeExamIdentifier(data.identificador_externo?.valor),
      externalOrderType: normalizeExamIdentifier(data.identificador_externo?.tipo),
      semanticFingerprint: semanticInput ? await sha256Hex(semanticInput) : null,
      examDate: data.data_exame ?? null,
    });

    if (identityResult.duplicate) {
      if (pendingStoragePath.current) {
        await createClient().storage.from("exam-files").remove([pendingStoragePath.current]);
      }
      pendingDocumentId.current = null;
      pendingStoragePath.current = null;
      setError("Este exame ja foi enviado anteriormente.");
      setLoading(false);
      router.refresh();
      return;
    }
    if (identityResult.error) {
      setError(`Documento salvo. Erro ao registrar identificador do exame: ${identityResult.error}`);
      setLoading(false);
      router.refresh();
      return;
    }

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
        resultados.map(r => {
          const labRef = {
            ...(r.ref_min !== null ? { min: r.ref_min } : {}),
            ...(r.ref_max !== null ? { max: r.ref_max } : {}),
          };
          return {
            slug:      r.slug,
            name:      r.nome,
            category:  r.categoria ?? "Outros",
            unit:      r.unidade   ?? "",
            value:     r.valor,
            ref_min:   r.ref_min,
            ref_max:   r.ref_max,
            reference: labRef,
            // Status calculado numericamente — não depende do `alterado` do LLM
            status:    inferStatus(r.valor, labRef),
            historico: r.historico ?? [],
          };
        }),
        data.data_exame ?? date
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
    setLoading(true);
    setError(null);
    setNameWarning(null);

    try {
      const contentHash = inputMode === "text"
        ? await sha256Hex(pastedText.trim())
        : file
          ? await sha256Hex(file)
          : null;

      if (contentHash) {
        setLoadingMsg("Verificando duplicidade...");
        const duplicate = await checkDocumentContentDuplicate(contentHash);
        if (duplicate.error) { setError(duplicate.error); return; }
        if (duplicate.duplicate) { setError("Este exame ja foi enviado anteriormente."); return; }
      }

      // 1. Upload para Supabase Storage
      setLoadingMsg("Salvando documento…");
      let fileUrl: string | null = null;
      if (file) {
        // Lê o arquivo para memória antes de enviar.
        // Arquivos do Google Drive no Android são virtuais e precisam ser
        // baixados pelo browser antes do upload — arrayBuffer() garante isso.
        setLoadingMsg("Lendo arquivo…");
        let fileBuffer: ArrayBuffer;
        try {
          fileBuffer = await file.arrayBuffer();
        } catch {
          setError("Não foi possível ler o arquivo. Se ele estiver no Google Drive, baixe-o para o dispositivo primeiro.");
          setLoading(false);
          return;
        }
        if (fileBuffer.byteLength === 0) {
          setError("O arquivo está vazio. Se ele estiver no Google Drive, baixe-o para o dispositivo primeiro.");
          setLoading(false);
          return;
        }

        setLoadingMsg("Salvando documento…");
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const nameParts = file.name.split(".");
        const ext = nameParts.length > 1 ? (nameParts.pop() ?? "pdf") : "pdf";
        const path = `${authUser?.id ?? "anon"}/${Date.now()}.${ext}`;
        pendingStoragePath.current = path;
        const contentType = (file.type && file.type !== "application/octet-stream")
          ? file.type
          : ext === "pdf" ? "application/pdf" : "application/octet-stream";
        const blob = new Blob([fileBuffer], { type: contentType });
        const { data: up, error: upErr } = await supabase.storage
          .from("exam-files")
          .upload(path, blob, { upsert: false, contentType });
        if (upErr) {
          pendingStoragePath.current = null;
          setError(`Falha ao enviar o arquivo: ${upErr.message}`);
          setLoading(false);
          return;
        }
        if (up) {
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
        content_hash: contentHash,
      });
      if (docResult?.error) {
        if (pendingStoragePath.current) {
          await createClient().storage.from("exam-files").remove([pendingStoragePath.current]);
          pendingStoragePath.current = null;
        }
        setError(docResult.error);
        return;
      }
      pendingDocumentId.current = docResult.id ?? null;

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
            fd.append("file_name", file!.name);
          } else {
            fd.append("file", file!);
            fd.append("file_name", file!.name);
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
          // Fire-and-forget: trigger metabolic pattern analysis in background
          fetch("/api/agents/metabolic-analysis", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          }).catch(() => {});
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
            className="rounded-2xl border-2 border-dashed p-6 text-center transition-all"
            style={{
              borderColor: dragOver ? "#52B788" : file ? "#52B78860" : "rgba(255,255,255,0.12)",
              background:  dragOver ? "rgba(82,183,136,0.05)" : file ? "rgba(82,183,136,0.04)" : "rgba(255,255,255,0.02)",
            }}>
            <input ref={pdfInputRef} type="file" accept="*/*" className="hidden"
              onChange={e => handleFileChange(e.target.files?.[0] ?? null)} />
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => handleFileChange(e.target.files?.[0] ?? null)} />
            {file ? (
              <div className="flex flex-col items-center gap-1.5">
                <CheckCircle size={22} style={{ color: "#52B788" }} />
                <p className="text-sm font-medium" style={{ color: "#E8E4D9" }}>{file.name}</p>
                <p className="text-xs" style={{ color: "#5A5A50" }}>{(file.size / 1024).toFixed(0)} KB</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload size={22} style={{ color: "#5A5A50" }} />
                <p className="text-sm" style={{ color: "#9A9688" }}>
                  Arraste o arquivo aqui ou selecione:
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => pdfInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
                    style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.3)", color: "#52B788" }}>
                    <FileText size={14} /> PDF / Documento
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => imageInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "#9A9688" }}>
                    <Camera size={14} /> Foto / Imagem
                  </button>
                </div>
                <p className="text-xs" style={{ color: "#5A5A50" }}>PDF, JPG ou PNG — máx 8 MB</p>
                <p className="text-xs" style={{ color: "#5A5A50" }}>
                  Samsung: em "PDF / Documento" navegue até <strong style={{ color: "#9A9688" }}>Meus Arquivos</strong>
                </p>
                <p className="text-xs" style={{ color: "#5A5A50" }}>
                  Usa Google Drive? Copie o texto do PDF e use{" "}
                  <button type="button" onClick={() => setInputMode("text")} style={{ color: "#52B788", background: "none", border: "none", padding: 0, cursor: "pointer", fontWeight: 500 }}>
                    Colar texto
                  </button>
                </p>
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
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#9A9688" }}>Laboratório</label>
              <input value={lab} onChange={e => setLab(e.target.value)}
                placeholder="ex: Fleury, Sabin, DASA (opcional)" disabled={loading}
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
