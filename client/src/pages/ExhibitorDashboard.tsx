import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  UserCheck, 
  TrendingUp, 
  Activity, 
  Building2, 
  Target, 
  Briefcase, 
  Share2 
} from "lucide-react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import type { Exhibitor, ExhibitorAnalytics } from "@shared/schema";

const COLORS = {
  blue: ["#3b82f6", "#60a5fa", "#93c5fd"],
  green: ["#10b981", "#34d399", "#6ee7b7"],
  purple: ["#8b5cf6", "#a78bfa", "#c4b5fd"],
  orange: ["#f97316", "#fb923c", "#fdba74"],
  amber: ["#f59e0b", "#fbbf24", "#fcd34d"],
  rose: ["#f43f5e", "#fb7185", "#fda4af"],
  cyan: ["#06b6d4", "#22d3ee", "#67e8f9"],
};

export default function ExhibitorDashboard() {
  const { authType, exhibitorAuth } = useAuth();
  const [, setLocation] = useLocation();

  const isExhibitorAuthenticated = authType === "exhibitor";

  useEffect(() => {
    if (!isExhibitorAuthenticated) {
      setLocation("/exhibitor/verify");
    }
  }, [isExhibitorAuthenticated, setLocation]);

  const { data, isLoading } = useQuery<{
    exhibitor: Exhibitor;
    analytics: ExhibitorAnalytics;
  }>({
    queryKey: ["/api/exhibitor/analytics"],
    enabled: isExhibitorAuthenticated,
  });

  if (!isExhibitorAuthenticated) {
    return null;
  }

  const analytics = data?.analytics;
  const exhibitor = data?.exhibitor;
  const companyName = exhibitorAuth?.companyName || "Your Company";

  // Calculate engagement rate
  const engagementRate = analytics?.totalAppearances && analytics?.uniqueVisitors
    ? Math.round((analytics.uniqueVisitors / analytics.totalAppearances) * 100)
    : 0;

  // Find peak activity (top role)
  const peakActivity = analytics?.visitorRoles && analytics.visitorRoles.length > 0
    ? analytics.visitorRoles.reduce((max, role) => role.count > max.count ? role : max, analytics.visitorRoles[0])
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-background to-amber-50 dark:from-orange-950/20 dark:via-background dark:to-amber-950/20 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" data-testid="text-company-name">
            Welcome, {companyName}
          </h1>
          <p className="text-lg text-muted-foreground">
            Your Exhibitor Analytics Dashboard for Gulfood 2026
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-24 mb-4" />
                    <Skeleton className="h-10 w-32 mb-2" />
                    <Skeleton className="h-3 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-48" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-[300px] w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Dashboard Content */}
        {!isLoading && analytics && (
          <>
            {/* Key Metrics Cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Appearances */}
              <Card className="overflow-hidden" data-testid="card-total-appearances">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <Users className="w-8 h-8 opacity-80" />
                  </div>
                  <div className="text-3xl font-bold mb-1" data-testid="text-total-appearances">
                    {analytics.totalAppearances.toLocaleString()}
                  </div>
                  <div className="text-sm text-blue-100">Total Appearances</div>
                </div>
              </Card>

              {/* Unique Visitors */}
              <Card className="overflow-hidden" data-testid="card-unique-visitors">
                <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <UserCheck className="w-8 h-8 opacity-80" />
                  </div>
                  <div className="text-3xl font-bold mb-1" data-testid="text-unique-visitors">
                    {analytics.uniqueVisitors.toLocaleString()}
                  </div>
                  <div className="text-sm text-green-100">Unique Visitors</div>
                </div>
              </Card>

              {/* Engagement Rate */}
              <Card className="overflow-hidden" data-testid="card-engagement-rate">
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <TrendingUp className="w-8 h-8 opacity-80" />
                  </div>
                  <div className="text-3xl font-bold mb-1" data-testid="text-engagement-rate">
                    {engagementRate}%
                  </div>
                  <div className="text-sm text-purple-100">Engagement Rate</div>
                </div>
              </Card>

              {/* Peak Activity */}
              <Card className="overflow-hidden" data-testid="card-peak-activity">
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <Activity className="w-8 h-8 opacity-80" />
                  </div>
                  <div className="text-3xl font-bold mb-1" data-testid="text-peak-activity">
                    {peakActivity?.role || "N/A"}
                  </div>
                  <div className="text-sm text-orange-100">Top Visitor Role</div>
                </div>
              </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Last 7 Days Trend */}
              <Card data-testid="card-chart-trend">
                <CardHeader>
                  <CardTitle>Last 7 Days Trend</CardTitle>
                  <CardDescription>Daily visitor appearances</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.last7DaysTrend.length === 0 ? (
                    <div className="text-center py-12">
                      <TrendingUp className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground">No trend data yet</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Analytics will appear as visitors discover your company
                      </p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={analytics.last7DaysTrend}>
                        <defs>
                          <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Area 
                          type="monotone" 
                          dataKey="count" 
                          stroke="#3b82f6" 
                          fillOpacity={1} 
                          fill="url(#colorTrend)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Visitor Roles Distribution */}
              <Card data-testid="card-chart-roles">
                <CardHeader>
                  <CardTitle>Visitor Roles Distribution</CardTitle>
                  <CardDescription>Types of visitors interested in your company</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.visitorRoles.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground">No visitor role data yet</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Role distribution will appear as visitors engage
                      </p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={analytics.visitorRoles}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ role, percent }) => `${role} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {analytics.visitorRoles.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS.blue[index % COLORS.blue.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Visitor Intents */}
              <Card data-testid="card-chart-intents">
                <CardHeader>
                  <CardTitle>Visitor Intents</CardTitle>
                  <CardDescription>What visitors are looking for</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.visitorIntents.length === 0 ? (
                    <div className="text-center py-12">
                      <Target className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground">No intent data yet</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Visitor intent data will appear as they interact
                      </p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.visitorIntents} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis type="number" />
                        <YAxis dataKey="intent" type="category" width={150} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#10b981" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Top Interest Categories */}
              <Card data-testid="card-chart-categories">
                <CardHeader>
                  <CardTitle>Top Interest Categories</CardTitle>
                  <CardDescription>Most searched product categories</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.topInterestCategories.length === 0 ? (
                    <div className="text-center py-12">
                      <Briefcase className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground">No category data yet</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Category interest will appear as visitors search
                      </p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.topInterestCategories}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Top Interested Companies */}
              <Card data-testid="card-list-companies">
                <CardHeader>
                  <CardTitle>Top Interested Companies</CardTitle>
                  <CardDescription>Companies searching for your products</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.topCompanies.length === 0 ? (
                    <div className="text-center py-12">
                      <Building2 className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground">No company data yet</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Company interest will appear as visitors search for you
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {analytics.topCompanies.map((company, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-950/20 hover-elevate"
                          data-testid={`list-item-company-${index}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-semibold">{company.company}</p>
                              <p className="text-xs text-muted-foreground">
                                {company.searches} {company.searches === 1 ? 'search' : 'searches'}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" data-testid={`badge-searches-${index}`}>
                            {company.searches}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Co-Searched Exhibitors */}
              <Card data-testid="card-list-cosearched">
                <CardHeader>
                  <CardTitle>Co-Searched Exhibitors</CardTitle>
                  <CardDescription>Exhibitors searched alongside your company</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.coSearchedExhibitors.length === 0 ? (
                    <div className="text-center py-12">
                      <Share2 className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground">No co-search data yet</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Competitor insights will appear as visitors compare exhibitors
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {analytics.coSearchedExhibitors.map((exhibitor, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-orange-50 to-transparent dark:from-orange-950/20 hover-elevate"
                          data-testid={`list-item-cosearched-${index}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-semibold">{exhibitor.exhibitorName}</p>
                              <p className="text-xs text-muted-foreground">
                                Co-searched {exhibitor.coSearches} {exhibitor.coSearches === 1 ? 'time' : 'times'}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" data-testid={`badge-cosearches-${index}`}>
                            {exhibitor.coSearches}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
