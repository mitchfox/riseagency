import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Archive, Copy, Image, ExternalLink, Calendar, Download } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface BlogPost {
  id: string;
  title: string;
  excerpt: string | null;
  content: string;
  category: string | null;
  workflow_status: string;
  image_url: string | null;
  image_url_internal: string | null;
  canva_link: string | null;
  scheduled_date: string | null;
  posted_at: string | null;
  created_at: string;
}

// Helper to get the best available image URL
const getImageUrl = (post: BlogPost | null): string | null => {
  if (!post) return null;
  return post.image_url_internal || post.image_url || null;
};

export const PostContent = () => {
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["posted-content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("workflow_status", "posted")
        .neq("category", "PLAYER NEWS")
        .order("posted_at", { ascending: false });
      if (error) throw error;
      return data as BlogPost[];
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const downloadImage = async (url: string, title: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Image downloaded");
    } catch {
      toast.error("Failed to download image");
    }
  };

  const openDetails = (post: BlogPost) => {
    setSelectedPost(post);
    setDialogOpen(true);
  };

  if (isLoading) {
    return <LoadingSpinner size="md" className="py-12" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-green-500" />
            Post Content
          </CardTitle>
          <CardDescription>
            Archive of posted content. Copy text or download images.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 text-sm">
              No posted content yet. Mark posts as posted in Image Creator.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {posts.map((post) => (
                <Card
                  key={post.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => openDetails(post)}
                >
                  {getImageUrl(post) && (
                    <div className="h-32 overflow-hidden rounded-t-lg">
                      <img
                        src={getImageUrl(post)!}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardContent className={`p-4 ${!getImageUrl(post) ? "pt-4" : ""}`}>
                    <h4 className="font-medium text-sm line-clamp-2">{post.title}</h4>
                    {post.category && (
                      <span className="text-xs text-muted-foreground">{post.category}</span>
                    )}
                    {post.posted_at && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Posted {new Date(post.posted_at).toLocaleDateString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPost?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {getImageUrl(selectedPost!) && (
              <div className="space-y-2">
                <div className="rounded-lg overflow-hidden border">
                  <img
                    src={getImageUrl(selectedPost!)!}
                    alt={selectedPost?.title}
                    className="w-full max-h-64 object-contain bg-muted"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadImage(getImageUrl(selectedPost!)!, selectedPost?.title || 'image')}
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Image
                </Button>
              </div>
            )}

            {selectedPost?.canva_link && (
              <Button size="sm" variant="outline" asChild className="w-full">
                <a href={selectedPost.canva_link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in Canva
                </a>
              </Button>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Content</h4>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(selectedPost?.content || "")}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
              </div>
              <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
                {selectedPost?.content}
              </div>
            </div>

            {selectedPost?.excerpt && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Excerpt</h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(selectedPost?.excerpt || "")}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="bg-muted p-3 rounded-lg text-sm">
                  {selectedPost?.excerpt}
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground space-y-1">
              {selectedPost?.category && <p>Category: {selectedPost.category}</p>}
              {selectedPost?.posted_at && (
                <p>Posted: {new Date(selectedPost.posted_at).toLocaleString()}</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};