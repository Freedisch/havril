import { useEffect, useState } from 'react';

export function useScrolled(threshold: number = 40): boolean {
  const [scrolled, setScrolled] = useState<boolean>(false);
  useEffect(() => {
    const fn = (): void => setScrolled(window.scrollY > threshold);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, [threshold]);
  return scrolled;
}

export function useTypewriter(
  phrases: string[],
  speed: number = 45,
  pause: number = 2400,
): string {
  const [text, setText] = useState<string>('');
  const [phraseIdx, setPhraseIdx] = useState<number>(0);
  const [charIdx, setCharIdx] = useState<number>(0);
  const [deleting, setDeleting] = useState<boolean>(false);

  useEffect(() => {
    const current = phrases[phraseIdx];
    const timeout = setTimeout(
      () => {
        if (!deleting) {
          setText(current.slice(0, charIdx + 1));
          if (charIdx + 1 === current.length) {
            setTimeout(() => setDeleting(true), pause);
          } else {
            setCharIdx((c) => c + 1);
          }
        } else {
          setText(current.slice(0, charIdx - 1));
          if (charIdx - 1 === 0) {
            setDeleting(false);
            setPhraseIdx((i) => (i + 1) % phrases.length);
            setCharIdx(0);
          } else {
            setCharIdx((c) => c - 1);
          }
        }
      },
      deleting ? speed / 2 : speed,
    );

    return () => clearTimeout(timeout);
  }, [charIdx, deleting, phraseIdx, phrases, speed, pause]);

  return text;
}
