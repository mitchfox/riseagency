import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import type { SplitUploadProgress } from "@/lib/videoSplitUpload";

interface LargeVideoProcessingModalProps {
  open: boolean;
  progress: SplitUploadProgress | null;
  onCancel: () => void;
}

const stageLabels: Record<string, string> = {
  splitting: 'Splitting',
  uploading: 'Uploading',
  done: 'Complete',
  error: 'Error',
};

export const LargeVideoProcessingModal = ({ open, progress, onCancel }: LargeVideoProcessingModalProps) => {
  const stage = progress?.stage || 'splitting';
  const isDone = stage === 'done';
  const isError = stage === 'error';

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="w-full max-w-2xl" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isDone ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : isError ? (
              <XCircle className="h-5 w-5 text-destructive" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            )}
            Processing Large Video
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            This file is too large for a single upload. It's being split into smaller parts and uploaded automatically.
          </p>

          {/* Stage indicator */}
          <div className="flex items-center gap-3">
            {['splitting', 'uploading'].map((s, i) => {
              const isActive = s === stage;
              const isPast = ['splitting', 'uploading'].indexOf(stage) > i || isDone;
              return (
                <div key={s} className="flex items-center gap-1.5">
                  <div className={`h-2 w-2 rounded-full ${isPast ? 'bg-green-500' : isActive ? 'bg-primary animate-pulse' : 'bg-muted-foreground/30'}`} />
                  <span className={`text-xs ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {stageLabels[s]}
                  </span>
                  {i < 1 && <span className="text-muted-foreground/30 mx-1">→</span>}
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          {progress && !isDone && !isError && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progress.message}</span>
                <span>{progress.progress}%</span>
              </div>
              <Progress value={progress.progress} className="h-2" />
            </div>
          )}

          {/* Part info */}
          {progress?.totalParts && progress.totalParts > 1 && (
            <p className="text-xs text-muted-foreground">
              Part {progress.currentPart} of {progress.totalParts}
            </p>
          )}

          {isDone && (
            <p className="text-sm text-green-600 font-medium">All parts uploaded successfully.</p>
          )}

          {isError && (
            <p className="text-sm text-destructive">{progress?.message || 'An error occurred.'}</p>
          )}

          {/* Cancel button */}
          {!isDone && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
