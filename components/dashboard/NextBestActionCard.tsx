import Link from "next/link";
import { Target } from "lucide-react";
import type { NextAction } from "@/lib/health-organization-score";

interface Props {
  action: NextAction | null;
}

export function NextBestActionCard({ action }: Props) {
  return (
    <div className="rounded-3xl p-6 flex flex-col gap-4"
      style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>Próxima melhor ação</p>
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)" }}>
          <Target size={16} style={{ color: "#52B788" }} />
        </div>
      </div>

      {action ? (
        <>
          <p className="text-lg font-bold leading-snug" style={{ color: "#E8E4D9" }}>{action.label}</p>
          <p className="text-sm leading-relaxed" style={{ color: "#9A9688" }}>
            {action.description ?? "Complete seus dados para gerar relatórios melhores e chegar mais preparado à consulta."}
          </p>
          <Link href={action.href}
            className="w-full py-3 rounded-2xl text-sm font-semibold text-center transition-opacity hover:opacity-90"
            style={{ background: "rgba(82,183,136,0.12)", color: "#52B788", border: "1px solid rgba(82,183,136,0.2)" }}>
            {action.label}
          </Link>
        </>
      ) : (
        <p className="text-sm leading-relaxed" style={{ color: "#9A9688" }}>
          Tudo em dia por aqui! Seus dados principais estão organizados. 🎉
        </p>
      )}
    </div>
  );
}
