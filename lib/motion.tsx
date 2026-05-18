"use client";
import { motion, useScroll, useTransform, useSpring, useInView, Variants } from "framer-motion";
import { useRef } from "react";

// ── Shared easing ──────────────────────────────────────
export const ease = {
  out: [0.16, 1, 0.3, 1] as [number, number, number, number],
  in: [0.7, 0, 0.84, 0] as [number, number, number, number],
  inOut: [0.83, 0, 0.17, 1] as [number, number, number, number],
};

// ── Shared variants ────────────────────────────────────
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: ease.out } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5, ease: ease.out } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: ease.out } },
};

export const slideLeft: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: ease.out } },
};

export const slideRight: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: ease.out } },
};

// Stagger container — children animate in sequence
export const stagger = (delay = 0.08): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: delay, delayChildren: 0.1 } },
});

// ── Page transition wrapper ────────────────────────────
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.45, ease: ease.out }}
    >
      {children}
    </motion.div>
  );
}

// ── Reveal on scroll (replaces CSS .reveal) ───────────
interface RevealProps {
  children: React.ReactNode;
  variant?: Variants;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
  once?: boolean;
}

export function Reveal({
  children,
  variant = fadeUp,
  delay = 0,
  className,
  style,
  once = true,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, margin: "0px 0px -60px 0px" });

  return (
    <motion.div
      ref={ref}
      variants={variant}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      transition={{ delay }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// ── Stagger container ──────────────────────────────────
interface StaggerContainerProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function StaggerContainer({ children, delay = 0.08, className, style }: StaggerContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -60px 0px" });

  return (
    <motion.div
      ref={ref}
      variants={stagger(delay)}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// Stagger item — use inside StaggerContainer
export function StaggerItem({
  children,
  variant = fadeUp,
  className,
  style,
}: {
  children: React.ReactNode;
  variant?: Variants;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div variants={variant} className={className} style={style}>
      {children}
    </motion.div>
  );
}

// ── Parallax wrapper ───────────────────────────────────
export function ParallaxSection({
  children,
  speed = 0.3,
  className,
  style,
}: {
  children: React.ReactNode;
  speed?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`${speed * -80}px`, `${speed * 80}px`]);
  const smoothY = useSpring(y, { stiffness: 80, damping: 20 });

  return (
    <div ref={ref} className={className} style={{ overflow: "hidden", ...style }}>
      <motion.div style={{ y: smoothY }}>{children}</motion.div>
    </div>
  );
}

// ── Hover card ─────────────────────────────────────────
export function HoverCard({
  children,
  className,
  style,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: ease.out }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

// ── Animated number ────────────────────────────────────
export function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const spring = useSpring(0, { stiffness: 60, damping: 18 });

  // Trigger count-up on inView
  if (inView) spring.set(value);

  return (
    <motion.span ref={ref}>
      <motion.span>
        {inView ? (
          <CountUp to={value} suffix={suffix} />
        ) : (
          <>0{suffix}</>
        )}
      </motion.span>
    </motion.span>
  );
}

function CountUp({ to, suffix }: { to: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const val = useSpring(0, { stiffness: 50, damping: 16 });

  if (typeof window !== "undefined" && inView) val.set(to);

  return (
    <motion.span ref={ref}>
      {inView ? <AnimCount to={to} suffix={suffix} /> : <>0{suffix}</>}
    </motion.span>
  );
}

function AnimCount({ to, suffix }: { to: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const spring = useSpring(0, { stiffness: 50, damping: 16 });

  if (inView) spring.set(to);

  return (
    <span ref={ref}>
      <motion.span>{spring as unknown as React.ReactNode}</motion.span>
      {suffix}
    </span>
  );
}

// ── Floating blob (replaces CSS animation) ─────────────
export function FloatingBlob({
  style,
  className,
  duration = 12,
  reverse = false,
}: {
  style?: React.CSSProperties;
  className?: string;
  duration?: number;
  reverse?: boolean;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      animate={{
        x: reverse ? [-20, 30, -20] : [30, -20, 30],
        y: reverse ? [15, -20, 15] : [-20, 15, -20],
        scale: [1, 1.05, 0.97, 1],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

// ── Shimmer border line ────────────────────────────────
export function ShimmerLine({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden h-px w-full ${className}`}
      style={{ background: "rgba(255,255,255,0.06)" }}>
      <motion.div
        className="absolute inset-y-0 w-1/3"
        style={{ background: "linear-gradient(90deg, transparent, rgba(82,183,136,0.5), transparent)" }}
        animate={{ x: ["-100%", "400%"] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
      />
    </div>
  );
}

// ── Typewriter text ────────────────────────────────────
export function TypewriterText({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <motion.span
      initial={{ width: 0, overflow: "hidden", display: "inline-block", whiteSpace: "nowrap" }}
      animate={{ width: "100%" }}
      transition={{ duration: text.length * 0.04, ease: "linear", delay }}
    >
      {text}
    </motion.span>
  );
}

// ── Magnetic button effect ─────────────────────────────
export function MagneticButton({
  children,
  className,
  style,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  return (
    <motion.button
      className={className}
      style={style}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}

// ── Progress bar animated ──────────────────────────────
export function AnimatedProgressBar({
  value,
  color = "#52B788",
  delay = 0,
}: {
  value: number;
  color?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  return (
    <div ref={ref} className="h-1.5 w-full rounded-full overflow-hidden"
      style={{ background: "rgba(255,255,255,0.06)" }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={inView ? { width: `${value}%` } : { width: 0 }}
        transition={{ duration: 1, ease: ease.out, delay }}
      />
    </div>
  );
}
