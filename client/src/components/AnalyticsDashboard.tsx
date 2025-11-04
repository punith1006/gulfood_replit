import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Building2, MessageSquare, TrendingUp, ArrowUp, ArrowDown, Lock, BarChart3, Download, CheckCircle2, UserCheck, Mail, Tag } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import analyticsImage from "@assets/generated_images/Analytics_dashboard_visualization_c400d7e3.png";
import { useRole } from "@/contexts/RoleContext";
import { useChatbot } from "@/contexts/ChatbotContext";
import { useToast } from "@/hooks/use-toast";

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

export default function AnalyticsDashboard() {
  const { userRole, setUserRole } = useRole();
  const { openChatbot } = useChatbot();
  const { toast } = useToast();
  
  const { data: analytics, isLoading } = useQuery<Analytics>({
    queryKey: ["/api/analytics"],
    refetchInterval: 10000,
    enabled: userRole === "organizer" // Only fetch data when user is an organizer
  });

  const { data: leads, isLoading: isLoadingLeads } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
    refetchInterval: 15000,
    enabled: userRole === "organizer" // Only fetch leads when user is an organizer
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

  // Show locked state if user is not an organizer
  if (userRole !== "organizer") {
    return (
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-6">
              <Lock className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4">
              Analytics Dashboard
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mb-8">
              This dashboard is exclusively available to event organizers.
              Select "Organizer" role in Faris to access real-time analytics and insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                variant="default" 
                className="gap-2"
                onClick={() => {
                  setUserRole("organizer");
                }}
                data-testid="button-select-organizer-role"
              >
                <BarChart3 className="w-4 h-4" />
                Select Organizer Role
              </Button>
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={openChatbot}
                data-testid="button-open-faris"
              >
                <MessageSquare className="w-4 h-4" />
                Open Faris to Select Role
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

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
          <div className="flex gap-4 mb-8">
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
      </div>
    </section>
  );
}
