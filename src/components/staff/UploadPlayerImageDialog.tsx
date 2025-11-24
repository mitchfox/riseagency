import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface UploadPlayerImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerName: string;
  playerId: string;
  onUploadComplete: () => void;
}

export function UploadPlayerImageDialog({
  open,
  onOpenChange,
  playerName,
  playerId,
  onUploadComplete
}: UploadPlayerImageDialogProps) {
  const [title, setTitle] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      if (!title.trim()) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (!imageFile) {
      toast.error("Please select an image file");
      return;
    }

    if (!playerId) {
      toast.error("Invalid player ID");
      console.error("Upload attempted with NULL playerId:", playerId);
      return;
    }

    console.log("Uploading image for player:", { playerId, playerName, title: title.trim() });
    setUploading(true);

    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `players/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('marketing-gallery')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('marketing-gallery')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('marketing_gallery')
        .insert({
          title: `${playerName} - ${title.trim()}`,
          file_url: publicUrl,
          file_type: 'image',
          category: 'players',
          player_id: playerId
        });

      if (dbError) throw dbError;

      toast.success("Image uploaded successfully!");
      setTitle("");
      setImageFile(null);
      setImagePreview("");
      onOpenChange(false);
      // Give a brief delay to ensure DB updates before triggering refresh
      setTimeout(() => {
        onUploadComplete();
      }, 100);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => !uploading && onOpenChange(newOpen)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Image for {playerName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="imageTitle">Title *</Label>
            <Input
              id="imageTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter image title"
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label>Image File *</Label>
            {imagePreview ? (
              <div className="relative rounded border border-border overflow-hidden bg-muted">
                <img src={imagePreview} alt="Preview" className="w-full h-auto" />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2 w-8 h-8"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview("");
                  }}
                  disabled={uploading}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full h-32"
                onClick={() => document.getElementById('image-upload')?.click()}
                disabled={uploading}
              >
                <ImageIcon className="w-8 h-8" />
              </Button>
            )}
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
              disabled={uploading}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !title.trim() || !imageFile}
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}