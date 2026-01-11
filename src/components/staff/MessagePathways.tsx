import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Trash2, ChevronDown, ChevronRight, Copy, Sparkles, GripVertical, ArrowDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface PathwayStep {
  id: string;
  template_id: string | null;
  template_name: string;
  custom_message: string;
  step_label: string;
}

interface Pathway {
  id: string;
  name: string;
  description: string | null;
  steps: PathwayStep[];
  created_at: string;
}

interface Template {
  id: string;
  message_title: string;
  message_content: string;
}

const MessagePathways = () => {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingPathway, setEditingPathway] = useState<Pathway | null>(null);
  const [expandedPathway, setExpandedPathway] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<{ pathwayId: string; stepIndex: number } | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    steps: [] as PathwayStep[],
  });

  // Fetch pathways
  const { data: pathways = [], isLoading } = useQuery({
    queryKey: ['message-pathways'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_pathways')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(p => ({
        ...p,
        steps: (p.steps as unknown as PathwayStep[]) || []
      })) as Pathway[];
    },
  });

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ['marketing-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_templates')
        .select('id, message_title, message_content')
        .order('message_title');
      
      if (error) throw error;
      return data as Template[];
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; steps: PathwayStep[] }) => {
      const stepsJson = JSON.parse(JSON.stringify(data.steps));
      
      if (editingPathway) {
        const { error } = await supabase
          .from('message_pathways')
          .update({
            name: data.name,
            description: data.description || null,
            steps: stepsJson,
          })
          .eq('id', editingPathway.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('message_pathways')
          .insert([{
            name: data.name,
            description: data.description || null,
            steps: stepsJson,
          }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-pathways'] });
      toast.success(editingPathway ? 'Pathway updated' : 'Pathway created');
      closeDialog();
    },
    onError: () => {
      toast.error('Failed to save pathway');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('message_pathways')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-pathways'] });
      toast.success('Pathway deleted');
    },
    onError: () => {
      toast.error('Failed to delete pathway');
    },
  });

  const closeDialog = () => {
    setShowDialog(false);
    setEditingPathway(null);
    setFormData({ name: '', description: '', steps: [] });
  };

  const openEditDialog = (pathway: Pathway) => {
    setEditingPathway(pathway);
    setFormData({
      name: pathway.name,
      description: pathway.description || '',
      steps: pathway.steps,
    });
    setShowDialog(true);
  };

  const openAddDialog = () => {
    setEditingPathway(null);
    setFormData({ name: '', description: '', steps: [] });
    setShowDialog(true);
  };

  const addStep = () => {
    const newStep: PathwayStep = {
      id: crypto.randomUUID(),
      template_id: null,
      template_name: '',
      custom_message: '',
      step_label: `Step ${formData.steps.length + 1}`,
    };
    setFormData({ ...formData, steps: [...formData.steps, newStep] });
  };

  const removeStep = (index: number) => {
    const newSteps = formData.steps.filter((_, i) => i !== index);
    setFormData({ ...formData, steps: newSteps });
  };

  const updateStep = (index: number, updates: Partial<PathwayStep>) => {
    const newSteps = [...formData.steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    setFormData({ ...formData, steps: newSteps });
  };

  const selectTemplate = (index: number, templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      updateStep(index, {
        template_id: templateId,
        template_name: template.message_title,
        custom_message: template.message_content,
      });
    }
  };

  const copyMessage = (message: string) => {
    navigator.clipboard.writeText(message);
    toast.success('Message copied to clipboard');
  };

  const generateAIResponse = async (step: PathwayStep, context: string) => {
    setGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-response', {
        body: {
          prompt: `Based on this message template, generate a personalized response for a club contact. Keep it professional and concise.

Template: ${step.custom_message}

Context: ${context || 'Initial outreach to a club contact'}

Generate a ready-to-send message:`,
        },
      });

      if (error) throw error;
      
      if (data?.response) {
        navigator.clipboard.writeText(data.response);
        toast.success('AI response generated and copied to clipboard');
      }
    } catch {
      toast.error('Failed to generate AI response');
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Please enter a pathway name');
      return;
    }
    if (formData.steps.length === 0) {
      toast.error('Please add at least one step');
      return;
    }
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Loading pathways...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Message Pathways</h2>
          <p className="text-sm text-muted-foreground">Create message sequences for different conversation funnels</p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          New Pathway
        </Button>
      </div>

      <div className="space-y-4">
        {pathways.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No pathways created yet. Create your first message pathway to get started.
            </CardContent>
          </Card>
        ) : (
          pathways.map((pathway) => (
            <Card key={pathway.id}>
              <Collapsible
                open={expandedPathway === pathway.id}
                onOpenChange={() => setExpandedPathway(expandedPathway === pathway.id ? null : pathway.id)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-accent/5 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {expandedPathway === pathway.id ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <CardTitle className="text-lg">{pathway.name}</CardTitle>
                          {pathway.description && (
                            <p className="text-sm text-muted-foreground mt-1">{pathway.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {pathway.steps.length} step{pathway.steps.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(pathway)}>
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (confirm('Delete this pathway?')) {
                              deleteMutation.mutate(pathway.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {pathway.steps.map((step, index) => (
                        <div key={step.id}>
                          <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                            <div className="flex flex-col items-center">
                              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                                {index + 1}
                              </div>
                              {index < pathway.steps.length - 1 && (
                                <div className="w-0.5 h-8 bg-border mt-2" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium">{step.step_label || step.template_name || `Step ${index + 1}`}</h4>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyMessage(step.custom_message)}
                                  >
                                    <Copy className="h-4 w-4 mr-1" />
                                    Copy
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setActiveStep({ pathwayId: pathway.id, stepIndex: index });
                                      generateAIResponse(step, '');
                                    }}
                                    disabled={generatingAI}
                                  >
                                    <Sparkles className="h-4 w-4 mr-1" />
                                    {generatingAI && activeStep?.pathwayId === pathway.id && activeStep?.stepIndex === index
                                      ? 'Generating...'
                                      : 'AI Generate'}
                                  </Button>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {step.custom_message}
                              </p>
                            </div>
                          </div>
                          {index < pathway.steps.length - 1 && (
                            <div className="flex justify-center py-2">
                              <ArrowDown className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPathway ? 'Edit Pathway' : 'Create New Pathway'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Pathway Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Initial Club Outreach"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base">Message Steps</Label>
                <Button type="button" variant="outline" size="sm" onClick={addStep}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Step
                </Button>
              </div>

              {formData.steps.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
                  No steps added yet. Click "Add Step" to create your first message.
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.steps.map((step, index) => (
                    <div key={step.id} className="p-4 border rounded-lg bg-card">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center gap-2 pt-2">
                          <GripVertical className="h-5 w-5 text-muted-foreground" />
                          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </div>
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor={`step-label-${index}`}>Step Label</Label>
                              <Input
                                id={`step-label-${index}`}
                                value={step.step_label}
                                onChange={(e) => updateStep(index, { step_label: e.target.value })}
                                placeholder="e.g., Initial Contact"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`template-${index}`}>Load from Template</Label>
                              <Select
                                value={step.template_id || ''}
                                onValueChange={(value) => selectTemplate(index, value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a template" />
                                </SelectTrigger>
                                <SelectContent>
                                  {templates.map((template) => (
                                    <SelectItem key={template.id} value={template.id}>
                                      {template.message_title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <Label htmlFor={`message-${index}`}>Message Content</Label>
                            <Textarea
                              id={`message-${index}`}
                              value={step.custom_message}
                              onChange={(e) => updateStep(index, { custom_message: e.target.value })}
                              placeholder="Enter your message or select a template..."
                              rows={4}
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeStep(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : editingPathway ? 'Update Pathway' : 'Create Pathway'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MessagePathways;
