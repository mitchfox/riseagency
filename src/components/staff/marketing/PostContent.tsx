import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Archive, Copy, Image, ExternalLink, Calendar, Download, ChevronDown, Send, Check, CheckCircle, FileText, Instagram } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { format } from "date-fns";

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

// Canva icon component
const CanvaIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="10" />
  </svg>
);

// Helper to get the best available image URL
const getImageUrl = (post: BlogPost | null): string | null => {
  if (!post) return null;
  return post.image_url_internal || post.image_url || null;
};

export const PostContent = () => {
  const queryClient = useQueryClient();
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [readyToPostOpen, setReadyToPostOpen] = useState(true);
  const [postedOpen, setPostedOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Posts ready to post
  const { data: readyToPostPosts = [], isLoading: isLoadingReady } = useQuery({
    queryKey: ["ready-to-post-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("workflow_status", "ready_to_post")
        .order("scheduled_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as BlogPost[];
    },
  });

  // Posted posts
  const { data: postedPosts = [], isLoading: isLoadingPosted } = useQuery({
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
      queryClient.invalidateQueries({ queryKey: ["ready-to-post-posts"] });
      queryClient.invalidateQueries({ queryKey: ["posted-content"] });
      toast.success("Marked as posted");
    },
    onError: () => toast.error("Failed to mark as posted"),
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, date }: { id: string; date: string }) => {
      const { error } = await supabase
        .from("blog_posts")
        .update({ scheduled_date: date })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ready-to-post-posts"] });
      toast.success("Schedule updated");
    },
    onError: () => toast.error("Failed to update schedule"),
  });

  const createBTLArticleMutation = useMutation({
    mutationFn: async (post: BlogPost) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("Not authenticated");

      const { error } = await supabase.from("blog_posts").insert({
        title: `BTL: ${post.title}`,
        content: post.content,
        excerpt: post.excerpt,
        category: "Between the Lines",
        author_id: userData.user.id,
        published: true,
        workflow_status: "btl_article",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Added to Between the Lines articles");
    },
    onError: () => toast.error("Failed to create BTL article"),
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

  // Get dates that have scheduled posts for calendar highlighting
  const scheduledDates = readyToPostPosts
    .filter(p => p.scheduled_date)
    .map(p => new Date(p.scheduled_date!));

  const isLoading = isLoadingReady || isLoadingPosted;

  if (isLoading) {
    return <LoadingSpinner size="md" className="py-12" />;
  }

  return (
    <div className="space-y-6">
      {/* Instagram Schedule Calendar */}
      <Card className="border-pink-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Instagram className="w-5 h-5 text-pink-500" />
            Instagram Schedule
          </CardTitle>
          <CardDescription>
            Plan and schedule your Instagram posts
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Calendar */}
            <div className="flex justify-center overflow-x-auto">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{
                  scheduled: scheduledDates,
                }}
                modifiersStyles={{
                  scheduled: { 
                    background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)", 
                    color: "white", 
                    borderRadius: "50%",
                    fontWeight: "bold"
                  },
                }}
                className="rounded-md border p-2 sm:p-3"
              />
            </div>
            
            {/* Selected Date Details */}
            <div className="space-y-4">
              <div className="p-3 sm:p-4 rounded-lg bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-pink-500" />
                  <h4 className="font-medium text-xs sm:text-sm">
                    {selectedDate ? format(selectedDate, "EEE, MMM d, yyyy") : "Select a date"}
                  </h4>
                </div>
                {selectedDate ? (
                  <div className="space-y-2">
                    {readyToPostPosts
                      .filter(p => p.scheduled_date && new Date(p.scheduled_date).toDateString() === selectedDate.toDateString())
                      .map(p => (
                        <div key={p.id} className="flex items-center gap-2 p-2 bg-background/50 rounded-md">
                          {p.image_url_internal && (
                            <div className="w-8 h-8 rounded overflow-hidden border flex-shrink-0">
                              <img src={p.image_url_internal} alt="" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <span className="text-xs sm:text-sm truncate flex-1">{p.title}</span>
                        </div>
                      ))}
                    {readyToPostPosts.filter(p => p.scheduled_date && new Date(p.scheduled_date).toDateString() === selectedDate.toDateString()).length === 0 && (
                      <p className="text-xs sm:text-sm text-muted-foreground">No posts scheduled for this date</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-muted-foreground">Click a date to see scheduled posts</p>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="p-2 sm:p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-center">
                  <p className="text-xl sm:text-2xl font-bold text-orange-500">{readyToPostPosts.length}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Ready to Post</p>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                  <p className="text-xl sm:text-2xl font-bold text-green-500">{postedPosts.length}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Posted</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ready to Post */}
      <Collapsible open={readyToPostOpen} onOpenChange={setReadyToPostOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Send className="w-5 h-5 text-orange-500" />
                  Ready to Post ({readyToPostPosts.length})
                </CardTitle>
                <ChevronDown className={`w-5 h-5 transition-transform ${readyToPostOpen ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {readyToPostPosts.length === 0 ? (
                <p className="text-muted-foreground text-center py-6 text-sm">
                  No posts ready. Move posts from Image Creator.
                </p>
              ) : (
                <div className="space-y-3">
                  {readyToPostPosts.map((post) => (
                    <Card key={post.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-col gap-3">
                          {/* Post info row */}
                          <div className="flex items-center gap-3">
                            {post.image_url_internal && (
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden border flex-shrink-0">
                                <img src={post.image_url_internal} alt="" className="w-full h-full object-cover" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <h4 className="font-medium text-sm truncate">{post.title}</h4>
                              {post.category && (
                                <span className="text-xs text-muted-foreground">{post.category}</span>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                {post.scheduled_date ? (
                                  <span className="flex items-center gap-1 text-xs text-pink-500">
                                    <Calendar className="w-3 h-3" /> {format(new Date(post.scheduled_date), "MMM d")}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Not scheduled</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {/* Actions row - stacked on mobile */}
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            {post.canva_link && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-full sm:w-auto"
                                asChild
                              >
                                <a href={post.canva_link} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="w-3 h-3 mr-1 text-purple-500" />
                                  Canva
                                </a>
                              </Button>
                            )}
                            <Input
                              type="date"
                              value={post.scheduled_date || ""}
                              onChange={(e) => updateScheduleMutation.mutate({ id: post.id, date: e.target.value })}
                              className="h-9 w-full sm:w-40 text-xs px-3"
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => createBTLArticleMutation.mutate(post)}
                                disabled={createBTLArticleMutation.isPending}
                                className="h-8 flex-1 sm:flex-initial"
                                title="Add to Between the Lines"
                              >
                                <FileText className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                className="h-8 flex-1 sm:flex-initial bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                                onClick={() => markPostedMutation.mutate(post.id)}
                                disabled={markPostedMutation.isPending}
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Posted
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Posted Archive */}
      <Collapsible open={postedOpen} onOpenChange={setPostedOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Posted ({postedPosts.length})
                </CardTitle>
                <ChevronDown className={`w-5 h-5 transition-transform ${postedOpen ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {postedPosts.length === 0 ? (
                <p className="text-muted-foreground text-center py-6 text-sm">
                  No posted content yet.
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {postedPosts.map((post) => (
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
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Post Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPost?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {getImageUrl(selectedPost) && (
              <div className="space-y-2">
                <div className="rounded-lg overflow-hidden border">
                  <img
                    src={getImageUrl(selectedPost)!}
                    alt={selectedPost?.title}
                    className="w-full max-h-64 object-contain bg-muted"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadImage(getImageUrl(selectedPost)!, selectedPost?.title || 'image')}
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
