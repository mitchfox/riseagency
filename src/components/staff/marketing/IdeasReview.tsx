import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Edit, ExternalLink, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface MarketingIdea {
  id: string;
  title: string;
  description: string | null;
  status: string;
  category: string | null;
  canva_link: string | null;
  created_at: string;
}

export const IdeasReview = () => {
  const queryClient = useQueryClient();
  const [selectedIdea, setSelectedIdea] = useState<MarketingIdea | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [captionDialogOpen, setCaptionDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", description: "", category: "" });
  const [captionForm, setCaptionForm] = useState({ caption: "", canva_link: "" });

  const { data: ideas = [], isLoading } = useQuery({
    queryKey: ["marketing-ideas-review"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_ideas")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MarketingIdea[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MarketingIdea> }) => {
      const { error } = await supabase.from("marketing_ideas").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-ideas-review"] });
      queryClient.invalidateQueries({ queryKey: ["marketing-ideas"] });
      toast.success("Idea updated");
    },
    onError: () => toast.error("Failed to update idea"),
  });

  const pendingIdeas = ideas.filter((i) => i.status === "pending");
  const acceptedIdeas = ideas.filter((i) => i.status === "accepted");
  const rejectedIdeas = ideas.filter((i) => i.status === "rejected");

  const handleAccept = (idea: MarketingIdea) => {
    updateMutation.mutate({ id: idea.id, updates: { status: "accepted" } });
  };

  const handleReject = (idea: MarketingIdea) => {
    updateMutation.mutate({ id: idea.id, updates: { status: "rejected" } });
  };

  const openEditDialog = (idea: MarketingIdea) => {
    setSelectedIdea(idea);
    setEditForm({
      title: idea.title,
      description: idea.description || "",
      category: idea.category || "",
    });
    setEditDialogOpen(true);
  };

  const handleEditAndAccept = () => {
    if (!selectedIdea) return;
    updateMutation.mutate({
      id: selectedIdea.id,
      updates: {
        title: editForm.title,
        description: editForm.description,
        category: editForm.category,
        status: "accepted",
      },
    });
    setEditDialogOpen(false);
    setSelectedIdea(null);
  };

  const openCaptionDialog = (idea: MarketingIdea) => {
    setSelectedIdea(idea);
    setCaptionForm({
      caption: idea.description || "",
      canva_link: idea.canva_link || "",
    });
    setCaptionDialogOpen(true);
  };

  const handleSaveCaption = () => {
    if (!selectedIdea) return;
    updateMutation.mutate({
      id: selectedIdea.id,
      updates: {
        description: captionForm.caption,
        canva_link: captionForm.canva_link,
      },
    });
    setCaptionDialogOpen(false);
    setSelectedIdea(null);
  };

  const IdeaCard = ({ idea, showActions = false, showCaptionEdit = false }: { idea: MarketingIdea; showActions?: boolean; showCaptionEdit?: boolean }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm mb-1">{idea.title}</h4>
            {idea.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{idea.description}</p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {new Date(idea.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {showActions && (
              <>
                <Button size="sm" variant="outline" onClick={() => openEditDialog(idea)} className="h-8">
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button size="sm" variant="default" onClick={() => handleAccept(idea)} className="h-8 bg-green-600 hover:bg-green-700">
                  <Check className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleReject(idea)} className="h-8">
                  <X className="w-3 h-3" />
                </Button>
              </>
            )}
            {showCaptionEdit && (
              <>
                <Button size="sm" variant="outline" onClick={() => openCaptionDialog(idea)} className="h-8">
                  <Edit className="w-3 h-3 mr-1" />
                  Caption
                </Button>
                {idea.canva_link && (
                  <a href={idea.canva_link} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost" className="h-8">
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </a>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="w-4 h-4" />
            Pending
            {pendingIdeas.length > 0 && (
              <Badge variant="secondary" className="ml-1">{pendingIdeas.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="accepted" className="gap-2">
            <CheckCircle className="w-4 h-4" />
            Accepted
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            <XCircle className="w-4 h-4" />
            Rejected
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {pendingIdeas.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No pending ideas to review
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingIdeas.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} showActions />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="accepted" className="mt-6">
          {acceptedIdeas.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No accepted ideas yet
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {acceptedIdeas.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} showCaptionEdit />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          {rejectedIdeas.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No rejected ideas
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {rejectedIdeas.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit & Accept Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="w-full max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit & Accept Idea</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Idea</Label>
              <Textarea
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                placeholder="e.g., Player Content, Brand, Engagement"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditAndAccept} className="bg-green-600 hover:bg-green-700">
              <Check className="w-4 h-4 mr-2" />
              Save & Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Caption Edit Dialog */}
      <Dialog open={captionDialogOpen} onOpenChange={setCaptionDialogOpen}>
        <DialogContent className="w-full max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Post Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm font-medium mb-2">Original Idea:</p>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                {selectedIdea?.title}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Post Caption</Label>
              <Textarea
                value={captionForm.caption}
                onChange={(e) => setCaptionForm({ ...captionForm, caption: e.target.value })}
                rows={5}
                placeholder="Write the post caption here..."
              />
            </div>
            <div className="space-y-2">
              <Label>Canva Link</Label>
              <Input
                value={captionForm.canva_link}
                onChange={(e) => setCaptionForm({ ...captionForm, canva_link: e.target.value })}
                placeholder="https://www.canva.com/..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCaptionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCaption}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
