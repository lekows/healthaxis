import { HeroSection, MarqueeSection, StatsSection, FeatureGrid, HowItWorks, PrivacySection, FinalCTA } from "@/components/landing/LandingComponents";

export default function HomePage() {
  return (
    <main style={{ background: "#0D0D0B" }}>
      <HeroSection />
      <MarqueeSection />
      <StatsSection />
      <FeatureGrid />
      <HowItWorks />
      <PrivacySection />
      <FinalCTA />
    </main>
  );
}
