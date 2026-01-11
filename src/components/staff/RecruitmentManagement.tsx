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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, MessageSquare, Plus, Trash2, Edit, Sparkles, Copy, UserPlus, MapPin, Mail, Route } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { PlayerOutreach } from "./PlayerOutreach";
import MessagePathways from "./MessagePathways";

interface Prospect {
  id: string;
  name: string;
  age: number | null;
  position: string | null;
  nationality: string | null;
  current_club: string | null;
  age_group: 'A' | 'B' | 'C' | 'D';
  stage: 'scouted' | 'connected' | 'rapport_building' | 'rising' | 'rise';
  profile_image_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  last_contact_date: string | null;
  priority: 'low' | 'medium' | 'high' | null;
}

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

export const RecruitmentManagement = ({ isAdmin, initialTab = 'prospects' }: { isAdmin: boolean; initialTab?: 'prospects' | 'outreach' | 'templates' | 'pathways' }) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    position: "",
    nationality: "",
    current_club: "",
    age_group: "A" as 'A' | 'B' | 'C' | 'D',
    stage: "scouted" as 'scouted' | 'connected' | 'rapport_building' | 'rising' | 'rise',
    contact_email: "",
    contact_phone: "",
    notes: "",
    priority: "medium" as 'low' | 'medium' | 'high',
  });

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

  const ageGroups = [
    { value: 'A', label: 'A - FIRST TEAM' },
    { value: 'B', label: 'B - U21' },
    { value: 'C', label: 'C - U18' },
    { value: 'D', label: 'D - U16' },
  ];

  const stages = [
    { value: 'scouted', label: 'SCOUTED' },
    { value: 'connected', label: 'CONNECTED' },
    { value: 'rapport_building', label: 'RAPPORT BUILDING' },
    { value: 'rising', label: 'RISING' },
    { value: 'rise', label: 'RISE' },
  ];

  useEffect(() => {
    fetchProspects();
    fetchTemplates();
  }, []);

  const fetchProspects = async () => {
    try {
      const { data, error } = await supabase
        .from("prospects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProspects((data || []) as Prospect[]);
    } catch (error: any) {
      console.error("Error fetching prospects:", error);
      toast.error("Failed to load prospects");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const prospectData = {
        name: formData.name,
        age: formData.age ? parseInt(formData.age) : null,
        position: formData.position || null,
        nationality: formData.nationality || null,
        current_club: formData.current_club || null,
        age_group: formData.age_group,
        stage: formData.stage,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        notes: formData.notes || null,
        priority: formData.priority,
      };

      if (editingProspect) {
        const { error } = await supabase
          .from("prospects")
          .update(prospectData)
          .eq("id", editingProspect.id);

        if (error) throw error;
        toast.success("Prospect updated successfully");
      } else {
        const { error } = await supabase
          .from("prospects")
          .insert([prospectData]);

        if (error) throw error;
        toast.success("Prospect added successfully");
      }

      setDialogOpen(false);
      resetForm();
      fetchProspects();
    } catch (error: any) {
      console.error("Error saving prospect:", error);
      toast.error("Failed to save prospect");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this prospect?")) return;

    try {
      const { error } = await supabase
        .from("prospects")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Prospect deleted successfully");
      fetchProspects();
    } catch (error: any) {
      console.error("Error deleting prospect:", error);
      toast.error("Failed to delete prospect");
    }
  };

  const handleEdit = (prospect: Prospect) => {
    setEditingProspect(prospect);
    setFormData({
      name: prospect.name,
      age: prospect.age?.toString() || "",
      position: prospect.position || "",
      nationality: prospect.nationality || "",
      current_club: prospect.current_club || "",
      age_group: prospect.age_group,
      stage: prospect.stage,
      contact_email: prospect.contact_email || "",
      contact_phone: prospect.contact_phone || "",
      notes: prospect.notes || "",
      priority: prospect.priority || "medium",
    });
    setDialogOpen(true);
  };

  const handleMoveStage = async (prospectId: string, newStage: typeof stages[number]['value']) => {
    try {
      const { error } = await supabase
        .from("prospects")
        .update({ stage: newStage })
        .eq("id", prospectId);

      if (error) throw error;
      fetchProspects();
    } catch (error: any) {
      console.error("Error moving prospect:", error);
      toast.error("Failed to move prospect");
    }
  };

  const resetForm = () => {
    setEditingProspect(null);
    setFormData({
      name: "",
      age: "",
      position: "",
      nationality: "",
      current_club: "",
      age_group: "A",
      stage: "scouted",
      contact_email: "",
      contact_phone: "",
      notes: "",
      priority: "medium",
    });
  };

  const getProspectsForCell = (ageGroup: string, stage: string) => {
    return prospects.filter(p => p.age_group === ageGroup && p.stage === stage);
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'high': return 'hsl(0, 70%, 50%)';
      case 'medium': return 'hsl(43, 49%, 61%)';
      case 'low': return 'hsl(140, 50%, 50%)';
      default: return 'hsl(0, 0%, 50%)';
    }
  };

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
        <TabsList className="grid w-full grid-cols-4 h-auto sm:h-10">
          <TabsTrigger value="prospects" className="flex-1 text-xs sm:text-sm px-2 py-2.5">
            <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Prospect Board</span>
            <span className="sm:hidden">Prospects</span>
          </TabsTrigger>
          <TabsTrigger value="outreach" className="flex-1 text-xs sm:text-sm px-2 py-2.5">
            <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Player Outreach</span>
            <span className="sm:hidden">Outreach</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex-1 text-xs sm:text-sm px-2 py-2.5">
            <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Message Templates</span>
            <span className="sm:hidden">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="pathways" className="flex-1 text-xs sm:text-sm px-2 py-2.5">
            <Route className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Message Pathways</span>
            <span className="sm:hidden">Pathways</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prospects" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="text-xs sm:text-sm text-muted-foreground">
              {prospects.length} prospect{prospects.length !== 1 ? 's' : ''} tracked
            </div>
            {isAdmin && (
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Add Prospect</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </DialogTrigger>
              <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingProspect ? "Edit Prospect" : "Add New Prospect"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="age">Age</Label>
                      <Input
                        id="age"
                        type="number"
                        value={formData.age}
                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="position">Position</Label>
                      <Input
                        id="position"
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nationality">Nationality</Label>
                      <Input
                        id="nationality"
                        value={formData.nationality}
                        onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="current_club">Current Club</Label>
                    <Input
                      id="current_club"
                      value={formData.current_club}
                      onChange={(e) => setFormData({ ...formData, current_club: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="age_group">Age Group *</Label>
                      <Select
                        value={formData.age_group}
                        onValueChange={(value: any) => setFormData({ ...formData, age_group: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ageGroups.map(group => (
                            <SelectItem key={group.value} value={group.value}>
                              {group.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stage">Stage *</Label>
                      <Select
                        value={formData.stage}
                        onValueChange={(value: any) => setFormData({ ...formData, stage: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {stages.map(stage => (
                            <SelectItem key={stage.value} value={stage.value}>
                              {stage.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact_email">Email</Label>
                      <Input
                        id="contact_email"
                        type="email"
                        value={formData.contact_email}
                        onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_phone">Phone</Label>
                      <Input
                        id="contact_phone"
                        value={formData.contact_phone}
                        onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={4}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingProspect ? "Update" : "Add"} Prospect
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            )}
          </div>

          {/* Prospect Board Grid */}
          <div className="w-full overflow-x-auto">
            <div className={isMobile ? "min-w-[500px]" : "min-w-[1200px]"}>
              {/* Header Row */}
              <div className={`grid ${isMobile ? 'grid-cols-3' : 'grid-cols-6'} gap-2 mb-2`}>
                <div className={`${isMobile ? 'p-2' : 'p-3'} text-center font-bebas uppercase ${isMobile ? 'text-xs' : 'text-sm'} rounded-lg`} style={{ backgroundColor: 'hsl(0, 0%, 20%)', color: 'hsl(0, 0%, 100%)' }}>
                  {isMobile ? 'Age' : 'Age Group'}
                </div>
                {(isMobile ? stages.slice(0, 2) : stages).map(stage => (
                  <div 
                    key={stage.value}
                    className={`${isMobile ? 'p-2' : 'p-3'} text-center font-bebas uppercase ${isMobile ? 'text-xs' : 'text-sm'} rounded-lg`}
                    style={{ backgroundColor: 'hsl(43, 49%, 61%)', color: 'hsl(0, 0%, 0%)' }}
                  >
                    {isMobile ? stage.label.split(' ')[0] : stage.label}
                  </div>
                ))}
              </div>

              {/* Grid Rows */}
              {ageGroups.map(ageGroup => (
                <div key={ageGroup.value} className={`grid ${isMobile ? 'grid-cols-3' : 'grid-cols-6'} gap-2 mb-2`}>
                  {/* Age Group Label */}
                  <div 
                    className={`${isMobile ? 'p-2' : 'p-3'} rounded-lg flex flex-col items-center justify-center border`}
                    style={{ 
                      backgroundColor: 'hsl(0, 0%, 15%)',
                      borderColor: 'rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <div className={`font-bebas ${isMobile ? 'text-lg' : 'text-2xl'}`} style={{ color: 'hsl(43, 49%, 61%)' }}>
                      {ageGroup.value}
                    </div>
                    {!isMobile && (
                      <div className="text-xs text-muted-foreground">
                        {ageGroup.label.split(' - ')[1]}
                      </div>
                    )}
                  </div>

                  {/* Stage Cells */}
                  {(isMobile ? stages.slice(0, 2) : stages).map(stage => {
                    const cellProspects = getProspectsForCell(ageGroup.value, stage.value);
                    return (
                      <div 
                        key={stage.value}
                        className={`${isMobile ? 'p-1' : 'p-2'} rounded-lg ${isMobile ? 'min-h-[80px]' : 'min-h-[120px]'} border`}
                        style={{ 
                          backgroundColor: 'hsl(0, 0%, 10%)',
                          borderColor: 'rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        {cellProspects.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {cellProspects.map(prospect => (
                              <div
                                key={prospect.id}
                                className={`group relative ${isMobile ? 'p-1' : 'p-2'} rounded border hover:scale-105 transition-transform ${isAdmin ? 'cursor-pointer' : 'cursor-default'}`}
                                style={{ 
                                  backgroundColor: 'hsl(0, 0%, 20%)',
                                  borderColor: getPriorityColor(prospect.priority),
                                  borderWidth: '2px'
                                }}
                                onClick={isAdmin ? () => handleEdit(prospect) : undefined}
                              >
                                <div className={`${isMobile ? 'text-[9px]' : 'text-xs'} font-bold truncate max-w-full`} style={{ color: 'hsl(43, 49%, 61%)' }}>
                                  {isMobile ? prospect.name.substring(0, 12) : prospect.name}
                                </div>
                                {!isMobile && prospect.position && (
                                  <div className="text-[10px] text-muted-foreground truncate">
                                    {prospect.position}
                                  </div>
                                )}
                                {!isMobile && prospect.current_club && (
                                  <div className="text-[10px] text-muted-foreground truncate">
                                    {prospect.current_club}
                                  </div>
                                )}
                                
                                {/* Quick Actions on Hover */}
                                {isAdmin && (
                                  <div className="absolute top-0 right-0 hidden group-hover:flex gap-1 p-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-5 w-5 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(prospect.id);
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center text-xs text-muted-foreground opacity-30">
                            Empty
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className={`flex ${isMobile ? 'flex-col' : 'items-center'} gap-4 text-sm text-muted-foreground pt-4 border-t`}>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2" style={{ borderColor: 'hsl(0, 70%, 50%)' }} />
                <span>High Priority</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2" style={{ borderColor: 'hsl(43, 49%, 61%)' }} />
                <span>Medium Priority</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2" style={{ borderColor: 'hsl(140, 50%, 50%)' }} />
                <span>Low Priority</span>
              </div>
            </div>
          </div>
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
              <Textarea
                id="ai-info"
                value={aiWriterInfo}
                onChange={(e) => setAiWriterInfo(e.target.value)}
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
                <Textarea
                  id="generated-message"
                  value={aiGeneratedMessage}
                  onChange={(e) => setAiGeneratedMessage(e.target.value)}
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
