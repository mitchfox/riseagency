import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileText, Calendar, Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

export const MarketingManagement = () => {
  const [activeTab, setActiveTab] = useState("templates");
  const [templates, setTemplates] = useState<MarketingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MarketingTemplate | null>(null);
  const [formData, setFormData] = useState({
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
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.recipient_type || !formData.message_title || !formData.message_content) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from("marketing_templates")
          .update(formData)
          .eq("id", editingTemplate.id);

        if (error) throw error;
        toast.success("Template updated successfully");
      } else {
        const { error } = await supabase
          .from("marketing_templates")
          .insert([formData]);

        if (error) throw error;
        toast.success("Template created successfully");
      }

      setDialogOpen(false);
      setEditingTemplate(null);
      setFormData({ recipient_type: "", message_title: "", message_content: "" });
      fetchTemplates();
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    }
  };

  const handleEdit = (template: MarketingTemplate) => {
    setEditingTemplate(template);
    setFormData({
      recipient_type: template.recipient_type,
      message_title: template.message_title,
      message_content: template.message_content
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const { error } = await supabase
        .from("marketing_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Template deleted successfully");
      fetchTemplates();
    } catch (error) {
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

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates">
            <FileText className="w-4 h-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="planner">
            <Calendar className="w-4 h-4 mr-2" />
            Planner
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Message Templates</h3>
            <Button onClick={() => {
              setEditingTemplate(null);
              setFormData({ recipient_type: "", message_title: "", message_content: "" });
              setDialogOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </div>

          {loading ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Loading templates...
              </CardContent>
            </Card>
          ) : templates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No templates created yet</p>
                <p className="text-sm">Create reusable marketing templates for different recipients</p>
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
                      <CardTitle className="text-lg">{recipientType}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {templatesForType.map(template => (
                          <div key={template.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                            <div className="flex-1">
                              <h4 className="font-medium mb-1">{template.message_title}</h4>
                              <p className="text-sm text-muted-foreground line-clamp-2">{template.message_content}</p>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleEdit(template)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDelete(template.id)}
                              >
                                <Trash2 className="w-4 h-4" />
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
        </TabsContent>

        <TabsContent value="planner" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Marketing Planner</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No campaigns planned yet</p>
                <p className="text-sm mb-4">Plan and schedule your marketing campaigns</p>
                <Button>Create Campaign</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Recipient Type</Label>
              <Select
                value={formData.recipient_type}
                onValueChange={(value) => setFormData({ ...formData, recipient_type: value })}
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
                value={formData.message_title}
                onChange={(e) => setFormData({ ...formData, message_title: e.target.value })}
                placeholder="e.g., Spanish Club Introduction Message"
              />
            </div>
            <div>
              <Label>Message Content</Label>
              <Textarea
                value={formData.message_content}
                onChange={(e) => setFormData({ ...formData, message_content: e.target.value })}
                placeholder="Enter your message template here..."
                rows={10}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>
              {editingTemplate ? "Update Template" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
