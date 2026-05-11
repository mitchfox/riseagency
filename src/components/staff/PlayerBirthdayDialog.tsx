import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Cake, PartyPopper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PlayerNotesBoard } from "./PlayerNotesBoard";
import { Badge } from "@/components/ui/badge";

export interface PlayerBirthdayDetail {
  player_id?: string;
  player_key?: string;
  player_name?: string;
  age?: number;
  club?: string | null;
  source?: string;
  date_of_birth?: string;
}

const buildPlayerKey = (name?: string | null, dob?: string | null) =>
  name && dob ? `${name.trim().toLowerCase()}::${dob}` : "";

export const PlayerBirthdayDialog = () => {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<PlayerBirthdayDetail | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<PlayerBirthdayDetail>;
      if (!ce.detail) return;
      setDetail(ce.detail);
      setImageUrl(null);
      setOpen(true);
    };
    window.addEventListener("openPlayerBirthday", handler as EventListener);
    return () => window.removeEventListener("openPlayerBirthday", handler as EventListener);
  }, []);

  useEffect(() => {
    if (!detail?.player_id || !detail?.source) return;
    const table =
      detail.source === "scouting"
        ? "scouting_reports"
        : detail.source === "youth"
        ? "player_outreach_youth"
        : detail.source === "pro"
        ? "player_outreach_pro"
        : null;
    if (!table) return;
    (async () => {
      const { data } = await (supabase.from as any)(table)
        .select("profile_image_url")
        .eq("id", detail.player_id)
        .maybeSingle();
      if (data?.profile_image_url) setImageUrl(data.profile_image_url);
    })();
  }, [detail]);

  if (!detail) return null;

  const playerKey =
    detail.player_key || buildPlayerKey(detail.player_name, detail.date_of_birth);
  const initials = (detail.player_name || "?")
    .split(" ")
    .map(n => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PartyPopper className="h-5 w-5 text-amber-400" />
            Player Birthday
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {imageUrl && <AvatarImage src={imageUrl} />}
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="text-lg font-bold">{detail.player_name}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="secondary" className="gap-1">
                <Cake className="h-3 w-3" /> Turns {detail.age ?? "?"} today
              </Badge>
              {detail.club && <Badge variant="outline">{detail.club}</Badge>}
              {detail.source && (
                <Badge variant="outline" className="capitalize">{detail.source}</Badge>
              )}
              {detail.date_of_birth && (
                <span className="text-xs text-muted-foreground">
                  DOB {new Date(detail.date_of_birth).toLocaleDateString("en-GB")}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border/40 mt-4">
          {playerKey ? (
            <PlayerNotesBoard
              playerKey={playerKey}
              playerName={detail.player_name}
              source={detail.source}
              sourceId={detail.player_id}
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              No player key available — open this player from the database to add notes.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};