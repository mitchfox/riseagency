import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Image, ExternalLink, Calendar, Link2, Upload, ArrowRight, Folder, HardDrive, Table, CheckCircle, Download, ImageIcon, User, FileText, Copy } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  completed_by: string | null;
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
  const [viewArticleDialogOpen, setViewArticleDialogOpen] = useState(false);
  const [viewArticlePost, setViewArticlePost] = useState<BlogPost | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [form, setForm] = useState({
    canva_link: "",
    image_url: "",
  });
  const [uploading, setUploading] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);

  // Get current user and check if admin
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setCurrentUserId(data.user.id);
        // Check if user is admin
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .eq("role", "admin")
          .maybeSingle();
        setIsAdmin(!!roleData);
      }
    });
  }, []);

  // Fetch staff members (only users with staff/admin/marketeer roles)
  const { data: staffMembers = [] } = useQuery({
    queryKey: ["staff-members-with-roles"],
    queryFn: async () => {
      // Get user IDs with staff roles
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["staff", "admin", "marketeer"]);
      if (roleError) throw roleError;
      
      const staffUserIds = [...new Set(roleData?.map(r => r.user_id) || [])];
      if (staffUserIds.length === 0) return [];

      // Get profiles for those users
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", staffUserIds)
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
    mutationFn: async (post: BlogPost) => {
      console.log("Moving post to ready:", post.id);
      const { data, error } = await supabase
        .from("blog_posts")
        .update({ 
          workflow_status: "ready_to_post",
          completed_by: currentUserId,
          // Auto-schedule with the image_due_date if available
          scheduled_date: post.image_due_date || null,
        })
        .eq("id", post.id)
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
      },
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      // Sanitize filename - replace special characters with underscores
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${Date.now()}-${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('blog-images')
        .getPublicUrl(fileName);

      setForm({ ...form, image_url: publicUrl });
      toast.success("Image uploaded");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error?.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
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

  // Get display name for staff (first name only, with initial if duplicates)
  const getStaffDisplayName = (id: string | null) => {
    if (!id) return "Not assigned";
    const staff = staffMembers.find(s => s.id === id);
    if (!staff) return "Unknown";
    
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
    // Remove **Intro**, **Main**, **Secondary**, **Conclusion** markers
    return content
      .replace(/\*\*Intro\*\*\n?/g, '')
      .replace(/\*\*Main\*\*\n?/g, '')
      .replace(/\*\*Secondary\*\*\n?/g, '')
      .replace(/\*\*Conclusion\*\*\n?/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
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
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
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
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                          {post.excerpt || getCleanContent(post.content).substring(0, 150)}...
                        </p>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs">
                          {post.assigned_to && (
                            <span className="flex items-center gap-1 text-blue-500">
                              <User className="w-3 h-3" /> {getStaffDisplayName(post.assigned_to)}
                            </span>
                          )}
                          {post.image_due_date && (
                            <span className="flex items-center gap-1 text-orange-500">
                              <Calendar className="w-3 h-3" /> {new Date(post.image_due_date).toLocaleDateString()}
                            </span>
                          )}
                          {post.canva_link && (
                            <a 
                              href={post.canva_link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-purple-500 hover:text-purple-700 hover:underline cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Link2 className="w-3 h-3" /> Canva
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                          {post.image_url_internal ? (
                            <span className="flex items-center gap-1 text-green-500">
                              <CheckCircle className="w-3 h-3" /> Added
                            </span>
                          ) : null}
                        </div>
                        {post.image_url_internal && (
                          <a 
                            href={post.image_url_internal} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="mt-2 w-16 h-10 rounded overflow-hidden border hover:ring-2 hover:ring-primary cursor-pointer block"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <img src={post.image_url_internal} alt="Preview" className="w-full h-full object-cover" />
                          </a>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-shrink-0">
                        {/* Quick assign staff and due date - stacked on mobile */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <Select
                            value={post.assigned_to || "unassigned"}
                            onValueChange={(value) => {
                              updateMutation.mutate({
                                id: post.id,
                                data: { assigned_to: value === "unassigned" ? null : value },
                              });
                            }}
                          >
                            <SelectTrigger className="h-9 w-full sm:w-32 text-xs">
                              <SelectValue placeholder="Not assigned" />
                            </SelectTrigger>
                            <SelectContent className="bg-background border z-50">
                              <SelectItem value="unassigned">Not assigned</SelectItem>
                              {isAdmin ? (
                                // Admins can assign to anyone
                                staffMembers.map((staff) => (
                                  <SelectItem key={staff.id} value={staff.id}>
                                    {getStaffDisplayName(staff.id)}
                                  </SelectItem>
                                ))
                              ) : (
                                // Non-admins can only assign to themselves
                                currentUserId && (
                                  <SelectItem value={currentUserId}>
                                    {getStaffDisplayName(currentUserId)}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                          <Input
                            type="date"
                            className="h-9 w-full sm:w-36 text-xs px-2"
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
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => {
                              setViewArticlePost(post);
                              setViewArticleDialogOpen(true);
                            }} 
                            className="h-8 w-full sm:w-auto text-xs"
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            View Article
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openDialog(post)} className="h-8 w-full sm:w-auto text-xs">
                            <Upload className="w-3 h-3 mr-1" />
                            Add Image & Canva
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => moveToReadyMutation.mutate(post)}
                            disabled={moveToReadyMutation.isPending || (!post.image_url_internal && !post.canva_link)}
                            className="h-8 w-full sm:w-auto text-xs"
                            title={!post.image_url_internal && !post.canva_link ? "Add image or Canva link first" : ""}
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
        <DialogContent className="w-full max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Image & Canva Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div>
              <h4 className="font-medium text-sm mb-2">{selectedPost?.title}</h4>
              <p className="text-sm text-muted-foreground line-clamp-4">
                {selectedPost?.content ? getCleanContent(selectedPost.content).substring(0, 300) : ""}...
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Canva Link */}
              <div className="space-y-2">
                <Label>Canva Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.canva_link}
                    onChange={(e) => setForm({ ...form, canva_link: e.target.value })}
                    placeholder="https://www.canva.com/design/..."
                    className="flex-1"
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

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Upload Image</Label>
                <div className="flex flex-col gap-2">
                  <Input
                    type="file"
                    accept=".png,.jpg,.jpeg,.gif,.webp,image/png,image/jpeg,image/gif,image/webp"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="cursor-pointer"
                  />
                  {uploading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <LoadingSpinner size="sm" />
                      Uploading...
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">PNG, JPG, GIF, WebP (max 10MB)</p>
                  
                  {/* Image Preview Thumbnail */}
                  {form.image_url && !uploading && (
                    <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg border">
                      <img 
                        src={form.image_url} 
                        alt="Uploaded preview" 
                        className="w-16 h-16 object-cover rounded-md border"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          Image uploaded
                        </span>
                        <span className="text-xs text-muted-foreground">Ready to save</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Image Preview */}
            {form.image_url && (
              <div className="rounded-lg overflow-hidden border">
                <img src={form.image_url} alt="Preview" className="w-full h-48 object-cover" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={updateMutation.isPending || (!form.canva_link && !form.image_url)}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Article Dialog */}
      <Dialog open={viewArticleDialogOpen} onOpenChange={setViewArticleDialogOpen}>
        <DialogContent className="w-full max-w-3xl max-h-[85vh]">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-xl font-semibold leading-tight">{viewArticlePost?.title}</DialogTitle>
            {viewArticlePost?.category && (
              <p className="text-sm text-muted-foreground mt-1">{viewArticlePost.category}</p>
            )}
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-6">
            <article className="prose prose-sm dark:prose-invert max-w-none">
              <div className="text-base leading-[1.8] tracking-wide text-foreground/90 whitespace-pre-wrap font-[system-ui] space-y-4">
                {viewArticlePost ? getCleanContent(viewArticlePost.content).split('\n\n').map((paragraph, idx) => (
                  <p key={idx} className="first-letter:text-lg first-letter:font-medium">{paragraph}</p>
                )) : null}
              </div>
            </article>
          </ScrollArea>
          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setViewArticleDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
