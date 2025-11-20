import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface UploadHighlightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoFile: File;
  playerEmail: string;
  onUploadComplete: () => void;
  highlightType: "match" | "best";
}

export function UploadHighlightDialog({
  open,
  onOpenChange,
  videoFile,
  playerEmail,
  onUploadComplete,
  highlightType
}: UploadHighlightDialogProps) {
  const [clipName, setClipName] = useState(videoFile.name.replace(/\.[^/.]+$/, ''));
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!clipName.trim()) {
      toast.error("Please enter a clip name");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', videoFile);
      formData.append('playerEmail', playerEmail);
      formData.append('clipName', clipName.trim());
      formData.append('highlightType', highlightType);
      if (logoFile) {
        formData.append('logo', logoFile);
      }

      const response = await fetch(
        'https://qwethimbtaamlhbajmal.supabase.co/functions/v1/upload-player-highlight',
        {
          method: 'POST',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      toast.success(`Successfully uploaded ${clipName}`);
      onUploadComplete();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload highlight');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload {highlightType === "match" ? "Match" : "Best Clip"} Highlight</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clipName">Clip Name *</Label>
            <Input
              id="clipName"
              value={clipName}
              onChange={(e) => setClipName(e.target.value)}
              placeholder="Enter clip name"
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label>Logo (Optional)</Label>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <div className="relative w-24 h-24 rounded border border-border overflow-hidden bg-muted">
                  <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain" />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-1 right-1 w-6 h-6"
                    onClick={() => {
                      setLogoFile(null);
                      setLogoPreview("");
                    }}
                    disabled={uploading}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-24 h-24"
                  onClick={() => document.getElementById('logo-upload')?.click()}
                  disabled={uploading}
                >
                  <ImageIcon className="w-6 h-6" />
                </Button>
              )}
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoSelect}
                disabled={uploading}
              />
              <div className="flex-1 text-sm text-muted-foreground">
                {logoFile ? logoFile.name : "Click to upload a logo"}
              </div>
            </div>
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
              disabled={uploading || !clipName.trim()}
            >
              {uploading ? (
                <>Uploading...</>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
