import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Image as ImageIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface EditHighlightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerId: string;
  highlightType: "match" | "best";
  highlight: {
    id: string;
    name: string;
    videoUrl: string;
    logoUrl?: string | null;
  };
  onSave: () => void;
}

export function EditHighlightDialog({
  open,
  onOpenChange,
  playerId,
  highlightType,
  highlight,
  onSave
}: EditHighlightDialogProps) {
  const [clipName, setClipName] = useState(highlight.name);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(highlight.logoUrl || null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setClipName(highlight.name);
    setLogoPreview(highlight.logoUrl || null);
    setLogoFile(null);
  }, [highlight]);

  const handleLogoSelect = (file: File) => {
    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upload new logo if selected
      let logoUrl = logoPreview;
      if (logoFile) {
        const logoFileName = `${playerId}_${Date.now()}_logo_${logoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { error: logoError } = await supabase.storage
          .from('analysis-files')
          .upload(`highlights/logos/${logoFileName}`, logoFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (!logoError) {
          const { data: { publicUrl } } = supabase.storage
            .from('analysis-files')
            .getPublicUrl(`highlights/logos/${logoFileName}`);
          logoUrl = publicUrl;
        }
      }

      // Update player highlights
      const { data: player, error: fetchError } = await supabase
        .from('players')
        .select('highlights')
        .eq('id', playerId)
        .single();

      if (fetchError) throw fetchError;

      const rawHighlights = player?.highlights;
      const highlights = typeof rawHighlights === 'string' 
        ? JSON.parse(rawHighlights) 
        : (rawHighlights || {});
      
      // Handle both array format and object format
      const isArrayFormat = Array.isArray(highlights);
      
      if (isArrayFormat && highlightType === 'match') {
        // Old array format - update directly
        const updatedHighlights = highlights.map((h: any) =>
          (h.id === highlight.id || h.videoUrl === highlight.videoUrl)
            ? { ...h, name: clipName, logoUrl: logoUrl }
            : h
        );
        
        const { error: updateError } = await supabase
          .from('players')
          .update({ highlights: updatedHighlights })
          .eq('id', playerId);

        if (updateError) throw updateError;
      } else {
        // Object format with matchHighlights/bestClips
        const targetArray = highlightType === 'match' ? 'matchHighlights' : 'bestClips';
        const currentHighlights = highlights[targetArray] || [];
        
        const updatedHighlights = {
          ...highlights,
          [targetArray]: currentHighlights.map((h: any) =>
            (h.id === highlight.id || h.videoUrl === highlight.videoUrl)
              ? { ...h, name: clipName, logoUrl: logoUrl }
              : h
          )
        };

        const { error: updateError } = await supabase
          .from('players')
          .update({ highlights: updatedHighlights })
          .eq('id', playerId);

        if (updateError) throw updateError;
      }


      toast.success('Highlight updated successfully');
      onSave();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to update highlight');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Highlight</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="clipName">Title</Label>
            <Input
              id="clipName"
              value={clipName}
              onChange={(e) => setClipName(e.target.value)}
              placeholder="Enter highlight title"
            />
          </div>

          <div className="space-y-2">
            <Label>Club Logo</Label>
            <div className="flex items-center gap-2">
              {logoPreview && (
                <div className="relative">
                  <img 
                    src={logoPreview} 
                    alt="Logo" 
                    className="h-16 w-16 object-contain rounded border" 
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={handleRemoveLogo}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e: any) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoSelect(file);
                  };
                  input.click();
                }}
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                {logoPreview ? 'Change Logo' : 'Add Logo'}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
