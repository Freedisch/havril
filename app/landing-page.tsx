'use client';

import { Nav } from './components/nav';
import { Hero } from './components/hero';
import { Ticker } from './components/ticker';
import { HowItWorks } from './components/howItsWorks';
import { EngineSection } from './components/engineSection';
import { Features } from './components/features';
import { CodePreview } from './components/codePreview';
import { Integrations } from './components/integrations';
import { CTA } from './components/cta';
import { Footer } from './components/footer';

export default function Page(): JSX.Element {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Ticker />
        <HowItWorks />
        <EngineSection />
        <Features />
        <Integrations />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
