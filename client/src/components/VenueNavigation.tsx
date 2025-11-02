import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Train, Car, Clock, Building2, Plane } from "lucide-react";

export default function VenueNavigation() {
  const transportOptions = [
    { 
      mode: "Dubai Metro (Red Line)", 
      icon: Train,
      from: "DWTC Station",
      to: "Expo City Station", 
      duration: "15 min",
      color: "bg-red-500"
    },
    { 
      mode: "Taxi / Private Car", 
      icon: Car,
      from: "DWTC",
      to: "Expo City", 
      duration: "20 min",
      color: "bg-yellow-500"
    },
    { 
      mode: "From Airport", 
      icon: Plane,
      from: "DXB Airport",
      to: "DWTC", 
      duration: "15 min",
      color: "bg-blue-500"
    }
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
            Gulfood 2026 spans two world-class venues connected by Dubai Metro. Plan your journey between exhibition halls seamlessly.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Interactive Venue Map */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden p-8 bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950/30 dark:to-sky-950/30">
              <div className="relative h-[500px]">
                {/* SVG Route Map */}
                <svg viewBox="0 0 800 400" className="w-full h-full">
                  {/* Background elements - Dubai landmarks */}
                  <g opacity="0.3">
                    {/* Palm Jumeirah icon (left) */}
                    <circle cx="80" cy="100" r="30" fill="currentColor" className="text-emerald-400" />
                    <text x="80" y="150" textAnchor="middle" className="text-xs fill-current">Palm Jumeirah</text>
                    
                    {/* Burj Al Arab icon */}
                    <polygon points="180,80 200,120 160,120" fill="currentColor" className="text-blue-400" />
                    <text x="180" y="140" textAnchor="middle" className="text-xs fill-current">Burj Al Arab</text>
                    
                    {/* Dubai International Airport (right) */}
                    <circle cx="720" cy="100" r="25" fill="currentColor" className="text-blue-600" />
                    <path d="M 710 100 L 730 100 M 720 90 L 720 110" stroke="white" strokeWidth="3"/>
                    <text x="720" y="140" textAnchor="middle" className="text-xs fill-current font-semibold">Dubai Airport</text>
                    <text x="720" y="155" textAnchor="middle" className="text-xs fill-current">(DXB)</text>
                  </g>

                  {/* Metro Line (Red/Pink) */}
                  <defs>
                    <linearGradient id="metroGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#EF4444" />
                      <stop offset="100%" stopColor="#EC4899" />
                    </linearGradient>
                  </defs>
                  <line 
                    x1="280" y1="250" 
                    x2="520" y2="250" 
                    stroke="url(#metroGradient)" 
                    strokeWidth="8" 
                    strokeDasharray="0"
                  />
                  
                  {/* Metro label */}
                  <rect x="360" y="235" width="80" height="20" fill="white" rx="10" opacity="0.95"/>
                  <text x="400" y="248" textAnchor="middle" className="text-xs font-bold fill-red-600">
                    Dubai Metro
                  </text>

                  {/* Dubai World Trade Centre (DWTC) */}
                  <g>
                    <rect x="220" y="200" width="120" height="100" rx="8" fill="currentColor" className="text-red-600" opacity="0.9"/>
                    <rect x="240" y="220" width="25" height="35" fill="white" opacity="0.3"/>
                    <rect x="275" y="220" width="25" height="35" fill="white" opacity="0.3"/>
                    <rect x="310" y="220" width="25" height="35" fill="white" opacity="0.3"/>
                    
                    {/* DWTC Label */}
                    <rect x="220" y="310" width="120" height="40" fill="white" rx="4"/>
                    <text x="280" y="328" textAnchor="middle" className="text-sm font-bold fill-current">
                      DUBAI WORLD
                    </text>
                    <text x="280" y="343" textAnchor="middle" className="text-sm font-bold fill-current">
                      TRADE CENTRE
                    </text>
                  </g>

                  {/* Expo City Dubai */}
                  <g>
                    <rect x="460" y="200" width="120" height="100" rx="8" fill="currentColor" className="text-blue-600" opacity="0.9"/>
                    <circle cx="490" cy="235" r="15" fill="white" opacity="0.3"/>
                    <circle cx="520" cy="235" r="15" fill="white" opacity="0.3"/>
                    <circle cx="550" cy="235" r="15" fill="white" opacity="0.3"/>
                    <rect x="475" y="260" width="70" height="25" fill="white" opacity="0.3"/>
                    
                    {/* Expo City Label */}
                    <rect x="460" y="310" width="120" height="40" fill="white" rx="4"/>
                    <text x="520" y="328" textAnchor="middle" className="text-sm font-bold fill-current">
                      EXPO CITY
                    </text>
                    <text x="520" y="343" textAnchor="middle" className="text-sm font-bold fill-current">
                      DUBAI
                    </text>
                  </g>

                  {/* Direction indicators */}
                  <g opacity="0.6">
                    <text x="220" y="380" className="text-xs fill-current">← E11 South from Abu Dhabi</text>
                    <text x="580" y="380" textAnchor="end" className="text-xs fill-current">E11 North from Sharjah →</text>
                  </g>

                  {/* Distance/Time indicator */}
                  <g>
                    <rect x="340" y="190" width="120" height="30" fill="currentColor" className="text-primary" rx="15" opacity="0.95"/>
                    <text x="400" y="210" textAnchor="middle" className="text-sm font-bold fill-primary-foreground">
                      15 min | 14 km
                    </text>
                  </g>
                </svg>
              </div>
            </Card>
          </div>

          {/* Transportation Options */}
          <div className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Navigation className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-lg">Getting Around</h3>
              </div>
              <div className="space-y-4">
                {transportOptions.map((option, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-muted/50 hover-elevate" data-testid={`transport-option-${idx}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full ${option.color} flex items-center justify-center flex-shrink-0`}>
                        <option.icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm mb-1">{option.mode}</div>
                        <div className="text-xs text-muted-foreground mb-2">
                          {option.from} → {option.to}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-primary" />
                          <span className="text-xs font-medium text-primary">{option.duration}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-primary" />
                <h4 className="font-bold">Venue Highlights</h4>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold">DWTC</div>
                    <div className="text-xs text-muted-foreground">8 Halls • Main Exhibitions</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold">Expo City</div>
                    <div className="text-xs text-muted-foreground">Innovation Pavilions • Food Tech</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold">Free Shuttle</div>
                    <div className="text-xs text-muted-foreground">Every 20 min between venues</div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5">
              <h4 className="font-bold mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Quick Tips
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Metro runs every 7 minutes during event hours</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Free parking at both venues</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Download mobile app for live navigation</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
