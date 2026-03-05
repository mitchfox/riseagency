/**
 * Rule-based Action Suggestion Engine
 *
 * Consumes Roboflow tracking JSON (frame-level detections with zone mapping)
 * and produces suggested performance report actions using heuristics for
 * possession, shots, and duels.
 *
 * All logic is pure TypeScript with no external dependencies.
 */

interface Detection {
  class: string;
  confidence: number;
  zone: number;
  subZone: number;
  bbox: { x: number; y: number; w: number; h: number };
}

interface FrameResult {
  frameIndex: number;
  timestamp: number;
  detections: Detection[];
}

export interface SuggestedAction {
  timestamp: number;
  actionType: string;
  description: string;
  zone: number;
  subZone: number;
  confidence: number;
  status: "suggested";
}

// ----- Helpers -----

/** Euclidean distance between two bounding box centres */
function bboxDist(a: Detection["bbox"], b: Detection["bbox"]): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/** Check if ball detection overlaps with a player detection */
function ballNearPlayer(ball: Detection, player: Detection, threshold = 60): boolean {
  return bboxDist(ball.bbox, player.bbox) < threshold;
}

/** Goal zones: zones 1-6 (defensive third row 0) or 13-18 (attacking third row 2) */
function isGoalZone(zone: number): boolean {
  return zone >= 13 && zone <= 18;
}

// ----- Core heuristics -----

/**
 * Possession approximation:
 * Ball overlapping the same player across 3+ consecutive frames.
 */
function detectPossessions(frames: FrameResult[], minConsecutive = 3): SuggestedAction[] {
  const suggestions: SuggestedAction[] = [];
  let currentHolder: string | null = null;
  let streak = 0;
  let streakStart = 0;
  let lastZone = 0;
  let lastSubZone = 0;

  for (const frame of frames) {
    const ball = frame.detections.find((d) => d.class.toLowerCase() === "ball");
    const players = frame.detections.filter((d) => d.class.toLowerCase() !== "ball");

    if (!ball) {
      if (streak >= minConsecutive && currentHolder) {
        suggestions.push({
          timestamp: streakStart,
          actionType: "Possession",
          description: `Player held possession for ~${(streak / 5).toFixed(1)}s`,
          zone: lastZone,
          subZone: lastSubZone,
          confidence: 0.6,
          status: "suggested",
        });
      }
      currentHolder = null;
      streak = 0;
      continue;
    }

    const nearestPlayer = players
      .filter((p) => ballNearPlayer(ball, p))
      .sort((a, b) => bboxDist(ball.bbox, a.bbox) - bboxDist(ball.bbox, b.bbox))[0];

    if (nearestPlayer) {
      const holderId = `${nearestPlayer.class}_${nearestPlayer.bbox.x.toFixed(0)}_${nearestPlayer.bbox.y.toFixed(0)}`;
      if (holderId === currentHolder) {
        streak++;
        lastZone = nearestPlayer.zone;
        lastSubZone = nearestPlayer.subZone;
      } else {
        if (streak >= minConsecutive && currentHolder) {
          suggestions.push({
            timestamp: streakStart,
            actionType: "Possession",
            description: `Player held possession for ~${(streak / 5).toFixed(1)}s`,
            zone: lastZone,
            subZone: lastSubZone,
            confidence: 0.6,
            status: "suggested",
          });
        }
        currentHolder = holderId;
        streak = 1;
        streakStart = frame.timestamp;
        lastZone = nearestPlayer.zone;
        lastSubZone = nearestPlayer.subZone;
      }
    } else {
      if (streak >= minConsecutive && currentHolder) {
        suggestions.push({
          timestamp: streakStart,
          actionType: "Possession",
          description: `Player held possession for ~${(streak / 5).toFixed(1)}s`,
          zone: lastZone,
          subZone: lastSubZone,
          confidence: 0.6,
          status: "suggested",
        });
      }
      currentHolder = null;
      streak = 0;
    }
  }

  return suggestions;
}

/**
 * Shot heuristic:
 * Ball near a player then rapid displacement toward goal zone within 3 frames.
 */
function detectShots(frames: FrameResult[]): SuggestedAction[] {
  const suggestions: SuggestedAction[] = [];
  const DISPLACEMENT_THRESHOLD = 150;

  for (let i = 0; i < frames.length - 3; i++) {
    const f1 = frames[i];
    const f2 = frames[Math.min(i + 3, frames.length - 1)];

    const ball1 = f1.detections.find((d) => d.class.toLowerCase() === "ball");
    const ball2 = f2.detections.find((d) => d.class.toLowerCase() === "ball");

    if (!ball1 || !ball2) continue;

    const players1 = f1.detections.filter((d) => d.class.toLowerCase() !== "ball");
    const nearPlayer = players1.some((p) => ballNearPlayer(ball1, p));

    if (!nearPlayer) continue;

    const displacement = bboxDist(ball1.bbox, ball2.bbox);
    if (displacement > DISPLACEMENT_THRESHOLD && isGoalZone(ball2.zone)) {
      // Avoid duplicate suggestions within 2 seconds
      const isDuplicate = suggestions.some(
        (s) => s.actionType === "Shot" && Math.abs(s.timestamp - f1.timestamp) < 2
      );
      if (!isDuplicate) {
        const shooter = players1
          .filter((p) => ballNearPlayer(ball1, p))
          .sort((a, b) => bboxDist(ball1.bbox, a.bbox) - bboxDist(ball1.bbox, b.bbox))[0];

        suggestions.push({
          timestamp: f1.timestamp,
          actionType: "Shot",
          description: `Ball displaced ${displacement.toFixed(0)}px toward goal zone`,
          zone: shooter?.zone || ball1.zone,
          subZone: shooter?.subZone || ball1.subZone,
          confidence: 0.7,
          status: "suggested",
        });
      }
    }
  }

  return suggestions;
}

/**
 * Duel heuristic:
 * Two player bounding boxes close together with a possession change
 * (ball transfers from one to the other within a short window).
 */
function detectDuels(frames: FrameResult[]): SuggestedAction[] {
  const suggestions: SuggestedAction[] = [];
  const PROXIMITY_THRESHOLD = 80;

  for (let i = 0; i < frames.length - 2; i++) {
    const f1 = frames[i];
    const f2 = frames[Math.min(i + 2, frames.length - 1)];

    const ball1 = f1.detections.find((d) => d.class.toLowerCase() === "ball");
    const ball2 = f2.detections.find((d) => d.class.toLowerCase() === "ball");
    if (!ball1 || !ball2) continue;

    const players1 = f1.detections.filter((d) => d.class.toLowerCase() !== "ball");
    const players2 = f2.detections.filter((d) => d.class.toLowerCase() !== "ball");

    const holder1 = players1
      .filter((p) => ballNearPlayer(ball1, p))
      .sort((a, b) => bboxDist(ball1.bbox, a.bbox) - bboxDist(ball1.bbox, b.bbox))[0];

    const holder2 = players2
      .filter((p) => ballNearPlayer(ball2, p))
      .sort((a, b) => bboxDist(ball2.bbox, a.bbox) - bboxDist(ball2.bbox, b.bbox))[0];

    if (!holder1 || !holder2) continue;

    // Check if different players and they were close
    const holdersClose = bboxDist(holder1.bbox, holder2.bbox) < PROXIMITY_THRESHOLD;
    const holderChanged =
      Math.abs(holder1.bbox.x - holder2.bbox.x) > 30 ||
      Math.abs(holder1.bbox.y - holder2.bbox.y) > 30;

    if (holdersClose && holderChanged) {
      const isDuplicate = suggestions.some(
        (s) => s.actionType === "Duel" && Math.abs(s.timestamp - f1.timestamp) < 3
      );
      if (!isDuplicate) {
        suggestions.push({
          timestamp: f1.timestamp,
          actionType: "Duel",
          description: "Contested possession between two players",
          zone: holder1.zone,
          subZone: holder1.subZone,
          confidence: 0.55,
          status: "suggested",
        });
      }
    }
  }

  return suggestions;
}

// ----- Public API -----

/**
 * Run all heuristics against tracking data and return merged, deduplicated suggestions
 * sorted chronologically.
 */
export function generateActionSuggestions(frames: FrameResult[]): SuggestedAction[] {
  if (!frames || frames.length === 0) return [];

  const sorted = [...frames].sort((a, b) => a.timestamp - b.timestamp);

  const possessions = detectPossessions(sorted);
  const shots = detectShots(sorted);
  const duels = detectDuels(sorted);

  const all = [...possessions, ...shots, ...duels].sort(
    (a, b) => a.timestamp - b.timestamp
  );

  // Merge suggestions within 2s window, keeping higher confidence
  const merged: SuggestedAction[] = [];
  for (const suggestion of all) {
    const existing = merged.find(
      (m) =>
        m.actionType === suggestion.actionType &&
        Math.abs(m.timestamp - suggestion.timestamp) < 2
    );
    if (existing) {
      if (suggestion.confidence > existing.confidence) {
        Object.assign(existing, suggestion);
      }
    } else {
      merged.push({ ...suggestion });
    }
  }

  return merged;
}
