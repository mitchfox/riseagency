import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, ExternalLink, Filter, Pencil, Trash2 } from "lucide-react";
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

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "bg-yellow-500/20 text-yellow-400" },
  { value: "accepted", label: "Accepted", color: "bg-green-500/20 text-green-400" },
  { value: "in_progress", label: "In Progress", color: "bg-blue-500/20 text-blue-400" },
  { value: "completed", label: "Completed", color: "bg-purple-500/20 text-purple-400" },
  { value: "rejected", label: "Rejected", color: "bg-red-500/20 text-red-400" },
];

const CATEGORY_OPTIONS = [
  "Social Media",
  "Video Content",
  "Graphics",
  "Campaign",
  "Partnership",
  "Other",
];

export function MarketingIdeas() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<MarketingIdea | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "pending",
    category: "",
    canva_link: "",
  });

  const isEditing = !!editingIdea;

  const { data: ideas = [], isLoading } = useQuery({
    queryKey: ["marketing-ideas"],
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
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("marketing_ideas").insert({
        title: data.title,
        description: data.description || null,
        status: data.status,
        category: data.category || null,
        canva_link: data.canva_link || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-ideas"] });
      toast.success("Idea added successfully");
      resetForm();
    },
    onError: () => toast.error("Failed to add idea"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("marketing_ideas")
        .update({
          title: data.title,
          description: data.description || null,
          status: data.status,
          category: data.category || null,
          canva_link: data.canva_link || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-ideas"] });
      toast.success("Idea updated successfully");
      resetForm();
    },
    onError: () => toast.error("Failed to update idea"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketing_ideas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-ideas"] });
      toast.success("Idea deleted");
    },
    onError: () => toast.error("Failed to delete idea"),
  });

  const resetForm = () => {
    setFormData({ title: "", description: "", status: "pending", category: "", canva_link: "" });
    setEditingIdea(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (idea: MarketingIdea) => {
    setEditingIdea(idea);
    setFormData({
      title: idea.title,
      description: idea.description || "",
      status: idea.status,
      category: idea.category || "",
      canva_link: idea.canva_link || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    // For new ideas, title is required (used as idea explained)
    if (!formData.title.trim()) {
      toast.error("Please explain your idea");
      return;
    }
    if (editingIdea) {
      updateMutation.mutate({ id: editingIdea.id, data: formData });
    } else {
      // New ideas always start as pending
      createMutation.mutate({ ...formData, status: "pending", category: "", canva_link: "" });
    }
  };

  const filteredIdeas = statusFilter === "all" 
    ? ideas 
    : ideas.filter(idea => idea.status === statusFilter);

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find(s => s.value === status);
    return (
      <Badge className={statusOption?.color || "bg-muted"}>
        {statusOption?.label || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Marketing Ideas</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Idea
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full max-w-2xl">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Edit Idea" : "Submit New Idea"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {isEditing ? (
                <>
                  {/* Full form for editing */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Idea</label>
                    <Textarea
                      placeholder="Explain your idea..."
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="min-h-[120px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Additional Notes</label>
                    <Textarea
                      placeholder="Any additional details..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Status</label>
                      <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Category</label>
                      <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Canva Link</label>
                    <Input
                      placeholder="https://www.canva.com/..."
                      value={formData.canva_link}
                      onChange={(e) => setFormData({ ...formData, canva_link: e.target.value })}
                    />
                  </div>
                </>
              ) : (
                /* Simplified form for new ideas - just one field */
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Idea Explained</label>
                  <Textarea
                    placeholder="Describe your marketing idea in detail..."
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="min-h-[160px]"
                  />
                </div>
              )}
              <Button onClick={handleSubmit} className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                {isEditing ? "Update Idea" : "Submit Idea"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : filteredIdeas.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No ideas found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Canva</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIdeas.map((idea) => (
                  <TableRow key={idea.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{idea.title}</p>
                        {idea.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{idea.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{idea.category || "-"}</TableCell>
                    <TableCell>{getStatusBadge(idea.status)}</TableCell>
                    <TableCell>
                      {idea.canva_link ? (
                        <a
                          href={idea.canva_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Open
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(idea)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(idea.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
