import React, { ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Heart, Code2, Shield, FileText, HelpCircle, Menu, X } from 'lucide-react';
import { useFloatingOnboarding, FloatingTooltip } from '@/components/onboarding/FloatingTooltip';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const onboarding = useFloatingOnboarding();
  
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Mobile header */}
      {isMobile && (
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card px-4">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <span className="text-sm font-bold text-foreground">Smart Agents</span>
        </header>
      )}

      <Sidebar mobileOpen={isMobile ? sidebarOpen : undefined} onMobileClose={() => setSidebarOpen(false)} />
      
      <main className={`${isMobile ? '' : 'ms-72'} flex-1 p-4 md:p-6`}>
        {children}
      </main>
      <footer className={`${isMobile ? '' : 'ms-72'} border-t border-border bg-card/50 backdrop-blur-sm`}>
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="flex items-center gap-4 md:gap-6 text-xs md:text-sm text-muted-foreground flex-wrap justify-center">
            <Link to="/privacy" className="flex items-center gap-1.5 hover:text-foreground transition-colors">
              <Shield className="h-4 w-4" />
              <span>Privacy & Security</span>
            </Link>
            <Link to="/terms" className="flex items-center gap-1.5 hover:text-foreground transition-colors">
              <FileText className="h-4 w-4" />
              <span>Terms of Service</span>
            </Link>
            <Link to="/help" className="flex items-center gap-1.5 hover:text-foreground transition-colors">
              <HelpCircle className="h-4 w-4" />
              <span>Help</span>
            </Link>
          </div>
          <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
            <Code2 className="h-4 w-4" />
            <span>Designed & Built by</span>
            <span className="font-semibold text-foreground">Elhamy Sobhy</span>
            <Heart className="h-4 w-4 text-red-500 fill-red-500" />
          </div>
        </div>
      </footer>
      {/* Floating Onboarding Tooltip */}
      <FloatingTooltip {...onboarding} />
      {/* Interactive Onboarding Tour */}
      <OnboardingTour />
    </div>
  );
};
