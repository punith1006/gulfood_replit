import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, X, Sparkles, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const quickActions = [
  "Find exhibitors for me",
  "Show travel & route options",
  "Plan my event schedule",
  "Book meetings",
  "Navigate the venue",
  "Hotel recommendations"
];

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Ask me anything....."
    }
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    const hasVisited = sessionStorage.getItem('gulfood_chatbot_seen');
    if (!hasVisited && !hasAutoOpened) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        setHasAutoOpened(true);
        sessionStorage.setItem('gulfood_chatbot_seen', 'true');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasAutoOpened]);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/chat", { sessionId, message });
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
    chatMutation.mutate(input);
    setInput("");
  };

  const handleQuickAction = (action: string) => {
    if (chatMutation.isPending) return;
    
    const userMessage: Message = { role: "user", content: action };
    setMessages(prev => [...prev, userMessage]);
    chatMutation.mutate(action);
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {!hasAutoOpened && (
          <div className="bg-primary text-primary-foreground px-4 py-3 rounded-2xl shadow-xl max-w-xs animate-in slide-in-from-bottom-5 duration-500">
            <p className="text-sm font-medium">👋 Need help? I'm here for you!</p>
            <p className="text-xs mt-1 opacity-90">Ask me about exhibitors, travel, schedules, and more!</p>
          </div>
        )}
        <Button
          size="lg"
          className="rounded-full w-16 h-16 shadow-2xl group relative"
          onClick={() => setIsOpen(true)}
          data-testid="button-open-chatbot"
        >
          <Bot className="w-7 h-7 group-hover:scale-110 transition-transform" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-chart-3 rounded-full animate-pulse" />
        </Button>
      </div>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] shadow-2xl z-50 flex flex-col" data-testid="card-chatbot">
      <div className="flex items-center justify-between p-4 border-b border-border bg-primary/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-bold">Gulfood AI Assistant</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-chart-3 animate-pulse" />
              Online
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          data-testid="button-close-chatbot"
          aria-label="Close chatbot"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, idx) => (
            <div
              key={idx}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
                data-testid={`message-${idx}`}
              >
                {message.content}
              </div>
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
        <div className="text-xs text-muted-foreground mb-2">Quick actions:</div>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action, idx) => (
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
    </Card>
  );
}
