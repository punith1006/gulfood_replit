import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, X, Sparkles, Loader2, Users, Building2, BarChart3, UserPlus, ThumbsUp, ThumbsDown, Download, UserCheck, Globe, MessageSquare, Bell, Target, Droplet, Zap, Package, TrendingUp, ShoppingCart, Award } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useRole, type UserRole } from "@/contexts/RoleContext";
import { useChatbot } from "@/contexts/ChatbotContext";
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
import { sessionManager } from "@/lib/sessionManager";
import { GULFOOD_CATEGORIES } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";

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
    "Register Today",
    "Find exhibitors for me",
    "Show travel & route options",
    "Plan my Journey",
    "Navigate the venue",
    "Hotel recommendations"
  ],
  exhibitor: [
    "Connect with potential buyers",
    "Competitor analysis",
    "Booth location tips",
    "Marketing strategies",
    "Networking opportunities",
    "Event logistics"
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

interface Message {
  role: "user" | "assistant";
  content: string;
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

function RightNowContent() {
  const { data: announcements, isLoading: announcementsLoading } = useQuery<any[]>({
    queryKey: ['/api/announcements'],
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery<any[]>({
    queryKey: ['/api/sessions'],
  });

  const activeAnnouncements = announcements?.filter(a => a.isActive) || [];
  const upcomingSessions = sessions?.filter(s => {
    if (!s.isActive) return false;
    const sessionDate = new Date(s.sessionDate);
    return sessionDate >= new Date();
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
  const { isOpen, openChatbot, closeChatbot } = useChatbot();
  const { userRole, setUserRole, hasRegistered, setHasRegistered } = useRole();
  const { toast } = useToast();
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [mainTab, setMainTab] = useState("chat"); // Main 4-tab navigation
  const scrollRef = useRef<HTMLDivElement>(null);
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
  
  // Journey form state
  const [journeyFormData, setJourneyFormData] = useState({
    organization: '',
    role: '',
    interestCategories: [] as string[],
    attendanceIntents: [] as string[],
    otherIntent: ''
  });
  const [isGeneratingJourney, setIsGeneratingJourney] = useState(false);
  const [journeyPlan, setJourneyPlan] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showCategorySearch, setShowCategorySearch] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [showIntentSearch, setShowIntentSearch] = useState(false);
  const [intentSearchTerm, setIntentSearchTerm] = useState('');
  
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

  // Calculate unread count
  const unreadCount = useMemo(() => {
    const activeAnnouncements = announcements?.filter(a => a.isActive) || [];
    const upcomingSessions = sessions?.filter(s => {
      if (!s.isActive) return false;
      const sessionDate = new Date(s.sessionDate);
      return sessionDate >= new Date();
    }) || [];
    
    const unreadAnnouncements = activeAnnouncements.filter(
      a => !viewedItems.announcements.includes(a.id)
    ).length;
    
    const unreadSessions = upcomingSessions.filter(
      s => !viewedItems.sessions.includes(s.id)
    ).length;
    
    return unreadAnnouncements + unreadSessions;
  }, [announcements, sessions, viewedItems]);

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
        role: "",
        category: "",
        message: ""
      });
      // Reset role context
      setUserRole(null);
      setHasRegistered(false);
    }
  }, [isOpen, setUserRole, setHasRegistered]);

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

  // Mark all items as read when switching to Radar tab
  useEffect(() => {
    if (mainTab === "radar" && announcements && sessions) {
      const activeAnnouncements = announcements.filter(a => a.isActive);
      const upcomingSessions = sessions.filter(s => {
        if (!s.isActive) return false;
        const sessionDate = new Date(s.sessionDate);
        return sessionDate >= new Date();
      });
      
      const allAnnouncementIds = activeAnnouncements.map(a => a.id);
      const allSessionIds = upcomingSessions.map(s => s.id);
      
      setViewedItems({
        announcements: allAnnouncementIds,
        sessions: allSessionIds
      });
    }
  }, [mainTab, announcements, sessions]);

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

  const chatMutation = useMutation({
    mutationFn: async ({ message, role }: { message: string; role: string | null }) => {
      const capitalizedRole = role 
        ? role.charAt(0).toUpperCase() + role.slice(1)
        : null;
      const res = await apiRequest("POST", "/api/chat", { 
        sessionId, 
        message,
        userRole: capitalizedRole
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: "assistant", content: data.message }]);
    },
    onError: (error: any) => {
      console.error("Chat mutation error:", error);
      console.error("Error details:", {
        message: error?.message,
        response: error?.response,
        status: error?.status
      });
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I'm sorry, I'm having trouble processing that right now. Please try again."
      }]);
    }
  });

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return;

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
    
    chatMutation.mutate({ message: input, role: userRole });
    setInput("");
  };

  const handleQuickAction = (action: string) => {
    if (chatMutation.isPending) return;
    
    // Handle "Register Today" action by opening registration URL
    if (action === "Register Today") {
      setHasRegistered(true);
      window.open('https://visit.gulfood.com/reg/taTvFu6IraZ5MsCnrdzbHutAykNXdxkNXqaJunHZMSi?utm_source=www.gulfood.com&utm_medium=referral', '_blank');
      toast({
        title: "Opening Registration",
        description: "Redirecting you to the Gulfood 2026 registration page...",
      });
      return;
    }
    
    const userMessage: Message = { role: "user", content: action };
    setMessages(prev => [...prev, userMessage]);
    chatMutation.mutate({ message: action, role: userRole });
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
    <Card className="fixed bottom-0 right-0 sm:bottom-4 sm:right-4 w-full sm:w-[480px] md:w-[520px] h-[90vh] sm:h-[600px] md:h-[650px] max-h-screen shadow-2xl z-50 flex flex-col sm:rounded-xl border-2" data-testid="card-chatbot">
      <div className="p-2.5 border-b border-border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg ring-2 ring-primary/20 ring-offset-2 overflow-hidden">
              <img src={farisAvatar} alt="Faris AI" className="w-full h-full object-cover scale-150" />
            </div>
            <div className="flex items-center gap-2">
              <div className="font-bold text-base bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Faris</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-chart-3 animate-pulse shadow-sm shadow-chart-3" />
                Your Event Guide
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="hover-elevate h-7 w-7"
              title="English | العربية | 中文 | हिन्दी"
              data-testid="button-language-selector"
              aria-label="Language selector"
            >
              <Globe className="w-4 h-4 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={closeChatbot}
              data-testid="button-close-chatbot"
              aria-label="Close chatbot"
              className="hover-elevate h-7 w-7"
            >
              <X className="w-4 h-4" />
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
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm chatbot-message ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                    data-testid={`message-${idx}`}
                  >
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
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
                      {message.content}
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
                </div>
              ))}
              {chatMutation.isPending && (
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
                          placeholder="Company (Optional)"
                          value={leadForm.company}
                          onChange={(e) => setLeadForm(prev => ({ ...prev, company: e.target.value }))}
                          className="text-sm focus-visible:ring-orange-500"
                          data-testid="input-inline-lead-company"
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
                            setLeadForm({ name: "", email: "", company: "", role: "", category: "", message: "" });
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
                                setLeadForm({ name: "", email: "", company: "", role: "", category: "", message: "" });
                                return;
                              }
                              
                              // Email doesn't exist - create new lead with auto-categorization
                              const conversationContext = messages.map(m => m.content).join(" ");
                              const leadCategory = autoCategorizeConversation(conversationContext);
                              
                              await apiRequest("POST", "/api/leads", {
                                name: leadForm.name,
                                email: leadForm.email,
                                company: leadForm.company || undefined,
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
                              setLeadForm({ name: "", email: "", company: "", role: "", category: "", message: "" });
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
                placeholder="Ask me anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                disabled={chatMutation.isPending}
                data-testid="input-chat-message"
              />
              <Button 
                size="icon" 
                onClick={handleSend}
                disabled={chatMutation.isPending || !input.trim()}
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            
            {userRole && (
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">Quick actions:</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-auto py-1"
                    onClick={() => setUserRole(null)}
                    data-testid="button-change-role"
                  >
                    Change role
                  </Button>
                </div>
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
                {userRole === "visitor" && messages.length > 2 && (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => downloadReportMutation.mutate()}
                    disabled={downloadReportMutation.isPending}
                    data-testid="button-download-journey-report"
                  >
                    <Download className="w-4 h-4" />
                    {downloadReportMutation.isPending ? "Generating..." : "Download Journey Report"}
                  </Button>
                )}
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
          <div className="p-6 max-w-2xl mx-auto space-y-6">
            {!journeyPlan ? (
              <>
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <Globe className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">Plan Your Journey</h3>
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
                      sessionId: sessionManager.getOrCreateSessionId()
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
                    
                    setJourneyPlan(response);
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
                    <Label>Categories of Interest ({journeyFormData.interestCategories.length} selected)</Label>
                    <div className="space-y-2">
                      <Input
                        value={categorySearchTerm}
                        onChange={(e) => setCategorySearchTerm(e.target.value)}
                        placeholder="Search categories..."
                        onFocus={() => setShowCategorySearch(true)}
                        data-testid="input-category-search"
                      />
                      {showCategorySearch && (
                        <Card className="max-h-64 overflow-auto p-3 space-y-2">
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
                    <div className="space-y-2">
                      <Input
                        value={intentSearchTerm}
                        onChange={(e) => setIntentSearchTerm(e.target.value)}
                        placeholder="Search intents..."
                        onFocus={() => setShowIntentSearch(true)}
                        data-testid="input-intent-search"
                      />
                      {showIntentSearch && (
                        <Card className="max-h-64 overflow-auto p-3 space-y-2">
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
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">Your Personalized Journey</h3>
                    <p className="text-sm text-muted-foreground">
                      Customized plan for Gulfood 2026
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
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
                          interestCategories: [],
                          attendanceIntents: [],
                          otherIntent: ''
                        });
                      }}
                      data-testid="button-create-new-journey"
                    >
                      Create New
                    </Button>
                  </div>
                </div>

                <Card className="p-6 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold">Relevance Score</span>
                      <span className={`text-2xl font-bold ${
                        journeyPlan.relevanceScore >= 80 ? 'text-green-600 dark:text-green-400' :
                        journeyPlan.relevanceScore >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                        journeyPlan.relevanceScore >= 40 ? 'text-orange-600 dark:text-orange-400' :
                        'text-red-600 dark:text-red-400'
                      }`} data-testid="text-journey-relevance-score">
                        {journeyPlan.relevanceScore}%
                      </span>
                    </div>
                    <Progress value={journeyPlan.relevanceScore} className="h-3" />
                    <p className="text-xs text-muted-foreground mt-2">
                      {journeyPlan.relevanceScore >= 80 ? "Excellent" : 
                       journeyPlan.relevanceScore >= 60 ? "Good" : 
                       journeyPlan.relevanceScore >= 40 ? "Fair" : "Limited"} match for Gulfood 2026
                    </p>
                    {journeyPlan.scoreJustification && (
                      <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                        <p className="text-sm font-medium mb-1 text-foreground">Why this score?</p>
                        <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-journey-score-justification">
                          {journeyPlan.scoreJustification}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>

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
                        .map((exhibitor: any) => (
                        <Card key={exhibitor.id} className="p-4 hover-elevate" data-testid={`exhibitor-card-${exhibitor.id}`}>
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <h5 className="font-medium text-foreground">{exhibitor.companyName}</h5>
                                {exhibitor.sector && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{exhibitor.sector}</p>
                                )}
                              </div>
                              <Badge 
                                variant="secondary" 
                                className={`shrink-0 ${
                                  exhibitor.relevancePercentage >= 80 ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                                  exhibitor.relevancePercentage >= 60 ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' :
                                  ''
                                }`}
                                data-testid={`exhibitor-match-${exhibitor.id}`}
                              >
                                {exhibitor.relevancePercentage}% match
                              </Badge>
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
                      ))}
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
            )}
          </div>
        </ScrollArea>
      )}

      {/* Referral Tab Content */}
      {mainTab === "referral" && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-md">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Referral Program</h3>
            <p className="text-sm text-muted-foreground">
              Share Gulfood 2026 with your network and earn rewards. Track your referrals and see their impact.
            </p>
            <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
          </div>
        </div>
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
                setLeadForm({ name: "", email: "", company: "", role: "", category: "", message: "" });
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
    </Card>
  );
}
