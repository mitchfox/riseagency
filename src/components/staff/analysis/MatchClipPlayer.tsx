import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { X, SkipForward, SkipBack, Repeat } from "lucide-react";
import { getPlaybackInstruction } from "@/lib/clipVideoUtils";

interface MatchClipPlayerProps {
  analysisId: string;
  playerName: string;
  opponent: string;
  onClose: () => void;
}

interface ClipAction {
  id: string;
  action_type: string;
  action_score: string;
  minute: string;
  description: string;
  video_url: string;
  clip_start: number | null;
  clip_end: number | null;
}

export const MatchClipPlayer = ({ analysisId, playerName, opponent, onClose }: MatchClipPlayerProps) => {
  const [clips, setClips] = useState<ClipAction[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const clipEnforcementRef = useRef<number | null>(null);

  useEffect(() => {
    const fetchClips = async () => {
      const { data } = await supabase
        .from("performance_report_actions")
        .select("id, action_type, action_score, minute, notes, video_url, clip_start, clip_end")
        .eq("analysis_id", analysisId)
        .not("video_url", "is", null)
        .order("display_order", { ascending: true });

      setClips((data || []).map((c: any) => ({ ...c, description: c.notes || '' })).filter((c: any) => c.video_url));
      setLoading(false);
    };
    fetchClips();
  }, [analysisId]);

  useEffect(() => {
    return () => {
      if (clipEnforcementRef.current) clearInterval(clipEnforcementRef.current);
    };
  }, []);

  const currentClip = clips[currentIndex];

  const startEnforcement = useCallback((start: number, end: number) => {
    if (clipEnforcementRef.current) clearInterval(clipEnforcementRef.current);
    clipEnforcementRef.current = window.setInterval(() => {
      const vid = videoRef.current;
      if (!vid) return;
      if (vid.currentTime >= end) {
        vid.currentTime = start;
      }
      if (vid.currentTime < start - 0.5) {
        vid.currentTime = start;
      }
    }, 100);
  }, []);

  const goToClip = useCallback((index: number) => {
    if (clipEnforcementRef.current) clearInterval(clipEnforcementRef.current);
    setCurrentIndex(index);
  }, []);

  // Set up playback whenever currentClip changes
  useEffect(() => {
    const vid = videoRef.current;
    const clip = currentClip;
    if (!vid || !clip) return;

    const instruction = getPlaybackInstruction(clip);
    if (instruction.mode === 'blocked') return;

    vid.src = instruction.src;
    vid.load();

    const onLoaded = () => {
      if (instruction.mode === 'clipped') {
        vid.currentTime = instruction.clipStart;
        startEnforcement(instruction.clipStart, instruction.clipEnd);
      }
      vid.play().catch(() => {});
    };

    vid.addEventListener('loadeddata', onLoaded, { once: true });

    return () => {
      vid.removeEventListener('loadeddata', onLoaded);
    };
  }, [currentClip, startEnforcement]);

  const handleVideoEnded = useCallback(() => {
    // Loop current clip
    const vid = videoRef.current;
    const clip = currentClip;
    if (!vid || !clip) return;
    const instruction = getPlaybackInstruction(clip);
    if (instruction.mode === 'clipped') {
      vid.currentTime = instruction.clipStart;
    } else {
      vid.currentTime = 0;
    }
    vid.play().catch(() => {});
  }, [currentClip]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-white">Loading clips...</div>
      </div>
    );
  }

  if (clips.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center gap-4">
        <p className="text-white">No clips available for this report.</p>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    );
  }

  const getScoreColor = (score: string) => {
    const n = parseFloat(score);
    if (isNaN(n)) return "bg-muted";
    if (n < 0) return "bg-red-950";
    if (n < 0.4) return "bg-red-600";
    if (n < 0.8) return "bg-orange-500";
    if (n < 1.0) return "bg-yellow-400";
    if (n < 1.4) return "bg-lime-400";
    if (n < 1.8) return "bg-green-500";
    return "bg-green-700";
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/80 border-b border-white/10">
        <div className="text-white text-sm font-medium">
          {playerName} vs {opponent} — Clip {currentIndex + 1}/{clips.length}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:text-white/80"
            disabled={currentIndex === 0}
            onClick={() => goToClip(currentIndex - 1)}
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:text-white/80"
            disabled={currentIndex >= clips.length - 1}
            onClick={() => goToClip(currentIndex + 1)}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-white hover:text-white/80" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Video */}
      <div className="flex-1 flex items-center justify-center bg-black min-h-0">
        {currentClip && (
          <video
            ref={videoRef}
            key={currentClip.video_url}
            src={getEditPlaybackUrl(currentClip) || ''}
            controls
            autoPlay
            onEnded={handleVideoEnded}
            className="max-h-full max-w-full"
          />
        )}
      </div>

      {/* Action info bar */}
      {currentClip && (
        <div className="px-4 py-2 bg-black/80 border-t border-white/10 flex items-center gap-3">
          <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${getScoreColor(currentClip.action_score)}`}>
            {currentClip.action_score || "—"}
          </span>
          <span className="text-white text-sm font-medium">{currentClip.action_type}</span>
          {currentClip.minute && <span className="text-white/60 text-xs">{currentClip.minute}'</span>}
          <Repeat className="h-3 w-3 text-white/40 ml-auto" />
          <span className="text-white/40 text-xs">Looping</span>
        </div>
      )}

      {/* Clip list */}
      <div className="max-h-[200px] overflow-y-auto bg-black/90 border-t border-white/10">
        {clips.map((clip, i) => (
          <button
            key={clip.id}
            onClick={() => goToClip(i)}
            className={`w-full text-left px-4 py-2 flex items-center gap-3 text-sm transition-colors ${
              i === currentIndex ? "bg-primary/20 text-primary" : "text-white/70 hover:bg-white/5"
            }`}
          >
            <span className="w-6 text-center text-xs font-mono">{i + 1}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${getScoreColor(clip.action_score)}`}>
              {clip.action_score || "—"}
            </span>
            <span className="font-medium truncate">{clip.action_type}</span>
            {clip.minute && <span className="text-white/40 text-xs ml-auto">{clip.minute}'</span>}
          </button>
        ))}
      </div>
    </div>
  );
};
