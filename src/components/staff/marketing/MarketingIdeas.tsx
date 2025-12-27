import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Lightbulb } from "lucide-react";
import { toast } from "sonner";

export function MarketingIdeas() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState("");

  const createMutation = useMutation({
    mutationFn: async (ideaTitle: string) => {
      const { error } = await supabase.from("marketing_ideas").insert({
        title: ideaTitle,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-ideas"] });
      queryClient.invalidateQueries({ queryKey: ["marketing-ideas-review"] });
      toast.success("Idea submitted for review");
      setTitle("");
      setIsDialogOpen(false);
    },
    onError: () => toast.error("Failed to submit idea"),
  });

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error("Please enter your idea");
      return;
    }
    createMutation.mutate(title);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Marketing Ideas</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Submit an Idea
          </CardTitle>
          <CardDescription>
            Have a marketing idea? Submit it here for review. Accepted ideas will appear in the BTL Writer for drafting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
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
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="min-h-[160px]"
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full" disabled={createMutation.isPending}>
                  Submit Idea
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}