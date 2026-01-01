import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Image, ExternalLink, Calendar, Check, Link2, Upload, ChevronDown, ArrowRight, FileText, Folder, HardDrive, Table, Send, CheckCircle, Download, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { format } from "date-fns";

interface GalleryItem {
  id: string;
  title: string;
  file_url: string;
  thumbnail_url: string | null;
  category: string;
  file_type: string;
  created_at: string;
}

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
  posted_at: string | null;
  created_at: string;
}

const RESOURCE_LINKS = [
  {
    title: "Canva Design",
    icon: Image,
    url: "https://www.canva.com/design/DAG0N9vOwtg/6ZmTuSDkJzR9_b0nl7czJA/edit?utm_content=DAG0N9vOwtg&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton",
    color: "text-purple-500"
  },
  {
    title: "Canva Folder",
    icon: Folder,
    url: "https://www.canva.com/folder/FAFRi-Qvnf4",
    color: "text-pink-500"
  },
  {
    title: "Topic Schedule",
    icon: Table,
    url: "https://docs.google.com/spreadsheets/d/1UtMiSeVkxDCP0b6DJmuB72dKHTUHAfyInUB_Ts2iRcc/edit?usp=sharing",
    color: "text-orange-500"
  },
  {
    title: "Google Drive",
    icon: HardDrive,
    url: "https://drive.google.com/drive/folders/1fCfrG6bY8YuEjm7bVMaxIGEoXOyCBLMj?usp=sharing",
    color: "text-indigo-500"
  }
];

export const ImageCreator = () => {
  const queryClient = useQueryClient();
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [readyToPostOpen, setReadyToPostOpen] = useState(true);
  const [postedOpen, setPostedOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [form, setForm] = useState({
    canva_link: "",
    image_url: "",
    scheduled_date: "",
  });

  // Posts ready for image (Image Creator section)
  const { data: imageCreatorPosts = [], isLoading: isLoadingImageCreator } = useQuery({
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

  // Posts ready to post (Post Schedule section - ready_to_post)
  const { data: readyToPostPosts = [], isLoading: isLoadingReadyToPost } = useQuery({
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
        .order("posted_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as BlogPost[];
    },
  });

  // Marketing Gallery images
  const { data: galleryItems = [], isLoading: isLoadingGallery } = useQuery({
    queryKey: ["marketing-gallery-images"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_gallery")
        .select("*")
        .eq("file_type", "image")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as GalleryItem[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BlogPost> }) => {
      const { error } = await supabase.from("blog_posts").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["image-creator-posts"] });
      queryClient.invalidateQueries({ queryKey: ["ready-to-post-posts"] });
      toast.success("Post updated");
      setDialogOpen(false);
      setSelectedPost(null);
    },
    onError: () => toast.error("Failed to update"),
  });

  const moveToReadyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("blog_posts")
        .update({ workflow_status: "ready_to_post" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["image-creator-posts"] });
      queryClient.invalidateQueries({ queryKey: ["ready-to-post-posts"] });
      toast.success("Moved to Post Schedule");
    },
    onError: () => toast.error("Failed to move"),
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
      // Create a new BTL article from this post
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

  // Get dates that have scheduled posts for calendar highlighting
  const scheduledDates = readyToPostPosts
    .filter(p => p.scheduled_date)
    .map(p => new Date(p.scheduled_date!));

  const isLoading = isLoadingImageCreator || isLoadingReadyToPost || isLoadingPosted || isLoadingGallery;

  if (isLoading) {
    return <LoadingSpinner size="md" className="py-12" />;
  }

  return (
    <div className="space-y-6">
      {/* Resource Links */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Quick Links
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {RESOURCE_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.title}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="h-8 gap-1.5">
                    <Icon className={`w-3.5 h-3.5 ${link.color}`} />
                    {link.title}
                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </a>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Marketing Gallery */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-green-500" />
            Marketing Gallery
          </CardTitle>
          <CardDescription className="text-xs">
            Quick download images for posts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {galleryItems.length === 0 ? (
            <p className="text-muted-foreground text-center py-4 text-xs">
              No images in gallery
            </p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {galleryItems.slice(0, 16).map((item) => (
                <div key={item.id} className="relative group">
                  <div className="aspect-square rounded overflow-hidden border">
                    <img 
                      src={item.thumbnail_url || item.file_url} 
                      alt={item.title} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => downloadImage(item.file_url, item.title)}
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5 text-purple-500" />
            Image Creator
          </CardTitle>
          <CardDescription>
            Create the Canva image and add here then move to ready.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {imageCreatorPosts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 text-sm">
              No posts ready for images. Submit drafts from BTL Writer.
            </p>
          ) : (
            <div className="space-y-4">
              {imageCreatorPosts.map((post) => (
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
                          {post.image_url_internal ? (
                            <span className="flex items-center gap-1 text-green-500">
                              <CheckCircle className="w-3 h-3" /> Added
                            </span>
                          ) : null}
                          {post.scheduled_date && (
                            <span className="flex items-center gap-1 text-blue-500">
                              <Calendar className="w-3 h-3" /> {new Date(post.scheduled_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {/* Small image preview if exists */}
                        {post.image_url_internal && (
                          <div className="mt-2 w-16 h-10 rounded overflow-hidden border">
                            <img src={post.image_url_internal} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button size="sm" variant="outline" onClick={() => openDialog(post)} className="h-8">
                          <Upload className="w-3 h-3 mr-1" />
                          Add Post Image
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => moveToReadyMutation.mutate(post.id)}
                          disabled={moveToReadyMutation.isPending}
                          className="h-8"
                        >
                          <ArrowRight className="w-3 h-3 mr-1" />
                          Move to Ready
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

      {/* Post Schedule Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Post Schedule
          </CardTitle>
          <CardDescription>
            Schedule posts and mark as posted when done.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Calendar View */}
          <div className="border rounded-lg p-4">
            <h4 className="text-sm font-medium mb-3">Schedule Calendar</h4>
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={{
                scheduled: scheduledDates,
              }}
              modifiersStyles={{
                scheduled: { backgroundColor: "hsl(var(--primary))", color: "white", borderRadius: "50%" },
              }}
              className="rounded-md border"
            />
            {selectedDate && (
              <div className="mt-3">
                <h5 className="text-xs font-medium text-muted-foreground mb-2">
                  Posts on {format(selectedDate, "PPP")}:
                </h5>
                <div className="space-y-1">
                  {readyToPostPosts
                    .filter(p => p.scheduled_date && new Date(p.scheduled_date).toDateString() === selectedDate.toDateString())
                    .map(p => (
                      <p key={p.id} className="text-xs">{p.title}</p>
                    ))}
                  {readyToPostPosts.filter(p => p.scheduled_date && new Date(p.scheduled_date).toDateString() === selectedDate.toDateString()).length === 0 && (
                    <p className="text-xs text-muted-foreground">No posts scheduled</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Ready to Post Collapsible */}
          <Collapsible open={readyToPostOpen} onOpenChange={setReadyToPostOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between h-10">
                <span className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-orange-500" />
                  Ready to Post ({readyToPostPosts.length})
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${readyToPostOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              {readyToPostPosts.length === 0 ? (
                <p className="text-muted-foreground text-center py-4 text-sm">
                  No posts ready. Move posts from Image Creator.
                </p>
              ) : (
                <div className="space-y-3">
                  {readyToPostPosts.map((post) => (
                    <Card key={post.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {post.image_url_internal && (
                                <div className="w-10 h-10 rounded overflow-hidden border flex-shrink-0">
                                  <img src={post.image_url_internal} alt="Preview" className="w-full h-full object-cover" />
                                </div>
                              )}
                              <div>
                                <h4 className="font-medium text-sm">{post.title}</h4>
                                {post.category && (
                                  <span className="text-xs text-muted-foreground">{post.category}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-xs">
                              {post.scheduled_date ? (
                                <span className="flex items-center gap-1 text-blue-500">
                                  <Calendar className="w-3 h-3" /> {format(new Date(post.scheduled_date), "PPP")}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">Not scheduled</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Input
                              type="date"
                              value={post.scheduled_date || ""}
                              onChange={(e) => updateScheduleMutation.mutate({ id: post.id, date: e.target.value })}
                              className="h-8 w-36 text-xs"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => createBTLArticleMutation.mutate(post)}
                              disabled={createBTLArticleMutation.isPending}
                              className="h-8"
                              title="Add to Between the Lines"
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              BTL
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
            </CollapsibleContent>
          </Collapsible>

          {/* Posted Collapsible */}
          <Collapsible open={postedOpen} onOpenChange={setPostedOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between h-10">
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Posted ({postedPosts.length})
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${postedOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              {postedPosts.length === 0 ? (
                <p className="text-muted-foreground text-center py-4 text-sm">
                  No posted content yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {postedPosts.map((post) => (
                    <div key={post.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      {post.image_url_internal && (
                        <div className="w-8 h-8 rounded overflow-hidden border flex-shrink-0">
                          <img src={post.image_url_internal} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{post.title}</h4>
                        <span className="text-xs text-muted-foreground">
                          Posted {post.posted_at ? format(new Date(post.posted_at), "PPP") : "Unknown"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Add Image Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-full max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Post Image & Details</DialogTitle>
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
