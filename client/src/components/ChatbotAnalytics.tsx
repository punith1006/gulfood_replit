import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MessageSquare, ThumbsUp, ThumbsDown, TrendingUp, Clock, AlertCircle, Download, Smile, Frown, Meh, CalendarIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("authToken");
  const headers: Record<string, string> = {};
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  return headers;
}

interface ConversationMetrics {
  totalConversations: number;
  totalMessages: number;
  totalFeedbackActions: number;
  satisfactionRate: number;
  avgMessagesPerConversation: number;
  avgDurationPerConversation: number;
}

interface SentimentDistribution {
  Enthusiastic: number;
  Satisfied: number;
  Neutral: number;
  Frustrated: number;
  Confused: number;
}

interface TopicItem {
  topic: string;
  count: number;
  userRole: 'visitor' | 'exhibitor' | null;
}

interface FallbackStats {
  fallbackRate: number;
  topFallbackTopics: Array<{ topic: string; count: number }>;
  topicsWithHighestDislikes: Array<{ topic: string; dislikes: number }>;
}

interface HourlyActivity {
  hour: number;
  count: number;
}

interface SentimentJourneyData {
  transitions: Array<{
    from: string;
    to: string;
    count: number;
  }>;
  resolutionRate: number;
}

interface ChatbotAnalytics {
  metrics: ConversationMetrics;
  sentiment: SentimentDistribution;
  topics: {
    visitor: TopicItem[];
    exhibitor: TopicItem[];
  };
  fallbacks: FallbackStats;
  peakHours: HourlyActivity[];
  sentimentJourney: SentimentJourneyData;
}

const SENTIMENT_COLORS = {
  Enthusiastic: 'hsl(var(--chart-1))',
  Satisfied: 'hsl(var(--chart-2))',
  Neutral: 'hsl(var(--chart-3))',
  Frustrated: 'hsl(var(--chart-4))',
  Confused: 'hsl(var(--chart-5))'
};

function getSentimentColor(sentiment: string): string {
  switch(sentiment) {
    case 'Enthusiastic': return 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-700';
    case 'Satisfied': return 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-700';
    case 'Neutral': return 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-700';
    case 'Frustrated': return 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-700';
    case 'Confused': return 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-700';
    default: return '';
  }
}

function isLast7Days(range: { start: Date; end: Date }) {
  const diff = range.end.getTime() - range.start.getTime();
  const days = diff / (24 * 60 * 60 * 1000);
  return Math.abs(days - 7) < 1;
}

function isLast30Days(range: { start: Date; end: Date }) {
  const diff = range.end.getTime() - range.start.getTime();
  const days = diff / (24 * 60 * 60 * 1000);
  return Math.abs(days - 30) < 1;
}

function isLast90Days(range: { start: Date; end: Date }) {
  const diff = range.end.getTime() - range.start.getTime();
  const days = diff / (24 * 60 * 60 * 1000);
  return Math.abs(days - 90) < 1;
}

export default function ChatbotAnalytics() {
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date()
  });

  const setPresetRange = (days: number) => {
    setDateRange({
      start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      end: new Date()
    });
  };

  const { data: analytics, isLoading } = useQuery<ChatbotAnalytics>({
    queryKey: ['/api/analytics/chatbot/overview', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString()
      });
      const authHeaders = getAuthHeaders();
      const response = await fetch(`/api/analytics/chatbot/overview?${params}`, {
        headers: authHeaders,
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      return response.json();
    },
    refetchInterval: 30000
  });

  const exportToCSV = () => {
    if (!analytics) return;

    const rows = [
      ['Chatbot Analytics Export', ''],
      ['Date Range', `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`],
      ['', ''],
      ['Metrics', ''],
      ['Total Conversations', analytics.metrics.totalConversations],
      ['Total Messages', analytics.metrics.totalMessages],
      ['Total Feedback Actions', analytics.metrics.totalFeedbackActions],
      ['Satisfaction Rate', `${analytics.metrics.satisfactionRate}%`],
      ['Avg Messages/Conversation', analytics.metrics.avgMessagesPerConversation],
      ['Avg Duration/Conversation', `${analytics.metrics.avgDurationPerConversation} min`],
      ['', ''],
      ['Sentiment Distribution', ''],
      ['Enthusiastic', analytics.sentiment.Enthusiastic],
      ['Satisfied', analytics.sentiment.Satisfied],
      ['Neutral', analytics.sentiment.Neutral],
      ['Frustrated', analytics.sentiment.Frustrated],
      ['Confused', analytics.sentiment.Confused],
      ['', ''],
      ['Fallback Stats', ''],
      ['Fallback Rate', `${analytics.fallbacks.fallbackRate}%`]
    ];

    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chatbot-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = [
    {
      label: "Total Conversations",
      value: analytics?.metrics.totalConversations?.toString() || "0",
      icon: MessageSquare,
      color: "text-chart-1",
      bgColor: "bg-chart-1/10"
    },
    {
      label: "Total Messages",
      value: analytics?.metrics.totalMessages?.toString() || "0",
      icon: MessageSquare,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10"
    },
    {
      label: "Total Feedback",
      value: analytics?.metrics.totalFeedbackActions?.toString() || "0",
      icon: ThumbsUp,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10"
    },
    {
      label: "Satisfaction Rate",
      value: `${analytics?.metrics.satisfactionRate || 0}%`,
      icon: Smile,
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
      highlight: true
    },
    {
      label: "Avg Messages/Conv",
      value: analytics?.metrics.avgMessagesPerConversation?.toFixed(1) || "0.0",
      icon: TrendingUp,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10"
    },
    {
      label: "Avg Duration",
      value: `${analytics?.metrics.avgDurationPerConversation?.toFixed(1) || "0.0"} min`,
      icon: Clock,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10"
    }
  ];

  const sentimentData = analytics ? [
    { name: 'Enthusiastic', value: analytics.sentiment.Enthusiastic, color: SENTIMENT_COLORS.Enthusiastic },
    { name: 'Satisfied', value: analytics.sentiment.Satisfied, color: SENTIMENT_COLORS.Satisfied },
    { name: 'Neutral', value: analytics.sentiment.Neutral, color: SENTIMENT_COLORS.Neutral },
    { name: 'Frustrated', value: analytics.sentiment.Frustrated, color: SENTIMENT_COLORS.Frustrated },
    { name: 'Confused', value: analytics.sentiment.Confused, color: SENTIMENT_COLORS.Confused }
  ] : [];

  const peakHoursData = analytics?.peakHours.map(h => ({
    hour: `${h.hour.toString().padStart(2, '0')}:00`,
    conversations: h.count
  })) || [];

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-2">
              Chatbot Analytics
            </h2>
            <p className="text-muted-foreground">
              Comprehensive AI chatbot performance metrics and insights
            </p>
          </div>
          <Button 
            variant="default" 
            className="gap-2"
            onClick={exportToCSV}
            disabled={!analytics}
            data-testid="button-export-csv"
          >
            <Download className="w-4 h-4" />
            Export to CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex gap-2">
          <Button
            variant={isLast7Days(dateRange) ? "default" : "outline"}
            size="sm"
            onClick={() => setPresetRange(7)}
            data-testid="button-preset-7days"
          >
            Last 7 Days
          </Button>
          <Button
            variant={isLast30Days(dateRange) ? "default" : "outline"}
            size="sm"
            onClick={() => setPresetRange(30)}
            data-testid="button-preset-30days"
          >
            Last 30 Days
          </Button>
          <Button
            variant={isLast90Days(dateRange) ? "default" : "outline"}
            size="sm"
            onClick={() => setPresetRange(90)}
            data-testid="button-preset-90days"
          >
            Last 90 Days
          </Button>
        </div>
        
        <div className="flex gap-2 items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-[280px] justify-start text-left font-normal"
                data-testid="button-custom-date-range"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(dateRange.start, "PPP")} - {format(dateRange.end, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Start Date</label>
                  <Calendar
                    mode="single"
                    selected={dateRange.start}
                    onSelect={(date) => date && setDateRange(prev => ({ ...prev, start: date }))}
                    disabled={(date) => date > new Date() || date > dateRange.end}
                    data-testid="calendar-start-date"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">End Date</label>
                  <Calendar
                    mode="single"
                    selected={dateRange.end}
                    onSelect={(date) => date && setDateRange(prev => ({ ...prev, end: date }))}
                    disabled={(date) => date > new Date() || date < dateRange.start}
                    data-testid="calendar-end-date"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className="p-6" data-testid={`card-chatbot-stat-${idx}`}>
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
                    {stat.highlight && (
                      <Badge variant="default" className="bg-chart-4/20 text-chart-4">
                        Key Metric
                      </Badge>
                    )}
                  </div>
                  <div className="text-3xl font-bold mb-1" data-testid={`text-chatbot-value-${idx}`}>
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </>
              )}
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6" data-testid="card-sentiment-distribution">
          <h3 className="text-xl font-bold mb-6">Sentiment Distribution</h3>
          {isLoading ? (
            <div className="h-[300px] bg-muted rounded animate-pulse" />
          ) : !analytics || sentimentData.every(d => d.value === 0) ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Meh className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No sentiment data available</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-6" data-testid="card-fallback-analysis">
          <h3 className="text-xl font-bold mb-6">Fallback Analysis</h3>
          {isLoading ? (
            <div className="h-[300px] bg-muted rounded animate-pulse" />
          ) : !analytics ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertCircle className={`w-6 h-6 ${analytics.fallbacks.fallbackRate > 15 ? 'text-destructive' : 'text-chart-4'}`} />
                  <div>
                    <div className="text-sm text-muted-foreground">Fallback Rate</div>
                    <div className="text-2xl font-bold">{analytics.fallbacks.fallbackRate}%</div>
                  </div>
                </div>
                <Badge variant={analytics.fallbacks.fallbackRate > 15 ? "destructive" : "default"}>
                  {analytics.fallbacks.fallbackRate > 15 ? 'Needs Improvement' : 'Good'}
                </Badge>
              </div>
              <div>
                <h4 className="font-semibold mb-3 text-sm text-muted-foreground">Top Fallback Topics</h4>
                <div className="space-y-2">
                  {analytics.fallbacks.topFallbackTopics.slice(0, 5).map((topic, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <span className="text-sm capitalize">{topic.topic}</span>
                      <Badge variant="secondary">{topic.count}</Badge>
                    </div>
                  ))}
                  {analytics.fallbacks.topFallbackTopics.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No fallback topics detected</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6" data-testid="card-peak-hours">
        <h3 className="text-xl font-bold mb-6">Peak Hours of Engagement</h3>
        {isLoading ? (
          <div className="h-[300px] bg-muted rounded animate-pulse" />
        ) : !analytics || peakHoursData.every(d => d.conversations === 0) ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No peak hours data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={peakHoursData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="conversations" fill="hsl(var(--chart-1))" name="Conversations" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card className="p-6" data-testid="card-topic-analysis">
        <h3 className="text-xl font-bold mb-6">Top Discussed Topics</h3>
        {isLoading ? (
          <div className="h-[300px] bg-muted rounded animate-pulse" />
        ) : !analytics ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No topics data available
          </div>
        ) : (
          <Tabs defaultValue="visitor" data-testid="tabs-topics">
            <TabsList>
              <TabsTrigger value="visitor" data-testid="tab-visitor">Visitor Topics</TabsTrigger>
              <TabsTrigger value="exhibitor" data-testid="tab-exhibitor">Exhibitor Topics</TabsTrigger>
            </TabsList>
            <TabsContent value="visitor">
              {analytics.topics.visitor.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  No visitor topics detected
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.topics.visitor} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="topic" type="category" width={150} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="hsl(var(--chart-2))" name="Mentions" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </TabsContent>
            <TabsContent value="exhibitor">
              {analytics.topics.exhibitor.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  No exhibitor topics detected
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.topics.exhibitor} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="topic" type="category" width={150} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="hsl(var(--chart-3))" name="Mentions" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </TabsContent>
          </Tabs>
        )}
      </Card>

      <Card className="p-6" data-testid="card-topics-highest-dislikes">
        <h3 className="text-xl font-bold mb-6">Topics with Highest Dislikes</h3>
        {isLoading ? (
          <div className="h-[200px] bg-muted rounded animate-pulse" />
        ) : !analytics || analytics.fallbacks.topicsWithHighestDislikes.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <ThumbsUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No disliked topics - Great job!</p>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {analytics.fallbacks.topicsWithHighestDislikes.map((topic, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg" data-testid={`dislike-topic-${idx}`}>
                <div className="flex items-center gap-3">
                  <ThumbsDown className="w-5 h-5 text-destructive" />
                  <span className="font-medium capitalize">{topic.topic}</span>
                </div>
                <Badge variant="destructive">{topic.dislikes} dislikes</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6" data-testid="card-sentiment-journey">
        <h3 className="text-xl font-bold mb-4">Sentiment Journey</h3>
        <p className="text-sm text-muted-foreground mb-4">
          How user sentiment changes during conversations
        </p>
        
        {isLoading ? (
          <div className="h-[300px] bg-muted rounded animate-pulse" />
        ) : !analytics || !analytics.sentimentJourney ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No sentiment journey data available
          </div>
        ) : (
          <>
            <div className="mb-6 p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
              <div className="text-2xl font-bold text-green-700 dark:text-green-300" data-testid="text-resolution-rate">
                {analytics.sentimentJourney.resolutionRate}%
              </div>
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                Negative → Positive Resolution Rate
              </div>
            </div>
            
            <div className="space-y-3">
              {analytics.sentimentJourney.transitions
                .sort((a, b) => b.count - a.count)
                .slice(0, 10)
                .map((transition, idx) => (
                  <div key={idx} className="flex items-center gap-4" data-testid={`sentiment-transition-${idx}`}>
                    <Badge 
                      variant="outline"
                      className={getSentimentColor(transition.from)}
                      data-testid={`badge-from-${transition.from.toLowerCase()}`}
                    >
                      {transition.from}
                    </Badge>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="h-1 flex-1 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded" />
                      <span className="text-xs text-muted-foreground" data-testid={`text-transition-count-${idx}`}>{transition.count}</span>
                    </div>
                    <Badge 
                      variant="outline"
                      className={getSentimentColor(transition.to)}
                      data-testid={`badge-to-${transition.to.toLowerCase()}`}
                    >
                      {transition.to}
                    </Badge>
                  </div>
                ))
              }
              {analytics.sentimentJourney.transitions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No sentiment transitions detected</p>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
