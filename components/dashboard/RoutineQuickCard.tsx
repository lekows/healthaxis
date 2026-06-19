import { Clock, Scale, HeartPulse, Moon, Dumbbell } from "lucide-react";

const ROWS = [
  { icon: Scale,      label: "Peso",    status: "não atualizado" },
  { icon: HeartPulse, label: "Pressão", status: "não registrada" },
  { icon: Moon,       label: "Sono",    status: "não registrado" },
  { icon: Dumbbell,   label: "Treinos", status: "não informado" },
];

export function RoutineQuickCard() {
  return (
    <div className="rounded-3xl p-6 flex flex-col gap-4"
      style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>Rotina rápida</p>
        <Clock size={16} style={{ color: "#52B788" }} />
      </div>

      <div className="space-y-3">
        {ROWS.map(({ icon: Icon, label, status }) => (
          <div key={label} className="flex items-center gap-2.5">
            <Icon size={16} style={{ color: "#5A5A50" }} />
            <span className="text-sm" style={{ color: "#9A9688" }}>
              <span style={{ color: "#E8E4D9" }}>{label}:</span> {status}
            </span>
          </div>
        ))}
      </div>

      <button disabled
        className="w-full py-2.5 rounded-xl text-sm font-medium cursor-not-allowed"
        style={{ background: "rgba(255,255,255,0.04)", color: "#5A5A50", border: "1px solid rgba(255,255,255,0.07)" }}>
        Atualizar em 1 minuto · em breve
      </button>
    </div>
  );
}
