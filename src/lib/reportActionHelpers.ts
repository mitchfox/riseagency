import { parseMinuteToSeconds } from "@/lib/actionSorting";

export interface ReportZoneDetail {
  zone: number;
  sub?: number | null;
}

export interface ReportActionLike {
  action_number?: number | null;
  minute?: string | number | null;
  video_url?: string | null;
  zone?: number | null;
  zone_details?: ReportZoneDetail[] | null;
  is_first_half?: boolean | null;
}

export const sortReportActionsChronologically = <T extends ReportActionLike>(actions: T[]): T[] => {
  return [...actions].sort((a, b) => {
    const aSecs = parseMinuteToSeconds(a.minute);
    const bSecs = parseMinuteToSeconds(b.minute);
    const aHalf = halfBucket(aSecs, a.is_first_half);
    const bHalf = halfBucket(bSecs, b.is_first_half);
    if (aHalf !== bHalf) return aHalf - bHalf;
    if (aSecs !== bSecs) {
      return aSecs - bSecs;
    }

    return (a.action_number ?? Number.MAX_SAFE_INTEGER) - (b.action_number ?? Number.MAX_SAFE_INTEGER);
  });
};

const halfBucket = (
  seconds: number,
  isFirstHalf: boolean | null | undefined,
): number => {
  if (seconds === Infinity) return 2;
  if (seconds < 45 * 60) return 0;
  if (seconds >= 51 * 60) return 1;
  return isFirstHalf ? 0 : 1;
};

export const actionMatchesZone = (action: ReportActionLike, zone: number): boolean => {
  if (Array.isArray(action.zone_details) && action.zone_details.length > 0) {
    return action.zone_details.some((detail) => detail.zone === zone);
  }

  return action.zone === zone;
};

export const actionMatchesSubZone = (action: ReportActionLike, zone: number, sub: number): boolean => {
  if (!Array.isArray(action.zone_details) || action.zone_details.length === 0) {
    return false;
  }

  return action.zone_details.some((detail) => detail.zone === zone && detail.sub === sub);
};

export const filterActionsByZone = <T extends ReportActionLike>(actions: T[], zone: number, sub?: number): T[] => {
  const filtered = actions.filter((action) => {
    if (typeof sub === "number") {
      return actionMatchesSubZone(action, zone, sub);
    }

    return actionMatchesZone(action, zone);
  });

  return sortReportActionsChronologically(filtered);
};
