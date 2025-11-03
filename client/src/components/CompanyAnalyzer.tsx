import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Sparkles, TrendingUp, Target, Award, X, Lightbulb, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CompanyAnalysis } from "@shared/schema";

// Extended type to include matched exhibitor details from API
type CompanyAnalysisWithExhibitors = CompanyAnalysis & {
  matchedExhibitors?: Array<{
    id: number;
    name: string;
    sector: string;
    booth: string;
  }>;
};

// Helper function to parse recommendation format
const parseRecommendation = (rec: string) => {
  // Format: "Recommendation: [action] - Logic: [why this helps]"
  const parts = rec.split(" - Logic: ");
  if (parts.length === 2) {
    const action = parts[0].replace("Recommendation: ", "").trim();
    const logic = parts[1].trim();
    return { action, logic };
  }
  // Fallback if format doesn't match
  return { action: rec, logic: null };
};

export default function CompanyAnalyzer() {
  const [companyUrl, setCompanyUrl] = useState("");
  const [result, setResult] = useState<CompanyAnalysisWithExhibitors | null>(null);
  const recommendationsRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const analyzeMutation = useMutation({
    mutationFn: async (companyIdentifier: string) => {
      try {
        const res = await apiRequest("POST", "/api/analyze-company", { companyIdentifier });
        const data = await res.json();
        return data;
      } catch (error) {
        console.error("Analysis request failed:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      setResult(data);
      toast({
        title: "Analysis Complete",
        description: "Your company profile has been analyzed successfully."
      });
    },
    onError: (error: Error) => {
      let errorMessage = "Unable to analyze company. Please try again.";
      
      if (error.message) {
        if (error.message.includes("503")) {
          errorMessage = "AI analysis is currently unavailable. Please try again later.";
        } else if (error.message.includes("valid company name or website")) {
          // Extract the full validation error message from backend
          const match = error.message.match(/doesn't appear to be a valid[^.]+\./);
          errorMessage = match ? match[0] + " Please enter a real company name or website URL (e.g., 'Almarai' or 'nestlé.com')." : error.message;
        } else if (error.message.includes("400")) {
          errorMessage = "Please enter a valid company name or website.";
        } else if (error.message.includes("parse") || error.message.includes("invalid")) {
          errorMessage = "Received invalid response from AI. Please try again.";
        } else {
          // Clean up the error message
          errorMessage = error.message.replace(/^\d+:\s*/, '').replace(/^{?"error"?:?"?/, '').replace(/"}?$/, '');
        }
      }
      
      toast({
        title: "Invalid Input",
        description: errorMessage,
        variant: "destructive"
      });
      console.error("Analysis error:", error);
    }
  });

  const handleAnalyze = () => {
    if (!companyUrl.trim()) return;
    analyzeMutation.mutate(companyUrl);
  };

  const handleClearResults = () => {
    setResult(null);
  };

  return (
    <section className="py-20 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge className="mb-4" variant="secondary" data-testid="badge-ai-powered">
            <Sparkles className="w-3 h-3 mr-1.5" />
            AI-Powered Analysis
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Discover Your Perfect Match
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Enter your company website and let our AI analyze your business profile to show why Gulfood 2026 is perfect for you.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <Card className="p-8">
            <div className="space-y-6">
              <div>
                <Label htmlFor="company-url" className="text-base font-semibold mb-3 block">
                  Company Website or Name
                </Label>
                <div className="flex gap-3">
                  <Input
                    id="company-url"
                    type="text"
                    placeholder="www.yourcompany.com"
                    value={companyUrl}
                    onChange={(e) => setCompanyUrl(e.target.value)}
                    className="flex-1"
                    data-testid="input-company-url"
                    onKeyPress={(e) => e.key === "Enter" && handleAnalyze()}
                  />
                  <Button
                    onClick={handleAnalyze}
                    disabled={analyzeMutation.isPending || !companyUrl}
                    className="gap-2"
                    data-testid="button-analyze"
                  >
                    {analyzeMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        Analyze
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Our AI will analyze your business and provide personalized insights
                </p>
              </div>

              {analyzeMutation.isPending && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing company profile...
                  </div>
                  <Progress value={66} className="h-2" />
                </div>
              )}
            </div>
          </Card>

          {result && (
            <Card className="p-8 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4"
                onClick={handleClearResults}
                data-testid="button-close-results"
              >
                <X className="w-4 h-4" />
              </Button>
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2 pr-8" data-testid="text-company-name">{result.companyName}</h3>
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    {result.sector.map((s, idx) => (
                      <Badge key={idx} variant="secondary">{s}</Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-company-summary">
                    {result.summary}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold">Relevance Score</span>
                    <span className="text-2xl font-bold text-primary" data-testid="text-relevance-score">
                      {result.relevanceScore}%
                    </span>
                  </div>
                  <Progress value={result.relevanceScore} className="h-3" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {result.relevanceScore >= 80 ? "Excellent" : result.relevanceScore >= 60 ? "Good" : "Fair"} match for Gulfood 2026
                  </p>
                  {result.scoreReasoning && (
                    <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                      <p className="text-sm font-medium mb-1 text-foreground">Why this score?</p>
                      <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-score-reasoning">
                        {result.scoreReasoning}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Award className="w-4 h-4 text-primary" />
                    Why Gulfood 2026 is Perfect for You
                  </div>
                  <ul className="space-y-2">
                    {result.benefits.map((benefit, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-muted-foreground">
                        <TrendingUp className="w-4 h-4 text-chart-3 flex-shrink-0 mt-0.5" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {result.recommendations && result.recommendations.length > 0 && (
                  <div ref={recommendationsRef} className="space-y-3 pt-4 border-t border-border">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Lightbulb className="w-4 h-4 text-primary" />
                      Personalized Recommendations
                    </div>
                    <ul className="space-y-3">
                      {result.recommendations.map((rec, idx) => {
                        const { action, logic } = parseRecommendation(rec);
                        return (
                          <li key={idx} className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <ArrowRight className="w-3.5 h-3.5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-foreground mb-1.5" data-testid={`text-recommendation-${idx}`}>
                                  {action}
                                </p>
                                {logic && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs font-medium text-primary/80 flex-shrink-0 mt-0.5">Why:</span>
                                    <p className="text-xs text-muted-foreground leading-relaxed" data-testid={`text-recommendation-logic-${idx}`}>
                                      {logic}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                <div className="pt-4 border-t border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold">
                      Matched Exhibitors ({result.matchedExhibitorsCount})
                    </span>
                  </div>
                  {result.matchedExhibitors && result.matchedExhibitors.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {result.matchedExhibitors.map((exhibitor, idx) => (
                        <div 
                          key={exhibitor.id} 
                          className="p-3 bg-muted/30 rounded-md hover-elevate"
                          data-testid={`matched-exhibitor-${idx}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-foreground">
                                {exhibitor.name}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {exhibitor.sector}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {exhibitor.booth}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No matched exhibitors available
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}
