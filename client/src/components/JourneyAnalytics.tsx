import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MapPin, Users, Calendar as CalendarIcon, TrendingUp, Award, Building2, Target } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("authToken");
  const headers: Record<string, string> = {};
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  return headers;
}

interface JourneyOverview {
  totalJourneys: number;
  uniqueVisitors: number;
  averageJourneysPerVisitor: number;
  journeysLast24h: number;
}

interface CategoryItem {
  category: string;
  count: number;
}

interface ExhibitorRankingItem {
  exhibitorId: number;
  exhibitorName: string;
  matchedCount: number;
  preferredCount: number;
  totalReferences: number;
  weightedScore: number;
}

interface SegmentItem {
  name: string;
  count: number;
}

interface SectorExpectationItem {
  sector: string;
  expectedVisitors: number;
}

interface DateDistributionItem {
  date: string;
  visitorCount: number;
}

interface JourneyAnalyticsData {
  overview: JourneyOverview;
  topCategories: CategoryItem[];
  topExhibitors: ExhibitorRankingItem[];
  visitorSegments: {
    topRoles: SegmentItem[];
    topOrganizations: SegmentItem[];
    topIntents: SegmentItem[];
  };
  expectedVisitorsBySector: SectorExpectationItem[];
  visitDateDistribution: DateDistributionItem[];
}

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export default function JourneyAnalytics() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date()
  });

  const { data: analytics, isLoading } = useQuery<JourneyAnalyticsData>({
    queryKey: ['/api/analytics/journey/overview', dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.from) params.append('startDate', dateRange.from.toISOString());
      if (dateRange.to) params.append('endDate', dateRange.to.toISOString());
      
      const response = await fetch(`/api/analytics/journey/overview?${params}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Failed to fetch journey analytics');
      return response.json();
    },
    refetchInterval: 300000
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading journey analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">No journey data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Journey Analytics</h2>
          <p className="text-muted-foreground">Track visitor journey planning patterns and preferences</p>
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" data-testid="button-date-range">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from && dateRange.to
                ? `${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`
                : "Select date range"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
              numberOfMonths={2}
              data-testid="calendar-date-range"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Total Journeys</h3>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold" data-testid="text-total-journeys">{analytics.overview.totalJourneys ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              {analytics.overview.journeysLast24h ?? 0} in last 24 hours
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Unique Visitors</h3>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold" data-testid="text-unique-visitors">{analytics.overview.uniqueVisitors ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              {(analytics.overview.averageJourneysPerVisitor ?? 0).toFixed(1)} avg journeys per visitor
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Top Interest</h3>
            <Target className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold truncate" data-testid="text-top-interest">
              {analytics.topCategories[0]?.category || 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground">
              {analytics.topCategories[0]?.count || 0} journeys
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Most Popular Exhibitor</h3>
            <Award className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-bold truncate" data-testid="text-top-exhibitor">
              {analytics.topExhibitors[0]?.exhibitorName || 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground">
              {analytics.topExhibitors[0]?.weightedScore || 0} weighted score
            </p>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Top Interest Categories</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.topCategories.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="category" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  className="text-xs fill-muted-foreground"
                />
                <YAxis className="text-xs fill-muted-foreground" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--chart-1))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Top Exhibitor Rankings</h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {analytics.topExhibitors.slice(0, 10).map((exhibitor, index) => (
              <div key={exhibitor.exhibitorId} className="flex items-center gap-3">
                <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                  {index + 1}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" data-testid={`text-exhibitor-${exhibitor.exhibitorId}`}>
                    {exhibitor.exhibitorName}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{exhibitor.matchedCount} matched</span>
                    <span>•</span>
                    <span>{exhibitor.preferredCount} preferred</span>
                  </div>
                </div>
                <Badge variant="secondary" data-testid={`badge-score-${exhibitor.exhibitorId}`}>
                  {exhibitor.weightedScore}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Top Visitor Roles
          </h3>
          <div className="space-y-2">
            {analytics.visitorSegments.topRoles.slice(0, 5).map((role, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm" data-testid={`text-role-${index}`}>{role.name}</span>
                <Badge variant="secondary">{role.count}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Top Organizations
          </h3>
          <div className="space-y-2">
            {analytics.visitorSegments.topOrganizations.slice(0, 5).map((org, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm truncate" data-testid={`text-org-${index}`}>{org.name}</span>
                <Badge variant="secondary">{org.count}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5" />
            Top Attendance Intents
          </h3>
          <div className="space-y-2">
            {analytics.visitorSegments.topIntents.slice(0, 5).map((intent, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm" data-testid={`text-intent-${index}`}>{intent.name}</span>
                <Badge variant="secondary">{intent.count}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Expected Visitors by Sector</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.expectedVisitorsBySector.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="sector" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  className="text-xs fill-muted-foreground"
                />
                <YAxis className="text-xs fill-muted-foreground" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="expectedVisitors" fill="hsl(var(--chart-2))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Visit Date Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.visitDateDistribution}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => format(new Date(date), 'MMM d')}
                  className="text-xs fill-muted-foreground"
                />
                <YAxis className="text-xs fill-muted-foreground" />
                <Tooltip 
                  labelFormatter={(date) => format(new Date(date), 'MMMM d, yyyy')}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="visitorCount" 
                  stroke="hsl(var(--chart-3))" 
                  strokeWidth={2}
                  name="Expected Visitors"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
