import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useChatbot } from "@/contexts/ChatbotContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Calendar,
  Building2,
  Globe,
  Users,
  Sparkles,
  Download,
  ChevronDown,
  Target,
  Droplet,
  Zap,
  Package,
  TrendingUp,
  ShoppingCart,
  Award,
  MapPin,
  Clock,
  CheckCircle2,
  ThumbsUp,
  AlertCircle,
  XCircle,
  Check
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { sessionManager } from "@/lib/sessionManager";
import { useToast } from "@/hooks/use-toast";

export default function Itinerary() {
  const [, setLocation] = useLocation();
  const { journeyPlan, openChatbot } = useChatbot();
  const { toast } = useToast();
  const [isScoreJustificationExpanded, setIsScoreJustificationExpanded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!journeyPlan) {
      setLocation('/');
    }
  }, [journeyPlan, setLocation]);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const sessionLead = sessionManager.getLeadInfo();
      const pdfData = {
        reportType: 'journey_plan',
        userRole: 'visitor',
        sessionId: sessionManager.getOrCreateSessionId(),
        journeyPlan: journeyPlan,
        name: sessionLead.name || 'Guest',
        email: sessionLead.email || '',
        organization: ''
      };
      
      const res = await apiRequest('POST', '/api/reports/generate', pdfData);
      const response = await res.json();
      
      if (response.reportId) {
        const link = document.createElement('a');
        link.href = `/api/reports/${response.reportId}/download`;
        link.download = `Gulfood_2026_Journey_Plan.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Journey plan downloaded successfully!" });
      }
    } catch (error) {
      console.error('Failed to export PDF:', error);
      toast({ title: "Failed to export PDF", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleBackToChatbot = () => {
    openChatbot();
    setLocation('/');
  };

  if (!journeyPlan) {
    return null;
  }

  const sessionLead = sessionManager.getLeadInfo();

  const iconMap: Record<string, any> = {
    Target, Droplet, Zap, Package, Globe, TrendingUp, Users, ShoppingCart, Sparkles, Award, Building2
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b border-border print:hidden">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBackToChatbot}
                data-testid="button-back-to-chatbot"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                  Your Personalized Journey
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Gulfood 2026 • January 26-30, Dubai
                </p>
              </div>
            </div>
            <Button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="gap-2"
              size="lg"
              data-testid="button-export-pdf"
            >
              <Download className="w-5 h-5" />
              {isExporting ? "Exporting..." : "Export PDF"}
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {sessionLead.name && (
            <Card className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Attendee</p>
                  <p className="font-semibold text-foreground" data-testid="text-attendee-name">{sessionLead.name}</p>
                </div>
                {sessionLead.email && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Email</p>
                    <p className="font-medium text-foreground" data-testid="text-attendee-email">{sessionLead.email}</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          <Card className="p-8 space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground mb-2">Relevance Assessment</h2>
                <p className="text-muted-foreground">
                  How well Gulfood 2026 matches your interests and goals
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-5xl font-bold ${
                  journeyPlan.relevanceScore >= 80 ? 'text-green-600 dark:text-green-400' :
                  journeyPlan.relevanceScore >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                  journeyPlan.relevanceScore >= 40 ? 'text-orange-600 dark:text-orange-400' :
                  'text-red-600 dark:text-red-400'
                }`} data-testid="text-relevance-score">
                  {journeyPlan.relevanceScore}%
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              <Progress value={journeyPlan.relevanceScore} className="h-4" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  {journeyPlan.relevanceScore >= 80 ? (
                    <><CheckCircle2 className="w-4 h-4 inline text-green-600 dark:text-green-400" /> Excellent match</>
                  ) : journeyPlan.relevanceScore >= 60 ? (
                    <><ThumbsUp className="w-4 h-4 inline text-yellow-600 dark:text-yellow-400" /> Good match</>
                  ) : journeyPlan.relevanceScore >= 40 ? (
                    <><AlertCircle className="w-4 h-4 inline text-orange-600 dark:text-orange-400" /> Fair match</>
                  ) : (
                    <><XCircle className="w-4 h-4 inline text-red-600 dark:text-red-400" /> Limited match</>
                  )}
                </span>
                <span className="font-medium text-foreground">
                  {journeyPlan.relevanceScore >= 80 ? "Highly Recommended" : 
                   journeyPlan.relevanceScore >= 60 ? "Recommended" : 
                   journeyPlan.relevanceScore >= 40 ? "Potentially Relevant" : "Consider Carefully"}
                </span>
              </div>
            </div>

            {journeyPlan.scoreJustification && (
              <Collapsible 
                open={isScoreJustificationExpanded} 
                onOpenChange={setIsScoreJustificationExpanded}
              >
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-between hover-elevate h-auto p-4"
                    data-testid="button-toggle-justification"
                  >
                    <span className="font-medium text-foreground">Why this score?</span>
                    <ChevronDown 
                      className={`w-5 h-5 transition-transform duration-200 ${
                        isScoreJustificationExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                  <div className="p-6 bg-muted/50 rounded-lg border border-border">
                    <p className="text-muted-foreground leading-relaxed" data-testid="text-score-justification">
                      {journeyPlan.scoreJustification}
                    </p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </Card>

          {journeyPlan.generalOverview && (
            <Card className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Personalized Overview</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed text-lg" data-testid="text-overview">
                {journeyPlan.generalOverview}
              </p>
            </Card>
          )}

          {journeyPlan.matchedExhibitors && journeyPlan.matchedExhibitors.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Matched Exhibitors
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {journeyPlan.matchedExhibitors.length} companies aligned with your interests
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {journeyPlan.matchedExhibitors.map((exhibitor: any) => (
                  <Card key={exhibitor.id} className="p-6 hover-elevate transition-all" data-testid={`exhibitor-${exhibitor.id}`}>
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-foreground mb-1">
                            {exhibitor.companyName}
                          </h3>
                          {exhibitor.sector && (
                            <p className="text-sm text-muted-foreground">{exhibitor.sector}</p>
                          )}
                        </div>
                        <Badge 
                          className={`shrink-0 text-sm px-3 py-1 ${
                            exhibitor.relevancePercentage >= 80 ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                            exhibitor.relevancePercentage >= 60 ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' :
                            'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                          }`}
                        >
                          {exhibitor.relevancePercentage}% match
                        </Badge>
                      </div>
                      
                      {exhibitor.personalizedReason && (
                        <div className="p-4 bg-primary/5 border-l-4 border-primary rounded-r-lg">
                          <p className="text-sm font-medium text-primary mb-2">Why this matters to you:</p>
                          <p className="text-sm text-foreground leading-relaxed">
                            {exhibitor.personalizedReason}
                          </p>
                        </div>
                      )}
                      
                      {exhibitor.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {exhibitor.description}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border">
                        {exhibitor.country && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Globe className="w-4 h-4 text-primary" />
                            <span>{exhibitor.country}</span>
                          </div>
                        )}
                        {exhibitor.boothNumber && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4 text-primary" />
                            <span>Booth {exhibitor.boothNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {journeyPlan.matchedSessions && journeyPlan.matchedSessions.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Recommended Sessions
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {journeyPlan.matchedSessions.length} sessions tailored to your interests
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {journeyPlan.matchedSessions.map((session: any) => (
                  <Card key={session.id} className="p-6 hover-elevate transition-all" data-testid={`session-${session.id}`}>
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg font-semibold text-foreground flex-1">
                          {session.title}
                        </h3>
                        {session.relevancePercentage && (
                          <Badge variant="secondary" className="shrink-0">
                            {session.relevancePercentage}% match
                          </Badge>
                        )}
                      </div>
                      
                      {session.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {session.description}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span>{new Date(session.sessionDate).toLocaleDateString()}</span>
                        </div>
                        {session.sessionTime && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="w-4 h-4 text-primary" />
                            <span>{session.sessionTime}</span>
                          </div>
                        )}
                        {session.location && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="w-4 h-4 text-primary" />
                            <span>{session.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {journeyPlan.benefits && journeyPlan.benefits.length > 0 && (
              <Card className="p-8">
                <h2 className="text-2xl font-bold text-foreground mb-6">Key Benefits</h2>
                <ul className="space-y-4">
                  {journeyPlan.benefits.map((benefit: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-3" data-testid={`benefit-${idx}`}>
                      <div className="shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mt-0.5">
                        <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="text-muted-foreground leading-relaxed">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {journeyPlan.recommendations && journeyPlan.recommendations.length > 0 && (
              <Card className="p-8">
                <h2 className="text-2xl font-bold text-foreground mb-6">Recommendations</h2>
                <ol className="space-y-4">
                  {journeyPlan.recommendations.map((rec: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-3" data-testid={`recommendation-${idx}`}>
                      <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="text-muted-foreground leading-relaxed">{rec}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            )}
          </div>

          {journeyPlan.highlights && journeyPlan.highlights.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Event Highlights for You</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {journeyPlan.highlights.map((highlight: any, idx: number) => {
                  const IconComponent = iconMap[highlight.icon] || Target;
                  
                  return (
                    <Card key={idx} className="p-6 hover-elevate transition-all" data-testid={`highlight-${idx}`}>
                      <div className="space-y-4">
                        <div className="p-3 bg-primary/10 rounded-lg w-fit">
                          <IconComponent className="w-6 h-6 text-primary" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold text-foreground">
                            {highlight.title}
                          </h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {highlight.description}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-4 py-8 print:hidden">
            <Button
              variant="outline"
              size="lg"
              onClick={handleBackToChatbot}
              className="gap-2"
              data-testid="button-back-bottom"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Chatbot
            </Button>
            <Button
              size="lg"
              onClick={handleExportPDF}
              disabled={isExporting}
              className="gap-2"
              data-testid="button-export-bottom"
            >
              <Download className="w-5 h-5" />
              {isExporting ? "Exporting..." : "Export PDF"}
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
