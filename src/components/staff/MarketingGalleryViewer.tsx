import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Download, Search, ImageIcon, Film, Play, X } from "lucide-react";
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
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(4);
  const PAGE = 4;

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

  // Reset paging whenever the active filter set changes so users
  // don't end up scrolled past the new shorter result list.
  useEffect(() => { setVisibleCount(PAGE); }, [query, tab, activeFilters]);

  // Smart filter chips — pull capitalised name-like tokens from the
  // titles/descriptions/categories of the items in the current tab
  // and keep the ones that appear in two or more assets.
  const smartFilters = useMemo(() => {
    const counts = new Map<string, number>();
    const stop = new Set([
      "The","And","For","With","From","Rise","Player","Players","Video","Image","Photo",
      "Match","Goal","Goals","Clip","Story","Final","Highlights","Highlight","Reel","Vs","Of",
    ]);
    const tabItems = items.filter((it) => (tab === "images" ? it.file_type === "image" : it.file_type === "video"));
    for (const it of tabItems) {
      const text = `${it.title || ""} ${it.description || ""} ${it.category || ""}`;
      const tokens = text.match(/\b[A-Z][a-zA-Z'’-]{2,}\b/g) || [];
      const seen = new Set<string>();
      for (const raw of tokens) {
        const tok = raw.replace(/[’']s$/, "");
        if (stop.has(tok)) continue;
        if (seen.has(tok)) continue;
        seen.add(tok);
        counts.set(tok, (counts.get(tok) || 0) + 1);
      }
    }
    return [...counts.entries()]
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, n]) => ({ name, count: n }));
  }, [items, tab]);

  const toggleFilter = (name: string) =>
    setActiveFilters((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filters = activeFilters.map((f) => f.toLowerCase());
    return items
      .filter((it) => (tab === "images" ? it.file_type === "image" : it.file_type === "video"))
      .filter((it) =>
        !q
          ? true
          : (it.title || "").toLowerCase().includes(q) ||
            (it.description || "").toLowerCase().includes(q) ||
            (it.category || "").toLowerCase().includes(q)
      )
      .filter((it) => {
        if (filters.length === 0) return true;
        const hay = `${it.title || ""} ${it.description || ""} ${it.category || ""}`.toLowerCase();
        // Any-match: a chip narrows down to anything tagged with that name.
        return filters.some((f) => hay.includes(f));
      });
  }, [items, query, tab, activeFilters]);

  const visibleItems = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

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

      {smartFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground mr-1">Filter</span>
          {smartFilters.map(({ name, count }) => {
            const on = activeFilters.includes(name);
            return (
              <button
                key={name}
                type="button"
                onClick={() => toggleFilter(name)}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  on
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                {name}
                <span className={`text-[10px] ${on ? "text-primary/70" : "text-muted-foreground"}`}>{count}</span>
              </button>
            );
          })}
          {activeFilters.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveFilters([])}
              className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted/50"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-center text-muted-foreground py-12">Loading gallery...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No {tab} found.</p>
      ) : (
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visibleItems.map((item) => (
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
                    decoding="async"
                  />
                ) : (
                  <video
                    src={item.file_url}
                    className="w-full h-full object-cover"
                    controls
                    preload="none"
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
        <div className="flex flex-col items-center gap-2 pt-4">
          <p className="text-xs text-muted-foreground">
            Showing {visibleItems.length} of {filtered.length}
          </p>
          {hasMore && (
            <Button variant="outline" onClick={() => setVisibleCount((c) => c + PAGE)}>
              Load {Math.min(PAGE, filtered.length - visibleCount)} more
            </Button>
          )}
        </div>
        </>
      )}
    </div>
  );
};

export default MarketingGalleryViewer;