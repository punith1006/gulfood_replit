import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useChatbot } from "@/contexts/ChatbotContext";
import { useRole } from "@/contexts/RoleContext";
import { Globe, ArrowRight, Sparkles, Star, MapPin, Lightbulb } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ExhibitorRecommendation {
  name: string;
  relevanceScore: number;
  sector: string;
  country: string;
  booth: string;
  venue: string;
  hall: string | null;
  description: string;
  personalizedReason: string;
}

interface Highlight {
  icon: string;
  title: string;
  description: string;
}

export default function JourneyPreview() {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [visitorRole, setVisitorRole] = useState("");
  const [exhibitors, setExhibitors] = useState<ExhibitorRecommendation[]>([]);
  const [relevanceScore, setRelevanceScore] = useState<number | null>(null);
  const [overview, setOverview] = useState<string>("");
  const [justification, setJustification] = useState<string>("");
  const [benefits, setBenefits] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { openChatbotWithTab } = useChatbot();
  const { userRole } = useRole();

  // Only show for visitors or users who haven't selected a role yet
  // Hide for exhibitors and organizers
  if (userRole === "exhibitor" || userRole === "organizer") {
    return null;
  }

  const handleGetRecommendations = async () => {
    if (!websiteUrl || !visitorRole) {
      toast({
        title: "Missing Information",
        description: "Please provide both your organization link and role",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/journey/preview", {
        websiteUrl,
        visitorRole,
      });

      // apiRequest already throws on non-OK responses, so no need to check response.ok
      const data = await response.json();
      
      // Set all the rich content
      setRelevanceScore(data.relevanceScore || 0);
      setOverview(data.generalOverview || "");
      setJustification(data.scoreJustification || "");
      setBenefits(data.benefits || []);
      setRecommendations(data.recommendations || []);
      setHighlights(data.highlights || []);
      
      // Parse top 5 matched exhibitors
      const topExhibitors = (data.matchedExhibitors || []).slice(0, 5).map((item: any) => ({
        name: item.name,
        relevanceScore: item.relevancePercentage,
        sector: item.sector,
        country: item.country,
        booth: item.boothNumber,
        venue: item.venue,
        hall: item.hall,
        description: item.description || "",
        personalizedReason: item.personalizedReason || ""
      }));
      
      setExhibitors(topExhibitors);
      toast({
        title: "Journey Preview Ready!",
        description: `Generated personalized recommendations with ${topExhibitors.length} matched exhibitors`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate journey preview",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="py-16 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center">
              <Globe className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-foreground">AI-Powered Journey Preview</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Get instant exhibitor recommendations based on your organization and role. 
              For a fully personalized itinerary with route planning, try our complete Journey Planner in the chat!
            </p>
          </div>

          {/* Input Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Quick Recommendations
              </CardTitle>
              <CardDescription>
                Tell us about your organization and we'll find the most relevant exhibitors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="website-url">Organization Website</Label>
                  <Input
                    id="website-url"
                    type="url"
                    placeholder="https://yourcompany.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    data-testid="input-website-url"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visitor-role">Your Role</Label>
                  <Select value={visitorRole} onValueChange={setVisitorRole}>
                    <SelectTrigger id="visitor-role" data-testid="select-visitor-role">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Business Owner">Business Owner</SelectItem>
                      <SelectItem value="Procurement Manager">Procurement Manager</SelectItem>
                      <SelectItem value="Chef/Culinary Professional">Chef/Culinary Professional</SelectItem>
                      <SelectItem value="Distributor/Wholesaler">Distributor/Wholesaler</SelectItem>
                      <SelectItem value="Restaurant Manager">Restaurant Manager</SelectItem>
                      <SelectItem value="Product Developer">Product Developer</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={handleGetRecommendations} 
                disabled={isLoading}
                className="w-full"
                size="lg"
                data-testid="button-get-recommendations"
              >
                {isLoading ? "Analyzing..." : "Get AI Recommendations"}
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          {relevanceScore !== null && (
            <div className="space-y-6">
              {/* Relevance Score Card */}
              <Card data-testid="card-relevance-score">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-6 flex-wrap">
                    <div className="flex-1 min-w-[250px]">
                      <h3 className="text-2xl font-bold text-foreground">Your Event Relevance Score</h3>
                      <p className="text-muted-foreground mt-2" data-testid="text-overview">{overview}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center">
                        <span className="text-3xl font-bold text-white" data-testid="text-relevance-score">{relevanceScore}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Justification Section */}
              {justification && (
                <Card data-testid="card-justification">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-primary" />
                      Why This Matters for You
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground" data-testid="text-justification">{justification}</p>
                  </CardContent>
                </Card>
              )}

              {/* Highlights/Benefits Section */}
              {highlights.length > 0 && (
                <Card data-testid="card-highlights">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-amber-500" />
                      Key Benefits
                    </CardTitle>
                    <CardDescription>
                      What makes Gulfood 2026 valuable for your organization
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      {highlights.map((highlight, idx) => (
                        <div key={idx} className="flex items-start gap-3" data-testid={`highlight-${idx}`}>
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Star className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground" data-testid={`highlight-title-${idx}`}>{highlight.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1" data-testid={`highlight-description-${idx}`}>{highlight.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recommendations Section */}
              {recommendations.length > 0 && (
                <Card data-testid="card-recommendations">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      Personalized Recommendations
                    </CardTitle>
                    <CardDescription>
                      Action items to maximize your Gulfood 2026 experience
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2" data-testid={`recommendation-${idx}`}>
                          <ArrowRight className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Top Matched Exhibitors */}
              {exhibitors.length > 0 && (
                <Card data-testid="card-exhibitors">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-primary" />
                      Top Matched Exhibitors
                    </CardTitle>
                    <CardDescription>
                      The most relevant exhibitors for your business based on AI analysis
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      {exhibitors.map((exhibitor, index) => (
                        <div
                          key={index}
                          className="p-4 rounded-lg border border-border hover-elevate bg-card"
                          data-testid={`exhibitor-${index}`}
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                              <div className="flex-1 min-w-[200px]">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <h4 className="font-semibold text-foreground" data-testid={`exhibitor-name-${index}`}>{exhibitor.name}</h4>
                                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-500/10 text-green-600 dark:text-green-400" data-testid={`exhibitor-score-${index}`}>
                                    {Math.round(exhibitor.relevanceScore)}% Match
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1" data-testid={`exhibitor-sector-${index}`}>{exhibitor.sector}</p>
                              </div>
                            </div>
                            
                            {exhibitor.personalizedReason && (
                              <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
                                <p className="text-sm text-foreground" data-testid={`exhibitor-reason-${index}`}>
                                  <span className="font-medium">Why this matches: </span>
                                  {exhibitor.personalizedReason}
                                </p>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {exhibitor.venue} - {exhibitor.hall || 'TBD'}
                              </span>
                              <span>Booth: {exhibitor.booth}</span>
                              <span>{exhibitor.country}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* CTA to Full Journey */}
              <Card className="bg-gradient-to-br from-primary/10 to-blue-500/10 border-primary/20" data-testid="card-cta">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="w-12 h-12 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                    <Globe className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">Want More?</h3>
                  <p className="text-muted-foreground max-w-xl mx-auto">
                    Get a fully personalized itinerary with optimized routes, time management, 
                    and detailed exhibitor analysis in our complete Journey Planner
                  </p>
                  <Button
                    onClick={() => openChatbotWithTab('journey')}
                    size="lg"
                    className="gap-2"
                    data-testid="button-open-full-journey"
                  >
                    Open Full Journey Planner
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
