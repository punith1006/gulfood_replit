import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RoleProvider } from "@/contexts/RoleContext";
import { ChatbotProvider } from "@/contexts/ChatbotContext";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AIChatbot from "@/components/AIChatbot";
import Home from "@/pages/Home";
import Analytics from "@/pages/Analytics";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/visitors" component={Home} />
      <Route path="/exhibitors" component={Home} />
      <Route path="/analytics" component={Analytics} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RoleProvider>
          <ChatbotProvider>
            <div className="min-h-screen flex flex-col">
              <Navigation />
              <main className="flex-1">
                <Router />
              </main>
              <Footer />
              <AIChatbot />
            </div>
            <Toaster />
          </ChatbotProvider>
        </RoleProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
