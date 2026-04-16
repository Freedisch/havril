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
    { t: 'blank',   c: '' },
    { t: 'keyword', c: 'tool: ',  rest: 'fetch_memories' },
    { t: 'plain',   c: '  query:  ', val: '"I am building a Go API"' },
    { t: 'plain',   c: '  limit:  ', val: '5' },
    { t: 'blank',   c: '' },
    { t: 'return',  c: '↳ returns:' },
    { t: 'mem',     c: '  • "User is building a REST API in Go using Chi"' },
    { t: 'mem',     c: '  • "User stores data in PostgreSQL with pgx/v5"' },
    { t: 'mem',     c: '  • "User prefers minimal dependencies"' },
    { t: 'blank',   c: '' },
    { t: 'comment', c: '// 3 memories injected. Model already knows your context.' },
  ];

  const perks = [
    'REST API with Bearer token auth',
    'MCP server for Claude (native tool use)',
    'OpenAPI schema for ChatGPT Custom Actions',
    'Built in Go — fast, lean, self-hostable',
  ];

  return (
    <section className="py-28 px-6 md:px-12 bg-white relative overflow-hidden">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-14 items-center">
        {/* Left */}
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-fog mb-5">
            For developers
          </p>
          <h2 className="font-display text-[clamp(28px,4vw,46px)] font-normal text-cream mb-5 leading-[1.1]">
            Two tools.
            <br />
            That&apos;s the whole API.
          </h2>
          <p className="text-[14px] text-mist leading-relaxed mb-8 font-body">
            <code className="font-mono text-amber text-[12px] bg-amber/5 px-1 py-0.5 rounded">fetch_memories</code>{' '}
            before responding.{' '}
            <code className="font-mono text-amber text-[12px] bg-amber/5 px-1 py-0.5 rounded">submit_conversation</code>{' '}
            when done. Havril handles everything in between.
          </p>
          <div className="flex flex-col gap-3">
            {perks.map((p) => (
              <div key={p} className="flex items-center gap-3">
                <span className="text-amber text-[10px] shrink-0">◈</span>
                <span className="text-[13px] text-mist font-body">{p}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Terminal */}
        <div className="border border-edge bg-ink relative overflow-hidden rounded-sm">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-edge bg-white/50">
            {['bg-red-200', 'bg-yellow-200', 'bg-green-200'].map((c, i) => (
              <div key={i} className={`w-2.5 h-2.5 rounded-full ${c}`} />
            ))}
            <span className="ml-3 font-mono text-[10px] text-fog">mcp_tool_call.log</span>
          </div>
          <div className="p-6 font-mono text-[11px] leading-7">
            {lines.map((l, i) => {
              if (l.t === 'blank')   return <div key={i} className="h-2" />;
              if (l.t === 'comment') return <div key={i} className="text-fog">{l.c}</div>;
              if (l.t === 'keyword') return (
                <div key={i}>
                  <span className="text-mist">{l.c}</span>
                  <span className="text-amber">{l.rest}</span>
                </div>
              );
              if (l.t === 'plain')   return (
                <div key={i}>
                  <span className="text-fog">{l.c}</span>
                  <span className="text-cream">{l.val}</span>
                </div>
              );
              if (l.t === 'return')  return <div key={i} className="text-amber">{l.c}</div>;
              if (l.t === 'mem')     return <div key={i} className="text-mist">{l.c}</div>;
              return null;
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
