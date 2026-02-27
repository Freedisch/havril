import { FC, useState } from 'react';
import { useScrolled } from '../utils/customState';

export const Nav: FC = () => {
  const scrolled = useScrolled();
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  const links: string[] = ['How it works', 'Features', 'Integrations'];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 md:px-12 py-5 transition-all duration-500 ${
        scrolled ? 'bg-ink/90 backdrop-blur-xl border-b border-edge' : ''
      }`}
    >
      <a href="#" className="font-display text-xl font-medium tracking-wide">
        Hav<span className="text-amber">ril</span>
      </a>

      {/* Desktop links */}
      <div className="hidden md:flex items-center gap-10 text-[11px] tracking-widest uppercase font-body font-light text-mist">
        {links.map((l) => (
          <a
            key={l}
            href={`#${l.toLowerCase().replace(/ /g, '-')}`}
            className="hover:text-cream transition-colors duration-200"
          >
            {l}
          </a>
        ))}
      </div>

      <div className="hidden md:flex items-center gap-5">
        <a
          href="#get-access"
          className="text-[11px] tracking-widest uppercase bg-amber text-ink px-5 py-2.5 font-medium hover:bg-amber/90 transition-all duration-200 hover:-translate-y-px"
        >
          Get Early Access
        </a>
      </div>

      {/* Mobile toggle */}
      <button
        className="md:hidden flex flex-col gap-1.5 p-1"
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="Toggle menu"
      >
        {[
          menuOpen ? 'rotate-45 translate-y-[7px]' : '',
          menuOpen ? 'opacity-0' : '',
          menuOpen ? '-rotate-45 -translate-y-[7px]' : '',
        ].map((cls, i) => (
          <span
            key={i}
            className={`block w-5 h-px bg-cream transition-all duration-300 ${cls}`}
          />
        ))}
      </button>

      {menuOpen && (
        <div className="absolute top-full left-0 right-0 bg-ink2 border-b border-edge p-8 flex flex-col gap-6 md:hidden">
          {links.map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase().replace(/ /g, '-')}`}
              className="text-[11px] tracking-widest uppercase text-mist hover:text-cream transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              {l}
            </a>
          ))}
          <a
            href="#"
            className="text-[11px] tracking-widest uppercase bg-amber text-ink px-5 py-3 font-medium text-center"
          >
            Get Early Access
          </a>
        </div>
      )}
    </nav>
  );
};
