import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Bot, Plus, Trash2, Zap, Save, ArrowLeft, Settings2, Brain, Eye, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

interface AgentNodeData {
  label: string;
  model: string;
  role?: string;
  agentId: string;
}

const modelColors: Record<string, { gradient: string; glow: string }> = {
  core_analyst: { gradient: 'from-blue-500 to-cyan-500', glow: 'shadow-blue-500/30' },
  core_reviewer: { gradient: 'from-amber-500 to-orange-500', glow: 'shadow-amber-500/30' },
  core_synthesizer: { gradient: 'from-purple-500 to-pink-500', glow: 'shadow-purple-500/30' },
};

const AgentNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as unknown as AgentNodeData;
  const colors = modelColors[nodeData.model] || modelColors.core_analyst;

  return (
    <div
      className={`relative bg-card/90 backdrop-blur-md border-2 rounded-2xl p-5 min-w-[220px] shadow-xl transition-all duration-300 ${
        selected ? `border-primary ${colors.glow} shadow-2xl scale-105` : 'border-border/50 hover:border-primary/50'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!w-4 !h-4 !bg-primary !border-2 !border-background !rounded-full" />
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-lg`}>
          <Bot className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="font-semibold text-sm">{nodeData.label}</p>
          <Badge className={`text-xs bg-gradient-to-r ${colors.gradient} text-white border-0`}>
            {nodeData.model?.replace('core_', '')}
          </Badge>
        </div>
      </div>
      {nodeData.role && <p className="text-xs text-muted-foreground line-clamp-2 border-l-2 border-primary/30 pl-2">{nodeData.role}</p>}
      <Handle type="source" position={Position.Right} className="!w-4 !h-4 !bg-primary !border-2 !border-background !rounded-full" />
    </div>
  );
};

const StartNode: React.FC<NodeProps> = ({ selected }) => (
  <div className={`bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-2 border-green-500/50 rounded-2xl p-5 shadow-xl transition-all ${selected ? 'border-green-500 scale-105' : ''}`}>
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
        <Zap className="h-5 w-5 text-white" />
      </div>
      <span className="font-bold text-green-500">Start</span>
    </div>
    <Handle type="source" position={Position.Right} className="!w-4 !h-4 !bg-green-500 !border-2 !border-background !rounded-full" />
  </div>
);

const EndNode: React.FC<NodeProps> = ({ selected }) => (
  <div className={`bg-gradient-to-br from-red-500/20 to-rose-500/10 border-2 border-red-500/50 rounded-2xl p-5 shadow-xl transition-all ${selected ? 'border-red-500 scale-105' : ''}`}>
    <Handle type="target" position={Position.Left} className="!w-4 !h-4 !bg-red-500 !border-2 !border-background !rounded-full" />
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-lg">
        <Settings2 className="h-5 w-5 text-white" />
      </div>
      <span className="font-bold text-red-500">End</span>
    </div>
  </div>
);

const nodeTypes = { agent: AgentNode, start: StartNode, end: EndNode };

const defaultNodes: Node[] = [
  { id: 'start', type: 'start', position: { x: 50, y: 200 }, data: {} },
  { id: 'end', type: 'end', position: { x: 700, y: 200 }, data: {} },
];

export const WorkflowEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [nodes, setNodes] = useState<Node[]>(defaultNodes);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [executionMode, setExecutionMode] = useState('sequential');
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [saving, setSaving] = useState(false);

  // Load workflow
  const { data: workflow, isLoading } = useQuery({
    queryKey: ['workflow', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('agent_workflows')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Load agents for adding to canvas
  const { data: agents } = useQuery({
    queryKey: ['agents-for-workflow'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ai_profiles').select('id, display_name, core_model, role_description').eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
  });

  // Populate state from loaded workflow
  useEffect(() => {
    if (workflow) {
      setWorkflowName(workflow.name);
      setWorkflowDescription(workflow.description || '');
      setExecutionMode(workflow.execution_mode || 'sequential');
      const canvas = workflow.canvas_data as { nodes?: Node[]; edges?: Edge[] } | null;
      if (canvas?.nodes?.length) {
        setNodes(canvas.nodes);
        setEdges(canvas.edges || []);
      }
    }
  }, [workflow]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge({ ...connection, animated: true, style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 } }, eds));
  }, []);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type === 'agent') setSelectedNode(node);
    else setSelectedNode(null);
  }, []);

  const addAgentNode = (agent: { id: string; display_name: string; core_model: string; role_description: string | null }) => {
    const newNode: Node = {
      id: `agent-${Date.now()}`,
      type: 'agent',
      position: { x: 300 + Math.random() * 100, y: 100 + Math.random() * 200 },
      data: {
        label: agent.display_name,
        model: agent.core_model,
        role: agent.role_description || '',
        agentId: agent.id,
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const deleteSelectedNode = () => {
    if (!selectedNode || selectedNode.type === 'start' || selectedNode.type === 'end') return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('agent_workflows')
        .update({
          name: workflowName,
          description: workflowDescription || null,
          execution_mode: executionMode,
          canvas_data: { nodes, edges },
        })
        .eq('id', id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast({ title: 'Saved', description: 'Workflow saved successfully' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to save workflow', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
    toast({ title: 'Running', description: `Workflow "${workflowName}" execution started` });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/workflow-canvas')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <Input
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="text-xl font-bold border-none bg-transparent p-0 h-auto focus-visible:ring-0"
              placeholder="Workflow name"
            />
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{executionMode}</Badge>
              <span className="text-xs text-muted-foreground">
                {nodes.filter((n) => n.type === 'agent').length} agents
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRun}>
            <Play className="h-4 w-4 mr-2" />
            Run
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Canvas + Sidebar */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Agent Panel */}
        <div className="w-64 flex flex-col gap-3 overflow-y-auto">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Plus className="h-4 w-4" /> Add Agent
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {agents?.length ? (
                agents.map((agent) => (
                  <Button
                    key={agent.id}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => addAgentNode(agent)}
                  >
                    <Bot className="h-3 w-3 mr-2" />
                    {agent.display_name}
                  </Button>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No agents available. Create agents first.</p>
              )}
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Settings</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={workflowDescription}
                  onChange={(e) => setWorkflowDescription(e.target.value)}
                  rows={2}
                  className="text-xs"
                  placeholder="Describe this workflow..."
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Execution Mode</Label>
                <Select value={executionMode} onValueChange={setExecutionMode}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sequential">Sequential</SelectItem>
                    <SelectItem value="parallel">Parallel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Selected Node */}
          {selectedNode && selectedNode.type === 'agent' && (
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">Selected Agent</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                <p className="text-sm font-medium">{(selectedNode.data as unknown as AgentNodeData).label}</p>
                <p className="text-xs text-muted-foreground">{(selectedNode.data as unknown as AgentNodeData).role}</p>
                <Button variant="destructive" size="sm" className="w-full" onClick={deleteSelectedNode}>
                  <Trash2 className="h-3 w-3 mr-2" />
                  Remove
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* React Flow Canvas */}
        <div className="flex-1 rounded-xl border border-border overflow-hidden bg-background">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-background"
          >
            <Controls className="!bg-card !border-border !rounded-xl !shadow-lg" />
            <MiniMap className="!bg-card !border-border !rounded-xl" />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="!bg-background" />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
};
