import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Archive, Copy, Image, ExternalLink, Calendar, Download, ChevronDown, Send, Check, CheckCircle, FileText, Instagram, User } from "lucide-react";
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
  completed_by: string | null;
  image_due_date: string | null;
}

interface StaffMember {
  id: string;
  full_name: string | null;
  email: string | null;
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
  const [confirmingPostId, setConfirmingPostId] = useState<string | null>(null);
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);

  // Fetch staff members for displaying completed_by names
  const { data: staffMembers = [] } = useQuery({
    queryKey: ["staff-members-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email");
      if (error) throw error;
      return data as StaffMember[];
    },
  });

  // Get display name for staff (first name only)
  const getStaffDisplayName = (id: string | null) => {
    if (!id) return null;
    const staff = staffMembers.find(s => s.id === id);
    if (!staff) return null;
    
    const fullName = staff.full_name || staff.email?.split('@')[0] || "Unknown";
    const firstName = fullName.split(' ')[0];
    const lastName = fullName.split(' ').slice(1).join(' ');
    
    // Check if there are duplicates with same first name
    const duplicates = staffMembers.filter(s => {
      const name = s.full_name || s.email?.split('@')[0] || "";
      return name.split(' ')[0] === firstName;
    });
    
    if (duplicates.length > 1 && lastName) {
      return `${firstName} ${lastName[0]}.`;
    }
    return firstName;
  };

  // Helper to clean content from draft markers
  const getCleanContent = (content: string) => {
    return content
      .replace(/\*\*Intro\*\*\n?/g, '')
      .replace(/\*\*Main\*\*\n?/g, '')
      .replace(/\*\*Secondary\*\*\n?/g, '')
      .replace(/\*\*Conclusion\*\*\n?/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  // Copy article text to clipboard
  const copyArticleText = (post: BlogPost) => {
    const cleanContent = getCleanContent(post.content);
    navigator.clipboard.writeText(cleanContent);
    toast.success("Article text copied");
  };

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

      // Valid BTL categories - use original category if valid, otherwise default to TECHNICAL
      const validBTLCategories = [
        "TECHNICAL", "NUTRITION", "PSYCHOLOGY", "TACTICAL",
        "STRENGTH, POWER & SPEED", "RECOVERY", "COACHING", "AGENTS"
      ];
      const btlCategory = post.category && validBTLCategories.includes(post.category) 
        ? post.category 
        : "TECHNICAL";

      // Use clean content (without draft markers) for the BTL article
      const cleanContent = getCleanContent(post.content);

      const { error } = await supabase.from("blog_posts").insert({
        title: post.title,
        content: cleanContent,
        excerpt: post.excerpt,
        category: btlCategory,
        author_id: userData.user.id,
        published: true,
        workflow_status: "published",
        image_url: post.image_url_internal || null,
        image_url_internal: post.image_url_internal || null,
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
                          <div className="flex items-start gap-3">
                            {/* Larger image preview with download */}
                            {post.image_url_internal && (
                              <div className="relative group flex-shrink-0">
                                <a 
                                  href={post.image_url_internal} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="block w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border hover:ring-2 hover:ring-primary"
                                >
                                  <img src={post.image_url_internal} alt="" className="w-full h-full object-cover" />
                                </a>
                                <Button
                                  size="icon"
                                  variant="secondary"
                                  className="absolute bottom-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadImage(post.image_url_internal!, post.title);
                                  }}
                                >
                                  <Download className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <h4 className="font-medium text-sm">{post.title}</h4>
                              {post.category && (
                                <span className="text-xs text-muted-foreground">{post.category}</span>
                              )}
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                {post.scheduled_date ? (
                                  <span className="flex items-center gap-1 text-xs text-pink-500">
                                    <Calendar className="w-3 h-3" /> {format(new Date(post.scheduled_date), "MMM d")}
                                  </span>
                                ) : post.image_due_date ? (
                                  <span className="flex items-center gap-1 text-xs text-orange-500">
                                    <Calendar className="w-3 h-3" /> Due: {format(new Date(post.image_due_date), "MMM d")}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Not scheduled</span>
                                )}
                                {post.completed_by && getStaffDisplayName(post.completed_by) && (
                                  <span className="flex items-center gap-1 text-xs text-green-600">
                                    <User className="w-3 h-3" /> {getStaffDisplayName(post.completed_by)}
                                  </span>
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
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyArticleText(post)}
                              className="h-8 w-full sm:w-auto"
                              title="Copy article text"
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Copy Text
                            </Button>
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
                              {confirmingPostId === post.id ? (
                                <Button
                                  size="sm"
                                  className="h-8 flex-1 sm:flex-initial bg-green-600 hover:bg-green-700"
                                  onClick={() => {
                                    markPostedMutation.mutate(post.id);
                                    setConfirmingPostId(null);
                                  }}
                                  disabled={markPostedMutation.isPending}
                                >
                                  <Check className="w-3 h-3 mr-1" />
                                  Yes
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 flex-1 sm:flex-initial border-pink-500/50 hover:bg-pink-500/10"
                                  onClick={() => setConfirmingPostId(post.id)}
                                >
                                  Posted?
                                </Button>
                              )}
                            </div>
                          </div>
                          {/* Article Preview Toggle */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setExpandedArticleId(expandedArticleId === post.id ? null : post.id)}
                            className="h-7 text-xs w-full sm:w-auto"
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            {expandedArticleId === post.id ? "Hide Article" : "View Article"}
                          </Button>
                          {expandedArticleId === post.id && (
                            <div className="bg-muted/50 p-3 rounded-lg text-sm whitespace-pre-wrap max-h-48 overflow-y-auto border">
                              {getCleanContent(post.content)}
                            </div>
                          )}
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
