// Sort players so represented/mandated appear first, grouped by status
const STATUS_PRIORITY: Record<string, number> = {
  represented: 0,
  mandated: 1,
  previously_mandated: 2,
  fuel_for_football: 3,
  other: 4,
  scouted: 5,
};

export const sortPlayersByRepresentation = <T extends { representation_status?: string | null; name?: string }>(
  players: T[]
): T[] => {
  return [...players].sort((a, b) => {
    const aPriority = STATUS_PRIORITY[a.representation_status || ''] ?? 6;
    const bPriority = STATUS_PRIORITY[b.representation_status || ''] ?? 6;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return (a.name || '').localeCompare(b.name || '');
  });
};

export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    represented: 'Represented',
    mandated: 'Mandated',
    previously_mandated: 'Previously Mandated',
    fuel_for_football: 'Fuel for Football',
    other: 'Other',
    scouted: 'Scouted',
  };
  return labels[status] || status;
};

// Group players by status for display in selects with optgroup-style separators
export const groupPlayersByStatus = <T extends { representation_status?: string | null }>(
  players: T[]
): { status: string; label: string; players: T[] }[] => {
  const groups: { status: string; label: string; players: T[] }[] = [];
  const statusOrder = ['represented', 'mandated', 'previously_mandated', 'fuel_for_football', 'other', 'scouted'];
  
  statusOrder.forEach(status => {
    const matching = players.filter(p => p.representation_status === status);
    if (matching.length > 0) {
      groups.push({ status, label: getStatusLabel(status), players: matching });
    }
  });
  
  const uncategorised = players.filter(p => !p.representation_status || !statusOrder.includes(p.representation_status));
  if (uncategorised.length > 0) {
    groups.push({ status: 'uncategorised', label: 'Uncategorised', players: uncategorised });
  }
  
  return groups;
};
