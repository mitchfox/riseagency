import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Image, ExternalLink, Calendar, Check, Link2, Upload } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface BlogPost {
  id: string;
  title: string;
  excerpt: string | null;
  content: string;
  category: string | null;
  workflow_status: string;
  image_url_internal: string | null;
  canva_link: string | null;
  scheduled_date: string | null;
  created_at: string;
}

export const ImageCreator = () => {
  const queryClient = useQueryClient();
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    canva_link: "",
    image_url: "",
    scheduled_date: "",
  });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["image-creator-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("workflow_status", "ready_for_image")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BlogPost[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BlogPost> }) => {
      const { error } = await supabase.from("blog_posts").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["image-creator-posts"] });
      toast.success("Post updated");
      setDialogOpen(false);
      setSelectedPost(null);
    },
    onError: () => toast.error("Failed to update"),
  });

  const markPostedMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("blog_posts")
        .update({
          workflow_status: "posted",
          posted_at: new Date().toISOString(),
          published: true,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["image-creator-posts"] });
      queryClient.invalidateQueries({ queryKey: ["posted-content"] });
      toast.success("Marked as posted");
    },
    onError: () => toast.error("Failed to mark as posted"),
  });

  const openDialog = (post: BlogPost) => {
    setSelectedPost(post);
    setForm({
      canva_link: post.canva_link || "",
      image_url: post.image_url_internal || "",
      scheduled_date: post.scheduled_date || "",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!selectedPost) return;
    updateMutation.mutate({
      id: selectedPost.id,
      data: {
        canva_link: form.canva_link || null,
        image_url_internal: form.image_url || null,
        scheduled_date: form.scheduled_date || null,
      },
    });
  };

  if (isLoading) {
    return <LoadingSpinner size="md" className="py-12" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5 text-purple-500" />
            Image Creator
          </CardTitle>
          <CardDescription>
            Add images, Canva links, schedule posts, or mark as posted
          </CardDescription>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 text-sm">
              No posts ready for images. Submit drafts from BTL Writer.
            </p>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <Card key={post.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{post.title}</h4>
                        {post.category && (
                          <span className="text-xs text-muted-foreground">{post.category}</span>
                        )}
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {post.excerpt || post.content.substring(0, 100)}...
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          {post.canva_link && (
                            <span className="flex items-center gap-1 text-purple-500">
                              <Link2 className="w-3 h-3" /> Canva
                            </span>
                          )}
                          {post.image_url_internal && (
                            <span className="flex items-center gap-1 text-green-500">
                              <Image className="w-3 h-3" /> Image
                            </span>
                          )}
                          {post.scheduled_date && (
                            <span className="flex items-center gap-1 text-blue-500">
                              <Calendar className="w-3 h-3" /> {new Date(post.scheduled_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button size="sm" variant="outline" onClick={() => openDialog(post)} className="h-8">
                          <Upload className="w-3 h-3 mr-1" />
                          Add Image
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => markPostedMutation.mutate(post.id)}
                          disabled={markPostedMutation.isPending}
                          className="h-8"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Posted
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-full max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Image & Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <h4 className="font-medium text-sm mb-2">{selectedPost?.title}</h4>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {selectedPost?.excerpt || selectedPost?.content.substring(0, 150)}...
              </p>
            </div>

            <div className="space-y-2">
              <Label>Canva Link</Label>
              <div className="flex gap-2">
                <Input
                  value={form.canva_link}
                  onChange={(e) => setForm({ ...form, canva_link: e.target.value })}
                  placeholder="https://www.canva.com/design/..."
                />
                {form.canva_link && (
                  <Button size="icon" variant="outline" asChild>
                    <a href={form.canva_link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://... or paste image URL"
              />
              {form.image_url && (
                <div className="mt-2 rounded-md overflow-hidden border">
                  <img src={form.image_url} alt="Preview" className="w-full h-32 object-cover" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Scheduled Post Date</Label>
              <Input
                type="date"
                value={form.scheduled_date}
                onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};