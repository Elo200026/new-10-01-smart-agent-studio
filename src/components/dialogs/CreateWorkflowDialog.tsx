import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CreateWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onCreated?: (id: string) => void;
}

export const CreateWorkflowDialog: React.FC<CreateWorkflowDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  onCreated,
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    execution_mode: 'sequential',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'Please enter a workflow name', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // Get current user ID for created_by field (required by RLS policy)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Error', description: 'You must be logged in', variant: 'destructive' });
        return;
      }

      if (!currentWorkspace) {
        toast({ title: 'Error', description: 'No active workspace found', variant: 'destructive' });
        return;
      }

      const { data, error } = await supabase.from('agent_workflows').insert({
        name: formData.name.trim(),
        description: formData.description || null,
        workspace_id: currentWorkspace.id,
        created_by: user.id,
      }).select('id').single();

      if (error) throw error;

      toast({ title: 'Success', description: 'Workflow created successfully' });
      setFormData({ name: '', description: '', execution_mode: 'sequential' });
      onSuccess();
      onOpenChange(false);
      if (data?.id) {
        navigate(`/multi-agent-canvas/${data.id}`);
      }
      if (data?.id && onCreated) onCreated(data.id);
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create workflow',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Create New Workflow</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workflow_name">Workflow Name *</Label>
            <Input
              id="workflow_name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Legal Query Processing"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe this workflow..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="execution_mode">Execution Mode</Label>
            <Select
              value={formData.execution_mode}
              onValueChange={(value) => setFormData({ ...formData, execution_mode: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sequential">Sequential</SelectItem>
                <SelectItem value="parallel">Parallel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
