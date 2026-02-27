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
      desc: 'LLM identifies meaningful facts from the raw conversation transcript',
    },
    {
      icon: '⊗',
      step: 'Deduplicate',
      desc: 'Vector similarity check prevents storing what is already known',
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
      desc: 'Written to PostgreSQL metadata store + Qdrant vector index',
    },
  ];

  return (
    <section className="py-32 px-8 md:px-12 bg-ink2 relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-50" />
      <div className="absolute inset-0 amber-glow" />

      <div className="relative max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-amber">
            The Memory Engine
          </span>
          <div className="flex-1 h-px bg-edge" />
        </div>

        <div className="grid md:grid-cols-2 gap-16 mb-20 items-end">
          <h2 className="font-display text-5xl md:text-6xl font-light leading-[1.05] text-cream">
            Intelligence lives inside{' '}
            <em className="text-gradient not-italic">Havril</em>,
            <br />
            not the model.
          </h2>
          <p className="text-base text-mist leading-relaxed font-light">
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
              className={`p-8 group hover:bg-ink3 transition-colors duration-300 ${
                i < pipeline.length - 1
                  ? 'border-b md:border-b-0 md:border-r border-edge'
                  : ''
              }`}
            >
              <div className="text-amber text-2xl mb-5 group-hover:scale-110 transition-transform duration-200 inline-block">
                {p.icon}
              </div>
              <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-fog mb-2">
                Step {String(i + 1).padStart(2, '0')}
              </div>
              <div className="font-display text-xl font-light text-cream mb-3">
                {p.step}
              </div>
              <p className="text-xs text-mist leading-relaxed font-light">
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
