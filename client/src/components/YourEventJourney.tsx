import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { sessionManager } from "@/lib/sessionManager";
import { useChatbot } from "@/contexts/ChatbotContext";
import { useToast } from "@/hooks/use-toast";
import { 
  Sparkles, Building2, TrendingUp, ArrowRight, Loader2, MessageSquare, 
  MapPin, Calendar, Download, ChevronDown, ChevronUp, ExternalLink,
  Target, Lightbulb, Users, Star
} from "lucide-react";
import { cn } from "@/lib/utils";

interface JourneyPreview {
  id?: number;
  relevanceScore: number;
  overview: string;
  benefits: string[];
  recommendations: string[];
  matchedExhibitors: Array<{
    id: number;
    name: string;
    sector: string;
    country: string;
    venue: string;
    relevancePercentage?: number;
  }>;
  organization: string;
  role: string;
}

export default function YourEventJourney() {
  const [organization, setOrganization] = useState("");
  const [role, setRole] = useState("");
  const [preview, setPreview] = useState<JourneyPreview | null>(null);
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { openChatbotWithTab } = useChatbot();
  const { toast } = useToast();

  const generatePreview = useMutation({
    mutationFn: async (data: { organization: string; role: string }) => {
      const sessionId = sessionManager.getOrCreateSessionId();
      const response = await apiRequest("POST", "/api/journey/generate", {
        email: `preview-${Date.now()}@gulfood2026.com`,
        organization: data.organization,
        role: data.role,
        interestCategories: [],
        attendanceIntents: [],
        sessionId,
        numberOfDays: 5,
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      const score = typeof data.relevanceScore === 'number' ? Math.round(Math.max(0, Math.min(100, data.relevanceScore))) : 0;
      const overview = data.generalOverview || "We're analyzing your organization to provide personalized exhibitor recommendations.";
      const exhibitors = data.matchedExhibitors?.slice(0, 5) || [];
      const benefits = data.benefits || [];
      const recommendations = data.recommendations || [];
      
      setPreview({
        id: data.id,
        relevanceScore: score,
        overview,
        matchedExhibitors: exhibitors,
        benefits,
        recommendations,
        organization: organization,
        role: role,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to Generate Preview",
        description: error.message || "Please try again or contact support if the issue persists.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (organization && role) {
      generatePreview.mutate({ organization, role });
    }
  };

  const handleOpenFullJourney = () => {
    openChatbotWithTab('journey');
  };

  const handleExportPDF = async () => {
    if (!preview) return;
    
    setIsExporting(true);
    try {
      const sessionLead = sessionManager.getLeadInfo();
      const pdfData = {
        reportType: 'journey',
        userRole: 'visitor',
        sessionId: sessionManager.getOrCreateSessionId(),
        relevanceScore: preview.relevanceScore,
        overview: preview.overview,
        benefits: preview.benefits,
        recommendations: preview.recommendations,
        matchedExhibitors: preview.matchedExhibitors,
        name: sessionLead?.name || 'Guest',
        email: sessionLead?.email || `preview@gulfood2026.com`,
        organization: preview.organization,
        role: preview.role
      };
      
      const res = await apiRequest('POST', '/api/reports/generate', pdfData);
      const response = await res.json();
      
      if (response.reportId) {
        const link = document.createElement('a');
        link.href = `/api/reports/${response.reportId}/download`;
        link.download = `Gulfood_2026_Preview_Report.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Report downloaded successfully!" });
      }
    } catch (error) {
      console.error('Failed to export PDF:', error);
      toast({ title: "Failed to export report", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const truncatedOverview = preview?.overview.slice(0, 200) || "";
  const shouldShowReadMore = (preview?.overview.length || 0) > 200;

  return (
    <section className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Discover which exhibitors at Gulfood 2026 are most relevant to your business.
          </h2>
        </div>

        {!preview ? (
          <div className="max-w-4xl mx-auto">
            <div className="p-8 md:p-12 bg-card rounded-xl shadow-lg">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex flex-wrap items-center justify-center gap-4 text-lg">
                  <span className="font-medium text-foreground">I work at</span>
                  
                  <Input
                    type="text"
                    placeholder="e.g. Balfour Beatty"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    required
                    className="max-w-[280px] text-base border-border/60 bg-background focus-visible:border-primary"
                    data-testid="input-organization"
                  />

                  <span className="font-medium text-foreground">as a</span>

                  <Select value={role} onValueChange={setRole} required>
                    <SelectTrigger 
                      className="max-w-[220px] text-base border-border/60 bg-background focus:border-primary"
                      data-testid="select-role"
                    >
                      <SelectValue placeholder="e.g. Director" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CEO / Founder">CEO / Founder</SelectItem>
                      <SelectItem value="Product Manager">Product Manager</SelectItem>
                      <SelectItem value="Procurement Manager">Procurement Manager</SelectItem>
                      <SelectItem value="Sales Manager">Sales Manager</SelectItem>
                      <SelectItem value="Marketing Manager">Marketing Manager</SelectItem>
                      <SelectItem value="Director">Director</SelectItem>
                      <SelectItem value="Distributor">Distributor</SelectItem>
                      <SelectItem value="Buyer">Buyer</SelectItem>
                      <SelectItem value="Business Development">Business Development</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-center pt-2">
                  <Button 
                    type="submit" 
                    size="lg"
                    disabled={generatePreview.isPending || !organization || !role}
                    className="bg-[#F7C948] text-gray-900 font-semibold gap-2 shadow-md border-[#F7C948]"
                    data-testid="button-generate-preview"
                  >
                    {generatePreview.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Why should I attend?
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Event Header */}
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 md:p-10 rounded-2xl border border-primary/20">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex-1 space-y-3">
                  <h3 className="text-3xl md:text-4xl font-bold">Gulfood 2026</h3>
                  <div className="flex flex-wrap gap-4 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>Dubai World Trade Centre & Dubai Exhibition Centre</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>January 26-30, 2026</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center p-6 bg-background rounded-xl border-2 border-primary shadow-lg">
                  <div className="text-5xl font-bold text-primary mb-1" data-testid="text-relevance-score">{preview.relevanceScore}</div>
                  <div className="text-sm text-muted-foreground font-medium">Relevance Score</div>
                </div>
              </div>
            </div>

            {/* Overview Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Your Personalized Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-muted-foreground leading-relaxed" data-testid="text-overview">
                    {isOverviewExpanded || !shouldShowReadMore ? preview.overview : `${truncatedOverview}...`}
                  </p>
                  {shouldShowReadMore && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsOverviewExpanded(!isOverviewExpanded)}
                      className="mt-2 gap-1"
                      data-testid="button-toggle-overview"
                    >
                      {isOverviewExpanded ? (
                        <>
                          Read less <ChevronUp className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          Read more <ChevronDown className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    variant="outline"
                    className="gap-2"
                    data-testid="button-save-report"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Save Report
                      </>
                    )}
                  </Button>
                  <Button
                    asChild
                    className="gap-2"
                    data-testid="button-register"
                  >
                    <a href="https://www.gulfood.com/visit" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                      Register for Gulfood 2026
                    </a>
                  </Button>
                  <Button
                    onClick={handleOpenFullJourney}
                    variant="default"
                    className="gap-2"
                    data-testid="button-plan-journey"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Plan My Full Journey
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Highlights Section */}
            {(preview.benefits.length > 0 || preview.recommendations.length > 0) && (
              <div className="space-y-4">
                <h3 className="text-2xl font-bold">Your Personalized Highlights</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {preview.benefits.slice(0, 4).map((benefit, index) => (
                    <Card key={`benefit-${index}`} className="hover-elevate active-elevate-2 transition-all" data-testid={`card-benefit-${index}`}>
                      <CardContent className="p-6">
                        <div className="flex gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Target className="w-5 h-5 text-primary" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm leading-relaxed" data-testid={`text-benefit-${index}`}>{benefit}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {preview.recommendations.slice(0, 2).map((recommendation, index) => (
                    <Card key={`rec-${index}`} className="hover-elevate active-elevate-2 transition-all" data-testid={`card-recommendation-${index}`}>
                      <CardContent className="p-6">
                        <div className="flex gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Lightbulb className="w-5 h-5 text-primary" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm leading-relaxed" data-testid={`text-recommendation-${index}`}>{recommendation}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Top Matched Exhibitors */}
            {preview.matchedExhibitors.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-2xl font-bold">
                  Top {preview.matchedExhibitors.length} Exhibitors You Should Visit
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {preview.matchedExhibitors.map((exhibitor, index) => {
                    const matchScore = exhibitor.relevancePercentage || 85;
                    return (
                      <Card
                        key={exhibitor.id}
                        className="hover-elevate active-elevate-2 transition-all"
                        data-testid={`exhibitor-${exhibitor.id}`}
                      >
                        <CardContent className="p-6">
                          <div className="flex flex-wrap items-start gap-4">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-lg flex-shrink-0">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4 mb-2">
                                <h4 className="font-semibold text-lg">{exhibitor.name}</h4>
                                <Badge variant="secondary" className="flex-shrink-0" data-testid={`badge-match-${exhibitor.id}`}>
                                  <Star className="w-3 h-3 mr-1" />
                                  {Math.round(matchScore)}% match
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-3.5 h-3.5" />
                                  {exhibitor.sector}
                                </span>
                                <span>•</span>
                                <span>{exhibitor.country}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {exhibitor.venue}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* FOMO Bottom Section */}
            <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/30">
              <CardContent className="p-8 md:p-10">
                <div className="text-center space-y-6">
                  <div className="flex items-center justify-center">
                    <div className="p-4 bg-primary/10 rounded-full">
                      <Users className="w-12 h-12 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl md:text-3xl font-bold mb-3">
                      This is Just the Beginning!
                    </h3>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                      Unlock your complete personalized journey with day-by-day schedules, 
                      smart venue navigation, priority exhibitor recommendations, and direct meeting booking. 
                      Get the full Gulfood 2026 experience tailored specifically for {preview.organization}.
                    </p>
                  </div>
                  <Button 
                    size="lg" 
                    onClick={handleOpenFullJourney}
                    className="gap-2 text-lg px-8"
                    data-testid="button-unlock-full-journey"
                  >
                    <Sparkles className="w-5 h-5" />
                    Unlock My Full Journey Plan
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Takes less than 2 minutes • Completely free • No registration required
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </section>
  );
}
