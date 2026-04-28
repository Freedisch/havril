'use client';
import { FC, useEffect, useState } from 'react';
import { useTypewriter } from '../utils/customState';

export const Hero: FC = () => {
  const memories = [
    '"User is building a Go REST API"',
    '"User prefers minimal dependencies"',
    '"User is based in Kigali, Rwanda"',
    '"User uses Chi router + PostgreSQL"',
  ];
  const typed = useTypewriter(memories, 44, 2600);

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 md:px-12 pt-28 pb-20 bg-ink relative overflow-hidden">
      <div className="absolute inset-0 grid-bg" />

      {/* Badge */}
      <div className="relative z-10 flex items-center gap-2 border border-edge bg-ink2/80 px-4 py-1.5 mb-10 rounded-full animate-fade-up delay-0">
        <span className="w-1.5 h-1.5 rounded-full bg-amber animate-blink" />
        <span className="font-mono text-[10px] tracking-widest uppercase text-fog">
          Now in development
        </span>
      </div>

      {/* Headline */}
      <h1
        className="relative z-10 font-display text-center font-normal leading-[1.05] text-cream animate-fade-up delay-100 max-w-3xl"
        style={{ fontSize: 'clamp(48px, 7vw, 96px)' }}
      >
        One memory.
        <br />
        <span className="text-amber">Every model.</span>
      </h1>

      {/* Sub */}
      <p className="relative z-10 mt-7 text-center text-mist font-body font-light leading-relaxed max-w-md text-[15px] md:text-base animate-fade-up delay-200">
        Chat on Claude. Switch to ChatGPT. Open Gemini.
        <br />
        Your context follows — silently, automatically.
      </p>

      {/* CTAs */}
      <div className="relative z-10 mt-9 flex flex-col sm:flex-row items-center gap-4 animate-fade-up delay-300">
        <a
          href="#get-access"
          className="bg-amber text-white px-7 py-3 text-[12px] tracking-widest uppercase font-medium rounded-sm hover:bg-amber/90 transition-colors"
        >
          Get early access
        </a>
        <a
          href="#how-it-works"
          className="text-[12px] tracking-widest uppercase text-fog hover:text-mist transition-colors"
        >
          See how it works
        </a>
      </div>

      {/* Live memory pill */}
      <div className="relative z-10 mt-10 border border-edge bg-ink2/60 px-5 py-2.5 flex items-center gap-3 max-w-full animate-fade-up delay-400 rounded-sm">
        <span className="font-mono text-[9px] tracking-widest uppercase text-fog shrink-0">
          Live memory
        </span>
        <span className="w-px h-3.5 bg-edge2 shrink-0" />
        <span className="font-mono text-[11px] text-amber min-w-0">
          {typed}
          <span className="border-r-2 border-amber animate-blink">&nbsp;</span>
        </span>
      </div>

      {/* Hub diagram */}
      <div className="relative z-10 mt-16 w-full max-w-xl animate-fade-up delay-500">
        <HubDiagram />
      </div>
    </section>
  );
};

/* ─── Model-hub connection diagram ─────────────────────────────────── */
const HubDiagram: FC = () => {
  const [activeModel, setActiveModel] = useState(0);

  const models = [
    { label: 'Claude', icon: '✦', cx: 60 },
    { label: 'ChatGPT', icon: '◎', cx: 180 },
    { label: 'Gemini', icon: '◈', cx: 300 },
    { label: 'Mistral', icon: '◇', cx: 420 },
  ];

  const hubCx = 240;
  const hubCy = 155;
  const modelY = 28;

  useEffect(() => {
    const t = setInterval(
      () => setActiveModel((i) => (i + 1) % models.length),
      1400,
    );
    return () => clearInterval(t);
  }, [models.length]);

  return (
    <svg
      viewBox="0 0 480 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Lines */}
      {models.map((m, i) => (
        <line
          key={m.label}
          x1={m.cx + 40}
          y1={modelY + 18}
          x2={hubCx}
          y2={hubCy - 26}
          stroke={activeModel === i ? '#09090b' : '#e4e4e7'}
          strokeWidth={activeModel === i ? '1.5' : '1'}
          strokeDasharray="5 4"
          style={{ transition: 'stroke 0.4s ease' }}
        />
      ))}

      {/* Hub circle */}
      <circle cx={hubCx} cy={hubCy} r={26} fill="#09090b" />
      <text
        x={hubCx}
        y={hubCy - 3}
        textAnchor="middle"
        fill="white"
        fontSize="7"
        fontFamily="JetBrains Mono, monospace"
        letterSpacing="1.5"
        fontWeight="600"
      >
        HAVRIL
      </text>
      <text
        x={hubCx}
        y={hubCy + 8}
        textAnchor="middle"
        fill="white"
        fontSize="6"
        fontFamily="JetBrains Mono, monospace"
        letterSpacing="1"
        opacity="0.6"
      >
        memory
      </text>

      {/* Model boxes */}
      {models.map((m, i) => (
        <g key={m.label}>
          <rect
            x={m.cx}
            y={modelY - 4}
            width={80}
            height={32}
            rx="4"
            fill={activeModel === i ? '#f4f4f5' : '#ffffff'}
            stroke={activeModel === i ? '#09090b' : '#e4e4e7'}
            strokeWidth="1"
            style={{ transition: 'all 0.3s ease' }}
          />
          <text
            x={m.cx + 40}
            y={modelY + 10}
            textAnchor="middle"
            fill={activeModel === i ? '#09090b' : '#a1a1aa'}
            fontSize="10"
            fontFamily="Sora, system-ui, sans-serif"
            fontWeight="500"
            style={{ transition: 'fill 0.3s ease' }}
          >
            {m.icon}
          </text>
          <text
            x={m.cx + 40}
            y={modelY + 22}
            textAnchor="middle"
            fill={activeModel === i ? '#09090b' : '#a1a1aa'}
            fontSize="8"
            fontFamily="Sora, system-ui, sans-serif"
            style={{ transition: 'fill 0.3s ease' }}
          >
            {m.label}
          </text>
        </g>
      ))}
    </svg>
  );
};
