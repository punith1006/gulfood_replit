import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RoleProvider } from "@/contexts/RoleContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ChatbotProvider } from "@/contexts/ChatbotContext";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AIChatbot from "@/components/AIChatbot";
import Home from "@/pages/Home";
import OrganizerLogin from "@/pages/OrganizerLogin";
import OrganizerAdmin from "@/pages/OrganizerAdmin";
import ExhibitorVerify from "@/pages/ExhibitorVerify";
import ExhibitorDashboard from "@/pages/ExhibitorDashboard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/visitors" component={Home} />
      <Route path="/exhibitors" component={Home} />
      <Route path="/organizer/login" component={OrganizerLogin} />
      <Route path="/organizer/admin" component={OrganizerAdmin} />
      <Route path="/exhibitor/verify" component={ExhibitorVerify} />
      <Route path="/exhibitor/dashboard" component={ExhibitorDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
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
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
