"use client";
import { useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Plus } from "lucide-react";
import { saveBiomarkerManual } from "@/app/exams/actions";
import { useToast } from "@/components/shared/Toast";

const CATEGORIES = ["Lipídios", "Glicemia", "Tireoide", "Hemograma", "Vitaminas", "Função Renal", "Função Hepática", "Hormônios", "Inflamação", "Outros"];

const inputStyle = {
  background: "#141412",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "#E8E4D9",
  borderRadius: "12px",
  padding: "10px 12px",
  fontSize: "14px",
  width: "100%",
  outline: "none",
};

const labelStyle = { color: "#9A9688", fontSize: "11px", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: "4px", display: "block" };

export function ManualBiomarkerModal() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const { showToast } = useToast();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await saveBiomarkerManual(formData);
        showToast("Biomarcador salvo com sucesso", "success");
        setOpen(false);
        formRef.current?.reset();
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Erro ao salvar", "error");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium transition-all"
        style={{ background: "rgba(82,183,136,0.12)", color: "#52B788", border: "1px solid rgba(82,183,136,0.2)" }}
      >
        <Plus size={14} /> Registrar manualmente
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md overflow-y-auto"
              style={{ background: "#141412", borderLeft: "1px solid rgba(255,255,255,0.08)" }}
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-base font-semibold" style={{ color: "#E8E4D9" }}>Registrar biomarcador</h2>
                  <button onClick={() => setOpen(false)} style={{ color: "#5A5A50" }} className="hover:opacity-70">
                    <X size={18} />
                  </button>
                </div>

                <form ref={formRef} action={handleSubmit} className="space-y-4">
                  <div>
                    <label style={labelStyle}>Nome *</label>
                    <input name="name" required placeholder="ex: LDL Colesterol" style={inputStyle} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label style={labelStyle}>Valor *</label>
                      <input name="value" required type="number" step="any" placeholder="ex: 131" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Unidade *</label>
                      <input name="unit" required placeholder="ex: mg/dL" style={inputStyle} />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Categoria</label>
                    <select name="category" style={inputStyle}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label style={labelStyle}>Ref. mínima</label>
                      <input name="ref_min" type="number" step="any" placeholder="ex: 0" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Ref. máxima</label>
                      <input name="ref_max" type="number" step="any" placeholder="ex: 130" style={inputStyle} />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Data da medição</label>
                    <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} style={inputStyle} />
                  </div>

                  <button
                    type="submit"
                    disabled={pending}
                    className="w-full py-3 rounded-2xl text-sm font-semibold transition-opacity disabled:opacity-50"
                    style={{ background: "#52B788", color: "#0D0D0B" }}
                  >
                    {pending ? "Salvando…" : "Salvar biomarcador"}
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
