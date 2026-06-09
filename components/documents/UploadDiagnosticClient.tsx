"use client";

import { useState } from "react";
import { CheckCircle, Copy, Loader2, Upload, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getUploadDiagnostics, readUploadFile } from "@/lib/upload-file";

type Step = {
  name: string;
  status: "ok" | "error";
  detail: string;
  ms: number;
};

export function UploadDiagnosticClient() {
  const [file, setFile] = useState<File | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [running, setRunning] = useState(false);

  async function runStep(name: string, action: () => Promise<string>): Promise<boolean> {
    const started = performance.now();
    try {
      const detail = await action();
      setSteps((current) => [...current, { name, status: "ok", detail, ms: Math.round(performance.now() - started) }]);
      return true;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setSteps((current) => [...current, { name, status: "error", detail, ms: Math.round(performance.now() - started) }]);
      return false;
    }
  }

  async function runDiagnostic() {
    if (!file) return;
    setRunning(true);
    setSteps([]);

    const supabase = createClient();
    let uploadPath = "";
    let details: Awaited<ReturnType<typeof readUploadFile>> | null = null;
    let userId = "";

    const readOk = await runStep("1. Leitura local", async () => {
      details = await readUploadFile(file);
      return JSON.stringify(getUploadDiagnostics(file, details));
    });

    const authOk = await runStep("2. Sessao", async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) throw new Error("Sessao ausente");
      userId = user.id;
      return `Usuario autenticado: ${user.id.slice(0, 8)}...`;
    });

    if (readOk && authOk && details) {
      await runStep("3. Upload Storage", async () => {
        const candidatePath = `${userId}/diagnostics/${Date.now()}.${details!.extension}`;
        const { error } = await supabase.storage.from("exam-files").upload(candidatePath, details!.blob, {
          upsert: false,
          contentType: details!.contentType,
        });
        if (error) throw error;
        uploadPath = candidatePath;
        return candidatePath;
      });
    }

    if (uploadPath) {
      await runStep("4. Leitura pelo servidor", async () => {
        const response = await fetch("/api/upload-diagnostic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storagePath: uploadPath }),
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(JSON.stringify(result));
        if (details && result.bytes !== details.bytes) {
          throw new Error(`Tamanho divergente: local ${details.bytes}, servidor ${result.bytes}`);
        }
        return JSON.stringify(result);
      });

      await runStep("5. Limpeza", async () => {
        const { error } = await supabase.storage.from("exam-files").remove([uploadPath]);
        if (error) throw error;
        return "Arquivo de diagnostico removido";
      });
    }

    setRunning(false);
  }

  const report = [
    `User-Agent: ${typeof navigator !== "undefined" ? navigator.userAgent : ""}`,
    `Online: ${typeof navigator !== "undefined" ? navigator.onLine : ""}`,
    `Arquivo: ${file?.name || "(nenhum)"}`,
    ...steps.map((step) => `${step.status.toUpperCase()} | ${step.name} | ${step.ms}ms | ${step.detail}`),
  ].join("\n");

  return (
    <div className="space-y-5">
      <label className="block rounded-2xl border border-dashed border-white/15 p-6 text-center cursor-pointer">
        <input type="file" accept="*/*" className="hidden" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        <Upload size={22} className="mx-auto mb-2 text-forest" />
        <p className="text-sm text-ink">{file?.name || "Selecionar o mesmo arquivo que falha no envio"}</p>
        {file && <p className="text-xs text-ink-faint mt-1">{file.type || "MIME vazio"} · {file.size} bytes informados</p>}
      </label>

      <button
        onClick={runDiagnostic}
        disabled={!file || running}
        className="w-full py-3 rounded-2xl text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
        style={{ background: "#52B788", color: "#0D0D0B" }}
      >
        {running && <Loader2 size={14} className="animate-spin" />}
        {running ? "Executando diagnostico..." : "Testar upload sem salvar documento"}
      </button>

      {steps.length > 0 && (
        <div className="space-y-2">
          {steps.map((step) => (
            <div key={step.name} className="rounded-xl p-3 text-xs flex items-start gap-2 border border-white/10">
              {step.status === "ok"
                ? <CheckCircle size={14} className="text-forest shrink-0 mt-0.5" />
                : <XCircle size={14} className="text-terra shrink-0 mt-0.5" />}
              <div>
                <p className="text-ink font-medium">{step.name} · {step.ms}ms</p>
                <p className="text-ink-muted break-all mt-1">{step.detail}</p>
              </div>
            </div>
          ))}
          <button
            onClick={() => navigator.clipboard.writeText(report)}
            className="text-xs text-ink-muted flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10"
          >
            <Copy size={12} /> Copiar relatorio
          </button>
        </div>
      )}
    </div>
  );
}
