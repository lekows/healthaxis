"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Camera, CheckCircle, FileText, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import {
  checkDoctorPatientDocumentDuplicate,
  createDoctorPatientDocument,
  registerDoctorPatientDocumentExamIdentity,
  saveDoctorPatientExamBiomarkers,
} from "@/app/doctor/actions";
import { inferStatus } from "@/lib/biomarker-references";
import {
  buildExamSemanticInput,
  normalizeExamIdentifier,
  normalizeLabName,
  sha256Hex,
} from "@/lib/exam-deduplication";
import type { OCRExamData } from "@/app/api/extract-exam/route";

function normalizeName(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

function namesMismatch(profileName: string, examName: string): boolean {
  const profileWords = normalizeName(profileName).split(/\s+/).filter((word) => word.length > 2);
  const examNorm = normalizeName(examName);
  return !profileWords.some((word) => examNorm.includes(word));
}

interface ModalProps {
  patientId: string;
  patientName: string;
  onClose: () => void;
}

function DoctorPatientUploadModalInner({ patientId, patientName, onClose }: ModalProps) {
  const router = useRouter();
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pendingOcr = useRef<OCRExamData | null>(null);
  const pendingDocumentId = useRef<string | null>(null);
  const pendingStoragePath = useRef<string | null>(null);

  const [inputMode, setInputMode] = useState<"file" | "text">("file");
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [title, setTitle] = useState("");
  const [lab, setLab] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [nameWarning, setNameWarning] = useState<string | null>(null);

  const handleFileChange = (nextFile: File | null) => {
    if (!nextFile) return;
    setFile(nextFile);
    setError(null);
    if (!title) setTitle(nextFile.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    const nextFile = event.dataTransfer.files[0] ?? null;
    if (nextFile && (nextFile.name.includes("drivesdk") || nextFile.name.startsWith("view?") || nextFile.size === 0)) {
      setError("Arquivos do Google Drive precisam ser baixados no dispositivo antes do upload.");
      return;
    }
    handleFileChange(nextFile);
  };

  const saveOcrResults = async (data: OCRExamData) => {
    const documentId = pendingDocumentId.current;
    if (!documentId) {
      setError("Documento salvo sem identificador interno. Recarregue a pagina antes de tentar novamente.");
      setLoading(false);
      return;
    }

    const semanticInput = buildExamSemanticInput({
      lab: data.laboratorio?.nome ?? lab,
      examDate: data.data_exame ?? date,
      results: data.resultados.map((result) => ({
        slug: result.slug,
        value: result.valor,
        unit: result.unidade ?? "",
      })),
    });

    const identityResult = await registerDoctorPatientDocumentExamIdentity(patientId, {
      documentId,
      sourceLab: normalizeLabName(data.laboratorio?.nome ?? lab),
      externalOrderId: normalizeExamIdentifier(data.identificador_externo?.valor),
      externalOrderType: normalizeExamIdentifier(data.identificador_externo?.tipo),
      semanticFingerprint: semanticInput ? await sha256Hex(semanticInput) : null,
    });

    if (identityResult.duplicate) {
      if (pendingStoragePath.current) {
        await createClient().storage.from("exam-files").remove([pendingStoragePath.current]);
      }
      setError("Este exame ja foi enviado anteriormente para este paciente.");
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

    const resultados = data.resultados ?? [];
    if (resultados.length === 0) {
      setError("Documento salvo. Nenhum biomarcador numerico foi extraido.");
      setLoading(false);
      router.refresh();
      return;
    }

    const bioResult = await saveDoctorPatientExamBiomarkers(
      patientId,
      documentId,
      resultados.map((result) => {
        const labRef = {
          ...(result.ref_min !== null ? { min: result.ref_min } : {}),
          ...(result.ref_max !== null ? { max: result.ref_max } : {}),
        };
        return {
          slug: result.slug,
          name: result.nome,
          category: result.categoria ?? "Outros",
          unit: result.unidade ?? "",
          value: result.valor,
          ref_min: result.ref_min,
          ref_max: result.ref_max,
          reference: labRef,
          status: inferStatus(result.valor, labRef),
          historico: result.historico ?? [],
        };
      }),
      date
    );

    if (bioResult.error) {
      setError(`Documento salvo. Erro ao registrar biomarcadores: ${bioResult.error}`);
      setLoading(false);
      router.refresh();
      return;
    }

    router.refresh();
    onClose();
  };

  const continueAfterWarning = async () => {
    const data = pendingOcr.current;
    if (!data) return;
    pendingOcr.current = null;
    setLoading(true);
    setLoadingMsg("Salvando biomarcadores...");
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
    if (!title.trim()) { setError("Informe o titulo do documento."); return; }
    if (!lab.trim()) { setError("Informe o laboratorio."); return; }
    if (inputMode === "file" && !file) { setError("Selecione um arquivo."); return; }
    if (inputMode === "text" && pastedText.trim().length <= 10) { setError("Cole o texto do exame."); return; }

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
        const duplicate = await checkDoctorPatientDocumentDuplicate(patientId, contentHash);
        if (duplicate.error) { setError(duplicate.error); return; }
        if (duplicate.duplicate) { setError("Este exame ja foi enviado anteriormente para este paciente."); return; }
      }

      setLoadingMsg("Salvando documento...");
      let fileUrl: string | null = null;
      if (file) {
        let fileBuffer: ArrayBuffer;
        try {
          fileBuffer = await file.arrayBuffer();
        } catch {
          setError("Nao foi possivel ler o arquivo. Baixe-o para o dispositivo e tente novamente.");
          return;
        }
        if (fileBuffer.byteLength === 0) {
          setError("O arquivo esta vazio.");
          return;
        }

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const nameParts = file.name.split(".");
        const ext = nameParts.length > 1 ? (nameParts.pop() ?? "pdf") : "pdf";
        const path = `${patientId}/doctor-uploads/${user?.id ?? "doctor"}/${Date.now()}.${ext}`;
        pendingStoragePath.current = path;
        const contentType = (file.type && file.type !== "application/octet-stream")
          ? file.type
          : ext === "pdf" ? "application/pdf" : "application/octet-stream";
        const blob = new Blob([fileBuffer], { type: contentType });
        const { data: uploaded, error: uploadError } = await supabase.storage
          .from("exam-files")
          .upload(path, blob, { upsert: false, contentType });
        if (uploadError) {
          pendingStoragePath.current = null;
          setError(`Falha ao enviar o arquivo: ${uploadError.message}`);
          return;
        }
        if (uploaded) {
          const { data: urlData } = supabase.storage.from("exam-files").getPublicUrl(uploaded.path);
          fileUrl = urlData.publicUrl;
        }
      }

      const docResult = await createDoctorPatientDocument(patientId, {
        title: title.trim(),
        type: "Exame Laboratorial",
        lab: lab.trim(),
        date,
        tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        file_url: fileUrl,
        content_hash: contentHash,
      });
      if (docResult.error) {
        if (pendingStoragePath.current) {
          await createClient().storage.from("exam-files").remove([pendingStoragePath.current]);
          pendingStoragePath.current = null;
        }
        setError(docResult.error);
        return;
      }
      pendingDocumentId.current = docResult.id ?? null;

      setLoadingMsg("Analisando exame...");
      const formData = new FormData();
      if (inputMode === "text") {
        formData.append("text", pastedText.trim());
      } else if (fileUrl && file) {
        formData.append("file_url", fileUrl);
        formData.append("file_type", file.type);
        formData.append("file_name", file.name);
      }

      const response = await fetch("/api/extract-exam", { method: "POST", body: formData });
      const raw = await response.text();
      let data: (OCRExamData & { ocr_error?: string }) | null = null;
      try { data = JSON.parse(raw); } catch {}

      if (!response.ok || !data) {
        setError("Documento salvo. Falha na extracao automatica.");
        router.refresh();
        return;
      }
      if (data.ocr_error) {
        setError(`Documento salvo. Falha na extracao automatica: ${data.ocr_error}`);
        router.refresh();
        return;
      }

      if (patientName && data.paciente?.nome && namesMismatch(patientName, data.paciente.nome)) {
        pendingOcr.current = data;
        setNameWarning(`O exame parece ser de "${data.paciente.nome}". O paciente selecionado e "${patientName}". Deseja salvar assim mesmo?`);
        setLoading(false);
        setLoadingMsg("");
        return;
      }

      await saveOcrResults(data);
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
        <div className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: "#E8E4D9" }}>Subir exame do paciente</h2>
            <p className="text-xs mt-1" style={{ color: "#9A9688" }}>{patientName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/5 transition-colors"
            style={{ color: "#5A5A50" }}>
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="rounded-2xl p-3 text-xs"
            style={{ background: "rgba(244,162,97,0.08)", border: "1px solid rgba(244,162,97,0.2)", color: "#F4A261" }}>
            O exame aparecera para o paciente como enviado pelo medico e pendente de revisao.
          </div>

          <div className="flex rounded-xl p-0.5 gap-0.5" style={{ background: "#1C1C19", border: "1px solid rgba(255,255,255,0.08)" }}>
            {(["file", "text"] as const).map((mode) => (
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

          {inputMode === "file" && (
            <div
              onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className="rounded-2xl border-2 border-dashed p-6 text-center transition-all"
              style={{
                borderColor: dragOver ? "#52B788" : file ? "#52B78860" : "rgba(255,255,255,0.12)",
                background: dragOver ? "rgba(82,183,136,0.05)" : file ? "rgba(82,183,136,0.04)" : "rgba(255,255,255,0.02)",
              }}>
              <input ref={pdfInputRef} type="file" accept="*/*" className="hidden"
                onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)} />
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
                onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)} />
              {file ? (
                <div className="flex flex-col items-center gap-1.5">
                  <CheckCircle size={22} style={{ color: "#52B788" }} />
                  <p className="text-sm font-medium" style={{ color: "#E8E4D9" }}>{file.name}</p>
                  <p className="text-xs" style={{ color: "#5A5A50" }}>{(file.size / 1024).toFixed(0)} KB</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Upload size={22} style={{ color: "#5A5A50" }} />
                  <p className="text-sm" style={{ color: "#9A9688" }}>Arraste o arquivo aqui ou selecione:</p>
                  <div className="flex gap-2">
                    <button type="button" disabled={loading} onClick={() => pdfInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
                      style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.3)", color: "#52B788" }}>
                      <FileText size={14} /> PDF
                    </button>
                    <button type="button" disabled={loading} onClick={() => imageInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "#9A9688" }}>
                      <Camera size={14} /> Imagem
                    </button>
                  </div>
                  <p className="text-xs" style={{ color: "#5A5A50" }}>PDF, JPG ou PNG - max 8 MB</p>
                </div>
              )}
            </div>
          )}

          {inputMode === "text" && (
            <div>
              <textarea
                value={pastedText}
                onChange={(event) => setPastedText(event.target.value)}
                disabled={loading}
                placeholder="Cole aqui o texto do exame copiado do portal do laboratorio"
                rows={6}
                className="w-full rounded-2xl px-4 py-3 text-sm outline-none resize-none"
                style={{ background: "rgba(255,255,255,0.02)", border: "2px dashed rgba(255,255,255,0.12)", color: "#E8E4D9" }}
              />
              {pastedText.length > 0 && (
                <p className="text-xs mt-1" style={{ color: "#5A5A50" }}>{pastedText.length} caracteres</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#9A9688" }}>Titulo *</label>
              <input value={title} onChange={(event) => setTitle(event.target.value)}
                placeholder="ex: Hemograma completo" disabled={loading}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
                style={{ background: "#1C1C19", border: "1px solid rgba(255,255,255,0.08)", color: "#E8E4D9" }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#9A9688" }}>Data *</label>
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} disabled={loading}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
                style={{ background: "#1C1C19", border: "1px solid rgba(255,255,255,0.08)", color: "#E8E4D9", colorScheme: "dark" }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#9A9688" }}>Laboratorio *</label>
              <input value={lab} onChange={(event) => setLab(event.target.value)}
                placeholder="ex: Fleury, Sabin, DASA" disabled={loading}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
                style={{ background: "#1C1C19", border: "1px solid rgba(255,255,255,0.08)", color: "#E8E4D9" }} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#9A9688" }}>Tags</label>
              <input value={tags} onChange={(event) => setTags(event.target.value)}
                placeholder="sangue, rotina" disabled={loading}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
                style={{ background: "#1C1C19", border: "1px solid rgba(255,255,255,0.08)", color: "#E8E4D9" }} />
            </div>
          </div>

          {nameWarning && (
            <div className="p-4 rounded-2xl space-y-3"
              style={{ background: "rgba(244,162,97,0.08)", border: "1px solid rgba(244,162,97,0.25)" }}>
              <div className="flex items-start gap-2">
                <AlertTriangle size={15} style={{ color: "#F4A261", flexShrink: 0, marginTop: 1 }} />
                <p className="text-sm" style={{ color: "#F4A261" }}>{nameWarning}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setNameWarning(null); continueAfterWarning(); }}
                  className="flex-1 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ background: "rgba(244,162,97,0.15)", color: "#F4A261" }}>
                  Salvar assim mesmo
                </button>
                <button onClick={() => { setNameWarning(null); pendingOcr.current = null; }}
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

        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <button onClick={onClose} disabled={loading}
            className="text-sm disabled:opacity-40" style={{ color: "#5A5A50" }}>
            Cancelar
          </button>
          {!nameWarning && (
            <Button variant="primary" onClick={handleSave} disabled={loading}>
              {loading ? loadingMsg || "Salvando..." : "Salvar exame"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function DoctorPatientUploadButton({ patientId, patientName }: { patientId: string; patientName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" className="gap-2" onClick={() => setOpen(true)}>
        <Upload size={14} /> Subir exame
      </Button>
      {open && (
        <DoctorPatientUploadModalInner
          patientId={patientId}
          patientName={patientName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
