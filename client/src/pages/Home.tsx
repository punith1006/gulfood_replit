import Hero from "@/components/Hero";
import CompanyAnalyzer from "@/components/CompanyAnalyzer";
import FeatureGrid from "@/components/FeatureGrid";
import ExhibitorDirectory from "@/components/ExhibitorDirectory";
import VenueNavigation from "@/components/VenueNavigation";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";

export default function Home() {
  return (
    <div>
      <Hero />
      <CompanyAnalyzer />
      <FeatureGrid />
      <ExhibitorDirectory />
      <VenueNavigation />
      <AnalyticsDashboard />
    </div>
  );
}
