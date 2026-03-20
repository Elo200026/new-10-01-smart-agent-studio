import type { AgentTask, TaskScheduleHint } from './types';

export const DEFAULT_TASK_SCHEDULE_HINT: TaskScheduleHint = 'on_demand';

const createTaskId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `task_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

export const createAgentTask = (overrides: Partial<AgentTask> = {}): AgentTask => {
  return {
    id: overrides.id ?? createTaskId(),
    title: overrides.title ?? 'New Task',
    description: overrides.description ?? '',
    corePurpose: overrides.corePurpose ?? 'General support',
    scheduleHint: overrides.scheduleHint ?? DEFAULT_TASK_SCHEDULE_HINT,
    enabled: overrides.enabled ?? true,
    order: overrides.order ?? 0,
  };
};

export const normalizeAgentTasks = (tasks?: AgentTask[] | null): AgentTask[] => {
  if (!Array.isArray(tasks)) return [];
  const normalized = tasks.map((task, index) =>
    createAgentTask({
      ...task,
      order: Number.isFinite(task.order) ? task.order : index + 1,
    })
  );

  return normalized
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((task, index) => ({
      ...task,
      order: index + 1,
    }));
};
