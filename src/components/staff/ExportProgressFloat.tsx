import { useState, useEffect } from "react";
import { subscribeToExportProgress, type ExportProgress } from "@/lib/backgroundExportService";
import { Download, Check, X, Loader2 } from "lucide-react";

export const ExportProgressFloat = () => {
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const unsub = subscribeToExportProgress((p) => {
      setProgress(p);
      setDismissed(false);
    });
    return unsub;
  }, []);

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
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
          <span>{progress.finished ? "Export complete" : "Exporting clips..."}</span>
        </div>
        {progress.finished && (
          <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
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
