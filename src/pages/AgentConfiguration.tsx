import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  ArrowDown,
  ArrowUp,
  CirclePlus,
  Save, 
  Bot, 
  Brain, 
  Sparkles,
  Database,
  FileText,
  Download,
  Scale,
  Key,
  Settings
} from 'lucide-react';

import { AgentLifecycleSettings } from '@/components/scheduling/AgentLifecycleSettings';
import { KnowledgeFolderSelector } from '@/components/agent/KnowledgeFolderSelector';
import { ResponsePreviewPanel } from '@/components/agent/ResponsePreviewPanel';
import { ConfigurationCompatibilityChecker } from '@/components/agent/ConfigurationCompatibilityChecker';
import { AgentTestChatDialog } from '@/components/agent/AgentTestChatDialog';
import { MemorySettingsCard } from '@/components/agent/MemorySettingsCard';
import { AwarenessSettingsCard } from '@/components/agent/AwarenessSettingsCard';
import { createAgentTask, normalizeAgentTasks } from '@/lib/agents/tasks';
import type { AgentTask, TaskScheduleHint } from '@/lib/agents/tasks';
import type { ResponseRules, ReworkSettings, MemorySettings, AwarenessSettings, defaultMemorySettings as defaultMemSettingsType, defaultAwarenessSettings as defaultAwareSettingsType } from '@/types';
import { defaultMemorySettings, defaultAwarenessSettings } from '@/types';

type CoreModel = 'core_analyst' | 'core_reviewer' | 'core_synthesizer';
type CreativityLevel = 'none' | 'very_low' | 'low' | 'medium' | 'high';

interface AgentFormData {
  display_name: string;
  user_defined_name: string;
  role_description: string;
  persona: string;
  intro_sentence: string;
  core_model: CoreModel;
  api_key_id: string;
  allowed_folders: string[];
  is_active: boolean;
  active_from: string | null;
  active_until: string | null;
  active_days: number[];
  rag_policy: {
    knowledge_base_ratio: number;
    web_verification_ratio: number;
    hallucination_tolerance: string;
    creativity_level: CreativityLevel;
  };
  response_rules: ResponseRules;
  rework_settings: ReworkSettings;
  agent_tasks: AgentTask[];
  memory_settings: MemorySettings;
  awareness_settings: AwarenessSettings;
}

const defaultFormData: AgentFormData = {
  display_name: '',
  user_defined_name: '',
  role_description: '',
  persona: '',
  intro_sentence: '',
  core_model: 'core_analyst',
  api_key_id: '',
  allowed_folders: [],
  is_active: true,
  active_from: null,
  active_until: null,
  active_days: [0, 1, 2, 3, 4, 5, 6],
  rag_policy: {
    knowledge_base_ratio: 0.7,
    web_verification_ratio: 0.3,
    hallucination_tolerance: 'very_low',
    creativity_level: 'very_low',
  },
  response_rules: {
    step_by_step: true,
    cite_if_possible: true,
    refuse_if_uncertain: true,
    include_confidence_scores: false,
    use_bullet_points: false,
    summarize_at_end: false,
    custom_response_template: null,
  },
  rework_settings: {
    enabled: true,
    max_retries: 2,
    minimum_score_threshold: 70,
    auto_correct: true,
  },
  agent_tasks: [],
  memory_settings: { ...defaultMemorySettings },
  awareness_settings: { ...defaultAwarenessSettings },
};

export const AgentConfiguration: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<AgentFormData>(defaultFormData);
  const [activePreset, setActivePreset] = useState<'balanced' | 'knowledge' | 'creative'>('balanced');

  const isNew = id === 'new';

  const asRecord = (value: unknown): Record<string, unknown> => {
    if (typeof value === 'object' && value !== null) {
      return value as Record<string, unknown>;
    }
    return {};
  };

  const getBoolean = (value: unknown, fallback: boolean) =>
    typeof value === 'boolean' ? value : fallback;
  const getNumber = (value: unknown, fallback: number) =>
    typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  const getString = (value: unknown, fallback: string) =>
    typeof value === 'string' ? value : fallback;

  const { data: agent, isLoading: agentLoading } = useQuery({
    queryKey: ['agent', id],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase
        .from('ai_profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  // Fetch workspace API keys (from safe view that excludes encrypted key data)
  interface SafeApiKey {
    id: string;
    workspace_id: string;
    provider: string;
    display_name: string | null;
    is_active: boolean;
    created_by: string;
    created_at: string;
    updated_at: string;
  }
  const { data: workspaceApiKeys } = useQuery<SafeApiKey[]>({
    queryKey: ['workspace-api-keys', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from('workspace_api_keys_safe' as any)
        .select('id, workspace_id, provider, display_name, is_active, created_by, created_at, updated_at')
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_active', true);
      if (error) throw error;
      return (data || []) as unknown as SafeApiKey[];
    },
    enabled: !!currentWorkspace?.id,
  });


  useEffect(() => {
    if (agent) {
      const ragPolicy = asRecord(agent.rag_policy);
      const responseRules = asRecord(agent.response_rules);
      setFormData({
        display_name: agent.display_name || '',
        user_defined_name: agent.user_defined_name || '',
        role_description: agent.role_description || '',
        persona: agent.persona || '',
        intro_sentence: agent.intro_sentence || '',
        core_model: agent.core_model || 'core_analyst',
        api_key_id: agent.api_key_id || '',
        allowed_folders: agent.allowed_folders || [],
        is_active: agent.is_active ?? true,
        active_from: agent.active_from || null,
        active_until: agent.active_until || null,
        active_days: agent.active_days || [0, 1, 2, 3, 4, 5, 6],
        rag_policy: {
          knowledge_base_ratio: getNumber(ragPolicy.knowledge_base_ratio, 0.7),
          web_verification_ratio: getNumber(ragPolicy.web_verification_ratio, 0.3),
          hallucination_tolerance: getString(ragPolicy.hallucination_tolerance, 'very_low'),
          creativity_level: getString(ragPolicy.creativity_level, 'very_low') as CreativityLevel,
        },
        response_rules: {
          step_by_step: getBoolean(responseRules.step_by_step, true),
          cite_if_possible: getBoolean(responseRules.cite_if_possible, true),
          refuse_if_uncertain: getBoolean(responseRules.refuse_if_uncertain, true),
          include_confidence_scores: getBoolean(responseRules.include_confidence_scores, false),
          use_bullet_points: getBoolean(responseRules.use_bullet_points, false),
          summarize_at_end: getBoolean(responseRules.summarize_at_end, false),
          custom_response_template: getString(responseRules.custom_response_template, '') || null,
        },
        rework_settings: {
          enabled: true,
          max_retries: 2,
          minimum_score_threshold: 70,
          auto_correct: true,
        },
        agent_tasks: normalizeAgentTasks((asRecord(agent).agent_tasks as AgentTask[] | null) ?? null),
        memory_settings: {
          ...defaultMemorySettings,
          ...(asRecord(agent.memory_settings as unknown) as Partial<MemorySettings>),
        },
        awareness_settings: {
          ...defaultAwarenessSettings,
          ...(asRecord(agent.awareness_settings as unknown) as Partial<AwarenessSettings>),
        },
      });
    }
  }, [agent]);

  const updateTaskOrder = (tasks: AgentTask[]) => {
    return tasks.map((task, index) => ({
      ...task,
      order: index + 1,
    }));
  };

  const handleAddTask = () => {
    setFormData((prev) => ({
      ...prev,
      agent_tasks: updateTaskOrder([...prev.agent_tasks, createAgentTask()]),
    }));
  };

  const handleMoveTask = (taskId: string, direction: 'up' | 'down') => {
    setFormData((prev) => {
      const index = prev.agent_tasks.findIndex((task) => task.id === taskId);
      if (index < 0) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.agent_tasks.length) return prev;
      const updated = [...prev.agent_tasks];
      const [moved] = updated.splice(index, 1);
      updated.splice(targetIndex, 0, moved);
      return {
        ...prev,
        agent_tasks: updateTaskOrder(updated),
      };
    });
  };

  const handleTaskChange = (taskId: string, updates: Partial<AgentTask>) => {
    setFormData((prev) => ({
      ...prev,
      agent_tasks: updateTaskOrder(
        prev.agent_tasks.map((task) => (task.id === taskId ? { ...task, ...updates } : task))
      ),
    }));
  };

  const applyPreset = (preset: 'balanced' | 'knowledge' | 'creative') => {
    setActivePreset(preset);
    switch (preset) {
      case 'balanced':
        setFormData(prev => ({
          ...prev,
          rag_policy: {
            knowledge_base_ratio: 0.7,
            web_verification_ratio: 0.3,
            hallucination_tolerance: 'low',
            creativity_level: 'low',
          },
        }));
        break;
      case 'knowledge':
        setFormData(prev => ({
          ...prev,
          rag_policy: {
            knowledge_base_ratio: 0.9,
            web_verification_ratio: 0.1,
            hallucination_tolerance: 'very_low',
            creativity_level: 'none',
          },
        }));
        break;
      case 'creative':
        setFormData(prev => ({
          ...prev,
          rag_policy: {
            knowledge_base_ratio: 0.5,
            web_verification_ratio: 0.5,
            hallucination_tolerance: 'medium',
            creativity_level: 'medium',
          },
        }));
        break;
    }
  };

  const handleSubmit = async () => {
    if (!formData.display_name.trim()) {
      toast({ title: 'Error', description: 'Display name is required', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast({ title: 'Error', description: 'You must be logged in to save an agent', variant: 'destructive' });
        setLoading(false);
        return;
      }

      const payload: Record<string, unknown> = {
        display_name: formData.display_name,
        user_defined_name: formData.user_defined_name || formData.display_name,
        role_description: formData.role_description || null,
        persona: formData.persona || null,
        intro_sentence: formData.intro_sentence || null,
        core_model: formData.core_model,
        api_key_id: formData.api_key_id || null,
        allowed_folders: formData.allowed_folders,
        is_active: formData.is_active,
        active_from: formData.active_from,
        active_until: formData.active_until,
        active_days: formData.active_days,
        rag_policy: formData.rag_policy as unknown,
        response_rules: formData.response_rules as unknown,
        agent_tasks: formData.agent_tasks as unknown,
        memory_settings: formData.memory_settings as unknown,
        awareness_settings: formData.awareness_settings as unknown,
      };

      if (isNew) {
        const insertPayload = {
          ...payload,
          created_by: userData.user.id,
          workspace_id: currentWorkspace?.id || null,
        };
        const { error } = await supabase.from('ai_profiles').insert(insertPayload as never);
        if (error) throw error;
        toast({ title: 'Success', description: 'Agent created successfully' });
      } else {
        const { error } = await supabase.from('ai_profiles').update(payload).eq('id', id);
        if (error) throw error;
        toast({ title: 'Success', description: 'Agent updated successfully' });
      }

      queryClient.invalidateQueries({ queryKey: ['agents'] });
      navigate('/agents');
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save agent',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const exportData = {
      display_name: formData.display_name,
      user_defined_name: formData.user_defined_name,
      role_description: formData.role_description,
      persona: formData.persona,
      intro_sentence: formData.intro_sentence,
      core_model: formData.core_model,
      allowed_folders: formData.allowed_folders,
      rag_policy: formData.rag_policy,
      response_rules: formData.response_rules,
      agent_tasks: formData.agent_tasks,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(formData.display_name || 'agent').replace(/\s+/g, '_')}_config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Exported',
      description: 'Agent configuration exported successfully',
    });
  };

  const modelIcons: Record<CoreModel, { icon: React.ReactNode; label: string; category: string }> = {
    core_analyst: { icon: <Brain className="h-5 w-5" />, label: 'CORE_ANALYST', category: 'Analysis' },
    core_reviewer: { icon: <FileText className="h-5 w-5" />, label: 'CORE_REVIEWER', category: 'Review' },
    core_synthesizer: { icon: <Sparkles className="h-5 w-5" />, label: 'CORE_SYNTHESIZER', category: 'Synthesis' },
  };
  const scheduleHintLabels: Record<TaskScheduleHint, string> = {
    on_demand: 'On Demand',
    hourly: 'Hourly',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    event_driven: 'Event Driven',
  };


  if (agentLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/agents')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">CONFIGURATION MATRIX</h1>
            <p className="text-sm text-muted-foreground">
              {isNew ? 'Deploy New Agent' : `Editing: ${agent?.display_name || 'Agent'}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AgentTestChatDialog
            formData={{
              display_name: formData.display_name,
              persona: formData.persona,
              role_description: formData.role_description,
              intro_sentence: formData.intro_sentence,
              core_model: formData.core_model,
              allowed_folders: formData.allowed_folders,
              rag_policy: formData.rag_policy,
              response_rules: formData.response_rules,
            }}
            reworkSettings={formData.rework_settings}
            workspaceId={currentWorkspace?.id || null}
            isCompatible={true}
          />
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-2 gradient-cyber text-primary-foreground">
            <Save className="h-4 w-4" />
            {loading ? 'Saving...' : 'SAVE CHANGES'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Agent Identity Section */}
        <Card className="cyber-border">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bot className="h-5 w-5 text-primary" />
              AGENT IDENTITY
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Display Name (System)
                </Label>
                <Input
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="CORE_ANALYST"
                  className="bg-secondary/50 border-border/50 font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  User Defined Name
                </Label>
                <Input
                  value={formData.user_defined_name}
                  onChange={(e) => setFormData({ ...formData, user_defined_name: e.target.value })}
                  placeholder="AGENT_2748"
                  className="bg-secondary/50 border-border/50 font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Intro Sentence
              </Label>
              <Input
                value={formData.intro_sentence}
                onChange={(e) => setFormData({ ...formData, intro_sentence: e.target.value })}
                placeholder="I am ready to assist you..."
                className="bg-secondary/50 border-border/50"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  API Key
                </Label>
                <Button 
                  variant="link" 
                  size="sm" 
                  className="h-auto p-0 text-xs"
                  onClick={() => navigate('/settings')}
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Manage Keys
                </Button>
              </div>
              <Select 
                value={formData.api_key_id || 'none'} 
                onValueChange={(value) => setFormData({ ...formData, api_key_id: value === 'none' ? '' : value })}
              >
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <SelectValue placeholder="Select API Key (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      <span>Use Workspace Default</span>
                    </div>
                  </SelectItem>
                  {workspaceApiKeys?.map((key) => (
                    <SelectItem key={key.id} value={key.id}>
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-primary" />
                        <span className="capitalize">{key.provider}</span>
                        {key.display_name && (
                          <span className="text-xs text-muted-foreground">({key.display_name})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(!workspaceApiKeys || workspaceApiKeys.length === 0) && (
                <p className="text-xs text-muted-foreground">
                  No API keys configured. <button onClick={() => navigate('/settings')} className="text-primary underline">Add one in Settings</button>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Persona Directive
              </Label>
              <Input
                value={formData.persona}
                onChange={(e) => setFormData({ ...formData, persona: e.target.value })}
                placeholder="EAGLE1-ANALYTICAL"
                className="bg-secondary/50 border-border/50 font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Role Description
              </Label>
              <Textarea
                value={formData.role_description}
                onChange={(e) => setFormData({ ...formData, role_description: e.target.value })}
                placeholder="Explain agent identity and specialization..."
                rows={3}
                className="bg-secondary/50 border-border/50 resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Core Model Binding Section */}
        <Card className="cyber-border">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5 text-primary" />
              CORE MODEL BINDING
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Selected Neural Core
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(modelIcons) as CoreModel[]).map((model) => (
                  <button
                    key={model}
                    onClick={() => setFormData({ ...formData, core_model: model })}
                    className={`p-4 rounded-lg border transition-all flex flex-col items-center gap-2 ${
                      formData.core_model === model
                        ? 'border-primary bg-primary/10 cyber-glow'
                        : 'border-border/50 hover:border-primary/50 bg-secondary/30'
                    }`}
                  >
                    <div className={formData.core_model === model ? 'text-primary' : 'text-muted-foreground'}>
                      {modelIcons[model].icon}
                    </div>
                    <span className="text-xs font-mono">{modelIcons[model].label}</span>
                  </button>
                ))}
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Knowledge Folder Access */}
        <KnowledgeFolderSelector
          selectedFolders={formData.allowed_folders}
          onFoldersChange={(folders) => setFormData({ ...formData, allowed_folders: folders })}
          workspaceId={currentWorkspace?.id}
        />

        {/* Tasks Section */}
        <Card className="cyber-border lg:col-span-2">
          <CardHeader className="border-b border-border/50 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bot className="h-5 w-5 text-primary" />
              TASKS
            </CardTitle>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleAddTask}>
              <CirclePlus className="h-4 w-4" />
              Add Task
            </Button>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {formData.agent_tasks.length === 0 ? (
              <div className="text-sm text-muted-foreground border border-dashed border-border/60 rounded-lg p-4">
                No tasks yet. Add a task to define the agent's workload and scheduling hints.
              </div>
            ) : (
              <div className="space-y-4">
                {formData.agent_tasks.map((task, index) => (
                  <div key={task.id} className="border border-border/50 rounded-lg p-4 space-y-4 bg-secondary/20">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                        <Badge variant="outline">Task {index + 1}</Badge>
                        <span>Order {task.order}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={index === 0}
                          onClick={() => handleMoveTask(task.id, 'up')}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={index === formData.agent_tasks.length - 1}
                          onClick={() => handleMoveTask(task.id, 'down')}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={task.enabled}
                            onCheckedChange={(val) => handleTaskChange(task.id, { enabled: val })}
                          />
                          <span className="text-xs text-muted-foreground uppercase">Enabled</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Title</Label>
                        <Input
                          value={task.title}
                          onChange={(e) => handleTaskChange(task.id, { title: e.target.value })}
                          placeholder="Task title"
                          className="bg-secondary/50 border-border/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Schedule Hint</Label>
                        <Select
                          value={task.scheduleHint}
                          onValueChange={(value) => handleTaskChange(task.id, { scheduleHint: value as TaskScheduleHint })}
                        >
                          <SelectTrigger className="bg-secondary/50 border-border/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(scheduleHintLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Description</Label>
                        <Textarea
                          value={task.description}
                          onChange={(e) => handleTaskChange(task.id, { description: e.target.value })}
                          placeholder="Describe what this task should accomplish..."
                          rows={3}
                          className="bg-secondary/50 border-border/50 resize-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Core Purpose</Label>
                        <Input
                          value={task.corePurpose}
                          readOnly
                          className="bg-secondary/50 border-border/50 text-muted-foreground"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* RAG Governance Policy Section */}
        <Card className="cyber-border lg:col-span-2">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Scale className="h-5 w-5 text-primary" />
              RAG GOVERNANCE POLICY
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Presets */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                RAG Policy Presets
              </Label>
              <div className="flex gap-2">
                {(['balanced', 'knowledge', 'creative'] as const).map((preset) => (
                  <Button
                    key={preset}
                    variant={activePreset === preset ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => applyPreset(preset)}
                    className="uppercase text-xs font-mono"
                  >
                    {preset === 'balanced' && 'Balanced'}
                    {preset === 'knowledge' && 'Knowledge-Intensive'}
                    {preset === 'creative' && 'Creative'}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Ratios */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      Knowledge Base Ratio
                    </Label>
                    <span className="text-sm font-mono text-primary">
                      {Math.round(formData.rag_policy.knowledge_base_ratio * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[formData.rag_policy.knowledge_base_ratio * 100]}
                    onValueChange={([val]) => setFormData(prev => ({
                      ...prev,
                      rag_policy: {
                        ...prev.rag_policy,
                        knowledge_base_ratio: val / 100,
                        web_verification_ratio: (100 - val) / 100,
                      }
                    }))}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      Web Verification Ratio
                    </Label>
                    <span className="text-sm font-mono text-primary">
                      {Math.round(formData.rag_policy.web_verification_ratio * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[formData.rag_policy.web_verification_ratio * 100]}
                    onValueChange={([val]) => setFormData(prev => ({
                      ...prev,
                      rag_policy: {
                        ...prev.rag_policy,
                        web_verification_ratio: val / 100,
                        knowledge_base_ratio: (100 - val) / 100,
                      }
                    }))}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Controls */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Hallucination Control
                  </Label>
                  <Select
                    value={formData.rag_policy.hallucination_tolerance}
                    onValueChange={(val) => setFormData(prev => ({
                      ...prev,
                      rag_policy: { ...prev.rag_policy, hallucination_tolerance: val }
                    }))}
                  >
                    <SelectTrigger className="bg-secondary/50 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="very_low">STRICT</SelectItem>
                      <SelectItem value="low">LOW</SelectItem>
                      <SelectItem value="medium">MEDIUM</SelectItem>
                      <SelectItem value="high">PERMISSIVE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Creativity Level
                  </Label>
                  <Select
                    value={formData.rag_policy.creativity_level}
                    onValueChange={(val: CreativityLevel) => setFormData(prev => ({
                      ...prev,
                      rag_policy: { ...prev.rag_policy, creativity_level: val }
                    }))}
                  >
                    <SelectTrigger className="bg-secondary/50 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">NONE</SelectItem>
                      <SelectItem value="very_low">VERY_LOW</SelectItem>
                      <SelectItem value="low">LOW</SelectItem>
                      <SelectItem value="medium">MEDIUM</SelectItem>
                      <SelectItem value="high">HIGH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Response Rules */}
            <div className="border-t border-border/50 pt-4">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-4 block">
                Response Rules
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.response_rules.step_by_step}
                    onCheckedChange={(val) => setFormData(prev => ({
                      ...prev,
                      response_rules: { ...prev.response_rules, step_by_step: val }
                    }))}
                  />
                  <Label className="text-sm">Step-by-Step Reasoning</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.response_rules.cite_if_possible}
                    onCheckedChange={(val) => setFormData(prev => ({
                      ...prev,
                      response_rules: { ...prev.response_rules, cite_if_possible: val }
                    }))}
                  />
                  <Label className="text-sm">Cite Sources</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.response_rules.refuse_if_uncertain}
                    onCheckedChange={(val) => setFormData(prev => ({
                      ...prev,
                      response_rules: { ...prev.response_rules, refuse_if_uncertain: val }
                    }))}
                  />
                  <Label className="text-sm">Refuse If Uncertain</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.response_rules.include_confidence_scores}
                    onCheckedChange={(val) => setFormData(prev => ({
                      ...prev,
                      response_rules: { ...prev.response_rules, include_confidence_scores: val }
                    }))}
                  />
                  <Label className="text-sm">Include Confidence Scores</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.response_rules.use_bullet_points}
                    onCheckedChange={(val) => setFormData(prev => ({
                      ...prev,
                      response_rules: { ...prev.response_rules, use_bullet_points: val }
                    }))}
                  />
                  <Label className="text-sm">Use Bullet Points</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.response_rules.summarize_at_end}
                    onCheckedChange={(val) => setFormData(prev => ({
                      ...prev,
                      response_rules: { ...prev.response_rules, summarize_at_end: val }
                    }))}
                  />
                  <Label className="text-sm">Summarize at End</Label>
                </div>
              </div>
            </div>

            {/* Re-work Settings */}
            <div className="border-t border-border/50 pt-4">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-4 block">
                Re-work Authority Settings
              </Label>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.rework_settings.enabled}
                    onCheckedChange={(val) => setFormData(prev => ({
                      ...prev,
                      rework_settings: { ...prev.rework_settings, enabled: val }
                    }))}
                  />
                  <Label className="text-sm">Enable Auto Re-work</Label>
                </div>
                {formData.rework_settings.enabled && (
                  <div className="grid md:grid-cols-2 gap-4 pl-6">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-xs text-muted-foreground">Max Retries</Label>
                        <span className="text-sm font-mono text-primary">{formData.rework_settings.max_retries}</span>
                      </div>
                      <Slider
                        value={[formData.rework_settings.max_retries]}
                        onValueChange={([val]) => setFormData(prev => ({
                          ...prev,
                          rework_settings: { ...prev.rework_settings, max_retries: val }
                        }))}
                        min={1}
                        max={5}
                        step={1}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-xs text-muted-foreground">Minimum Score Threshold</Label>
                        <span className="text-sm font-mono text-primary">{formData.rework_settings.minimum_score_threshold}%</span>
                      </div>
                      <Slider
                        value={[formData.rework_settings.minimum_score_threshold]}
                        onValueChange={([val]) => setFormData(prev => ({
                          ...prev,
                          rework_settings: { ...prev.rework_settings, minimum_score_threshold: val }
                        }))}
                        min={50}
                        max={95}
                        step={5}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Compatibility Checker */}
        <ConfigurationCompatibilityChecker
          responseRules={formData.response_rules}
          onAutoFixTemplate={(template) => {
            setFormData(prev => ({
              ...prev,
              response_rules: { ...prev.response_rules, custom_response_template: template }
            }));
          }}
          onDisableMismatchedRules={(rulesToDisable) => {
            setFormData(prev => ({
              ...prev,
              response_rules: {
                ...prev.response_rules,
                ...rulesToDisable
              }
            }));
          }}
        />

        {/* Response Preview Panel */}
        <ResponsePreviewPanel
          responseRules={formData.response_rules}
          onTemplateChange={(template) => setFormData(prev => ({
            ...prev,
            response_rules: { ...prev.response_rules, custom_response_template: template }
          }))}
        />

        {/* Agent Lifecycle Section */}
        <AgentLifecycleSettings
          isActive={formData.is_active}
          onIsActiveChange={(val) => setFormData({ ...formData, is_active: val })}
          activeFrom={formData.active_from}
          onActiveFromChange={(val) => setFormData({ ...formData, active_from: val })}
          activeUntil={formData.active_until}
          onActiveUntilChange={(val) => setFormData({ ...formData, active_until: val })}
          activeDays={formData.active_days}
          onActiveDaysChange={(days) => setFormData({ ...formData, active_days: days })}
        />

        {/* Intelligence Section - Memory & Awareness */}
        <MemorySettingsCard
          settings={formData.memory_settings}
          onChange={(settings) => setFormData(prev => ({ ...prev, memory_settings: settings }))}
        />

        <AwarenessSettingsCard
          settings={formData.awareness_settings}
          onChange={(settings) => setFormData(prev => ({ ...prev, awareness_settings: settings }))}
        />
      </div>
    </div>
  );
};
