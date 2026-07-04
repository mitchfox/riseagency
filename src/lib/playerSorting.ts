// Sort players so internal RISE relationship statuses appear first in staff
// player/data dropdowns. This is intentionally based on representation_status,
// not agent_status: agent_status belongs to scouting/player database only.
const STATUS_PRIORITY: Record<string, number> = {
  represented: 0,
  mandated: 1,
  fuel_for_football: 2,
  previously_mandated: 3,
  prospect: 4,
  other: 4,
  scouted: 5,
};

const normaliseRepresentationStatus = (status?: string | null): string => {
  const normalised = String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  const map: Record<string, string> = {
    signed: "represented",
    represented: "represented",
    mandate: "mandated",
    mandated: "mandated",
    "fuel for football": "fuel_for_football",
    fuel_for_football: "fuel_for_football",
    "previously mandated": "previously_mandated",
    previously_mandated: "previously_mandated",
    prospect: "prospect",
    scouted: "scouted",
    other: "other",
  };

  return map[normalised] || normalised.replace(/\s+/g, "_");
};

export const sortPlayersByRepresentation = <T extends { representation_status?: string | null; name?: string }>(
  players: T[]
): T[] => {
  return [...players].sort((a, b) => {
    const aPriority = STATUS_PRIORITY[normaliseRepresentationStatus(a.representation_status)] ?? 6;
    const bPriority = STATUS_PRIORITY[normaliseRepresentationStatus(b.representation_status)] ?? 6;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return (a.name || '').localeCompare(b.name || '');
  });
};

export const getStatusLabel = (status: string): string => {
  const normalised = normaliseRepresentationStatus(status);
  const labels: Record<string, string> = {
    represented: 'Represented',
    mandated: 'Mandated',
    previously_mandated: 'Previously Mandated',
    fuel_for_football: 'Fuel For Football',
    prospect: 'Prospect',
    other: 'Other',
    scouted: 'Scouted',
  };
  return labels[normalised] || status;
};

// Group players by status for display in selects with optgroup-style separators
export const groupPlayersByStatus = <T extends { representation_status?: string | null }>(
  players: T[]
): { status: string; label: string; players: T[] }[] => {
  const groups: { status: string; label: string; players: T[] }[] = [];
  const statusOrder = ['represented', 'mandated', 'fuel_for_football', 'previously_mandated', 'prospect', 'other', 'scouted'];
  
  statusOrder.forEach(status => {
    const matching = players.filter(p => normaliseRepresentationStatus(p.representation_status) === status);
    if (matching.length > 0) {
      groups.push({ status, label: getStatusLabel(status), players: matching });
    }
  });
  
  const uncategorised = players.filter(p => !statusOrder.includes(normaliseRepresentationStatus(p.representation_status)));
  if (uncategorised.length > 0) {
    groups.push({ status: 'uncategorised', label: 'Uncategorised', players: uncategorised });
  }
  
  return groups;
};
