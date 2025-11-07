import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Building2, MessageSquare, ArrowUp, ArrowDown, Download, CheckCircle2, UserCheck, Mail, Share2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import analyticsImage from "@assets/generated_images/Analytics_dashboard_visualization_c400d7e3.png";
import { useToast } from "@/hooks/use-toast";
import EmbeddableWidgetGenerator from "@/components/EmbeddableWidgetGenerator";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Analytics {
  totalRegistrations: number;
  exhibitorSignups: number;
  aiInteractions: number;
  meetingRequests: number;
  sectorEngagement: Array<{ sector: string; count: number; percentage: number }>;
  aiAccuracy: number;
  totalFeedback: number;
}

interface Lead {
  id: number;
  name: string;
  email: string;
  category: string;
  message: string | null;
  status: string;
  createdAt: string;
}

interface ReferralStats {
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  platformBreakdown: Array<{
    platform: string;
    clicks: number;
    conversions: number;
  }>;
}

export default function AnalyticsDashboard() {
  const { toast } = useToast();
  
  const { data: analytics, isLoading } = useQuery<Analytics>({
    queryKey: ["/api/analytics"],
    refetchInterval: 10000
  });

  const { data: leads, isLoading: isLoadingLeads } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
    refetchInterval: 15000
  });

  const { data: referralStats, isLoading: isLoadingReferrals } = useQuery<ReferralStats>({
    queryKey: ["/api/referrals/stats"],
    refetchInterval: 15000
  });

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/reports/generate", {
        reportType: "analytics",
        userRole: "Organizer"
      });
      return await res.json();
    },
    onSuccess: (data) => {
      window.open(data.downloadUrl, '_blank');
      toast({
        title: "Report Generated",
        description: "Your analytics report has been downloaded successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive"
      });
    }
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
      label: "AI Chatbot Interactions",
      value: analytics?.aiInteractions?.toString() || "0",
      change: "+156%",
      trend: "up",
      icon: MessageSquare,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
      subtitle: `${analytics?.totalFeedback || 0} feedback responses`
    },
    {
      label: "AI Response Accuracy",
      value: `${analytics?.aiAccuracy || 95}%`,
      change: "+2%",
      trend: "up",
      icon: CheckCircle2,
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
      subtitle: `Based on ${analytics?.totalFeedback || 0} ratings`
    }
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight mb-2">
          Real-Time Event Intelligence
        </h2>
        <p className="text-muted-foreground mb-6">
          Comprehensive analytics and insights to make data-driven decisions for Gulfood 2026
        </p>
        <div className="flex gap-4 mb-6">
          <Button 
            variant="default" 
            className="gap-2"
            onClick={() => generateReportMutation.mutate()}
            disabled={generateReportMutation.isPending}
            data-testid="button-download-report"
          >
            <Download className="w-4 h-4" />
            {generateReportMutation.isPending ? "Generating..." : "Download Analytics Report"}
          </Button>
        </div>
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
                    {(stat as any).subtitle && (
                      <div className="text-xs text-muted-foreground mt-1">{(stat as any).subtitle}</div>
                    )}
                  </>
                )}
              </Card>
            );
          })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-6">Sector Engagement</h3>
            {isLoading ? (
              <div className="space-y-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2 animate-pulse">
                    <div className="h-4 bg-muted rounded" />
                    <div className="h-2 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {analytics?.sectorEngagement && analytics.sectorEngagement.length > 0 ? (
                  analytics.sectorEngagement.slice(0, 6).map((sector, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm">{sector.sector}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">{sector.count} exhibitors</span>
                          <span className="text-sm font-bold">{sector.percentage}%</span>
                        </div>
                      </div>
                      <Progress value={sector.percentage} className="h-2" />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No sector data available</p>
                )}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-orange-600" />
                <h3 className="text-xl font-bold">Recent Leads</h3>
              </div>
              <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                {leads?.length || 0} Total
              </Badge>
            </div>
            {isLoadingLeads ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2 animate-pulse">
                    <div className="h-4 bg-muted rounded" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : leads && leads.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {leads.slice(0, 10).map((lead) => (
                  <div 
                    key={lead.id} 
                    className="p-4 rounded-lg border border-border hover-elevate"
                    data-testid={`card-lead-${lead.id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{lead.name}</span>
                          <Badge 
                            variant="outline" 
                            className="text-xs"
                          >
                            {lead.category}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Mail className="w-3 h-3" />
                          {lead.email}
                        </div>
                        {lead.message && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {lead.message}
                          </p>
                        )}
                      </div>
                      <Badge 
                        variant={lead.status === "new" ? "default" : "secondary"}
                        className={lead.status === "new" ? "bg-orange-100 text-orange-700 text-xs" : "text-xs"}
                      >
                        {lead.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(lead.createdAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <UserCheck className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No leads captured yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Leads will appear here when visitors share their contact information
                </p>
              </div>
            )}
          </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-orange-600" />
                <h3 className="text-xl font-bold">Referral Analytics</h3>
              </div>
              <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                Social Sharing
              </Badge>
            </div>

            {isLoadingReferrals ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : referralStats ? (
              <>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {referralStats.totalClicks}
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Total Clicks
                    </div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {referralStats.totalConversions}
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Conversions
                    </div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
                    <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                      {referralStats.conversionRate}%
                    </div>
                    <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                      Conv. Rate
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-3">Platform Breakdown</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={referralStats.platformBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="platform" 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="clicks" fill="#3b82f6" name="Clicks" />
                      <Bar dataKey="conversions" fill="#f97316" name="Conversions" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Share2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No referral data yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Referral analytics will appear when visitors share Gulfood 2026
                </p>
              </div>
            )}
          </Card>

        <EmbeddableWidgetGenerator />
      </div>
    </div>
  );
}
