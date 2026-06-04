import { HeroSection, MarqueeSection, StatsSection, FeatureGrid, HowItWorks, PrivacySection, FinalCTA } from "@/components/landing/LandingComponents";
import { MobileLanding } from "@/components/landing/MobileLanding";

export default function HomePage() {
  return (
    <main style={{ background: "#0D0D0B" }}>
      <div className="lg:hidden">
        <MobileLanding />
      </div>
      <div className="hidden lg:block">
        <HeroSection />
        <MarqueeSection />
        <StatsSection />
        <FeatureGrid />
        <HowItWorks />
        <PrivacySection />
        <FinalCTA />
      </div>
    </main>
  );
}
