import Hero from "@/components/Hero";
import CompanyAnalyzer from "@/components/CompanyAnalyzer";
import FeatureGrid from "@/components/FeatureGrid";
import ExhibitorDirectory from "@/components/ExhibitorDirectory";
import VenueNavigation from "@/components/VenueNavigation";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import { useRole } from "@/contexts/RoleContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, BarChart3 } from "lucide-react";

export default function Home() {
  const { userRole } = useRole();

  return (
    <div>
      <Hero />
      <CompanyAnalyzer />
      <FeatureGrid />
      <ExhibitorDirectory />
      <VenueNavigation />
      {userRole === "organizer" ? (
        <AnalyticsDashboard />
      ) : (
        <section className="py-20 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="p-12 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
                  <Lock className="w-10 h-10 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-3">Analytics Dashboard</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                This dashboard is exclusively available to event organizers. Select "Organizer" role in Faris to access real-time analytics and insights.
              </p>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  document.querySelector<HTMLButtonElement>('[data-testid="button-open-chatbot"]')?.click();
                }}
              >
                <BarChart3 className="w-4 h-4" />
                Open Faris to Select Role
              </Button>
            </Card>
          </div>
        </section>
      )}
    </div>
  );
}
