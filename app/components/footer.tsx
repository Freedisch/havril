import { FC } from 'react';

export const Footer: FC = () => {
  const links = ['GitHub', 'Docs', 'API Reference', 'Status'];

  return (
    <footer className="border-t border-edge px-6 md:px-12 py-10 bg-white">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="font-display text-lg font-medium tracking-wide text-cream mb-1">
            Hav<span className="text-amber">ril</span>
          </div>
          <p className="font-mono text-[10px] text-fog tracking-wide">One memory. Every model.</p>
        </div>

        <div className="flex flex-wrap gap-8">
          {links.map((l) => (
            <a
              key={l}
              href="#"
              className="font-mono text-[10px] tracking-widest uppercase text-fog hover:text-mist transition-colors duration-200"
            >
              {l}
            </a>
          ))}
        </div>

        <p className="font-mono text-[10px] text-fog tracking-wide">© 2026 Havril</p>
      </div>
    </footer>
  );
};
