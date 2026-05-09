import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, X, Upload } from "lucide-react";
import { toast } from "sonner";

interface Props {
  playerId: string | null;
  values: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}

export const PlayerReferenceImagesUploader = ({ playerId, values, onChange, max = 10 }: Props) => {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<string[]>(values || []);

  useEffect(() => { setItems(values || []); }, [values]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = max - items.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${max} reference images`);
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const next = [...items];
      for (const file of toUpload) {
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `players/reference/${playerId || 'unassigned'}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from('marketing-gallery').upload(path, file, { upsert: false });
        if (error) {
          toast.error(error.message);
          continue;
        }
        const { data } = supabase.storage.from('marketing-gallery').getPublicUrl(path);
        next.push(data.publicUrl);
      }
      setItems(next);
      onChange(next);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = (idx: number) => {
    const next = items.filter((_, i) => i !== idx);
    setItems(next);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {items.map((url, idx) => (
          <div key={`${url}-${idx}`} className="relative h-20 w-20 rounded border border-border overflow-hidden bg-muted group">
            <img src={url} alt={`Reference ${idx + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remove(idx)}
              className="absolute top-0.5 right-0.5 rounded-full bg-destructive text-destructive-foreground p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove reference image"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {items.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="h-20 w-20 rounded border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            aria-label="Add reference image"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{items.length}/{max} reference images. The AI uses these as visual anchors to find this player in match footage.</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
};
