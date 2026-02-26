import type { Metadata } from 'next';
import { Cormorant_Garamond, JetBrains_Mono, Sora } from 'next/font/google';
import './globals.css';

const displayFont = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

const monoFont = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

const bodyFont = Sora({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MemoAI — Memory That Follows You Across Every Model',
  description:
    'One memory layer for all your AI models. Chat on Claude, switch to ChatGPT — your context travels with you.',
  openGraph: {
    title: 'MemoAI — One Memory. Every Model.',
    description:
      'Persistent AI memory that works across Claude, ChatGPT, Gemini and more.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${monoFont.variable} ${bodyFont.variable}`}
    >
      <body className="bg-ink text-cream font-body antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
