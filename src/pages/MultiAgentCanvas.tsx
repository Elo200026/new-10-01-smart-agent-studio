import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
  NodeProps,
  BackgroundVariant,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Bot, Play, Plus, Trash2, Zap, Save, Settings2, ArrowLeft, MessageCircle, Store, Clock, Undo2, Redo2, Printer, Brain, Eye } from 'lucide-react';
import { usePrintCanvas } from '@/hooks/usePrintCanvas';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useToast } from '@/hooks/use-toast';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { AgentNodeConfig } from '@/components/canvas/AgentNodeConfig';
import { AgentChatPanel } from '@/components/canvas/AgentChatPanel';
import { PublishToMarketplaceDialog } from '@/components/dialogs/PublishToMarketplaceDialog';
import { WorkflowScheduleDialog } from '@/components/scheduling/WorkflowScheduleDialog';
import { WorkflowSelector } from '@/components/canvas/WorkflowSelector';
import { WorkflowImportExport } from '@/components/canvas/WorkflowImportExport';
import { CollaboratorCursors, CollaboratorAvatars } from '@/components/canvas/CollaboratorCursors';
import { useRealtimeCollaboration } from '@/hooks/useRealtimeCollaboration';

interface AgentNodeData {
  label: string;
  model: string;
  role?: string;
  agentId: string;
  memoryEnabled?: boolean;
  awarenessEnabled?: boolean;
  awarenessLevel?: number;
  inputs?: {
    fromKnowledgeBase: string[];
    fromAgents: string[];
  };
  outputs?: {
    toKnowledgeBase: boolean;
    toAgents: string[];
  };
}

interface WorkflowImportData {
  name?: string;
  nodes?: unknown;
  edges?: unknown;
}

const modelColors: Record<string, { gradient: string; glow: string; text: string }> = {
  core_analyst: { gradient: 'from-blue-500 to-cyan-500', glow: 'shadow-blue-500/30', text: 'text-blue-500' },
  core_reviewer: { gradient: 'from-amber-500 to-orange-500', glow: 'shadow-amber-500/30', text: 'text-amber-500' },
  core_synthesizer: { gradient: 'from-purple-500 to-pink-500', glow: 'shadow-purple-500/30', text: 'text-purple-500' },
};

const AgentNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as unknown as AgentNodeData;
  const colors = modelColors[nodeData.model] || modelColors.core_analyst;
  const inputCount = (nodeData.inputs?.fromKnowledgeBase?.length || 0) + (nodeData.inputs?.fromAgents?.length || 0);
  const outputCount = (nodeData.outputs?.toAgents?.length || 0) + (nodeData.outputs?.toKnowledgeBase ? 1 : 0);

  return (
    <div
      className={`relative bg-card/90 backdrop-blur-md border-2 rounded-2xl p-5 min-w-[240px] shadow-xl transition-all duration-300 cursor-pointer group ${
        selected
          ? `border-primary ${colors.glow} shadow-2xl scale-105`
          : 'border-border/50 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1'
      }`}
    >
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${colors.gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />
      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !bg-gradient-to-r !from-primary !to-primary/80 !border-2 !border-background !rounded-full !shadow-lg"
      />
      <div className="flex items-center gap-3 mb-3 relative">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-lg ring-4 ring-background`}>
          <Bot className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-base">{nodeData.label}</p>
          <Badge className={`text-xs bg-gradient-to-r ${colors.gradient} text-white border-0 shadow-sm`}>
            {nodeData.model?.replace('core_', '')}
          </Badge>
        </div>
      </div>
      {nodeData.role && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 pl-1 border-l-2 border-primary/30">{nodeData.role}</p>
      )}
      <div className="flex gap-2 text-xs flex-wrap">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-muted/80">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="font-medium">{inputCount} in</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-muted/80">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="font-medium">{outputCount} out</span>
        </div>
        {nodeData.memoryEnabled && (
          <div className="flex items-center gap-1 px-2 py-1.5 rounded-full bg-primary/10" title="Memory Enabled">
            <Brain className="h-3 w-3 text-primary" />
          </div>
        )}
        {nodeData.awarenessEnabled && (
          <div className="flex items-center gap-1 px-2 py-1.5 rounded-full bg-primary/10" title={`Awareness Level ${nodeData.awarenessLevel || 2}`}>
            <Eye className="h-3 w-3 text-primary" />
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-4 !h-4 !bg-gradient-to-r !from-primary/80 !to-primary !border-2 !border-background !rounded-full !shadow-lg"
      />
    </div>
  );
};

const StartNode: React.FC<NodeProps> = ({ selected }) => {
  return (
    <div
      className={`relative bg-gradient-to-br from-green-500/20 to-emerald-500/10 backdrop-blur-sm border-2 border-green-500/50 rounded-2xl p-5 shadow-xl transition-all duration-300 ${
        selected ? 'shadow-green-500/40 scale-105 border-green-500' : 'hover:shadow-green-500/20 hover:-translate-y-1'
      }`}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 opacity-10 blur-xl" />
      <div className="relative flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30 ring-4 ring-green-500/20">
          <Zap className="h-6 w-6 text-white" />
        </div>
        <div>
          <span className="font-bold text-green-500 text-lg">Start</span>
          <p className="text-xs text-muted-foreground">Workflow Entry</p>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-4 !h-4 !bg-gradient-to-r !from-green-500 !to-emerald-500 !border-2 !border-background !rounded-full !shadow-lg"
      />
    </div>
  );
};

const EndNode: React.FC<NodeProps> = ({ selected }) => {
  return (
    <div
      className={`relative bg-gradient-to-br from-red-500/20 to-rose-500/10 backdrop-blur-sm border-2 border-red-500/50 rounded-2xl p-5 shadow-xl transition-all duration-300 ${
        selected ? 'shadow-red-500/40 scale-105 border-red-500' : 'hover:shadow-red-500/20 hover:-translate-y-1'
      }`}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-red-500 to-rose-500 opacity-10 blur-xl" />
      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !bg-gradient-to-r !from-red-500 !to-rose-500 !border-2 !border-background !rounded-full !shadow-lg"
      />
      <div className="relative flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-lg shadow-red-500/30 ring-4 ring-red-500/20">
          <Settings2 className="h-6 w-6 text-white" />
        </div>
        <div>
          <span className="font-bold text-red-500 text-lg">End</span>
          <p className="text-xs text-muted-foreground">Workflow Exit</p>
        </div>
      </div>
    </div>
  );
};

const initialNodes: Node[] = [
  {
    id: 'start',
    type: 'start',
    position: { x: 50, y: 200 },
    data: {},
    deletable: false,
  },
  {
    id: 'end',
    type: 'end',
    position: { x: 700, y: 200 },
    data: {},
    deletable: false,
  },
];

const nodeTypes = { agent: AgentNode, start: StartNode, end: EndNode };

const MultiAgentCanvas: React.FC = () => {
  const { configId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();

  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedAgentToAdd, setSelectedAgentToAdd] = useState<string>('');
  const [configName, setConfigName] = useState('New Multi-Agent Config');
  const [configDescription, setConfigDescription] = useState('');
  const [selectedNodeForConfig, setSelectedNodeForConfig] = useState<Node | null>(null);
  const [saving, setSaving] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [showEditor, setShowEditor] = useState(!!configId);

  const { printCanvas } = usePrintCanvas();

  const onNodesChange = useCallback(
    (changes: Parameters<typeof import('@xyflow/react').applyNodeChanges>[0]) => {
      const { applyNodeChanges } = require('@xyflow/react');
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    []
  );

  const onEdgesChange = useCallback(
    (changes: Parameters<typeof import('@xyflow/react').applyEdgeChanges>[0]) => {
      const { applyEdgeChanges } = require('@xyflow/react');
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    []
  );

  const { undo, redo, canUndo, canRedo, takeSnapshot, isUndoRedoAction } = useUndoRedo(
    nodes,
    edges,
    setNodes,
    setEdges
  );

  const prevNodesRef = useRef<string>('');
  const prevEdgesRef = useRef<string>('');

  useEffect(() => {
    if (isUndoRedoAction) return;
    const nodesJson = JSON.stringify(nodes.map(n => ({ id: n.id, position: n.position, data: n.data })));
    const edgesJson = JSON.stringify(edges);
    const nodesChanged = nodesJson !== prevNodesRef.current;
    const edgesChanged = edgesJson !== prevEdgesRef.current;
    if ((nodesChanged || edgesChanged) && prevNodesRef.current !== '') {
      takeSnapshot();
    }
    prevNodesRef.current = nodesJson;
    prevEdgesRef.current = edgesJson;
  }, [nodes, edges, takeSnapshot, isUndoRedoAction]);

  const [currentUserId, setCurrentUserId] = useState<string>();
  const [currentUserEmail, setCurrentUserEmail] = useState<string>();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
        setCurrentUserEmail(user.email);
      }
    });
  }, []);

  const { collaborators, broadcastCursor, isConnected } = useRealtimeCollaboration(
    configId,
    currentUserId,
    currentUserEmail
  );

  const handleImport = (data: WorkflowImportData) => {
    if (Array.isArray(data.nodes)) {
      setNodes(data.nodes as Node[]);
    }
    if (Array.isArray(data.edges)) {
      setEdges(data.edges as Edge[]);
    }
    if (typeof data.name === 'string') {
      setConfigName(data.name);
    }
    toast({ title: 'Imported', description: 'Workflow imported successfully' });
  };

  const { data: agents } = useQuery({
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

  const { data: folders = [] } = useQuery({
    queryKey: ['folders', currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_folders')
        .select('id, name, folder_type')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: existingConfig } = useQuery({
    queryKey: ['multi-agent-config', configId],
    queryFn: async () => {
      if (!configId) return null;
      const { data, error } = await supabase
        .from('multi_agent_configs')
        .select('*')
        .eq('id', configId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!configId,
  });

  useEffect(() => {
    if (configId) {
      setShowEditor(true);
    }
  }, [configId]);

  useEffect(() => {
    if (existingConfig) {
      setConfigName(existingConfig.name);
      setConfigDescription(existingConfig.description || '');
      const canvasData = existingConfig.canvas_data as { nodes?: Node[]; edges?: Edge[] } | null;
      if (canvasData?.nodes) {
        setNodes(canvasData.nodes);
      }
      if (canvasData?.edges) {
        setEdges(canvasData.edges);
      }
    }
  }, [existingConfig]);

  useEffect(() => {
    if (!configId && showEditor) {
      setNodes(initialNodes);
      setEdges([]);
      setConfigName('New Multi-Agent Config');
      setConfigDescription('');
    }
  }, [configId, showEditor]);

  const handleConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
          },
          eds
        )
      );
    },
    []
  );

  const addAgentNode = () => {
    if (!selectedAgentToAdd) return;
    const agent = agents?.find((a) => a.id === selectedAgentToAdd);
    if (!agent) return;
    const allowedFolders = agent.allowed_folders || [];

    const newNode: Node = {
      id: `agent-${Date.now()}`,
      type: 'agent',
      position: {
        x: 300 + Math.random() * 100,
        y: 100 + Math.random() * 200,
      },
      data: {
        label: agent.display_name,
        model: agent.core_model,
        role: agent.role_description,
        agentId: agent.id,
        memoryEnabled: !!(agent.memory_settings as Record<string, unknown>)?.short_term_enabled || !!(agent.memory_settings as Record<string, unknown>)?.long_term_enabled,
        awarenessEnabled: !!(agent.awareness_settings as Record<string, unknown>)?.self_role_enabled || !!(agent.awareness_settings as Record<string, unknown>)?.proactive_reasoning,
        awarenessLevel: ((agent.awareness_settings as Record<string, unknown>)?.awareness_level as number) || 2,
        inputs: { fromKnowledgeBase: allowedFolders, fromAgents: [] },
        outputs: { toKnowledgeBase: false, toAgents: [] },
      },
    };

    setNodes((nds) => [...nds, newNode]);
    setSelectedAgentToAdd('');
    toast({
      title: 'Agent Added',
      description: `${agent.display_name} added to canvas.`,
    });
  };

  const deleteSelectedNodes = () => {
    const selectedIds = new Set(
      nodes.filter((n) => n.selected && n.type !== 'start' && n.type !== 'end').map((n) => n.id)
    );
    setNodes((nds) => nds.filter((node) => !selectedIds.has(node.id)));
    setEdges((eds) =>
      eds.filter((edge) => !selectedIds.has(edge.source) && !selectedIds.has(edge.target))
    );
  };

  const handleSave = async () => {
    if (!currentWorkspace) {
      toast({ title: 'No Workspace', description: 'Please select or create a workspace first', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      toast({ title: 'Not Signed In', description: 'Please sign in to save configurations', variant: 'destructive' });
      setSaving(false);
      return;
    }

    const configData = {
      name: configName,
      description: configDescription,
      workspace_id: currentWorkspace.id,
      canvas_data: JSON.parse(JSON.stringify({ nodes, edges })),
      agent_nodes: JSON.parse(JSON.stringify(nodes.filter((n) => n.type === 'agent').map((n) => n.data))),
      connections: JSON.parse(JSON.stringify(edges)),
      created_by: user.user.id,
    };

    let error = null;
    let newId: string | null = null;

    if (configId) {
      const { error: updateError } = await supabase
        .from('multi_agent_configs')
        .update(configData)
        .eq('id', configId);
      error = updateError;
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('multi_agent_configs')
        .insert(configData)
        .select('id')
        .single();
      error = insertError;
      newId = inserted?.id || null;
    }

    setSaving(false);

    if (error) {
      toast({ title: 'Error', description: 'Failed to save configuration', variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: 'Configuration saved successfully' });
      queryClient.invalidateQueries({ queryKey: ['multi-agent-configs'] });
      if (newId) {
        navigate(`/multi-agent-canvas/${newId}`, { replace: true });
      }
    }
  };

  const handleExport = async () => {
    const agentNodes = nodes.filter((n) => n.type === 'agent');
    if (agentNodes.length === 0) {
      toast({ title: 'No Agents', description: 'Add at least one agent to export', variant: 'destructive' });
      return;
    }

    const exportData = {
      name: configName,
      description: configDescription,
      nodes,
      edges,
      agents: agentNodes.map((n) => n.data),
      exportedAt: new Date().toISOString(),
    };

    if (configId) {
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        await supabase.from('exported_configs').insert({
          multi_agent_config_id: configId,
          config_data: JSON.parse(JSON.stringify(exportData)),
          exported_by: user.user.id,
        });
      }
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${configName.replace(/\s+/g, '_')}_config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'Configuration exported successfully' });
  };

  const handleDeleteConfig = async () => {
    if (!configId) return;
    const { error } = await supabase.from('multi_agent_configs').delete().eq('id', configId);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete configuration', variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Configuration deleted' });
      navigate('/multi-agent-canvas');
      queryClient.invalidateQueries({ queryKey: ['multi-agent-configs'] });
    }
  };

  const runWorkflow = () => {
    const agentNodes = nodes.filter((n) => n.type === 'agent');
    if (agentNodes.length === 0) {
      toast({ title: 'No Agents', description: 'Add at least one agent to the workflow', variant: 'destructive' });
      return;
    }
    setChatOpen(true);
  };

  const chatAgents = useMemo(() => {
    return nodes
      .filter((n) => n.type === 'agent')
      .map((n) => {
        const data = n.data as unknown as AgentNodeData;
        return { id: n.id, label: data.label, model: data.model, agentId: data.agentId };
      });
  }, [nodes]);

  const availableAgents = useMemo(() => {
    const usedAgentIds = nodes
      .filter((n) => n.type === 'agent')
      .map((n) => (n.data as unknown as AgentNodeData).agentId);
    return agents?.filter((a) => !usedAgentIds.includes(a.id)) || [];
  }, [agents, nodes]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type === 'agent') {
      setSelectedNodeForConfig(node);
    }
  }, []);

  const handleUpdateNodeConfig = (updates: Partial<AgentNodeData>) => {
    if (!selectedNodeForConfig) return;
    setNodes((nds) =>
      nds.map((node) =>
        node.id === selectedNodeForConfig.id
          ? { ...node, data: { ...node.data, ...updates } }
          : node
      )
    );
  };

  const agentNodesForConfig = nodes
    .filter((n) => n.type === 'agent')
    .map((n) => ({ id: n.id, data: n.data as unknown as AgentNodeData }));

  if (!configId && !showEditor) {
    return <WorkflowSelector onCreateNew={() => setShowEditor(true)} />;
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b bg-card/80 backdrop-blur-sm flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => { setShowEditor(false); navigate('/multi-agent-canvas'); }}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="h-6 w-px bg-border" />
        <Input
          value={configName}
          onChange={(e) => setConfigName(e.target.value)}
          className="max-w-[200px] h-8 text-sm"
        />
        <div className="flex-1" />

        {/* Agent selector */}
        <Select value={selectedAgentToAdd} onValueChange={setSelectedAgentToAdd}>
          <SelectTrigger className="w-[180px] h-8">
            <SelectValue placeholder="Add agent..." />
          </SelectTrigger>
          <SelectContent>
            {availableAgents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={addAgentNode} disabled={!selectedAgentToAdd}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>

        <div className="h-6 w-px bg-border" />

        <Button size="sm" variant="ghost" onClick={undo} disabled={!canUndo} title="Undo">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={redo} disabled={!canRedo} title="Redo">
          <Redo2 className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={deleteSelectedNodes} title="Delete selected">
          <Trash2 className="h-4 w-4" />
        </Button>

        <div className="h-6 w-px bg-border" />

        <Button size="sm" variant="outline" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1" /> {saving ? 'Saving...' : 'Save'}
        </Button>
        <Button size="sm" variant="outline" onClick={runWorkflow}>
          <Play className="h-4 w-4 mr-1" /> Run
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setScheduleDialogOpen(true)} title="Schedule">
          <Clock className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setPublishDialogOpen(true)} title="Publish">
          <Store className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => printCanvas()} title="Print">
          <Printer className="h-4 w-4" />
        </Button>

        {isConnected && <CollaboratorAvatars collaborators={collaborators} />}
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background variant={BackgroundVariant.Dots} />
          <Controls />
          <MiniMap />
          {configId && <CollaboratorCursors collaborators={collaborators} />}
        </ReactFlow>

        {/* Side config panel */}
        {selectedNodeForConfig && (
          <div className="absolute top-4 right-4 w-80 max-h-[calc(100vh-8rem)] overflow-auto z-10">
            <AgentNodeConfig
              node={selectedNodeForConfig}
              allNodes={agentNodesForConfig}
              folders={folders}
              onUpdate={handleUpdateNodeConfig}
              onClose={() => setSelectedNodeForConfig(null)}
            />
          </div>
        )}

        {/* Chat panel */}
        {chatOpen && (
          <AgentChatPanel
            agents={chatAgents}
            configId={configId}
            workspaceId={currentWorkspace?.id}
            onClose={() => setChatOpen(false)}
          />
        )}
      </div>

      {/* Import/Export */}
      <WorkflowImportExport
        configName={configName}
        nodes={nodes}
        edges={edges}
        onImport={handleImport}
        onExport={handleExport}
      />

      {/* Publish dialog */}
      {configId && currentWorkspace && (
        <PublishToMarketplaceDialog
          open={publishDialogOpen}
          onOpenChange={setPublishDialogOpen}
          configId={configId}
          configName={configName}
          workspaceId={currentWorkspace.id}
        />
      )}

      {/* Schedule dialog */}
      {configId && currentWorkspace && (
        <WorkflowScheduleDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          workflowId={configId}
          workflowName={configName}
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

export default MultiAgentCanvas;
