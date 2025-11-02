import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Download, Search } from "lucide-react";
import venueMapImage from "@assets/generated_images/Venue_navigation_map_view_8f2bf556.png";

export default function VenueNavigation() {
  const venueZones = [
    { name: "Dubai World Trade Centre", halls: "Halls 1-8", area: "Main Exhibition" },
    { name: "Expo City Dubai", halls: "Pavilions A-D", area: "Innovation Hub" },
    { name: "Meeting Rooms", halls: "Level 2-3", area: "Business Zones" },
    { name: "Food Courts", halls: "Multiple Locations", area: "Dining Areas" }
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge className="mb-4" variant="secondary" data-testid="badge-venue">
            <MapPin className="w-3 h-3 mr-1.5" />
            Venue Navigation
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Navigate With Ease
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Interactive venue maps and real-time navigation to help you find exhibitors, meeting rooms, and facilities
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <div className="relative">
                <img 
                  src={venueMapImage} 
                  alt="Gulfood 2026 venue map - Dubai World Trade Centre and Expo City Dubai" 
                  className="w-full h-[500px] object-cover"
                />
                <div className="absolute top-4 right-4 flex gap-2">
                  <Button size="sm" variant="secondary" className="gap-2">
                    <Search className="w-4 h-4" />
                    Find Exhibitor
                  </Button>
                  <Button size="sm" variant="secondary" className="gap-2">
                    <Download className="w-4 h-4" />
                    Download Map
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Navigation className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-lg">Venue Zones</h3>
              </div>
              <div className="space-y-4">
                {venueZones.map((zone, idx) => (
                  <div key={idx} className="border-l-2 border-primary pl-4">
                    <div className="font-semibold text-sm mb-1">{zone.name}</div>
                    <div className="text-xs text-muted-foreground">{zone.halls}</div>
                    <Badge variant="outline" className="mt-2 text-xs">
                      {zone.area}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 bg-primary/5 border-primary/20">
              <h4 className="font-bold mb-3">Quick Access</h4>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start gap-2 text-sm">
                  <MapPin className="w-4 h-4" />
                  My Saved Exhibitors
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2 text-sm">
                  <Navigation className="w-4 h-4" />
                  Planned Route
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2 text-sm">
                  <Search className="w-4 h-4" />
                  Nearby Facilities
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
