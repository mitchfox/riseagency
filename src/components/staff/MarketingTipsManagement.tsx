import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Lightbulb, Plus, Trash2, Edit, Loader2, Bell, Upload, X, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface MarketingTip {
  id: string;
  title: string;
  content: string;
  category: string;
  image_url: string | null;
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `tips/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('marketing-gallery')
      .upload(fileName, file);
      
    if (error) throw error;
    
    const { data: urlData } = supabase.storage
      .from('marketing-gallery')
      .getPublicUrl(fileName);
      
    return urlData.publicUrl;
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const staffUserId = localStorage.getItem("staff_user_id") || sessionStorage.getItem("staff_user_id");
      
      let imageUrl: string | null = editingTip?.image_url || null;
      
      // Upload new image if selected
      if (imageFile) {
        setUploadingImage(true);
        imageUrl = await uploadImage(imageFile);
        setUploadingImage(false);
      } else if (!imagePreview && editingTip?.image_url) {
        // Image was removed
        imageUrl = null;
      }

      if (editingTip) {
        const { error } = await supabase
          .from("marketing_tips")
          .update({
            title: formData.title,
            content: formData.content,
            category: formData.category,
            image_url: imageUrl,
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
            image_url: imageUrl,
            created_by: staffUserId,
          });

        if (error) throw error;
        toast.success("Tip created successfully");
      }

      setDialogOpen(false);
      setEditingTip(null);
      setFormData({ title: "", content: "", category: "tip" });
      setImageFile(null);
      setImagePreview(null);
      fetchTips();
    } catch (error) {
      console.error("Error saving tip:", error);
      toast.error("Failed to save tip");
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  };

  const handleEdit = (tip: MarketingTip) => {
    setEditingTip(tip);
    setFormData({
      title: tip.title,
      content: tip.content,
      category: tip.category,
    });
    setImagePreview(tip.image_url || null);
    setImageFile(null);
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

  const resetForm = () => {
    setEditingTip(null);
    setFormData({ title: "", content: "", category: "tip" });
    setImageFile(null);
    setImagePreview(null);
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
                <Dialog open={dialogOpen} onOpenChange={(open) => {
                  setDialogOpen(open);
                  if (!open) resetForm();
                }}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      onClick={resetForm}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingTip ? "Edit" : "Create"} Tip
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column: Form Fields */}
                        <div className="space-y-4">
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
                              rows={10}
                              required
                            />
                          </div>
                        </div>
                        
                        {/* Right Column: Image Upload */}
                        <div className="space-y-4">
                          <Label>Image (optional)</Label>
                          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                            {imagePreview ? (
                              <div className="relative">
                                <img 
                                  src={imagePreview} 
                                  alt="Preview" 
                                  className="rounded-lg w-full max-h-64 object-cover"
                                />
                                <Button 
                                  type="button"
                                  variant="destructive" 
                                  size="icon"
                                  className="absolute top-2 right-2 h-8 w-8"
                                  onClick={removeImage}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center h-48 cursor-pointer hover:bg-muted/50 rounded-lg transition-colors">
                                <ImageIcon className="h-12 w-12 text-muted-foreground mb-2" />
                                <span className="text-sm text-muted-foreground mb-2">
                                  Click to upload an image
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  JPG, PNG, WEBP up to 10MB
                                </span>
                                <Input 
                                  type="file" 
                                  accept="image/*" 
                                  className="hidden"
                                  onChange={handleImageSelect}
                                />
                              </label>
                            )}
                          </div>
                          {uploadingImage && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Uploading image...
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <DialogFooter className="mt-6">
                        <DialogClose asChild>
                          <Button variant="outline" type="button">
                            Cancel
                          </Button>
                        </DialogClose>
                        <Button type="submit" disabled={saving || uploadingImage}>
                          {(saving || uploadingImage) && (
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
                <Card key={tip.id} className="border-primary/20 overflow-hidden">
                  {tip.image_url && (
                    <div className="aspect-video w-full overflow-hidden">
                      <img 
                        src={tip.image_url} 
                        alt={tip.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
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
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
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
