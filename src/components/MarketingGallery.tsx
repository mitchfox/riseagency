import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollReveal } from "@/components/ScrollReveal";

interface GalleryItem {
  id: string;
  title: string;
  file_url: string;
  file_type: string;
  category: string;
  thumbnail_url: string | null;
}

const gallerySpans = [
  "col-span-2 row-span-1",    // Wide
  "col-span-1 row-span-1",    // Square
  "col-span-1 row-span-2",    // Tall
  "col-span-1 row-span-1",    // Square
  "col-span-2 row-span-1",    // Wide
  "col-span-1 row-span-1",    // Square
];

export const MarketingGallery = () => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGallery = async () => {
      const { data, error } = await supabase
        .from("marketing_gallery")
        .select("*")
        .eq("file_type", "image")
        .order("created_at", { ascending: false })
        .limit(6);

      if (!error && data) {
        setItems(data);
      }
      setLoading(false);
    };

    fetchGallery();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className={`${gallerySpans[i]} bg-muted animate-pulse rounded-lg aspect-[4/3]`} />
        ))}
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 auto-rows-[200px] md:auto-rows-[250px]">
        {items.map((item, index) => (
          <ScrollReveal 
            key={item.id} 
            delay={index * 0.1}
            className={gallerySpans[index % gallerySpans.length]}
          >
            <div 
              className="relative w-full h-full overflow-hidden rounded-lg group cursor-pointer"
              onClick={() => setSelectedItem(item)}
            >
              <img 
                src={item.thumbnail_url || item.file_url} 
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300" />
              <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <span className="text-xs font-bebas uppercase tracking-wider text-primary">
                  {item.category}
                </span>
                <h4 className="text-sm font-bebas uppercase tracking-wider text-white">
                  {item.title}
                </h4>
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>

      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-none">
          {selectedItem && (
            <img 
              src={selectedItem.file_url} 
              alt={selectedItem.title}
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
