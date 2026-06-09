import { Stethoscope } from "lucide-react";

export function ConsultationReminderCard() {
  return (
    <div className="rounded-3xl p-6 flex flex-col gap-4"
      style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>Consulta médica</p>
        <Stethoscope size={16} style={{ color: "#52B788" }} />
      </div>

      <div>
        <p className="text-base font-semibold" style={{ color: "#E8E4D9" }}>Nenhuma consulta registrada.</p>
        <p className="text-sm mt-1 leading-relaxed" style={{ color: "#9A9688" }}>
          Adicione sua próxima consulta para gerar um relatório organizado para o médico.
        </p>
      </div>

      <button disabled
        className="w-full py-2.5 rounded-xl text-sm font-medium cursor-not-allowed"
        style={{ background: "rgba(255,255,255,0.04)", color: "#5A5A50", border: "1px solid rgba(255,255,255,0.07)" }}>
        Adicionar consulta · em breve
      </button>
    </div>
  );
}
