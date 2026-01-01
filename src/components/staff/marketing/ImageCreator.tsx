import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Image, ExternalLink, Calendar, Link2, Upload, ArrowRight, Folder, HardDrive, Table, CheckCircle, Download, ImageIcon, User } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface GalleryItem {
  id: string;
  title: string;
  file_url: string;
  thumbnail_url: string | null;
  category: string;
  file_type: string;
  player_id: string | null;
  created_at: string;
}

interface StaffMember {
  id: string;
  full_name: string | null;
  email: string | null;
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
  assigned_to: string | null;
  image_due_date: string | null;
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [form, setForm] = useState({
    canva_link: "",
    image_url: "",
    scheduled_date: "",
    assigned_to: "",
    image_due_date: "",
  });

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, []);

  // Fetch staff members
  const { data: staffMembers = [] } = useQuery({
    queryKey: ["staff-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");
      if (error) throw error;
      return data as StaffMember[];
    },
  });

  // Posts ready for image
  const { data: imageCreatorPosts = [], isLoading: isLoadingImageCreator } = useQuery({
    queryKey: ["image-creator-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("workflow_status", "ready_for_image")
        .order("image_due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as BlogPost[];
    },
  });

  // Marketing Gallery images - only from represented players
  const { data: galleryItems = [], isLoading: isLoadingGallery } = useQuery({
    queryKey: ["marketing-gallery-represented"],
    queryFn: async () => {
      // First get represented player IDs
      const { data: players, error: playersError } = await supabase
        .from("players")
        .select("id")
        .eq("representation_status", "represented");
      
      if (playersError) throw playersError;
      
      const playerIds = players?.map(p => p.id) || [];
      
      if (playerIds.length === 0) {
        return [] as GalleryItem[];
      }

      // Then get gallery items for those players
      const { data, error } = await supabase
        .from("marketing_gallery")
        .select("*")
        .eq("file_type", "image")
        .in("player_id", playerIds)
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
      console.log("Moving post to ready:", id);
      const { data, error } = await supabase
        .from("blog_posts")
        .update({ workflow_status: "ready_to_post" })
        .eq("id", id)
        .select();
      if (error) {
        console.error("Move to ready error:", error);
        throw error;
      }
      console.log("Move to ready result:", data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["image-creator-posts"] });
      queryClient.invalidateQueries({ queryKey: ["ready-to-post-posts"] });
      toast.success("Moved to Post Schedule");
    },
    onError: (error) => {
      console.error("Move mutation error:", error);
      toast.error("Failed to move");
    },
  });

  const openDialog = (post: BlogPost) => {
    setSelectedPost(post);
    setForm({
      canva_link: post.canva_link || "",
      image_url: post.image_url_internal || "",
      scheduled_date: post.scheduled_date || "",
      assigned_to: post.assigned_to || currentUserId || "",
      image_due_date: post.image_due_date || "",
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
        assigned_to: form.assigned_to || null,
        image_due_date: form.image_due_date || null,
      },
    });
  };

  const assignToSelf = (postId: string, dueDate: string) => {
    updateMutation.mutate({
      id: postId,
      data: {
        assigned_to: currentUserId,
        image_due_date: dueDate || null,
      },
    });
  };

  const getStaffName = (id: string | null) => {
    if (!id) return null;
    const staff = staffMembers.find(s => s.id === id);
    return staff?.full_name || staff?.email?.split('@')[0] || 'Unknown';
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

  const isLoading = isLoadingImageCreator || isLoadingGallery;

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

      {/* Marketing Gallery - Represented Players Only */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-green-500" />
            Player Gallery
          </CardTitle>
          <CardDescription className="text-xs">
            Quick download images from represented players
          </CardDescription>
        </CardHeader>
        <CardContent>
          {galleryItems.length === 0 ? (
            <p className="text-muted-foreground text-center py-4 text-xs">
              No images from represented players
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

      {/* Image Creator Section */}
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
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{post.title}</h4>
                        {post.category && (
                          <span className="text-xs text-muted-foreground">{post.category}</span>
                        )}
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {post.excerpt || post.content.substring(0, 100)}...
                        </p>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs">
                          {post.assigned_to && (
                            <span className="flex items-center gap-1 text-blue-500">
                              <User className="w-3 h-3" /> {getStaffName(post.assigned_to)}
                            </span>
                          )}
                          {post.image_due_date && (
                            <span className="flex items-center gap-1 text-orange-500">
                              <Calendar className="w-3 h-3" /> {new Date(post.image_due_date).toLocaleDateString()}
                            </span>
                          )}
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
                        </div>
                        {post.image_url_internal && (
                          <div className="mt-2 w-16 h-10 rounded overflow-hidden border">
                            <img src={post.image_url_internal} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-shrink-0">
                        {/* Quick assign staff and due date - stacked on mobile */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <Select
                            value={post.assigned_to || ""}
                            onValueChange={(value) => {
                              updateMutation.mutate({
                                id: post.id,
                                data: { assigned_to: value || null },
                              });
                            }}
                          >
                            <SelectTrigger className="h-8 w-full sm:w-28 text-xs">
                              <SelectValue placeholder="Assign..." />
                            </SelectTrigger>
                            <SelectContent className="bg-background border z-50">
                              {staffMembers.map((staff) => (
                                <SelectItem key={staff.id} value={staff.id}>
                                  {staff.full_name || staff.email?.split('@')[0]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="date"
                            className="h-8 w-full sm:w-32 text-xs"
                            value={post.image_due_date || ""}
                            onChange={(e) => {
                              updateMutation.mutate({
                                id: post.id,
                                data: { image_due_date: e.target.value || null },
                              });
                            }}
                          />
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => openDialog(post)} className="h-8 w-full sm:w-auto text-xs">
                            <Upload className="w-3 h-3 mr-1" />
                            Add Image & Canva
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => moveToReadyMutation.mutate(post.id)}
                            disabled={moveToReadyMutation.isPending || !post.image_url_internal || !post.canva_link}
                            className="h-8 w-full sm:w-auto text-xs"
                            title={!post.image_url_internal || !post.canva_link ? "Add image and Canva link first" : ""}
                          >
                            <ArrowRight className="w-3 h-3 mr-1" />
                            Move to Ready
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
      </Card>

      {/* Add Image Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-full max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Image & Canva Link</DialogTitle>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assigned To</Label>
                <Select
                  value={form.assigned_to}
                  onValueChange={(value) => setForm({ ...form, assigned_to: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffMembers.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.full_name || staff.email?.split('@')[0]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Image Due Date</Label>
                <Input
                  type="date"
                  value={form.image_due_date}
                  onChange={(e) => setForm({ ...form, image_due_date: e.target.value })}
                />
              </div>
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
