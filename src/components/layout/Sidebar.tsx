import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Database, 
  Bot, 
  Network, 
  Wand2, 
  HelpCircle, 
  Sparkles, 
  Store, 
  Play, 
  BarChart3, 
  Users2, 
  Settings, 
  LogOut,
  Moon,
  Sun,
  Languages,
  GitBranch
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { WorkspaceSelector } from '@/components/WorkspaceSelector';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onMobileClose }) => {
  const { lang, setLang, theme, toggleTheme, t } = useApp();
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: t.sidebar.dashboard, icon: LayoutDashboard, id: 'nav-dashboard' },
    { path: '/knowledge-base', label: t.sidebar.knowledgeBase, icon: Database, id: 'nav-knowledge' },
    { path: '/agents', label: t.sidebar.agents, icon: Bot, id: 'nav-agents' },
    { path: '/multi-agent-canvas', label: t.sidebar.multiAgentCanvas, icon: Network, id: 'nav-workflows' },
    { path: '/workflow-builder', label: 'AI Workflow Builder', icon: Wand2, id: 'nav-builder' },
    { path: '/workflow-canvas', label: 'Workflow Canvas', icon: GitBranch, id: 'nav-canvas' },
    { path: '/ai-chat', label: 'AI Assistant', icon: HelpCircle, id: 'nav-chat' },
    { path: '/agent-test', label: 'Agent Test Lab', icon: Sparkles, id: 'nav-test' },
    { path: '/marketplace', label: t.sidebar.marketplace, icon: Store, id: 'nav-marketplace' },
    { path: '/workflow-runs', label: 'Workflow Runs', icon: Play, id: 'nav-runs' },
    { path: '/analytics', label: t.sidebar.analytics, icon: BarChart3, id: 'nav-analytics' },
    { path: '/team', label: 'Team', icon: Users2, id: 'nav-team' },
    { path: '/help', label: 'Help', icon: HelpCircle, id: 'nav-help' },
  ];

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Failed to sign out');
    }
  };

  const isMobileControlled = mobileOpen !== undefined;

  return (
    <aside
      className={cn(
        'fixed inset-y-0 start-0 z-50 flex w-72 flex-col border-e border-border bg-card transition-transform duration-300',
        isMobileControlled && !mobileOpen && '-translate-x-full',
        isMobileControlled && mobileOpen && 'translate-x-0'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-foreground">Smart Agents</span>
          <span className="text-[10px] font-medium text-primary">Generator Platform</span>
        </div>
      </div>

      <WorkspaceSelector />

      <nav className="flex-1 space-y-1 overflow-y-auto p-4 scrollbar-modern">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              id={item.id}
              to={item.path}
              onClick={onMobileClose}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary text-primary-foreground glow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon
                className={cn(
                  'h-5 w-5 transition-colors',
                  isActive
                    ? 'text-primary-foreground'
                    : 'text-muted-foreground group-hover:text-primary'
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-border p-4">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={toggleTheme} className="flex-1 gap-2">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="flex-1 gap-2"
          >
            <Languages className="h-4 w-4" />
            <span className="text-xs font-bold">{lang === 'ar' ? 'EN' : 'AR'}</span>
          </Button>
        </div>
        <Link
          to="/settings"
          className={cn(
            'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all',
            location.pathname === '/settings'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Settings className="h-5 w-5" />
          {t.sidebar.settings}
        </Link>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-5 w-5" />
          {t.sidebar.signOut}
        </button>
      </div>
    </aside>
  );
};
