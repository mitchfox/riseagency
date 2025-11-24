import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface PlayerImagesProps {
  playerId: string;
  isAdmin: boolean;
}

export const PlayerImages = ({ playerId, isAdmin }: PlayerImagesProps) => {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchImages = async () => {
      const { data, error } = await supabase
        .from('marketing_gallery')
        .select('*')
        .eq('category', 'players')
        .eq('file_type', 'image')
        .or(`player_id.eq.${playerId},player_id.is.null`)
        .order('created_at', { ascending: false });
      
      if (!error) {
        setImages(data || []);
      }
      setLoading(false);
    };
    fetchImages();
  }, [playerId]);
  
  if (loading) {
    return <p className="text-center text-muted-foreground py-8">Loading images...</p>;
  }
  
  return images.length > 0 ? (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
      {images.map((image) => (
        <div key={image.id} className="border rounded-lg p-3 hover:bg-secondary/30 transition-colors space-y-2">
          <div className="w-full" style={{ aspectRatio: '21/9' }}>
            <img 
              src={image.file_url}
              alt={image.title}
              className="w-full h-full object-cover rounded"
            />
          </div>
          <p className="text-sm font-medium truncate">{image.title}</p>
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                if (!confirm('Delete this image from marketing gallery?')) return;
                try {
                  const urlParts = image.file_url.split('/');
                  const filePath = urlParts[urlParts.length - 1];
                  
                  const { error: storageError } = await supabase.storage
                    .from('marketing-gallery')
                    .remove([filePath]);
                  
                  if (storageError) console.error('Storage delete error:', storageError);
                  
                  const { error: dbError } = await supabase
                    .from('marketing_gallery')
                    .delete()
                    .eq('id', image.id);
                  
                  if (dbError) throw dbError;
                  
                  toast.success('Image deleted successfully!');
                  // Refetch images
                  const { data } = await supabase
                    .from('marketing_gallery')
                    .select('*')
                    .eq('category', 'players')
                    .eq('file_type', 'image')
                    .or(`player_id.eq.${playerId},player_id.is.null`)
                    .order('created_at', { ascending: false });
                  setImages(data || []);
                } catch (error: any) {
                  toast.error('Failed to delete: ' + error.message);
                }
              }}
              className="w-full text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      ))}
    </div>
  ) : (
    <p className="text-center text-muted-foreground py-8">No images yet</p>
  );
};
