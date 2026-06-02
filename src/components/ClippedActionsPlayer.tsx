import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, SkipBack, SkipForward, Play, Pause, Loader2, ChevronUp, ChevronDown, Download, DownloadCloud, Star } from 'lucide-react';
import { t } from '@/lib/portalTranslations';
import { sortReportActionsChronologically } from '@/lib/reportActionHelpers';
import { useSharedClipPlayer, type SharedClipPlayerState } from '@/hooks/useSharedClipPlayer';
import { toast } from 'sonner';
import { toTitleCase } from '@/lib/titleCase';
import { isFullMatchUrl } from '@/lib/clipVideoUtils';
import { AddToPlaylistButton } from '@/components/portal/AddToPlaylistButton';
import { useAutoTranslateStrings } from '@/hooks/useAutoTranslateStrings';
import { Input } from '@/components/ui/input';
import { getR90Grade } from '@/lib/gradeCalculations';

interface ClipAction {
  id: string;
  action_number: number;
  action_type: string;
  action_description: string;
  video_url: string;
  minute: number;
  notes?: string | null;
  clip_start?: number | null;
  clip_end?: number | null;
  clip_logo_url?: string | null;
  action_score?: number | null;
}

interface ClippedActionsPlayerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clips: ClipAction[];
  language?: string;
  title?: string;
  player?: SharedClipPlayerState;
  showDownloads?: boolean;
  onDownloadCurrent?: (clip: ClipAction) => void;
  onDownloadAll?: (clips: ClipAction[]) => void;
  onSaveToBest?: (clip: ClipAction) => void;
  savingClipId?: string | null;
  /** When provided, shows an Add-to-Playlist button per clip (staff context). */
  playerId?: string;
  /** Player email — when provided, AddToPlaylist runs in player (not staff) context. */
  playerEmail?: string;
  /** "playlist" mode: show flat ordered list with reorder-by-number input. */
  mode?: 'report' | 'playlist';
  /** Playlist reorder callback (1-based target position). */
  onReorderClip?: (fromIndex: number, toPosition: number) => void;
  /** Remove clip from playlist callback. */
  onRemoveClip?: (index: number) => void;
}

const normaliseType = (t: string) => (t || '').trim().toLowerCase().replace(/\s+/g, ' ');

const categoriseAction = (type: string): string => {
  const lower = (type || '').toLowerCase();
  const keyPatterns: Record<string, string[]> = {
    'Key Actions': ['goal', 'assist', 'key pass', 'penalty', 'big chance', 'chance created'],
    'Offensive': ['shot', 'cross', 'dribble', 'pass', 'carry', 'through ball', 'progressive', 'touch', 'ball retention', 'chance', 'attacking', 'offensive', 'forward'],
    'Defensive': ['tackle', 'interception', 'clearance', 'block', 'header', 'recovery', 'regain', 'defensive', 'press', 'duel'],
  };
  for (const [cat, patterns] of Object.entries(keyPatterns)) {
    if (patterns.some(p => lower.includes(p))) return cat;
  }
  return 'Other';
};

export const ClippedActionsPlayer = ({
  open,
  onOpenChange,
  clips,
  language = "en",
  title,
  player: providedPlayer,
  showDownloads,
  onDownloadCurrent,
  onDownloadAll,
  onSaveToBest,
  savingClipId,
  playerId,
  playerEmail,
  mode = 'report',
  onReorderClip,
  onRemoveClip,
}: ClippedActionsPlayerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [swipeY, setSwipeY] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const touchStartY = useRef(0);
  const [showClipList, setShowClipList] = useState(true);
  const clipListRef = useRef<HTMLDivElement>(null);
  const [movePosById, setMovePosById] = useState<Record<string, string>>({});
  const currentClipIdRef = useRef<string | null>(null);

  const localPlayer = useSharedClipPlayer();
  const player = providedPlayer ?? localPlayer;

  const sortedClips = useMemo(
    () => (mode === 'playlist'
      ? clips.filter((c) => !!c.video_url)
      : sortReportActionsChronologically(clips).filter((clip) => !!clip.video_url)),
    [clips, mode]
  );

  // When the clip list reorders (e.g. user moved a clip), keep currentIndex
  // pointing at the clip the user was actually on so the highlighted row,
  // counter, and "▶" marker all stay in sync without remounting the player.
  useEffect(() => {
    const trackedId = currentClipIdRef.current;
    if (!trackedId) return;
    const newIdx = sortedClips.findIndex((c) => c.id === trackedId);
    if (newIdx >= 0 && newIdx !== currentIndex) {
      setCurrentIndex(newIdx);
    }
  }, [sortedClips]);

  // Auto-translate action descriptions + notes to the player's portal language
  const translatableStrings = useMemo(
    () => sortedClips.flatMap((c) => [c.action_description, c.notes || null]).filter((s): s is string => !!s),
    [sortedClips]
  );
  const { translate: trText } = useAutoTranslateStrings(translatableStrings, language);

  // Deduplicate + categorise
  const categorisedClips = useMemo(() => {
    if (mode === 'playlist') return {} as Record<string, typeof sortedClips>;
    const seen = new Map<string, number>();
    const deduped: typeof sortedClips = [];
    for (const clip of sortedClips) {
      const key = normaliseType(clip.action_type);
      if (!seen.has(key) || seen.get(key) !== clip.action_number) {
        deduped.push(clip);
        seen.set(key, clip.action_number);
      }
    }

    const categories: Record<string, typeof sortedClips> = {};
    for (const clip of deduped) {
      const rawType = clip.action_type || 'Other';
      const types = rawType.split(',').map(t => t.trim());
      const cat = categoriseAction(types[0] || rawType);
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(clip);
    }
    return categories;
  }, [sortedClips, mode]);

  const currentClip = sortedClips[currentIndex];
  const hasTimeRange = currentClip?.clip_start != null && currentClip?.clip_end != null && currentClip.clip_end > currentClip.clip_start;
  const isStandaloneClip = !!currentClip?.video_url && !hasTimeRange && !isFullMatchUrl(currentClip.video_url);

  // Track the id of the clip currently playing so we can re-locate it after a
  // reorder (see the sortedClips effect above).
  useEffect(() => {
    if (currentClip?.id) currentClipIdRef.current = currentClip.id;
  }, [currentClip?.id]);

  const playClipFn = player.playClip;
  const stopFn = player.stop;
  const clipError = player.clipError;

  // Only react to open/close transitions. Depending on `stopFn`, `onOpenChange`
  // or `sortedClips.length` here used to re-fire on every parent re-render,
  // snapping the viewer back to clip #1 whenever the parent reshuffled the
  // clips array (e.g. after async metadata loaded).
  useEffect(() => {
    if (open) {
      if (sortedClips.length === 0) {
        toast.error('No valid clips available. Full match playback has been blocked.');
        onOpenChange(false);
        return;
      }
      setCurrentIndex(0);
      currentClipIdRef.current = sortedClips[0]?.id ?? null;
    } else {
      stopFn();
      currentClipIdRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !currentClip) return;
    if (hasTimeRange) {
      playClipFn({
        videoUrl: currentClip.video_url,
        clipStart: currentClip.clip_start!,
        clipEnd: currentClip.clip_end!,
      });
    }
  }, [open, currentClip, hasTimeRange, playClipFn]);

  useEffect(() => {
    if (!open || !clipError) return;
    toast.error(clipError);
    onOpenChange(false);
  }, [open, clipError, onOpenChange]);

  useEffect(() => {
    if (!hasTimeRange || !player.isPlaying) return;
    if (player.progress >= 1 && !player.isPlaying) {
      if (currentIndex < sortedClips.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }
    }
  }, [player.progress, player.isPlaying, hasTimeRange, currentIndex, sortedClips.length]);

  // Scroll active clip into view
  useEffect(() => {
    if (!clipListRef.current) return;
    const activeEl = clipListRef.current.querySelector('[data-active="true"]');
    if (activeEl) activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentIndex]);

  const handlePrevious = () => { if (currentIndex > 0) setCurrentIndex(prev => prev - 1); };
  const handleNext = () => { if (currentIndex < sortedClips.length - 1) setCurrentIndex(prev => prev + 1); };

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !hasTimeRange) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    player.seekToRatio(ratio);
  }, [hasTimeRange, player]);

  if (!currentClip) return null;

  const handleTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; setSwiping(true); };
  const handleTouchMove = (e: React.TouchEvent) => { if (!swiping) return; setSwipeY(Math.max(0, e.touches[0].clientY - touchStartY.current)); };
  const handleTouchEnd = () => { if (swipeY > 120) onOpenChange(false); setSwipeY(0); setSwiping(false); };

  const formatMinute = (minute: number) => {
    const minPart = Math.floor(minute);
    const secPart = Math.round((minute - minPart) * 100);
    return `${minPart}.${secPart.toString().padStart(2, '0')}`;
  };

  const jumpToClip = (clipId: string) => {
    const idx = sortedClips.findIndex(c => c.id === clipId);
    if (idx >= 0) jumpToIndex(idx);
  };
  const jumpToIndex = (idx: number) => {
    if (idx < 0 || idx >= sortedClips.length) return;
    setCurrentIndex(idx);
    const target = sortedClips[idx];
    if (target?.id) currentClipIdRef.current = target.id;
  };

  const categoryOrder = ['Key Actions', 'Offensive', 'Defensive', 'Other'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: swipeY > 0 ? `translateY(${swipeY}px)` : undefined, opacity: swipeY > 0 ? Math.max(0.3, 1 - swipeY / 300) : 1, transition: swiping ? 'none' : 'transform 0.3s ease, opacity 0.3s ease' }}
        className="fixed inset-0 !left-0 !top-0 !translate-x-0 !translate-y-0 w-screen h-screen max-w-none max-h-none p-0 bg-black border-0 rounded-none flex flex-col overflow-hidden z-[200] data-[state=open]:!animate-none data-[state=closed]:!animate-none data-[state=open]:!slide-in-from-left-0 data-[state=open]:!slide-in-from-top-0 [&>button.absolute]:hidden">
        <DialogTitle className="sr-only">{t(language, "full_match_video")}</DialogTitle>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 pt-[calc(env(safe-area-inset-top)+12px)] md:pt-2 bg-black/80 border-b border-border/30 shrink-0">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-bold mt-0.5 shrink-0">
              {currentIndex + 1}/{sortedClips.length}
            </span>
            {currentClip.clip_logo_url && (
              <img
                src={currentClip.clip_logo_url}
                alt="Club logo"
                className="w-7 h-7 object-contain shrink-0 mt-0.5"
                loading="lazy"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-white text-sm font-semibold truncate">{title || currentClip.action_type}</div>
              <div className="text-white/70 text-xs truncate flex items-center gap-1.5">
                <span>{formatMinute(currentClip.minute)}' • {currentClip.action_type}</span>
                {currentClip.action_score != null && (() => {
                  const g = getR90Grade(currentClip.action_score);
                  return (
                    <span
                      className="inline-flex items-center justify-center min-w-[34px] px-1.5 py-[1px] rounded-full text-[10px] font-bold text-black"
                      style={{ backgroundColor: g.color }}
                      title={`R90 ${currentClip.action_score.toFixed(2)} (${g.grade})`}
                    >
                      {currentClip.action_score.toFixed(2)}
                    </span>
                  );
                })()}
              </div>
              {currentClip.action_description && (
                <div className="mt-1 text-white/85 text-xs leading-snug">
                  <p className="line-clamp-2">{trText(currentClip.action_description)}</p>
                </div>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-white hover:text-white hover:bg-white/20 h-10 w-10 min-w-[40px] shrink-0">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Controls - above video */}
        <div className="bg-black/90 border-b border-border/30 px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={handlePrevious} disabled={currentIndex === 0}>
              <SkipBack className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-10 w-10" onClick={player.togglePlayPause}>
              {player.isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={handleNext} disabled={currentIndex === sortedClips.length - 1}>
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            {showDownloads && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/70 hover:text-white hover:bg-white/20 text-xs gap-1"
                  onClick={() => onDownloadCurrent?.(currentClip as any)}
                  title="Download this clip"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">This clip</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/70 hover:text-white hover:bg-white/20 text-xs gap-1"
                  onClick={() => onDownloadAll?.(sortedClips as any)}
                  title={`Download all ${sortedClips.length} clips`}
                >
                  <DownloadCloud className="h-4 w-4" />
                  <span className="hidden sm:inline">All ({sortedClips.length})</span>
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white hover:bg-white/20 text-xs gap-1"
              onClick={() => setShowClipList(!showClipList)}
            >
              {showClipList ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              Clips
            </Button>
          </div>
        </div>

        {/* Video */}
        <div className="flex-1 relative flex items-center justify-center bg-black min-h-0">
          {isStandaloneClip && (
            <video
              key={currentClip.id}
              src={currentClip.video_url}
              className="w-full h-full object-contain cursor-pointer"
              preload="auto"
              crossOrigin="anonymous"
              muted
              playsInline
              autoPlay
              controls={false}
              onClick={(e) => {
                const vid = e.currentTarget;
                vid.paused ? vid.play().catch(() => {}) : vid.pause();
              }}
            />
          )}
          {hasTimeRange && (
            <>
              <video
                ref={player.videoRefCallback}
                className={`w-full h-full object-contain cursor-pointer transition-opacity ${player.isClipReady ? 'opacity-100' : 'opacity-0'}`}
                preload="metadata"
                crossOrigin="anonymous"
                muted
                playsInline
                onClick={player.togglePlayPause}
                controls={false}
              />
              {!player.isClipReady && !player.clipError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <div className="flex items-center gap-2 text-sm text-white/80">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading clip…
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Progress bar */}
        {hasTimeRange && player.isClipReady && (
          <div className="px-4 py-1 bg-black/90 shrink-0">
            <div
              ref={progressBarRef}
              className="w-full h-1.5 bg-white/20 rounded cursor-pointer"
              onClick={handleProgressClick}
            >
              <div className="h-full bg-primary rounded" style={{ width: `${player.progress * 100}%` }} />
            </div>
          </div>
        )}

        {/* Clip list table */}
        {showClipList && (
          <div ref={clipListRef} className="bg-black/95 border-t border-border/30 overflow-y-auto shrink-0 max-h-[35vh]">
            {mode === 'playlist' ? (
              <div>
                <div className="sticky top-0 bg-black/90 px-4 py-1.5 text-[10px] uppercase tracking-wider text-primary font-semibold border-b border-border/20">
                  Playlist ({sortedClips.length})
                </div>
                {sortedClips.map((clip, idx) => {
                  const posVal = movePosById[clip.id] ?? String(idx + 1);
                  return (
                    <div
                      key={clip.id}
                      data-active={clip.id === currentClip.id}
                      className={`w-full px-4 py-2 flex items-center gap-3 text-xs transition-colors border-b border-border/10 ${
                        clip.id === currentClip.id ? 'bg-primary/20 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <button
                        onClick={() => jumpToClip(clip.id)}
                        className="flex-1 flex items-center gap-3 text-left min-w-0"
                      >
                        <span className="text-white/50 w-6 text-right">{idx + 1}</span>
                        {clip.clip_logo_url && (
                          <img
                            src={clip.clip_logo_url}
                            alt=""
                            className="w-4 h-4 object-contain shrink-0"
                            loading="lazy"
                          />
                        )}
                        <span className="flex-1 truncate">{trText(clip.action_description) || clip.action_type}</span>
                        {clip.id === currentClip.id && (
                          <span className="text-primary text-[10px] font-bold">▶</span>
                        )}
                      </button>
                      {onReorderClip && (
                        <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 shrink-0">
                          <Input
                            type="number"
                            min={1}
                            max={sortedClips.length}
                            value={posVal}
                            onChange={(e) => setMovePosById((p) => ({ ...p, [clip.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const n = parseInt(posVal, 10);
                                if (!isNaN(n) && n >= 1 && n <= sortedClips.length && n !== idx + 1) {
                                  onReorderClip(idx, n);
                                  setMovePosById((p) => { const c = { ...p }; delete c[clip.id]; return c; });
                                }
                              }
                            }}
                            onBlur={() => {
                              const n = parseInt(posVal, 10);
                              if (!isNaN(n) && n >= 1 && n <= sortedClips.length && n !== idx + 1) {
                                onReorderClip(idx, n);
                              }
                              setMovePosById((p) => { const c = { ...p }; delete c[clip.id]; return c; });
                            }}
                            className="w-12 h-6 text-[11px] px-1 bg-white/10 border-white/20 text-white"
                            title="Type new position then press Enter"
                          />
                        </div>
                      )}
                      {playerId && clip.video_url && (
                        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                          <AddToPlaylistButton
                            asStaff={!playerEmail}
                            playerId={playerId}
                            playerEmail={playerEmail}
                            clip={{ name: clip.action_description || `Clip ${idx + 1}`, videoUrl: clip.video_url }}
                            className="h-6 w-6 text-white/50 hover:text-white"
                          />
                        </div>
                      )}
                      {onRemoveClip && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-white/50 hover:text-red-400 shrink-0"
                          title="Remove from playlist"
                          onClick={(e) => { e.stopPropagation(); onRemoveClip(idx); }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                      {showDownloads && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-white/50 hover:text-white shrink-0"
                          title="Download clip"
                          onClick={(e) => { e.stopPropagation(); onDownloadCurrent?.(clip as any); }}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : categoryOrder.filter(cat => categorisedClips[cat]?.length).map(cat => (
              <div key={cat}>
                <div className="sticky top-0 bg-black/90 px-4 py-1.5 text-[10px] uppercase tracking-wider text-primary font-semibold border-b border-border/20">
                  {cat} ({categorisedClips[cat].length})
                </div>
                {categorisedClips[cat].map(clip => (
                  <div
                    key={clip.id}
                    data-active={clip.id === currentClip.id}
                    className={`w-full px-4 py-2 flex items-center gap-3 text-xs transition-colors border-b border-border/10 ${
                      clip.id === currentClip.id
                        ? 'bg-primary/20 text-white'
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <button
                      onClick={() => jumpToClip(clip.id)}
                      className="flex-1 flex items-center gap-3 text-left"
                    >
                      <span className="w-6 h-6 flex items-center justify-center shrink-0">
                        {clip.clip_logo_url ? (
                          <img
                            src={clip.clip_logo_url}
                            alt=""
                            className="w-6 h-6 object-contain"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-[hsl(var(--gold))] font-bold">—</span>
                        )}
                      </span>
                      <span className="text-white/50 w-10">{formatMinute(clip.minute)}'</span>
                      <span className="flex-1 truncate">{toTitleCase(clip.action_type)}</span>
                      {clip.action_score != null && (() => {
                        const g = getR90Grade(clip.action_score);
                        return (
                          <span
                            className="inline-flex items-center justify-center min-w-[34px] px-1.5 py-[1px] rounded-full text-[10px] font-bold text-black shrink-0"
                            style={{ backgroundColor: g.color }}
                            title={`R90 ${clip.action_score.toFixed(2)} (${g.grade})`}
                          >
                            {clip.action_score.toFixed(2)}
                          </span>
                        );
                      })()}
                      {clip.id === currentClip.id && (
                        <span className="text-primary text-[10px] font-bold">▶</span>
                      )}
                    </button>
                    {onSaveToBest && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-white/50 hover:text-yellow-400 shrink-0"
                        title="Save to Best Clips"
                        disabled={savingClipId === clip.id}
                        onClick={(e) => { e.stopPropagation(); onSaveToBest(clip as any); }}
                      >
                        {savingClipId === clip.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Star className="h-3 w-3" />}
                      </Button>
                    )}
                    {playerId && clip.video_url && (
                      <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                        <AddToPlaylistButton
                          asStaff={!playerEmail}
                          playerId={playerId}
                          playerEmail={playerEmail}
                          clip={{ name: toTitleCase(clip.action_type) || `Clip ${clip.action_number}`, videoUrl: clip.video_url }}
                          className="h-6 w-6 text-white/50 hover:text-white"
                        />
                      </div>
                    )}
                    {showDownloads && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-white/50 hover:text-white shrink-0"
                        title="Download clip"
                        onClick={(e) => { e.stopPropagation(); onDownloadCurrent?.(clip as any); }}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
