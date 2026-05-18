import { cn } from "@/lib/utils";
import type { HTMLAttributes, ButtonHTMLAttributes } from "react";

// Dark theme tokens
const D = {
  bg2: "#141412",
  bg3: "#1C1C19",
  bg4: "#252520",
  border: "rgba(255,255,255,0.07)",
  borderHover: "rgba(255,255,255,0.13)",
  text: "#E8E4D9",
  muted: "#9A9688",
  faint: "#5A5A50",
  green: "#52B788",
  greenBg: "rgba(82,183,136,0.1)",
  greenBorder: "rgba(82,183,136,0.18)",
  terra: "#C1440E",
  terraBg: "rgba(193,68,14,0.1)",
  terraBorder: "rgba(193,68,14,0.2)"
};

// ── Badge ──────────────────────────────────────────────
type BadgeVariant = "default" | "success" | "warning" | "danger" | "muted";
interface BadgeProps extends HTMLAttributes<HTMLSpanElement> { variant?: BadgeVariant; }

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const styles: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
    default: { bg: D.greenBg, color: D.green, border: D.greenBorder },
    success: { bg: D.greenBg, color: D.green, border: D.greenBorder },
    warning: { bg: "rgba(244,162,97,0.1)", color: "#F4A261", border: "rgba(244,162,97,0.2)" },
    danger: { bg: D.terraBg, color: D.terra, border: D.terraBorder },
    muted: { bg: "rgba(255,255,255,0.04)", color: D.muted, border: D.border }
  };
  const s = styles[variant];
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", className)}
      style={{ background: s.bg, color: s.color, borderColor: s.border }}
      {...props}
    />
  );
}

// ── Button ─────────────────────────────────────────────
type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "terra";
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
}

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  const sizes = { sm: "px-3 py-1.5 text-sm rounded-xl", md: "px-5 py-2.5 text-sm rounded-2xl", lg: "px-7 py-3.5 text-base rounded-2xl" };
  const baseStyle = cn("inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 disabled:opacity-50 cursor-pointer", sizes[size], className);

  const inlineStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: { background: D.green, color: "#0D0D0B", boxShadow: "0 0 20px rgba(82,183,136,0.2)" },
    secondary: { background: D.greenBg, color: D.green, border: `1px solid ${D.greenBorder}` },
    ghost: { color: D.muted },
    outline: { border: `1px solid ${D.border}`, color: D.muted },
    terra: { background: D.terra, color: "#fff", boxShadow: "0 0 20px rgba(193,68,14,0.2)" }
  };

  return <button className={baseStyle} style={inlineStyles[variant]} {...props} />;
}

// ── Card ───────────────────────────────────────────────
export function Card({ className, style, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-3xl transition-all duration-200", className)}
      style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)", ...style }}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pb-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-xs font-semibold uppercase tracking-wider", className)} style={{ color: "#9A9688" }} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 pb-6", className)} {...props} />;
}

// ── Progress ───────────────────────────────────────────
interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  color?: string;
}

export function Progress({ value, max = 100, color = "#52B788", className, ...props }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn("h-1.5 w-full rounded-full overflow-hidden", className)}
      style={{ background: "rgba(255,255,255,0.06)" }} {...props}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}
