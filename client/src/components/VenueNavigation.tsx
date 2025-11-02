import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Train, Car, Clock, ArrowRight, TrendingUp, ExternalLink, Plane } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getNextMetroTimings } from "@/lib/metroSchedule";
import type { VenueTraffic } from "@shared/schema";
import { useEffect, useState } from "react";

export default function VenueNavigation() {
  const [metroTimings, setMetroTimings] = useState(getNextMetroTimings());

  useEffect(() => {
    const interval = setInterval(() => {
      setMetroTimings(getNextMetroTimings());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const { data: trafficData, isLoading } = useQuery<VenueTraffic>({
    queryKey: ['/api/venue-traffic'],
    queryFn: async () => {
      const res = await fetch('/api/venue-traffic?origin=Dubai World Trade Centre, Dubai&destination=Expo City Dubai, Dubai');
      if (!res.ok) {
        const errorData = await res.json();
        if (errorData.fallback) return errorData.fallback;
        throw new Error('Failed to fetch traffic data');
      }
      return res.json();
    },
    refetchInterval: 2 * 60 * 1000,
    staleTime: 2 * 60 * 1000
  });

  const getTrafficColor = (condition?: string) => {
    switch (condition) {
      case 'light': return 'text-green-600 dark:text-green-400';
      case 'moderate': return 'text-yellow-600 dark:text-yellow-400';
      case 'heavy': return 'text-red-600 dark:text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const getTrafficBadgeColor = (condition?: string) => {
    switch (condition) {
      case 'light': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'moderate': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'heavy': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

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
            Real-time traffic updates and metro schedules between Dubai World Trade Centre and Expo City Dubai
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950/20 dark:to-sky-950/20 border-blue-200/50 dark:border-blue-800/50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center">
                  <Train className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Dubai Metro (Red Line)</h3>
                  <p className="text-sm text-muted-foreground">Direct connection</p>
                </div>
              </div>
              <Badge className={metroTimings.isPeakHour ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}>
                {metroTimings.isPeakHour ? 'Peak Hours' : 'Off-Peak'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-1">From</div>
                <div className="font-semibold">DWTC Station</div>
                <div className="text-xs text-muted-foreground mt-1">World Trade Centre</div>
              </div>
              <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-1">To</div>
                <div className="font-semibold">Expo City Station</div>
                <div className="text-xs text-muted-foreground mt-1">UAE Pavilion</div>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Next Train</span>
                </div>
                <span className="font-bold text-primary" data-testid="text-next-train">{metroTimings.nextTrain}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Following Train</span>
                </div>
                <span className="font-semibold text-muted-foreground" data-testid="text-following-train">{metroTimings.followingTrain}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Frequency</span>
                </div>
                <span className="font-semibold text-muted-foreground" data-testid="text-frequency">{metroTimings.frequency}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div>
                <div className="text-2xl font-bold text-primary">15 min</div>
                <div className="text-xs text-muted-foreground">Journey time</div>
              </div>
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-shail-app">
                <ExternalLink className="w-4 h-4" />
                S'hail App
              </Button>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200/50 dark:border-amber-800/50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-yellow-500 flex items-center justify-center">
                  <Car className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Taxi / Private Car</h3>
                  <p className="text-sm text-muted-foreground">
                    {isLoading ? 'Checking traffic...' : 'Real-time traffic'}
                  </p>
                </div>
              </div>
              {trafficData?.trafficCondition && (
                <Badge className={getTrafficBadgeColor(trafficData.trafficCondition)} data-testid="badge-traffic-condition">
                  {trafficData.trafficCondition.charAt(0).toUpperCase() + trafficData.trafficCondition.slice(1)} Traffic
                </Badge>
              )}
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-muted-foreground">Distance</div>
                  <div className="font-bold text-lg" data-testid="text-distance">
                    {trafficData?.distanceText || '14 km'}
                  </div>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-muted-foreground">Normal Duration</div>
                  <div className="font-semibold text-muted-foreground" data-testid="text-normal-duration">
                    {trafficData?.durationText || '18 mins'}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">With Current Traffic</div>
                  <div className={`font-bold text-lg ${getTrafficColor(trafficData?.trafficCondition)}`} data-testid="text-traffic-duration">
                    {trafficData?.durationInTrafficText || trafficData?.durationText || '20 mins'}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-2">Route</div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">DWTC</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Sheikh Zayed Road</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Expo City</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-xs text-muted-foreground">
                Updated {trafficData ? 'just now' : 'recently'}
              </div>
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-google-maps">
                <ExternalLink className="w-4 h-4" />
                Google Maps
              </Button>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Plane className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg">From Dubai International Airport (DXB)</h3>
              <p className="text-sm text-muted-foreground">Direct metro connection to both venues</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Train className="w-4 h-4 text-red-500" />
                <span className="font-semibold text-sm">To DWTC</span>
              </div>
              <div className="text-2xl font-bold text-primary mb-1">15 min</div>
              <div className="text-xs text-muted-foreground">Red Line from Terminal 1 & 3</div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Train className="w-4 h-4 text-red-500" />
                <span className="font-semibold text-sm">To Expo City</span>
              </div>
              <div className="text-2xl font-bold text-primary mb-1">30 min</div>
              <div className="text-xs text-muted-foreground">Red Line + connection</div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Car className="w-4 h-4 text-yellow-500" />
                <span className="font-semibold text-sm">By Taxi</span>
              </div>
              <div className="text-2xl font-bold text-primary mb-1">20-25 min</div>
              <div className="text-xs text-muted-foreground">Direct to any venue</div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
