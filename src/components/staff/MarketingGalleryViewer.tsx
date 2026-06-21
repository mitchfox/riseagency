import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Download, Search, ImageIcon, Film, Play } from "lucide-react";
import { toast } from "sonner";

interface GalleryItem {
  id: string;
  title: string | null;
  description: string | null;
  file_url: string;
  file_type: string;
  category: string | null;
  player_id: string | null;
  created_at: string;
}

const downloadUrl = (url: string) =>
  url.includes("supabase.co/storage")
    ? `${url}${url.includes("?") ? "&" : "?"}download=`
    : url;

const handleDownload = async (item: GalleryItem) => {
  try {
    const link = document.createElement("a");
    link.href = downloadUrl(item.file_url);
    link.download = item.title || (item.file_type === "video" ? "video" : "image");
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) {
    console.error(e);
    toast.error("Download failed");
  }
};

export const MarketingGalleryViewer = () => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"images" | "videos">("images");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("marketing_gallery")
        .select("id, title, description, file_url, file_type, category, player_id, created_at")
        .order("created_at", { ascending: false });
      if (error) {
        console.error(error);
        toast.error("Failed to load gallery");
      } else {
        setItems((data || []) as GalleryItem[]);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((it) => (tab === "images" ? it.file_type === "image" : it.file_type === "video"))
      .filter((it) =>
        !q
          ? true
          : (it.title || "").toLowerCase().includes(q) ||
            (it.description || "").toLowerCase().includes(q) ||
            (it.category || "").toLowerCase().includes(q)
      );
  }, [items, query, tab]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Marketing Gallery</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse and download approved Rise marketing assets.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, description or category"
            className="pl-9"
          />
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "images" | "videos")}>
          <TabsList>
            <TabsTrigger value="images" className="gap-2">
              <ImageIcon className="w-4 h-4" /> Images
            </TabsTrigger>
            <TabsTrigger value="videos" className="gap-2">
              <Film className="w-4 h-4" /> Videos
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-12">Loading gallery...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No {tab} found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="border border-border rounded-lg overflow-hidden bg-card hover:border-primary/50 transition-colors flex flex-col"
            >
              <div className="w-full bg-muted relative" style={{ aspectRatio: "16/9" }}>
                {item.file_type === "image" ? (
                  <img
                    src={item.file_url}
                    alt={item.title || "Marketing asset"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <video
                    src={item.file_url}
                    className="w-full h-full object-cover"
                    controls
                    preload="metadata"
                  />
                )}
                {item.file_type === "video" && (
                  <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                    <Play className="w-3 h-3" /> Video
                  </div>
                )}
              </div>
              <div className="p-3 space-y-2 flex-1 flex flex-col">
                <p className="text-sm font-medium line-clamp-2">{item.title || "Untitled"}</p>
                {item.category && (
                  <p className="text-xs text-muted-foreground capitalize">{item.category}</p>
                )}
                <div className="flex-1" />
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => handleDownload(item)}
                >
                  <Download className="w-4 h-4 mr-2" /> Download
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MarketingGalleryViewer;