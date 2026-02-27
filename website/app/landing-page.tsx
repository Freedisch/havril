'use client';

import { Nav } from './components/nav';
import { CodePreview } from './components/codePreview';
import { CTA } from './components/cta';
import { EngineSection } from './components/engineSection';
import { Features } from './components/features';
import { Footer } from './components/footer';
import { Hero } from './components/hero';
import { HowItWorks } from './components/howItsWorks';
import { Integrations } from './components/integrations';
import { Ticker } from './components/ticker';

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
        <CodePreview />
        <Integrations />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
