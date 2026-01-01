import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, FileText, Trash2, Plus, Send, Save, Copy, ChevronDown, Pencil } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface MarketingIdea {
  id: string;
  title: string;
  description: string | null;
  status: string;
  category: string | null;
  canva_link: string | null;
  created_at: string;
}

interface BlogPost {
  id: string;
  title: string;
  excerpt: string | null;
  content: string;
  category: string | null;
  workflow_status: string;
  created_at: string;
}

const BTL_CATEGORIES = [
  "Training & Performance",
  "Psychology",
  "Nutrition",
  "Recovery",
  "Tactical Analysis",
  "Career Development",
  "Technical Skills",
  "Mindset",
];

const WRITING_STYLE_GUIDE = `Use this voice:

Reflective and exploratory – to provoke thought and deeper understanding.

Expert-driven and specialised – to communicate with authority to an informed audience.

Personalised and direct – to create a human, relational connection with the reader.

Use this tone:

Calm and measured – to convey clarity without exaggeration or emotional sway.

Constructive and purposeful – to drive improvement, action, or awareness.

Sincere and grounded – to maintain honesty without pretension.

Use this style:

Theme-driven segmentation – to organise content around clear, focused ideas.

Implicit or explicit progression – to build understanding through logical flow.

Use of examples or reference points – to anchor abstract points in real situations.

Additionally: Respond formally with U.K. English. Tell it like it is; don't sugar-coat responses. Do not add pre-ambles to your responses, simply respond by completing the task requested. Do not use em dashes in any context. Use commas or full stops to separate or extend ideas.

Never use a comma before the word 'and' in any context. Never use mirrored constructions like "It is not this, it is that." Replace them with direct, assertive statements. Use sequencing or standalone sentences to establish contrast or progression. Make every assertion stand on its own. Do not pivot from a negative to a positive form within the same sentence. Avoid rhetorical contrasts that delay clarity. I prefer clear, direct, UK English with no contractions. I work in football as a performance consultant and agent, so I value honesty, expertise, and efficiency. I want responses to reflect my tone: professional, cutting when needed and never over-friendly. Style, structure, and phrasing matter to me.`;

export const BTLWriter = () => {
  const queryClient = useQueryClient();
  const [selectedIdea, setSelectedIdea] = useState<MarketingIdea | null>(null);
  const [selectedDraft, setSelectedDraft] = useState<BlogPost | null>(null);
  const [draftDialogOpen, setDraftDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState("");
  const [draftForm, setDraftForm] = useState({
    title: "",
    excerpt: "",
    intro: "",
    mainPara: "",
    secondaryPara: "",
    conclusion: "",
    category: "",
    finalArticle: "",
  });
  const [draftSectionOpen, setDraftSectionOpen] = useState(true);
  const [finalArticleSectionOpen, setFinalArticleSectionOpen] = useState(false);

  // Generate placeholder suggestions based on idea title
  const getPlaceholder = (section: string, ideaTitle: string) => {
    const title = ideaTitle || "your topic";
    switch (section) {
      case "intro":
        return `Hook the reader with a compelling opening about ${title}. Set the scene and establish why this matters to footballers...`;
      case "mainPara":
        return `Dive deep into the core message of ${title}. Provide the key insights, evidence, or practical advice that forms the heart of this post...`;
      case "secondaryPara":
        return `Expand on ${title} with additional context, examples, or a different angle. Address potential questions or objections...`;
      case "conclusion":
        return `Wrap up ${title} with a strong call-to-action or memorable takeaway. Leave readers with something to think about or do...`;
      default:
        return "";
    }
  };

  // Combine sections into content for storage
  const combineContent = (intro: string, main: string, secondary: string, conclusion: string) => {
    return `**Intro**\n${intro}\n\n**Main**\n${main}\n\n**Secondary**\n${secondary}\n\n**Conclusion**\n${conclusion}`;
  };

  // Parse stored content back into sections
  const parseContent = (content: string) => {
    const sections = { intro: "", mainPara: "", secondaryPara: "", conclusion: "" };
    const introMatch = content.match(/\*\*Intro\*\*\n([\s\S]*?)(?=\n\n\*\*Main\*\*|$)/);
    const mainMatch = content.match(/\*\*Main\*\*\n([\s\S]*?)(?=\n\n\*\*Secondary\*\*|$)/);
    const secondaryMatch = content.match(/\*\*Secondary\*\*\n([\s\S]*?)(?=\n\n\*\*Conclusion\*\*|$)/);
    const conclusionMatch = content.match(/\*\*Conclusion\*\*\n([\s\S]*?)$/);
    
    if (introMatch) sections.intro = introMatch[1].trim();
    if (mainMatch) sections.mainPara = mainMatch[1].trim();
    if (secondaryMatch) sections.secondaryPara = secondaryMatch[1].trim();
    if (conclusionMatch) sections.conclusion = conclusionMatch[1].trim();
    
    // If no structured format found, put everything in intro
    if (!introMatch && !mainMatch && !secondaryMatch && !conclusionMatch && content.trim()) {
      sections.intro = content;
    }
    
    return sections;
  };

  // Fetch accepted ideas
  const { data: acceptedIdeas = [], isLoading: ideasLoading } = useQuery({
    queryKey: ["btl-writer-ideas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_ideas")
        .select("*")
        .eq("status", "accepted")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MarketingIdea[];
    },
  });

  // Fetch drafts (workflow_status = 'draft')
  const { data: drafts = [], isLoading: draftsLoading } = useQuery({
    queryKey: ["btl-drafts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("workflow_status", "draft")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BlogPost[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketing_ideas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["btl-writer-ideas"] });
      queryClient.invalidateQueries({ queryKey: ["marketing-ideas-review"] });
      toast.success("Idea removed");
    },
    onError: () => toast.error("Failed to remove idea"),
  });

  const deleteDraftMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["btl-drafts"] });
      toast.success("Draft deleted");
    },
    onError: () => toast.error("Failed to delete draft"),
  });

  const renameDraftMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase
        .from("blog_posts")
        .update({ title })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["btl-drafts"] });
      toast.success("Title updated");
      setRenameDialogOpen(false);
      setSelectedDraft(null);
      setRenameTitle("");
    },
    onError: () => toast.error("Failed to rename"),
  });

  const createDraftMutation = useMutation({
    mutationFn: async (data: typeof draftForm) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const combinedContent = combineContent(data.intro, data.mainPara, data.secondaryPara, data.conclusion);
      const { error } = await supabase.from("blog_posts").insert({
        title: data.title,
        excerpt: data.excerpt || null,
        content: combinedContent,
        category: data.category || null,
        author_id: userData.user.id,
        published: false,
        workflow_status: "draft",
      });
      if (error) throw error;

      // Remove the idea after creating the draft
      if (selectedIdea) {
        await supabase.from("marketing_ideas").delete().eq("id", selectedIdea.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["btl-writer-ideas"] });
      queryClient.invalidateQueries({ queryKey: ["btl-drafts"] });
      queryClient.invalidateQueries({ queryKey: ["marketing-ideas-review"] });
      toast.success("Draft created");
      setDraftDialogOpen(false);
      setSelectedIdea(null);
      setDraftForm({ title: "", excerpt: "", intro: "", mainPara: "", secondaryPara: "", conclusion: "", category: "", finalArticle: "" });
    },
    onError: () => toast.error("Failed to create draft"),
  });

  const updateDraftMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof draftForm }) => {
      // Use finalArticle if provided, otherwise use combined draft sections
      const contentToSave = data.finalArticle.trim() 
        ? data.finalArticle.trim() 
        : combineContent(data.intro, data.mainPara, data.secondaryPara, data.conclusion);
      const { error } = await supabase
        .from("blog_posts")
        .update({
          title: data.title,
          excerpt: data.excerpt || null,
          content: contentToSave,
          category: data.category || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["btl-drafts"] });
      toast.success("Draft saved");
      setEditDialogOpen(false);
      setSelectedDraft(null);
    },
    onError: () => toast.error("Failed to save draft"),
  });

  const submitDraftMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("blog_posts")
        .update({ workflow_status: "ready_for_image" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["btl-drafts"] });
      queryClient.invalidateQueries({ queryKey: ["image-creator-posts"] });
      toast.success("Draft submitted to Image Creator");
      setEditDialogOpen(false);
      setSelectedDraft(null);
    },
    onError: () => toast.error("Failed to submit draft"),
  });

  const openDraftDialog = (idea: MarketingIdea) => {
    setSelectedIdea(idea);
    setDraftForm({
      title: idea.title,
      excerpt: "",
      intro: "",
      mainPara: "",
      secondaryPara: "",
      conclusion: "",
      category: "",
      finalArticle: "",
    });
    setDraftDialogOpen(true);
  };

  const openEditDialog = (draft: BlogPost) => {
    setSelectedDraft(draft);
    const parsed = parseContent(draft.content);
    setDraftForm({
      title: draft.title,
      excerpt: draft.excerpt || "",
      intro: parsed.intro,
      mainPara: parsed.mainPara,
      secondaryPara: parsed.secondaryPara,
      conclusion: parsed.conclusion,
      category: draft.category || "",
      finalArticle: "",
    });
    setDraftSectionOpen(true);
    setFinalArticleSectionOpen(false);
    setEditDialogOpen(true);
  };

  const handleCreateDraft = () => {
    if (!draftForm.title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    const hasContent = draftForm.intro.trim() || draftForm.mainPara.trim() || draftForm.secondaryPara.trim() || draftForm.conclusion.trim();
    if (!hasContent) {
      toast.error("Please enter content in at least one section");
      return;
    }
    createDraftMutation.mutate(draftForm);
  };

  const handleSaveDraft = () => {
    if (!selectedDraft) return;
    if (!draftForm.title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    const hasContent = draftForm.intro.trim() || draftForm.mainPara.trim() || draftForm.secondaryPara.trim() || draftForm.conclusion.trim();
    if (!hasContent) {
      toast.error("Please enter content in at least one section");
      return;
    }
    updateDraftMutation.mutate({ id: selectedDraft.id, data: draftForm });
  };

  const handleSubmitDraft = () => {
    if (!selectedDraft) return;
    const hasContent = draftForm.intro.trim() || draftForm.mainPara.trim() || draftForm.secondaryPara.trim() || draftForm.conclusion.trim();
    if (!draftForm.title.trim() || !hasContent) {
      toast.error("Please complete the draft before submitting");
      return;
    }
    // Save first, then submit
    updateDraftMutation.mutate(
      { id: selectedDraft.id, data: draftForm },
      {
        onSuccess: () => {
          submitDraftMutation.mutate(selectedDraft.id);
        },
      }
    );
  };

  const generateAndCopyPrompt = () => {
    const hasContent = draftForm.intro.trim() || draftForm.mainPara.trim() || draftForm.secondaryPara.trim() || draftForm.conclusion.trim();
    if (!hasContent) {
      toast.error("Please enter content in at least one section first");
      return;
    }

    const contentSections = [];
    if (draftForm.intro.trim()) contentSections.push(`**Intro:** ${draftForm.intro.trim()}`);
    if (draftForm.mainPara.trim()) contentSections.push(`**Main Paragraph:** ${draftForm.mainPara.trim()}`);
    if (draftForm.secondaryPara.trim()) contentSections.push(`**Secondary Paragraph:** ${draftForm.secondaryPara.trim()}`);
    if (draftForm.conclusion.trim()) contentSections.push(`**Conclusion:** ${draftForm.conclusion.trim()}`);

    const prompt = `Write a blog article titled "${draftForm.title}" for a football performance and development audience.

Use the following section notes as guidance for the article structure:

${contentSections.join("\n\n")}

---

${WRITING_STYLE_GUIDE}`;

    navigator.clipboard.writeText(prompt).then(() => {
      toast.success("Prompt copied to clipboard");
    }).catch(() => {
      toast.error("Failed to copy prompt");
    });
  };

  const isLoading = ideasLoading || draftsLoading;

  if (isLoading) {
    return <LoadingSpinner size="md" className="py-12" />;
  }

  return (
    <div className="space-y-6">
      {/* Drafts Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Drafts
          </CardTitle>
          <CardDescription>
            Work in progress posts. Edit and submit when ready.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {drafts.length === 0 ? (
            <p className="text-muted-foreground text-center py-6 text-sm">
              No drafts yet. Create one from an accepted idea below.
            </p>
          ) : (
            <div className="space-y-3">
              {drafts.map((draft) => (
                <Card key={draft.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{draft.title}</h4>
                        {draft.category && (
                          <span className="text-xs text-muted-foreground">{draft.category}</span>
                        )}
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {draft.excerpt || draft.content.substring(0, 100)}...
                        </p>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-shrink-0">
                        <Button size="sm" variant="default" onClick={() => openEditDialog(draft)} className="h-8 flex-1 sm:flex-initial">
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            setSelectedDraft(draft);
                            setRenameTitle(draft.title);
                            setRenameDialogOpen(true);
                          }} 
                          className="h-8"
                          title="Rename"
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteDraftMutation.mutate(draft.id)} className="h-8">
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accepted Ideas Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-500" />
            Accepted Ideas
          </CardTitle>
          <CardDescription>
            Create drafts from these accepted ideas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {acceptedIdeas.length === 0 ? (
            <p className="text-muted-foreground text-center py-6 text-sm">
              No accepted ideas. Accept ideas from the Review Ideas tab.
            </p>
          ) : (
            <div className="space-y-3">
              {acceptedIdeas.map((idea) => (
                <Card key={idea.id} className="hover:shadow-md transition-shadow border-dashed">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{idea.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Accepted {new Date(idea.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                        <Button size="sm" variant="outline" onClick={() => openDraftDialog(idea)} className="h-9 sm:h-8 flex-1 sm:flex-initial">
                          <Plus className="w-3 h-3 mr-1" />
                          Create Draft
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(idea.id)} className="h-9 sm:h-8">
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Draft Dialog */}
      <Dialog open={draftDialogOpen} onOpenChange={setDraftDialogOpen}>
        <DialogContent className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Draft</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm font-medium mb-2">Original Idea:</p>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                {selectedIdea?.title}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Post Title</Label>
              <Input
                value={draftForm.title}
                onChange={(e) => setDraftForm({ ...draftForm, title: e.target.value })}
                placeholder="Enter the post title..."
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={draftForm.category} onValueChange={(v) => setDraftForm({ ...draftForm, category: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {BTL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Excerpt (optional)</Label>
              <Textarea
                value={draftForm.excerpt}
                onChange={(e) => setDraftForm({ ...draftForm, excerpt: e.target.value })}
                rows={2}
                placeholder="Brief summary of the post..."
              />
            </div>
            
            {/* Structured Content Sections */}
            <div className="space-y-4 border-t pt-4">
              <p className="text-sm font-medium text-muted-foreground">Content Sections</p>
              
              <div className="space-y-2">
                <Label>Intro</Label>
                <p className="text-xs italic text-muted-foreground mb-1">
                  {getPlaceholder("intro", selectedIdea?.title || draftForm.title)}
                </p>
                <Textarea
                  value={draftForm.intro}
                  onChange={(e) => setDraftForm({ ...draftForm, intro: e.target.value })}
                  rows={3}
                  placeholder="Write your introduction..."
                />
              </div>
              
              <div className="space-y-2">
                <Label>Main Para</Label>
                <p className="text-xs italic text-muted-foreground mb-1">
                  {getPlaceholder("mainPara", selectedIdea?.title || draftForm.title)}
                </p>
                <Textarea
                  value={draftForm.mainPara}
                  onChange={(e) => setDraftForm({ ...draftForm, mainPara: e.target.value })}
                  rows={4}
                  placeholder="Write your main paragraph..."
                />
              </div>
              
              <div className="space-y-2">
                <Label>Secondary Para</Label>
                <p className="text-xs italic text-muted-foreground mb-1">
                  {getPlaceholder("secondaryPara", selectedIdea?.title || draftForm.title)}
                </p>
                <Textarea
                  value={draftForm.secondaryPara}
                  onChange={(e) => setDraftForm({ ...draftForm, secondaryPara: e.target.value })}
                  rows={4}
                  placeholder="Write your secondary paragraph..."
                />
              </div>
              
              <div className="space-y-2">
                <Label>Conclusion</Label>
                <p className="text-xs italic text-muted-foreground mb-1">
                  {getPlaceholder("conclusion", selectedIdea?.title || draftForm.title)}
                </p>
                <Textarea
                  value={draftForm.conclusion}
                  onChange={(e) => setDraftForm({ ...draftForm, conclusion: e.target.value })}
                  rows={3}
                  placeholder="Write your conclusion..."
                />
              </div>
            </div>
          </div>
          <div className="border-t pt-4">
            <Button variant="secondary" onClick={generateAndCopyPrompt} className="w-full">
              <Copy className="w-4 h-4 mr-2" />
              Copy AI Prompt
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraftDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDraft} disabled={createDraftMutation.isPending}>
              Create Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Draft Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Draft</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Post Title</Label>
              <Input
                value={draftForm.title}
                onChange={(e) => setDraftForm({ ...draftForm, title: e.target.value })}
                placeholder="Enter the post title..."
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={draftForm.category} onValueChange={(v) => setDraftForm({ ...draftForm, category: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {BTL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Excerpt (optional)</Label>
              <Textarea
                value={draftForm.excerpt}
                onChange={(e) => setDraftForm({ ...draftForm, excerpt: e.target.value })}
                rows={2}
                placeholder="Brief summary of the post..."
              />
            </div>
            
            {/* Draft Section - Collapsible */}
            <Collapsible open={draftSectionOpen} onOpenChange={setDraftSectionOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                <span className="text-sm font-medium">Draft Notes</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${draftSectionOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Intro</Label>
                  <p className="text-xs italic text-muted-foreground mb-1">
                    {getPlaceholder("intro", draftForm.title)}
                  </p>
                  <Textarea
                    value={draftForm.intro}
                    onChange={(e) => setDraftForm({ ...draftForm, intro: e.target.value })}
                    rows={3}
                    placeholder="Write your introduction..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Main Para</Label>
                  <p className="text-xs italic text-muted-foreground mb-1">
                    {getPlaceholder("mainPara", draftForm.title)}
                  </p>
                  <Textarea
                    value={draftForm.mainPara}
                    onChange={(e) => setDraftForm({ ...draftForm, mainPara: e.target.value })}
                    rows={4}
                    placeholder="Write your main paragraph..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Secondary Para</Label>
                  <p className="text-xs italic text-muted-foreground mb-1">
                    {getPlaceholder("secondaryPara", draftForm.title)}
                  </p>
                  <Textarea
                    value={draftForm.secondaryPara}
                    onChange={(e) => setDraftForm({ ...draftForm, secondaryPara: e.target.value })}
                    rows={4}
                    placeholder="Write your secondary paragraph..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Conclusion</Label>
                  <p className="text-xs italic text-muted-foreground mb-1">
                    {getPlaceholder("conclusion", draftForm.title)}
                  </p>
                  <Textarea
                    value={draftForm.conclusion}
                    onChange={(e) => setDraftForm({ ...draftForm, conclusion: e.target.value })}
                    rows={3}
                    placeholder="Write your conclusion..."
                  />
                </div>

                <Button variant="secondary" onClick={generateAndCopyPrompt} className="w-full">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy AI Prompt
                </Button>
              </CollapsibleContent>
            </Collapsible>

            {/* Final Article Section - Collapsible */}
            <Collapsible open={finalArticleSectionOpen} onOpenChange={setFinalArticleSectionOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                <span className="text-sm font-medium">Final Article</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${finalArticleSectionOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <div className="space-y-2">
                  <Label>Paste Final Written Article</Label>
                  <Textarea
                    value={draftForm.finalArticle}
                    onChange={(e) => setDraftForm({ ...draftForm, finalArticle: e.target.value })}
                    rows={12}
                    placeholder="Paste the final AI-generated or written article here..."
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleSaveDraft} disabled={updateDraftMutation.isPending}>
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
            <Button onClick={handleSubmitDraft} disabled={updateDraftMutation.isPending || submitDraftMutation.isPending}>
              <Send className="w-4 h-4 mr-1" />
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename-title">Title</Label>
              <Input
                id="rename-title"
                value={renameTitle}
                onChange={(e) => setRenameTitle(e.target.value)}
                placeholder="Enter new title"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedDraft && renameTitle.trim()) {
                  renameDraftMutation.mutate({ id: selectedDraft.id, title: renameTitle.trim() });
                }
              }} 
              disabled={renameDraftMutation.isPending || !renameTitle.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};