import Hero from "@/components/Hero";
import FeatureGrid from "@/components/FeatureGrid";
import ExhibitorDirectory from "@/components/ExhibitorDirectory";
import VenueNavigation from "@/components/VenueNavigation";
import EmailContactBanner from "@/components/EmailContactBanner";

export default function Home() {
  return (
    <div>
      <Hero />
      <EmailContactBanner />
      <div id="exhibitors-directory">
        <ExhibitorDirectory />
      </div>
      <VenueNavigation />
      <FeatureGrid />
    </div>
  );
}
