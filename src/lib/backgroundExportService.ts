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
import { trimAndUploadClip } from "@/lib/clientClipExtractor";

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
    crop?: { top: number; right: number; bottom: number; left: number } | null;
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
  errors?: Record<string, string>;
  finished: boolean;
}

type ProgressListener = (progress: ExportProgress) => void;

const listeners = new Set<ProgressListener>();
let activeJob: ExportProgress | null = null;
let running = false;
let lastJob: ExportJob | null = null;

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

/**
 * Restart the most recent export, retrying only clips that did not finish
 * successfully (i.e. statuses that are not "done" or "skipped"). Used by the
 * floating progress widget when an export appears stalled, so the user does
 * not have to reload the page and lose state.
 */
export async function restartCurrentExport(): Promise<void> {
  if (!lastJob) {
    toast.error("No export to restart");
    return;
  }
  // Force-clear the in-flight guard in case the previous job is wedged.
  running = false;

  const finishedIds = new Set(
    Object.entries(activeJob?.statuses || {})
      .filter(([, status]) => status === "done" || status === "skipped")
      .map(([id]) => id)
  );

  const remaining = lastJob.clips.filter((c) => !finishedIds.has(c.id));
  if (remaining.length === 0) {
    toast.success("All clips already exported");
    return;
  }

  toast.message("Restarting failed clips…");
  await startExportJob({ ...lastJob, clips: remaining });
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

/**
 * The `performance_report_actions.minute` column is `numeric`. Legacy clips
 * stored `minute` in `mm:ss` format (e.g. "0:35") which Postgres rejects with
 * `invalid input syntax for type numeric`, silently failing every insert.
 * Normalise to the modern `mm.ss` form, snapping seconds to the nearest 5
 * to match `getMatchMinute`.
 */
function normaliseMinute(
  raw: string | number | undefined,
  fallbackStart: number,
  job: { matchMinuteOffset?: number; secondHalfOffset?: number | null; secondHalfVideoTime?: number | null }
): string {
  const fallback = () => getMatchMinute(fallbackStart, job.matchMinuteOffset, job.secondHalfOffset, job.secondHalfVideoTime);
  if (raw == null || raw === "") return fallback();
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  const str = String(raw).trim();
  if (/^\d+(\.\d+)?$/.test(str)) return str;
  const colon = str.match(/^(\d+):(\d{1,2})$/);
  if (colon) {
    const mins = parseInt(colon[1], 10);
    const secs = Math.min(59, parseInt(colon[2], 10));
    const rounded = Math.floor(secs / 5) * 5;
    return `${mins}.${rounded.toString().padStart(2, "0")}`;
  }
  return fallback();
}

export async function startExportJob(job: ExportJob): Promise<void> {
  if (running) {
    toast.error("An export is already in progress");
    return;
  }

  running = true;
  lastJob = job;
  const statuses: Record<string, "pending" | "done" | "skipped" | "error"> = {};
  const errors: Record<string, string> = {};
  job.clips.forEach((c) => {
    statuses[c.id] = "pending";
  });

  const progress: ExportProgress = {
    jobId: job.id,
    current: 0,
    total: job.clips.length,
    statuses: { ...statuses },
    errors: { ...errors },
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
    let failed = 0;

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

        // Always produce a standalone trimmed clip. If trimming fails (server
        // and client-side both unavailable), we deliberately DO NOT fall back
        // to inserting the full match URL — that produced reports where the
        // entire video analysis source played in place of a single clip.
        // Instead we mark the clip as failed and skip it so the user can
        // retry from the export progress widget.
        const trimmedUrl = await trimAndUploadClip(
          sourceVideoUrl,
          clip.id,
          clip.start,
          clip.end,
          undefined,
          clip.crop ?? null
        );
        if (!trimmedUrl) throw new Error("Clip trim returned no URL");
        const clipVideoUrl = trimmedUrl;
        const clipStart: number | null = null;
        const clipEnd: number | null = null;

        const insertRow: any = {
          analysis_id: job.reportId,
          action_number: nextNumber,
          minute: normaliseMinute(clip.minute, clip.start, job),
          action_type: clip.action_type || "",
          action_description: clip.action_description || "",
          notes: clip.notes || null,
          video_url: clipVideoUrl,
          clip_start: clipStart,
          clip_end: clipEnd,
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
        errors[clip.id] = err instanceof Error ? err.message : String(err);
        failed++;
      }

      notify({ ...progress, statuses: { ...statuses }, errors: { ...errors } });
    }

    const parts = [`${success} exported`];
    if (skipped > 0) parts.push(`${skipped} already existed`);
    if (failed > 0) parts.push(`${failed} failed — retry from export widget`);
    if (failed > 0 && success === 0) {
      toast.error(parts.join(", "));
    } else {
      toast.success(parts.join(", "));
    }
  } catch (err: any) {
    toast.error(err.message || "Export failed");
  } finally {
    progress.finished = true;
    notify({ ...progress, statuses: { ...statuses }, errors: { ...errors }, finished: true });
    running = false;
    setTimeout(() => {
      if (activeJob?.finished) activeJob = null;
    }, 5000);
  }
}
