import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BlurInput } from "@/components/staff/BlurInput";
import { BlurTextarea } from "@/components/staff/BlurTextarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, MessageSquare, Plus, Trash2, Edit, Sparkles, Copy, UserPlus, MapPin, Mail, Route, Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { PlayerOutreach } from "./PlayerOutreach";
import MessagePathways from "./MessagePathways";
import { RecruitmentRulesTab } from "./RecruitmentRulesTab";
import { ProspectBoard } from "./ProspectBoard";

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

export const RecruitmentManagement = ({ isAdmin, initialTab = 'prospects' }: { isAdmin: boolean; initialTab?: 'prospects' | 'outreach' | 'templates' | 'pathways' | 'offers' }) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  // Template management state
  const [templates, setTemplates] = useState<MarketingTemplate[]>([]);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MarketingTemplate | null>(null);
  const [templateFormData, setTemplateFormData] = useState({
    recipient_type: "",
    message_title: "",
    message_content: ""
  });

  // AI Message Writer state
  const [aiWriterOpen, setAiWriterOpen] = useState(false);
  const [aiWriterTemplate, setAiWriterTemplate] = useState<MarketingTemplate | null>(null);
  const [aiWriterInfo, setAiWriterInfo] = useState("");
  const [aiGeneratedMessage, setAiGeneratedMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showApplyToOutreach, setShowApplyToOutreach] = useState(false);
  const [applyOutreachType, setApplyOutreachType] = useState<'youth' | 'pro'>('youth');
  const [applyPlayerName, setApplyPlayerName] = useState("");
  const [applyIgHandle, setApplyIgHandle] = useState("");
  const [applyParentName, setApplyParentName] = useState("");
  const [applyParentContact, setApplyParentContact] = useState("");

  useEffect(() => {
    fetchTemplates();
    setLoading(false);
  }, []);

  // Template management functions
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

  // AI Message Writer functions
  const handleGenerateMessage = async () => {
    if (!aiWriterInfo.trim()) {
      toast.error("Please provide relevant information for the message");
      return;
    }

    setIsGenerating(true);
    try {
      const context = aiWriterTemplate 
        ? `Use this template as a reference:\n\nTitle: ${aiWriterTemplate.message_title}\nContent: ${aiWriterTemplate.message_content}\n\n`
        : '';

      const { data, error } = await supabase.functions.invoke('ai-write', {
        body: {
          type: 'recruitment-message',
          prompt: aiWriterInfo,
          context: context
        }
      });

      if (error) throw error;
      
      setAiGeneratedMessage(data.text);
      toast.success("Message generated successfully");
    } catch (error: any) {
      console.error("Error generating message:", error);
      toast.error(error.message || "Failed to generate message");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyGeneratedMessage = () => {
    navigator.clipboard.writeText(aiGeneratedMessage);
    toast.success("Message copied to clipboard");
  };

  const handleApplyToOutreach = async () => {
    if (!applyPlayerName.trim()) {
      toast.error("Please enter a player name");
      return;
    }

    try {
      const outreachData: any = {
        player_name: applyPlayerName,
        ig_handle: applyIgHandle || null,
        initial_message: aiGeneratedMessage,
        messaged: false,
        response_received: false,
      };

      if (applyOutreachType === 'youth') {
        outreachData.parents_name = applyParentName || null;
        outreachData.parent_contact = applyParentContact || null;
        outreachData.parent_approval = false;

        const { error } = await supabase
          .from('player_outreach_youth')
          .insert([outreachData]);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('player_outreach_pro')
          .insert([outreachData]);
        
        if (error) throw error;
      }

      toast.success(`Added to ${applyOutreachType === 'youth' ? 'Youth' : 'Pro'} Outreach`);
      setShowApplyToOutreach(false);
      setApplyPlayerName("");
      setApplyIgHandle("");
      setApplyParentName("");
      setApplyParentContact("");
      setAiWriterOpen(false);
      setAiGeneratedMessage("");
      setAiWriterInfo("");
    } catch (error: any) {
      toast.error("Failed to add to outreach: " + error.message);
    }
  };

  const handleOpenAiWriter = (template?: MarketingTemplate) => {
    setAiWriterTemplate(template || null);
    setAiWriterInfo("");
    setAiGeneratedMessage("");
    setAiWriterOpen(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex w-full overflow-x-auto overflow-y-hidden scrollbar-hide gap-1 h-auto p-1 bg-muted rounded-md">
          <TabsTrigger value="prospects" className="flex-1 text-xs sm:text-sm px-1 sm:px-2 py-2.5">
            <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Prospect Board</span>
            <span className="sm:hidden">Prospects</span>
          </TabsTrigger>
          <TabsTrigger value="outreach" className="flex-1 text-xs sm:text-sm px-1 sm:px-2 py-2.5">
            <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Player Outreach</span>
            <span className="sm:hidden">Outreach</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex-1 text-xs sm:text-sm px-1 sm:px-2 py-2.5">
            <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Message Templates</span>
            <span className="sm:hidden">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="pathways" className="flex-1 text-xs sm:text-sm px-1 sm:px-2 py-2.5">
            <Route className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Message Pathways</span>
            <span className="sm:hidden">Pathways</span>
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex-1 text-xs sm:text-sm px-1 sm:px-2 py-2.5">
            <Scale className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Rules</span>
            <span className="sm:hidden">Rules</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prospects" className="space-y-4">
          <ProspectBoard isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="outreach" className="space-y-4">
          <PlayerOutreach isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h3 className="text-base sm:text-lg font-semibold">Message Templates</h3>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                size="sm" 
                variant="outline" 
                className="flex-1 sm:flex-initial"
                onClick={() => handleOpenAiWriter()}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">AI Message Writer</span>
                <span className="sm:hidden">AI Writer</span>
              </Button>
              {isAdmin && (
                <Button size="sm" className="flex-1 sm:flex-initial" onClick={() => {
                  setEditingTemplate(null);
                  setTemplateFormData({ recipient_type: "", message_title: "", message_content: "" });
                  setTemplateDialogOpen(true);
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Create Template</span>
                  <span className="sm:hidden">Create</span>
                </Button>
              )}
            </div>
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
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
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
                                onClick={() => handleOpenAiWriter(template)}
                                title="Use as AI template"
                              >
                                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                              </Button>
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
                              {isAdmin && (
                                <>
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
                                </>
                              )}
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

        <TabsContent value="pathways" className="space-y-4">
          <MessagePathways />
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <RecruitmentRulesTab isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>

      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
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
              <BlurInput
                value={templateFormData.message_title}
                onCommit={(v) => setTemplateFormData((f) => ({ ...f, message_title: v }))}
                placeholder="e.g., Spanish Club Introduction Message"
              />
            </div>
            <div>
              <Label>Message Content</Label>
              <BlurTextarea
                value={templateFormData.message_content}
                onCommit={(v) => setTemplateFormData((f) => ({ ...f, message_content: v }))}
                placeholder="Enter your message template here..."
                rows={10}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleTemplateSubmit}>
              {editingTemplate ? "Update Template" : "Create Template"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Message Writer Dialog */}
      <Dialog open={aiWriterOpen} onOpenChange={setAiWriterOpen}>
        <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              AI Message Writer
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template (Optional)</Label>
              <Select
                value={aiWriterTemplate?.id || "none"}
                onValueChange={(value) => {
                  if (value === "none") {
                    setAiWriterTemplate(null);
                  } else {
                    const selected = templates.find(t => t.id === value);
                    setAiWriterTemplate(selected || null);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template to use as reference" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template</SelectItem>
                  {RECIPIENT_TYPES.map(recipientType => {
                    const templatesForType = groupedTemplates[recipientType] || [];
                    if (templatesForType.length === 0) return null;
                    return (
                      <React.Fragment key={recipientType}>
                        <SelectItem value={`header-${recipientType}`} disabled className="font-semibold">
                          {recipientType}
                        </SelectItem>
                        {templatesForType.map(template => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.message_title}
                          </SelectItem>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </SelectContent>
              </Select>
              {aiWriterTemplate && (
                <div className="p-3 bg-accent/50 rounded-lg border">
                  <div className="text-sm font-medium mb-1">Using Template: {aiWriterTemplate.message_title}</div>
                  <div className="text-xs text-muted-foreground">
                    The AI will use this template as a reference for style and structure
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-info">Relevant Information</Label>
              <BlurTextarea
                value={aiWriterInfo}
                onCommit={setAiWriterInfo}
                placeholder="Provide key details for the message: recipient name, their background, specific points to address, purpose of the message, any personal touches or specific requests..."
                rows={8}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Include specific details like: recipient details, purpose of outreach, key selling points, player/prospect information, any personalization needed, tone preferences, etc.
              </p>
            </div>

            <Button 
              onClick={handleGenerateMessage} 
              disabled={isGenerating || !aiWriterInfo.trim()}
              className="w-full"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isGenerating ? "Generating..." : "Generate Message"}
            </Button>

            {aiGeneratedMessage && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <Label htmlFor="generated-message">Generated Message</Label>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 sm:flex-initial"
                      onClick={handleCopyGeneratedMessage}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 sm:flex-initial"
                      onClick={() => setShowApplyToOutreach(!showApplyToOutreach)}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Apply to Outreach</span>
                      <span className="sm:hidden">Apply</span>
                    </Button>
                  </div>
                </div>
                <BlurTextarea
                  value={aiGeneratedMessage}
                  onCommit={setAiGeneratedMessage}
                  rows={12}
                  className="font-sans"
                />
                <p className="text-xs text-muted-foreground">
                  You can edit the generated message above before copying or using it
                </p>

                {showApplyToOutreach && (
                  <div className="p-4 border rounded-lg space-y-3 bg-muted/50">
                    <h4 className="font-semibold text-sm">Add to Player Outreach</h4>
                    
                    <div className="space-y-2">
                      <Label>Outreach Type</Label>
                      <Select value={applyOutreachType} onValueChange={(value: 'youth' | 'pro') => setApplyOutreachType(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="youth">Youth (U18)</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="apply-player-name">Player Name *</Label>
                        <Input
                          id="apply-player-name"
                          value={applyPlayerName}
                          onChange={(e) => setApplyPlayerName(e.target.value)}
                          placeholder="Enter player name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="apply-ig-handle">IG Handle</Label>
                        <Input
                          id="apply-ig-handle"
                          value={applyIgHandle}
                          onChange={(e) => setApplyIgHandle(e.target.value)}
                          placeholder="@username"
                        />
                      </div>
                    </div>

                    {applyOutreachType === 'youth' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="apply-parent-name">Parent Name</Label>
                          <Input
                            id="apply-parent-name"
                            value={applyParentName}
                            onChange={(e) => setApplyParentName(e.target.value)}
                            placeholder="Parent/Guardian name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="apply-parent-contact">Parent Contact</Label>
                          <Input
                            id="apply-parent-contact"
                            value={applyParentContact}
                            onChange={(e) => setApplyParentContact(e.target.value)}
                            placeholder="Email or phone"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => setShowApplyToOutreach(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleApplyToOutreach}>
                        Add to Outreach
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAiWriterOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
