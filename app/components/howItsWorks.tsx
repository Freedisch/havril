import { FC } from 'react';

interface Step {
  n: string;
  title: string;
  body: string;
  note: string;
}

export const HowItWorks: FC = () => {
  const steps: Step[] = [
    {
      n: '01',
      title: 'Connect your models',
      body: 'Add Havril to Claude via MCP, to ChatGPT as a Custom Action. One token. Two minutes. No API keys shared.',
      note: 'Works natively as a Claude tool',
    },
    {
      n: '02',
      title: 'Chat normally',
      body: 'Keep using Claude.ai, ChatGPT.com, Gemini — exactly as you do today. Nothing changes on your end.',
      note: 'Havril is completely silent',
    },
    {
      n: '03',
      title: 'Memory builds itself',
      body: "After each conversation, Havril's engine extracts what matters and stores it. The model fetches it next time.",
      note: 'Dedup, scoring & contradiction resolution included',
    },
  ];

  return (
    <section id="how-it-works" className="py-28 px-6 md:px-12 max-w-5xl mx-auto">
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-fog mb-12">
        How it works
      </p>

      <div className="grid md:grid-cols-3 gap-0 border border-edge">
        {steps.map((s, i) => (
          <div
            key={s.n}
            className={`p-9 group hover:bg-ink3 transition-colors duration-200 ${
              i < steps.length - 1 ? 'border-b md:border-b-0 md:border-r border-edge' : ''
            }`}
          >
            <div
              className="font-display text-[72px] font-normal leading-none text-edge2 mb-6 select-none group-hover:text-edge3 transition-colors duration-300"
            >
              {s.n}
            </div>
            <h3 className="font-display text-xl font-normal text-cream mb-3 leading-snug">
              {s.title}
            </h3>
            <p className="text-[13px] text-mist leading-relaxed mb-5 font-body">
              {s.body}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-amber text-[10px]">◈</span>
              <span className="font-mono text-[10px] text-fog">{s.note}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
