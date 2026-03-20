import type { TaskScheduleHint } from '@/lib/agents/tasks';

export type TaskDependencyType = 'hard' | 'soft';

export interface WorkflowTaskDependency {
  taskId: string;
  type: TaskDependencyType;
}

export interface WorkflowTaskTiming {
  earliestStart?: string;
  latestFinish?: string;
  scheduleHint?: TaskScheduleHint;
}

export interface WorkflowTaskRetries {
  maxAttempts: number;
  backoffSeconds: number;
}

export interface WorkflowTaskEscalation {
  onFailure: 'notify' | 'abort' | 'continue';
  notifyTargets?: string[];
}

export interface WorkflowTaskPlanStep {
  id: string;
  taskId: string;
  title: string;
  description?: string;
  dependencies: WorkflowTaskDependency[];
  timing: WorkflowTaskTiming;
  retries: WorkflowTaskRetries;
  escalation: WorkflowTaskEscalation;
}

export interface WorkflowTaskPlan {
  version: 1;
  generatedAt: string;
  tasks: WorkflowTaskPlanStep[];
}

export interface WorkflowTaskPlanValidationResult {
  isValid: boolean;
  errors: string[];
}
