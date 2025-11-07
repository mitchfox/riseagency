import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, FileText, Image, Table, Folder, HardDrive, ExternalLink, Upload, Trash2, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const marketingLinks = [
  {
    title: "Post Templates",
    description: "Content templates and planning",
    icon: FileText,
    url: "https://flaxen-voice-e64.notion.site/1c248d32b9a181c9aab5c06bace0237b?v=1c248d32b9a18158b8fc000c0a4166b0",
    color: "text-blue-500"
  },
  {
    title: "Canva Design",
    description: "Design templates and assets",
    icon: Image,
    url: "https://www.canva.com/design/DAG0N9vOwtg/6ZmTuSDkJzR9_b0nl7czJA/edit?utm_content=DAG0N9vOwtg&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton",
    color: "text-purple-500"
  },
  {
    title: "Player Images",
    description: "Player photo templates",
    icon: Image,
    url: "https://www.canva.com/design/DAG0Fs-P2oY/xnS87xfydD4uus5vACSKgA/edit",
    color: "text-green-500"
  },
  {
    title: "Topic Schedule",
    description: "Content calendar and planning",
    icon: Table,
    url: "https://docs.google.com/spreadsheets/d/1UtMiSeVkxDCP0b6DJmuB72dKHTUHAfyInUB_Ts2iRcc/edit?usp=sharing",
    color: "text-orange-500"
  },
  {
    title: "Canva Folder",
    description: "Templates and published posts",
    icon: Folder,
    url: "https://www.canva.com/folder/FAFRi-Qvnf4",
    color: "text-pink-500"
  },
  {
    title: "Google Drive",
    description: "Shared marketing resources",
    icon: HardDrive,
    url: "https://drive.google.com/drive/folders/1fCfrG6bY8YuEjm7bVMaxIGEoXOyCBLMj?usp=sharing",
    color: "text-indigo-500"
  }
];

interface GalleryItem {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: 'image' | 'video';
  thumbnail_url: string | null;
  category: 'brand' | 'players' | 'other';
  created_at: string;
}

export const MarketingManagement = ({ isAdmin }: { isAdmin: boolean }) => {
  const [activeTab, setActiveTab] = useState("resources");
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'brand' | 'players' | 'other'>('all');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    file: null as File | null,
    category: 'other' as 'brand' | 'players' | 'other',
  });

  useEffect(() => {
    if (activeTab === 'gallery') {
      fetchGalleryItems();
    }
  }, [activeTab]);

  const fetchGalleryItems = async () => {
    const { data, error } = await supabase
      .from('marketing_gallery')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch gallery items:', error);
      return;
    }

    setGalleryItems((data || []) as GalleryItem[]);
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uploadForm.file || !isAdmin) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);

    try {
      // Upload file to storage
      const fileExt = uploadForm.file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('marketing-gallery')
        .upload(filePath, uploadForm.file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('marketing-gallery')
        .getPublicUrl(filePath);

      // Determine file type
      const fileType = uploadForm.file.type.startsWith('video/') ? 'video' : 'image';

      // Save metadata to database
      const { error: dbError } = await supabase
        .from('marketing_gallery')
        .insert([{
          title: uploadForm.title,
          description: uploadForm.description || null,
          file_url: publicUrl,
          file_type: fileType,
          category: uploadForm.category,
        }]);

      if (dbError) throw dbError;

      toast.success('File uploaded successfully');
      setShowUploadDialog(false);
      setUploadForm({ title: '', description: '', file: null, category: 'other' });
      fetchGalleryItems();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (item: GalleryItem) => {
    if (!isAdmin || !confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      // Extract file path from URL
      const urlParts = item.file_url.split('/');
      const filePath = urlParts[urlParts.length - 1];

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('marketing-gallery')
        .remove([filePath]);

      if (storageError) console.error('Storage delete error:', storageError);

      // Delete from database
      const { error: dbError } = await supabase
        .from('marketing_gallery')
        .delete()
        .eq('id', item.id);

      if (dbError) throw dbError;

      toast.success('Item deleted successfully');
      fetchGalleryItems();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete item');
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="resources">
            <Folder className="w-4 h-4 mr-2" />
            Resources
          </TabsTrigger>
          <TabsTrigger value="gallery">
            <Image className="w-4 h-4 mr-2" />
            Gallery
          </TabsTrigger>
          <TabsTrigger value="planner">
            <Calendar className="w-4 h-4 mr-2" />
            Planner
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Marketing Resources</CardTitle>
              <CardDescription>Quick access to all marketing tools and templates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {marketingLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <a
                      key={link.title}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group"
                    >
                      <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-lg bg-muted ${link.color}`}>
                              <Icon className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                                  {link.title}
                                </h3>
                                <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {link.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </a>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gallery" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <CardTitle>Marketing Gallery</CardTitle>
                  <CardDescription>Upload and manage images and videos for marketing</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                  <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as any)}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="brand">Brand</SelectItem>
                      <SelectItem value="players">Players</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {isAdmin && (
                    <Button onClick={() => setShowUploadDialog(true)} size="sm" className="md:size-default">
                      <Upload className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Upload Media</span>
                      <span className="sm:hidden">Upload</span>
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const filtered = categoryFilter === 'all' 
                  ? galleryItems 
                  : galleryItems.filter(item => item.category === categoryFilter);
                
                return filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Image className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No media in this category</p>
                  <p className="text-sm">Upload images and videos to build your marketing gallery</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filtered.map((item) => (
                    <Card key={item.id} className="overflow-hidden">
                      <div className="relative aspect-video bg-muted">
                        {item.file_type === 'image' ? (
                          <img
                            src={item.file_url}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="relative w-full h-full">
                            <video
                              src={item.file_url}
                              className="w-full h-full object-cover"
                              controls
                            />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <Play className="w-12 h-12 text-white opacity-80" />
                            </div>
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-1">{item.title}</h3>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => window.open(item.file_url, '_blank')}
                          >
                            View Full
                          </Button>
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(item)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planner" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Marketing Planner</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No campaigns planned yet</p>
                <p className="text-sm mb-4">Plan and schedule your marketing campaigns</p>
                <Button>Create Campaign</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Media</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFileUpload} className="space-y-4">
            <div>
              <Label htmlFor="upload-title">Title *</Label>
              <Input
                id="upload-title"
                value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                required
                placeholder="Enter media title"
              />
            </div>

            <div>
              <Label htmlFor="upload-description">Description</Label>
              <Textarea
                id="upload-description"
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                placeholder="Optional description"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="upload-category">Category *</Label>
              <Select
                value={uploadForm.category}
                onValueChange={(v) => setUploadForm({ ...uploadForm, category: v as any })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brand">Brand</SelectItem>
                  <SelectItem value="players">Players</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="upload-file">File *</Label>
              <Input
                id="upload-file"
                type="file"
                accept="image/*,video/*"
                onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Supported: Images (JPG, PNG, GIF, WebP) and Videos (MP4, WebM, MOV)
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowUploadDialog(false);
                  setUploadForm({ title: '', description: '', file: null, category: 'other' });
                }}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
