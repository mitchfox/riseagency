/**
 * Background Export Service
 *
 * Runs clip-to-report exports outside the component tree so they survive
 * section navigation. Components subscribe to progress updates via callbacks.
 *
 * Each clip is extracted as a standalone trimmed file via the trim-video-clip
 * edge function. This ensures every clip starts with a clean keyframe and
 * plays instantly without seeking into a full match file.
 */
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/edgeFunctionHelper";
import { toast } from "sonner";

export interface ExportJob {
  id: string;
  videoId: string;
  videoUrl: string;
  reportId: string;
  clips: Array<{
    id: string;
    start: number;
    end: number;
    action_type?: string;
    action_description?: string;
    notes?: string | null;
    action_score?: number;
    zone_details?: { zone: number; sub?: number; direction?: "forward" | "backward" }[];
    minute?: string;
  }>;
  matchMinuteOffset?: number;
  secondHalfOffset?: number | null;
  secondHalfVideoTime?: number | null;
  getClipAnnotations?: (clipId: string) => any;
}

export interface ExportProgress {
  jobId: string;
  current: number;
  total: number;
  statuses: Record<string, "pending" | "done" | "skipped" | "error">;
  finished: boolean;
}

type ProgressListener = (progress: ExportProgress) => void;

const listeners = new Set<ProgressListener>();
let activeJob: ExportProgress | null = null;
let running = false;

export function subscribeToExportProgress(fn: ProgressListener): () => void {
  listeners.add(fn);
  if (activeJob) fn(activeJob);
  return () => listeners.delete(fn);
}

function notify(progress: ExportProgress) {
  activeJob = progress;
  listeners.forEach((fn) => fn(progress));
}

export function getActiveExport(): ExportProgress | null {
  return activeJob;
}

export function isExportRunning(): boolean {
  return running;
}

function getEffectiveOffset(
  videoSeconds: number,
  matchMinuteOffset?: number,
  secondHalfOffset?: number | null,
  secondHalfVideoTime?: number | null
): number {
  if (secondHalfVideoTime != null && secondHalfOffset != null && videoSeconds >= secondHalfVideoTime) {
    return secondHalfOffset;
  }
  return matchMinuteOffset || 0;
}

/** Format minute with seconds rounded to nearest 5, matching VideoAnalysis display */
function getMatchMinute(
  clipStart: number,
  matchMinuteOffset?: number,
  secondHalfOffset?: number | null,
  secondHalfVideoTime?: number | null
): string {
  const offset = getEffectiveOffset(clipStart, matchMinuteOffset, secondHalfOffset, secondHalfVideoTime);
  const matchSeconds = Math.max(0, clipStart + offset);
  const mins = Math.floor(matchSeconds / 60);
  const rawSecs = Math.floor(matchSeconds % 60);
  const roundedSecs = Math.floor(rawSecs / 5) * 5;
  return `${mins}.${roundedSecs.toString().padStart(2, "0")}`;
}

export async function startExportJob(job: ExportJob): Promise<void> {
  if (running) {
    toast.error("An export is already in progress");
    return;
  }

  running = true;
  const statuses: Record<string, "pending" | "done" | "skipped" | "error"> = {};
  job.clips.forEach((c) => {
    statuses[c.id] = "pending";
  });

  const progress: ExportProgress = {
    jobId: job.id,
    current: 0,
    total: job.clips.length,
    statuses: { ...statuses },
    finished: false,
  };
  notify(progress);

  try {
    // Fetch existing actions for dedup
    const { data: existingActions } = await supabase
      .from("performance_report_actions")
      .select("clip_id, action_number")
      .eq("analysis_id", job.reportId);

    const existingClipIds = new Set(
      (existingActions || []).map((a) => a.clip_id).filter(Boolean)
    );
    let nextNumber =
      Math.max(...(existingActions || []).map((a) => a.action_number || 0), 0) + 1;

    let success = 0;
    let skipped = 0;

    // Clean source URL (strip any existing #t= fragments)
    const sourceVideoUrl = job.videoUrl.split("#")[0];

    for (let i = 0; i < job.clips.length; i++) {
      const clip = job.clips[i];
      progress.current = i + 1;

      if (existingClipIds.has(clip.id)) {
        statuses[clip.id] = "skipped";
        skipped++;
        notify({ ...progress, statuses: { ...statuses } });
        continue;
      }

      try {
        const annotations = job.getClipAnnotations?.(clip.id);

        const insertRow: any = {
          analysis_id: job.reportId,
          action_number: nextNumber,
          minute: clip.minute || getMatchMinute(clip.start, job.matchMinuteOffset, job.secondHalfOffset, job.secondHalfVideoTime),
          action_type: clip.action_type || "",
          action_description: clip.action_description || "",
          notes: clip.notes || null,
          video_url: sourceVideoUrl,
          clip_start: clip.start,
          clip_end: clip.end,
          video_analysis_id: job.videoId,
          clip_id: clip.id,
          is_successful: true,
          ...(annotations ? { clip_annotations: annotations } : {}),
          ...(clip.zone_details?.length ? { zone_details: clip.zone_details, zone: clip.zone_details[0].zone } : {}),
        };
        if (clip.action_score != null) insertRow.action_score = clip.action_score;

        const { error } = await supabase
          .from("performance_report_actions")
          .insert(insertRow);

        if (error) throw error;

        nextNumber++;
        success++;
        statuses[clip.id] = "done";
      } catch (err) {
        console.error(`Failed to export clip ${clip.id}:`, err);
        statuses[clip.id] = "error";
      }

      notify({ ...progress, statuses: { ...statuses } });
    }

    const parts = [`${success} exported`];
    if (skipped > 0) parts.push(`${skipped} already existed`);
    toast.success(parts.join(", "));
  } catch (err: any) {
    toast.error(err.message || "Export failed");
  } finally {
    progress.finished = true;
    notify({ ...progress, statuses: { ...statuses }, finished: true });
    running = false;
    setTimeout(() => {
      if (activeJob?.finished) activeJob = null;
    }, 5000);
  }
}
