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
import { Sparkles, Building2, TrendingUp, ArrowRight, Loader2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface JourneyPreview {
  relevanceScore: number;
  overview: string;
  matchedExhibitors: Array<{
    id: number;
    name: string;
    sector: string;
    country: string;
    venue: string;
  }>;
}

export default function YourEventJourney() {
  const [organization, setOrganization] = useState("");
  const [role, setRole] = useState("");
  const [preview, setPreview] = useState<JourneyPreview | null>(null);
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
      
      setPreview({
        relevanceScore: score,
        overview,
        matchedExhibitors: exhibitors,
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
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Relevance Score Card */}
            <Card className="shadow-md border-border/40">
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">Your Relevance Score</h3>
                    <p className="text-muted-foreground">
                      How well Gulfood 2026 matches your business needs
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-6xl font-bold text-primary mb-2">
                      {preview.relevanceScore}
                      <span className="text-3xl text-muted-foreground">/100</span>
                    </div>
                    <Badge 
                      variant={preview.relevanceScore >= 80 ? "default" : "secondary"}
                      className="text-sm px-4 py-1"
                    >
                      {preview.relevanceScore >= 80 ? "Excellent Match" : "Good Match"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Overview Card */}
            <Card className="shadow-md border-border/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Personalized Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed text-base">
                  {preview.overview}
                </p>
              </CardContent>
            </Card>

            {/* Top Matched Exhibitors */}
            {preview.matchedExhibitors.length > 0 && (
              <Card className="shadow-md border-border/40">
                <CardHeader>
                  <CardTitle className="text-xl">
                    Top {preview.matchedExhibitors.length} Matched Exhibitors
                  </CardTitle>
                  <CardDescription>
                    Exhibitors most relevant to your business profile
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {preview.matchedExhibitors.map((exhibitor, index) => (
                      <div
                        key={exhibitor.id}
                        className="flex flex-wrap items-center gap-4 p-5 rounded-lg border border-border/40 bg-background hover-elevate active-elevate-2 transition-all"
                        data-testid={`exhibitor-${exhibitor.id}`}
                      >
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-lg">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-base mb-1">{exhibitor.name}</h4>
                          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                            <span>{exhibitor.sector}</span>
                            <span>•</span>
                            <span>{exhibitor.country}</span>
                            <span>•</span>
                            <span>{exhibitor.venue}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* CTA to Full Journey */}
            <Card className="shadow-md border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-8">
                <div className="text-center space-y-5">
                  <div>
                    <h3 className="text-2xl font-bold mb-3">Want the Complete Experience?</h3>
                    <p className="text-muted-foreground text-base max-w-2xl mx-auto">
                      Create your full personalized itinerary with day-by-day schedules, 
                      venue navigation, and all matched exhibitors & sessions.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                    <Button 
                      size="lg" 
                      onClick={handleOpenFullJourney}
                      className="gap-2"
                      data-testid="button-open-full-journey"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Plan My Full Journey
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline"
                      onClick={() => setPreview(null)}
                      data-testid="button-try-again"
                    >
                      Try Another Organization
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </section>
  );
}
