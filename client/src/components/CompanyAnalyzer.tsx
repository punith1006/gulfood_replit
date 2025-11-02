import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Sparkles, TrendingUp, Target, Award } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CompanyAnalysis } from "@shared/schema";

export default function CompanyAnalyzer() {
  const [companyUrl, setCompanyUrl] = useState("");
  const [result, setResult] = useState<CompanyAnalysis | null>(null);
  const { toast } = useToast();

  const analyzeMutation = useMutation({
    mutationFn: async (companyIdentifier: string) => {
      const res = await apiRequest("POST", "/api/analyze-company", { companyIdentifier });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to analyze company");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      toast({
        title: "Analysis Complete",
        description: "Your company profile has been analyzed successfully."
      });
    },
    onError: (error: Error) => {
      const errorMessage = error.message || "Unable to analyze company. Please try again.";
      toast({
        title: "Analysis Failed",
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
            <Card className="p-8 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2" data-testid="text-company-name">{result.companyName}</h3>
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

                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Matched Exhibitors
                    </span>
                    <span className="text-lg font-bold text-primary" data-testid="text-matched-exhibitors">
                      {result.matchedExhibitorsCount}
                    </span>
                  </div>
                  <Button className="w-full" data-testid="button-view-recommendations">
                    View Personalized Recommendations
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}
