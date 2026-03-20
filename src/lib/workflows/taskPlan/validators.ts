import type { WorkflowTaskPlan, WorkflowTaskPlanValidationResult } from './types';

export const validateWorkflowTaskPlan = (plan: WorkflowTaskPlan): WorkflowTaskPlanValidationResult => {
  const errors: string[] = [];
  const ids = new Set<string>();

  plan.tasks.forEach((task) => {
    if (!task.id) {
      errors.push('Task plan step id is required.');
    }
    if (!task.taskId) {
      errors.push('Task plan step taskId is required.');
    }
    if (ids.has(task.id)) {
      errors.push(`Task plan step id ${task.id} must be unique.`);
    }
    ids.add(task.id);

    if (task.retries.maxAttempts < 1) {
      errors.push(`Task plan step ${task.id} must allow at least one attempt.`);
    }
    if (task.retries.backoffSeconds < 0) {
      errors.push(`Task plan step ${task.id} backoffSeconds must be >= 0.`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};
