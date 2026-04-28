import { FC } from 'react';

export const Integrations: FC = () => {
  return (
    <section id="integrations" className="py-28 px-6 md:px-12 max-w-5xl mx-auto">

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-fog mb-5">
            See it in action
          </p>
          <h2 className="font-display text-[clamp(28px,4vw,46px)] font-normal text-cream leading-[1.1]">
            Never re-explain
            <br />
            <span className="text-mist font-light italic">yourself again.</span>
          </h2>
        </div>
        <p className="text-[14px] text-mist max-w-xs font-body leading-relaxed md:text-right">
          Open the extension on any AI interface. Search your memory bank. Inject the right context in one click.
        </p>
      </div>

      {/* Video with corner accents */}
      <div className="relative group">

        {/* Corner accents */}
        <span className="absolute -top-px -left-px w-4 h-4 border-t border-l border-amber/50 z-10" />
        <span className="absolute -top-px -right-px w-4 h-4 border-t border-r border-amber/50 z-10" />
        <span className="absolute -bottom-px -left-px w-4 h-4 border-b border-l border-amber/50 z-10" />
        <span className="absolute -bottom-px -right-px w-4 h-4 border-b border-r border-amber/50 z-10" />

        <div className="relative w-full aspect-video">
          <iframe
            src="https://www.youtube.com/embed/fwhERqyZKz4"
            title="Havril browser extension demo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full border border-edge"
          />
        </div>
      </div>

      {/* Footer row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-5">
        <p className="font-mono text-[10px] tracking-widest uppercase text-fog">
          Browser extension · ChatGPT · Gemini · Mistral · Grok · any interface
        </p>
        <p className="font-mono text-[10px] tracking-widest uppercase text-amber/60">
          ✦ Claude gets native MCP on top
        </p>
      </div>

    </section>
  );
};
