import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useChatbot } from "@/contexts/ChatbotContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Building2,
  Users,
  Download,
  MapPin,
  Clock,
  Coffee,
  Navigation,
  Utensils,
  Loader2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { sessionManager } from "@/lib/sessionManager";
import { useToast } from "@/hooks/use-toast";

interface Activity {
  type: 'exhibitor_visit' | 'session' | 'break' | 'travel';
  title: string;
  startTime: string;
  endTime: string;
  duration: number;
  location?: string;
  venue?: string;
  hall?: string;
  booth?: string;
  stand?: string; // Deprecated: Use booth instead
  exhibitorName?: string;
  description?: string;
  relevanceScore?: number;
  travelFrom?: string;
  travelTo?: string;
}

interface Day {
  date: string;
  dayOfWeek: string;
  summary: string;
  activities: Activity[];
}

interface Itinerary {
  name: string;
  organization: string;
  role: string;
  days: Day[];
  totalExhibitors: number;
  totalSessions: number;
}

function ActivityCard({ activity }: { activity: Activity }) {
  const getActivityIcon = () => {
    switch (activity.type) {
      case 'exhibitor_visit':
        return <Building2 className="w-5 h-5 text-primary" />;
      case 'session':
        return <Users className="w-5 h-5 text-accent" />;
      case 'break':
        return activity.title.toLowerCase().includes('lunch') ? 
          <Utensils className="w-5 h-5 text-muted-foreground" /> : 
          <Coffee className="w-5 h-5 text-muted-foreground" />;
      case 'travel':
        return <Navigation className="w-5 h-5 text-muted-foreground" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getActivityStyles = () => {
    switch (activity.type) {
      case 'exhibitor_visit':
        return 'border-l-4 border-l-primary bg-primary/5';
      case 'session':
        return 'border-l-4 border-l-accent bg-accent/5';
      case 'break':
        return 'bg-muted/50';
      case 'travel':
        return 'bg-muted/30 border-dashed';
      default:
        return '';
    }
  };

  return (
    <Card 
      className={`p-4 hover-elevate transition-all ${getActivityStyles()}`}
      data-testid={`activity-${activity.type}`}
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0 flex flex-col items-center gap-2">
          {getActivityIcon()}
          <div className="text-xs text-muted-foreground text-center">
            <div className="font-medium">{activity.startTime}</div>
            <div className="text-[10px]">to</div>
            <div className="font-medium">{activity.endTime}</div>
          </div>
        </div>
        
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h5 className="font-semibold text-foreground" data-testid="activity-title">
              {activity.title}
            </h5>
            {activity.relevanceScore && (
              <Badge 
                variant="secondary"
                className="shrink-0 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                data-testid="activity-relevance"
              >
                {activity.relevanceScore}% match
              </Badge>
            )}
          </div>
          
          {activity.exhibitorName && (
            <p className="text-sm font-medium text-foreground">
              {activity.exhibitorName}
            </p>
          )}
          
          {activity.description && (
            <p className="text-sm text-muted-foreground leading-relaxed" data-testid="activity-description">
              {activity.description}
            </p>
          )}
          
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {activity.location && (
              <div className="flex items-center gap-1.5 text-muted-foreground" data-testid="activity-location">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>{activity.location}</span>
              </div>
            )}
            {(activity.venue || activity.hall || activity.booth) && (
              <span className="text-primary font-medium" data-testid="activity-venue-info">
                {activity.venue && `• ${activity.venue}`}
                {activity.hall && ` • ${activity.hall}`}
                {activity.booth && ` • Booth ${activity.booth}`}
              </span>
            )}
            {activity.travelFrom && activity.travelTo && (
              <div className="text-muted-foreground text-xs">
                {activity.travelFrom} → {activity.travelTo}
              </div>
            )}
            {activity.duration && activity.type !== 'travel' && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>{activity.duration} min</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function Itinerary() {
  const [, setLocation] = useLocation();
  const { itinerary, openChatbot } = useChatbot();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [selectedDay, setSelectedDay] = useState("day-0");

  useEffect(() => {
    if (!itinerary) {
      setLocation('/');
    }
  }, [itinerary, setLocation]);

  const handleExportPDF = async () => {
    if (!itinerary) return;
    
    setIsExporting(true);
    try {
      const sessionLead = sessionManager.getLeadInfo();
      const pdfData = {
        reportType: 'itinerary',
        userRole: 'visitor',
        sessionId: sessionManager.getOrCreateSessionId(),
        itinerary: itinerary,
        name: sessionLead?.name || itinerary?.name || 'Guest',
        email: sessionLead?.email || itinerary?.email || 'guest@gulfood2026.com',
        organization: itinerary?.organization || 'Guest Organization'
      };
      
      const res = await apiRequest('POST', '/api/reports/generate', pdfData);
      const response = await res.json();
      
      if (response.reportId) {
        const link = document.createElement('a');
        link.href = `/api/reports/${response.reportId}/download`;
        link.download = `Gulfood_2026_Itinerary.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Itinerary downloaded successfully!" });
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

  if (!itinerary) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="p-8 max-w-md w-full text-center space-y-4">
          <Clock className="w-16 h-16 mx-auto text-muted-foreground" />
          <h2 className="text-2xl font-bold text-foreground">No Itinerary Found</h2>
          <p className="text-muted-foreground">
            Generate your journey plan first to create a personalized itinerary.
          </p>
          <Button
            onClick={() => {
              openChatbot();
              setLocation('/');
            }}
            className="gap-2"
            data-testid="button-open-chatbot"
          >
            Open Chatbot
          </Button>
        </Card>
      </div>
    );
  }

  const typedItinerary = itinerary as Itinerary;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 md:gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBackToChatbot}
                data-testid="button-back-to-chatbot"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl md:text-4xl font-bold text-foreground tracking-tight">
                  Your Gulfood 2026 Itinerary
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  January 26-30, 2026 • Dubai World Trade Centre & Expo City Dubai
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
              {isExporting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Export PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <Card className="p-4 md:p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Attendee</p>
              <p className="font-semibold text-foreground" data-testid="text-attendee-name">
                {typedItinerary.name}
              </p>
            </div>
            {typedItinerary.organization && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Organization</p>
                <p className="font-medium text-foreground" data-testid="text-attendee-organization">
                  {typedItinerary.organization}
                </p>
              </div>
            )}
            {typedItinerary.role && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Role</p>
                <p className="font-medium text-foreground" data-testid="text-attendee-role">
                  {typedItinerary.role}
                </p>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4 md:gap-6 mt-6 pt-6 border-t border-border">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              <div>
                <span className="text-2xl font-bold text-foreground">{typedItinerary.totalExhibitors}</span>
                <span className="text-sm text-muted-foreground ml-2">Exhibitors</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-accent" />
              <div>
                <span className="text-2xl font-bold text-foreground">{typedItinerary.totalSessions}</span>
                <span className="text-sm text-muted-foreground ml-2">Sessions</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-6">
          <Tabs value={selectedDay} onValueChange={setSelectedDay} className="w-full">
            <TabsList className="w-full justify-start mb-6 flex-wrap h-auto gap-2">
              {typedItinerary.days.map((day, idx) => (
                <TabsTrigger 
                  key={idx} 
                  value={`day-${idx}`}
                  className="flex flex-col items-start px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  data-testid={`tab-day-${idx + 1}`}
                >
                  <span className="font-semibold">Day {idx + 1}</span>
                  <span className="text-xs opacity-80">{day.dayOfWeek}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            
            {typedItinerary.days.map((day, idx) => (
              <TabsContent key={idx} value={`day-${idx}`} className="space-y-6">
                <div className="pb-4 border-b border-border">
                  <h3 className="text-xl md:text-2xl font-bold text-foreground" data-testid="day-date">
                    {day.date} • {day.dayOfWeek}
                  </h3>
                  {day.summary && (
                    <p className="text-sm md:text-base text-muted-foreground mt-2 leading-relaxed" data-testid="day-summary">
                      {day.summary}
                    </p>
                  )}
                </div>
                
                <ScrollArea className="h-[calc(100vh-450px)] pr-4">
                  <div className="space-y-3">
                    {day.activities.length > 0 ? (
                      day.activities.map((activity, actIdx) => (
                        <ActivityCard key={actIdx} activity={activity} />
                      ))
                    ) : (
                      <Card className="p-8 text-center">
                        <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">No activities scheduled for this day.</p>
                      </Card>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        </Card>

        <div className="flex items-center justify-center gap-4 mt-6">
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
            {isExporting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Export PDF
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
