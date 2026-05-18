"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Zona de dados ──────────────────────────────────────────────────────── */
type Status = "optimal" | "attention" | "monitoring" | "none";

const zones: Record<string, { title: string; val: string; desc: string; status: Status }> = {
  brain:    { title: "Neurológico",        val: "Sem alterações",                      desc: "Nenhum biomarcador neurológico alterado. Histórico de sono e estresse acompanhado via anamnese.",                                        status: "optimal"    },
  thyroid:  { title: "Tireoide",           val: "TSH 2.1 · T4 1.2 ng/dL",             desc: "Função tireoidiana dentro dos parâmetros normais. Último exame: janeiro 2025.",                                                           status: "optimal"    },
  heart:    { title: "Cardiovascular",     val: "PA 118/76 · HDL 62 mg/dL",           desc: "Pressão arterial ótima. Avaliação cardiológica preventiva em março 2025. Sem alterações.",                                               status: "optimal"    },
  liver:    { title: "Lipídios / Fígado",  val: "LDL 118 mg/dL",                      desc: "LDL levemente acima do valor ótimo (<100 mg/dL). Triglicerídeos dentro do limite. Monitorar com dieta.",                                status: "attention"  },
  kidney:   { title: "Sistema Renal",      val: "Creatinina e ácido úrico normais",    desc: "Função renal preservada. Sem proteinúria. Hidratação adequada recomendada.",                                                             status: "optimal"    },
  glucose:  { title: "Glicemia / Pâncreas",val: "Glicemia 94 · HbA1c 5.4%",          desc: "Excelente controle glicêmico. HbA1c bem abaixo do limiar de pré-diabetes (5.7%). Histórico familiar: pai com DM2.",                     status: "optimal"    },
  bone:     { title: "Ósseo e Muscular",   val: "Vitamina D3 em suplementação",        desc: "Histórico familiar de osteoporose. Densitometria recomendada. Suplementando 2000 UI/dia de Vitamina D3.",                               status: "monitoring" },
  weight:   { title: "Composição Corporal",val: "IMC 22.9 · Peso 62.4 kg",            desc: "IMC dentro da faixa ideal (18.5–24.9). Queda de 2.8 kg nos últimos 7 meses.",                                                           status: "optimal"    },
};

const statusColor: Record<Status, string> = {
  optimal: "#4ADEAA", attention: "#FBB040", monitoring: "#A78BFA", none: "#6B7280",
};
const statusLabel: Record<Status, string> = {
  optimal: "Ótimo", attention: "Atenção", monitoring: "Monitorando", none: "Sem dados",
};

/* ─── Pontos de pulso com coordenadas (viewBox 0 0 200 480) ─────────────── */
const PULSE_POINTS: { id: string; cx: number; cy: number }[] = [
  { id: "brain",   cx: 100, cy: 26  },
  { id: "thyroid", cx: 100, cy: 76  },
  { id: "heart",   cx:  88, cy: 118 },
  { id: "liver",   cx: 112, cy: 148 },
  { id: "kidney",  cx: 100, cy: 182 },
  { id: "glucose", cx: 108, cy: 168 },
  { id: "weight",  cx: 100, cy: 228 },
  { id: "bone",    cx: 100, cy: 308 },
];

/* ─── Linhas guia (leader lines) ────────────────────────────────────────── */
const LEADERS = [
  { id: "brain",   x1:  94, y1:  26, x2: 68, y2:  26 },
  { id: "thyroid", x1:  94, y1:  76, x2: 68, y2:  76 },
  { id: "heart",   x1:  82, y1: 118, x2: 68, y2: 118 },
  { id: "liver",   x1: 118, y1: 148, x2: 132, y2: 148 },
  { id: "kidney",  x1:  94, y1: 182, x2: 68,  y2: 182 },
  { id: "glucose", x1: 114, y1: 168, x2: 132, y2: 168 },
  { id: "weight",  x1: 106, y1: 228, x2: 132, y2: 228 },
  { id: "bone",    x1: 106, y1: 308, x2: 132, y2: 308 },
];

/* ─── Componente: ponto pulsante hi-tech ────────────────────────────────── */
function PulseDot({ cx, cy, color, id, active, onClick }: {
  cx: number; cy: number; color: string; id: string; active: boolean; onClick: (id: string) => void;
}) {
  return (
    <g style={{ cursor: "pointer" }} onClick={() => onClick(id)}>
      {/* Anel externo pulsante */}
      <motion.circle cx={cx} cy={cy} r={5} fill="none" stroke={color} strokeWidth={1}
        animate={{ r: [5, 18], opacity: [0.6, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }} />
      <motion.circle cx={cx} cy={cy} r={5} fill="none" stroke={color} strokeWidth={0.8}
        animate={{ r: [5, 12], opacity: [0.4, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut", delay: 0.8 }} />

      {/* Círculo central */}
      <circle cx={cx} cy={cy} r={active ? 7 : 5}
        fill={active ? color : "rgba(10,20,40,0.8)"}
        stroke={color} strokeWidth={active ? 0 : 1.5}
        style={{ transition: "r 0.2s, fill 0.2s" }} />

      {/* Cross-hair no centro */}
      {!active && <>
        <line x1={cx - 2.5} y1={cy} x2={cx + 2.5} y2={cy} stroke={color} strokeWidth={0.8} />
        <line x1={cx} y1={cy - 2.5} x2={cx} y2={cy + 2.5} stroke={color} strokeWidth={0.8} />
      </>}
      {active && <circle cx={cx} cy={cy} r={2.5} fill="rgba(0,0,0,0.5)" />}
    </g>
  );
}

/* ─── Componente: card lateral ───────────────────────────────────────────── */
function ZoneCard({ id, active, side, onClick }: {
  id: string; active: boolean; side: "left" | "right"; onClick: (id: string) => void;
}) {
  const z = zones[id];
  const col = statusColor[z.status];
  return (
    <motion.button
      onClick={() => onClick(id)}
      whileHover={{ x: side === "left" ? -2 : 2, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.15 }}
      style={{
        width: 164,
        padding: "9px 12px",
        borderRadius: 10,
        background: active ? `${col}12` : "rgba(10,18,38,0.7)",
        border: `1px solid ${active ? col + "55" : "rgba(80,160,255,0.12)"}`,
        cursor: "pointer",
        textAlign: side === "left" ? "right" : "left",
        backdropFilter: "blur(8px)",
        transition: "border-color 0.2s, background 0.2s",
      }}
    >
      <p style={{ fontSize: 10, fontWeight: 600, color: "#94BFFF", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{z.title}</p>
      <p style={{ fontSize: 11, fontWeight: 700, color: col, lineHeight: 1.3 }}>{z.val.split("·")[0].trim()}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3, justifyContent: side === "left" ? "flex-end" : "flex-start" }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: col, flexShrink: 0 }} />
        <p style={{ fontSize: 10, color: col + "CC" }}>{statusLabel[z.status]}</p>
      </div>
    </motion.button>
  );
}

/* ─── SVG do corpo — silhueta wireframe/x-ray ────────────────────────────── */
function XRayFigure({ activeZone }: { activeZone: string | null }) {
  const bodyFill = "url(#bodyGrad)";
  const outlineColor = "rgba(100,180,255,0.4)";
  const skeletonColor = "rgba(140,210,255,0.22)";
  const strokeW = 1.4;

  return (
    <svg viewBox="0 0 200 480" width="180" height="432"
      style={{ overflow: "visible", filter: "drop-shadow(0 0 16px rgba(60,140,255,0.18))" }}>

      <defs>
        {/* Gradiente do corpo */}
        <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(60,120,220,0.18)" />
          <stop offset="50%"  stopColor="rgba(40,90,180,0.12)" />
          <stop offset="100%" stopColor="rgba(20,60,140,0.08)" />
        </linearGradient>

        {/* Gradiente de scan */}
        <linearGradient id="scanGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(0,200,255,0)" />
          <stop offset="50%"  stopColor="rgba(0,200,255,0.1)" />
          <stop offset="100%" stopColor="rgba(0,200,255,0)" />
        </linearGradient>

        {/* Glow filter para órgãos ativos */}
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>

        {/* Clip do corpo */}
        <clipPath id="bodyClip">
          <path d="
            M 100 5
            C 116 5 124 16 124 32 C 124 50 114 62 100 63
            C 86 62 76 50 76 32 C 76 16 84 5 100 5 Z
            M 96 63 C 88 64 76 68 66 76 L 54 80
            C 40 86 28 100 22 120 C 16 140 18 164 22 186
            C 26 206 30 222 32 238 C 33 246 34 252 34 260
            L 28 270 C 26 276 26 282 30 286 L 40 290 C 44 292 48 290 50 286 L 54 272
            L 58 262 C 60 252 62 240 64 228 C 66 212 68 192 70 170
            C 72 154 74 138 76 120 L 78 108
            L 80 212 C 80 228 80 244 78 258 L 74 282 C 70 296 68 316 68 338
            C 68 360 70 382 74 402 C 78 420 80 436 80 452 C 80 462 78 472 72 476
            L 60 478 C 52 480 44 478 40 474 L 38 470
            C 36 464 38 456 44 454 L 52 452
            C 58 450 62 444 64 436 C 68 420 70 400 68 378
            C 66 354 64 330 66 308 L 70 282
            C 72 268 74 252 76 238 L 80 220

            M 122 238 L 126 252 C 128 268 130 282 130 296
            C 134 320 132 346 130 372 C 128 396 128 418 132 438
            C 136 452 140 462 148 464 L 156 466
            C 160 468 162 474 160 478 L 158 482
            C 154 486 148 488 142 488 L 128 486
            C 122 484 116 480 116 472 C 116 462 112 450 110 434
            C 106 412 106 388 108 364 C 110 340 112 314 112 292
            L 112 264
            C 112 248 116 232 120 218
          " />
        </clipPath>
      </defs>

      {/* ── Linha de scan animada ── */}
      <motion.rect
        x={40} width={120} height={24} rx={2}
        fill="url(#scanGrad)"
        initial={{ y: 0 }}
        animate={{ y: [0, 480, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        opacity={0.7}
      />

      {/* ── CABEÇA ── */}
      <ellipse cx="100" cy="33" rx="25" ry="30" fill={bodyFill} stroke={outlineColor} strokeWidth={strokeW} />
      {/* Contorno craniano interno */}
      <ellipse cx="100" cy="30" rx="18" ry="22" fill="none" stroke={skeletonColor} strokeWidth={0.6} strokeDasharray="2,3" />
      {/* Olhos — sockets */}
      <ellipse cx="91"  cy="28" rx="5.5" ry="4.5" fill="none" stroke="rgba(120,200,255,0.3)" strokeWidth={0.8} />
      <ellipse cx="109" cy="28" rx="5.5" ry="4.5" fill="none" stroke="rgba(120,200,255,0.3)" strokeWidth={0.8} />
      {/* Pontos pupila */}
      <circle cx="91"  cy="28" r={1.5} fill="rgba(80,180,255,0.5)" />
      <circle cx="109" cy="28" r={1.5} fill="rgba(80,180,255,0.5)" />
      {/* Nariz */}
      <path d="M 97 34 L 95 42 Q 100 44 105 42 L 103 34" fill="none" stroke={skeletonColor} strokeWidth={0.7} />
      {/* Mandíbula */}
      <path d="M 76 42 Q 78 58 100 62 Q 122 58 124 42" fill="none" stroke={outlineColor} strokeWidth={0.9} />

      {/* ── PESCOÇO ── */}
      <path d="M 91 62 L 88 80 L 112 80 L 109 62 Z" fill={bodyFill} stroke={outlineColor} strokeWidth={strokeW} />
      {/* Vértebras cervicais */}
      {[66,70,74,78].map(y => (
        <rect key={y} x={96} y={y} width={8} height={3} rx={1} fill="none" stroke={skeletonColor} strokeWidth={0.6} />
      ))}

      {/* ── CLAVÍCULAS ── */}
      <path d="M 88 82 Q 72 82 56 92" fill="none" stroke="rgba(120,200,255,0.35)" strokeWidth={1.2} strokeLinecap="round" />
      <path d="M 112 82 Q 128 82 144 92" fill="none" stroke="rgba(120,200,255,0.35)" strokeWidth={1.2} strokeLinecap="round" />

      {/* ── TRONCO (torso) ── */}
      <path d="M 56 92 C 48 96 42 106 40 120 L 38 150 C 36 170 36 192 38 212 L 42 240 L 68 250 L 76 268 L 124 268 L 132 250 L 158 240 L 162 212 C 164 192 164 170 162 150 L 160 120 C 158 106 152 96 144 92 Z"
        fill={bodyFill} stroke={outlineColor} strokeWidth={strokeW} />

      {/* ── COSTELAS ── */}
      {[108, 118, 128, 138, 148, 158].map((y, i) => {
        const rx = 26 - i * 1.5;
        const ry = 7 - i * 0.4;
        return (
          <g key={y}>
            <path d={`M 100 ${y} Q ${100 - rx} ${y + ry} ${100 - rx - 4} ${y}`}
              fill="none" stroke={skeletonColor} strokeWidth={0.7} strokeLinecap="round" />
            <path d={`M 100 ${y} Q ${100 + rx} ${y + ry} ${100 + rx + 4} ${y}`}
              fill="none" stroke={skeletonColor} strokeWidth={0.7} strokeLinecap="round" />
          </g>
        );
      })}

      {/* ── ESTERNO ── */}
      <rect x={96} y={96} width={8} height={72} rx={3} fill="none" stroke="rgba(120,200,255,0.25)" strokeWidth={0.8} />

      {/* ── COLUNA ── */}
      {Array.from({ length: 18 }, (_, i) => 96 + i * 9).map(y => (
        <rect key={y} x={97} y={y} width={6} height={6} rx={1} fill="none" stroke={skeletonColor} strokeWidth={0.55} />
      ))}

      {/* ── BACIA/PELVE ── */}
      <path d="M 68 250 C 60 256 56 270 62 282 Q 70 296 100 298 Q 130 296 138 282 C 144 270 140 256 132 250 Z"
        fill={bodyFill} stroke={outlineColor} strokeWidth={strokeW} />
      <path d="M 72 260 Q 100 278 128 260" fill="none" stroke={skeletonColor} strokeWidth={0.8} />

      {/* ── BRAÇO ESQUERDO ── */}
      <path d="M 40 120 C 34 130 26 148 22 174 C 18 200 20 224 26 248 L 32 268 C 34 274 38 276 42 274 C 46 272 48 268 46 262 L 42 244 C 38 222 36 198 38 176 C 40 156 44 138 50 126 Z"
        fill={bodyFill} stroke={outlineColor} strokeWidth={strokeW} />
      {/* Úmero */}
      <line x1={40} y1={124} x2={34} y2={196} stroke={skeletonColor} strokeWidth={1} strokeLinecap="round" />
      {/* Rádio/Ulna */}
      <line x1={34} y1={200} x2={30} y2={250} stroke={skeletonColor} strokeWidth={0.8} strokeLinecap="round" />
      <line x1={36} y1={200} x2={34} y2={250} stroke={skeletonColor} strokeWidth={0.6} strokeLinecap="round" />
      {/* Mão */}
      <ellipse cx={37} cy={268} rx={8} ry={6} fill={bodyFill} stroke={outlineColor} strokeWidth={strokeW} />

      {/* ── BRAÇO DIREITO ── */}
      <path d="M 160 120 C 166 130 174 148 178 174 C 182 200 180 224 174 248 L 168 268 C 166 274 162 276 158 274 C 154 272 152 268 154 262 L 158 244 C 162 222 164 198 162 176 C 160 156 156 138 150 126 Z"
        fill={bodyFill} stroke={outlineColor} strokeWidth={strokeW} />
      <line x1={160} y1={124} x2={166} y2={196} stroke={skeletonColor} strokeWidth={1} strokeLinecap="round" />
      <line x1={166} y1={200} x2={170} y2={250} stroke={skeletonColor} strokeWidth={0.8} strokeLinecap="round" />
      <line x1={164} y1={200} x2={166} y2={250} stroke={skeletonColor} strokeWidth={0.6} strokeLinecap="round" />
      <ellipse cx={163} cy={268} rx={8} ry={6} fill={bodyFill} stroke={outlineColor} strokeWidth={strokeW} />

      {/* ── PERNA ESQUERDA ── */}
      <path d="M 68 268 L 62 280 C 58 296 56 320 58 348 C 60 372 62 394 62 418 C 62 434 60 448 56 460 C 52 468 50 474 54 478 L 72 480 C 76 480 80 476 80 470 C 80 454 80 432 80 410 C 80 388 78 362 78 338 C 78 314 80 296 84 282 L 86 268 Z"
        fill={bodyFill} stroke={outlineColor} strokeWidth={strokeW} />
      {/* Fêmur */}
      <line x1={74} y1={280} x2={72} y2={368} stroke={skeletonColor} strokeWidth={1.1} strokeLinecap="round" />
      {/* Tíbia */}
      <line x1={72} y1={372} x2={68} y2={462} stroke={skeletonColor} strokeWidth={0.9} strokeLinecap="round" />
      {/* Joelho */}
      <ellipse cx={72} cy={372} rx={7} ry={6} fill="none" stroke="rgba(120,200,255,0.25)" strokeWidth={0.8} />
      {/* Pé */}
      <path d="M 54 478 Q 48 482 46 488 L 80 488 L 80 480 Z" fill={bodyFill} stroke={outlineColor} strokeWidth={strokeW} />

      {/* ── PERNA DIREITA ── */}
      <path d="M 132 268 L 138 280 C 142 296 144 320 142 348 C 140 372 138 394 138 418 C 138 434 140 448 144 460 C 148 468 150 474 146 478 L 128 480 C 124 480 120 476 120 470 C 120 454 120 432 120 410 C 120 388 122 362 122 338 C 122 314 120 296 116 282 L 114 268 Z"
        fill={bodyFill} stroke={outlineColor} strokeWidth={strokeW} />
      <line x1={126} y1={280} x2={128} y2={368} stroke={skeletonColor} strokeWidth={1.1} strokeLinecap="round" />
      <line x1={128} y1={372} x2={132} y2={462} stroke={skeletonColor} strokeWidth={0.9} strokeLinecap="round" />
      <ellipse cx={128} cy={372} rx={7} ry={6} fill="none" stroke="rgba(120,200,255,0.25)" strokeWidth={0.8} />
      <path d="M 146 478 Q 152 482 154 488 L 120 488 L 120 480 Z" fill={bodyFill} stroke={outlineColor} strokeWidth={strokeW} />

      {/* ── Linhas guia para os pontos ── */}
      {LEADERS.map(l => {
        const z = zones[PULSE_POINTS.find(p => p.id === l.id)!.id];
        return (
          <line key={l.id}
            x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke={statusColor[z.status]}
            strokeWidth={0.7}
            strokeDasharray="3,3"
            opacity={0.4}
          />
        );
      })}

    </svg>
  );
}

/* ─── Componente principal ───────────────────────────────────────────────── */
export function BodyMap() {
  const [active, setActive] = useState<string | null>(null);
  const z = active ? zones[active] : null;

  const leftZones  = ["brain", "thyroid", "heart", "liver", "kidney"];
  const rightZones = ["glucose", "weight", "bone"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Legenda */}
      <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
        {(Object.entries(statusColor) as [Status, string][]).map(([s, c]) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: c, boxShadow: `0 0 6px ${c}88` }} />
            <span style={{ fontSize: 11, color: "#6B8FC0", fontWeight: 500 }}>{statusLabel[s]}</span>
          </div>
        ))}
      </div>

      {/* Layout principal */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 200px 1fr", gap: 12, alignItems: "center" }}>

        {/* Cards esquerda */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          {leftZones.map(id => (
            <ZoneCard key={id} id={id} active={active === id} side="left" onClick={setActive} />
          ))}
        </div>

        {/* Figura SVG + pontos */}
        <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
          <XRayFigure activeZone={active} />

          {/* SVG overlay para pontos pulsantes (mesmo viewBox, sobre a figura) */}
          <svg viewBox="0 0 200 480" width="180" height="432"
            style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", overflow: "visible" }}>
            {PULSE_POINTS.map(p => (
              <PulseDot
                key={p.id}
                cx={p.cx} cy={p.cy}
                color={statusColor[zones[p.id].status]}
                id={p.id}
                active={active === p.id}
                onClick={setActive}
              />
            ))}
          </svg>
        </div>

        {/* Cards direita */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
          {rightZones.map(id => (
            <ZoneCard key={id} id={id} active={active === id} side="right" onClick={setActive} />
          ))}
        </div>
      </div>

      {/* Painel de informação */}
      <AnimatePresence mode="wait">
        {z ? (
          <motion.div key={active}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
            style={{
              padding: "16px 24px", borderRadius: 14,
              background: `linear-gradient(135deg, rgba(10,22,50,0.95) 0%, rgba(8,16,38,0.95) 100%)`,
              border: `1px solid ${statusColor[z.status]}30`,
              boxShadow: `0 0 24px ${statusColor[z.status]}12`,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center"
            }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor[z.status], boxShadow: `0 0 8px ${statusColor[z.status]}` }} />
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: statusColor[z.status] }}>{z.title}</p>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor[z.status], boxShadow: `0 0 8px ${statusColor[z.status]}` }} />
            </div>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#E8F4FF" }}>{z.val}</p>
            <p style={{ fontSize: 12, color: "#6B8FC0", lineHeight: 1.7, maxWidth: 520 }}>{z.desc}</p>
            <div style={{ marginTop: 4, padding: "3px 12px", borderRadius: 20, background: `${statusColor[z.status]}15`, border: `1px solid ${statusColor[z.status]}30` }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: statusColor[z.status], textTransform: "uppercase", letterSpacing: "0.08em" }}>{statusLabel[z.status]}</span>
            </div>
          </motion.div>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{
              padding: "16px 24px", borderRadius: 14, textAlign: "center",
              background: "rgba(10,18,40,0.6)",
              border: "1px solid rgba(80,140,255,0.12)"
            }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#94BFFF", marginBottom: 4 }}>Selecione uma área para analisar</p>
            <p style={{ fontSize: 11, color: "#4A6A9A" }}>Clique nos pontos interativos ou nos cards laterais para visualizar cada biomarcador monitorado.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
