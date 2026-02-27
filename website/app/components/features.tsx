import { FC } from 'react';

interface FeatureCard {
  icon: string;
  title: string;
  body: string;
}
export const Features: FC = () => {
  const features: FeatureCard[] = [
    {
      icon: '◈',
      title: 'Model-agnostic by design',
      body: "Claude, ChatGPT, Gemini, Mistral — connect any model. Your memory isn't locked to any platform.",
    },
    {
      icon: '◎',
      title: 'Zero conversation storage',
      body: 'Raw transcripts are processed and discarded. Only distilled facts persist. Privacy is architectural.',
    },
    {
      icon: '◉',
      title: 'Semantic retrieval',
      body: 'Memories are retrieved by meaning, not keywords. Ask about your Go project and get back everything relevant.',
    },
    {
      icon: '◇',
      title: 'Contradiction resolution',
      body: 'Moved cities? Changed jobs? Havril detects conflicts and updates your memory profile automatically.',
    },
    {
      icon: '✦',
      title: 'Native MCP for Claude',
      body: 'Claude calls Havril as a tool mid-conversation. Real tool use — no prompt injection hacks.',
    },
    {
      icon: '⊕',
      title: 'Importance decay',
      body: 'Memories that matter stay. Stale context fades. The engine keeps your profile accurate over time.',
    },
  ];

  return (
    <section id="features" className="py-32 px-8 md:px-12 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-16">
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-amber">
          Features
        </span>
        <div className="flex-1 h-px bg-edge" />
      </div>

      <div className="grid md:grid-cols-3 gap-px bg-edge">
        {features.map((f) => (
          <div
            key={f.title}
            className="bg-ink p-8 hover:bg-ink2 transition-colors duration-300 group shimmer"
          >
            <span className="text-amber text-2xl block mb-5 group-hover:scale-110 transition-transform duration-200 inline-block">
              {f.icon}
            </span>
            <h3 className="font-display text-xl font-light text-cream mb-3 leading-tight">
              {f.title}
            </h3>
            <p className="text-sm text-mist leading-relaxed font-light">
              {f.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
