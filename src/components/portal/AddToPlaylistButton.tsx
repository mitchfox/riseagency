import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ListPlus, Loader2, Plus, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { invokeEdgeFunction } from "@/lib/edgeFunctionHelper";

interface Playlist {
  id: string;
  name: string;
  clips: Array<{ id?: string; videoUrl?: string }>;
  is_favourite?: boolean;
}

interface Props {
  playerId: string;
  clip: { name: string; videoUrl: string };
  /** Identify caller: player session uses email, highlight maker uses username. */
  playerEmail?: string;
  makerUsername?: string;
  /** Caller is staff (Lovable Cloud auth) — bypasses player/maker auth check. */
  asStaff?: boolean;
  /** Restrict to starred playlists only (used by performance reports). */
  starredOnly?: boolean;
  /** Allow creating new playlists from this popover. */
  allowCreate?: boolean;
  size?: "sm" | "icon";
  className?: string;
  onAdded?: () => void;
}

export const AddToPlaylistButton = ({
  playerId,
  clip,
  playerEmail,
  makerUsername,
  asStaff,
  starredOnly,
  allowCreate = true,
  size = "icon",
  className,
  onAdded,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !playerId) return;
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await invokeEdgeFunction("playlist-manage", {
          body: { action: "listForPlayer", playerId, playerEmail, makerUsername, starredOnly },
        });
        if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
        setPlaylists((data as any).playlists || []);
      } catch (e: any) {
        console.error("[AddToPlaylistButton] list failed", e);
        toast.error(e?.message || "Could not load playlists");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, playerId, playerEmail, makerUsername, starredOnly]);

  const addTo = async (pl: Playlist) => {
    setBusyId(pl.id);
    try {
      const { data, error } = await invokeEdgeFunction("playlist-manage", {
        body: { action: "addClip", playlistId: pl.id, playerEmail, makerUsername, clip },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      if ((data as any).alreadyPresent) {
        toast.info(`Already in “${pl.name}”`);
      } else {
        toast.success(`Added “${clip.name}” to ${pl.name}`);
        onAdded?.();
      }
      setOpen(false);
    } catch (e: any) {
      console.error("[AddToPlaylistButton] addClip failed", e);
      toast.error(e?.message || "Could not add to playlist");
    } finally {
      setBusyId(null);
    }
  };

  const createAndAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setBusyId("__create__");
    try {
      const { data, error } = await invokeEdgeFunction("playlist-manage", {
        body: { action: "create", playerId, name: trimmed, playerEmail, makerUsername, clip, isFavourite: starredOnly },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast.success(`Created “${trimmed}” and added “${clip.name}”`);
      setNewName("");
      setCreating(false);
      setOpen(false);
      onAdded?.();
    } catch (e: any) {
      console.error("[AddToPlaylistButton] create failed", e);
      toast.error(e?.message || "Could not create playlist");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          size={size}
          variant="ghost"
          className={className}
          title={starredOnly ? "Add to a starred playlist" : "Add to playlist"}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setOpen((v) => !v);
          }}
        >
          <ListPlus className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-2 z-[200]"
        onClick={(e) => e.stopPropagation()}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="text-xs uppercase tracking-widest text-muted-foreground px-2 py-1">
          {starredOnly ? "Add to starred playlist" : "Add to playlist"}
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-0.5">
            {playlists.length === 0 ? (
              <div className="px-2 py-3 text-xs text-muted-foreground">
                {starredOnly ? "No starred playlists yet." : "No playlists yet."}
              </div>
            ) : (
              playlists.map((pl) => {
                const already = (pl.clips || []).some((c) => c.videoUrl === clip.videoUrl);
                return (
                  <button
                    key={pl.id}
                    type="button"
                    disabled={already || busyId === pl.id}
                    onClick={() => addTo(pl)}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-muted/40 text-left text-sm disabled:opacity-50"
                  >
                    {pl.is_favourite && <Star className="w-3.5 h-3.5 fill-[#C6A332] text-[#C6A332]" />}
                    <span className="flex-1 truncate">{pl.name}</span>
                    {already ? (
                      <span className="text-[10px] text-muted-foreground">Added</span>
                    ) : busyId === pl.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        )}
        {allowCreate && (
          <div className="border-t border-border mt-1 pt-1">
            {creating ? (
              <div className="flex items-center gap-1.5 p-1.5">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="New playlist name"
                  className="h-8 text-sm"
                  onKeyDown={(e) => { if (e.key === "Enter") createAndAdd(); }}
                  autoFocus
                />
                <Button size="sm" className="h-8" onClick={createAndAdd} disabled={!newName.trim() || busyId === "__create__"}>
                  {busyId === "__create__" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add"}
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-muted/40 text-left text-sm text-primary"
              >
                <Plus className="w-3.5 h-3.5" /> New playlist
              </button>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};