import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Plus, Trash2, Edit, Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface MarketingTemplate {
  id: string;
  recipient_type: string;
  message_title: string;
  message_content: string;
}

const RECIPIENT_TYPES = [
  "Technical Director",
  "Scout",
  "Player",
  "Parent",
  "Agent",
  "Manager"
];

export const QuickMessageSection = () => {
  const [templates, setTemplates] = useState<MarketingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MarketingTemplate | null>(null);
  const [templateFormData, setTemplateFormData] = useState({
    recipient_type: "",
    message_title: "",
    message_content: ""
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("marketing_templates")
        .select("*")
        .order("recipient_type", { ascending: true })
        .order("message_title", { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSubmit = async () => {
    if (!templateFormData.recipient_type || !templateFormData.message_title || !templateFormData.message_content) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from("marketing_templates")
          .update(templateFormData)
          .eq("id", editingTemplate.id);

        if (error) throw error;
        toast.success("Template updated successfully");
      } else {
        const { error } = await supabase
          .from("marketing_templates")
          .insert([templateFormData]);

        if (error) throw error;
        toast.success("Template created successfully");
      }

      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      setTemplateFormData({ recipient_type: "", message_title: "", message_content: "" });
      fetchTemplates();
    } catch (error: any) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    }
  };

  const handleTemplateEdit = (template: MarketingTemplate) => {
    setEditingTemplate(template);
    setTemplateFormData({
      recipient_type: template.recipient_type,
      message_title: template.message_title,
      message_content: template.message_content
    });
    setTemplateDialogOpen(true);
  };

  const handleTemplateDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const { error } = await supabase
        .from("marketing_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Template deleted successfully");
      fetchTemplates();
    } catch (error: any) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    }
  };

  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.recipient_type]) {
      acc[template.recipient_type] = [];
    }
    acc[template.recipient_type].push(template);
    return acc;
  }, {} as Record<string, MarketingTemplate[]>);

  const resetForm = () => {
    setEditingTemplate(null);
    setTemplateFormData({ recipient_type: "", message_title: "", message_content: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Message Templates</h3>
        </div>
        <Button 
          size="sm" 
          onClick={() => {
            resetForm();
            setTemplateDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Template
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading templates...
          </CardContent>
        </Card>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p className="text-lg mb-2">No templates created yet</p>
            <p className="text-sm">Create reusable templates for prospect outreach</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {RECIPIENT_TYPES.map(recipientType => {
            const templatesForType = groupedTemplates[recipientType] || [];
            if (templatesForType.length === 0) return null;

            return (
              <Card key={recipientType}>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">{recipientType}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {templatesForType.map(template => (
                      <div key={template.id} className="flex flex-col sm:flex-row items-start justify-between gap-3 p-3 sm:p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex-1 w-full">
                          <h4 className="text-sm sm:text-base font-medium mb-1">{template.message_title}</h4>
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{template.message_content}</p>
                        </div>
                        <div className="flex gap-1 sm:gap-2 sm:ml-4 w-full sm:w-auto justify-end shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 sm:h-8 sm:w-8"
                            onClick={() => {
                              navigator.clipboard.writeText(template.message_content);
                              toast.success("Message copied to clipboard");
                            }}
                            title="Copy message"
                          >
                            <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 sm:h-8 sm:w-8"
                            onClick={() => handleTemplateEdit(template)}
                          >
                            <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 sm:h-8 sm:w-8"
                            onClick={() => handleTemplateDelete(template.id)}
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={(open) => {
        setTemplateDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Recipient Type</Label>
              <Select
                value={templateFormData.recipient_type}
                onValueChange={(value) => setTemplateFormData({ ...templateFormData, recipient_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select recipient type" />
                </SelectTrigger>
                <SelectContent>
                  {RECIPIENT_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Message Title</Label>
              <Input
                value={templateFormData.message_title}
                onChange={(e) => setTemplateFormData({ ...templateFormData, message_title: e.target.value })}
                placeholder="e.g., Spanish Club Introduction Message"
              />
            </div>
            <div>
              <Label>Message Content</Label>
              <Textarea
                value={templateFormData.message_content}
                onChange={(e) => setTemplateFormData({ ...templateFormData, message_content: e.target.value })}
                placeholder="Enter your message template here..."
                rows={10}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleTemplateSubmit}>
              {editingTemplate ? "Update Template" : "Create Template"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
