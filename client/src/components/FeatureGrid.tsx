import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Calendar, Users, BarChart3, MapPin, Target } from "lucide-react";
import aiImage from "@assets/generated_images/AI_analysis_interface_visualization_ba2621ab.png";
import eventImage from "@assets/generated_images/Interactive_event_planning_technology_8bddd5ec.png";
import matchingImage from "@assets/generated_images/Exhibitor_matching_technology_e4cb23f0.png";
import schedulerImage from "@assets/generated_images/Meeting_scheduler_system_12a84b15.png";
import analyticsImage from "@assets/generated_images/Analytics_dashboard_display_a2817ddc.png";
import navigationImage from "@assets/generated_images/Venue_navigation_interface_3cd2cce1.png";

const features = [
  {
    icon: Bot,
    title: "AI Company Analysis",
    description: "Get instant, intelligent insights about event relevance based on your business profile",
    color: "text-primary",
    bgColor: "bg-primary/10",
    image: aiImage
  },
  {
    icon: Calendar,
    title: "Smart Event Planner",
    description: "AI-curated day-wise itinerary with optimized routes between DWTC and Expo City venues",
    color: "text-chart-2",
    bgColor: "bg-chart-2/10",
    image: eventImage
  },
  {
    icon: Users,
    title: "Exhibitor Matching",
    description: "Connect with the right exhibitors from 8,500+ participants across 12 sectors",
    color: "text-chart-3",
    bgColor: "bg-chart-3/10",
    image: matchingImage
  },
  {
    icon: Target,
    title: "Meeting Scheduler",
    description: "Seamlessly schedule B2B meetings with exhibitors and DWTC sales team",
    color: "text-chart-4",
    bgColor: "bg-chart-4/10",
    image: schedulerImage
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Real-time insights on registrations, engagement metrics, and visitor trends",
    color: "text-chart-5",
    bgColor: "bg-chart-5/10",
    image: analyticsImage
  },
  {
    icon: MapPin,
    title: "Venue Navigation",
    description: "Interactive maps and shuttle schedules for dual-venue experience",
    color: "text-primary",
    bgColor: "bg-primary/10",
    image: navigationImage
  }
];

export default function FeatureGrid() {
  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge className="mb-4" variant="secondary" data-testid="badge-features">
            Platform Features
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Intelligent Tools for Every Stakeholder
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From visitors to exhibitors to organizers, our AI-powered platform delivers personalized experiences at every touchpoint.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <Card
                key={idx}
                className="p-6 hover-elevate transition-all duration-300 overflow-hidden group"
                data-testid={`card-feature-${idx}`}
              >
                {feature.image && (
                  <div className="mb-4 -mx-6 -mt-6 h-40 overflow-hidden">
                    <img
                      src={feature.image}
                      alt={feature.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className={`w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
