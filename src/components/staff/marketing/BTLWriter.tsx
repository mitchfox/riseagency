import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, FileText, Trash2 } from "lucide-react";
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

export const BTLWriter = () => {
  const queryClient = useQueryClient();
  const [selectedIdea, setSelectedIdea] = useState<MarketingIdea | null>(null);
  const [draftDialogOpen, setDraftDialogOpen] = useState(false);
  const [draftForm, setDraftForm] = useState({
    title: "",
    excerpt: "",
    content: "",
    category: "",
  });

  const { data: acceptedIdeas = [], isLoading } = useQuery({
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

  const createPostMutation = useMutation({
    mutationFn: async (data: typeof draftForm) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { error } = await supabase.from("blog_posts").insert({
        title: data.title,
        excerpt: data.excerpt || null,
        content: data.content,
        category: data.category || null,
        author_id: userData.user.id,
        published: false,
      });
      if (error) throw error;

      // Remove the idea after creating the draft
      if (selectedIdea) {
        await supabase.from("marketing_ideas").delete().eq("id", selectedIdea.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["btl-writer-ideas"] });
      queryClient.invalidateQueries({ queryKey: ["marketing-ideas-review"] });
      toast.success("Draft created in Between The Lines");
      setDraftDialogOpen(false);
      setSelectedIdea(null);
      setDraftForm({ title: "", excerpt: "", content: "", category: "" });
    },
    onError: () => toast.error("Failed to create draft"),
  });

  const openDraftDialog = (idea: MarketingIdea) => {
    setSelectedIdea(idea);
    setDraftForm({
      title: idea.title,
      excerpt: "",
      content: "",
      category: "",
    });
    setDraftDialogOpen(true);
  };

  const handleCreateDraft = () => {
    if (!draftForm.title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (!draftForm.content.trim()) {
      toast.error("Please enter content");
      return;
    }
    createPostMutation.mutate(draftForm);
  };

  if (isLoading) {
    return <LoadingSpinner size="md" className="py-12" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            BTL Writer
          </CardTitle>
          <CardDescription>
            Accepted ideas ready to be drafted into Between The Lines posts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {acceptedIdeas.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No accepted ideas yet. Accept ideas from the Review Ideas tab to see them here.
            </p>
          ) : (
            <div className="space-y-3">
              {acceptedIdeas.map((idea) => (
                <Card key={idea.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{idea.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Accepted {new Date(idea.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button size="sm" variant="default" onClick={() => openDraftDialog(idea)} className="h-8">
                          <Edit className="w-3 h-3 mr-1" />
                          Write Draft
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(idea.id)} className="h-8">
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

      {/* Draft Dialog */}
      <Dialog open={draftDialogOpen} onOpenChange={setDraftDialogOpen}>
        <DialogContent className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Write BTL Draft</DialogTitle>
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
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={draftForm.content}
                onChange={(e) => setDraftForm({ ...draftForm, content: e.target.value })}
                rows={12}
                placeholder="Write the full post content..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraftDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDraft} disabled={createPostMutation.isPending}>
              Create Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};