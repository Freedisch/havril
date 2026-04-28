'use client';

import { Nav } from './components/nav';
import { Hero } from './components/hero';
import { Ticker } from './components/ticker';
import { Features } from './components/features';
import { Integrations } from './components/integrations';
import { CTA } from './components/cta';
import { Footer } from './components/footer';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';

export default function Page(): JSX.Element {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Integrations />
        <Features />
        <CTA />
      </main>
      <Footer />
      <SpeedInsights />
      <Analytics />
    </>
  );
}
