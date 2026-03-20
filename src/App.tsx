import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AppProvider } from "@/contexts/AppContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { MainLayout } from "@/components/layout/MainLayout";
import Index from "@/pages/Index";
import { Dashboard } from "@/pages/Dashboard";
import { Agents } from "@/pages/Agents";
import { AgentConfiguration } from "@/pages/AgentConfiguration";
import { AgentTestChat } from "@/pages/AgentTestChat";
import { MultiAgentCanvas } from "@/pages/MultiAgentCanvas";
import { KnowledgeBase } from "@/pages/KnowledgeBase";
import { Analytics } from "@/pages/Analytics";
import { Settings } from "@/pages/Settings";
import { Auth } from "@/pages/Auth";
import { AIChat } from "@/pages/AIChat";
import { WorkflowRuns } from "@/pages/WorkflowRuns";
import { WorkflowMonitor } from "@/pages/WorkflowMonitor";
import { Team } from "@/pages/Team";
import { Marketplace } from "@/pages/Marketplace";
import { PrivacyPolicy } from "@/pages/PrivacyPolicy";
import { TermsOfService } from "@/pages/TermsOfService";
import { Help } from "@/pages/Help";
import { WorkflowBuilder } from "@/pages/WorkflowBuilder";
import { AIAssistant } from "@/components/assistant/AIAssistant";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Page transition variants
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 }
};

const pageTransition = {
  type: "tween" as const,
  ease: [0.25, 0.1, 0.25, 1] as const,
  duration: 0.3
};

// Animated page wrapper
function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

// Animated routes wrapper
function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<AnimatedPage><Index /></AnimatedPage>} />
        <Route path="/auth" element={<AnimatedPage><Auth /></AnimatedPage>} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <WorkspaceProvider>
                <MainLayout>
                  <AnimatePresence mode="wait">
                    <Routes location={location} key={location.pathname}>
                      <Route path="/dashboard" element={<AnimatedPage><Dashboard /></AnimatedPage>} />
                      <Route path="/agents" element={<AnimatedPage><Agents /></AnimatedPage>} />
                      <Route path="/agents/:id" element={<AnimatedPage><AgentConfiguration /></AnimatedPage>} />
                      <Route path="/agent-test" element={<AnimatedPage><AgentTestChat /></AnimatedPage>} />
                      <Route path="/multi-agent-canvas" element={<AnimatedPage><MultiAgentCanvas /></AnimatedPage>} />
                      <Route path="/multi-agent-canvas/:id" element={<AnimatedPage><MultiAgentCanvas /></AnimatedPage>} />
                      <Route path="/workflow-builder" element={<AnimatedPage><WorkflowBuilder /></AnimatedPage>} />
                      <Route path="/knowledge-base" element={<AnimatedPage><KnowledgeBase /></AnimatedPage>} />
                      <Route path="/analytics" element={<AnimatedPage><Analytics /></AnimatedPage>} />
                      <Route path="/settings" element={<AnimatedPage><Settings /></AnimatedPage>} />
                      <Route path="/ai-chat" element={<AnimatedPage><AIChat /></AnimatedPage>} />
                      <Route path="/workflow-runs" element={<AnimatedPage><WorkflowRuns /></AnimatedPage>} />
                      <Route path="/workflow-monitor/:runId" element={<AnimatedPage><WorkflowMonitor /></AnimatedPage>} />
                      <Route path="/marketplace" element={<AnimatedPage><Marketplace /></AnimatedPage>} />
                      <Route path="/team" element={<AnimatedPage><Team /></AnimatedPage>} />
                      <Route path="/privacy" element={<AnimatedPage><PrivacyPolicy /></AnimatedPage>} />
                      <Route path="/terms" element={<AnimatedPage><TermsOfService /></AnimatedPage>} />
                      <Route path="/help" element={<AnimatedPage><Help /></AnimatedPage>} />
                      <Route path="*" element={<AnimatedPage><NotFound /></AnimatedPage>} />
                    </Routes>
                  </AnimatePresence>
                </MainLayout>
                <AIAssistant />
              </WorkspaceProvider>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AnimatedRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
