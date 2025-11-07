import { createContext, useContext, useState, ReactNode } from "react";

interface ChatbotContextType {
  isOpen: boolean;
  openChatbot: () => void;
  closeChatbot: () => void;
  toggleChatbot: () => void;
  journeyPlan: any | null;
  setJourneyPlan: (plan: any | null) => void;
}

const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined);

export function ChatbotProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [journeyPlanState, setJourneyPlanState] = useState<any | null>(() => {
    try {
      const stored = localStorage.getItem('gulfood_journey_plan');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const openChatbot = () => setIsOpen(true);
  const closeChatbot = () => setIsOpen(false);
  const toggleChatbot = () => setIsOpen(prev => !prev);

  const setJourneyPlan = (plan: any | null) => {
    setJourneyPlanState(plan);
    if (plan) {
      localStorage.setItem('gulfood_journey_plan', JSON.stringify(plan));
    } else {
      localStorage.removeItem('gulfood_journey_plan');
    }
  };

  return (
    <ChatbotContext.Provider value={{ isOpen, openChatbot, closeChatbot, toggleChatbot, journeyPlan: journeyPlanState, setJourneyPlan }}>
      {children}
    </ChatbotContext.Provider>
  );
}

export function useChatbot() {
  const context = useContext(ChatbotContext);
  if (!context) {
    throw new Error("useChatbot must be used within ChatbotProvider");
  }
  return context;
}
