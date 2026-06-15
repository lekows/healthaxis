import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href?: string; onClick?: () => void };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div
        className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <Icon size={24} style={{ color: "#5A5A50" }} />
      </div>
      <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>{title}</p>
      <p className="text-xs mt-1 max-w-xs" style={{ color: "#5A5A50" }}>{description}</p>
      {action && (
        action.onClick ? (
          <button
            onClick={action.onClick}
            className="mt-4 px-4 py-2 rounded-2xl text-sm font-medium transition-colors"
            style={{ background: "rgba(82,183,136,0.12)", color: "#52B788", border: "1px solid rgba(82,183,136,0.2)" }}
          >
            {action.label}
          </button>
        ) : (
          <Link
            href={action.href!}
            className="mt-4 px-4 py-2 rounded-2xl text-sm font-medium transition-colors"
            style={{ background: "rgba(82,183,136,0.12)", color: "#52B788", border: "1px solid rgba(82,183,136,0.2)" }}
          >
            {action.label}
          </Link>
        )
      )}
    </div>
  );
}
