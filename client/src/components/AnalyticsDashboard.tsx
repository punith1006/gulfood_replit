import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, MessageSquare, TrendingUp, ArrowUp, ArrowDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import analyticsImage from "@assets/generated_images/Analytics_dashboard_visualization_c400d7e3.png";

interface Analytics {
  totalRegistrations: number;
  exhibitorSignups: number;
  aiInteractions: number;
  meetingRequests: number;
}

const sectorData = [
  { name: "Dairy", percentage: 85, count: 1247 },
  { name: "Beverages", percentage: 78, count: 1089 },
  { name: "Meat & Poultry", percentage: 72, count: 934 },
  { name: "Fresh Produce", percentage: 65, count: 812 }
];

export default function AnalyticsDashboard() {
  const { data: analytics, isLoading } = useQuery<Analytics>({
    queryKey: ["/api/analytics"],
    refetchInterval: 10000
  });

  const stats = [
    {
      label: "Total Registrations",
      value: analytics?.totalRegistrations?.toString() || "0",
      change: "+23%",
      trend: "up",
      icon: Users,
      color: "text-chart-1",
      bgColor: "bg-chart-1/10"
    },
    {
      label: "Exhibitor Signups",
      value: analytics?.exhibitorSignups?.toString() || "0",
      change: "+18%",
      trend: "up",
      icon: Building2,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10"
    },
    {
      label: "AI Interactions",
      value: analytics?.aiInteractions?.toString() || "0",
      change: "+156%",
      trend: "up",
      icon: MessageSquare,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10"
    },
    {
      label: "Meeting Requests",
      value: analytics?.meetingRequests?.toString() || "0",
      change: "+12%",
      trend: "up",
      icon: TrendingUp,
      color: "text-chart-4",
      bgColor: "bg-chart-4/10"
    }
  ];

  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <Badge className="mb-4" variant="secondary" data-testid="badge-organizer">
            Organizer Dashboard
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Real-Time Event Intelligence
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mb-8">
            Comprehensive analytics and insights to make data-driven decisions for Gulfood 2026
          </p>
          <div className="rounded-xl overflow-hidden shadow-lg mb-8">
            <img 
              src={analyticsImage} 
              alt="Advanced analytics dashboard visualization" 
              className="w-full h-64 object-cover"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <Card key={idx} className="p-6" data-testid={`card-stat-${idx}`}>
                {isLoading ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="h-12 bg-muted rounded" />
                    <div className="h-8 bg-muted rounded" />
                    <div className="h-4 bg-muted rounded" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                        <Icon className={`w-6 h-6 ${stat.color}`} />
                      </div>
                      <Badge
                        variant={stat.trend === "up" ? "default" : "secondary"}
                        className={stat.trend === "up" ? "bg-chart-3/20 text-chart-3" : ""}
                      >
                        {stat.trend === "up" ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                        {stat.change}
                      </Badge>
                    </div>
                    <div className="text-3xl font-bold mb-1" data-testid={`text-stat-value-${idx}`}>{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </>
                )}
              </Card>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-6">Sector Engagement</h3>
            <div className="space-y-6">
              {sectorData.map((sector, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">{sector.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{sector.count} registrations</span>
                      <span className="text-sm font-bold">{sector.percentage}%</span>
                    </div>
                  </div>
                  <Progress value={sector.percentage} className="h-2" />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-xl font-bold mb-6">Top AI Queries</h3>
            <div className="space-y-4">
              {[
                { query: "How to schedule meetings with exhibitors?", count: 1247 },
                { query: "Best dairy exhibitors recommendations", count: 1089 },
                { query: "Shuttle schedule between venues", count: 934 },
                { query: "Recommended sessions for beverage industry", count: 812 },
                { query: "Registration process and requirements", count: 756 }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <span className="text-sm flex-1">{item.query}</span>
                  <Badge variant="secondary" className="ml-4">{item.count}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
