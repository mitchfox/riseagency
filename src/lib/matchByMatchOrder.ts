// Shared helpers for reordering the "Match by Match" game list used by both
// the staff editor (ClubOutreachManager) and the public proposal page
// (ClubOutreachProposal).
//
// gameOrder is stored as an array of opaque string tokens. Going forward each
// token is `${opponent}|${analysis_date}` so that a player who faced the same
// opponent twice in a season gets two distinct slots — without that the
// matching map collapses duplicates and they end up "stuck" in date order.
// Legacy tokens that are just the opponent name still work via the fallback
// bucket below.

export const normaliseOpp = (s: string | null | undefined): string =>
  (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

export interface OrderableGame {
  id: string;
  opponent: string | null;
  analysis_date: string | null;
}

interface ParsedToken { opp: string; date: string | null; }

function parseToken(token: string): ParsedToken {
  const idx = token.indexOf("|");
  if (idx === -1) return { opp: normaliseOpp(token), date: null };
  return {
    opp: normaliseOpp(token.slice(0, idx)),
    date: token.slice(idx + 1).trim() || null,
  };
}

export function gameOrderToken(g: OrderableGame): string {
  return `${g.opponent ?? ""}|${g.analysis_date ?? ""}`;
}

/**
 * Sort games using the saved order list. Each saved entry is consumed once
 * (greedy by opponent + optional date) so duplicate fixtures against the same
 * opponent each get their own slot. Anything not referenced falls back to
 * date-descending after the ordered block.
 */
export function rankGames<T extends OrderableGame>(
  games: T[],
  gameOrder: string[] | null | undefined,
): T[] {
  if (!games?.length) return games ?? [];
  if (!gameOrder || gameOrder.length === 0) {
    return [...games].sort((a, b) =>
      (b.analysis_date ?? "").localeCompare(a.analysis_date ?? ""),
    );
  }

  // Bucket saved tokens by normalised opponent, in original order.
  const buckets = new Map<string, { date: string | null; rank: number }[]>();
  gameOrder.forEach((tok, i) => {
    const p = parseToken(tok);
    if (!p.opp) return;
    const arr = buckets.get(p.opp) ?? [];
    arr.push({ date: p.date, rank: i });
    buckets.set(p.opp, arr);
  });

  const claim = (g: OrderableGame): number => {
    const k = normaliseOpp(g.opponent);
    const arr = buckets.get(k);
    if (!arr || arr.length === 0) return Number.POSITIVE_INFINITY;
    // Prefer the exact opp+date match if present, else the first remaining.
    const exactIdx = g.analysis_date
      ? arr.findIndex((b) => b.date === g.analysis_date)
      : -1;
    const pickIdx = exactIdx >= 0 ? exactIdx : 0;
    const [taken] = arr.splice(pickIdx, 1);
    return taken.rank;
  };

  const decorated = games.map((g) => ({ g, rank: claim(g) }));
  decorated.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return (b.g.analysis_date ?? "").localeCompare(a.g.analysis_date ?? "");
  });
  return decorated.map((d) => d.g);
}
