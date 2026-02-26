import { FC } from 'react';

export const Ticker: FC = () => {
  const items: string[] = [
    'Persistent Memory',
    'Cross-Model Context',
    'Automatic Extraction',
    'Semantic Search',
    'Contradiction Resolution',
    'MCP Native',
    'Privacy First',
    'Built in Go',
    'Persistent Memory',
    'Cross-Model Context',
    'Automatic Extraction',
    'Semantic Search',
    'Contradiction Resolution',
    'MCP Native',
    'Privacy First',
    'Built in Go',
  ];

  return (
    <div className="border-y border-edge overflow-hidden py-3">
      <div className="ticker-track">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-6 px-6 shrink-0">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-fog whitespace-nowrap">
              {item}
            </span>
            <span className="text-edge2 text-xs">◆</span>
          </div>
        ))}
      </div>
    </div>
  );
};
