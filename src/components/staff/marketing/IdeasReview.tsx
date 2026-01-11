import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Check, X, Clock, XCircle, Plus, Lightbulb } from "lucide-react";
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

export const IdeasReview = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newIdeaTitle, setNewIdeaTitle] = useState("");

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

  const createMutation = useMutation({
    mutationFn: async (ideaTitle: string) => {
      const { error } = await supabase.from("marketing_ideas").insert({
        title: ideaTitle,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-ideas-review"] });
      queryClient.invalidateQueries({ queryKey: ["btl-writer-ideas"] });
      toast.success("Idea submitted for review");
      setNewIdeaTitle("");
      setIsDialogOpen(false);
    },
    onError: () => toast.error("Failed to submit idea"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MarketingIdea> }) => {
      const { error } = await supabase.from("marketing_ideas").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-ideas-review"] });
      queryClient.invalidateQueries({ queryKey: ["marketing-ideas"] });
      queryClient.invalidateQueries({ queryKey: ["btl-writer-ideas"] });
      toast.success("Idea updated");
    },
    onError: () => toast.error("Failed to update idea"),
  });

  const pendingIdeas = ideas.filter((i) => i.status === "pending");
  const rejectedIdeas = ideas.filter((i) => i.status === "rejected");

  const handleAccept = (idea: MarketingIdea) => {
    updateMutation.mutate({ id: idea.id, updates: { status: "accepted" } });
  };

  const handleReject = (idea: MarketingIdea) => {
    updateMutation.mutate({ id: idea.id, updates: { status: "rejected" } });
  };

  const handleSubmitIdea = () => {
    if (!newIdeaTitle.trim()) {
      toast.error("Please enter your idea");
      return;
    }
    createMutation.mutate(newIdeaTitle);
  };

  const IdeaCard = ({ idea, showActions = false }: { idea: MarketingIdea; showActions?: boolean }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm mb-1">{idea.title}</h4>
            <p className="text-xs text-muted-foreground mt-2">
              {new Date(idea.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
            {showActions && (
              <>
                <Button size="sm" variant="default" onClick={() => handleAccept(idea)} className="h-9 sm:h-8 flex-1 sm:flex-initial bg-green-600 hover:bg-green-700">
                  <Check className="w-3.5 h-3.5 sm:w-3 sm:h-3 mr-1 sm:mr-0" />
                  <span className="sm:hidden">Accept</span>
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleReject(idea)} className="h-9 sm:h-8 flex-1 sm:flex-initial">
                  <X className="w-3.5 h-3.5 sm:w-3 sm:h-3 mr-1 sm:mr-0" />
                  <span className="sm:hidden">Reject</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return <LoadingSpinner size="md" className="py-12" />;
  }

  return (
    <div className="space-y-6">
      {/* Submit Idea Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            Submit an Idea
          </CardTitle>
          <CardDescription className="text-xs">
            Have a marketing idea? Submit it here for review. Accepted ideas will appear in the BTL Writer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-3.5 w-3.5" />
                Add Idea
              </Button>
            </DialogTrigger>
            <DialogContent className="w-full max-w-lg">
              <DialogHeader>
                <DialogTitle>Submit New Idea</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Your Idea</label>
                  <Textarea
                    placeholder="Describe your marketing idea..."
                    value={newIdeaTitle}
                    onChange={(e) => setNewIdeaTitle(e.target.value)}
                    className="min-h-[160px]"
                  />
                </div>
                <Button onClick={handleSubmitIdea} className="w-full" disabled={createMutation.isPending}>
                  Submit Idea
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Review Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="w-full sm:w-auto justify-start">
          <TabsTrigger value="pending" className="gap-1.5 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-initial">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Pending
            {pendingIdeas.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-secondary">{pendingIdeas.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-1.5 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-initial">
            <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
    </div>
  );
};