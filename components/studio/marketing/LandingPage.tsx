'use client';

import { MotionConfig } from 'framer-motion';
import { Hero } from './Hero';
import { Features, FinalCta, HowItWorks, LandingFaq, PricingSection, StylesShowcase } from './LandingSections';
import { MarketingShell } from './shared';

export function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <MarketingShell>
        <Hero />
        <HowItWorks />
        <Features />
        <StylesShowcase />
        <PricingSection />
        <LandingFaq />
        <FinalCta />
      </MarketingShell>
    </MotionConfig>
  );
}
