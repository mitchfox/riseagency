import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Lightbulb, Plus, Trash2, Edit, Loader2, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface MarketingTip {
  id: string;
  title: string;
  content: string;
  category: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { id: "tip", label: "Tip", color: "bg-blue-500" },
  { id: "idea", label: "Idea", color: "bg-green-500" },
  { id: "lesson", label: "Lesson", color: "bg-purple-500" },
];

export const MarketingTipsManagement = () => {
  const [tips, setTips] = useState<MarketingTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTip, setEditingTip] = useState<MarketingTip | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "tip",
  });

  useEffect(() => {
    checkAdminRole();
    fetchTips();
    checkNotificationSetting();
  }, []);

  const checkAdminRole = async () => {
    const staffUserId = localStorage.getItem("staff_user_id") || sessionStorage.getItem("staff_user_id");
    if (!staffUserId) return;

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", staffUserId)
      .eq("role", "admin")
      .single();

    setIsAdmin(!!data);
  };

  const checkNotificationSetting = async () => {
    const staffUserId = localStorage.getItem("staff_user_id") || sessionStorage.getItem("staff_user_id");
    if (!staffUserId) return;

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", staffUserId)
      .single();

    if (roleData) {
      const { data: settingData } = await supabase
        .from("staff_notification_settings")
        .select("enabled")
        .eq("role", roleData.role)
        .eq("event_type", "marketing_tip_new")
        .single();

      setNotificationsEnabled(settingData?.enabled ?? false);
    }
  };

  const fetchTips = async () => {
    try {
      const { data, error } = await supabase
        .from("marketing_tips")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTips(data || []);
    } catch (error) {
      console.error("Error fetching tips:", error);
      toast.error("Failed to load tips");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const staffUserId = localStorage.getItem("staff_user_id") || sessionStorage.getItem("staff_user_id");

      if (editingTip) {
        const { error } = await supabase
          .from("marketing_tips")
          .update({
            title: formData.title,
            content: formData.content,
            category: formData.category,
          })
          .eq("id", editingTip.id);

        if (error) throw error;
        toast.success("Tip updated successfully");
      } else {
        const { error } = await supabase
          .from("marketing_tips")
          .insert({
            title: formData.title,
            content: formData.content,
            category: formData.category,
            created_by: staffUserId,
          });

        if (error) throw error;
        toast.success("Tip created successfully");
      }

      setDialogOpen(false);
      setEditingTip(null);
      setFormData({ title: "", content: "", category: "tip" });
      fetchTips();
    } catch (error) {
      console.error("Error saving tip:", error);
      toast.error("Failed to save tip");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (tip: MarketingTip) => {
    setEditingTip(tip);
    setFormData({
      title: tip.title,
      content: tip.content,
      category: tip.category,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("marketing_tips")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Tip deleted successfully");
      fetchTips();
    } catch (error) {
      console.error("Error deleting tip:", error);
      toast.error("Failed to delete tip");
    }
  };

  const getCategoryBadge = (category: string) => {
    const cat = CATEGORIES.find((c) => c.id === category);
    return cat ? (
      <Badge className={`${cat.color} text-white border-0`}>{cat.label}</Badge>
    ) : (
      <Badge variant="outline">{category}</Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              <CardTitle>Tips, Ideas & Lessons</CardTitle>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Notifications: {notificationsEnabled ? "On" : "Off"}
                </span>
              </div>
              {isAdmin && (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingTip(null);
                        setFormData({ title: "", content: "", category: "tip" });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>
                        {editingTip ? "Edit" : "Create"} Tip
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) =>
                            setFormData({ ...formData, title: e.target.value })
                          }
                          placeholder="Enter title"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) =>
                            setFormData({ ...formData, category: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="content">Content</Label>
                        <Textarea
                          id="content"
                          value={formData.content}
                          onChange={(e) =>
                            setFormData({ ...formData, content: e.target.value })
                          }
                          placeholder="Enter content..."
                          rows={6}
                          required
                        />
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline" type="button">
                            Cancel
                          </Button>
                        </DialogClose>
                        <Button type="submit" disabled={saving}>
                          {saving && (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          )}
                          {editingTip ? "Update" : "Create"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
          <CardDescription>
            Useful tips, ideas and lessons for the marketing team
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tips.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No tips added yet
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tips.map((tip) => (
                <Card key={tip.id} className="border-primary/20">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        {getCategoryBadge(tip.category)}
                        <CardTitle className="text-base mt-2">
                          {tip.title}
                        </CardTitle>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(tip)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Tip</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{tip.title}"?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(tip.id)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {tip.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-4">
                      {format(new Date(tip.created_at), "MMM d, yyyy")}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
