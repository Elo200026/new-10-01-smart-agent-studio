import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, GitBranch, Trash2, Play, Clock, Layout } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CreateWorkflowDialog } from '@/components/dialogs/CreateWorkflowDialog';
import { WorkflowScheduleDialog } from '@/components/scheduling/WorkflowScheduleDialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export const WorkflowCanvas: React.FC = () => {
  const { t } = useApp();
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<{ id: string; name: string } | null>(null);

  const { data: workflows, isLoading: workflowsLoading } = useQuery({
    queryKey: ['workflows', currentWorkspace?.id],
    queryFn: async () => {
      let query = supabase
        .from('agent_workflows')
        .select('*')
        .order('created_at', { ascending: false });
      if (currentWorkspace?.id) {
        query = query.eq('workspace_id', currentWorkspace.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: multiAgentConfigs, isLoading: configsLoading } = useQuery({
    queryKey: ['multi-agent-configs', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await supabase
        .from('multi_agent_configs')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace,
  });

  const handleDelete = async (id: string, table: 'agent_workflows' | 'multi_agent_configs') => {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.invalidateQueries({ queryKey: ['multi-agent-configs'] });
      toast({ title: 'Deleted', description: 'Workflow removed successfully' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t.workflowCanvas.title}</h1>
          <p className="text-muted-foreground mt-1">Build workflows and connect agents</p>
        </div>
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          {t.workflowCanvas.newWorkflow}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Multi-Agent Workflows Section */}
        <Card className="cyber-border">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Multi-Agent Projects
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {configsLoading ? (
              <p className="text-muted-foreground text-center py-8">{t.common.loading}</p>
            ) : multiAgentConfigs && multiAgentConfigs.length > 0 ? (
              <div className="space-y-4">
                {multiAgentConfigs.map((config) => (
                  <Card 
                    key={config.id} 
                    className="relative cursor-pointer hover:border-primary/50 transition-colors group bg-secondary/20" 
                    onClick={() => navigate(`/multi-agent-canvas/${config.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{config.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-[10px] h-4">MULTI-AGENT</Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {Array.isArray(config.agent_nodes) ? config.agent_nodes.length : 0} Nodes
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(config.id, 'multi_agent_configs');
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-3">No multi-agent projects found.</p>
                <Button variant="outline" size="sm" onClick={() => navigate('/workflow-builder')}>
                  Use AI Builder
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Standard Workflows Section */}
        <Card>
          <CardHeader className="border-b border-border/50">
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-primary" />
              Standard Workflows
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {workflowsLoading ? (
              <p className="text-muted-foreground text-center py-8">{t.common.loading}</p>
            ) : workflows && workflows.length > 0 ? (
              <div className="space-y-4">
                {workflows.map((workflow) => (
                  <Card 
                    key={workflow.id} 
                    className="relative cursor-pointer hover:border-primary/50 transition-colors group" 
                    onClick={() => navigate(`/workflow-canvas/${workflow.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{workflow.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] h-4">SEQUENTIAL</Badge>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(workflow.id, 'agent_workflows');
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8 text-sm">
                No standard workflows yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateWorkflowDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['workflows'] })}
        onCreated={(id) => navigate(`/workflow-canvas/${id}`)}
      />

      {/* Schedule Dialog */}
      {selectedWorkflow && currentWorkspace && (
        <WorkflowScheduleDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          workflowId={selectedWorkflow.id}
          workflowName={selectedWorkflow.name}
          workspaceId={currentWorkspace.id}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['scheduled-jobs'] });
            toast({ title: 'Schedule Created', description: 'Workflow has been scheduled' });
          }}
        />
      )}
    </div>
  );
};
