"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, User, ClipboardList, FlaskConical,
  FolderOpen, Clock, FileText, Bell, Settings, LogOut, Activity, Stethoscope, QrCode, BarChart2, MoreHorizontal, X
} from "lucide-react";
import { ease } from "@/lib/motion";
import { signOut } from "@/app/auth/actions";

const navItems = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/overview", label: "Visão Geral", icon: BarChart2 },
  { href: "/body-map", label: "Mapa Corporal", icon: Activity },
  { href: "/exams", label: "Exames", icon: FlaskConical },
  { href: "/doctors", label: "Médicos", icon: Stethoscope },
  { href: "/doctor", label: "Painel Médico", icon: Stethoscope },
  { href: "/share", label: "Compartilhar", icon: QrCode },
  { href: "/timeline", label: "Linha do Tempo", icon: Clock },
  { href: "/documents", label: "Documentos", icon: FolderOpen },
  { href: "/anamnesis", label: "Anamnese", icon: ClipboardList },
  { href: "/report", label: "Relatório", icon: FileText },
  { href: "/profile", label: "Perfil", icon: User }
];

const primaryNav = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/exams", label: "Exames", icon: FlaskConical },
  { href: "/overview", label: "Visão Geral", icon: BarChart2 },
  { href: "/documents", label: "Documentos", icon: FolderOpen },
  { href: "/profile", label: "Perfil", icon: User },
];

const secondaryNav = navItems.filter(
  (item) => !primaryNav.some((p) => p.href === item.href)
);

export function DashboardLayout({ children, userName }: { children: React.ReactNode; userName?: string | null }) {
  const pathname = usePathname();
  const displayName = userName?.trim() || "Usuário";
  const [moreOpen, setMoreOpen] = useState(false);

  const currentPageLabel = navItems.find((n) => n.href === pathname)?.label ?? "HealthAxis";
  const isSecondaryActive = secondaryNav.some((n) => n.href === pathname);

  return (
    <div className="min-h-screen flex" style={{ background: "#0D0D0B", color: "#E8E4D9" }}>
      {/* Sidebar — desktop only */}
      <motion.aside
        className="hidden lg:flex flex-col w-64 fixed inset-y-0 z-30"
        style={{ background: "#0D0D0B", borderRight: "1px solid rgba(255,255,255,0.06)" }}
        initial={{ x: -30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: ease.out }}
      >
        {/* Logo */}
        <div className="p-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Link href="/" className="flex items-center gap-2.5">
            <motion.div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(82,183,136,0.12)", border: "1px solid rgba(82,183,136,0.2)" }}
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Activity size={15} style={{ color: "#52B788" }} />
            </motion.div>
            <span className="font-semibold tracking-tight" style={{ color: "#E8E4D9" }}>HealthAxis</span>
          </Link>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }, i) => {
            const active = pathname === href;
            return (
              <motion.div
                key={href}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 + i * 0.04, duration: 0.4, ease: ease.out }}
              >
                <Link href={href} className="relative flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-colors duration-150 group"
                  style={{ color: active ? "#52B788" : "#9A9688" }}>
                  {active && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-2xl"
                      style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.18)" }}
                      transition={{ type: "spring", stiffness: 300, damping: 28 }}
                    />
                  )}
                  <motion.div whileHover={{ scale: 1.15 }} className="relative z-10">
                    <Icon size={15} />
                  </motion.div>
                  <span className="relative z-10">{label}</span>
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {/* User + bottom actions */}
        <motion.div
          className="p-4 space-y-1"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-3 px-3 py-2.5 mb-2 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "rgba(82,183,136,0.18)", color: "#52B788" }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: "#E8E4D9" }}>{displayName.split(" ")[0]}</p>
              <p className="text-xs truncate" style={{ color: "#5A5A50" }}>Plano gratuito</p>
            </div>
          </div>
          {[{ icon: Bell, label: "Notificações" }, { icon: Settings, label: "Configurações" }].map(({ icon: Icon, label }) => (
            <motion.button key={label} whileHover={{ x: 3 }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all" style={{ color: "#9A9688" }}>
              <Icon size={15} /> {label}
            </motion.button>
          ))}
          <form action={signOut}>
            <motion.button type="submit" whileHover={{ x: 3 }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium" style={{ color: "#C1440E" }}>
              <LogOut size={15} /> Sair
            </motion.button>
          </form>
        </motion.div>
      </motion.aside>

      {/* Main */}
      <div className="flex-1 lg:pl-64">
        {/* Mobile header */}
        <motion.header
          className="lg:hidden sticky top-0 z-20 flex items-center justify-between px-4"
          style={{
            background: "rgba(13,13,11,0.9)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            height: "52px",
          }}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(82,183,136,0.12)", border: "1px solid rgba(82,183,136,0.2)" }}>
              <Activity size={13} style={{ color: "#52B788" }} />
            </div>
          </Link>

          {/* Current page title */}
          <AnimatePresence mode="wait">
            <motion.span
              key={currentPageLabel}
              className="text-sm font-semibold absolute left-1/2 -translate-x-1/2"
              style={{ color: "#E8E4D9" }}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              {currentPageLabel}
            </motion.span>
          </AnimatePresence>

          {/* User avatar → /profile */}
          <Link href="/profile" className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: "rgba(82,183,136,0.18)", color: "#52B788" }}>
            {displayName.charAt(0).toUpperCase()}
          </Link>
        </motion.header>

        {/* Page transition */}
        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: ease.out }}
            className="min-h-screen lg:pb-0"
            style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))" }}
          >
            {children}
          </motion.main>
        </AnimatePresence>

        {/* Bottom tab bar — mobile only, 5 primary tabs + Mais */}
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex items-stretch"
          style={{
            background: "rgba(13,13,11,0.95)",
            backdropFilter: "blur(16px)",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
            height: "calc(56px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {primaryNav.map(({ href, icon: Icon, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMoreOpen(false)}
                className="relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors"
                style={{ color: active ? "#52B788" : "#5A5A50", minHeight: "56px" }}
              >
                {active && (
                  <motion.div
                    layoutId="bottom-tab-active"
                    className="absolute inset-x-1 top-0 h-0.5 rounded-full"
                    style={{ background: "#52B788" }}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon size={20} className="relative z-10" />
                <span className="text-xs font-medium relative z-10 leading-none">{label.split(" ")[0]}</span>
              </Link>
            );
          })}

          {/* Mais button */}
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className="relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors"
            style={{ color: moreOpen || isSecondaryActive ? "#52B788" : "#5A5A50", minHeight: "56px" }}
          >
            {(moreOpen || isSecondaryActive) && !primaryNav.some((p) => p.href === pathname) && (
              <motion.div
                layoutId="bottom-tab-active"
                className="absolute inset-x-1 top-0 h-0.5 rounded-full"
                style={{ background: "#52B788" }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            <MoreHorizontal size={20} className="relative z-10" />
            <span className="text-xs font-medium relative z-10 leading-none">Mais</span>
          </button>
        </nav>

        {/* "Mais" bottom sheet */}
        <AnimatePresence>
          {moreOpen && (
            <>
              {/* Overlay */}
              <motion.div
                className="lg:hidden fixed inset-0 z-40"
                style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setMoreOpen(false)}
              />

              {/* Sheet */}
              <motion.div
                className="lg:hidden fixed left-0 right-0 z-50 rounded-t-3xl"
                style={{
                  bottom: "calc(56px + env(safe-area-inset-bottom, 0px))",
                  background: "#141412",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderBottom: "none",
                }}
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 320, damping: 32 }}
              >
                {/* Handle + header */}
                <div className="flex items-center justify-between px-5 pt-4 pb-3">
                  <div className="w-8 h-1 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-3"
                    style={{ background: "rgba(255,255,255,0.15)" }} />
                  <span className="text-sm font-semibold mt-2" style={{ color: "#E8E4D9" }}>Mais opções</span>
                  <button
                    onClick={() => setMoreOpen(false)}
                    className="w-7 h-7 rounded-full flex items-center justify-center mt-2"
                    style={{ background: "rgba(255,255,255,0.06)", color: "#9A9688" }}
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Secondary nav grid */}
                <div className="grid grid-cols-4 gap-1 px-3 pb-5">
                  {secondaryNav.map(({ href, icon: Icon, label }) => {
                    const active = pathname === href;
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setMoreOpen(false)}
                        className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl transition-colors"
                        style={{
                          color: active ? "#52B788" : "#9A9688",
                          background: active ? "rgba(82,183,136,0.1)" : "rgba(255,255,255,0.03)",
                        }}
                      >
                        <Icon size={20} />
                        <span className="text-xs font-medium text-center leading-tight"
                          style={{ color: active ? "#52B788" : "#9A9688" }}>
                          {label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
