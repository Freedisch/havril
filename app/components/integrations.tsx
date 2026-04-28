import { FC } from 'react';

export const Integrations: FC = () => {
  return (
    <section id="integrations" className="py-28 px-6 md:px-12 max-w-5xl mx-auto">
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-fog mb-5">
        Integrations
      </p>
      <h2 className="font-display text-[clamp(28px,4vw,46px)] font-normal text-cream mb-3 leading-[1.1]">
        Works everywhere
        <br />
        <span className="text-mist font-light italic">you already chat.</span>
      </h2>
      <p className="text-[14px] text-mist mb-14 max-w-md font-body leading-relaxed">
        Install the extension once. On any AI interface, open it, search your memory bank, and inject the right context — in seconds.
      </p>

      <div className="relative w-full aspect-video">
        <iframe
          src="https://www.youtube.com/embed/fwhERqyZKz4"
          title="Havril browser extension demo"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full border border-edge"
        />
      </div>
    </section>
  );
};
