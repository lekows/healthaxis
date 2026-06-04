"use client";
import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, ArrowRight, TrendingDown, FileText,
  ShieldCheck, Lock, Heart, CheckCircle2
} from "lucide-react";
import { ease, AnimatedProgressBar } from "@/lib/motion";

// ── Mini dashboard preview (mobile-sized, no floating cards) ──
function MiniDashboard() {
  const bars = [40, 55, 48, 62, 58, 70, 65, 78];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.4, ease: ease.out }}
      className="relative"
    >
      <motion.div
        className="absolute inset-0 blur-3xl opacity-40 pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(82,183,136,0.25) 0%, transparent 70%)" }}
        animate={{ opacity: [0.3, 0.55, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative rounded-3xl p-4 shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
        style={{ background: "rgba(28,28,25,0.95)", border: "1px solid rgba(255,255,255,0.09)" }}>

        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(82,183,136,0.15)", border: "1px solid rgba(82,183,136,0.2)" }}>
              <Activity size={11} style={{ color: "#52B788" }} />
            </div>
            <span className="text-xs font-semibold" style={{ color: "#E8E4D9" }}>HealthAxis</span>
          </div>
          <div className="flex items-center gap-1.5">
            <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: "#52B788" }}
              animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }} />
            <span className="text-xs" style={{ color: "#52B788" }}>Ao vivo</span>
          </div>
        </div>

        {/* Score ring + info */}
        <motion.div
          className="flex items-center gap-4 mb-4 p-3 rounded-2xl"
          style={{ background: "rgba(13,13,11,0.6)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
        >
          <div className="relative shrink-0">
            <svg viewBox="0 0 72 72" className="w-14 h-14 -rotate-90">
              <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7" />
              <motion.circle
                cx="36" cy="36" r="28" fill="none" stroke="#52B788" strokeWidth="7"
                strokeLinecap="round"
                initial={{ strokeDasharray: `0 ${2 * Math.PI * 28}` }}
                animate={{ strokeDasharray: `${2 * Math.PI * 28 * 0.78} ${2 * Math.PI * 28}` }}
                transition={{ duration: 1.6, delay: 0.9, ease: ease.out }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold" style={{ color: "#E8E4D9" }}>78</span>
            </div>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: "#9A9688" }}>Índice Preventivo</p>
            <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>Acima da média</p>
            <p className="text-xs mt-0.5" style={{ color: "#52B788" }}>↑ +4 pts este mês</p>
          </div>
        </motion.div>

        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: "LDL", value: "118", unit: "mg/dL", color: "#F4A261", dot: "⚠" },
            { label: "Glicemia", value: "94", unit: "mg/dL", color: "#52B788", dot: "✓" },
            { label: "TSH", value: "2.0", unit: "mUI/L", color: "#52B788", dot: "✓" }
          ].map((m, i) => (
            <motion.div key={m.label} className="rounded-xl p-2.5"
              style={{ background: "#1C1C19" }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + i * 0.1, ease: ease.out }}
            >
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-xs" style={{ color: "#9A9688" }}>{m.label}</p>
                <span className="text-xs" style={{ color: m.color }}>{m.dot}</span>
              </div>
              <p className="text-sm font-bold" style={{ color: m.color }}>{m.value}</p>
              <p className="text-xs" style={{ color: "#5A5A50" }}>{m.unit}</p>
            </motion.div>
          ))}
        </div>

        {/* Bar chart */}
        <div className="flex items-end gap-1 h-8 px-0.5">
          {bars.map((h, i) => (
            <motion.div key={i} className="flex-1 rounded-sm"
              style={{ background: i === 7 ? "#52B788" : `rgba(82,183,136,${0.12 + i * 0.07})`, height: `${h}%`, originY: 1 }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: 1.1 + i * 0.06, duration: 0.4, ease: ease.out }}
            />
          ))}
        </div>
        <p className="text-xs mt-1 text-center" style={{ color: "#5A5A50" }}>LDL — últimos 8 meses</p>
      </div>
    </motion.div>
  );
}

// ── Sparkline SVG ─────────────────────────────────────────
function Sparkline() {
  const points = [145, 142, 138, 135, 132, 131];
  const w = 80, h = 32;
  const min = Math.min(...points), max = Math.max(...points);
  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((v - min) / (max - min)) * h;
    return `${x},${y}`;
  });
  const d = `M ${coords.join(" L ")}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="overflow-visible">
      <motion.path d={d} fill="none" stroke="#F4A261" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, delay: 0.3, ease: ease.out }}
      />
      <circle cx={coords[coords.length - 1].split(",")[0]} cy={coords[coords.length - 1].split(",")[1]}
        r="3" fill="#F4A261" />
    </svg>
  );
}

// ── Biomarker mini-grid ────────────────────────────────────
const BIOMARKERS = [
  { name: "LDL", value: "131", unit: "mg/dL", color: "#F4A261" },
  { name: "HDL", value: "43", unit: "mg/dL", color: "#F4A261" },
  { name: "Triglicerídeos", value: "148", unit: "mg/dL", color: "#F4A261" },
  { name: "Glicemia", value: "92", unit: "mg/dL", color: "#52B788" },
  { name: "HbA1c", value: "5,1", unit: "%", color: "#52B788" },
  { name: "Vitamina D", value: "18", unit: "ng/mL", color: "#C1440E" },
  { name: "TSH", value: "2,0", unit: "mUI/L", color: "#52B788" },
];

function BiomarkerGrid() {
  return (
    <div className="mt-4">
      <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "#5A5A50" }}>
        Biomarcadores monitorados
      </p>
      <div className="grid grid-cols-2 gap-3">
        {BIOMARKERS.map((bm, i) => {
          const rgb = bm.color === "#52B788" ? "82,183,136" : bm.color === "#F4A261" ? "244,162,97" : "193,68,14";
          return (
            <motion.div
              key={bm.name}
              className="flex items-center gap-3 p-4 rounded-3xl"
              style={{
                background: `rgba(${rgb},0.07)`,
                border: `1px solid rgba(${rgb},0.2)`,
              }}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06, ease: ease.out }}
            >
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: `rgba(${rgb},0.12)`, border: `1px solid rgba(${rgb},0.2)` }}>
                <motion.div
                  className="w-3 h-3 rounded-full"
                  style={{ background: bm.color, boxShadow: `0 0 8px ${bm.color}88` }}
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide truncate mb-0.5" style={{ color: bm.color }}>
                  {bm.name}
                </p>
                <p className="text-base font-bold leading-none" style={{ color: "#E8E4D9" }}>{bm.value}</p>
                <p className="text-xs mt-0.5" style={{ color: "#9A9688" }}>{bm.unit}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── Benefit cards ─────────────────────────────────────────
function BenefitCards() {
  return (
    <div className="space-y-3">
      {/* Score card */}
      <motion.div className="flex items-center gap-4 p-4 rounded-3xl"
        style={{ background: "rgba(82,183,136,0.07)", border: "1px solid rgba(82,183,136,0.2)" }}
        initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }} transition={{ duration: 0.5, ease: ease.out }}
      >
        <div className="relative shrink-0">
          <svg viewBox="0 0 56 56" className="w-12 h-12 -rotate-90">
            <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(82,183,136,0.15)" strokeWidth="6" />
            <motion.circle cx="28" cy="28" r="22" fill="none" stroke="#52B788" strokeWidth="6"
              strokeLinecap="round"
              initial={{ strokeDasharray: `0 ${2 * Math.PI * 22}` }}
              whileInView={{ strokeDasharray: `${2 * Math.PI * 22 * 0.78} ${2 * Math.PI * 22}` }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: 0.2, ease: ease.out }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold" style={{ color: "#52B788" }}>78</span>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#52B788" }}>Índice de Saúde</p>
          <p className="text-base font-semibold" style={{ color: "#E8E4D9" }}>Acima da média</p>
          <p className="text-sm mt-0.5" style={{ color: "#9A9688" }}>Acompanhe sua evolução ao longo do tempo</p>
        </div>
      </motion.div>

      {/* LDL trend card */}
      <motion.div className="flex items-center gap-4 p-4 rounded-3xl"
        style={{ background: "rgba(244,162,97,0.07)", border: "1px solid rgba(244,162,97,0.2)" }}
        initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1, ease: ease.out }}
      >
        <div className="shrink-0 flex flex-col items-center gap-1">
          <Sparkline />
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full"
            style={{ background: "rgba(244,162,97,0.12)", border: "1px solid rgba(244,162,97,0.2)" }}>
            <TrendingDown size={9} style={{ color: "#F4A261" }} />
            <span className="text-xs font-medium" style={{ color: "#F4A261" }}>Em queda</span>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#F4A261" }}>LDL Colesterol</p>
          <p className="text-base font-semibold" style={{ color: "#E8E4D9" }}>145 → 131 mg/dL</p>
          <p className="text-sm mt-0.5" style={{ color: "#9A9688" }}>Gráficos de tendência para cada biomarcador</p>
        </div>
      </motion.div>

      {/* Documents card */}
      <motion.div className="flex items-center gap-4 p-4 rounded-3xl"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)" }}
        initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2, ease: ease.out }}
      >
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <FileText size={20} style={{ color: "#9A9688" }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#9A9688" }}>Documentos</p>
          <p className="text-base font-semibold" style={{ color: "#E8E4D9" }}>Laudos centralizados</p>
          <p className="text-sm mt-0.5" style={{ color: "#9A9688" }}>Todos seus exames em um só lugar</p>
        </div>
      </motion.div>

      <BiomarkerGrid />
    </div>
  );
}

// ── Steps ─────────────────────────────────────────────────
const steps = [
  { n: "01", title: "Crie seu perfil", desc: "Dados básicos e histórico em minutos.", color: "#52B788" },
  { n: "02", title: "Adicione seus exames", desc: "Faça upload de laudos. Organizamos tudo.", color: "#52B788" },
  { n: "03", title: "Acompanhe tendências", desc: "Biomarcadores com gráficos e contexto.", color: "#F4A261" },
  { n: "04", title: "Chegue preparado", desc: "Relatório pronto para sua consulta.", color: "#E8E4D9" },
];

export function MobileLanding() {
  return (
    <div style={{ background: "#0D0D0B", color: "#E8E4D9" }}>

      {/* ── Nav ──────────────────────────────────────── */}
      <motion.nav className="flex items-center justify-between px-5 py-4"
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: ease.out }}
      >
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(82,183,136,0.12)", border: "1px solid rgba(82,183,136,0.2)" }}>
            <Activity size={13} style={{ color: "#52B788" }} />
          </div>
          <span className="font-semibold text-base tracking-tight" style={{ color: "#E8E4D9" }}>HealthAxis</span>
        </Link>
        <Link href="/auth/login"
          className="px-3 py-1.5 rounded-xl text-sm font-semibold"
          style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)", color: "#52B788" }}>
          Entrar
        </Link>
      </motion.nav>

      {/* ── Hero ─────────────────────────────────────── */}
      <section className="px-5 pb-8">
        {/* Badge */}
        <motion.div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-5"
          style={{ border: "1px solid rgba(82,183,136,0.25)", background: "rgba(82,183,136,0.06)", color: "#52B788" }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: ease.out }}
        >
          <motion.span className="w-1.5 h-1.5 rounded-full" style={{ background: "#52B788" }}
            animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }} />
          Saúde preventiva e longitudinal
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="text-[38px] font-bold leading-[1.08] tracking-tight mb-3"
          style={{ color: "#E8E4D9" }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: ease.out }}
        >
          Sua saúde,{" "}
          <span style={{ color: "#52B788" }}>organizada</span>{" "}
          e visual.
        </motion.h1>

        {/* Subtitle */}
        <motion.p className="text-base leading-relaxed mb-6" style={{ color: "#9A9688" }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25, ease: ease.out }}
        >
          Centralize exames, monitore biomarcadores e chegue às consultas preparado.
        </motion.p>

        {/* CTA */}
        <motion.div className="mb-6"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.32, ease: ease.out }}
        >
          <Link href="/dashboard"
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-semibold"
            style={{ background: "#52B788", color: "#0D0D0B", boxShadow: "0 0 28px rgba(82,183,136,0.3)" }}>
            Começar agora
            <motion.span animate={{ x: [0, 3, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}>
              <ArrowRight size={15} />
            </motion.span>
          </Link>
        </motion.div>

        {/* Trust line */}
        <motion.div className="flex items-center justify-center gap-4 text-sm mb-8"
          style={{ color: "#5A5A50" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
        >
          {[
            { icon: ShieldCheck, text: "Dados privados" },
            { icon: Lock, text: "Sem venda de dados" },
            { icon: Heart, text: "Gratuito" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-1">
              <Icon size={10} style={{ color: "#52B788" }} /> {text}
            </div>
          ))}
        </motion.div>

        {/* Dashboard preview */}
        <MiniDashboard />
      </section>

      {/* ── Benefits section ──────────────────────────── */}
      <section className="px-5 py-8" style={{ background: "#141412" }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.5, ease: ease.out }}
          className="mb-5"
        >
          <p className="text-sm font-semibold uppercase tracking-widest mb-1" style={{ color: "#52B788" }}>O que você vê</p>
          <p className="text-2xl font-bold" style={{ color: "#E8E4D9" }}>Dados reais. Visão clara.</p>
        </motion.div>
        <BenefitCards />
      </section>

      {/* ── How it works ──────────────────────────────── */}
      <section className="px-5 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.5, ease: ease.out }}
          className="mb-5"
        >
          <p className="text-sm font-semibold uppercase tracking-widest mb-1" style={{ color: "#52B788" }}>Como funciona</p>
          <p className="text-2xl font-bold" style={{ color: "#E8E4D9" }}>Simples e rápido.</p>
        </motion.div>

        <div className="space-y-4">
          {steps.map(({ n, title, desc, color }, i) => (
            <motion.div key={n} className="flex items-start gap-4"
              initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08, ease: ease.out }}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: `rgba(82,183,136,0.08)`, border: `1px solid rgba(82,183,136,0.15)` }}>
                <span className="text-xs font-bold" style={{ color }}>{n}</span>
              </div>
              <div>
                <p className="text-base font-semibold mb-0.5" style={{ color: "#E8E4D9" }}>{title}</p>
                <p className="text-sm" style={{ color: "#9A9688" }}>{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────── */}
      <section className="px-5 pb-12 pt-2">
        <motion.div className="relative overflow-hidden rounded-3xl p-6 text-center"
          style={{ background: "#141412", border: "1px solid rgba(82,183,136,0.15)" }}
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.5, ease: ease.out }}
        >
          <div className="absolute inset-0 blur-3xl pointer-events-none"
            style={{ background: "radial-gradient(ellipse at center, rgba(82,183,136,0.12) 0%, transparent 70%)" }} />

          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)" }}>
              <Activity size={20} style={{ color: "#52B788" }} />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: "#E8E4D9" }}>
              Comece a cuidar da sua saúde <span style={{ color: "#52B788" }}>hoje</span>.
            </h2>
            <p className="text-base mb-5" style={{ color: "#9A9688" }}>
              Gratuito. Sem cartão de crédito.
            </p>

            <Link href="/dashboard"
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-base font-semibold mb-3"
              style={{ background: "#52B788", color: "#0D0D0B" }}>
              Acessar o painel <ArrowRight size={14} />
            </Link>
            <Link href="/report"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-base"
              style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#9A9688" }}>
              Ver relatório de exemplo
            </Link>
          </div>
        </motion.div>

        {/* Privacy note */}
        <div className="flex flex-wrap justify-center gap-3 mt-5 text-sm" style={{ color: "#5A5A50" }}>
          {["Criptografia de ponta a ponta", "Dados não são vendidos", "Conforme LGPD"].map(item => (
            <div key={item} className="flex items-center gap-1">
              <CheckCircle2 size={9} style={{ color: "#52B788" }} /> {item}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
