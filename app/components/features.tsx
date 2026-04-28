import { FC } from 'react';

interface Card {
  icon: string;
  title: string;
  body: string;
}

export const Features: FC = () => {
  const cards: Card[] = [
    {
      icon: '◈',
      title: 'Model-agnostic',
      body: "Claude, ChatGPT, Gemini, Mistral — your memory isn't locked to any platform.",
    },
    {
      icon: '◎',
      title: 'Zero transcript storage',
      body: 'Raw conversations are processed in memory and discarded. Only distilled facts persist.',
    },
    {
      icon: '◉',
      title: 'Semantic retrieval',
      body: 'Memories are fetched by meaning, not keywords. Ask about your Go project and get everything relevant.',
    },
    {
      icon: '◇',
      title: 'Contradiction resolution',
      body: 'Moved cities? Changed jobs? Havril detects conflicts and updates your profile automatically.',
    },
    {
      icon: '✦',
      title: 'Native MCP for Claude',
      body: 'Claude calls Havril as a real tool mid-conversation. No prompt injection. No hacks.',
    },
    {
      icon: '⊕',
      title: 'Importance scoring',
      body: 'Memories that matter stay. Stale context fades. The engine keeps your profile accurate over time.',
    },
  ];

  return (
    <section id="features" className="py-28 px-6 md:px-12 max-w-5xl mx-auto">
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-fog mb-12">
        What makes it different
      </p>

      <div className="grid md:grid-cols-3 gap-px bg-edge">
        {cards.map((c) => (
          <div
            key={c.title}
            className="bg-ink p-8 hover:bg-ink3 transition-colors duration-300 group"
          >
            <span className="text-amber text-xl block mb-5 group-hover:scale-110 transition-transform duration-200 inline-block">
              {c.icon}
            </span>
            <h3 className="font-display text-xl font-normal text-cream mb-3 leading-snug">
              {c.title}
            </h3>
            <p className="text-[13px] text-mist leading-relaxed font-body">
              {c.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
