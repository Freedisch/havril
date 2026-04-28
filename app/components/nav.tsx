'use client';
import { FC, useState } from 'react';
import { useScrolled } from '../utils/customState';

export const Nav: FC = () => {
  const scrolled = useScrolled();
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-5 transition-all duration-300 ${
        scrolled ? 'bg-ink/90 backdrop-blur-xl border-b border-edge' : ''
      }`}
    >
      <a href="#">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/havril.png" alt="Havril" style={{ height: '44px', width: 'auto' }} />
      </a>

      <div className="hidden md:flex items-center gap-4">
        <a
          href="https://github.com/freedisch/havril"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View on GitHub"
          className="text-mist hover:text-cream transition-colors duration-200"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
        </a>
        <a
          href="https://x.com/freedisch"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Follow on X"
          className="text-mist hover:text-cream transition-colors duration-200"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>
        <a
          href="#get-access"
          className="text-[11px] tracking-widest uppercase bg-amber text-white px-5 py-2.5 font-medium hover:bg-amber/90 transition-colors rounded-sm"
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
          <span key={i} className={`block w-5 h-px bg-cream transition-all duration-300 ${cls}`} />
        ))}
      </button>

      {menuOpen && (
        <div className="absolute top-full left-0 right-0 bg-ink border-b border-edge p-8 flex flex-col gap-6 md:hidden">
          <a
            href="https://github.com/freedisch/havril"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] tracking-widest uppercase text-mist hover:text-cream transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            GitHub
          </a>
          <a
            href="https://x.com/freedisch"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] tracking-widest uppercase text-mist hover:text-cream transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            X / Twitter
          </a>
          <a href="#get-access" className="text-[11px] uppercase bg-amber text-white px-5 py-3 font-medium text-center rounded-sm">
            Get Early Access
          </a>
        </div>
      )}
    </nav>
  );
};
