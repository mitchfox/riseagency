import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Upload, X, Loader2, Video } from "lucide-react";

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
  { value: 'none', label: 'No images', rows: 0, cols: 0 },
  { value: '1-1', label: '1×1 (1 image)', rows: 1, cols: 1 },
  { value: '2-1', label: '2×1 (2 images in 1 row)', rows: 1, cols: 2 },
  { value: '1-2', label: '1×2 (1 per row, 2 rows)', rows: 2, cols: 1 },
  { value: '2-2', label: '2×2 (2 per row, 2 rows)', rows: 2, cols: 2 },
  { value: '3-2', label: '3×2 (3 per row, 2 rows)', rows: 2, cols: 3 },
  { value: '3-3', label: '3×3 (3 per row, 3 rows)', rows: 3, cols: 3 },
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
  const [imageLayout, setImageLayout] = useState(point?.image_layout || "none");
  const [images, setImages] = useState<MediaItem[]>(point?.images || []);
  const [videoUrl, setVideoUrl] = useState(point?.video_url || "");
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [saving, setSaving] = useState(false);

  const getLayoutConfig = (layout: string) => {
    return IMAGE_LAYOUTS.find(l => l.value === layout) || IMAGE_LAYOUTS[0];
  };

  const getMaxImages = (layout: string) => {
    const config = getLayoutConfig(layout);
    return config.rows * config.cols;
  };

  const handleAddParagraph = () => {
    setParagraphs([...paragraphs, ""]);
  };

  const handleParagraphChange = (index: number, value: string) => {
    const newParagraphs = [...paragraphs];
    newParagraphs[index] = value;
    setParagraphs(newParagraphs);
  };

  const handleParagraphPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>, index: number) => {
    const nativeEvent = e.nativeEvent as ClipboardEvent & { ctrlKey?: boolean; metaKey?: boolean };
    if (nativeEvent.ctrlKey || nativeEvent.metaKey) {
      // Ctrl/Cmd + paste: plain text (strip extra whitespace/line breaks)
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain').replace(/\s+/g, ' ').trim();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = paragraphs[index];
      const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);
      handleParagraphChange(index, newValue);
    }
    // Normal paste: browser default preserves line breaks
  };

  const handleRemoveParagraph = (index: number) => {
    if (paragraphs.length <= 1) return;
    const newParagraphs = paragraphs.filter((_, i) => i !== index);
    setParagraphs(newParagraphs);
  };

  const handleImageUpload = async (file: File, slotIndex: number) => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `positional-guides/${position}/${phase}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('coaching-database')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('coaching-database')
        .getPublicUrl(filePath);

      const newImages = [...images];
      newImages[slotIndex] = { url: publicUrl };
      setImages(newImages);
      toast.success('Image uploaded');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleVideoUpload = async (file: File) => {
    setUploadingVideo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `positional-guides/videos/${position}/${phase}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('coaching-database')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('coaching-database')
        .getPublicUrl(filePath);

      setVideoUrl(publicUrl);
      toast.success('Video uploaded');
    } catch (error) {
      console.error('Error uploading video:', error);
      toast.error('Failed to upload video');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = [...images];
    newImages[index] = { url: '' };
    setImages(newImages.filter(img => img.url));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setSaving(true);
    try {
      const cleanParagraphs = paragraphs.filter(p => p.trim());
      const cleanImages = images.filter(img => img.url);
      
      const data = {
        position,
        phase,
        subcategory,
        title: title.trim(),
        paragraphs: cleanParagraphs,
        image_layout: imageLayout,
        images: JSON.parse(JSON.stringify(cleanImages)),
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

  const layoutConfig = getLayoutConfig(imageLayout);
  const maxImages = getMaxImages(imageLayout);

  // Build grid slots array
  const gridSlots = Array.from({ length: maxImages }, (_, i) => i);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] md:max-w-4xl w-full max-h-[90vh] overflow-y-auto p-4 md:p-6">
        <DialogHeader>
          <DialogTitle className="text-base md:text-lg">
            {point ? 'Edit Point' : 'Add New Point'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 py-2 md:py-4">
          {/* Left Column - Text Content */}
          <div className="space-y-4 md:space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label className="text-xs md:text-sm">Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter point title..."
                className="h-9 md:h-10 text-sm"
              />
            </div>

            {/* Paragraphs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs md:text-sm">Paragraphs</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddParagraph}
                  className="h-7 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {paragraphs.map((para, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Textarea
                      value={para}
                      onChange={(e) => handleParagraphChange(idx, e.target.value)}
                      onPaste={(e) => handleParagraphPaste(e, idx)}
                      placeholder={`Paragraph ${idx + 1}...`}
                      rows={2}
                      className="flex-1 text-sm min-h-[60px]"
                    />
                    {paragraphs.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive shrink-0"
                        onClick={() => handleRemoveParagraph(idx)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Video Upload */}
            <div className="space-y-2">
              <Label className="text-xs md:text-sm">Video (optional)</Label>
              {videoUrl ? (
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                  <video
                    src={videoUrl}
                    controls
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setVideoUrl('')}
                    className="absolute top-2 right-2 bg-destructive/90 hover:bg-destructive p-1.5 rounded"
                  >
                    <X className="h-4 w-4 text-destructive-foreground" />
                  </button>
                </div>
              ) : (
                <div className="h-32 bg-muted/50 border-2 border-dashed border-muted-foreground/30 rounded-lg hover:border-primary/50 transition-colors">
                  <input
                    id="video-upload"
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleVideoUpload(file);
                    }}
                    disabled={uploadingVideo}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full h-full flex flex-col items-center justify-center"
                    onClick={() => document.getElementById('video-upload')?.click()}
                    disabled={uploadingVideo}
                  >
                    {uploadingVideo ? (
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Video className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Upload Video</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Image Layout */}
          <div className="space-y-3 md:space-y-4">
            {/* Image Layout Selector */}
            <div className="space-y-2">
              <Label className="text-xs md:text-sm">Image Layout</Label>
              <Select value={imageLayout} onValueChange={(val) => {
                setImageLayout(val);
                // Reset images when layout changes
                setImages([]);
              }}>
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

            {/* Image Grid Preview - only show if layout is not 'none' */}
            {imageLayout !== 'none' && maxImages > 0 && (
              <div className="space-y-2">
                <Label className="text-xs md:text-sm">Images - Upload in order</Label>
                <div 
                  className="grid gap-3 p-4 bg-muted/30 rounded-lg border border-border"
                  style={{ 
                    gridTemplateColumns: `repeat(${layoutConfig.cols}, 1fr)`,
                    gridTemplateRows: `repeat(${layoutConfig.rows}, 1fr)`,
                  }}
                >
                  {gridSlots.map((slotIndex) => {
                    const image = images[slotIndex];
                    const hasImage = image?.url;
                    
                    return (
                      <div 
                        key={slotIndex} 
                        className="relative aspect-square bg-background rounded-lg overflow-hidden border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors"
                      >
                        {hasImage ? (
                          <>
                            <img
                              src={image.url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(slotIndex)}
                              className="absolute top-1 right-1 bg-destructive/90 hover:bg-destructive p-1 rounded"
                            >
                              <X className="h-3 w-3 text-destructive-foreground" />
                            </button>
                          </>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <input
                              id={`image-upload-${slotIndex}`}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(file, slotIndex);
                              }}
                              disabled={uploading}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              className="w-full h-full flex flex-col items-center justify-center"
                              onClick={() => document.getElementById(`image-upload-${slotIndex}`)?.click()}
                              disabled={uploading}
                            >
                              {uploading ? (
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                              ) : (
                                <>
                                  <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                                  <span className="text-xs text-muted-foreground font-medium">
                                    Slot {slotIndex + 1}
                                  </span>
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
