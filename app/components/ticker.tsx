import { FC } from 'react';

export const Ticker: FC = () => {
  const items = [
    'Persistent Memory',
    'Cross-Model Context',
    'Automatic Extraction',
    'Semantic Retrieval',
    'Contradiction Resolution',
    'MCP Native',
    'Zero Transcript Storage',
    'Built in Go',
    'Persistent Memory',
    'Cross-Model Context',
    'Automatic Extraction',
    'Semantic Retrieval',
    'Contradiction Resolution',
    'MCP Native',
    'Zero Transcript Storage',
    'Built in Go',
  ];

  return (
    <div className="border-y border-edge overflow-hidden py-3 bg-white">
      <div className="ticker-track">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-5 px-6 shrink-0">
            <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-fog whitespace-nowrap">
              {item}
            </span>
            <span className="text-edge2 text-[8px]">◆</span>
          </div>
        ))}
      </div>
    </div>
  );
};
