export type TaskScheduleHint = 'on_demand' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'event_driven';

export interface AgentTask {
  id: string;
  title: string;
  description: string;
  corePurpose: string;
  scheduleHint: TaskScheduleHint;
  enabled: boolean;
  order: number;
}

export interface AgentTaskValidationResult {
  isValid: boolean;
  errors: string[];
}
