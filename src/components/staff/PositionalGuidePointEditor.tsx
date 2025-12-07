import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Upload, X, Loader2, Video, Image as ImageIcon, GripVertical } from "lucide-react";

interface MediaItem {
  url: string;
  caption?: string;
}

interface PositionalGuidePoint {
  id: string;
  position: string;
  phase: string;
  subcategory: string;
  title: string;
  paragraphs: string[];
  image_layout: string;
  images: MediaItem[];
  video_url: string | null;
  display_order: number;
}

interface PointEditorProps {
  point?: PositionalGuidePoint;
  position: string;
  phase: string;
  subcategory: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  nextOrder: number;
}

const IMAGE_LAYOUTS = [
  { value: '1-1', label: '1×1 (1 image, 1 row)', rows: 1, cols: 1 },
  { value: '2-1', label: '2×1 (2 images, 1 row)', rows: 1, cols: 2 },
  { value: '1-2', label: '1×2 (1 image per row, 2 rows)', rows: 2, cols: 1 },
  { value: '2-2', label: '2×2 (2 images per row, 2 rows)', rows: 2, cols: 2 },
  { value: '3-2', label: '3×2 (3 images per row, 2 rows)', rows: 2, cols: 3 },
  { value: '3-3', label: '3×3 (3 images per row, 3 rows)', rows: 3, cols: 3 },
];

export const PositionalGuidePointEditor = ({
  point,
  position,
  phase,
  subcategory,
  open,
  onClose,
  onSaved,
  nextOrder,
}: PointEditorProps) => {
  const [title, setTitle] = useState(point?.title || "");
  const [paragraphs, setParagraphs] = useState<string[]>(point?.paragraphs || [""]);
  const [imageLayout, setImageLayout] = useState(point?.image_layout || "1-1");
  const [images, setImages] = useState<MediaItem[]>(point?.images || []);
  const [videoUrl, setVideoUrl] = useState(point?.video_url || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getMaxImages = (layout: string) => {
    const layoutConfig = IMAGE_LAYOUTS.find(l => l.value === layout);
    if (!layoutConfig) return 1;
    return layoutConfig.rows * layoutConfig.cols;
  };

  const handleAddParagraph = () => {
    setParagraphs([...paragraphs, ""]);
  };

  const handleParagraphChange = (index: number, value: string) => {
    const newParagraphs = [...paragraphs];
    newParagraphs[index] = value;
    setParagraphs(newParagraphs);
  };

  const handleRemoveParagraph = (index: number) => {
    if (paragraphs.length <= 1) return;
    const newParagraphs = paragraphs.filter((_, i) => i !== index);
    setParagraphs(newParagraphs);
  };

  const handleImageUpload = async (file: File) => {
    const maxImages = getMaxImages(imageLayout);
    if (images.length >= maxImages) {
      toast.error(`Maximum ${maxImages} images allowed for this layout`);
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `positional-guides/${position}/${phase}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('marketing-gallery')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('marketing-gallery')
        .getPublicUrl(filePath);

      setImages([...images, { url: publicUrl }]);
      toast.success('Image uploaded');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setSaving(true);
    try {
      const cleanParagraphs = paragraphs.filter(p => p.trim());
      
      const data = {
        position,
        phase,
        subcategory,
        title: title.trim(),
        paragraphs: cleanParagraphs,
        image_layout: imageLayout,
        images: JSON.parse(JSON.stringify(images)),
        video_url: videoUrl.trim() || null,
        display_order: point?.display_order ?? nextOrder,
        updated_at: new Date().toISOString(),
      };

      if (point) {
        const { error } = await supabase
          .from('positional_guide_points')
          .update(data)
          .eq('id', point.id);
        if (error) throw error;
        toast.success('Point updated');
      } else {
        const { error } = await supabase
          .from('positional_guide_points')
          .insert(data);
        if (error) throw error;
        toast.success('Point added');
      }

      onSaved();
      onClose();
    } catch (error) {
      console.error('Error saving point:', error);
      toast.error('Failed to save point');
    } finally {
      setSaving(false);
    }
  };

  const layoutConfig = IMAGE_LAYOUTS.find(l => l.value === imageLayout);
  const maxImages = getMaxImages(imageLayout);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {point ? 'Edit Point' : 'Add New Point'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter point title..."
            />
          </div>

          {/* Paragraphs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Paragraphs</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddParagraph}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Paragraph
              </Button>
            </div>
            <div className="space-y-2">
              {paragraphs.map((para, idx) => (
                <div key={idx} className="flex gap-2">
                  <Textarea
                    value={para}
                    onChange={(e) => handleParagraphChange(idx, e.target.value)}
                    placeholder={`Paragraph ${idx + 1}...`}
                    rows={3}
                    className="flex-1"
                  />
                  {paragraphs.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive"
                      onClick={() => handleRemoveParagraph(idx)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Image Layout */}
          <div className="space-y-2">
            <Label>Image Layout</Label>
            <Select value={imageLayout} onValueChange={setImageLayout}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMAGE_LAYOUTS.map(layout => (
                  <SelectItem key={layout.value} value={layout.value}>
                    {layout.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Images */}
          <div className="space-y-2">
            <Label>Images ({images.length}/{maxImages})</Label>
            <div 
              className="grid gap-2"
              style={{ 
                gridTemplateColumns: `repeat(${layoutConfig?.cols || 1}, 1fr)` 
              }}
            >
              {images.map((img, idx) => (
                <div key={idx} className="relative aspect-video bg-muted rounded-lg overflow-hidden group">
                  <img
                    src={img.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 bg-destructive/90 hover:bg-destructive p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3 text-destructive-foreground" />
                  </button>
                </div>
              ))}
              
              {images.length < maxImages && (
                <label className="aspect-video bg-muted/50 border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                    disabled={uploading}
                  />
                  {uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">Upload Image</span>
                    </>
                  )}
                </label>
              )}
            </div>
          </div>

          {/* Video URL */}
          <div className="space-y-2">
            <Label>Video URL (optional)</Label>
            <div className="flex gap-2">
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/... or https://vimeo.com/..."
                className="flex-1"
              />
              {videoUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(videoUrl, '_blank')}
                >
                  <Video className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {point ? 'Save Changes' : 'Add Point'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
