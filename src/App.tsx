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
import MultiAgentCanvas from "@/pages/MultiAgentCanvas";
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
import { WorkflowEditor } from "@/pages/WorkflowEditor";
import { WorkflowCanvas } from "@/pages/WorkflowCanvas";
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
    <Routes location={location} key={location.pathname}>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <WorkspaceProvider>
              <MainLayout>
                <Routes location={location} key={location.pathname}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/agents" element={<Agents />} />
                  <Route path="/agents/:id" element={<AgentConfiguration />} />
                  <Route path="/agent-test" element={<AgentTestChat />} />
                  <Route path="/multi-agent-canvas" element={<MultiAgentCanvas />} />
                  <Route path="/multi-agent-canvas/:configId" element={<MultiAgentCanvas />} />
                  <Route path="/workflow-builder" element={<WorkflowBuilder />} />
                  <Route path="/workflow-canvas" element={<WorkflowCanvas />} />
                  <Route path="/workflow-canvas/:id" element={<WorkflowEditor />} />
                  <Route path="/knowledge-base" element={<KnowledgeBase />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/ai-chat" element={<AIChat />} />
                  <Route path="/workflow-runs" element={<WorkflowRuns />} />
                  <Route path="/workflow-monitor/:runId" element={<WorkflowMonitor />} />
                  <Route path="/marketplace" element={<Marketplace />} />
                  <Route path="/team" element={<Team />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/help" element={<Help />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </MainLayout>
              <AIAssistant />
            </WorkspaceProvider>
          </ProtectedRoute>
        }
      />
    </Routes>
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
