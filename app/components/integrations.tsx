import { FC } from 'react';

interface Integration {
  name: string;
  sub: string;
  icon: string;
  status: string;
  ready: boolean;
}

export const Integrations: FC = () => {
  const integrations: Integration[] = [
    { name: 'Claude',    sub: 'via MCP Server',        icon: '✦', status: 'Phase 1', ready: true  },
    { name: 'ChatGPT',  sub: 'via Custom Action',      icon: '◎', status: 'Phase 2', ready: false },
    { name: 'Gemini',   sub: 'via Browser Extension',  icon: '◈', status: 'Phase 2', ready: false },
    { name: 'Mistral',  sub: 'via Browser Extension',  icon: '◇', status: 'Phase 2', ready: false },
    { name: 'LLaMA',    sub: 'via REST API',            icon: '◉', status: 'Phase 3', ready: false },
    { name: 'Any model',sub: 'via REST API',            icon: '⊛', status: 'Open',    ready: false },
  ];

  return (
    <section id="integrations" className="py-28 px-6 md:px-12 max-w-5xl mx-auto">
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-fog mb-5">
        Integrations
      </p>
      <h2 className="font-display text-[clamp(28px,4vw,46px)] font-normal text-cream mb-3 leading-[1.1]">
        Your models.
        <br />
        <span className="text-mist font-light italic">All of them.</span>
      </h2>
      <p className="text-[14px] text-mist mb-14 max-w-sm font-body leading-relaxed">
        Start with Claude on day one. More platforms ship with each phase.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-edge">
        {integrations.map((it) => (
          <div
            key={it.name}
            className={`bg-ink p-7 flex flex-col gap-4 hover:bg-ink3 transition-colors duration-300 ${
              !it.ready ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <span className={`text-xl ${it.ready ? 'text-amber' : 'text-fog'}`}>
                {it.icon}
              </span>
              <span className={`font-mono text-[9px] tracking-widest uppercase px-2 py-0.5 border ${
                it.ready
                  ? 'border-amber/30 text-amber bg-amber/5'
                  : 'border-edge2 text-fog'
              }`}>
                {it.status}
              </span>
            </div>
            <div>
              <div className="font-display text-lg font-normal text-cream">{it.name}</div>
              <div className="font-mono text-[10px] text-fog mt-1">{it.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
