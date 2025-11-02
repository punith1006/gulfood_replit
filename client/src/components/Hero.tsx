import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Calendar, MapPin, Users } from "lucide-react";
import { useChatbot } from "@/contexts/ChatbotContext";
import heroImage from "@assets/generated_images/Gulfood_exhibition_hall_hero_e5151e19.png";

export default function Hero() {
  const { openChatbot } = useChatbot();
  
  const handleExploreExhibitors = () => {
    const exhibitorsSection = document.getElementById('exhibitors-directory');
    if (exhibitorsSection) {
      exhibitorsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Gulfood 2026 Exhibition Hall"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/60" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <div className="max-w-3xl">
          <Badge className="mb-6 bg-primary/10 text-primary border-primary/20" data-testid="badge-event-date">
            <Calendar className="w-3 h-3 mr-1.5" />
            January 26-30, 2026
          </Badge>

          <h1 className="text-5xl lg:text-7xl font-black tracking-tight text-foreground mb-6 leading-[1.1]">
            Beyond Boundaries.<br />
            <span className="text-primary">Beyond Expectations.</span>
          </h1>

          <p className="text-lg lg:text-xl text-muted-foreground mb-8 max-w-2xl leading-relaxed">
            Experience the world's largest food & beverage exhibition with AI-powered intelligence. Get personalized recommendations, smart scheduling, and seamless networking across 8,500+ exhibitors.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Button 
              size="lg" 
              className="text-base gap-2" 
              data-testid="button-get-started"
              onClick={openChatbot}
            >
              Get Started with AI
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base backdrop-blur-sm bg-background/50"
              data-testid="button-explore-exhibitors"
              onClick={handleExploreExhibitors}
            >
              Explore Exhibitors
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-6 max-w-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">8,500+</div>
                <div className="text-sm text-muted-foreground">Exhibitors</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-chart-2" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">2</div>
                <div className="text-sm text-muted-foreground">Venues</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-chart-3/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-chart-3" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">100K+</div>
                <div className="text-sm text-muted-foreground">Visitors</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
