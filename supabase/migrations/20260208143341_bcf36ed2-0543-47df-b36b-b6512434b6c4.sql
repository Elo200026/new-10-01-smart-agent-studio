
-- Add memory_settings and awareness_settings JSONB columns to ai_profiles
ALTER TABLE public.ai_profiles 
ADD COLUMN IF NOT EXISTS memory_settings JSONB DEFAULT '{"short_term_enabled": true, "context_window_size": 10, "long_term_enabled": false, "retention_policy": "keep_successful", "learn_preferences": true}'::jsonb,
ADD COLUMN IF NOT EXISTS awareness_settings JSONB DEFAULT '{"awareness_level": 2, "self_role_enabled": false, "role_boundaries": null, "state_awareness_enabled": false, "state_context_source": "project_status", "proactive_reasoning": false, "feedback_learning": false}'::jsonb;

-- Create agent_experience_archive table for long-term learning
CREATE TABLE IF NOT EXISTS public.agent_experience_archive (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES public.ai_profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  task_summary TEXT NOT NULL,
  context_type TEXT NOT NULL DEFAULT 'general',
  success_score REAL NOT NULL DEFAULT 0.5,
  learned_patterns JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_experience_archive ENABLE ROW LEVEL SECURITY;

-- RLS policies for agent_experience_archive
CREATE POLICY "Users can view experience archives in their workspace"
ON public.agent_experience_archive
FOR SELECT
TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.team_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert experience archives in their workspace"
ON public.agent_experience_archive
FOR INSERT
TO authenticated
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM public.team_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete experience archives in their workspace"
ON public.agent_experience_archive
FOR DELETE
TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.team_members WHERE user_id = auth.uid()
  )
);

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_experience_archive_agent_id ON public.agent_experience_archive(agent_id);
CREATE INDEX IF NOT EXISTS idx_experience_archive_workspace_id ON public.agent_experience_archive(workspace_id);
CREATE INDEX IF NOT EXISTS idx_experience_archive_context_type ON public.agent_experience_archive(context_type);
