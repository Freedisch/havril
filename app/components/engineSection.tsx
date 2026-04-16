import { FC } from 'react';

interface PipelineStep {
  icon: string;
  step: string;
  desc: string;
}

export const EngineSection: FC = () => {
  const pipeline: PipelineStep[] = [
    {
      icon: '⊕',
      step: 'Extract',
      desc: 'gpt-4o-mini identifies meaningful facts from the raw transcript',
    },
    {
      icon: '⊗',
      step: 'Deduplicate',
      desc: 'Vector similarity (threshold 0.92) prevents storing what you already know',
    },
    {
      icon: '⊘',
      step: 'Contradict',
      desc: 'Detects and supersedes outdated memories automatically',
    },
    {
      icon: '⊙',
      step: 'Score',
      desc: 'Importance and recency weighted for smart, ranked retrieval',
    },
    {
      icon: '⊛',
      step: 'Store',
      desc: 'Written to PostgreSQL + Qdrant in one atomic operation',
    },
  ];

  return (
    <section className="py-28 px-6 md:px-12 bg-white relative overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-fog mb-4">
          The Memory Engine
        </p>

        <div className="grid md:grid-cols-2 gap-12 mb-16 items-end">
          <h2 className="font-display text-[clamp(32px,5vw,52px)] font-normal leading-[1.08] text-cream">
            Intelligence lives inside{' '}
            <span className="text-amber">Havril</span>,
            <br />
            not the model.
          </h2>
          <p className="text-[14px] text-mist leading-relaxed font-body">
            Models don&apos;t decide what to remember — Havril does. Every
            conversation passes through a 5-step pipeline that extracts only
            what matters, keeps the memory graph clean, and surfaces the right
            context at the right time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-0 border border-edge">
          {pipeline.map((p, i) => (
            <div
              key={p.step}
              className={`p-7 group hover:bg-ink transition-colors duration-300 ${
                i < pipeline.length - 1 ? 'border-b md:border-b-0 md:border-r border-edge' : ''
              }`}
            >
              <div className="text-amber text-xl mb-4 group-hover:scale-110 transition-transform duration-200 inline-block">
                {p.icon}
              </div>
              <div className="font-mono text-[9px] tracking-[0.18em] uppercase text-fog mb-1.5">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="font-display text-lg font-normal text-cream mb-2">
                {p.step}
              </div>
              <p className="text-[11px] text-mist leading-relaxed font-body">
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
