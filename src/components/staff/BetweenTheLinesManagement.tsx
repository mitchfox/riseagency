import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Edit } from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  published: boolean;
  image_url: string | null;
  category: string | null;
  created_at: string;
}

const betweenTheLinesCategories = [
  "TECHNICAL",
  "NUTRITION",
  "PSYCHOLOGY",
  "TACTICAL",
  "STRENGTH, POWER & SPEED",
  "RECOVERY",
  "COACHING",
  "AGENTS",
];

const BetweenTheLinesManagement = ({ isAdmin }: { isAdmin: boolean }) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    excerpt: "",
    published: false,
    image_url: "",
    category: "",
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    getCurrentUser();
    fetchPosts();
  }, []);

  const getCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUserId(session.user.id);
    }
  };

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .in("category", betweenTheLinesCategories)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch articles: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl = formData.image_url;

      // Upload image if a new file is selected
      if (imageFile) {
        setUploadingImage(true);
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = fileName;

        const { error: uploadError } = await supabase.storage
          .from('blog-images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('blog-images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
        setUploadingImage(false);
      }

      if (editingPost) {
        const { error } = await supabase
          .from("blog_posts")
          .update({
            title: formData.title,
            content: formData.content,
            excerpt: formData.excerpt,
            published: formData.published,
            image_url: imageUrl,
            category: formData.category || null,
          })
          .eq("id", editingPost.id);

        if (error) throw error;
        toast.success("Article updated successfully");
      } else {
        const { error } = await supabase
          .from("blog_posts")
          .insert({
            title: formData.title,
            content: formData.content,
            excerpt: formData.excerpt,
            published: formData.published,
            image_url: imageUrl,
            category: formData.category || null,
            author_id: userId,
          });

        if (error) throw error;
        toast.success("Article created successfully");
      }

      setFormData({ title: "", content: "", excerpt: "", published: false, image_url: "", category: "" });
      setImageFile(null);
      setEditingPost(null);
      setIsDialogOpen(false);
      fetchPosts();
    } catch (error: any) {
      toast.error("Failed to save article: " + error.message);
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this article?")) return;

    try {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
      toast.success("Article deleted successfully");
      fetchPosts();
    } catch (error: any) {
      toast.error("Failed to delete article: " + error.message);
    }
  };

  const startEdit = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      content: post.content,
      excerpt: post.excerpt || "",
      published: post.published,
      image_url: post.image_url || "",
      category: post.category || "",
    });
    setImageFile(null);
    setIsDialogOpen(true);
  };

  if (loading && posts.length === 0) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-xl sm:text-2xl font-bold">Between The Lines Management</h2>
        {!isAdmin && (
          <div className="text-sm text-muted-foreground">View Only</div>
        )}
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="md:size-default w-full sm:w-auto" onClick={() => {
                setEditingPost(null);
                setFormData({ title: "", content: "", excerpt: "", published: false, image_url: "", category: "" });
                setImageFile(null);
              }}>
                Add New Post
              </Button>
            </DialogTrigger>
          <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>{editingPost ? "Edit Post" : "Add New Post"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={10}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image">Image *</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setImageFile(file);
                  }}
                  disabled={loading || uploadingImage}
                />
                {imageFile && (
                  <p className="text-sm text-muted-foreground">Selected: {imageFile.name}</p>
                )}
                {formData.image_url && !imageFile && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground mb-1">Current image:</p>
                    <img src={formData.image_url} alt="Current" className="h-20 object-cover rounded" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {betweenTheLinesCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="published"
                  checked={formData.published}
                  onCheckedChange={(checked) => setFormData({ ...formData, published: checked })}
                />
                <Label htmlFor="published">Published</Label>
              </div>
              <Button type="submit" disabled={loading || uploadingImage}>
                {uploadingImage ? "Uploading image..." : loading ? "Saving..." : editingPost ? "Update Article" : "Create Article"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <div className="grid gap-4">
        {posts.map((post) => {
          const isExpanded = expandedPostId === post.id;
          
          return (
            <Card key={post.id} className="cursor-pointer">
              <CardHeader 
                onClick={() => setExpandedPostId(isExpanded ? null : post.id)}
                className="hover:bg-accent/50 transition-colors p-3 sm:p-6"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-foreground font-normal">
                      <span className="text-sm sm:text-base break-words">{post.title}</span>
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-[10px] sm:text-xs">
                        <span className="text-muted-foreground">
                          {post.published ? "Published" : "Draft"}
                        </span>
                        {post.category && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground truncate max-w-[120px] sm:max-w-none">{post.category}</span>
                          </>
                        )}
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground whitespace-nowrap">
                          {new Date(post.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-muted-foreground ml-2 flex-shrink-0">
                    {isExpanded ? "▼" : "▶"}
                  </div>
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent className="space-y-4 p-3 sm:p-6">
                  {isAdmin && (
                    <div className="flex flex-col sm:flex-row justify-end gap-2 pb-4 border-b">
                      <Button variant="outline" size="sm" onClick={() => startEdit(post)} className="w-full sm:w-auto text-xs sm:text-sm">
                        <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                        <span className="hidden sm:inline">Edit Article</span>
                        <span className="sm:hidden">Edit</span>
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(post.id)} className="w-full sm:w-auto text-xs sm:text-sm">
                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  )}
                  
                  {post.image_url && (
                    <div className="flex justify-center overflow-hidden">
                      <img 
                        src={post.image_url} 
                        alt={post.title} 
                        className="max-w-full w-full h-auto max-h-48 sm:max-h-64 object-cover rounded-lg" 
                      />
                    </div>
                  )}
                  
                  {post.excerpt && (
                    <div className="overflow-hidden">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Excerpt</p>
                      <p className="text-xs sm:text-sm break-words">{post.excerpt}</p>
                    </div>
                  )}
                  
                  <div className="overflow-hidden">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Content</p>
                    <div className="text-xs sm:text-sm whitespace-pre-wrap break-words max-h-64 sm:max-h-96 overflow-y-auto">{post.content}</div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default BetweenTheLinesManagement;
