import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, X, Sparkles, Loader2, Users, Building2, BarChart3, UserPlus, ThumbsUp, ThumbsDown, Download, UserCheck, Globe, MessageSquare, Bell, Target, Droplet, Zap, Package, TrendingUp, ShoppingCart, Award, FileDown, CheckCircle2, AlertCircle, ChevronDown, Calendar, SlidersHorizontal, Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useRole, type UserRole } from "@/contexts/RoleContext";
import { useChatbot, type Language } from "@/contexts/ChatbotContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import farisAvatar from "@assets/generated_images/Circular_bot_head_portrait_241be4f6.png";
import ReferralWidget from "@/components/ReferralWidget";
import RegistrationShareWidget from "@/components/RegistrationShareWidget";
import ReferralShareCard from "@/components/ReferralShareCard";
import { sessionManager } from "@/lib/sessionManager";
import { GULFOOD_CATEGORIES } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import AppointmentSlotPicker from "@/components/AppointmentSlotPicker";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { createConversation, streamChatResponse } from "@/lib/externalBackend";

/**
 * Pre-processes AI response content before markdown parsing to prevent numbers from being
 * hidden due to list marker interpretation. Adds zero-width space to protect patterns like:
 * - "5000+ exhibitors" → would become "+ exhibitors" (unordered list)
 * - "5.6 million" → would become ". million" (markdown list parsing artifact)
 * - "50% growth" → would become "% growth" if at line start
 * - "$5.6 million" → currency with decimals
 * - "5,000-7,500 range" → numeric ranges with hyphens/dashes
 * 
 * Works for both streaming and stored content without breaking code blocks.
 */
function protectNumericPatterns(content: string): string {
  return content.split('\n').map(line => {
    if (/^\s*[\d,]+[+*]\s/.test(line)) {
      return '\u200B' + line;
    }
    if (/^\s*[\d,]+\.\d/.test(line)) {
      return '\u200B' + line;
    }
    if (/^\s*[\d,]+%/.test(line)) {
      return '\u200B' + line;
    }
    if (/^\s*[$€£¥]\s*[\d,]/.test(line)) {
      return '\u200B' + line;
    }
    if (/^\s*[\d,]+\s*[-–—]\s*[\d,]/.test(line)) {
      return '\u200B' + line;
    }
    return line;
  }).join('\n');
}

const ATTENDANCE_INTENTS = [
  "Discover new products and innovations",
  "Meet potential suppliers and partners",
  "Network with industry professionals",
  "Learn about market trends",
  "Source ingredients or products",
  "Find new distribution channels",
  "Attend conferences and seminars",
  "Explore investment opportunities",
  "Conduct competitor analysis",
  "Launch or promote new products",
  "Secure international buyers",
  "Research packaging solutions",
  "Explore sustainability initiatives",
  "Other"
] as const;

const roleQuickActions: Record<Exclude<UserRole, null>, string[]> = {
  visitor: [
    "Register Now",
    "View Event Schedule",
    "Browse Exhibitors",
    "Navigate the Venue",
    "Hotel Recommendations",
    "Food & Dining Guide",
    "On-Site Facilities",
    "Special Offers",
    "Networking Tips",
    "Download Venue Map",
    "Download Venue Guide"
  ],
  exhibitor: [
    "Discover Why Exhibit",
    "Review Booth Packages",
    "Understand Costs & ROI",
    "Explore Success Stories",
    "Meet Sales",
    "Navigate Registration Steps",
    "Secure Early-Bird Offers",
    "Choose the Right Hall",
    "Compare with Other Shows"
  ],
  organizer: [
    "View registration trends",
    "Exhibitor engagement metrics",
    "Revenue analytics",
    "Attendee demographics",
    "Event performance",
    "Real-time insights"
  ]
};

// Contextual prompts for quick actions - adds context when sending to chatbot
const quickActionPrompts: Record<string, string> = {
  // Visitor quick action prompts
  "View Event Schedule": "Show me the complete event schedule for Gulfood 2026, including all conferences, seminars, and special events happening each day from January 26-30, 2026.",
  "Browse Exhibitors": "Help me browse and discover exhibitors at Gulfood 2026. I'd like to see exhibitors by category, country, or sector so I can find companies relevant to my interests.",
  "Navigate the Venue": "I need help navigating the Gulfood 2026 venue. Can you explain the layout of Dubai Exhibition Centre (DEC) and Dubai World Trade Centre (DWTC), including how to get between halls and key locations?",
  "Hotel Recommendations": "Can you recommend hotels near the Gulfood 2026 venues (Dubai Exhibition Centre and Dubai World Trade Centre)? I'd like options with different price ranges and information about transportation to the event.",
  "Food & Dining Guide": "What food and dining options are available at the Gulfood 2026 venues? Tell me about restaurants, cafes, food courts, and any special dining experiences during the event.",
  "On-Site Facilities": "What facilities and amenities are available on-site at Gulfood 2026? I'd like to know about ATMs, prayer rooms, first aid, Wi-Fi, charging stations, lounges, and other visitor services.",
  "Special Offers": "Are there any special offers, promotions, or exclusive deals available for Gulfood 2026 visitors? This could include early bird registration, group discounts, hotel packages, or exhibitor promotions.",
  "Networking Tips": "Can you give me practical networking tips for Gulfood 2026? I want to make the most of my visit by connecting with the right people, including how to approach exhibitors, use the mobile app, and maximize networking opportunities.",
  "Download Venue Map": "I'd like to download a venue map for Gulfood 2026. Can you provide me with PDF maps for both Dubai Exhibition Centre (DEC) and Dubai World Trade Centre (DWTC) showing all halls, exhibitor locations, and key facilities?",
  "Download Venue Guide": "Can you provide me with the official Gulfood 2026 venue guide? I'd like a comprehensive PDF guide with exhibitor listings, event schedule, venue maps, transportation info, and visitor information.",
  
  // Exhibitor (prospective) quick action prompts
  "Discover Why Exhibit": "I'm considering exhibiting at Gulfood 2026. Can you explain the value proposition for exhibitors? I'd like to understand the visitor profile, buyer attendance statistics from previous years, what makes Gulfood unique compared to other F&B trade shows, and the key benefits of exhibiting.",
  "Review Booth Packages": "Walk me through the available booth packages for Gulfood 2026. I need to understand the different booth sizes, what's included in shell scheme versus raw space options, the pricing tiers, standard inclusions (furniture, lighting, signage), and any optional add-ons available.",
  "Understand Costs & ROI": "Help me estimate the total cost and potential ROI for exhibiting at Gulfood 2026. I want to know about typical lead volumes exhibitors generate, average deal sizes by sector, all-in costs including booth, marketing, travel, and any data on measurable outcomes from past exhibitors.",
  "Explore Success Stories": "Share some success stories and case studies from recent Gulfood exhibitors. I'd like to hear about specific results companies achieved, which halls or sectors they exhibited in, innovative tactics they used, and any testimonials or measurable ROI they reported.",
  "Navigate Registration Steps": "Outline the complete exhibitor registration process for Gulfood 2026. What are the application requirements, documentation needed, vetting timeline, approval process, contract terms, deposit structure, payment milestones, and key deadlines I need to be aware of?",
  "Secure Early-Bird Offers": "What early-bird incentives, discounts, or special offers are currently available for Gulfood 2026 exhibitors? I need details on deposit requirements, payment schedules, cancellation or modification policies, and all important booking deadlines to maximize savings.",
  "Choose the Right Hall": "Help me choose the best hall and location for my product category at Gulfood 2026. I want recommendations based on sector clustering, differences between DWTC and DEC venues, expected footfall patterns, proximity to complementary exhibitors, and visibility factors.",
  "Compare with Other Shows": "How does Gulfood 2026 compare to other leading global F&B trade shows like SIAL Paris, Anuga, or Food & Hotel Asia? I want to understand differences in audience reach, buyer quality, international attendance, cost-to-value ratio, and unique advantages of each show."
};

interface Message {
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
}

// Helper functions for NLP extraction
const extractEmail = (text: string): string | null => {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const match = text.match(emailRegex);
  return match ? match[0] : null;
};

const extractName = (text: string): string | null => {
  // Pattern 1: "I'm [Name]" or "I am [Name]"
  const pattern1 = /(?:I'm|I am|My name is|This is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i;
  const match1 = text.match(pattern1);
  if (match1 && match1[1]) {
    return match1[1].trim();
  }
  
  // Pattern 2: Sentence starting with a capitalized name
  const pattern2 = /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:here|speaking)/i;
  const match2 = text.match(pattern2);
  if (match2 && match2[1]) {
    return match2[1].trim();
  }
  
  return null;
};

const detectHighIntentKeywords = (text: string): boolean => {
  const highIntentKeywords = [
    "register", "registration", "sign up", "signup",
    "book", "booking", "reserve", "reservation",
    "exhibitor", "exhibit", "booth", "stand",
    "schedule", "meeting", "appointment",
    "attend", "visitor pass", "ticket",
    "pricing", "cost", "price", "payment",
    "contact", "reach out", "get in touch",
    "interested", "apply", "application"
  ];
  
  const lowerText = text.toLowerCase();
  return highIntentKeywords.some(keyword => lowerText.includes(keyword));
};

const detectJourneyIntent = (text: string): boolean => {
  const journeyKeywords = [
    "plan", "planning", "planner",
    "visit", "visiting",
    "itinerary", "itineraries",
    "schedule", "scheduling",
    "navigate", "navigation",
    "route", "routing",
    "journey", "trip",
    "where should i", "what should i",
    "how do i get", "guide me",
    "recommend", "suggestion",
    "explore", "discover"
  ];
  
  const lowerText = text.toLowerCase();
  return journeyKeywords.some(keyword => lowerText.includes(keyword));
};

const autoCategorizeConversation = (conversationText: string): string => {
  const lowerText = conversationText.toLowerCase();
  
  // Exhibitor-related keywords
  if (lowerText.match(/exhibitor|booth|stand|display|showcase|seller|vendor/i)) {
    return "exhibitor_interest";
  }
  
  // Visitor-related keywords
  if (lowerText.match(/visit|attend|register|ticket|visitor pass/i)) {
    return "visitor_registration";
  }
  
  // Meeting/networking keywords
  if (lowerText.match(/meeting|schedule|appointment|network|connect|buyer|seller/i)) {
    return "meeting_request";
  }
  
  // Product/company research keywords
  if (lowerText.match(/product|company|exhibitor list|find|search|looking for/i)) {
    return "product_research";
  }
  
  // General inquiry
  return "general_inquiry";
};

const getRoleWelcomeMessage = (role: UserRole): string => {
  if (!role) return "Ask me anything.....";
  
  const welcomeMessages = {
    visitor: "Welcome! 👋 I'm here to help you discover the best exhibitors, plan your journey across both venues (Dubai World Trade Centre & Expo City Dubai), and make the most of Gulfood 2026. What would you like to know?",
    exhibitor: "Welcome! 🤝 I'm here to help you connect with potential buyers, analyze competitors, optimize your booth strategy, and maximize your presence at Gulfood 2026. How can I assist you?",
    organizer: "Welcome! 📊 I'm here to provide you with registration analytics, engagement metrics, revenue insights, and real-time event performance data for Gulfood 2026. What insights do you need?"
  };
  
  return welcomeMessages[role];
};

const getScoreVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
  if (score >= 80) return "default";
  if (score >= 60) return "secondary";
  if (score >= 40) return "outline";
  return "destructive";
};

function RightNowContent() {
  const { userRole } = useRole();
  const { data: announcements, isLoading: announcementsLoading } = useQuery<any[]>({
    queryKey: ['/api/announcements'],
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery<any[]>({
    queryKey: ['/api/sessions'],
  });

  // Map role to capitalized format for targetAudience matching
  const roleAudienceMap: Record<string, string> = {
    'visitor': 'Visitor',
    'exhibitor': 'Exhibitor',
    'organizer': 'Organizer'
  };
  const userAudience = userRole ? roleAudienceMap[userRole] : null;

  // Filter announcements: active AND (targetAudience is "All" or matches user role)
  const activeAnnouncements = announcements?.filter(a => {
    if (!a.isActive) return false;
    if (!userAudience) return a.targetAudience === 'All'; // Show only "All" if no role selected
    return a.targetAudience === 'All' || a.targetAudience === userAudience;
  }) || [];

  // Filter sessions: active, upcoming AND (targetAudience is "All" or matches user role)
  const upcomingSessions = sessions?.filter(s => {
    if (!s.isActive) return false;
    const sessionDate = new Date(s.sessionDate);
    if (sessionDate < new Date()) return false;
    if (!userAudience) return s.targetAudience === 'All'; // Show only "All" if no role selected
    return s.targetAudience === 'All' || s.targetAudience === userAudience;
  }) || [];

  if (announcementsLoading || sessionsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (activeAnnouncements.length === 0 && upcomingSessions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No announcements or upcoming sessions at the moment.</p>
        <p className="text-xs mt-1">Check back later for updates!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activeAnnouncements.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Bell className="w-4 h-4 text-orange-600" />
            Announcements
          </h3>
          <div className="space-y-2">
            {activeAnnouncements.map((announcement: any) => (
              <Card key={announcement.id} className="p-3 hover-elevate" data-testid={`announcement-${announcement.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{announcement.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{announcement.message}</p>
                    {announcement.targetAudience && (
                      <Badge variant="secondary" className="mt-2 text-xs">
                        For: {announcement.targetAudience}
                      </Badge>
                    )}
                  </div>
                  {announcement.priority === 'high' && (
                    <Badge variant="destructive" className="text-xs">High Priority</Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {upcomingSessions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Upcoming Sessions
          </h3>
          <div className="space-y-2">
            {upcomingSessions.slice(0, 3).map((session: any) => (
              <Card key={session.id} className="p-3 hover-elevate" data-testid={`session-${session.id}`}>
                <div>
                  <h4 className="font-medium text-sm">{session.title}</h4>
                  {session.description && (
                    <p className="text-xs text-muted-foreground mt-1">{session.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span>{new Date(session.sessionDate).toLocaleDateString()}</span>
                    {session.sessionTime && <span>• {session.sessionTime}</span>}
                    {session.location && <span>• {session.location}</span>}
                  </div>
                  {session.targetAudience && (
                    <Badge variant="secondary" className="mt-2 text-xs">
                      For: {session.targetAudience}
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AIChatbot() {
  const [, setLocation] = useLocation();
  const { isOpen, openChatbot, closeChatbot, setJourneyPlan: setGlobalJourneyPlan, setItinerary: setGlobalItinerary, language, setLanguage } = useChatbot();
  const { userRole, setUserRole, hasRegistered, setHasRegistered } = useRole();
  const { toast } = useToast();
  const [sessionId, setSessionId] = useState(() => sessionManager.createNewSessionId());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [mainTab, setMainTab] = useState("chat"); // Main 4-tab navigation
  const scrollRef = useRef<HTMLDivElement>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showContactSales, setShowContactSales] = useState(false);
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [showInlineLeadForm, setShowInlineLeadForm] = useState(false);
  const [showRegistrationShare, setShowRegistrationShare] = useState(false);
  const [hasTriggeredLeadCapture, setHasTriggeredLeadCapture] = useState(false);
  const [hasTriggeredRegistrationShare, setHasTriggeredRegistrationShare] = useState(false);
  const [hasSkippedInitialLeadCapture, setHasSkippedInitialLeadCapture] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [hasInteractedWithInitialLeadCapture, setHasInteractedWithInitialLeadCapture] = useState(false);
  const [detectedEmail, setDetectedEmail] = useState<string | null>(null);
  const [detectedName, setDetectedName] = useState<string | null>(null);
  const [showNLPConfirmation, setShowNLPConfirmation] = useState(false);
  const [showContextualPrompt, setShowContextualPrompt] = useState(false);
  const [contextualKeyword, setContextualKeyword] = useState<string>("");
  const [feedbackGiven, setFeedbackGiven] = useState<Record<number, boolean>>({});
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [isGeneratingItinerary, setIsGeneratingItinerary] = useState(false);
  
  // External backend integration state
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [streamingResponse, setStreamingResponse] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Track viewed announcements and sessions for notification badge
  const [viewedItems, setViewedItems] = useState<{ announcements: number[]; sessions: number[] }>(() => {
    try {
      const stored = localStorage.getItem('gulfood_viewed_radar_items');
      return stored ? JSON.parse(stored) : { announcements: [], sessions: [] };
    } catch {
      return { announcements: [], sessions: [] };
    }
  });
  
  // Track journey hint shown status
  const [journeyHintShown, setJourneyHintShown] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('gulfood_journey_hint_shown');
      return stored === 'true';
    } catch {
      return false;
    }
  });
  
  // Track if journey tab should be highlighted
  const [highlightJourneyTab, setHighlightJourneyTab] = useState(false);
  
  // Track if Quick Actions section is expanded (default: true/expanded)
  const [quickActionsExpanded, setQuickActionsExpanded] = useState(true);
  
  // Journey form state
  const [journeyFormData, setJourneyFormData] = useState({
    organization: '',
    role: '',
    numberOfDays: 5,
    interestCategories: [] as string[],
    attendanceIntents: [] as string[],
    otherIntent: '',
    specificDates: [] as string[],
    preferredExhibitorIds: [] as number[]
  });
  const [isGeneratingJourney, setIsGeneratingJourney] = useState(false);
  const [journeyPlan, setJourneyPlan] = useState<any>(null);
  
  // Exhibitor assessment state
  const [journeyType, setJourneyType] = useState<'visitor' | 'exhibitor' | null>(null);
  const [exhibitorAssessment, setExhibitorAssessment] = useState<any>(null);
  const [exhibitorFormData, setExhibitorFormData] = useState({
    companyName: '',
    websiteUrl: '',
    primaryGoals: [] as string[],
    country: ''
  });
  const [isGeneratingAssessment, setIsGeneratingAssessment] = useState(false);
  
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showCategorySearch, setShowCategorySearch] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [showIntentSearch, setShowIntentSearch] = useState(false);
  const [intentSearchTerm, setIntentSearchTerm] = useState('');
  const [isScoreJustificationExpanded, setIsScoreJustificationExpanded] = useState(false);
  
  // Details Modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [tempSpecificDates, setTempSpecificDates] = useState<Date[]>([]);
  const [tempPreferredExhibitorIds, setTempPreferredExhibitorIds] = useState<number[]>([]);
  const [exhibitorSearchTerm, setExhibitorSearchTerm] = useState('');
  const [showExhibitorDropdown, setShowExhibitorDropdown] = useState(false);
  
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const intentDropdownRef = useRef<HTMLDivElement>(null);
  
  // Check if lead already exists for this session on component mount
  useEffect(() => {
    const checkExistingLead = async () => {
      try {
        const response = await fetch(`/api/leads/session/${sessionId}`);
        const data = await response.json();
        
        if (data.exists) {
          setLeadCaptured(true);
          setHasInteractedWithInitialLeadCapture(true);
        }
      } catch (error) {
        console.error("Error checking existing lead:", error);
      }
    };
    
    checkExistingLead();
  }, [sessionId]);
  
  // Click-outside detection for category dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setShowCategorySearch(false);
      }
    };
    
    if (showCategorySearch) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCategorySearch]);
  
  // Click-outside detection for intent dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (intentDropdownRef.current && !intentDropdownRef.current.contains(event.target as Node)) {
        setShowIntentSearch(false);
      }
    };
    
    if (showIntentSearch) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showIntentSearch]);
  
  // Appointment booking state
  const [showAppointmentBooking, setShowAppointmentBooking] = useState(false);
  const [appointmentFormData, setAppointmentFormData] = useState({
    name: '',
    email: '',
    organization: '',
    role: '',
    meetingPurpose: '',
    scheduledTime: '',
    timezone: 'Asia/Dubai'
  });
  
  // Pre-fill organization and role from session lead when Journey tab opens
  useEffect(() => {
    if (mainTab === 'journey' && !journeyPlan) {
      const leadInfo = sessionManager.getLeadInfo();
      if (leadInfo.email && leadInfo.name) {
        // Fetch lead details to get organization and role
        fetch(`/api/leads/check/${encodeURIComponent(leadInfo.email)}`)
          .then(res => res.json())
          .then(data => {
            if (data.exists && data.lead) {
              setJourneyFormData(prev => ({
                ...prev,
                organization: data.lead.company || prev.organization,
                role: data.lead.role || prev.role
              }));
            }
          })
          .catch(err => console.error('Error fetching lead details:', err));
      }
    }
  }, [mainTab, journeyPlan]);
  
  // Fetch announcements and sessions for notification badge
  const { data: announcements } = useQuery<any[]>({
    queryKey: ['/api/announcements'],
  });
  const { data: sessions } = useQuery<any[]>({
    queryKey: ['/api/sessions'],
  });
  
  // Fetch exhibitors for the Details Modal autocomplete
  const { data: exhibitors } = useQuery<any[]>({
    queryKey: ['/api/exhibitors'],
  });

  // Calculate unread count with role-based filtering
  const unreadCount = useMemo(() => {
    // Map role to capitalized format for targetAudience matching
    const roleAudienceMap: Record<string, string> = {
      'visitor': 'Visitor',
      'exhibitor': 'Exhibitor',
      'organizer': 'Organizer'
    };
    const userAudience = userRole ? roleAudienceMap[userRole] : null;

    // Filter announcements: active AND (targetAudience is "All" or matches user role)
    const activeAnnouncements = announcements?.filter(a => {
      if (!a.isActive) return false;
      if (!userAudience) return a.targetAudience === 'All';
      return a.targetAudience === 'All' || a.targetAudience === userAudience;
    }) || [];

    // Filter sessions: active, upcoming AND (targetAudience is "All" or matches user role)
    const upcomingSessions = sessions?.filter(s => {
      if (!s.isActive) return false;
      const sessionDate = new Date(s.sessionDate);
      if (sessionDate < new Date()) return false;
      if (!userAudience) return s.targetAudience === 'All';
      return s.targetAudience === 'All' || s.targetAudience === userAudience;
    }) || [];
    
    const unreadAnnouncements = activeAnnouncements.filter(
      a => !viewedItems.announcements.includes(a.id)
    ).length;
    
    const unreadSessions = upcomingSessions.filter(
      s => !viewedItems.sessions.includes(s.id)
    ).length;
    
    return unreadAnnouncements + unreadSessions;
  }, [announcements, sessions, viewedItems, userRole]);

  // Derive user message count from messages array (single source of truth)
  const userMessageCount = useMemo(() => {
    return messages.filter(m => m.role === 'user').length;
  }, [messages]);
  const [contactForm, setContactForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    inquiry: ""
  });
  const [leadForm, setLeadForm] = useState({
    name: "",
    email: "",
    company: "",
    companyWebsite: "",
    role: "",
    category: "",
    message: ""
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Reset all chatbot state when closed - fresh start on reopen
  useEffect(() => {
    if (!isOpen) {
      // Reset all state to initial values
      setMessages([]);
      setInput("");
      setMainTab("chat");
      setShowContactSales(false);
      setShowLeadCapture(false);
      setShowInlineLeadForm(false);
      setShowRegistrationShare(false);
      setHasTriggeredLeadCapture(false);
      setHasTriggeredRegistrationShare(false);
      setHasSkippedInitialLeadCapture(false);
      setLeadCaptured(false);
      setHasInteractedWithInitialLeadCapture(false);
      setDetectedEmail(null);
      setDetectedName(null);
      setShowNLPConfirmation(false);
      setShowContextualPrompt(false);
      setContextualKeyword("");
      setFeedbackGiven({});
      setContactForm({
        companyName: "",
        contactName: "",
        email: "",
        phone: "",
        inquiry: ""
      });
      setLeadForm({
        name: "",
        email: "",
        company: "",
        companyWebsite: "",
        role: "",
        category: "",
        message: ""
      });
      // Reset role context
      setUserRole(null);
      setHasRegistered(false);
    }
  }, [isOpen, setUserRole, setHasRegistered]);

  // Create new session when chatbot opens
  useEffect(() => {
    if (isOpen) {
      const newSessionId = sessionManager.createNewSessionId();
      setSessionId(newSessionId);
      setConversationId(null);
      setStreamingResponse('');
      setIsStreaming(false);
      console.log('New conversation started:', newSessionId);
    }
  }, [isOpen]);

  // 5-minute inactivity timer - reset session after idle period
  useEffect(() => {
    const resetInactivityTimer = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }

      inactivityTimerRef.current = setTimeout(() => {
        const newSessionId = sessionManager.createNewSessionId();
        setSessionId(newSessionId);
        setMessages([]);
        setConversationId(null);
        setStreamingResponse('');
        setIsStreaming(false);
        console.log('Session expired due to inactivity. New session:', newSessionId);
      }, 5 * 60 * 1000); // 5 minutes
    };

    if (isOpen && messages.length > 0) {
      resetInactivityTimer();
    }

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [isOpen, messages]);

  // Reset inactivity timer when user types (not just sends messages)
  useEffect(() => {
    if (inactivityTimerRef.current && input.length > 0) {
      clearTimeout(inactivityTimerRef.current);
      
      inactivityTimerRef.current = setTimeout(() => {
        const newSessionId = sessionManager.createNewSessionId();
        setSessionId(newSessionId);
        setMessages([]);
        setConversationId(null);
        setStreamingResponse('');
        setIsStreaming(false);
        console.log('Session expired due to inactivity. New session:', newSessionId);
      }, 5 * 60 * 1000);
    }
  }, [input]);

  // Persist viewed items to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('gulfood_viewed_radar_items', JSON.stringify(viewedItems));
    } catch (error) {
      console.error('Failed to save viewed items to localStorage:', error);
    }
  }, [viewedItems]);

  // Persist journey hint shown status to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('gulfood_journey_hint_shown', journeyHintShown.toString());
    } catch (error) {
      console.error('Failed to save journey hint status to localStorage:', error);
    }
  }, [journeyHintShown]);

  // Stop highlighting Journey tab when user clicks on it
  useEffect(() => {
    if (mainTab === "journey") {
      setHighlightJourneyTab(false);
    }
  }, [mainTab]);

  // Mark all items as read when switching to Radar tab (with role-based filtering)
  useEffect(() => {
    if (mainTab === "radar" && announcements && sessions) {
      // Map role to capitalized format for targetAudience matching
      const roleAudienceMap: Record<string, string> = {
        'visitor': 'Visitor',
        'exhibitor': 'Exhibitor',
        'organizer': 'Organizer'
      };
      const userAudience = userRole ? roleAudienceMap[userRole] : null;

      // Filter announcements: active AND (targetAudience is "All" or matches user role)
      const activeAnnouncements = announcements.filter(a => {
        if (!a.isActive) return false;
        if (!userAudience) return a.targetAudience === 'All';
        return a.targetAudience === 'All' || a.targetAudience === userAudience;
      });

      // Filter sessions: active, upcoming AND (targetAudience is "All" or matches user role)
      const upcomingSessions = sessions.filter(s => {
        if (!s.isActive) return false;
        const sessionDate = new Date(s.sessionDate);
        if (sessionDate < new Date()) return false;
        if (!userAudience) return s.targetAudience === 'All';
        return s.targetAudience === 'All' || s.targetAudience === userAudience;
      });
      
      const allAnnouncementIds = activeAnnouncements.map(a => a.id);
      const allSessionIds = upcomingSessions.map(s => s.id);
      
      setViewedItems({
        announcements: allAnnouncementIds,
        sessions: allSessionIds
      });
    }
  }, [mainTab, announcements, sessions, userRole]);

  // Use a ref to track the latest value of hasInteractedWithInitialLeadCapture
  const hasInteractedRef = useRef(hasInteractedWithInitialLeadCapture);
  
  useEffect(() => {
    hasInteractedRef.current = hasInteractedWithInitialLeadCapture;
  }, [hasInteractedWithInitialLeadCapture]);

  useEffect(() => {
    // Only run this effect when the chatbot is open
    if (!isOpen) return;
    
    // Reset all state first (but preserve hasInteractedWithInitialLeadCapture across role changes)
    setFeedbackGiven({});
    setShowRegistrationShare(false);
    setShowLeadCapture(false);
    setShowInlineLeadForm(false);
    setHasTriggeredLeadCapture(false);
    setHasTriggeredRegistrationShare(false);
    setHasSkippedInitialLeadCapture(false);
    setLeadCaptured(false);
    
    if (userRole) {
      setMessages([
        {
          role: "assistant",
          content: getRoleWelcomeMessage(userRole)
        },
        {
          role: "assistant",
          content: "To provide you with personalized recommendations and keep you updated, I'd love to know a bit more about you."
        }
      ]);
      // Show the inline lead form after role selection ONLY if user hasn't interacted with it yet
      setTimeout(() => {
        setShowInlineLeadForm(!hasInteractedRef.current);
      }, 500);
    } else {
      // Show initial greeting when no role is selected - ask for role first
      setMessages([
        {
          role: "assistant",
          content: "👋 Hello! I'm Faris, your AI assistant for Gulfood 2026 (January 26-30, Dubai World Trade Centre & Expo City Dubai).\n\nTo provide you with the best personalized experience, please let me know: Are you a Visitor or an Exhibitor?"
        }
      ]);
      // Enable role selection buttons to appear
      setHasSkippedInitialLeadCapture(true);
    }
  }, [userRole, isOpen]);
  
  // Initialize conversation with external backend when chatbot opens
  useEffect(() => {
    if (isOpen && !conversationId) {
      createConversation()
        .then((uuid) => {
          setConversationId(uuid);
          console.log('Conversation created:', uuid);
        })
        .catch((error) => {
          console.error('Failed to create conversation:', error);
          toast({
            title: "Connection Error",
            description: "Failed to initialize chat. Please refresh and try again.",
            variant: "destructive",
          });
        });
    }
  }, [isOpen, conversationId, toast]);
  
  // Trigger widgets when user sends 3rd message
  useEffect(() => {
    if (userMessageCount >= 3 && userRole) {
      // Trigger lead capture dialog
      if (!hasTriggeredLeadCapture) {
        setHasTriggeredLeadCapture(true);
        setTimeout(() => {
          setShowLeadCapture(true);
        }, 3000);
      }
      
      // Trigger registration share widget for visitors
      if (!hasTriggeredRegistrationShare && userRole === 'visitor') {
        setHasTriggeredRegistrationShare(true);
        setShowRegistrationShare(true);
      }
    }
  }, [userMessageCount, userRole, hasTriggeredLeadCapture, hasTriggeredRegistrationShare]);

  // Streaming chat function using external backend
  const handleStreamingChat = (message: string) => {
    if (!conversationId) {
      toast({
        title: "Not Ready",
        description: "Chat is still initializing. Please wait a moment.",
        variant: "destructive",
      });
      return;
    }
    
    setIsStreaming(true);
    setStreamingResponse('');
    let accumulatedResponse = '';
    
    const cleanup = streamChatResponse(
      message,
      conversationId,
      (token: string) => {
        accumulatedResponse += token;
        setStreamingResponse(accumulatedResponse);
      },
      (suggestions?: string[]) => {
        const newMessage = { 
          role: "assistant" as const, 
          content: accumulatedResponse,
          suggestions: suggestions
        };
        setMessages(prev => {
          const updatedMessages = [...prev, newMessage];
          
          // Save conversation to database for analytics
          saveConversationToDatabase(updatedMessages);
          
          return updatedMessages;
        });
        setStreamingResponse('');
        setIsStreaming(false);
      },
      (error: Error) => {
        console.error("Streaming chat error:", error);
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "I'm sorry, I'm having trouble processing that right now. Please try again."
        }]);
        setStreamingResponse('');
        setIsStreaming(false);
      }
    );
    
    return cleanup;
  };

  // Save conversation to database for analytics tracking
  const saveConversationToDatabase = async (allMessages: Message[]) => {
    try {
      // Transform messages to match backend format (remove suggestions field)
      const formattedMessages = allMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Use sessionId for persistence to match feedback system
      await fetch('/api/chat/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId,
          messages: formattedMessages,
          userRole: userRole || 'Visitor',
          language: language
        }),
      });
    } catch (error) {
      // Silent fail - don't disrupt user experience if save fails
      console.error('Failed to save conversation to database:', error);
    }
  };

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    
    // Journey intent detection - highlight Journey tab if user mentions planning keywords
    if (!journeyHintShown && detectJourneyIntent(input)) {
      setHighlightJourneyTab(true);
      setJourneyHintShown(true);
      
      // Show AI suggestion message about Journey feature
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "💡 Tip: You can use the Journey tab to create a personalized itinerary for your visit!"
        }]);
      }, 1000);
    }
    
    // NLP extraction - detect email and name patterns
    if (!leadCaptured && userRole) {
      const extractedEmail = extractEmail(input);
      const extractedName = extractName(input);
      
      if (extractedEmail || extractedName) {
        setDetectedEmail(extractedEmail);
        setDetectedName(extractedName);
        setShowNLPConfirmation(true);
      }
      
      // Contextual trigger - detect high-intent keywords
      if (!extractedEmail && !extractedName && detectHighIntentKeywords(input)) {
        setContextualKeyword(input);
        // Delay showing contextual prompt to avoid interrupting the conversation
        setTimeout(() => {
          setShowContextualPrompt(true);
        }, 2000);
      }
    }
    
    handleStreamingChat(input);
    setInput("");
  };

  const handleQuickAction = async (action: string) => {
    if (isStreaming) return;
    
    // Log quick action click
    try {
      await fetch('/api/chat/quick-action-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          action,
          userRole: userRole || 'Visitor'
        })
      });
    } catch (error) {
      console.error('Failed to log quick action click:', error);
    }
    
    // Handle "Register Now" action by opening registration URL
    if (action === "Register Now") {
      setHasRegistered(true);
      window.open('https://visit.gulfood.com/reg/taTvFu6IraZ5MsCnrdzbHutAykNXdxkNXqaJunHZMSi?utm_source=www.gulfood.com&utm_medium=referral', '_blank');
      toast({
        title: "Opening Registration",
        description: "Redirecting you to the Gulfood 2026 registration page...",
      });
      return;
    }
    
    // Handle "Schedule Consultation" and "Meet Sales" actions - open appointment booking
    if (action === "Schedule Consultation" || action === "Meet Sales") {
      // Pre-fill form with session lead info if available
      const leadInfo = sessionManager.getLeadInfo();
      if (leadInfo.email && leadInfo.name) {
        setAppointmentFormData(prev => ({
          ...prev,
          name: leadInfo.name || '',
          email: leadInfo.email || ''
        }));
      }
      setShowAppointmentBooking(true);
      return;
    }
    
    // Use contextual prompt if available, otherwise use the action label
    const messageContent = quickActionPrompts[action] || action;
    const userMessage: Message = { role: "user", content: messageContent };
    setMessages(prev => [...prev, userMessage]);
    handleStreamingChat(messageContent);
  };

  const contactSalesMutation = useMutation({
    mutationFn: async (formData: typeof contactForm) => {
      const res = await apiRequest("POST", "/api/contact-sales", formData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Request Submitted!",
        description: "Our sales team will contact you within 24 hours.",
      });
      setTimeout(() => {
        setShowContactSales(false);
        setContactForm({
          companyName: "",
          contactName: "",
          email: "",
          phone: "",
          inquiry: ""
        });
      }, 300);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleContactSalesSubmit = () => {
    if (!contactForm.companyName || !contactForm.contactName || !contactForm.email) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    contactSalesMutation.mutate(contactForm);
  };

  const leadCaptureMutation = useMutation({
    mutationFn: async (formData: typeof leadForm) => {
      const res = await apiRequest("POST", "/api/leads", {
        ...formData,
        sessionId
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to capture lead");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Thank You! 🎉",
        description: "Your information has been saved. We'll stay in touch!",
      });
      setTimeout(() => {
        setShowLeadCapture(false);
        setLeadForm({
          name: "",
          email: "",
          company: "",
          companyWebsite: "",
          role: "",
          category: "",
          message: ""
        });
      }, 300);
    },
    onError: (error: Error) => {
      toast({
        title: "Oops!",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleLeadCaptureSubmit = () => {
    if (!leadForm.name.trim() || !leadForm.email.trim() || !leadForm.category) {
      toast({
        title: "Missing Information",
        description: "Please fill in your name, email, and category.",
        variant: "destructive",
      });
      return;
    }
    leadCaptureMutation.mutate(leadForm);
  };

  const handleLeadCaptureOpenChange = (open: boolean) => {
    if (!open) {
      // User is trying to close the modal
      // Only allow closing if no required fields are filled (they haven't started)
      // OR if all required fields are filled
      const hasStartedFilling = leadForm.name.trim() || leadForm.email.trim() || leadForm.category;
      const allRequiredFilled = leadForm.name.trim() && leadForm.email.trim() && leadForm.category;
      
      if (hasStartedFilling && !allRequiredFilled) {
        // They started filling but haven't completed required fields
        toast({
          title: "Please Complete the Form",
          description: "Fill in your name, email, and category to continue, or click 'Maybe Later' to skip.",
          variant: "destructive",
        });
        return; // Prevent closing
      }
    }
    setShowLeadCapture(open);
  };

  const feedbackMutation = useMutation({
    mutationFn: async ({ messageIndex, isAccurate }: { messageIndex: number; isAccurate: boolean }) => {
      const res = await apiRequest("POST", "/api/chat/feedback", {
        sessionId,
        messageIndex,
        isAccurate
      });
      return await res.json();
    },
    onSuccess: (_data, variables) => {
      setFeedbackGiven(prev => ({ ...prev, [variables.messageIndex]: true }));
      toast({
        title: "Thank you!",
        description: variables.isAccurate 
          ? "Your feedback helps us improve Faris." 
          : "We'll work on improving this response.",
      });
    }
  });

  const appointmentBookingMutation = useMutation({
    mutationFn: async (formData: typeof appointmentFormData) => {
      const res = await apiRequest("POST", "/api/appointments/book", {
        ...formData,
        sessionId
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to book appointment");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Appointment Confirmed",
        description: "You will receive a confirmation email with meeting details. Your appointment is scheduled in Dubai Time (GST, UTC+4).",
      });
      setShowAppointmentBooking(false);
      setAppointmentFormData({
        name: '',
        email: '',
        organization: '',
        role: '',
        meetingPurpose: '',
        scheduledTime: '',
        timezone: 'Asia/Dubai'
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to schedule appointment. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleAppointmentSlotSelected = (bookingData: {
    scheduledTime: Date;
    name: string;
    email: string;
    organization: string;
    role: string;
    meetingPurpose: string;
  }) => {
    // Submit the appointment booking with all the collected data
    appointmentBookingMutation.mutate({
      name: bookingData.name,
      email: bookingData.email,
      organization: bookingData.organization,
      role: bookingData.role,
      meetingPurpose: bookingData.meetingPurpose,
      scheduledTime: bookingData.scheduledTime.toISOString(),
      timezone: 'Asia/Dubai'
    });
  };

  const downloadReportMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/reports/generate", {
        reportType: "journey",
        userRole: "Visitor",
        sessionId
      });
      return await res.json();
    },
    onSuccess: (data) => {
      window.open(data.downloadUrl, '_blank');
      toast({
        title: "Report Downloaded",
        description: "Your journey report has been generated.",
      });
    },
    onError: (error: any) => {
      console.error("Download error:", error);
      toast({
        title: "Download Failed",
        description: error.message || "Failed to generate report. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleDownloadChat = async () => {
    if (messages.length === 0) {
      toast({
        title: "No conversation to download",
        description: "Start chatting with Faris before downloading a transcript.",
        variant: "destructive"
      });
      return;
    }

    try {
      setDownloadStatus('loading');
      const leadInfo = sessionManager.getLeadInfo();
      
      // Create hidden iframe
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.name = 'download-frame';
      document.body.appendChild(iframe);
      
      // Create form
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/api/chat/download-transcript';
      form.target = 'download-frame';
      form.style.display = 'none';
      
      const dataInput = document.createElement('input');
      dataInput.type = 'hidden';
      dataInput.name = 'data';
      dataInput.value = JSON.stringify({ messages, sessionId, userRole, leadInfo });
      form.appendChild(dataInput);
      
      let hasResponded = false;
      
      // Timeout: if no response in 3 seconds, inform user download is in progress
      const loadTimeout = setTimeout(() => {
        if (!hasResponded) {
          toast({ 
            title: "Download In Progress", 
            description: "Generating your PDF. This may take a moment." 
          });
        }
      }, 3000);
      
      // Cleanup timeout: remove iframe after 5 minutes to prevent memory leaks
      // This is a safety fallback - normal downloads complete much faster
      // We use a long timeout to avoid cancelling legitimate slow downloads
      const cleanupTimeout = setTimeout(() => {
        if (!hasResponded && document.body.contains(iframe)) {
          document.body.removeChild(iframe);
          setDownloadStatus('idle');
        }
      }, 300000); // 5 minutes
      
      // Handle iframe load
      iframe.onload = () => {
        if (hasResponded) return;
        hasResponded = true;
        clearTimeout(loadTimeout);
        clearTimeout(cleanupTimeout);
        
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc && iframeDoc.body) {
            const content = iframeDoc.body.textContent || '';
            // Check if it's an error response (contains JSON error)
            if (content.trim().startsWith('{') && (content.includes('"error"') || content.includes('error'))) {
              throw new Error('Server returned an error');
            }
          }
          
          // Success - iframe loaded without error
          document.body.removeChild(iframe);
          setDownloadStatus('success');
          toast({ 
            title: "PDF Downloaded Successfully", 
            description: "Your chat transcript has been saved." 
          });
          setTimeout(() => setDownloadStatus('idle'), 2000);
        } catch (error) {
          document.body.removeChild(iframe);
          setDownloadStatus('error');
          toast({ 
            title: "Download Failed", 
            description: "Failed to generate PDF. Please try again.",
            variant: "destructive" 
          });
          setTimeout(() => setDownloadStatus('idle'), 3000);
        }
      };
      
      // Handle iframe error
      iframe.onerror = () => {
        if (hasResponded) return;
        hasResponded = true;
        clearTimeout(loadTimeout);
        clearTimeout(cleanupTimeout);
        document.body.removeChild(iframe);
        setDownloadStatus('error');
        toast({ 
          title: "Download Failed", 
          description: "Network error. Please check your connection and try again.",
          variant: "destructive" 
        });
        setTimeout(() => setDownloadStatus('idle'), 3000);
      };
      
      // Submit form
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
      
    } catch (error) {
      console.error('PDF download error:', error);
      setDownloadStatus('error');
      toast({ 
        title: "Download Failed", 
        description: error instanceof Error ? error.message : "Failed to generate PDF. Please try again.",
        variant: "destructive" 
      });
      setTimeout(() => setDownloadStatus('idle'), 3000);
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          className="rounded-full w-20 h-20 shadow-2xl group relative bg-gradient-to-br from-primary to-primary/80 hover:from-primary hover:to-primary/90 ring-4 ring-primary/20 ring-offset-2 overflow-hidden p-0"
          onClick={openChatbot}
          data-testid="button-open-chatbot"
          title="Hi, I'm Faris! Your AI guide for Gulfood 2026. Ask me anything!"
        >
          <span className="absolute inset-0 flex items-center justify-center">
            <img src={farisAvatar} alt="Faris AI" className="w-full h-full object-cover scale-[1.8] group-hover:scale-[1.9] transition-transform" />
          </span>
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-chart-3 rounded-full animate-pulse shadow-sm shadow-chart-3 z-10" />
        </Button>
      </div>
    );
  }

  return (
    <Card className="fixed bottom-0 right-0 sm:bottom-4 sm:right-4 w-full sm:w-[480px] md:w-[520px] h-[90vh] sm:h-[680px] md:h-[720px] max-h-screen shadow-2xl z-50 flex flex-col rounded-xl border-2" data-testid="card-chatbot">
      <div className="p-2.5 border-b border-[#FFC107]/20 bg-[#FFC107] rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg overflow-hidden">
              <img src={farisAvatar} alt="Faris AI" className="w-full h-full object-cover scale-150" />
            </div>
            <div className="flex items-center gap-2">
              <div className="font-bold text-base text-black">Faris</div>
              <div className="text-xs text-black/70 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-black animate-pulse shadow-sm" />
                Your Event Guide
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-black/10 active:bg-black/20 h-7 w-7 no-default-hover-elevate no-default-active-elevate"
                  data-testid="button-language-selector"
                  aria-label="Language selector"
                >
                  <Globe className="w-4 h-4 text-black" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem 
                  onClick={() => setLanguage('English')}
                  className={language === 'English' ? 'bg-accent' : ''}
                  data-testid="menu-item-english"
                >
                  <span className="flex items-center gap-2">
                    {language === 'English' && <span className="w-2 h-2 rounded-full bg-primary" />}
                    English
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setLanguage('Hindi')}
                  className={language === 'Hindi' ? 'bg-accent' : ''}
                  data-testid="menu-item-hindi"
                >
                  <span className="flex items-center gap-2">
                    {language === 'Hindi' && <span className="w-2 h-2 rounded-full bg-primary" />}
                    हिन्दी (Hindi)
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setLanguage('Arabic')}
                  className={language === 'Arabic' ? 'bg-accent' : ''}
                  data-testid="menu-item-arabic"
                >
                  <span className="flex items-center gap-2">
                    {language === 'Arabic' && <span className="w-2 h-2 rounded-full bg-primary" />}
                    العربية (Arabic)
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-black/10 active:bg-black/20 h-7 w-7 no-default-hover-elevate no-default-active-elevate"
              onClick={handleDownloadChat}
              disabled={messages.length === 0 || downloadStatus === 'loading'}
              title={messages.length === 0 ? "No conversation to download" : "Download conversation as PDF"}
              data-testid="button-download-pdf"
              aria-label="Download conversation as PDF"
            >
              {downloadStatus === 'loading' ? (
                <Loader2 className="w-4 h-4 text-black animate-spin" />
              ) : downloadStatus === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-black" />
              ) : (
                <FileDown className="w-4 h-4 text-black" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={closeChatbot}
              data-testid="button-close-chatbot"
              aria-label="Close chatbot"
              className="hover:bg-black/10 active:bg-black/20 h-7 w-7 no-default-hover-elevate no-default-active-elevate"
            >
              <X className="w-4 h-4 text-black" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main 4-Tab Navigation */}
      <div className="border-b border-border bg-muted/30">
        <div className="flex items-center">
          <button
            onClick={() => setMainTab("chat")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative ${
              mainTab === "chat"
                ? "text-primary bg-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
            data-testid="tab-main-chat"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat</span>
            {mainTab === "chat" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setMainTab("journey")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative ${
              mainTab === "journey"
                ? "text-primary bg-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            } ${highlightJourneyTab ? "journey-pulse" : ""}`}
            data-testid="tab-main-journey"
          >
            <Globe className="w-4 h-4" />
            <span>Journey</span>
            {mainTab === "journey" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setMainTab("referral")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative ${
              mainTab === "referral"
                ? "text-primary bg-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
            data-testid="tab-main-referral"
          >
            <UserPlus className="w-4 h-4" />
            <span>Referral</span>
            {mainTab === "referral" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setMainTab("radar")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative ${
              mainTab === "radar"
                ? "text-primary bg-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
            data-testid="tab-main-radar"
          >
            <Sparkles className="w-4 h-4" />
            <span>Radar</span>
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-orange-600 rounded-full" data-testid="badge-radar-unread">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            {mainTab === "radar" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>
      </div>

      {/* Chat Tab Content */}
      {mainTab === "chat" && (
        <>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm chatbot-message break-words ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                    data-testid={`message-${idx}`}
                  >
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({ node, ...props }) => (
                          <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80" />
                        ),
                        strong: ({ node, ...props }) => (
                          <strong className="font-bold" {...props} />
                        ),
                        em: ({ node, ...props }) => (
                          <em className="italic" {...props} />
                        ),
                        code: ({ node, className, ...props }: any) => {
                          const inline = props.inline;
                          return inline ? (
                            <code className={cn("bg-muted px-1 py-0.5 rounded text-xs font-mono", className)} {...props} />
                          ) : (
                            <code className={cn("block bg-muted p-2 rounded my-2 text-xs font-mono overflow-x-auto", className)} {...props} />
                          );
                        },
                        blockquote: ({ node, ...props }) => (
                          <blockquote className="border-l-4 border-primary pl-3 my-2 italic text-muted-foreground" {...props} />
                        ),
                        table: ({ node, ...props }) => (
                          <table className="w-full border-collapse my-2 text-xs" {...props} />
                        ),
                        thead: ({ node, ...props }) => (
                          <thead className="border-b border-border" {...props} />
                        ),
                        th: ({ node, ...props }) => (
                          <th className="text-left py-1.5 px-2 font-semibold" {...props} />
                        ),
                        td: ({ node, ...props }) => (
                          <td className="py-1.5 px-2 border-t border-border/50" {...props} />
                        ),
                        tr: ({ node, ...props }) => (
                          <tr className="hover-elevate" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul className="list-disc list-inside space-y-1 my-2" {...props} />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol className="list-decimal list-inside space-y-1 my-2" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                          <li className="leading-relaxed" {...props} />
                        ),
                        p: ({ node, ...props }) => (
                          <p className="my-1" {...props} />
                        )
                      }}
                    >
                      {protectNumericPatterns(message.content)}
                    </ReactMarkdown>
                  </div>
                  {message.role === "assistant" && idx > 0 && !feedbackGiven[idx] && (
                    <div className="flex gap-2 mt-1 ml-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => feedbackMutation.mutate({ messageIndex: idx, isAccurate: true })}
                        data-testid={`button-feedback-up-${idx}`}
                      >
                        <ThumbsUp className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => feedbackMutation.mutate({ messageIndex: idx, isAccurate: false })}
                        data-testid={`button-feedback-down-${idx}`}
                      >
                        <ThumbsDown className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  {message.role === "assistant" && idx > 0 && feedbackGiven[idx] && (
                    <div className="text-xs text-muted-foreground mt-1 ml-2">
                      Thanks for your feedback!
                    </div>
                  )}
                  
                  {/* Suggested Questions - Display only for the latest AI message */}
                  {message.role === "assistant" && message.suggestions && message.suggestions.length > 0 && idx === messages.length - 1 && (
                    <div className="flex flex-wrap gap-2 mt-3 max-w-[80%]">
                      {message.suggestions.map((suggestion, suggestionIdx) => (
                        <button
                          key={suggestionIdx}
                          onClick={() => {
                            if (!isStreaming) {
                              setInput(suggestion);
                              setTimeout(() => {
                                handleSend();
                              }, 100);
                            }
                          }}
                          className="px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 text-foreground rounded-full cursor-pointer hover-elevate active-elevate-2 transition-colors"
                          data-testid={`button-suggestion-${suggestionIdx}`}
                          disabled={isStreaming}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {/* Display streaming response as it arrives */}
              {isStreaming && streamingResponse && (
                <div className="flex flex-col items-start">
                  <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm bg-muted text-foreground break-words">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({ node, ...props }) => (
                          <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80" />
                        ),
                        strong: ({ node, ...props }) => (
                          <strong className="font-bold" {...props} />
                        ),
                        em: ({ node, ...props }) => (
                          <em className="italic" {...props} />
                        ),
                        code: ({ node, className, ...props }: any) => {
                          const inline = props.inline;
                          return inline ? (
                            <code className={cn("bg-muted px-1 py-0.5 rounded text-xs font-mono", className)} {...props} />
                          ) : (
                            <code className={cn("block bg-muted p-2 rounded my-2 text-xs font-mono overflow-x-auto", className)} {...props} />
                          );
                        },
                        blockquote: ({ node, ...props }) => (
                          <blockquote className="border-l-4 border-primary pl-3 my-2 italic text-muted-foreground" {...props} />
                        ),
                        table: ({ node, ...props }) => (
                          <table className="w-full border-collapse my-2 text-xs" {...props} />
                        ),
                        thead: ({ node, ...props }) => (
                          <thead className="border-b border-border" {...props} />
                        ),
                        th: ({ node, ...props }) => (
                          <th className="text-left py-1.5 px-2 font-semibold" {...props} />
                        ),
                        td: ({ node, ...props }) => (
                          <td className="py-1.5 px-2 border-t border-border/50" {...props} />
                        ),
                        tr: ({ node, ...props }) => (
                          <tr className="hover-elevate" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul className="list-disc list-inside space-y-1 my-2" {...props} />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol className="list-decimal list-inside space-y-1 my-2" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                          <li className="leading-relaxed" {...props} />
                        ),
                        p: ({ node, ...props }) => (
                          <p className="my-1" {...props} />
                        )
                      }}
                    >
                      {protectNumericPatterns(streamingResponse)}
                    </ReactMarkdown>
                  </div>
                  <div className="flex items-center gap-1 mt-1 ml-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Generating response...</span>
                  </div>
                </div>
              )}
              {isStreaming && !streamingResponse && (
                <div className="flex justify-start">
                  <div className="bg-muted text-foreground rounded-2xl px-4 py-2.5 text-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Thinking...
                  </div>
                </div>
              )}
              {/* Initial lead capture buttons */}
              {!userRole && !leadCaptured && !hasSkippedInitialLeadCapture && !showInlineLeadForm && messages.length > 0 && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] bg-muted rounded-2xl px-4 py-3 text-sm">
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        className="rounded-full px-4 py-1.5 h-auto bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-md no-default-hover-elevate flex items-center gap-1.5"
                        onClick={() => setShowInlineLeadForm(true)}
                        data-testid="button-share-details"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">Share My Details</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-full px-4 py-1.5 h-auto no-default-hover-elevate flex items-center gap-1.5"
                        onClick={() => setHasSkippedInitialLeadCapture(true)}
                        data-testid="button-skip-details"
                      >
                        <span className="text-xs font-medium">Skip for Now</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {/* Inline lead capture form */}
              {showInlineLeadForm && !leadCaptured && (
                <div className="flex justify-start">
                  <Card className="max-w-[85%] p-4 shadow-lg border-2 border-orange-500/20">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <UserCheck className="w-4 h-4 text-orange-600" />
                        <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-100">Share Your Details</h4>
                      </div>
                      <div className="space-y-2">
                        <Input
                          placeholder="Your Name *"
                          value={leadForm.name}
                          onChange={(e) => setLeadForm(prev => ({ ...prev, name: e.target.value }))}
                          className="text-sm focus-visible:ring-orange-500"
                          data-testid="input-inline-lead-name"
                        />
                        <Input
                          type="email"
                          placeholder="Email Address *"
                          value={leadForm.email}
                          onChange={(e) => setLeadForm(prev => ({ ...prev, email: e.target.value }))}
                          className="text-sm focus-visible:ring-orange-500"
                          data-testid="input-inline-lead-email"
                        />
                        <Input
                          placeholder="Company Name (Optional)"
                          value={leadForm.company}
                          onChange={(e) => setLeadForm(prev => ({ ...prev, company: e.target.value }))}
                          className="text-sm focus-visible:ring-orange-500"
                          data-testid="input-inline-lead-company"
                        />
                        <Input
                          placeholder="Company Website (Optional)"
                          value={leadForm.companyWebsite}
                          onChange={(e) => setLeadForm(prev => ({ ...prev, companyWebsite: e.target.value }))}
                          className="text-sm focus-visible:ring-orange-500"
                          data-testid="input-inline-lead-company-website"
                        />
                        <Input
                          placeholder="Role/Title (Optional)"
                          value={leadForm.role}
                          onChange={(e) => setLeadForm(prev => ({ ...prev, role: e.target.value }))}
                          className="text-sm focus-visible:ring-orange-500"
                          data-testid="input-inline-lead-role"
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowInlineLeadForm(false);
                            setHasInteractedWithInitialLeadCapture(true);
                            setLeadForm({ name: "", email: "", company: "", companyWebsite: "", role: "", category: "", message: "" });
                          }}
                          className="flex-1"
                          data-testid="button-cancel-inline-lead"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={async () => {
                            if (!leadForm.name || !leadForm.email) {
                              toast({
                                title: "Required fields missing",
                                description: "Please provide your name and email address.",
                                variant: "destructive"
                              });
                              return;
                            }
                            
                            // Check for duplicate email
                            try {
                              const checkResponse = await fetch(`/api/leads/check/${encodeURIComponent(leadForm.email)}`);
                              const checkData = await checkResponse.json();
                              
                              if (checkData.exists) {
                                // Email already exists - welcome back message
                                setLeadCaptured(true);
                                setShowInlineLeadForm(false);
                                setHasInteractedWithInitialLeadCapture(true);
                                toast({
                                  title: `Welcome back, ${checkData.lead.name}! 👋`,
                                  description: "Great to see you again! Your details are already in our system."
                                });
                                const roleSpecificMessage = userRole === "visitor" 
                                  ? "I'm here to help you discover exhibitors, plan your journey, and make the most of Gulfood 2026. What would you like to know?"
                                  : "I'm here to help you connect with buyers, analyze competitors, and maximize your booth strategy. How can I assist you?";
                                setMessages(prev => [...prev, {
                                  role: "assistant",
                                  content: `Welcome back, ${checkData.lead.name}! 👋 It's great to see you again. ${roleSpecificMessage}`
                                }]);
                                setLeadForm({ name: "", email: "", company: "", companyWebsite: "", role: "", category: "", message: "" });
                                return;
                              }
                              
                              // Email doesn't exist - create new lead with auto-categorization
                              const conversationContext = messages.map(m => m.content).join(" ");
                              const leadCategory = autoCategorizeConversation(conversationContext);
                              
                              await apiRequest("POST", "/api/leads", {
                                name: leadForm.name,
                                email: leadForm.email,
                                company: leadForm.company || undefined,
                                companyWebsite: leadForm.companyWebsite || undefined,
                                role: leadForm.role || undefined,
                                capturedVia: "direct",
                                conversationId: sessionId,
                                sourcePage: "chatbot",
                                leadCategory,
                                userType: userRole || undefined
                              });
                              setLeadCaptured(true);
                              setShowInlineLeadForm(false);
                              setHasInteractedWithInitialLeadCapture(true);
                              toast({
                                title: "Thank you!",
                                description: "Your details have been captured successfully."
                              });
                              const roleSpecificMessage = userRole === "visitor" 
                                ? "I'm here to help you discover exhibitors, plan your journey, and make the most of Gulfood 2026. What would you like to know?"
                                : "I'm here to help you connect with buyers, analyze competitors, and maximize your booth strategy. How can I assist you?";
                              setMessages(prev => [...prev, {
                                role: "assistant",
                                content: `Thanks ${leadForm.name}! ${roleSpecificMessage}`
                              }]);
                              setLeadForm({ name: "", email: "", company: "", companyWebsite: "", role: "", category: "", message: "" });
                            } catch (error) {
                              toast({
                                title: "Error",
                                description: "Failed to capture your details. Please try again.",
                                variant: "destructive"
                              });
                            }
                          }}
                          className="flex-1 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white"
                          data-testid="button-submit-inline-lead"
                        >
                          Submit
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
              {/* NLP detection confirmation */}
              {showNLPConfirmation && !leadCaptured && (detectedEmail || detectedName) && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 rounded-2xl px-4 py-3 text-sm border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-orange-600" />
                      <div className="text-xs font-semibold text-orange-900 dark:text-orange-100">I noticed you shared some details!</div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      {detectedName && `Name: ${detectedName}`}
                      {detectedName && detectedEmail && <br />}
                      {detectedEmail && `Email: ${detectedEmail}`}
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">Would you like me to save these details so we can stay connected?</p>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        className="rounded-full px-3 py-1.5 h-auto bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white no-default-hover-elevate"
                        onClick={async () => {
                          if (detectedEmail) {
                            // Check if email already exists
                            try {
                              const checkResponse = await fetch(`/api/leads/check/${encodeURIComponent(detectedEmail)}`);
                              const checkData = await checkResponse.json();
                              
                              if (checkData.exists) {
                                setLeadCaptured(true);
                                setShowNLPConfirmation(false);
                                setHasInteractedWithInitialLeadCapture(true);
                                toast({
                                  title: `Welcome back, ${checkData.lead.name}! 👋`,
                                  description: "Great to see you again!"
                                });
                                const roleSpecificMessage = userRole === "visitor" 
                                  ? "I'm here to help you discover exhibitors, plan your journey, and make the most of Gulfood 2026. What would you like to know?"
                                  : "I'm here to help you connect with buyers, analyze competitors, and maximize your booth strategy. How can I assist you?";
                                setMessages(prev => [...prev, {
                                  role: "assistant",
                                  content: `Welcome back, ${checkData.lead.name}! 👋 Great to see you again. ${roleSpecificMessage}`
                                }]);
                                setDetectedEmail(null);
                                setDetectedName(null);
                                return;
                              }
                              
                              // Save new lead with auto-categorization
                              const conversationContext = messages.map(m => m.content).join(" ");
                              const leadCategory = autoCategorizeConversation(conversationContext);
                              
                              await apiRequest("POST", "/api/leads", {
                                name: detectedName || "Unknown",
                                email: detectedEmail,
                                capturedVia: "conversational",
                                conversationId: sessionId,
                                sourcePage: "chatbot",
                                leadCategory,
                                userType: userRole || undefined
                              });
                              setLeadCaptured(true);
                              setShowNLPConfirmation(false);
                              setHasInteractedWithInitialLeadCapture(true);
                              toast({
                                title: "Details saved!",
                                description: "Thank you for sharing your information."
                              });
                              const roleSpecificMessage = userRole === "visitor" 
                                ? "I'm here to help you discover exhibitors, plan your journey, and make the most of Gulfood 2026. What would you like to know?"
                                : "I'm here to help you connect with buyers, analyze competitors, and maximize your booth strategy. How can I assist you?";
                              setMessages(prev => [...prev, {
                                role: "assistant",
                                content: `Perfect! I've saved your details. ${roleSpecificMessage}`
                              }]);
                              setDetectedEmail(null);
                              setDetectedName(null);
                            } catch (error) {
                              toast({
                                title: "Error",
                                description: "Failed to save your details. Please try again.",
                                variant: "destructive"
                              });
                            }
                          } else {
                            // Only name detected, show full form
                            setShowInlineLeadForm(true);
                            setShowNLPConfirmation(false);
                            if (detectedName) {
                              setLeadForm(prev => ({ ...prev, name: detectedName }));
                            }
                          }
                        }}
                        data-testid="button-confirm-nlp"
                      >
                        Yes, save my details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full px-3 py-1.5 h-auto no-default-hover-elevate"
                        onClick={() => {
                          setShowNLPConfirmation(false);
                          setHasInteractedWithInitialLeadCapture(true);
                          setDetectedEmail(null);
                          setDetectedName(null);
                        }}
                        data-testid="button-decline-nlp"
                      >
                        No, thanks
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {/* Contextual trigger prompt for high-intent keywords */}
              {showContextualPrompt && !leadCaptured && userRole && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-2xl px-4 py-3 text-sm border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <div className="text-xs font-semibold text-blue-900 dark:text-blue-100">Get Personalized Assistance</div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      I can help you better with your inquiry if you share your contact details. This way, I can provide you with tailored recommendations and keep you updated.
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        className="rounded-full px-3 py-1.5 h-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white no-default-hover-elevate"
                        onClick={() => {
                          setShowContextualPrompt(false);
                          setShowInlineLeadForm(true);
                        }}
                        data-testid="button-contextual-share"
                      >
                        Share My Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full px-3 py-1.5 h-auto no-default-hover-elevate"
                        onClick={() => {
                          setShowContextualPrompt(false);
                          setContextualKeyword("");
                        }}
                        data-testid="button-contextual-decline"
                      >
                        Maybe Later
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {/* Role selection buttons in message stream */}
              {!userRole && messages.length > 0 && (leadCaptured || hasSkippedInitialLeadCapture) && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] bg-muted rounded-2xl px-4 py-3 text-sm">
                    <div className="text-xs font-semibold text-muted-foreground mb-2">Please select your role:</div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        className="rounded-full px-3 py-1.5 h-auto bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-primary-foreground shadow-md no-default-hover-elevate flex items-center gap-1.5"
                        onClick={() => setUserRole("visitor")}
                        data-testid="button-role-visitor"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">Visitor</span>
                      </Button>
                      <Button
                        className="rounded-full px-3 py-1.5 h-auto bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-primary-foreground shadow-md no-default-hover-elevate flex items-center gap-1.5"
                        onClick={() => setUserRole("exhibitor")}
                        data-testid="button-role-exhibitor"
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">Exhibitor</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          <div className="p-2 border-t border-border space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder={!userRole ? "Please select your role (Visitor/Exhibitor) to start chatting..." : "Ask me anything..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                disabled={isStreaming || !userRole}
                data-testid="input-chat-message"
              />
              <Button 
                size="icon" 
                onClick={handleSend}
                disabled={isStreaming || !input.trim() || !userRole}
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            
            {userRole && (
              <div className="mt-3 space-y-3">
                <Collapsible open={quickActionsExpanded} onOpenChange={setQuickActionsExpanded}>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">Quick actions:</div>
                    <div className="flex items-center gap-1">
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-auto py-1 px-2"
                          data-testid="button-toggle-quick-actions"
                        >
                          {quickActionsExpanded ? (
                            <>
                              <ChevronDown className="w-3 h-3 mr-1" />
                              Minimize
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3 h-3 mr-1 rotate-180" />
                              Expand
                            </>
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-auto py-1 px-2"
                        onClick={() => setUserRole(null)}
                        data-testid="button-change-role"
                      >
                        Change role
                      </Button>
                    </div>
                  </div>
                  <CollapsibleContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {roleQuickActions[userRole].map((action, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="cursor-pointer hover-elevate text-xs"
                          onClick={() => handleQuickAction(action)}
                          data-testid={`badge-quick-action-${idx}`}
                        >
                          {action}
                        </Badge>
                      ))}
                    </div>
                    {userRole === "exhibitor" && (
                      <Button
                        className="w-full gap-2 bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white shadow-lg no-default-hover-elevate"
                        onClick={() => setShowContactSales(true)}
                        data-testid="button-contact-sales"
                      >
                        <UserPlus className="w-4 h-4" />
                        Contact Sales
                      </Button>
                    )}
                    {userRole === "visitor" && showRegistrationShare && hasRegistered && (
                      <div className="relative">
                        <button
                          onClick={() => setShowRegistrationShare(false)}
                          className="absolute -top-1 -right-1 z-10 w-5 h-5 rounded-full bg-muted hover-elevate flex items-center justify-center"
                          data-testid="button-close-registration-share"
                          aria-label="Close registration share widget"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <RegistrationShareWidget compact={true} />
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
                {messages.length > 2 && userRole && hasRegistered && (
                  <div className="pt-3 mt-2 border-t border-border" data-testid="referral-widget-container">
                    <ReferralWidget 
                      sessionId={sessionId}
                      compact={true}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Journey Tab Content */}
      {mainTab === "journey" && (
        <ScrollArea className="flex-1">
          <div className="p-6 max-w-2xl mx-auto space-y-3">
            {!journeyPlan && !exhibitorAssessment ? (
              <>
                {journeyType === null ? (
                  <div className="text-center space-y-6">
                    <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                      <Globe className="w-8 h-8 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold text-foreground">Choose Your Path</h3>
                      <p className="text-sm text-muted-foreground">
                        Are you visiting Gulfood 2026 or exhibiting at the event?
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
                      <Card className="hover-elevate cursor-pointer" onClick={() => setJourneyType('visitor')} data-testid="card-visitor-option">
                        <CardContent className="p-6 text-center space-y-4">
                          <div className="w-12 h-12 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center">
                            <Users className="w-6 h-6 text-blue-500" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-semibold text-foreground">I'm Visiting</h4>
                            <p className="text-xs text-muted-foreground">Plan your personalized journey</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="hover-elevate cursor-pointer" onClick={() => setJourneyType('exhibitor')} data-testid="card-exhibitor-option">
                        <CardContent className="p-6 text-center space-y-4">
                          <div className="w-12 h-12 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-green-500" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-semibold text-foreground">I'm Exhibiting</h4>
                            <p className="text-xs text-muted-foreground">Get your fit assessment</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : journeyType === 'visitor' ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Globe className="w-5 h-5 text-primary" />
                          </div>
                          <h3 className="text-xl font-semibold text-foreground">Plan Your Journey</h3>
                        </div>
                        <div className="text-center">
                          {sessionManager.hasLeadInfo() ? (
                            <p className="text-sm text-muted-foreground">
                              Great! Let's personalize your event experience, <span className="font-semibold text-foreground">{sessionManager.getLeadInfo().name}</span>
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              To create your personalized journey, please share some details
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setJourneyType(null)}
                        data-testid="button-back-to-selector"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-5 h-5 text-green-500" />
                          </div>
                          <h3 className="text-xl font-semibold text-foreground">Exhibitor Fit Assessment</h3>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">
                            Let's evaluate how well your company fits with Gulfood 2026
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setJourneyType(null)}
                        data-testid="button-back-to-selector"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
              </>
            ) : null}
            
            {journeyType === 'visitor' && !journeyPlan ? (
              <>

                <form className="space-y-4" onSubmit={async (e) => {
                  e.preventDefault();
                  
                  // Validate required fields
                  if (!journeyFormData.organization || !journeyFormData.role) {
                    toast({ title: "Please fill in Organization and Role", variant: "destructive" });
                    return;
                  }
                  
                  setIsGeneratingJourney(true);
                  try {
                    const finalIntents = [...journeyFormData.attendanceIntents];
                    if (journeyFormData.otherIntent && finalIntents.includes('Other')) {
                      const index = finalIntents.indexOf('Other');
                      finalIntents[index] = journeyFormData.otherIntent;
                    }
                    
                    // Get session lead info if available, otherwise use Guest
                    const sessionLead = sessionManager.getLeadInfo();
                    const submissionData = {
                      name: sessionLead.name || 'Guest',
                      email: sessionLead.email || `guest-${Date.now()}@gulfood2026.com`,
                      organization: journeyFormData.organization,
                      role: journeyFormData.role,
                      interestCategories: journeyFormData.interestCategories,
                      attendanceIntents: finalIntents,
                      sessionId: sessionManager.getOrCreateSessionId(),
                      numberOfDays: journeyFormData.numberOfDays,
                      specificDates: journeyFormData.specificDates,
                      preferredExhibitorIds: journeyFormData.preferredExhibitorIds
                    };
                    
                    console.log('🚀 Generating journey with data:', submissionData);
                    
                    const res = await apiRequest('POST', '/api/journey/generate', submissionData);
                    
                    const response = await res.json();
                    
                    console.log('✅ Journey plan received:', response);
                    console.log('📊 Journey details:', {
                      relevanceScore: response.relevanceScore,
                      overview: response.generalOverview,
                      justification: response.scoreJustification,
                      benefitsCount: response.benefits?.length || 0,
                      recommendationsCount: response.recommendations?.length || 0,
                      exhibitorsCount: response.matchedExhibitors?.length || 0,
                      sessionsCount: response.matchedSessions?.length || 0
                    });
                    
                    // Persist journey form data alongside the plan for full context reconstruction
                    const journeyPlanWithFormData = {
                      ...response,
                      formData: {
                        organization: journeyFormData.organization,
                        role: journeyFormData.role,
                        interestCategories: journeyFormData.interestCategories,
                        attendanceIntents: finalIntents,
                        numberOfDays: journeyFormData.numberOfDays,
                        specificDates: journeyFormData.specificDates,
                        preferredExhibitorIds: journeyFormData.preferredExhibitorIds
                      }
                    };
                    
                    setJourneyPlan(journeyPlanWithFormData);
                    setGlobalJourneyPlan(journeyPlanWithFormData);
                    toast({ title: "Journey plan generated successfully!" });
                  } catch (error) {
                    console.error('❌ Failed to generate journey:', error);
                    toast({ title: "Failed to generate journey plan", variant: "destructive" });
                  } finally {
                    setIsGeneratingJourney(false);
                  }
                }}>
                  <div className="space-y-2">
                    <Label htmlFor="journey-organization">Organization *</Label>
                    <Input
                      id="journey-organization"
                      value={journeyFormData.organization}
                      onChange={(e) => setJourneyFormData(prev => ({ ...prev, organization: e.target.value }))}
                      placeholder="Your company or organization"
                      required
                      data-testid="input-journey-organization"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="journey-role">Your Role *</Label>
                    <Input
                      id="journey-role"
                      value={journeyFormData.role}
                      onChange={(e) => setJourneyFormData(prev => ({ ...prev, role: e.target.value }))}
                      placeholder="e.g., Buyer, Distributor, Chef, Product Manager"
                      required
                      data-testid="input-journey-role"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="journey-days" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      How many days will you attend?
                    </Label>
                    <Select
                      value={journeyFormData.numberOfDays.toString()}
                      onValueChange={(value) => setJourneyFormData(prev => ({ ...prev, numberOfDays: parseInt(value) }))}
                    >
                      <SelectTrigger id="journey-days" data-testid="select-number-of-days">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Day</SelectItem>
                        <SelectItem value="2">2 Days</SelectItem>
                        <SelectItem value="3">3 Days</SelectItem>
                        <SelectItem value="4">4 Days</SelectItem>
                        <SelectItem value="5">5 Days (All Days)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Categories of Interest ({journeyFormData.interestCategories.length} selected)</Label>
                    <div className="space-y-2 relative" ref={categoryDropdownRef}>
                      <Input
                        value={categorySearchTerm}
                        onChange={(e) => setCategorySearchTerm(e.target.value)}
                        placeholder="Click to select categories..."
                        onClick={() => setShowCategorySearch(true)}
                        onFocus={() => setShowCategorySearch(true)}
                        data-testid="input-category-search"
                      />
                      {showCategorySearch && (
                        <Card className="absolute z-50 w-full mt-1 max-h-64 overflow-auto p-3 space-y-2">
                          {GULFOOD_CATEGORIES
                            .filter(cat => cat.toLowerCase().includes(categorySearchTerm.toLowerCase()))
                            .map(category => (
                              <label
                                key={category}
                                className="flex items-center gap-2 cursor-pointer hover-elevate p-2 rounded"
                                data-testid={`checkbox-category-${category}`}
                              >
                                <Checkbox
                                  checked={journeyFormData.interestCategories.includes(category)}
                                  onCheckedChange={(checked) => {
                                    setJourneyFormData(prev => ({
                                      ...prev,
                                      interestCategories: checked
                                        ? [...prev.interestCategories, category]
                                        : prev.interestCategories.filter(c => c !== category)
                                    }));
                                  }}
                                />
                                <span className="text-sm">{category}</span>
                              </label>
                            ))}
                        </Card>
                      )}
                      {journeyFormData.interestCategories.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {journeyFormData.interestCategories.map(cat => (
                            <Badge key={cat} variant="secondary" className="gap-1">
                              {cat}
                              <button
                                type="button"
                                onClick={() => setJourneyFormData(prev => ({
                                  ...prev,
                                  interestCategories: prev.interestCategories.filter(c => c !== cat)
                                }))}
                                className="ml-1 hover-elevate rounded-full"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Intent of Attending ({journeyFormData.attendanceIntents.length} selected)</Label>
                    <div className="space-y-2 relative" ref={intentDropdownRef}>
                      <Input
                        value={intentSearchTerm}
                        onChange={(e) => setIntentSearchTerm(e.target.value)}
                        placeholder="Click to select intents..."
                        onClick={() => setShowIntentSearch(true)}
                        onFocus={() => setShowIntentSearch(true)}
                        data-testid="input-intent-search"
                      />
                      {showIntentSearch && (
                        <Card className="absolute bottom-full z-50 w-full mb-1 max-h-64 overflow-auto p-3 space-y-2">
                          {ATTENDANCE_INTENTS
                            .filter(intent => intent.toLowerCase().includes(intentSearchTerm.toLowerCase()))
                            .map(intent => (
                              <label
                                key={intent}
                                className="flex items-center gap-2 cursor-pointer hover-elevate p-2 rounded"
                                data-testid={`checkbox-intent-${intent}`}
                              >
                                <Checkbox
                                  checked={journeyFormData.attendanceIntents.includes(intent)}
                                  onCheckedChange={(checked) => {
                                    setJourneyFormData(prev => ({
                                      ...prev,
                                      attendanceIntents: checked
                                        ? [...prev.attendanceIntents, intent]
                                        : prev.attendanceIntents.filter(i => i !== intent)
                                    }));
                                  }}
                                />
                                <span className="text-sm">{intent}</span>
                              </label>
                            ))}
                        </Card>
                      )}
                      {journeyFormData.attendanceIntents.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {journeyFormData.attendanceIntents.map(intent => (
                            <Badge key={intent} variant="secondary" className="gap-1">
                              {intent}
                              <button
                                type="button"
                                onClick={() => setJourneyFormData(prev => ({
                                  ...prev,
                                  attendanceIntents: prev.attendanceIntents.filter(i => i !== intent)
                                }))}
                                className="ml-1 hover-elevate rounded-full"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {journeyFormData.attendanceIntents.includes('Other') && (
                    <div className="space-y-2">
                      <Label htmlFor="other-intent">Please specify your other intent</Label>
                      <Input
                        id="other-intent"
                        value={journeyFormData.otherIntent}
                        onChange={(e) => setJourneyFormData(prev => ({ ...prev, otherIntent: e.target.value }))}
                        placeholder="Your specific reason for attending"
                        data-testid="input-other-intent"
                      />
                    </div>
                  )}

                  <div className="relative">
                    <Button
                      type="button"
                      variant={journeyFormData.specificDates.length > 0 || journeyFormData.preferredExhibitorIds.length > 0 ? "default" : "outline"}
                      className="w-full gap-2 justify-center"
                      onClick={() => {
                        setTempSpecificDates(journeyFormData.specificDates.map(d => new Date(d)));
                        setTempPreferredExhibitorIds(journeyFormData.preferredExhibitorIds);
                        setShowDetailsModal(true);
                      }}
                      data-testid="button-more-details"
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                      Add More Details (Optional)
                      {(journeyFormData.specificDates.length > 0 || journeyFormData.preferredExhibitorIds.length > 0) && (
                        <Badge variant="secondary" className="ml-2">
                          {journeyFormData.specificDates.length + journeyFormData.preferredExhibitorIds.length}
                        </Badge>
                      )}
                    </Button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full gap-2"
                    disabled={isGeneratingJourney}
                    data-testid="button-generate-journey"
                  >
                    {isGeneratingJourney ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating Your Journey...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate My Journey Plan
                      </>
                    )}
                  </Button>
                </form>
              </>
            ) : null}
            
            {journeyType === 'exhibitor' && !exhibitorAssessment ? (
              <>
                <form className="space-y-4" onSubmit={async (e) => {
                  e.preventDefault();
                  
                  if (!exhibitorFormData.companyName || 
                      !exhibitorFormData.websiteUrl || 
                      exhibitorFormData.primaryGoals.length === 0 || 
                      !exhibitorFormData.country) {
                    toast({ title: "Please fill in all required fields", variant: "destructive" });
                    return;
                  }
                  
                  setIsGeneratingAssessment(true);
                  try {
                    const res = await apiRequest('POST', '/api/exhibitor-assessment', {
                      ...exhibitorFormData,
                      sessionId: sessionManager.getOrCreateSessionId()
                    });
                    
                    const assessment = await res.json();
                    setExhibitorAssessment(assessment);
                    toast({ title: "Assessment complete!" });
                  } catch (error) {
                    console.error('Failed to generate assessment:', error);
                    toast({ title: "Failed to generate assessment", variant: "destructive" });
                  } finally {
                    setIsGeneratingAssessment(false);
                  }
                }}>
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name *</Label>
                    <Input
                      id="company-name"
                      value={exhibitorFormData.companyName}
                      onChange={(e) => setExhibitorFormData(prev => ({ ...prev, companyName: e.target.value }))}
                      placeholder="Your company name"
                      required
                      data-testid="input-company-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website-url">Website URL *</Label>
                    <Input
                      id="website-url"
                      type="url"
                      value={exhibitorFormData.websiteUrl}
                      onChange={(e) => setExhibitorFormData(prev => ({ ...prev, websiteUrl: e.target.value }))}
                      placeholder="https://www.example.com"
                      required
                      data-testid="input-website-url"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Primary Goals *</Label>
                      {exhibitorFormData.primaryGoals.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {exhibitorFormData.primaryGoals.length} selected
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      {[
                        "Launch new products or services",
                        "Generate leads and sales",
                        "Build brand awareness",
                        "Network with industry professionals",
                        "Explore partnership opportunities",
                        "Learn about market trends"
                      ].map((goal, index) => (
                        <div key={goal} className="flex items-center space-x-2">
                          <Checkbox
                            id={`goal-${index}`}
                            checked={exhibitorFormData.primaryGoals.includes(goal)}
                            onCheckedChange={(checked) => {
                              setExhibitorFormData(prev => ({
                                ...prev,
                                primaryGoals: checked
                                  ? [...prev.primaryGoals, goal]
                                  : prev.primaryGoals.filter(g => g !== goal)
                              }));
                            }}
                            data-testid={`checkbox-goal-${index}`}
                          />
                          <label
                            htmlFor={`goal-${index}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {goal}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country *</Label>
                    <Input
                      id="country"
                      value={exhibitorFormData.country}
                      onChange={(e) => setExhibitorFormData(prev => ({ ...prev, country: e.target.value }))}
                      placeholder="e.g., United States, UAE, India"
                      required
                      data-testid="input-country"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isGeneratingAssessment}
                    data-testid="button-generate-assessment"
                  >
                    {isGeneratingAssessment ? (
                      <>
                        <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                        Analyzing Your Company...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 w-4 h-4" />
                        Get My Assessment
                      </>
                    )}
                  </Button>
                </form>
              </>
            ) : null}
            
            {isGeneratingAssessment && (
              <div className="space-y-4 p-6 border rounded-lg bg-muted/50" data-testid="assessment-progress">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                  <span className="font-medium">Generating Your Assessment...</span>
                </div>
                
                <div className="space-y-2 text-sm text-muted-foreground pl-8">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    <span>Researching your company on the internet</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                    <span>Generating relevance scores and recommendations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                    <span>Validating assessment quality (up to 2 iterations)</span>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground pl-8">
                  This process may take 30-60 seconds to ensure accurate results.
                </p>
              </div>
            )}
            
            {exhibitorAssessment ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-foreground">Assessment Results</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setExhibitorAssessment(null);
                      setJourneyType(null);
                      setExhibitorFormData({ companyName: '', websiteUrl: '', primaryGoals: [], country: '' });
                    }}
                    data-testid="button-new-assessment"
                  >
                    <X className="w-4 h-4 mr-1" />
                    New Assessment
                  </Button>
                </div>

                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div className="text-center space-y-3">
                      <h4 className="text-lg font-semibold">{exhibitorAssessment.companyName}</h4>
                      <div className="flex items-center justify-center gap-2">
                        <Badge 
                          variant={
                            exhibitorAssessment.relevanceScore >= 70 ? "default" : 
                            exhibitorAssessment.relevanceScore >= 40 ? "secondary" : 
                            "destructive"
                          }
                          className="text-2xl font-bold py-2 px-4"
                          data-testid="badge-relevance-score"
                        >
                          {exhibitorAssessment.relevanceScore}% Match
                        </Badge>
                      </div>
                      {exhibitorAssessment.scoreBreakdown?.explanation && (
                        <p className="text-sm text-muted-foreground">
                          {exhibitorAssessment.scoreBreakdown.explanation}
                        </p>
                      )}
                    </div>

                    <div className="pt-4 space-y-3">
                      <h5 className="font-semibold flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Score Breakdown
                      </h5>
                      <div className="space-y-2">
                        {exhibitorAssessment.scoreBreakdown?.productEventAlignment !== undefined && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Product-Event Alignment</span>
                              <span className="font-medium">{exhibitorAssessment.scoreBreakdown.productEventAlignment}%</span>
                            </div>
                            <Progress value={exhibitorAssessment.scoreBreakdown.productEventAlignment} />
                          </div>
                        )}
                        {exhibitorAssessment.scoreBreakdown?.businessGoalAlignment !== undefined && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Business Goal Alignment</span>
                              <span className="font-medium">{exhibitorAssessment.scoreBreakdown.businessGoalAlignment}%</span>
                            </div>
                            <Progress value={exhibitorAssessment.scoreBreakdown.businessGoalAlignment} />
                          </div>
                        )}
                        {exhibitorAssessment.scoreBreakdown?.marketMatch !== undefined && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Market Match</span>
                              <span className="font-medium">{exhibitorAssessment.scoreBreakdown.marketMatch}%</span>
                            </div>
                            <Progress value={exhibitorAssessment.scoreBreakdown.marketMatch} />
                          </div>
                        )}
                        {exhibitorAssessment.scoreBreakdown?.roiPotential !== undefined && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">ROI Potential</span>
                              <span className="font-medium">{exhibitorAssessment.scoreBreakdown.roiPotential}%</span>
                            </div>
                            <Progress value={exhibitorAssessment.scoreBreakdown.roiPotential} />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {exhibitorAssessment.extractedData && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Company Profile
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {exhibitorAssessment.extractedData.industry && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">Industry:</span>
                          <p className="text-sm">{exhibitorAssessment.extractedData.industry}</p>
                        </div>
                      )}
                      {exhibitorAssessment.extractedData.products && exhibitorAssessment.extractedData.products.length > 0 && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">Products:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {exhibitorAssessment.extractedData.products.slice(0, 5).map((product: string, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs">{product}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {exhibitorAssessment.extractedData.categories && exhibitorAssessment.extractedData.categories.length > 0 && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">Gulfood Categories:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {exhibitorAssessment.extractedData.categories.slice(0, 5).map((cat: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">{cat}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {exhibitorAssessment.recommendations && Array.isArray(exhibitorAssessment.recommendations) && exhibitorAssessment.recommendations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {exhibitorAssessment.recommendations.map((rec: any, idx: number) => (
                        <div key={idx} className="p-4 bg-muted/30 rounded-lg border border-border space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-semibold text-foreground">{rec.title}</h4>
                            {rec.priority && (
                              <Badge 
                                variant={rec.priority === 'high' ? 'default' : rec.priority === 'medium' ? 'secondary' : 'outline'}
                                className="text-xs shrink-0"
                              >
                                {rec.priority}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{rec.description}</p>
                          {rec.rationale && (
                            <div className="pt-2 border-t border-border/50">
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">Why: </span>
                                {rec.rationale}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-2">
                  {exhibitorAssessment.relevanceScore >= 70 ? (
                    <>
                      <Button className="flex-1" data-testid="button-reserve-booth">
                        <Award className="w-4 h-4 mr-2" />
                        Reserve Your Booth
                      </Button>
                      <Button 
                        variant="outline" 
                        data-testid="button-download-report"
                        onClick={async () => {
                          try {
                            const pdfData = {
                              reportType: 'exhibitor_assessment',
                              userRole: 'Exhibitor',
                              exhibitorAssessment: exhibitorAssessment,
                              companyName: exhibitorAssessment.companyName
                            };
                            
                            const res = await apiRequest('POST', '/api/reports/generate', pdfData);
                            const response = await res.json();
                            
                            if (response.reportId) {
                              const link = document.createElement('a');
                              link.href = `/api/reports/${response.reportId}/download`;
                              link.download = `Gulfood_2026_Exhibitor_Assessment.pdf`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              toast({ title: "Assessment report downloaded successfully!" });
                            }
                          } catch (error) {
                            console.error('Failed to export PDF:', error);
                            toast({ 
                              title: "Failed to generate PDF", 
                              description: "Please try again later.",
                              variant: "destructive" 
                            });
                          }
                        }}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                    </>
                  ) : exhibitorAssessment.relevanceScore >= 40 ? (
                    <>
                      <Button className="flex-1" data-testid="button-schedule-call">
                        <Calendar className="w-4 h-4 mr-2" />
                        Schedule Strategy Call
                      </Button>
                      <Button 
                        variant="outline" 
                        data-testid="button-download-report"
                        onClick={async () => {
                          try {
                            const pdfData = {
                              reportType: 'exhibitor_assessment',
                              userRole: 'Exhibitor',
                              exhibitorAssessment: exhibitorAssessment,
                              companyName: exhibitorAssessment.companyName
                            };
                            
                            const res = await apiRequest('POST', '/api/reports/generate', pdfData);
                            const response = await res.json();
                            
                            if (response.reportId) {
                              const link = document.createElement('a');
                              link.href = `/api/reports/${response.reportId}/download`;
                              link.download = `Gulfood_2026_Exhibitor_Assessment.pdf`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              toast({ title: "Assessment report downloaded successfully!" });
                            }
                          } catch (error) {
                            console.error('Failed to export PDF:', error);
                            toast({ 
                              title: "Failed to generate PDF", 
                              description: "Please try again later.",
                              variant: "destructive" 
                            });
                          }
                        }}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" className="flex-1" data-testid="button-explore-alternatives">
                        <Info className="w-4 h-4 mr-2" />
                        Explore Alternatives
                      </Button>
                      <Button 
                        variant="outline" 
                        data-testid="button-download-report"
                        onClick={async () => {
                          try {
                            const pdfData = {
                              reportType: 'exhibitor_assessment',
                              userRole: 'Exhibitor',
                              exhibitorAssessment: exhibitorAssessment,
                              companyName: exhibitorAssessment.companyName
                            };
                            
                            const res = await apiRequest('POST', '/api/reports/generate', pdfData);
                            const response = await res.json();
                            
                            if (response.reportId) {
                              const link = document.createElement('a');
                              link.href = `/api/reports/${response.reportId}/download`;
                              link.download = `Gulfood_2026_Exhibitor_Assessment.pdf`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              toast({ title: "Assessment report downloaded successfully!" });
                            }
                          } catch (error) {
                            console.error('Failed to export PDF:', error);
                            toast({ 
                              title: "Failed to generate PDF", 
                              description: "Please try again later.",
                              variant: "destructive" 
                            });
                          }
                        }}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                    </>
                  )}
                </div>

                {exhibitorAssessment.relevanceScore < 40 && (
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">
                        While your current offerings may not be an ideal match for Gulfood 2026, 
                        we have other specialized events that might better suit your needs. 
                        Contact our team to explore alternative opportunities.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : null}
            
            {journeyPlan ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">Your Personalized Journey</h3>
                    <p className="text-sm text-muted-foreground">
                      Customized plan for Gulfood 2026
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const sessionLead = sessionManager.getLeadInfo();
                          const pdfData = {
                            reportType: 'journey_plan',
                            userRole: journeyFormData.role || 'visitor',
                            sessionId: sessionManager.getOrCreateSessionId(),
                            journeyPlan: journeyPlan,
                            name: sessionLead.name || 'Guest',
                            email: sessionLead.email || '',
                            organization: journeyFormData.organization
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
                        }
                      }}
                      className="gap-2"
                      data-testid="button-export-journey-pdf"
                    >
                      <Download className="w-4 h-4" />
                      Export PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setJourneyPlan(null);
                        setJourneyFormData({
                          organization: '',
                          role: '',
                          numberOfDays: 5,
                          interestCategories: [],
                          attendanceIntents: [],
                          otherIntent: '',
                          specificDates: [],
                          preferredExhibitorIds: []
                        });
                      }}
                      data-testid="button-create-new-journey"
                    >
                      Create New
                    </Button>
                  </div>
                </div>

                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
                      <span>Event Relevance Score</span>
                      <Badge variant="outline" data-testid="badge-confidence-score">
                        Confidence: {journeyPlan.confidenceScore || 85}%
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`text-5xl font-bold ${
                        journeyPlan.relevanceScore >= 80 ? 'text-green-600 dark:text-green-400' :
                        journeyPlan.relevanceScore >= 60 ? 'text-blue-600 dark:text-blue-400' :
                        journeyPlan.relevanceScore >= 40 ? 'text-yellow-600 dark:text-yellow-400' :
                        journeyPlan.relevanceScore >= 20 ? 'text-orange-600 dark:text-orange-400' :
                        'text-red-600 dark:text-red-400'
                      }`} data-testid="text-journey-relevance-score">
                        {journeyPlan.relevanceScore}%
                      </div>
                      <p className="flex-1 text-muted-foreground" data-testid="text-journey-score-justification">
                        {journeyPlan.scoreJustification || `This event has a ${
                          journeyPlan.relevanceScore >= 80 ? "excellent" : 
                          journeyPlan.relevanceScore >= 60 ? "good" : 
                          journeyPlan.relevanceScore >= 40 ? "fair" : "limited"
                        } match for your profile and interests.`}
                      </p>
                    </div>
                    
                    {journeyPlan.benefits && journeyPlan.benefits.length > 0 && (
                      <Collapsible 
                        open={isScoreJustificationExpanded} 
                        onOpenChange={setIsScoreJustificationExpanded}
                      >
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            className="flex items-center gap-2 text-sm font-medium hover-elevate p-0 h-auto"
                            data-testid="button-toggle-benefits"
                          >
                            <ChevronDown 
                              className={`h-4 w-4 transition-transform duration-200 ${
                                isScoreJustificationExpanded ? 'rotate-180' : ''
                              }`}
                            />
                            View Key Takeaways & Benefits
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-4">
                          <ul className="space-y-2">
                            {journeyPlan.benefits.map((benefit: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                                <span className="text-sm text-foreground">{benefit}</span>
                              </li>
                            ))}
                          </ul>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </CardContent>
                </Card>

                <div className="flex justify-center -mt-4 -mb-4">
                  <Button
                    onClick={async () => {
                      try {
                        setIsGeneratingItinerary(true);
                        const sessionLead = sessionManager.getLeadInfo();
                        
                        // Use guest email if no lead info provided (registration-free access)
                        const email = sessionLead?.email || `guest-${Date.now()}@gulfood2026.com`;
                        const name = sessionLead?.name || 'Guest';
                        
                        const res = await apiRequest('POST', '/api/itinerary/generate', {
                          email: email,
                          name: name,
                          journeyPlan: journeyPlan,
                          organization: journeyFormData.organization,
                          role: journeyFormData.role
                        });
                        const itineraryData = await res.json();
                        setGlobalItinerary(itineraryData);
                        setLocation('/itinerary');
                        toast({ 
                          title: "Itinerary Generated!", 
                          description: "Your personalized day-by-day itinerary is ready to view.",
                        });
                      } catch (error) {
                        console.error('Failed to generate itinerary:', error);
                        toast({ title: "Failed to generate itinerary", variant: "destructive" });
                      } finally {
                        setIsGeneratingItinerary(false);
                      }
                    }}
                    disabled={isGeneratingItinerary}
                    size="lg"
                    className="gap-2"
                    data-testid="button-view-itinerary"
                  >
                    {isGeneratingItinerary ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating Itinerary...
                      </>
                    ) : (
                      <>
                        <FileDown className="w-5 h-5" />
                        View Full Itinerary
                      </>
                    )}
                  </Button>
                </div>

                {journeyPlan.matchedExhibitors && journeyPlan.matchedExhibitors.length > 0 && (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-foreground flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-primary" />
                        Exhibitors Matched to Your Profile ({journeyPlan.matchedExhibitors.length})
                      </h4>
                      
                      {journeyPlan.categories && journeyPlan.categories.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant={selectedCategory === "all" ? "default" : "outline"}
                            className="cursor-pointer hover-elevate"
                            onClick={() => setSelectedCategory("all")}
                            data-testid="filter-category-all"
                          >
                            All ({journeyPlan.matchedExhibitors.length})
                          </Badge>
                          {journeyPlan.categories.map((category: string) => {
                            const count = journeyPlan.matchedExhibitors.filter((e: any) => e.sector === category).length;
                            return (
                              <Badge
                                key={category}
                                variant={selectedCategory === category ? "default" : "outline"}
                                className="cursor-pointer hover-elevate"
                                onClick={() => setSelectedCategory(category)}
                                data-testid={`filter-category-${category}`}
                              >
                                {category} ({count})
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {journeyPlan.matchedExhibitors
                        .filter((exhibitor: any) => 
                          selectedCategory === "all" || exhibitor.sector === selectedCategory
                        )
                        .sort((a: any, b: any) => {
                          const aIsPreferred = journeyPlan.preferredExhibitorIds?.includes(a.id) || false;
                          const bIsPreferred = journeyPlan.preferredExhibitorIds?.includes(b.id) || false;
                          if (aIsPreferred && !bIsPreferred) return -1;
                          if (!aIsPreferred && bIsPreferred) return 1;
                          return b.relevancePercentage - a.relevancePercentage;
                        })
                        .map((exhibitor: any) => {
                          const isPreferred = journeyPlan.preferredExhibitorIds?.includes(exhibitor.id) || false;
                          return (
                            <Card 
                              key={exhibitor.id} 
                              className={`p-4 hover-elevate ${isPreferred ? 'border-2 border-primary/40' : ''}`}
                              data-testid={`exhibitor-card-${exhibitor.id}`}
                            >
                              <div className="space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <h5 className="font-medium text-foreground">{exhibitor.companyName}</h5>
                                      {isPreferred && (
                                        <Badge variant="default" className="text-xs shrink-0">
                                          Your Selection
                                        </Badge>
                                      )}
                                    </div>
                                    {exhibitor.sector && (
                                      <p className="text-xs text-muted-foreground mt-0.5">{exhibitor.sector}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge 
                                      variant={getScoreVariant(exhibitor.relevancePercentage)}
                                      className="shrink-0"
                                      data-testid={`exhibitor-match-${exhibitor.id}`}
                                    >
                                      {exhibitor.relevancePercentage}% Match
                                    </Badge>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button className="flex items-center" data-testid={`tooltip-trigger-${exhibitor.id}`}>
                                            <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                          <p className="font-semibold mb-2">Why this score?</p>
                                          <p className="text-sm mb-2">{exhibitor.personalizedReason || `This exhibitor matches your interests with a ${exhibitor.relevancePercentage}% relevance score.`}</p>
                                          {exhibitor.relevanceFactors && exhibitor.relevanceFactors.length > 0 && (
                                            <ul className="text-xs space-y-1">
                                              {exhibitor.relevanceFactors.map((factor: string, idx: number) => (
                                                <li key={idx}>• {factor}</li>
                                              ))}
                                            </ul>
                                          )}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                </div>
                                
                                {exhibitor.personalizedReason && (
                                  <div className="p-3 bg-primary/5 border border-primary/10 rounded-md">
                                    <p className="text-sm font-medium text-primary mb-1">Why this matters to you:</p>
                                    <p className="text-sm text-foreground leading-relaxed">{exhibitor.personalizedReason}</p>
                                  </div>
                                )}
                                
                                {exhibitor.description && (
                                  <p className="text-sm text-muted-foreground line-clamp-2">{exhibitor.description}</p>
                                )}
                                
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  {exhibitor.country && (
                                    <span className="flex items-center gap-1">
                                      <Globe className="w-3 h-3" />
                                      {exhibitor.country}
                                    </span>
                                  )}
                                  {exhibitor.boothNumber && (
                                    <span className="flex items-center gap-1">
                                      <Building2 className="w-3 h-3" />
                                      Booth {exhibitor.boothNumber}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                    </div>
                  </div>
                )}

                {journeyPlan.generalOverview && (
                  <Card className="p-6">
                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Overview
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{journeyPlan.generalOverview}</p>
                  </Card>
                )}

                {journeyPlan.benefits && journeyPlan.benefits.length > 0 && (
                  <Card className="p-6">
                    <h4 className="font-semibold text-foreground mb-3">Key Benefits</h4>
                    <ul className="space-y-2">
                      {journeyPlan.benefits.map((benefit: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Badge variant="secondary" className="mt-0.5 shrink-0">✓</Badge>
                          <span className="text-muted-foreground">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {journeyPlan.recommendations && journeyPlan.recommendations.length > 0 && (
                  <Card className="p-6">
                    <h4 className="font-semibold text-foreground mb-3">Recommendations</h4>
                    <ul className="space-y-2">
                      {journeyPlan.recommendations.map((rec: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <span className="text-primary font-medium shrink-0">{idx + 1}.</span>
                          <span className="text-muted-foreground">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {journeyPlan.highlights && journeyPlan.highlights.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Event Highlights for You
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      {journeyPlan.highlights.map((highlight: any, idx: number) => {
                        const iconMap: Record<string, any> = {
                          Target, Droplet, Zap, Package, Globe, TrendingUp, Users, ShoppingCart, Sparkles, Award, Building2
                        };
                        const IconComponent = iconMap[highlight.icon] || Target;
                        
                        return (
                          <Card key={idx} className="p-4 hover-elevate" data-testid={`highlight-card-${idx}`}>
                            <div className="flex items-start gap-3">
                              <div className="shrink-0 p-2 bg-primary/10 rounded-md">
                                <IconComponent className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1 space-y-1">
                                <h5 className="font-medium text-foreground">{highlight.title}</h5>
                                <p className="text-sm text-muted-foreground leading-relaxed">{highlight.description}</p>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {journeyPlan.matchedSessions && journeyPlan.matchedSessions.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      Recommended Sessions ({journeyPlan.matchedSessions.length})
                    </h4>
                    {journeyPlan.matchedSessions.map((session: any) => (
                      <Card key={session.id} className="p-4 hover-elevate" data-testid={`session-card-${session.id}`}>
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <h5 className="font-medium text-foreground">{session.title}</h5>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <span>{new Date(session.sessionDate).toLocaleDateString()}</span>
                                {session.sessionTime && <span>• {session.sessionTime}</span>}
                              </div>
                            </div>
                            <Badge variant="secondary" className="shrink-0">
                              {session.relevancePercentage}% match
                            </Badge>
                          </div>
                          
                          {session.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{session.description}</p>
                          )}
                          
                          {session.location && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <span className="inline-block w-2 h-2 rounded-full bg-primary" />
                              {session.location}
                            </p>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </ScrollArea>
      )}

      {/* Referral Tab Content */}
      {mainTab === "referral" && (
        <ScrollArea className="flex-1 p-6">
          <ReferralShareCard 
            sessionId={sessionId}
            name={leadForm.name || undefined}
            email={leadForm.email || undefined}
          />
        </ScrollArea>
      )}

      {/* Radar Tab Content */}
      {mainTab === "radar" && (
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Event Radar
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Live announcements and upcoming sessions
            </p>
          </div>
          <ScrollArea className="flex-1 p-4">
            <RightNowContent />
          </ScrollArea>
        </div>
      )}

      <Dialog open={showContactSales} onOpenChange={setShowContactSales}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-contact-sales">
          <DialogHeader>
            <DialogTitle>Contact Sales Team</DialogTitle>
            <DialogDescription>
              Fill in your details and our sales team will reach out to you within 24 hours.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                placeholder="Your company name"
                value={contactForm.companyName}
                onChange={(e) => setContactForm(prev => ({ ...prev, companyName: e.target.value }))}
                data-testid="input-company-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name *</Label>
              <Input
                id="contactName"
                placeholder="Your full name"
                value={contactForm.contactName}
                onChange={(e) => setContactForm(prev => ({ ...prev, contactName: e.target.value }))}
                data-testid="input-contact-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@company.com"
                value={contactForm.email}
                onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+971 XX XXX XXXX"
                value={contactForm.phone}
                onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                data-testid="input-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inquiry">How can we help?</Label>
              <Textarea
                id="inquiry"
                placeholder="Tell us about your requirements..."
                value={contactForm.inquiry}
                onChange={(e) => setContactForm(prev => ({ ...prev, inquiry: e.target.value }))}
                className="min-h-24"
                data-testid="input-inquiry"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowContactSales(false)}
              className="flex-1"
              data-testid="button-cancel-contact"
            >
              Cancel
            </Button>
            <Button
              onClick={handleContactSalesSubmit}
              disabled={contactSalesMutation.isPending}
              className="flex-1"
              data-testid="button-submit-contact"
            >
              {contactSalesMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showLeadCapture} onOpenChange={handleLeadCaptureOpenChange}>
        <DialogContent className="sm:max-w-md border-2 border-orange-500/20" data-testid="dialog-lead-capture">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <UserCheck className="w-5 h-5 text-orange-600" />
              <DialogTitle className="text-orange-900 dark:text-orange-100">
                Stay Connected with Gulfood 2026
              </DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground">
              Share your details so we can keep you updated on exhibitors, events, and exclusive opportunities.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="leadName" className="text-sm font-medium">Your Name *</Label>
              <Input
                id="leadName"
                placeholder="Full name"
                value={leadForm.name}
                onChange={(e) => setLeadForm(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-lead-name"
                className="focus-visible:ring-orange-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leadEmail" className="text-sm font-medium">Email Address *</Label>
              <Input
                id="leadEmail"
                type="email"
                placeholder="you@example.com"
                value={leadForm.email}
                onChange={(e) => setLeadForm(prev => ({ ...prev, email: e.target.value }))}
                data-testid="input-lead-email"
                className="focus-visible:ring-orange-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leadCategory" className="text-sm font-medium">I am a *</Label>
              <Select
                value={leadForm.category}
                onValueChange={(value) => setLeadForm(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger id="leadCategory" data-testid="select-lead-category" className="focus:ring-orange-500">
                  <SelectValue placeholder="Select your category..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Visitor">Visitor</SelectItem>
                  <SelectItem value="Exhibitor">Exhibitor</SelectItem>
                  <SelectItem value="Organizer">Organizer</SelectItem>
                  <SelectItem value="Media">Media</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="leadMessage" className="text-sm font-medium">Message (Optional)</Label>
              <Textarea
                id="leadMessage"
                placeholder="Any specific interests or questions?"
                value={leadForm.message}
                onChange={(e) => setLeadForm(prev => ({ ...prev, message: e.target.value }))}
                className="min-h-20 focus-visible:ring-orange-500"
                data-testid="input-lead-message"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowLeadCapture(false);
                setLeadForm({ name: "", email: "", company: "", companyWebsite: "", role: "", category: "", message: "" });
              }}
              className="flex-1"
              data-testid="button-cancel-lead"
            >
              Maybe Later
            </Button>
            <Button
              onClick={handleLeadCaptureSubmit}
              disabled={leadCaptureMutation.isPending}
              className="flex-1 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white"
              data-testid="button-submit-lead"
            >
              {leadCaptureMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Connect with Us"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Appointment Booking Dialog */}
      {showAppointmentBooking && (
        <Dialog open={showAppointmentBooking} onOpenChange={setShowAppointmentBooking}>
          <DialogContent className="sm:max-w-2xl" data-testid="dialog-appointment-booking">
            <DialogHeader>
              <DialogTitle>Schedule Your Consultation</DialogTitle>
              <DialogDescription>
                Book a 30-minute consultation with our sales team
              </DialogDescription>
            </DialogHeader>
            <AppointmentSlotPicker
              onSlotSelected={handleAppointmentSlotSelected}
              onCancel={() => setShowAppointmentBooking(false)}
              leadData={{
                name: sessionManager.getLeadInfo().name || undefined,
                email: sessionManager.getLeadInfo().email || undefined
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Journey Details Customization Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-journey-details">
          <DialogHeader>
            <DialogTitle>Customize Your Visit</DialogTitle>
            <DialogDescription>
              Add specific dates and preferred exhibitors to personalize your journey
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Specific Dates Section */}
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-semibold">Select Specific Dates (Optional)</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose the exact dates you'll attend (Jan 26-30, 2026)
                </p>
              </div>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    data-testid="button-select-dates"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {tempSpecificDates.length > 0 
                      ? `${tempSpecificDates.length} date${tempSpecificDates.length > 1 ? 's' : ''} selected`
                      : "Pick dates"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="multiple"
                    selected={tempSpecificDates}
                    onSelect={(dates) => setTempSpecificDates(dates || [])}
                    defaultMonth={new Date(2026, 0)}
                    disabled={(date) => {
                      const eventStart = new Date('2026-01-26');
                      const eventEnd = new Date('2026-01-30');
                      return date < eventStart || date > eventEnd;
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              {tempSpecificDates.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tempSpecificDates.map((date, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {format(date, 'MMM dd, yyyy')}
                      <button
                        type="button"
                        onClick={() => setTempSpecificDates(tempSpecificDates.filter((_, i) => i !== index))}
                        className="ml-1 hover-elevate rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Preferred Exhibitors Section */}
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-semibold">Interested in Specific Exhibitors? (Optional)</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Search and select up to 5 exhibitors you definitely want to visit
                </p>
              </div>
              
              <Popover open={showExhibitorDropdown} onOpenChange={setShowExhibitorDropdown}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={showExhibitorDropdown}
                    className="w-full justify-start text-left font-normal"
                    data-testid="button-select-exhibitors"
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    {tempPreferredExhibitorIds.length > 0
                      ? `${tempPreferredExhibitorIds.length}/5 exhibitors selected`
                      : "Search exhibitors..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Search exhibitors..." 
                      value={exhibitorSearchTerm}
                      onValueChange={setExhibitorSearchTerm}
                    />
                    <CommandEmpty>No exhibitor found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {exhibitors
                        ?.filter(exhibitor => 
                          (exhibitor.name?.toLowerCase() || '').includes(exhibitorSearchTerm.toLowerCase()) ||
                          (exhibitor.sector?.toLowerCase() || '').includes(exhibitorSearchTerm.toLowerCase()) ||
                          (exhibitor.booth?.toLowerCase() || '').includes(exhibitorSearchTerm.toLowerCase())
                        )
                        .map((exhibitor: any) => {
                          const isSelected = tempPreferredExhibitorIds.includes(exhibitor.id);
                          const isLimitReached = tempPreferredExhibitorIds.length >= 5 && !isSelected;
                          
                          return (
                            <CommandItem
                              key={exhibitor.id}
                              onSelect={() => {
                                setTempPreferredExhibitorIds(prev => {
                                  if (prev.includes(exhibitor.id)) {
                                    return prev.filter(id => id !== exhibitor.id);
                                  } else if (prev.length < 5) {
                                    return [...prev, exhibitor.id];
                                  } else {
                                    toast({
                                      title: "Selection Limit Reached",
                                      description: "You can select up to 5 exhibitors. Remove one to add another.",
                                      variant: "destructive"
                                    });
                                    return prev;
                                  }
                                });
                              }}
                              disabled={isLimitReached}
                              className={isLimitReached ? "opacity-50 cursor-not-allowed" : ""}
                              data-testid={`exhibitor-option-${exhibitor.id}`}
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <Checkbox
                                  checked={isSelected}
                                  className="pointer-events-none"
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{exhibitor.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {exhibitor.sector}
                                    {exhibitor.booth && ` • Booth: ${exhibitor.booth}`}
                                  </div>
                                </div>
                              </div>
                            </CommandItem>
                          );
                        })}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              
              {tempPreferredExhibitorIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tempPreferredExhibitorIds.map((exhibitorId) => {
                    const exhibitor = exhibitors?.find(e => e.id === exhibitorId);
                    return exhibitor ? (
                      <Badge key={exhibitorId} variant="secondary" className="gap-1">
                        {exhibitor.name}
                        <button
                          type="button"
                          onClick={() => setTempPreferredExhibitorIds(prev => prev.filter(id => id !== exhibitorId))}
                          className="ml-1 hover-elevate rounded-full"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowDetailsModal(false);
                setTempSpecificDates([]);
                setTempPreferredExhibitorIds([]);
                setExhibitorSearchTerm('');
              }}
              data-testid="button-cancel-details"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setJourneyFormData(prev => ({
                  ...prev,
                  specificDates: tempSpecificDates.map(d => format(d, 'yyyy-MM-dd')),
                  preferredExhibitorIds: tempPreferredExhibitorIds
                }));
                setShowDetailsModal(false);
                toast({
                  title: "Details Saved",
                  description: `${tempSpecificDates.length + tempPreferredExhibitorIds.length} customization${tempSpecificDates.length + tempPreferredExhibitorIds.length !== 1 ? 's' : ''} added to your journey.`
                });
              }}
              data-testid="button-save-details"
            >
              Save Details
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
