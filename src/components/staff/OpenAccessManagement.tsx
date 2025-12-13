import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, ExternalLink, Trash2, Upload, Image as ImageIcon, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

interface OpenAccessIssue {
  id: string;
  month: string;
  canva_draft_link: string | null;
  published: boolean;
  created_at: string;
}

interface OpenAccessPage {
  id: string;
  issue_id: string;
  page_number: number;
  image_url: string;
  display_order: number;
}

export function OpenAccessManagement() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    month: "",
    canva_draft_link: "",
  });
  const [uploadingIssueId, setUploadingIssueId] = useState<string | null>(null);

  const { data: issues = [], isLoading } = useQuery({
    queryKey: ["open-access-issues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("open_access_issues")
        .select("*")
        .order("month", { ascending: false });
      if (error) throw error;
      return data as OpenAccessIssue[];
    },
  });

  const { data: allPages = [] } = useQuery({
    queryKey: ["open-access-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("open_access_pages")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as OpenAccessPage[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("open_access_issues").insert({
        month: data.month + "-01",
        canva_draft_link: data.canva_draft_link || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["open-access-issues"] });
      toast.success("Issue created successfully");
      resetForm();
    },
    onError: () => toast.error("Failed to create issue"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<OpenAccessIssue> }) => {
      const { error } = await supabase
        .from("open_access_issues")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["open-access-issues"] });
      toast.success("Issue updated");
    },
    onError: () => toast.error("Failed to update issue"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("open_access_issues").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["open-access-issues"] });
      toast.success("Issue deleted");
    },
    onError: () => toast.error("Failed to delete issue"),
  });

  const deletePageMutation = useMutation({
    mutationFn: async (pageId: string) => {
      const { error } = await supabase.from("open_access_pages").delete().eq("id", pageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["open-access-pages"] });
      toast.success("Page deleted");
    },
    onError: () => toast.error("Failed to delete page"),
  });

  const resetForm = () => {
    setFormData({ month: "", canva_draft_link: "" });
    setIsDialogOpen(false);
  };

  const handleSubmit = () => {
    if (!formData.month) {
      toast.error("Please select a month");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleFileUpload = async (issueId: string, files: FileList) => {
    setUploadingIssueId(issueId);
    const existingPages = allPages.filter(p => p.issue_id === issueId);
    let nextOrder = existingPages.length > 0 ? Math.max(...existingPages.map(p => p.display_order)) + 1 : 0;
    let nextPageNumber = existingPages.length > 0 ? Math.max(...existingPages.map(p => p.page_number)) + 1 : 1;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${issueId}/${Date.now()}-${nextPageNumber}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("marketing-gallery")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("marketing-gallery")
          .getPublicUrl(fileName);

        const { error: insertError } = await supabase
          .from("open_access_pages")
          .insert({
            issue_id: issueId,
            page_number: nextPageNumber,
            image_url: publicUrl,
            display_order: nextOrder,
          });

        if (insertError) throw insertError;

        nextOrder++;
        nextPageNumber++;
      }

      queryClient.invalidateQueries({ queryKey: ["open-access-pages"] });
      toast.success(`${files.length} page(s) uploaded successfully`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload pages");
    } finally {
      setUploadingIssueId(null);
    }
  };

  const getIssuePages = (issueId: string) => {
    return allPages.filter(p => p.issue_id === issueId).sort((a, b) => a.display_order - b.display_order);
  };

  const formatMonth = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "MMMM yyyy");
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Open Access Issues</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Issue
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Issue</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Month</Label>
                <Input
                  type="month"
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Canva Draft Link (optional)</Label>
                <Input
                  placeholder="https://www.canva.com/..."
                  value={formData.canva_draft_link}
                  onChange={(e) => setFormData({ ...formData, canva_draft_link: e.target.value })}
                />
              </div>
              <Button onClick={handleSubmit} className="w-full" disabled={createMutation.isPending}>
                Create Issue
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : issues.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No issues created yet</p>
          ) : (
            <div className="space-y-4">
              {issues.map((issue) => {
                const pages = getIssuePages(issue.id);
                const isExpanded = expandedIssue === issue.id;

                return (
                  <div key={issue.id} className="border border-border rounded-lg overflow-hidden">
                    <div className="p-4 bg-muted/30 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setExpandedIssue(isExpanded ? null : issue.id)}
                          className="flex items-center gap-2 hover:text-primary transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          <span className="font-semibold text-lg">{formatMonth(issue.month)}</span>
                        </button>
                        <Badge variant={issue.published ? "default" : "secondary"}>
                          {issue.published ? "Published" : "Draft"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {pages.length} page{pages.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        {issue.canva_draft_link && (
                          <a
                            href={issue.canva_draft_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Canva Draft
                          </a>
                        )}
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={issue.published}
                            onCheckedChange={(checked) => 
                              updateMutation.mutate({ id: issue.id, updates: { published: checked } })
                            }
                          />
                          <Label className="text-sm">Published</Label>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(issue.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 space-y-4">
                        <div className="flex items-center gap-4">
                          <Input
                            placeholder="Update Canva link..."
                            defaultValue={issue.canva_draft_link || ""}
                            onBlur={(e) => {
                              if (e.target.value !== (issue.canva_draft_link || "")) {
                                updateMutation.mutate({ 
                                  id: issue.id, 
                                  updates: { canva_draft_link: e.target.value || null } 
                                });
                              }
                            }}
                            className="flex-1"
                          />
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  handleFileUpload(issue.id, e.target.files);
                                }
                              }}
                            />
                            <Button asChild disabled={uploadingIssueId === issue.id}>
                              <span>
                                <Upload className="h-4 w-4 mr-2" />
                                {uploadingIssueId === issue.id ? "Uploading..." : "Upload Pages"}
                              </span>
                            </Button>
                          </label>
                        </div>

                        {pages.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {pages.map((page) => (
                              <div key={page.id} className="relative group">
                                <img
                                  src={page.image_url}
                                  alt={`Page ${page.page_number}`}
                                  className="w-full aspect-[3/4] object-cover rounded-lg border border-border"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => deletePageMutation.mutate(page.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                <span className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                  Page {page.page_number}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                            <p className="text-muted-foreground">No pages uploaded yet</p>
                            <p className="text-sm text-muted-foreground">Click "Upload Pages" to add pages to this issue</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
