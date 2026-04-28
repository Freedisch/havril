import { FC } from 'react';

const footerLinks = [
  { label: 'GitHub', href: 'https://github.com/freedisch/havril' },
  { label: 'Docs',   href: '#' },
  { label: 'Status', href: '#' },
];

export const Footer: FC = () => {
  return (
    <footer className="border-t border-edge px-6 md:px-12 py-10 bg-ink">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="font-display text-lg font-medium tracking-wide text-cream mb-1">
            Hav<span className="text-amber">ril</span>
          </div>
          <p className="font-mono text-[10px] text-fog tracking-wide">One memory. Every model.</p>
        </div>

        <div className="flex flex-wrap gap-8">
          {footerLinks.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target={l.href.startsWith('http') ? '_blank' : undefined}
              rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="font-mono text-[10px] tracking-widest uppercase text-fog hover:text-mist transition-colors duration-200"
            >
              {l.label}
            </a>
          ))}
          <a
            href="https://x.com/freedisch"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] tracking-widest uppercase text-fog hover:text-mist transition-colors duration-200"
          >
            X / Twitter
          </a>
        </div>

        <p className="font-mono text-[10px] text-fog tracking-wide">© 2026 Havril</p>
      </div>
    </footer>
  );
};
