import { FC } from 'react';

interface Step {
  n: string;
  title: string;
  body: string;
  detail: string;
}

export const HowItWorks: FC = () => {
  const steps: Step[] = [
    {
      n: '01',
      title: 'Connect your models',
      body: 'Sign up and add MemoAI to Claude via MCP, to ChatGPT as a Custom Action. One token. Two minutes.',
      detail: 'No API keys stored. No credentials shared.',
    },
    {
      n: '02',
      title: 'Chat normally',
      body: 'Use Claude.ai, ChatGPT.com, Gemini — exactly as you always have. Nothing changes on your end.',
      detail: 'MemoAI works silently in the background.',
    },
    {
      n: '03',
      title: 'Memory builds itself',
      body: "After each conversation, MemoAI's engine distills what matters and stores it. The model fetches it next time.",
      detail: 'Dedup, scoring & contradiction resolution included.',
    },
  ];

  return (
    <section
      id="how-it-works"
      className="py-32 px-8 md:px-12 max-w-6xl mx-auto"
    >
      <div className="flex items-center gap-4 mb-16">
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-amber">
          How it works
        </span>
        <div className="flex-1 h-px bg-edge" />
      </div>

      <div className="grid md:grid-cols-3 gap-0 border border-edge">
        {steps.map((s, i) => (
          <div
            key={s.n}
            className={`p-10 shimmer group hover:bg-ink2 transition-colors duration-300 ${
              i < steps.length - 1
                ? 'border-b md:border-b-0 md:border-r border-edge'
                : ''
            }`}
          >
            <div className="font-display text-[80px] font-light leading-none text-edge2 mb-6 select-none group-hover:text-edge3 transition-colors duration-300">
              {s.n}
            </div>
            <h3 className="font-display text-2xl font-light text-cream mb-3 leading-tight">
              {s.title}
            </h3>
            <p className="text-sm text-mist leading-relaxed mb-5 font-light">
              {s.body}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-amber text-xs">◈</span>
              <span className="font-mono text-[10px] text-fog tracking-wide">
                {s.detail}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
