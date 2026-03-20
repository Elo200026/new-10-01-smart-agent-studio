import type { AgentTask } from '@/lib/agents/tasks';
import type { WorkflowTaskPlan, WorkflowTaskPlanStep } from './types';

const createPlanStep = (task: AgentTask, index: number): WorkflowTaskPlanStep => {
  return {
    id: `plan-step-${index + 1}`,
    taskId: task.id,
    title: task.title,
    description: task.description || undefined,
    dependencies: [],
    timing: {
      scheduleHint: task.scheduleHint,
    },
    retries: {
      maxAttempts: 1,
      backoffSeconds: 0,
    },
    escalation: {
      onFailure: 'notify',
      notifyTargets: [],
    },
  };
};

export const buildWorkflowTaskPlan = (tasks: AgentTask[]): WorkflowTaskPlan => {
  const enabledTasks = tasks.filter((task) => task.enabled);
  const orderedTasks = enabledTasks.slice().sort((a, b) => a.order - b.order);

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    tasks: orderedTasks.map(createPlanStep),
  };
};
