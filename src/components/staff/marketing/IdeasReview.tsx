import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Clock, XCircle } from "lucide-react";
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

  const IdeaCard = ({ idea, showActions = false }: { idea: MarketingIdea; showActions?: boolean }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm mb-1">{idea.title}</h4>
            <p className="text-xs text-muted-foreground mt-2">
              {new Date(idea.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {showActions && (
              <>
                <Button size="sm" variant="default" onClick={() => handleAccept(idea)} className="h-8 bg-green-600 hover:bg-green-700">
                  <Check className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleReject(idea)} className="h-8">
                  <X className="w-3 h-3" />
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
      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="w-4 h-4" />
            Pending
            {pendingIdeas.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-secondary">{pendingIdeas.length}</span>
            )}
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