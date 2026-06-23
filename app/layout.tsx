import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/shared/Toast";
import { RecoveryHashRedirect } from "@/components/auth/RecoveryHashRedirect";

export const metadata: Metadata = {
  title: "HealthAxis — Saúde preventiva e longitudinal",
  description: "Centralize seus exames, histórico clínico e biomarcadores em um painel visual intuitivo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ background: "#0D0D0B" }}>
        <RecoveryHashRedirect />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
