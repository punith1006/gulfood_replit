import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useChatbot } from "@/contexts/ChatbotContext";
import { useRole } from "@/contexts/RoleContext";
import { Globe, ArrowRight, Sparkles, Star, MapPin } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ExhibitorRecommendation {
  name: string;
  relevanceScore: number;
  sector: string;
  country: string;
  booth: string;
  venue: string;
  hall: string | null;
}

export default function JourneyPreview() {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [visitorRole, setVisitorRole] = useState("");
  const [recommendations, setRecommendations] = useState<ExhibitorRecommendation[]>([]);
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
      const response = await apiRequest("POST", "/api/journey/score", {
        websiteUrl,
        visitorRole,
        interestCategories: [], // Not needed for simplified version
      });

      // apiRequest already throws on non-OK responses, so no need to check response.ok
      const data = await response.json();
      
      // Take top 10 exhibitors
      const topExhibitors = data.scoredExhibitors
        .slice(0, 10)
        .map((item: any) => ({
          name: item.exhibitor.name,
          relevanceScore: item.score,
          sector: item.exhibitor.sector,
          country: item.exhibitor.country,
          booth: item.exhibitor.booth,
          venue: item.exhibitor.venue,
          hall: item.exhibitor.hall,
        }));
      
      setRecommendations(topExhibitors);
      toast({
        title: "Recommendations Ready!",
        description: `Found ${topExhibitors.length} highly relevant exhibitors for you`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate recommendations",
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
          {recommendations.length > 0 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500" />
                    Top Recommendations for You
                  </CardTitle>
                  <CardDescription>
                    Based on your organization profile, these exhibitors are highly relevant to your needs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {recommendations.map((exhibitor, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-lg border border-border hover-elevate bg-card"
                        data-testid={`recommendation-${index}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                              <h4 className="font-semibold text-foreground">{exhibitor.name}</h4>
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                                {Math.round(exhibitor.relevanceScore)}% Match
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{exhibitor.sector}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {exhibitor.venue} - {exhibitor.hall || 'TBD'}
                              </span>
                              <span>Booth: {exhibitor.booth}</span>
                              <span>{exhibitor.country}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* CTA to Full Journey */}
              <Card className="bg-gradient-to-br from-primary/10 to-blue-500/10 border-primary/20">
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
