import type { AgentTask, AgentTaskValidationResult } from './types';

const isNonEmptyString = (value: unknown) => typeof value === 'string' && value.trim().length > 0;

export const validateAgentTask = (task: AgentTask): AgentTaskValidationResult => {
  const errors: string[] = [];

  if (!isNonEmptyString(task.id)) {
    errors.push('Task id is required.');
  }

  if (!isNonEmptyString(task.title)) {
    errors.push('Task title is required.');
  }

  if (!isNonEmptyString(task.corePurpose)) {
    errors.push('Task core purpose is required.');
  }

  if (!Number.isFinite(task.order) || task.order < 1) {
    errors.push('Task order must be a positive number.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateAgentTasks = (tasks: AgentTask[]): AgentTaskValidationResult => {
  const errors: string[] = [];
  const seenIds = new Set<string>();

  tasks.forEach((task, index) => {
    const result = validateAgentTask({ ...task, order: task.order ?? index + 1 });
    if (!result.isValid) {
      errors.push(...result.errors.map((error) => `Task ${task.title || task.id}: ${error}`));
    }

    if (seenIds.has(task.id)) {
      errors.push(`Task id ${task.id} must be unique.`);
    }
    seenIds.add(task.id);
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};
