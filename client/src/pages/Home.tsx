import Hero from "@/components/Hero";
import FeatureGrid from "@/components/FeatureGrid";
import ExhibitorDirectory from "@/components/ExhibitorDirectory";
import VenueNavigation from "@/components/VenueNavigation";

export default function Home() {
  return (
    <div>
      <Hero />
      <div id="exhibitors-directory">
        <ExhibitorDirectory />
      </div>
      <VenueNavigation />
      <FeatureGrid />
    </div>
  );
}
