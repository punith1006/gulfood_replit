import Hero from "@/components/Hero";
import CompanyAnalyzer from "@/components/CompanyAnalyzer";
import FeatureGrid from "@/components/FeatureGrid";
import ExhibitorDirectory from "@/components/ExhibitorDirectory";
import VenueNavigation from "@/components/VenueNavigation";
import EmailContactBanner from "@/components/EmailContactBanner";

export default function Home() {
  return (
    <div>
      <Hero />
      <EmailContactBanner />
      <CompanyAnalyzer />
      <FeatureGrid />
      <div id="exhibitors-directory">
        <ExhibitorDirectory />
      </div>
      <VenueNavigation />
    </div>
  );
}
