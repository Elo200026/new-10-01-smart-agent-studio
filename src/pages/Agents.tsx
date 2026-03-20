import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Bot, Settings2, Trash2, Brain, FileText, Sparkles, Zap, Rocket } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/hooks/useAuth';
import { agentTemplates } from '@/lib/agentTemplates';

type CoreModel = 'core_analyst' | 'core_reviewer' | 'core_synthesizer';

export const Agents: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  const handleDeployTemplate = async (template: typeof agentTemplates[0]) => {
    if (!currentWorkspace || !user) {
      toast({ title: 'Error', description: 'Please select a workspace first', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('ai_profiles').insert({
      display_name: template.display_name,
      user_defined_name: template.user_defined_name,
      core_model: template.core_model,
      persona: template.persona,
      role_description: template.role_description,
      intro_sentence: template.intro_sentence,
      response_rules: template.response_rules as any,
      rag_policy: template.rag_policy as any,
      workspace_id: currentWorkspace.id,
      created_by: user.id,
    } as any);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast({ title: 'Deployed!', description: `${template.name} agent created successfully` });
    }
  };

  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from('ai_profiles').delete().eq('id', id);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast({ title: 'Success', description: 'Agent deleted successfully' });
    } else {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const getModelInfo = (model: CoreModel) => {
    switch (model) {
      case 'core_analyst':
        return { icon: <Brain className="h-4 w-4" />, label: 'ANALYST', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
      case 'core_reviewer':
        return { icon: <FileText className="h-4 w-4" />, label: 'REVIEWER', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
      case 'core_synthesizer':
        return { icon: <Sparkles className="h-4 w-4" />, label: 'SYNTHESIZER', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
      default:
        return { icon: <Bot className="h-4 w-4" />, label: model, color: 'bg-muted text-muted-foreground' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">AGENT MATRIX</h1>
          <p className="text-muted-foreground mt-1">Neural Infrastructure Matrix - Control Center</p>
        </div>
        <Button 
          className="gap-2 gradient-cyber text-primary-foreground" 
          onClick={() => navigate('/agents/new')}
        >
          <Plus className="h-4 w-4" />
          DEPLOY NEW AGENT
        </Button>
      </div>

      {/* Quick Deploy Templates */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          Quick Deploy Templates
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {agentTemplates.map((template) => (
            <Card 
              key={template.id}
              className={`group cursor-pointer border-border/50 hover:border-primary/30 transition-all bg-gradient-to-br ${template.color}`}
              onClick={() => handleDeployTemplate(template)}
            >
              <CardContent className="pt-6 pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{template.icon}</span>
                  <h3 className="font-semibold">{template.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{template.role_description}</p>
                <Button variant="ghost" size="sm" className="mt-3 w-full gap-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus className="h-3 w-3" /> Deploy Now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Agents List */}
      <Card className="cyber-border">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Active Agents
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : agents && agents.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {agents.map((agent) => {
                const modelInfo = getModelInfo(agent.core_model as CoreModel);
                return (
                  <Card 
                    key={agent.id} 
                    className="group relative hover:shadow-lg transition-all cursor-pointer border-border/50 hover:border-primary/30"
                    onClick={() => navigate(`/agents/${agent.id}`)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <Bot className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{agent.display_name}</h3>
                            {agent.user_defined_name && (
                              <p className="text-xs text-muted-foreground font-mono">
                                {agent.user_defined_name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/agents/${agent.id}`);
                            }}
                          >
                            <Settings2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={(e) => handleDelete(agent.id, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex items-center gap-2">
                        <Badge variant="outline" className={`gap-1 ${modelInfo.color}`}>
                          {modelInfo.icon}
                          {modelInfo.label}
                        </Badge>
                      </div>

                      {agent.role_description && (
                        <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                          {agent.role_description}
                        </p>
                      )}

                      {agent.intro_sentence && (
                        <p className="text-xs italic text-muted-foreground/70 mt-2 line-clamp-1">
                          "{agent.intro_sentence}"
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-4">
                No agents deployed yet. Click "DEPLOY NEW AGENT" to get started.
              </p>
              <Button onClick={() => navigate('/agents/new')} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Deploy First Agent
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
