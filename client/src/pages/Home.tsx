import Hero from "@/components/Hero";
import FeatureGrid from "@/components/FeatureGrid";
import ExhibitorDirectory from "@/components/ExhibitorDirectory";
import VenueNavigation from "@/components/VenueNavigation";
import YourEventJourney from "@/components/YourEventJourney";

export default function Home() {
  return (
    <div>
      <Hero />
      <YourEventJourney />
      <div id="exhibitors-directory">
        <ExhibitorDirectory />
      </div>
      <VenueNavigation />
      <FeatureGrid />
    </div>
  );
}
