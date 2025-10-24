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
  "Tactical Analysis",
  "Player Development",
  "Match Review",
  "Training Methods",
  "Scouting Reports"
];

const BetweenTheLinesManagement = () => {
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
      if (editingPost) {
        const { error } = await supabase
          .from("blog_posts")
          .update({
            title: formData.title,
            content: formData.content,
            excerpt: formData.excerpt,
            published: formData.published,
            image_url: formData.image_url,
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
            image_url: formData.image_url,
            category: formData.category || null,
            author_id: userId,
          });

        if (error) throw error;
        toast.success("Article created successfully");
      }

      setFormData({ title: "", content: "", excerpt: "", published: false, image_url: "", category: "" });
      setEditingPost(null);
      setIsDialogOpen(false);
      fetchPosts();
    } catch (error: any) {
      toast.error("Failed to save article: " + error.message);
    } finally {
      setLoading(false);
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
    setIsDialogOpen(true);
  };

  if (loading && posts.length === 0) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Between The Lines Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingPost(null);
              setFormData({ title: "", content: "", excerpt: "", published: false, image_url: "", category: "" });
            }}>
              Add New Article
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPost ? "Edit Article" : "Add New Article"}</DialogTitle>
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
                <Label htmlFor="image_url">Image URL *</Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  required
                />
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
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : editingPost ? "Update Article" : "Create Article"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {posts.map((post) => {
          const isExpanded = expandedPostId === post.id;
          
          return (
            <Card key={post.id} className="cursor-pointer">
              <CardHeader 
                onClick={() => setExpandedPostId(isExpanded ? null : post.id)}
                className="hover:bg-accent/50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-foreground font-normal">
                      <span>{post.title}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground text-sm">
                        {post.published ? "Published" : "Draft"}
                      </span>
                      {post.category && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground text-sm">{post.category}</span>
                        </>
                      )}
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground text-sm">
                        {new Date(post.created_at).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                  </div>
                  <div className="text-muted-foreground ml-4">
                    {isExpanded ? "▼" : "▶"}
                  </div>
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent className="space-y-4">
                  <div className="flex justify-end gap-2 pb-4 border-b">
                    <Button variant="outline" size="sm" onClick={() => startEdit(post)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Article
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(post.id)}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                  
                  {post.image_url && (
                    <div className="flex justify-center">
                      <img 
                        src={post.image_url} 
                        alt={post.title} 
                        className="max-w-full h-auto max-h-64 object-cover rounded-lg" 
                      />
                    </div>
                  )}
                  
                  {post.excerpt && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Excerpt</p>
                      <p className="text-sm">{post.excerpt}</p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Content</p>
                    <div className="text-sm whitespace-pre-wrap">{post.content}</div>
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
