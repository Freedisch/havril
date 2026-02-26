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
    {
      name: 'Claude',
      sub: 'via MCP Server',
      icon: '✦',
      status: 'Phase 1',
      ready: true,
    },
    {
      name: 'ChatGPT',
      sub: 'via Custom Action',
      icon: '◎',
      status: 'Phase 2',
      ready: false,
    },
    {
      name: 'Gemini',
      sub: 'via Browser Extension',
      icon: '◈',
      status: 'Phase 2',
      ready: false,
    },
    {
      name: 'Mistral',
      sub: 'via Browser Extension',
      icon: '◇',
      status: 'Phase 2',
      ready: false,
    },
    {
      name: 'LLaMA',
      sub: 'via REST API',
      icon: '◉',
      status: 'Phase 3',
      ready: false,
    },
    {
      name: 'Any Model',
      sub: 'via REST API',
      icon: '⊛',
      status: 'Open',
      ready: false,
    },
  ];

  return (
    <section
      id="integrations"
      className="py-32 px-8 md:px-12 max-w-6xl mx-auto"
    >
      <div className="flex items-center gap-4 mb-6">
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-amber">
          Integrations
        </span>
        <div className="flex-1 h-px bg-edge" />
      </div>

      <h2 className="font-display text-5xl md:text-6xl font-light text-cream mb-4 leading-tight">
        Your models.
        <br />
        <em className="italic text-mist font-light">All of them.</em>
      </h2>
      <p className="text-base text-mist mb-16 max-w-md font-light leading-relaxed">
        Havril integrates with every major model platform. Start with Claude on
        day one — more platforms ship with each phase.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-edge">
        {integrations.map((it) => (
          <div
            key={it.name}
            className={`bg-ink p-8 flex flex-col gap-4 hover:bg-ink2 transition-colors duration-300 ${
              !it.ready ? 'opacity-70' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <span
                className={`text-2xl ${it.ready ? 'text-amber' : 'text-fog'}`}
              >
                {it.icon}
              </span>
              <span
                className={`font-mono text-[9px] tracking-widest uppercase px-2 py-1 border ${
                  it.ready
                    ? 'border-amber/30 text-amber bg-amber/5'
                    : 'border-edge2 text-fog'
                }`}
              >
                {it.status}
              </span>
            </div>
            <div>
              <div className="font-display text-xl font-light text-cream">
                {it.name}
              </div>
              <div className="font-mono text-[10px] text-fog mt-1">
                {it.sub}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
