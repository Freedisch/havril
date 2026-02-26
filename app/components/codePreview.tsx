import { FC } from 'react';

interface CodeLine {
  t: 'comment' | 'blank' | 'keyword' | 'plain' | 'return' | 'mem';
  c: string;
  rest?: string;
  val?: string;
}

export const CodePreview: FC = () => {
  const lines: CodeLine[] = [
    { t: 'comment', c: '// Havril MCP tool — called automatically by Claude' },
    { t: 'blank', c: '' },
    { t: 'keyword', c: 'tool: ', rest: 'fetch_memories' },
    { t: 'plain', c: '  query:  ', val: '"I am building a Go API"' },
    { t: 'plain', c: '  limit:  ', val: '5' },
    { t: 'blank', c: '' },
    { t: 'return', c: '↳ returns:' },
    { t: 'mem', c: '  • "User is building a REST API in Go using Chi"' },
    { t: 'mem', c: '  • "User stores data in PostgreSQL with pgx/v5"' },
    { t: 'mem', c: '  • "User prefers minimal dependencies"' },
    { t: 'blank', c: '' },
    {
      t: 'comment',
      c: '// 3 memories injected. Model already knows your context.',
    },
  ];

  const perks: string[] = [
    'REST API with Bearer token auth',
    'MCP server for Claude (native)',
    'OpenAPI schema for ChatGPT Actions',
    'Built in Go — fast and lean',
  ];

  return (
    <section className="py-20 px-8 md:px-12 bg-ink2 relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-30" />

      <div className="relative max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
        <div>
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-amber">
              For developers
            </span>
            <div className="flex-1 h-px bg-edge" />
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-light text-cream mb-6 leading-tight">
            Two tools.
            <br />
            That&apos;s the whole API.
          </h2>
          <p className="text-sm text-mist leading-relaxed mb-8 font-light">
            <code className="font-mono text-amber text-xs">fetch_memories</code>{' '}
            before responding.{' '}
            <code className="font-mono text-amber text-xs">
              submit_conversation
            </code>{' '}
            when done. Havril handles everything in between.
          </p>
          <div className="flex flex-col gap-3">
            {perks.map((perk) => (
              <div key={perk} className="flex items-center gap-3">
                <span className="text-amber text-xs shrink-0">◈</span>
                <span className="text-sm text-mist font-light">{perk}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Terminal */}
        <div className="border border-edge bg-ink relative overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-edge">
            {['bg-edge2', 'bg-edge2', 'bg-edge2'].map((c, i) => (
              <div key={i} className={`w-2.5 h-2.5 rounded-full ${c}`} />
            ))}
            <span className="ml-3 font-mono text-[10px] text-fog tracking-wide">
              mcp_tool_call.log
            </span>
          </div>

          {/* Scan line */}
          <div className="absolute left-0 right-0 h-8 bg-gradient-to-b from-transparent via-amber/4 to-transparent animate-scan pointer-events-none" />

          <div className="p-6 font-mono text-xs leading-7 overflow-x-auto">
            {lines.map((l, i) => {
              if (l.t === 'blank') return <div key={i} className="h-3" />;
              if (l.t === 'comment')
                return (
                  <div key={i} className="text-fog">
                    {l.c}
                  </div>
                );
              if (l.t === 'keyword')
                return (
                  <div key={i}>
                    <span className="text-mist">{l.c}</span>
                    <span className="text-amber">{l.rest}</span>
                  </div>
                );
              if (l.t === 'plain')
                return (
                  <div key={i}>
                    <span className="text-fog">{l.c}</span>
                    <span className="text-cream">{l.val}</span>
                  </div>
                );
              if (l.t === 'return')
                return (
                  <div key={i} className="text-amber">
                    {l.c}
                  </div>
                );
              if (l.t === 'mem')
                return (
                  <div key={i} className="text-mist">
                    {l.c}
                  </div>
                );
              return null;
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
