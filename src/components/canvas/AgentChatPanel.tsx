import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, User, Loader2, X, Maximize2, Minimize2, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getSupabaseUrl } from '@/lib/env';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agentName?: string;
  timestamp: Date;
}

interface AgentNode {
  id: string;
  label: string;
  model: string;
  agentId: string;
}

interface SuggestedPrompt {
  text: string;
  description: string;
}

interface AgentChatPanelProps {
  agents: AgentNode[];
  isOpen: boolean;
  onClose: () => void;
  workflowId?: string;
  workspaceId?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const AgentChatPanel: React.FC<AgentChatPanelProps> = ({
  agents,
  isOpen,
  onClose,
  workflowId,
  workspaceId,
}) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const getFunctionErrorMessage = (status: number, fallback: string) => {
    if (status === 401) return 'Please sign in to run workflows.';
    if (status === 403) return 'You do not have permission to run this workflow.';
    if (status >= 500) return 'The server encountered an error. Please try again soon.';
    return fallback;
  };

  // Generate dynamic suggested prompts based on agents in the workflow
  const suggestedPrompts = useMemo<SuggestedPrompt[]>(() => {
    const agentNames = agents.map(a => a.label).join(', ');
    const firstAgent = agents[0]?.label || 'the agent';
    const agentCount = agents.length;
    
    const basePrompts: SuggestedPrompt[] = [
      {
        text: 'What can you help me with?',
        description: 'Learn workflow capabilities'
      },
      {
        text: `Analyze this document and provide a summary`,
        description: 'Document analysis task'
      },
      {
        text: 'Walk me through how you will process my request',
        description: 'Understand the workflow'
      },
    ];

    // Add agent-specific prompts
    if (agentCount > 1) {
      basePrompts.push({
        text: `How do the ${agentCount} agents work together?`,
        description: 'Multi-agent collaboration'
      });
    }

    // Add model-specific prompts
    const hasAnalyst = agents.some(a => a.model === 'core_analyst');
    const hasReviewer = agents.some(a => a.model === 'core_reviewer');
    const hasSynthesizer = agents.some(a => a.model === 'core_synthesizer');

    if (hasAnalyst) {
      basePrompts.push({
        text: 'Analyze the key patterns and insights from this data',
        description: 'Data analysis'
      });
    }
    if (hasReviewer) {
      basePrompts.push({
        text: 'Review and provide feedback on this content',
        description: 'Content review'
      });
    }
    if (hasSynthesizer) {
      basePrompts.push({
        text: 'Synthesize this information into a comprehensive report',
        description: 'Report generation'
      });
    }

    return basePrompts.slice(0, 5);
  }, [agents]);

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || agents.length === 0) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      // Get session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({
          title: 'Authentication Required',
          description: 'Please sign in to run workflows',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Call the run-workflow edge function
      const response = await fetch(
        `${getSupabaseUrl()}/functions/v1/run-workflow`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            workflowId,
            workspaceId,
            triggerType: 'manual',
            inputData: { prompt: currentInput },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const fallbackMessage = errorData.error || `Request failed: ${response.status}`;
        throw new Error(getFunctionErrorMessage(response.status, fallbackMessage));
      }

      const result = await response.json();
      const resultData = isRecord(result) ? result : {};
      const outputData = isRecord(resultData.outputData) ? resultData.outputData : null;

      // Process response from each agent
      if (outputData) {
        for (const agent of agents) {
          const agentOutput = outputData[agent.agentId];
          if (isRecord(agentOutput)) {
            const agentResponse: Message = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: typeof agentOutput.response === 'string' ? agentOutput.response : 'No response generated',
              agentName: typeof agentOutput.agent === 'string' ? agentOutput.agent : agent.label,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, agentResponse]);
          }
        }
      }

      // If no output, show logs summary
      if (!outputData || Object.keys(outputData).length === 0) {
        const logs = Array.isArray(resultData.executionLogs) ? resultData.executionLogs : [];
        const summary = logs
          .map((log) => {
            if (!isRecord(log)) return '';
            const type = typeof log.type === 'string' ? log.type : 'log';
            const agentName = typeof log.agent === 'string' ? log.agent : '';
            const message = typeof log.message === 'string' ? log.message : '';
            return `[${type}] ${agentName}: ${message}`.trim();
          })
          .filter(Boolean)
          .join('\n');
        
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: summary || 'Workflow completed but no output was generated.',
            agentName: 'System',
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error('Workflow execution error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to execute workflow',
        variant: 'destructive',
      });
      
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : 'Failed to execute workflow'}`,
          agentName: 'System',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <Card
      className={`fixed z-50 shadow-2xl transition-all duration-300 ${
        isExpanded
          ? 'inset-4 lg:inset-8'
          : 'bottom-4 right-4 w-96 h-[500px] lg:w-[450px]'
      }`}
    >
      <CardHeader className="border-b py-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">
            Test Workflow ({agents.length} agent{agents.length !== 1 ? 's' : ''})
          </CardTitle>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col p-0 h-[calc(100%-60px)]">
        {/* Agent Pills */}
        <div className="flex flex-wrap gap-1 p-3 border-b bg-muted/30">
          {agents.map((agent, i) => (
            <Badge key={agent.id} variant="outline" className="text-xs">
              {i + 1}. {agent.label}
            </Badge>
          ))}
          {agents.length === 0 && (
            <span className="text-xs text-muted-foreground">No agents in workflow</span>
          )}
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <div className="text-center mb-6">
                <Bot className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">Start testing your workflow</p>
                <p className="text-xs mt-1 opacity-70">Your message will be processed by all agents</p>
              </div>
              
              {/* Suggested Prompts */}
              {suggestedPrompts.length > 0 && (
                <div className="w-full max-w-sm space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-primary">
                    <Lightbulb className="h-3.5 w-3.5" />
                    <span>Try these prompts:</span>
                  </div>
                  <div className="space-y-1.5">
                    {suggestedPrompts.map((prompt, index) => (
                      <button
                        key={index}
                        onClick={() => handlePromptClick(prompt.text)}
                        className="w-full text-left p-2.5 rounded-lg border border-border/50 bg-card hover:bg-muted hover:border-primary/30 transition-all group"
                      >
                        <p className="text-sm font-medium group-hover:text-primary transition-colors">
                          {prompt.text}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {prompt.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg p-2.5 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {message.agentName && (
                      <Badge variant="secondary" className="text-[10px] mb-1">
                        {message.agentName}
                      </Badge>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-[10px] opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  {message.role === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <User className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                  </div>
                  <div className="bg-muted rounded-lg p-2.5">
                    <p className="text-sm text-muted-foreground">Processing with AI agents...</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t p-3">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                agents.length > 0
                  ? 'Type your message...'
                  : 'Add agents to the workflow first...'
              }
              disabled={agents.length === 0 || isLoading}
              className="min-h-[50px] max-h-[100px] resize-none text-sm"
            />
            <Button
              onClick={handleSend}
              disabled={agents.length === 0 || !input.trim() || isLoading}
              size="icon"
              className="h-[50px] w-[50px]"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
