import { FC, useEffect, useState } from 'react';
import { useTypewriter } from '../utils/customState';

interface ModelNode {
  label: string;
  icon: string;
  delay: string;
}

export const Hero: FC = () => {
  const memories: string[] = [
    '"User is building a Go REST API"',
    '"User prefers minimal dependencies"',
    '"User is based in Kigali, Rwanda"',
    '"User uses Chi router + PostgreSQL"',
    '"User is working on MemoAI itself"',
  ];

  const typed = useTypewriter(memories, 42, 2400);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-8 md:px-12 pt-24 pb-16 overflow-hidden noise">
      <div
        className="absolute inset-0 grid-bg"
        style={{
          maskImage:
            'radial-gradient(ellipse 80% 70% at 50% 50%, black 0%, transparent 100%)',
        }}
      />
      <div className="absolute inset-0 amber-glow animate-glow-pulse" />

      {/* Badge */}
      <div className="relative z-10 flex items-center gap-2.5 border border-edge2 bg-amber/5 px-4 py-2 mb-10 animate-fade-up delay-0">
        <span className="w-1.5 h-1.5 rounded-full bg-amber animate-blink" />
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-amber">
          Memory-as-a-Service · Now in development
        </span>
      </div>

      {/* Headline */}
      <h1
        className="relative z-10 font-display text-center font-light leading-[0.95] text-cream animate-fade-up delay-100 max-w-5xl"
        style={{ fontSize: 'clamp(52px, 8vw, 110px)' }}
      >
        One memory.
        <br />
        <em className="italic text-gradient font-light">Every model.</em>
      </h1>

      {/* Subheading */}
      <p className="relative z-10 text-center text-mist font-light leading-relaxed mt-8 mb-10 max-w-lg text-base md:text-lg animate-fade-up delay-200">
        Chat on Claude. Switch to ChatGPT. Open Gemini.
        <br />
        Your context follows — no setup, no repeating yourself.
      </p>

      {/* Typewriter pill */}
      <div className="relative z-10 border border-edge2 bg-ink2 px-5 py-3 mb-10 flex items-center gap-3 max-w-full animate-fade-up delay-300">
        <span className="font-mono text-[9px] tracking-widest uppercase text-fog shrink-0">
          Live memory
        </span>
        <span className="w-px h-4 bg-edge2 shrink-0" />
        <span className="font-mono text-xs text-amber min-w-0">
          {typed}
          <span className="border-r-2 border-amber animate-blink">&nbsp;</span>
        </span>
      </div>

      {/* CTAs */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 animate-fade-up delay-400">
        <a
          href="#"
          className="bg-amber text-ink px-8 py-3.5 text-[11px] tracking-widest uppercase font-medium hover:bg-amber/90 transition-all duration-200 hover:-translate-y-px"
        >
          Get early access
        </a>
        <a
          href="#how-it-works"
          className="border border-edge2 text-mist px-8 py-3.5 text-[11px] tracking-widest uppercase hover:border-edge3 hover:text-cream transition-all duration-200"
        >
          See how it works
        </a>
      </div>

      {/* Flow diagram */}
      <div className="relative z-10 w-full animate-fade-up delay-500">
        <MemoryFlow />
      </div>
    </section>
  );
};

const MemoryFlow: FC = () => {
  const models: ModelNode[] = [
    { label: 'Claude', icon: '✦', delay: '0s' },
    { label: 'ChatGPT', icon: '◎', delay: '0.4s' },
    { label: 'Gemini', icon: '◈', delay: '0.8s' },
    { label: 'Mistral', icon: '◇', delay: '1.2s' },
  ];

  const memories: string[] = [
    'User prefers Go for backend',
    'Working on REST API',
    'Based in Kigali, Rwanda',
    'Building AI memory service',
  ];

  const [activeMemory, setActiveMemory] = useState<number>(0);
  const [activePill, setActivePill] = useState<number>(0);

  useEffect(() => {
    const t = setInterval(
      () => setActiveMemory((i) => (i + 1) % memories.length),
      2000,
    );
    return () => clearInterval(t);
  }, [memories.length]);

  useEffect(() => {
    const t = setInterval(
      () => setActivePill((i) => (i + 1) % models.length),
      1600,
    );
    return () => clearInterval(t);
  }, [models.length]);

  return (
    <div className="relative w-full max-w-3xl mx-auto mt-20 select-none">
      {/* Core */}
      <div className="flex items-center justify-center mb-2">
        <div className="relative">
          <div
            className="absolute inset-0 rounded-full border border-amber/10 animate-ping"
            style={{ animationDuration: '3s' }}
          />
          <div className="absolute -inset-3 rounded-full border border-amber/6" />
          <div className="absolute -inset-6 rounded-full border border-amber/3" />
          <div className="relative w-20 h-20 rounded-full bg-ink2 border border-amber/30 flex flex-col items-center justify-center gap-0.5 animate-glow-pulse">
            <span className="text-amber text-lg">◉</span>
            <span className="font-mono text-[9px] text-amber/70 tracking-widest uppercase">
              memory
            </span>
          </div>
        </div>
      </div>

      {/* Live memory pill */}
      <div className="flex justify-center mb-10">
        <div
          key={activeMemory}
          className="border border-amber/20 bg-amber/5 px-4 py-1.5 font-mono text-[10px] text-amber tracking-wide animate-fade-in"
        >
          &quot;{memories[activeMemory]}&quot;
        </div>
      </div>

      {/* Model nodes */}
      <div className="grid grid-cols-4 gap-4">
        {models.map((m, i) => (
          <div
            key={m.label}
            className="flex flex-col items-center gap-3"
            style={{ animationDelay: m.delay }}
          >
            <div className="w-px h-8 bg-gradient-to-b from-edge2 to-transparent" />
            <div
              className={`relative w-14 h-14 border flex items-center justify-center transition-all duration-500 ${
                activePill === i
                  ? 'border-amber/50 bg-amber/8 shadow-[0_0_20px_rgba(232,160,64,0.12)]'
                  : 'border-edge2 bg-ink2'
              }`}
            >
              <span
                className={`text-xl transition-colors duration-500 ${
                  activePill === i ? 'text-amber' : 'text-fog'
                }`}
              >
                {m.icon}
              </span>
              {activePill === i && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber rounded-full animate-blink" />
              )}
            </div>
            <span className="font-mono text-[10px] tracking-widest uppercase text-fog">
              {m.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
