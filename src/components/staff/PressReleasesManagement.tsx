import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface PressRelease {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  published_at: string;
  is_published: boolean;
  created_at: string;
}

const PressReleasesManagement = () => {
  const [releases, setReleases] = useState<PressRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRelease, setEditingRelease] = useState<PressRelease | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    excerpt: "",
    is_published: true,
  });

  useEffect(() => {
    fetchReleases();
  }, []);

  const fetchReleases = async () => {
    try {
      const { data, error } = await supabase
        .from("press_releases")
        .select("*")
        .order("published_at", { ascending: false });

      if (error) throw error;
      setReleases(data || []);
    } catch (error) {
      console.error("Error fetching press releases:", error);
      toast.error("Failed to load press releases");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.content) {
      toast.error("Title and content are required");
      return;
    }

    try {
      if (editingRelease) {
        const { error } = await supabase
          .from("press_releases")
          .update({
            title: formData.title,
            content: formData.content,
            excerpt: formData.excerpt || null,
            is_published: formData.is_published,
          })
          .eq("id", editingRelease.id);

        if (error) throw error;
        toast.success("Press release updated");
      } else {
        const { error } = await supabase.from("press_releases").insert({
          title: formData.title,
          content: formData.content,
          excerpt: formData.excerpt || null,
          is_published: formData.is_published,
        });

        if (error) throw error;
        toast.success("Press release created");
      }

      setDialogOpen(false);
      setEditingRelease(null);
      setFormData({ title: "", content: "", excerpt: "", is_published: true });
      fetchReleases();
    } catch (error) {
      console.error("Error saving press release:", error);
      toast.error("Failed to save press release");
    }
  };

  const handleEdit = (release: PressRelease) => {
    setEditingRelease(release);
    setFormData({
      title: release.title,
      content: release.content,
      excerpt: release.excerpt || "",
      is_published: release.is_published,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this press release?")) return;

    try {
      const { error } = await supabase.from("press_releases").delete().eq("id", id);
      if (error) throw error;
      toast.success("Press release deleted");
      fetchReleases();
    } catch (error) {
      console.error("Error deleting press release:", error);
      toast.error("Failed to delete press release");
    }
  };

  const openNewDialog = () => {
    setEditingRelease(null);
    setFormData({ title: "", content: "", excerpt: "", is_published: true });
    setDialogOpen(true);
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading press releases...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bebas uppercase tracking-wider">Press Releases</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              New Release
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-bebas uppercase tracking-wider">
                {editingRelease ? "Edit Press Release" : "New Press Release"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Press release title..."
                />
              </div>
              <div className="space-y-2">
                <Label>Excerpt (optional)</Label>
                <Textarea
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  placeholder="Short summary for preview..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Full press release content..."
                  rows={10}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_published}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                />
                <Label>Published</Label>
              </div>
              <Button onClick={handleSubmit} className="w-full">
                {editingRelease ? "Update" : "Create"} Press Release
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {releases.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No press releases yet. Create your first one!</p>
            </CardContent>
          </Card>
        ) : (
          releases.map((release) => (
            <Card key={release.id} className={!release.is_published ? "opacity-60" : ""}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{release.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(new Date(release.published_at), "MMMM d, yyyy")}
                      {!release.is_published && (
                        <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-600 text-xs rounded">
                          Draft
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(release)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(release.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {release.excerpt || release.content.substring(0, 200)}...
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default PressReleasesManagement;