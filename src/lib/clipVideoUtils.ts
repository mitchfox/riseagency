/**
 * Utilities for determining whether a video URL is a standalone trimmed clip
 * vs a full match video that requires clip_start/clip_end boundaries.
 *
 * Full match videos live in the analysis-videos bucket.
 * Trimmed standalone clips live in analysis-files/action-clips.
 */

/** Returns true if the URL is a full match video (not a standalone trimmed clip) */
export const isFullMatchUrl = (url: string): boolean => {
  if (!url) return false;
  // Trimmed clips stored under clips/ prefix in analysis-videos are NOT full match
  if (url.includes('/analysis-videos/clips/')) return false;
  // analysis-videos bucket = full match files
  if (url.includes('/analysis-videos/')) return true;
  return false;
};

/** Returns true if the URL is a standalone trimmed clip that can be played directly */
export const isStandaloneTrimmedClip = (url: string): boolean => {
  if (!url) return false;
  // action-clips directory = individually trimmed clips
  if (url.includes('/action-clips/')) return true;
  // clips directory under analysis-videos = trimmed exports
  if (url.includes('/analysis-videos/clips/')) return true;
  return false;
};

/**
 * Determine if an action has a playable clip.
 * - Has clip_start + clip_end boundaries against any video = playable
 * - Has a standalone trimmed clip URL = playable
 * - Has a full match URL but no boundaries = NOT playable (would show full match)
 */
export const hasPlayableClip = (action: {
  video_url?: string | null;
  clip_start?: number | null;
  clip_end?: number | null;
}): boolean => {
  if (!action.video_url) return false;
  
  const hasTimeBounds = action.clip_start != null && action.clip_end != null && action.clip_end > action.clip_start;
  if (hasTimeBounds) return true;
  
  // Only allow standalone playback for trimmed clip URLs
  if (isStandaloneTrimmedClip(action.video_url)) return true;
  
  // Full match URL without boundaries = blocked
  return false;
};

/**
 * For a given action, determine the playback mode:
 * - 'clipped': use shared player with clip_start/clip_end
 * - 'standalone': play video directly (trimmed clip file)
 * - 'blocked': cannot play (full match without boundaries)
 */
export const getPlaybackMode = (action: {
  video_url?: string | null;
  clip_start?: number | null;
  clip_end?: number | null;
}): 'clipped' | 'standalone' | 'blocked' => {
  if (!action.video_url) return 'blocked';
  
  const hasTimeBounds = action.clip_start != null && action.clip_end != null && action.clip_end > action.clip_start;
  if (hasTimeBounds) return 'clipped';
  
  if (isStandaloneTrimmedClip(action.video_url)) return 'standalone';
  
  return 'blocked';
};

/**
 * Structured playback instruction for any component that needs to play a clip.
 * This replaces raw URL resolution with explicit mode + data.
 */
export type PlaybackInstruction =
  | { mode: 'standalone'; src: string }
  | { mode: 'clipped'; src: string; clipStart: number; clipEnd: number }
  | { mode: 'blocked' };

export const getPlaybackInstruction = (action: {
  video_url?: string | null;
  clip_start?: number | null;
  clip_end?: number | null;
}): PlaybackInstruction => {
  if (!action.video_url) return { mode: 'blocked' };

  // Standalone trimmed clip — play directly
  if (isStandaloneTrimmedClip(action.video_url)) {
    return { mode: 'standalone', src: action.video_url };
  }

  // Full match URL with boundaries — clipped playback
  const hasBounds = action.clip_start != null && action.clip_end != null
    && action.clip_end > action.clip_start;
  if (hasBounds) {
    return { mode: 'clipped', src: action.video_url, clipStart: action.clip_start!, clipEnd: action.clip_end! };
  }

  // Full match URL without boundaries — blocked
  if (isFullMatchUrl(action.video_url)) return { mode: 'blocked' };

  // Unknown URL type — treat as standalone
  return { mode: 'standalone', src: action.video_url };
};

/**
 * Resolve the correct playback URL for edit-mode components.
 * Returns a standalone clip URL, a media-fragment URL for clipped windows,
 * or null if the action cannot be played.
 * @deprecated Use getPlaybackInstruction instead for strict boundary enforcement
 */
export const getEditPlaybackUrl = (action: {
  video_url?: string | null;
  clip_start?: number | null;
  clip_end?: number | null;
}): string | null => {
  if (!action.video_url) return null;

  // Already a standalone trimmed clip — use directly
  if (isStandaloneTrimmedClip(action.video_url)) return action.video_url;

  // Full match URL with boundaries — use media fragment
  const hasBounds = action.clip_start != null && action.clip_end != null
    && action.clip_end > action.clip_start;
  if (hasBounds && isFullMatchUrl(action.video_url)) {
    return `${action.video_url}#t=${action.clip_start},${action.clip_end}`;
  }

  // Full match URL without boundaries — blocked
  if (isFullMatchUrl(action.video_url)) return null;

  // Unknown URL type — allow direct playback
  return action.video_url;
};
