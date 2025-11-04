import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, X, Sparkles, Loader2, Users, Building2, BarChart3, UserPlus, ThumbsUp, ThumbsDown, Download, UserCheck } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation } from "@tanstack/react-query";
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

const getRoleWelcomeMessage = (role: UserRole): string => {
  if (!role) return "Ask me anything.....";
  
  const welcomeMessages = {
    visitor: "Welcome! 👋 I'm here to help you discover the best exhibitors, plan your journey across both venues (Dubai World Trade Centre & Expo City Dubai), and make the most of Gulfood 2026. What would you like to know?",
    exhibitor: "Welcome! 🤝 I'm here to help you connect with potential buyers, analyze competitors, optimize your booth strategy, and maximize your presence at Gulfood 2026. How can I assist you?",
    organizer: "Welcome! 📊 I'm here to provide you with registration analytics, engagement metrics, revenue insights, and real-time event performance data for Gulfood 2026. What insights do you need?"
  };
  
  return welcomeMessages[role];
};

export default function AIChatbot() {
  const { isOpen, openChatbot, closeChatbot } = useChatbot();
  const { userRole, setUserRole } = useRole();
  const { toast } = useToast();
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Ask me anything....."
    }
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showContactSales, setShowContactSales] = useState(false);
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [showRegistrationShare, setShowRegistrationShare] = useState(false);
  const [hasTriggeredLeadCapture, setHasTriggeredLeadCapture] = useState(false);
  const [hasTriggeredRegistrationShare, setHasTriggeredRegistrationShare] = useState(false);
  const [hasRegistered, setHasRegistered] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<number, boolean>>({});
  
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
    category: "",
    message: ""
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: getRoleWelcomeMessage(userRole)
      }
    ]);
    setFeedbackGiven({});
    setShowRegistrationShare(false);
    setShowLeadCapture(false);
    setHasTriggeredLeadCapture(false);
    setHasTriggeredRegistrationShare(false);
    setHasRegistered(false);
  }, [userRole]);
  
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
    onError: () => {
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
      <div className="p-4 sm:p-5 border-b-2 border-border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg ring-2 ring-primary/20 ring-offset-2 overflow-hidden">
              <img src={farisAvatar} alt="Faris AI" className="w-full h-full object-cover scale-150" />
            </div>
            <div>
              <div className="font-bold text-lg sm:text-xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Faris</div>
              <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-chart-3 animate-pulse shadow-sm shadow-chart-3" />
                Your AI Guide
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={closeChatbot}
            data-testid="button-close-chatbot"
            aria-label="Close chatbot"
            className="hover-elevate"
          >
            <X className="w-5 h-5 sm:w-4 sm:h-4" />
          </Button>
        </div>
        <div className="text-xs text-muted-foreground text-center py-1 px-2 bg-muted/50 rounded">
          🌍 English | العربية | 中文 | हिन्दी
        </div>
      </div>

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
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border space-y-3">
        {!userRole ? (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-center mb-2">I am a...</div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                className="flex-col h-auto py-2 hover-elevate"
                onClick={() => setUserRole("visitor")}
                data-testid="button-role-visitor"
              >
                <Users className="w-4 h-4 mb-0.5" />
                <span className="text-xs">Visitor</span>
              </Button>
              <Button
                variant="outline"
                className="flex-col h-auto py-2 hover-elevate"
                onClick={() => setUserRole("exhibitor")}
                data-testid="button-role-exhibitor"
              >
                <Building2 className="w-4 h-4 mb-0.5" />
                <span className="text-xs">Exhibitor</span>
              </Button>
              <Button
                variant="outline"
                className="flex-col h-auto py-2 hover-elevate"
                onClick={() => setUserRole("organizer")}
                data-testid="button-role-organizer"
              >
                <BarChart3 className="w-4 h-4 mb-0.5" />
                <span className="text-xs">Organizer</span>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
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
            {userRole === "visitor" && showRegistrationShare && (
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
          </>
        )}
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
      </div>

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
                setLeadForm({ name: "", email: "", category: "", message: "" });
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
