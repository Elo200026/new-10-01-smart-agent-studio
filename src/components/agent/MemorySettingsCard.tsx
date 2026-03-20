import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Brain, Database, Clock } from 'lucide-react';
import type { MemorySettings } from '@/types';

interface MemorySettingsCardProps {
  settings: MemorySettings;
  onChange: (settings: MemorySettings) => void;
}

export const MemorySettingsCard: React.FC<MemorySettingsCardProps> = ({ settings, onChange }) => {
  const update = (partial: Partial<MemorySettings>) => onChange({ ...settings, ...partial });

  return (
    <Card className="cyber-border">
      <CardHeader className="border-b border-border/50">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-primary" />
          MEMORY SYSTEM
          <Badge variant="outline" className="ml-auto text-xs">
            {settings.short_term_enabled || settings.long_term_enabled ? 'ACTIVE' : 'DISABLED'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Short-term Memory */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Short-term Memory (Context Window)</Label>
            </div>
            <Switch
              checked={settings.short_term_enabled}
              onCheckedChange={(val) => update({ short_term_enabled: val })}
            />
          </div>
          {settings.short_term_enabled && (
            <div className="pl-6 space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Context Window Size
                  </Label>
                  <span className="text-sm font-mono text-primary">
                    {settings.context_window_size} exchanges
                  </span>
                </div>
                <Slider
                  value={[settings.context_window_size]}
                  onValueChange={([val]) => update({ context_window_size: val })}
                  min={5}
                  max={50}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  How many previous exchanges the agent remembers in the current session
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Long-term Memory */}
        <div className="space-y-4 border-t border-border/50 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Long-term Memory (Experience Archive)</Label>
            </div>
            <Switch
              checked={settings.long_term_enabled}
              onCheckedChange={(val) => update({ long_term_enabled: val })}
            />
          </div>
          {settings.long_term_enabled && (
            <div className="pl-6 space-y-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Retention Policy
                </Label>
                <Select
                  value={settings.retention_policy}
                  onValueChange={(val: MemorySettings['retention_policy']) => update({ retention_policy: val })}
                >
                  <SelectTrigger className="bg-secondary/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keep_all">Keep All Experiences</SelectItem>
                    <SelectItem value="keep_successful">Keep Successful Only</SelectItem>
                    <SelectItem value="keep_30_days">Keep Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Learn Preferences */}
        <div className="border-t border-border/50 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Learn from User Preferences</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Automatically extract and remember user preferences from conversations
              </p>
            </div>
            <Switch
              checked={settings.learn_preferences}
              onCheckedChange={(val) => update({ learn_preferences: val })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
