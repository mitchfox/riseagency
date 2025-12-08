import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Image, Video, Plus, Trash2, Upload, X, Loader2 } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface MediaItem {
  url: string;
  caption?: string;
}

interface MediaGridRow {
  id: string;
  layout: string;
  images: MediaItem[];
  video_url?: string;
  display_order: number;
}

interface MediaGridEditorProps {
  position: string;
  phase: string;
  subcategory: string;
  mediaRows: MediaGridRow[];
  onUpdate: () => void;
  isAdmin: boolean;
}

const LAYOUT_OPTIONS = [
  { value: '1', label: '1 image', cols: 1 },
  { value: '2', label: '2 images', cols: 2 },
  { value: '3', label: '3 images', cols: 3 },
];

export const MediaGridEditor = ({
  position,
  phase,
  subcategory,
  mediaRows,
  onUpdate,
  isAdmin
}: MediaGridEditorProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadingRowId, setUploadingRowId] = useState<string | null>(null);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddRow = async (layout: string) => {
    try {
      const maxOrder = Math.max(0, ...mediaRows.map(r => r.display_order));
      const { error } = await supabase
        .from('positional_guide_media')
        .insert({
          position,
          phase,
          subcategory,
          layout,
          images: [],
          display_order: maxOrder + 1
        });

      if (error) throw error;
      toast.success('Media row added');
      onUpdate();
    } catch (error) {
      console.error('Error adding media row:', error);
      toast.error('Failed to add media row');
    }
  };

  const handleDeleteRow = async (rowId: string) => {
    try {
      const { error } = await supabase
        .from('positional_guide_media')
        .delete()
        .eq('id', rowId);

      if (error) throw error;
      toast.success('Media row deleted');
      onUpdate();
    } catch (error) {
      console.error('Error deleting row:', error);
      toast.error('Failed to delete row');
    }
  };

  const handleImageUpload = async (rowId: string, file: File) => {
    if (!file) return;

    setUploading(true);
    setUploadingRowId(rowId);

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

      // Get current row images
      const row = mediaRows.find(r => r.id === rowId);
      const currentImages = row?.images || [];
      const layoutCols = parseInt(row?.layout || '1');

      if (currentImages.length >= layoutCols) {
        toast.error(`This row only supports ${layoutCols} image(s)`);
        return;
      }

      const newImages = [...currentImages, { url: publicUrl }];

      const { error: updateError } = await supabase
        .from('positional_guide_media')
        .update({ images: JSON.parse(JSON.stringify(newImages)), updated_at: new Date().toISOString() })
        .eq('id', rowId);

      if (updateError) throw updateError;

      toast.success('Image uploaded');
      onUpdate();
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
      setUploadingRowId(null);
    }
  };

  const handleRemoveImage = async (rowId: string, imageIndex: number) => {
    try {
      const row = mediaRows.find(r => r.id === rowId);
      if (!row) return;

      const newImages = [...row.images];
      newImages.splice(imageIndex, 1);

      const { error } = await supabase
        .from('positional_guide_media')
        .update({ images: JSON.parse(JSON.stringify(newImages)), updated_at: new Date().toISOString() })
        .eq('id', rowId);

      if (error) throw error;
      toast.success('Image removed');
      onUpdate();
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('Failed to remove image');
    }
  };

  const handleSaveVideo = async () => {
    if (!selectedRowId) return;

    try {
      const { error } = await supabase
        .from('positional_guide_media')
        .update({ video_url: videoUrl || null, updated_at: new Date().toISOString() })
        .eq('id', selectedRowId);

      if (error) throw error;
      toast.success(videoUrl ? 'Video added' : 'Video removed');
      setVideoDialogOpen(false);
      setVideoUrl("");
      setSelectedRowId(null);
      onUpdate();
    } catch (error) {
      console.error('Error saving video:', error);
      toast.error('Failed to save video');
    }
  };

  const openVideoDialog = (row: MediaGridRow) => {
    setSelectedRowId(row.id);
    setVideoUrl(row.video_url || "");
    setVideoDialogOpen(true);
  };

  const getGridCols = (layout: string) => {
    switch (layout) {
      case '1': return 'grid-cols-1';
      case '2': return 'grid-cols-2';
      case '3': return 'grid-cols-3';
      default: return 'grid-cols-1';
    }
  };

  if (mediaRows.length === 0 && !isAdmin) {
    return null;
  }

  return (
    <div className="space-y-4 mt-4">
      {/* Existing media rows */}
      {mediaRows.map((row) => (
        <div key={row.id} className="relative border rounded-lg p-3 bg-muted/30">
          {/* Video indicator */}
          {row.video_url && (
            <button
              onClick={() => window.open(row.video_url, '_blank')}
              className="absolute top-2 right-2 z-10 bg-primary/90 hover:bg-primary p-1.5 rounded-md transition-colors"
            >
              <Video className="h-4 w-4 text-primary-foreground" />
            </button>
          )}

          {/* Image grid */}
          <div className={`grid ${getGridCols(row.layout)} gap-2`}>
            {row.images.map((img, idx) => (
              <div key={idx} className="relative aspect-video bg-muted rounded-lg overflow-hidden group">
                <img
                  src={img.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
                {isAdmin && (
                  <button
                    onClick={() => handleRemoveImage(row.id, idx)}
                    className="absolute top-1 right-1 bg-destructive/90 hover:bg-destructive p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3 text-destructive-foreground" />
                  </button>
                )}
              </div>
            ))}

            {/* Add image placeholders */}
            {isAdmin && row.images.length < parseInt(row.layout) && (
              Array.from({ length: parseInt(row.layout) - row.images.length }).map((_, idx) => (
                <label
                  key={`placeholder-${idx}`}
                  className="aspect-video bg-muted/50 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(row.id, file);
                    }}
                    disabled={uploading}
                  />
                  {uploading && uploadingRowId === row.id ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  )}
                </label>
              ))
            )}
          </div>

          {/* Admin controls */}
          {isAdmin && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openVideoDialog(row)}
                className="text-xs"
              >
                <Video className="h-3 w-3 mr-1" />
                {row.video_url ? 'Edit Video' : 'Add Video'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteRow(row.id)}
                className="text-xs text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete Row
              </Button>
            </div>
          )}
        </div>
      ))}

      {/* Add new row buttons */}
      {isAdmin && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center mr-2">Add media row:</span>
          {LAYOUT_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant="outline"
              size="sm"
              onClick={() => handleAddRow(option.value)}
              className="text-xs"
            >
              <Image className="h-3 w-3 mr-1" />
              {option.label}
            </Button>
          ))}
        </div>
      )}

      {/* Video URL Dialog */}
      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Video URL</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Video URL (YouTube, Vimeo, or direct link)</Label>
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVideoDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveVideo}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
