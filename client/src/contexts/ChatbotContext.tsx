import { createContext, useContext, useState, ReactNode } from "react";

export type Language = 'English' | 'Hindi' | 'Arabic';
export type ChatbotTab = 'chat' | 'journey' | 'referral' | 'radar';

interface ChatbotContextType {
  isOpen: boolean;
  openChatbot: () => void;
  closeChatbot: () => void;
  toggleChatbot: () => void;
  activeTab: ChatbotTab;
  setActiveTab: (tab: ChatbotTab) => void;
  openChatbotWithTab: (tab: ChatbotTab) => void;
  journeyPlan: any | null;
  setJourneyPlan: (plan: any | null) => void;
  itinerary: any | null;
  setItinerary: (itinerary: any | null) => void;
  language: Language;
  setLanguage: (language: Language) => void;
}

const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined);

export function ChatbotProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ChatbotTab>('chat');
  const [journeyPlanState, setJourneyPlanState] = useState<any | null>(() => {
    try {
      const stored = localStorage.getItem('gulfood_journey_plan');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [itineraryState, setItineraryState] = useState<any | null>(() => {
    try {
      const stored = localStorage.getItem('gulfood_itinerary');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [languageState, setLanguageState] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem('gulfood_language');
      if (stored && ['English', 'Hindi', 'Arabic'].includes(stored)) {
        return stored as Language;
      }
      return 'English';
    } catch {
      return 'English';
    }
  });

  const openChatbot = () => setIsOpen(true);
  const closeChatbot = () => setIsOpen(false);
  const toggleChatbot = () => setIsOpen(prev => !prev);
  const openChatbotWithTab = (tab: ChatbotTab) => {
    setActiveTab(tab);
    setIsOpen(true);
  };

  const setJourneyPlan = (plan: any | null) => {
    setJourneyPlanState(plan);
    if (plan) {
      localStorage.setItem('gulfood_journey_plan', JSON.stringify(plan));
    } else {
      localStorage.removeItem('gulfood_journey_plan');
    }
  };

  const setItinerary = (itinerary: any | null) => {
    setItineraryState(itinerary);
    if (itinerary) {
      localStorage.setItem('gulfood_itinerary', JSON.stringify(itinerary));
    } else {
      localStorage.removeItem('gulfood_itinerary');
    }
  };

  const setLanguage = (language: Language) => {
    setLanguageState(language);
    localStorage.setItem('gulfood_language', language);
  };

  return (
    <ChatbotContext.Provider value={{ isOpen, openChatbot, closeChatbot, toggleChatbot, activeTab, setActiveTab, openChatbotWithTab, journeyPlan: journeyPlanState, setJourneyPlan, itinerary: itineraryState, setItinerary, language: languageState, setLanguage }}>
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
