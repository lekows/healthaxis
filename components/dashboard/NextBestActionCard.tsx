import Link from "next/link";
import { Target, AlertTriangle } from "lucide-react";
import type { NextAction } from "@/lib/health-organization-score";

interface Props {
  action: NextAction | null;
}

export function NextBestActionCard({ action }: Props) {
  const isAlert = action?.tone === "alert";
  const count = action?.count ?? 0;
  const plural = count > 1;

  return (
    <div className="rounded-3xl p-6 flex flex-col gap-4"
      style={{
        background: "#141412",
        border: isAlert ? "1px solid rgba(193,68,14,0.3)" : "1px solid rgba(255,255,255,0.07)",
      }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>Próxima melhor ação</p>
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
          style={{
            background: isAlert ? "rgba(193,68,14,0.1)" : "rgba(82,183,136,0.1)",
            border: isAlert ? "1px solid rgba(193,68,14,0.2)" : "1px solid rgba(82,183,136,0.2)",
          }}>
          {isAlert
            ? <AlertTriangle size={16} style={{ color: "#C1440E" }} />
            : <Target size={16} style={{ color: "#52B788" }} />}
        </div>
      </div>

      {action ? (
        <>
          <p className="text-lg font-bold leading-snug" style={{ color: "#E8E4D9" }}>{action.label}</p>

          {isAlert ? (
            <p className="text-sm leading-relaxed" style={{ color: "#9A9688" }}>
              Você tem{" "}
              <strong style={{ color: "#C1440E" }}>
                {count} biomarcador{plural ? "es" : ""} alterado{plural ? "s" : ""}
              </strong>
              . {action.description}
            </p>
          ) : (
            <p className="text-sm leading-relaxed" style={{ color: "#9A9688" }}>
              {action.description ?? "Complete seus dados para gerar relatórios melhores e chegar mais preparado à consulta."}
            </p>
          )}

          <Link href={action.href}
            className="w-full py-3 rounded-2xl text-sm font-semibold text-center transition-opacity hover:opacity-90"
            style={isAlert
              ? { background: "rgba(193,68,14,0.14)", color: "#C1440E", border: "1px solid rgba(193,68,14,0.3)" }
              : { background: "rgba(82,183,136,0.12)", color: "#52B788", border: "1px solid rgba(82,183,136,0.2)" }}>
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
