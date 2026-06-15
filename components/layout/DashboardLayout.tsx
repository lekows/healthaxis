"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, User, ClipboardList, FlaskConical,
  FolderOpen, Clock, FileText, Bell, Settings, LogOut, Activity, Stethoscope, QrCode, BarChart2
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

export function DashboardLayout({ children, userName }: { children: React.ReactNode; userName?: string | null }) {
  const pathname = usePathname();
  const displayName = userName?.trim() || "Usuário";

  return (
    <div className="min-h-screen flex" style={{ background: "#0D0D0B", color: "#E8E4D9" }}>
      {/* Sidebar */}
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
          className="lg:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3"
          style={{ background: "rgba(13,13,11,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(82,183,136,0.12)", border: "1px solid rgba(82,183,136,0.2)" }}>
              <Activity size={13} style={{ color: "#52B788" }} />
            </div>
            <span className="font-semibold text-sm" style={{ color: "#E8E4D9" }}>HealthAxis</span>
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
            className="min-h-screen lg:pb-0 pb-16"
          >
            {children}
          </motion.main>
        </AnimatePresence>

        {/* Bottom navigation — mobile only, deslizável */}
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center gap-1 px-2 py-1 overflow-x-auto"
          style={{
            background: "rgba(13,13,11,0.92)",
            backdropFilter: "blur(16px)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href}
                className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-colors shrink-0"
                style={{ color: active ? "#52B788" : "#5A5A50", scrollSnapAlign: "center" }}>
                {active && (
                  <motion.div
                    layoutId="bottom-nav-active"
                    className="absolute inset-0 rounded-2xl"
                    style={{ background: "rgba(82,183,136,0.1)" }}
                    transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  />
                )}
                <Icon size={18} className="relative z-10" />
                <span className="text-xs font-medium relative z-10">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
