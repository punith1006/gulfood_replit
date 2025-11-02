import { createContext, useContext, useState, ReactNode } from "react";

interface ChatbotContextType {
  isOpen: boolean;
  openChatbot: () => void;
  closeChatbot: () => void;
  toggleChatbot: () => void;
}

const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined);

export function ChatbotProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openChatbot = () => setIsOpen(true);
  const closeChatbot = () => setIsOpen(false);
  const toggleChatbot = () => setIsOpen(prev => !prev);

  return (
    <ChatbotContext.Provider value={{ isOpen, openChatbot, closeChatbot, toggleChatbot }}>
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
