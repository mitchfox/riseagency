import { useState, useEffect, useRef } from "react";
import { subscribeToExportProgress, isExportRunning, type ExportProgress } from "@/lib/backgroundExportService";
import { Check, X, Loader2, Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ExportProgressFloat = () => {
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [stalled, setStalled] = useState(false);
  const [paused, setPaused] = useState(false);
  const lastProgressRef = useRef<number>(0);
  const stallTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const unsub = subscribeToExportProgress((p) => {
      setProgress(p);
      setDismissed(false);
      if (p.current !== lastProgressRef.current) {
        lastProgressRef.current = p.current;
        setStalled(false);
      }
    });
    return unsub;
  }, []);

  // Detect stalls: if progress hasn't changed in 15s while running
  useEffect(() => {
    if (stallTimerRef.current) clearInterval(stallTimerRef.current);
    if (!progress || progress.finished || paused) return;

    stallTimerRef.current = setInterval(() => {
      if (progress && !progress.finished && progress.current === lastProgressRef.current) {
        setStalled(true);
      }
    }, 15000);

    return () => {
      if (stallTimerRef.current) clearInterval(stallTimerRef.current);
    };
  }, [progress?.current, progress?.finished, paused]);

  if (!progress || dismissed) return null;

  const doneCount = Object.values(progress.statuses).filter(s => s === "done").length;
  const skippedCount = Object.values(progress.statuses).filter(s => s === "skipped").length;
  const errorCount = Object.values(progress.statuses).filter(s => s === "error").length;
  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 bg-card border rounded-lg shadow-xl p-3 space-y-2 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          {progress.finished ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : stalled ? (
            <RotateCcw className="h-4 w-4 text-yellow-600" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
          <span>
            {progress.finished
              ? "Export complete"
              : stalled
              ? "Export may be stuck"
              : "Exporting clips..."}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {!progress.finished && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              title={stalled ? "Restart export" : paused ? "Resume" : "Pause"}
              onClick={() => {
                if (stalled) {
                  // Force reload page to restart
                  window.location.reload();
                } else {
                  setPaused(!paused);
                }
              }}
            >
              {stalled ? (
                <RotateCcw className="h-3.5 w-3.5 text-yellow-600" />
              ) : paused ? (
                <Play className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <Pause className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>
          )}
          {progress.finished && (
            <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${stalled ? 'bg-yellow-500' : 'bg-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{progress.current}/{progress.total} clips</span>
        <div className="flex gap-2">
          {doneCount > 0 && <span className="text-green-600">{doneCount} done</span>}
          {skippedCount > 0 && <span className="text-yellow-600">{skippedCount} skipped</span>}
          {errorCount > 0 && <span className="text-destructive">{errorCount} failed</span>}
        </div>
      </div>

      {/* Clip list */}
      {!progress.finished && (
        <div className="max-h-32 overflow-y-auto space-y-0.5">
          {Object.entries(progress.statuses).map(([id, status]) => (
            <div key={id} className="flex items-center gap-1.5 text-[10px]">
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                status === "done" ? "bg-green-500" :
                status === "skipped" ? "bg-yellow-500" :
                status === "error" ? "bg-destructive" :
                "bg-muted-foreground/30"
              }`} />
              <span className="truncate text-muted-foreground">{id.slice(0, 8)}...</span>
              <span className={`ml-auto shrink-0 ${
                status === "done" ? "text-green-600" :
                status === "skipped" ? "text-yellow-600" :
                status === "error" ? "text-destructive" :
                "text-muted-foreground"
              }`}>
                {status === "done" ? "Done" : status === "skipped" ? "Skipped" : status === "error" ? "Failed" : "..."}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
