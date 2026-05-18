"use client";
import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from "framer-motion";
import {
  Activity, TrendingUp, Clock, FileText, ShieldCheck,
  FlaskConical, Lock, ArrowRight, CheckCircle2,
  BarChart3, Heart, ArrowUpRight, ChevronDown
} from "lucide-react";
import {
  Reveal, StaggerContainer, StaggerItem, ParallaxSection,
  FloatingBlob, ShimmerLine, HoverCard, AnimatedProgressBar,
  fadeUp, scaleIn, slideLeft, slideRight, ease
} from "@/lib/motion";

// ── Cursor glow ────────────────────────────────────────
function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (ref.current) {
        ref.current.style.left = e.clientX + "px";
        ref.current.style.top = e.clientY + "px";
      }
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);
  return (
    <div ref={ref} className="cursor-glow hidden lg:block" />
  );
}

// ── Animated counter ───────────────────────────────────
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let start = 0;
        const step = to / 60;
        const tick = () => {
          start = Math.min(start + step, to);
          setVal(Math.floor(start));
          if (start < to) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [to]);
  return <span ref={ref}>{val}{suffix}</span>;
}

// ── Marquee ────────────────────────────────────────────
const marqueeItems = [
  "LDL Colesterol", "Hemoglobina Glicada", "Triglicerídeos",
  "Pressão Arterial", "Glicemia em Jejum", "HDL Colesterol", "IMC",
  "Vitamina D", "TSH", "Ferritina", "PCR Ultrassensível",
  "Creatinina", "Ácido Úrico", "Homocisteína"
];

function Marquee() {
  const items = [...marqueeItems, ...marqueeItems];
  return (
    <div className="overflow-hidden py-5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <motion.div
        className="flex gap-8 whitespace-nowrap w-max"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      >
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-8">
            <span className="text-sm font-medium tracking-wide" style={{ color: "#9A9688" }}>{item}</span>
            <span className="text-xs" style={{ color: "#52B788" }}>✦</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// ── Dashboard preview (dark, with Framer animations) ───
function DashboardPreviewDark() {
  const bars = [40, 55, 48, 62, 58, 70, 65, 78];

  return (
    <motion.div
      initial={{ opacity: 0, x: 40, rotateY: -8 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      transition={{ duration: 0.9, delay: 0.3, ease: ease.out }}
      style={{ perspective: 1200 }}
      className="relative"
    >
      {/* Glow behind */}
      <motion.div
        className="absolute inset-0 blur-3xl scale-110 opacity-50 pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(82,183,136,0.18) 0%, transparent 70%)" }}
        animate={{ opacity: [0.4, 0.65, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="relative rounded-3xl p-6 shadow-[0_8px_60px_rgba(0,0,0,0.6)]"
        style={{ background: "rgba(28,28,25,0.9)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.09)" }}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.3, ease: ease.out }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(82,183,136,0.15)", border: "1px solid rgba(82,183,136,0.2)" }}>
              <Activity size={13} style={{ color: "#52B788" }} />
            </div>
            <span className="text-xs font-semibold" style={{ color: "#E8E4D9" }}>HealthAxis</span>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: "#252520" }} />
            ))}
          </div>
        </div>

        {/* Score */}
        <motion.div
          className="flex items-center gap-5 mb-5 p-4 rounded-2xl"
          style={{ background: "rgba(13,13,11,0.6)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="relative shrink-0">
            <svg viewBox="0 0 80 80" className="w-16 h-16 -rotate-90">
              <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
              <motion.circle
                cx="40" cy="40" r="32" fill="none" stroke="#52B788" strokeWidth="8"
                strokeLinecap="round"
                initial={{ strokeDasharray: `0 ${2 * Math.PI * 32}` }}
                animate={{ strokeDasharray: `${2 * Math.PI * 32 * 0.78} ${2 * Math.PI * 32}` }}
                transition={{ duration: 1.5, delay: 0.8, ease: ease.out }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-base font-bold" style={{ color: "#E8E4D9" }}>78</span>
            </div>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: "#9A9688" }}>Índice Preventivo</p>
            <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>Acima da média</p>
            <p className="text-xs mt-0.5" style={{ color: "#52B788" }}>↑ +4 pts este mês</p>
          </div>
        </motion.div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "LDL", value: "118", unit: "mg/dL", color: "#F4A261", dot: "⚠" },
            { label: "Glicemia", value: "94", unit: "mg/dL", color: "#52B788", dot: "✓" },
            { label: "PA", value: "118/76", unit: "mmHg", color: "#52B788", dot: "✓" }
          ].map((m, i) => (
            <motion.div
              key={m.label}
              className="rounded-2xl p-3"
              style={{ background: "#1C1C19" }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + i * 0.1, ease: ease.out }}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs" style={{ color: "#9A9688" }}>{m.label}</p>
                <span className="text-xs" style={{ color: m.color }}>{m.dot}</span>
              </div>
              <p className="text-sm font-bold" style={{ color: m.color }}>{m.value}</p>
              <p className="text-xs" style={{ color: "#5A5A50" }}>{m.unit}</p>
            </motion.div>
          ))}
        </div>

        {/* Animated bar chart */}
        <div className="flex items-end gap-1 h-10 px-1">
          {bars.map((h, i) => (
            <motion.div
              key={i}
              className="flex-1 rounded-sm"
              style={{ background: i === 7 ? "#52B788" : `rgba(82,183,136,${0.15 + i * 0.06})` }}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ delay: 1 + i * 0.07, duration: 0.5, ease: ease.out }}
            />
          ))}
        </div>
        <p className="text-xs mt-2 text-center" style={{ color: "#5A5A50" }}>LDL — últimos 8 meses</p>
      </motion.div>

      {/* Floating card 1 */}
      <motion.div
        className="absolute -left-14 top-1/3 rounded-2xl p-3.5 w-36 shadow-[0_4px_30px_rgba(0,0,0,0.5)] hidden xl:block"
        style={{ background: "rgba(28,28,25,0.95)", border: "1px solid rgba(255,255,255,0.08)" }}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.1, duration: 0.6, ease: ease.out }}
        whileHover={{ x: -4 }}
      >
        <p className="text-xs" style={{ color: "#9A9688" }}>Próximo exame</p>
        <p className="text-sm font-bold mt-0.5" style={{ color: "#E8E4D9" }}>Out 2025</p>
        <AnimatedProgressBar value={62} delay={1.4} />
        <p className="text-xs mt-1" style={{ color: "#9A9688" }}>146 dias</p>
      </motion.div>

      {/* Floating card 2 */}
      <motion.div
        className="absolute -right-10 bottom-20 rounded-2xl p-3.5 w-40 shadow-[0_4px_30px_rgba(0,0,0,0.5)] hidden xl:block"
        style={{ background: "rgba(28,28,25,0.95)", border: "1px solid rgba(255,255,255,0.08)" }}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.2, duration: 0.6, ease: ease.out }}
        whileHover={{ x: 4 }}
      >
        <div className="flex items-center gap-2 mb-1">
          <motion.div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#C1440E" }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <p className="text-xs font-medium" style={{ color: "#C1440E" }}>Atenção</p>
        </div>
        <p className="text-xs font-semibold" style={{ color: "#E8E4D9" }}>Consulta ginecológica</p>
        <p className="text-xs mt-0.5" style={{ color: "#9A9688" }}>em 24 dias</p>
      </motion.div>
    </motion.div>
  );
}

// ── HeroSection ────────────────────────────────────────
export function HeroSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  const words = ["organizada", "compreendida.", "sua."];
  const [wordIdx, setWordIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setWordIdx(i => (i + 1) % words.length), 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <section ref={ref} className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: "#0D0D0B" }}>
      <CursorGlow />

      {/* Parallax ambient blobs */}
      <FloatingBlob
        className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(82,183,136,0.12) 0%, transparent 70%)" }}
        duration={14}
      />
      <FloatingBlob
        className="absolute bottom-[-100px] right-[-150px] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(193,68,14,0.08) 0%, transparent 70%)" }}
        duration={18}
        reverse
      />

      {/* Nav */}
      <motion.nav
        className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: ease.out }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <motion.div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(82,183,136,0.12)", border: "1px solid rgba(82,183,136,0.2)" }}
            whileHover={{ scale: 1.08 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <Activity size={15} style={{ color: "#52B788" }} />
          </motion.div>
          <span className="font-semibold tracking-tight" style={{ color: "#E8E4D9" }}>HealthAxis</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm" style={{ color: "#9A9688" }}>
          {["Funcionalidades", "Como funciona", "Privacidade"].map((item, i) => (
            <motion.a
              key={item}
              href="#"
              className="hover:text-white transition-colors duration-200"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
            >
              {item}
            </motion.a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="hidden sm:block text-sm transition-colors duration-200" style={{ color: "#9A9688" }}>
            Entrar
          </Link>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "#52B788", color: "#0D0D0B", boxShadow: "0 0 20px rgba(82,183,136,0.25)" }}
            >
              Começar <ArrowRight size={14} />
            </Link>
          </motion.div>
        </div>
      </motion.nav>

      {/* Hero content with parallax */}
      <motion.div
        className="relative z-10 flex-1 flex items-center"
        style={{ y: heroY, opacity: heroOpacity }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full py-16 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            {/* Pill */}
            <motion.div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8"
              style={{ border: "1px solid rgba(82,183,136,0.25)", background: "rgba(82,183,136,0.06)", color: "#52B788" }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: ease.out }}
            >
              <motion.span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "#52B788" }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              Saúde preventiva e longitudinal
            </motion.div>

            {/* Headline with word swap */}
            <motion.h1
              className="font-editorial text-5xl lg:text-[64px] leading-[1.05] tracking-tight mb-6"
              style={{ color: "#E8E4D9" }}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: ease.out }}
            >
              Sua saúde,{" "}
              <span className="inline-block overflow-hidden" style={{ minWidth: "280px" }}>
                <AnimatePresence mode="wait">
                  <motion.em
                    key={wordIdx}
                    className="not-italic text-gradient-green block"
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -40, opacity: 0 }}
                    transition={{ duration: 0.45, ease: ease.out }}
                  >
                    {words[wordIdx]}
                  </motion.em>
                </AnimatePresence>
              </span>
            </motion.h1>

            <motion.p
              className="text-lg leading-relaxed mb-10 max-w-lg"
              style={{ color: "#9A9688" }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25, ease: ease.out }}
            >
              Centralize exames, histórico clínico, biomarcadores e medicamentos. Chegue às suas consultas mais preparado — sem ruído, sem confusão.
            </motion.p>

            {/* CTAs */}
            <motion.div
              className="flex flex-wrap gap-3 mb-14"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35, ease: ease.out }}
            >
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/dashboard"
                  className="group flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold"
                  style={{ background: "#52B788", color: "#0D0D0B", boxShadow: "0 0 24px rgba(82,183,136,0.22)" }}
                >
                  Ver meu painel
                  <motion.span animate={{ x: [0, 3, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}>
                    <ArrowRight size={15} />
                  </motion.span>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/report"
                  className="flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-medium transition-all"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#9A9688" }}
                >
                  Ver relatório de exemplo
                </Link>
              </motion.div>
            </motion.div>

            {/* Trust badges */}
            <StaggerContainer delay={0.1} className="flex flex-wrap gap-6 text-xs" style={{ color: "#5A5A50" }}>
              {[
                { icon: ShieldCheck, text: "Dados privados e seguros" },
                { icon: Lock, text: "Sem venda de dados" },
                { icon: Heart, text: "Não substitui o médico" }
              ].map(({ icon: Icon, text }) => (
                <StaggerItem key={text} variant={fadeUp}>
                  <div className="flex items-center gap-1.5">
                    <Icon size={12} style={{ color: "#52B788" }} /> {text}
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>

          {/* Preview */}
          <div className="hidden lg:block">
            <DashboardPreviewDark />
          </div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="relative z-10 flex justify-center pb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        <motion.div
          className="flex flex-col items-center gap-2"
          style={{ color: "#5A5A50" }}
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <ChevronDown size={14} />
        </motion.div>
      </motion.div>
    </section>
  );
}

// ── Marquee section ────────────────────────────────────
export function MarqueeSection() {
  return (
    <div style={{ background: "#141412" }}>
      <Marquee />
    </div>
  );
}

// ── Stats section ──────────────────────────────────────
export function StatsSection() {
  return (
    <section className="py-24" style={{ background: "#141412" }}>
      <div className="max-w-6xl mx-auto px-6 lg:px-12">
        <StaggerContainer delay={0.12} className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { value: 20, suffix: "+", label: "Biomarcadores monitorados" },
            { value: 8, suffix: " rotas", label: "Seções no painel" },
            { value: 100, suffix: "%", label: "Dados privados" },
            { value: 0, suffix: " diagnósticos", label: "Emitidos (como deve ser)" }
          ].map(({ value, suffix, label }) => (
            <StaggerItem key={label} variant={scaleIn}>
              <HoverCard
                className="text-center p-6 rounded-3xl cursor-default h-full"
                style={{ border: "1px solid rgba(255,255,255,0.05)", background: "#141412" }}
              >
                <div className="font-editorial text-4xl font-bold mb-2" style={{ color: "#52B788" }}>
                  <Counter to={value} suffix={suffix} />
                </div>
                <p className="text-sm leading-snug" style={{ color: "#9A9688" }}>{label}</p>
              </HoverCard>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

// ── Feature Grid ───────────────────────────────────────
const features = [
  { icon: FlaskConical, title: "Exames organizados", desc: "Centralize todos os resultados laboratoriais e visualize tendências ao longo do tempo." },
  { icon: TrendingUp, title: "Biomarcadores em tendência", desc: "Acompanhe LDL, glicemia, PA e outros marcadores com gráficos claros e contexto educativo." },
  { icon: Clock, title: "Linha do tempo clínica", desc: "Veja sua história de saúde cronologicamente: consultas, exames, vacinas e eventos." },
  { icon: FileText, title: "Relatório para consulta", desc: "Gere um resumo estruturado para apresentar ao seu médico. Simples e preciso." },
  { icon: BarChart3, title: "Painel visual premium", desc: "Interface que transforma dados complexos em informação clara e acionável." },
  { icon: ShieldCheck, title: "Privacidade total", desc: "Seus dados pertencem a você. Nunca vendemos ou compartilhamos suas informações." }
];

export function FeatureGrid() {
  return (
    <section className="py-28" style={{ background: "#0D0D0B" }}>
      <div className="max-w-6xl mx-auto px-6 lg:px-12">
        <div className="text-center mb-20">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "#52B788" }}>Funcionalidades</p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-editorial text-4xl lg:text-5xl leading-tight" style={{ color: "#E8E4D9" }}>
              Tudo que você precisa para{" "}
              <em className="not-italic text-gradient-green">cuidar da saúde</em>
            </h2>
          </Reveal>
        </div>

        <StaggerContainer delay={0.08} className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <StaggerItem key={title} variant={fadeUp}>
              <HoverCard
                className="group p-6 rounded-3xl h-full cursor-default"
                style={{ border: "1px solid rgba(255,255,255,0.05)", background: "#141412" }}
              >
                <motion.div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: "rgba(82,183,136,0.08)", border: "1px solid rgba(82,183,136,0.12)" }}
                  whileHover={{ rotate: [0, -6, 6, 0] }}
                  transition={{ duration: 0.4 }}
                >
                  <Icon size={18} style={{ color: "#52B788" }} />
                </motion.div>
                <h3 className="text-base font-semibold mb-2" style={{ color: "#E8E4D9" }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#9A9688" }}>{desc}</p>
                <div className="mt-4 flex items-center gap-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ color: "#52B788" }}>
                  Saiba mais <ArrowUpRight size={11} />
                </div>
              </HoverCard>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

// ── How It Works ───────────────────────────────────────
const steps = [
  { n: "01", title: "Crie seu perfil", desc: "Adicione dados básicos, histórico familiar e medicamentos em uso." },
  { n: "02", title: "Adicione seus exames", desc: "Faça upload de laudos. O HealthAxis organiza e categoriza tudo." },
  { n: "03", title: "Acompanhe tendências", desc: "Veja a evolução dos biomarcadores com gráficos e contexto educativo." },
  { n: "04", title: "Chegue preparado", desc: "Gere um relatório e compartilhe com seu médico antes da consulta." }
];

export function HowItWorks() {
  return (
    <section className="py-28" style={{ background: "#141412" }}>
      <div className="max-w-5xl mx-auto px-6 lg:px-12">
        <div className="text-center mb-20">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "#52B788" }}>Como funciona</p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-editorial text-4xl lg:text-5xl" style={{ color: "#E8E4D9" }}>
              Simples, rápido e <em className="not-italic text-gradient-green">seguro</em>
            </h2>
          </Reveal>
        </div>

        <StaggerContainer delay={0.12} className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map(({ n, title, desc }) => (
            <StaggerItem key={n} variant={fadeUp}>
              <div>
                <motion.div
                  className="font-editorial text-6xl font-bold mb-4 leading-none"
                  style={{ color: "rgba(82,183,136,0.15)" }}
                  whileInView={{ color: "rgba(82,183,136,0.25)" }}
                  transition={{ duration: 0.5 }}
                >
                  {n}
                </motion.div>
                <h3 className="text-base font-semibold mb-2" style={{ color: "#E8E4D9" }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#9A9688" }}>{desc}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

// ── Privacy Section ────────────────────────────────────
export function PrivacySection() {
  return (
    <section className="py-28" style={{ background: "#0D0D0B" }}>
      <div className="max-w-5xl mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center overflow-hidden">
          <Reveal variant={slideRight}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "#52B788" }}>Privacidade</p>
              <h2 className="font-editorial text-4xl leading-tight mb-6" style={{ color: "#E8E4D9" }}>
                Seus dados de saúde são{" "}
                <em className="not-italic text-gradient-green">seus</em>.
              </h2>
              <p className="leading-relaxed mb-8 text-sm" style={{ color: "#9A9688" }}>
                No HealthAxis, você tem controle total. Nunca vendemos, compartilhamos ou monetizamos seus dados de saúde.
              </p>
              <StaggerContainer delay={0.1}>
                {["Criptografia de ponta a ponta", "Dados não são vendidos a terceiros", "Você pode exportar ou deletar tudo", "Conformidade com LGPD"].map(item => (
                  <StaggerItem key={item} variant={fadeUp}>
                    <div className="flex items-center gap-3 mb-3">
                      <motion.div whileHover={{ scale: 1.2 }}>
                        <CheckCircle2 size={14} style={{ color: "#52B788", flexShrink: 0 }} />
                      </motion.div>
                      <span className="text-sm" style={{ color: "#9A9688" }}>{item}</span>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </Reveal>

          <Reveal variant={slideLeft} delay={0.15}>
            <HoverCard
              className="rounded-2xl p-6 relative overflow-hidden"
              style={{ background: "#141412", border: "1px solid rgba(82,183,136,0.12)" }}
            >
              <motion.div
                className="absolute top-0 right-0 w-40 h-40 blur-3xl pointer-events-none opacity-20"
                style={{ background: "radial-gradient(ellipse, rgba(82,183,136,0.4) 0%, transparent 70%)" }}
                animate={{ opacity: [0.15, 0.3, 0.15] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <ShieldCheck size={32} style={{ color: "#52B788", marginBottom: 16 }} />
              <h3 className="text-lg font-semibold mb-3" style={{ color: "#E8E4D9" }}>Aviso médico</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#9A9688" }}>
                O HealthAxis é uma plataforma de{" "}
                <strong style={{ color: "#E8E4D9" }}>organização de dados de saúde</strong>.
                Não realizamos diagnósticos, não prescrevemos medicamentos e não substituímos a consulta médica.
              </p>
              <ShimmerLine className="mt-5" />
            </HoverCard>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ── Final CTA ──────────────────────────────────────────
export function FinalCTA() {
  return (
    <section className="py-28 overflow-hidden" style={{ background: "#141412" }}>
      <div className="max-w-3xl mx-auto px-6 text-center relative">
        <ParallaxSection speed={0.15} className="absolute inset-0 pointer-events-none">
          <div className="w-full h-full blur-3xl scale-75 opacity-40"
            style={{ background: "radial-gradient(ellipse, rgba(82,183,136,0.22) 0%, transparent 70%)" }} />
        </ParallaxSection>

        <div className="relative z-10">
          <Reveal>
            <motion.div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-8"
              style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)" }}
              whileHover={{ rotate: 5, scale: 1.08 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Activity size={26} style={{ color: "#52B788" }} />
            </motion.div>
          </Reveal>

          <Reveal delay={0.1}>
            <h2 className="font-editorial text-4xl lg:text-5xl mb-6 leading-tight" style={{ color: "#E8E4D9" }}>
              Comece a cuidar da sua saúde{" "}
              <em className="not-italic text-gradient-green">hoje</em>.
            </h2>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="text-lg mb-12" style={{ color: "#9A9688" }}>
              Organize seus exames, acompanhe biomarcadores e chegue mais preparado à próxima consulta.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="flex flex-wrap gap-3 justify-center">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/dashboard"
                  className="group flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-semibold"
                  style={{ background: "#52B788", color: "#0D0D0B", boxShadow: "0 0 30px rgba(82,183,136,0.25)" }}
                >
                  Acessar o painel
                  <motion.span animate={{ x: [0, 3, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}>
                    <ArrowRight size={15} />
                  </motion.span>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/report"
                  className="flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-medium"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#9A9688" }}
                >
                  Ver relatório de exemplo
                </Link>
              </motion.div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
