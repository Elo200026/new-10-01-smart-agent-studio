// Core Model Types
export type CoreModel = 'core_analyst' | 'core_reviewer' | 'core_synthesizer';

export type CreativityLevel = 'none' | 'very_low' | 'low' | 'medium' | 'high';

export interface RagPolicy {
  knowledge_base_ratio: number;
  web_verification_ratio: number;
  creativity_level: CreativityLevel;
  hallucination_tolerance: 'very_low' | 'none';
}

export interface ResponseRules {
  step_by_step: boolean;
  cite_if_possible: boolean;
  refuse_if_uncertain: boolean;
  include_confidence_scores: boolean;
  use_bullet_points: boolean;
  summarize_at_end: boolean;
  custom_response_template: string | null;
}

export interface ValidationScore {
  overall_score: number;
  structure_score: number;
  rules_score: number;
  quality_score: number;
  issues: ValidationIssue[];
  passed: boolean;
}

export interface ValidationIssue {
  type: 'structure' | 'rules' | 'compatibility';
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion: string;
  rule_name?: string;
}

export interface CompatibilityCheck {
  is_compatible: boolean;
  score: number;
  mismatches: CompatibilityMismatch[];
  recommendations: string[];
}

export interface CompatibilityMismatch {
  rule_name: string;
  rule_enabled: boolean;
  template_has_placeholder: boolean;
  issue: string;
}

export interface ReworkSettings {
  enabled: boolean;
  max_retries: number;
  minimum_score_threshold: number;
  auto_correct: boolean;
}

export interface KnowledgeFolder {
  id: string;
  name: string;
  parent_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  children?: KnowledgeFolder[];
}

export interface KnowledgeChunk {
  id: string;
  folder_id: string | null;
  source_file: string;
  content: string;
  embedding?: number[];
  created_at: string;
}

export interface AIProfile {
  id: string;
  display_name: string;
  user_defined_name: string;
  core_model: CoreModel;
  persona: string | null;
  role_description: string | null;
  intro_sentence: string | null;
  rag_policy: RagPolicy;
  allowed_folders: string[];
  chunk_priority: string[];
  response_rules: ResponseRules;
  api_key: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentWorkflow {
  id: string;
  name: string;
  description: string | null;
  canvas_data: CanvasData;
  handoff_rules: HandoffRule[];
  execution_mode: 'sequential' | 'parallel';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CanvasData {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export interface CanvasNode {
  id: string;
  type: 'agent';
  position: { x: number; y: number };
  data: {
    agentId: string;
    label: string;
  };
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  data?: {
    ruleId?: string;
  };
}

export interface HandoffRule {
  id: string;
  sourceAgentId: string;
  targetAgentId: string;
  trigger: {
    type: 'keyword' | 'topic' | 'confidence' | 'custom';
    value: string;
  };
  fallbackAgentId?: string;
}

export interface UsageLog {
  id: string;
  agent_id: string | null;
  user_id: string | null;
  query: string | null;
  response_time_ms: number | null;
  tokens_used: number | null;
  folders_accessed: string[] | null;
  created_at: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  sources?: Record<string, unknown>[];
}

export interface MemorySettings {
  short_term_enabled: boolean;
  context_window_size: number;
  long_term_enabled: boolean;
  retention_policy: 'keep_all' | 'keep_successful' | 'keep_30_days';
  learn_preferences: boolean;
}

export interface AwarenessSettings {
  awareness_level: number;
  self_role_enabled: boolean;
  role_boundaries: string | null;
  state_awareness_enabled: boolean;
  state_context_source: 'project_status' | 'workflow_status' | 'custom';
  proactive_reasoning: boolean;
  feedback_learning: boolean;
}

export const defaultMemorySettings: MemorySettings = {
  short_term_enabled: true,
  context_window_size: 10,
  long_term_enabled: false,
  retention_policy: 'keep_successful',
  learn_preferences: true,
};

export const defaultAwarenessSettings: AwarenessSettings = {
  awareness_level: 2,
  self_role_enabled: false,
  role_boundaries: null,
  state_awareness_enabled: false,
  state_context_source: 'project_status',
  proactive_reasoning: false,
  feedback_learning: false,
};

export type Language = 'en' | 'ar';

export interface AppContextType {
  lang: Language;
  setLang: (l: Language) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  t: typeof import('@/lib/translations').translations['en'];
}
