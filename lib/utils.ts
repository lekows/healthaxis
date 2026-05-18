import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function daysFromNow(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getBiomarkerColor(status: string): string {
  switch (status) {
    case "optimal": return "#52B788";
    case "attention": return "#F4A261";
    case "risk": return "#C1440E";
    default: return "#8A8A80";
  }
}

export function getBiomarkerLabel(status: string): string {
  switch (status) {
    case "optimal": return "Ótimo";
    case "attention": return "Atenção";
    case "risk": return "Risco";
    default: return "Indefinido";
  }
}
