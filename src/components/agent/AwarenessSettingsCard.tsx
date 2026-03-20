import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Eye, Shield, Activity, Lightbulb, RefreshCw } from 'lucide-react';
import type { AwarenessSettings } from '@/types';

interface AwarenessSettingsCardProps {
  settings: AwarenessSettings;
  onChange: (settings: AwarenessSettings) => void;
}

const awarenessLabels: Record<number, string> = {
  1: 'Minimal',
  2: 'Basic',
  3: 'Moderate',
  4: 'Advanced',
  5: 'Full Autonomy',
};

export const AwarenessSettingsCard: React.FC<AwarenessSettingsCardProps> = ({ settings, onChange }) => {
  const update = (partial: Partial<AwarenessSettings>) => onChange({ ...settings, ...partial });

  return (
    <Card className="cyber-border">
      <CardHeader className="border-b border-border/50">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Eye className="h-5 w-5 text-primary" />
          AWARENESS ENGINE
          <Badge variant="outline" className="ml-auto text-xs">
            Level {settings.awareness_level}/5
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Awareness Level */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Awareness Level
            </Label>
            <span className="text-sm font-mono text-primary">
              {awarenessLabels[settings.awareness_level] || 'Unknown'}
            </span>
          </div>
          <Slider
            value={[settings.awareness_level]}
            onValueChange={([val]) => update({ awareness_level: val })}
            min={1}
            max={5}
            step={1}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Controls how much autonomy the agent has in decision-making and proactive behavior
          </p>
        </div>

        {/* Self-Role Awareness */}
        <div className="space-y-4 border-t border-border/50 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Self-Role Awareness</Label>
            </div>
            <Switch
              checked={settings.self_role_enabled}
              onCheckedChange={(val) => update({ self_role_enabled: val })}
            />
          </div>
          <p className="text-xs text-muted-foreground pl-6">
            The agent understands its boundaries and refuses tasks outside its expertise
          </p>
          {settings.self_role_enabled && (
            <div className="pl-6 space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Role Boundaries
              </Label>
              <Textarea
                value={settings.role_boundaries || ''}
                onChange={(e) => update({ role_boundaries: e.target.value || null })}
                placeholder="Define what the agent should NOT do. Example: Do not provide legal advice, medical diagnoses, or financial investment recommendations..."
                rows={3}
                className="bg-secondary/50 border-border/50 resize-none"
              />
            </div>
          )}
        </div>

        {/* State Awareness */}
        <div className="space-y-4 border-t border-border/50 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">State Awareness</Label>
            </div>
            <Switch
              checked={settings.state_awareness_enabled}
              onCheckedChange={(val) => update({ state_awareness_enabled: val })}
            />
          </div>
          <p className="text-xs text-muted-foreground pl-6">
            Agent reads system/project state before responding and adapts accordingly
          </p>
          {settings.state_awareness_enabled && (
            <div className="pl-6 space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                State Context Source
              </Label>
              <Select
                value={settings.state_context_source}
                onValueChange={(val: AwarenessSettings['state_context_source']) => update({ state_context_source: val })}
              >
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project_status">Project Status</SelectItem>
                  <SelectItem value="workflow_status">Workflow Status</SelectItem>
                  <SelectItem value="custom">Custom Context</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Proactive Reasoning */}
        <div className="space-y-2 border-t border-border/50 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">Proactive Reasoning</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Chain of Verification before output — agent validates its own response
                </p>
              </div>
            </div>
            <Switch
              checked={settings.proactive_reasoning}
              onCheckedChange={(val) => update({ proactive_reasoning: val })}
            />
          </div>
        </div>

        {/* Feedback Learning */}
        <div className="space-y-2 border-t border-border/50 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">Feedback Learning</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Adjust behavior based on user corrections and feedback
                </p>
              </div>
            </div>
            <Switch
              checked={settings.feedback_learning}
              onCheckedChange={(val) => update({ feedback_learning: val })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
