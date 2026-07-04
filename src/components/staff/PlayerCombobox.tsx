import { useState, useMemo, useRef, useEffect, KeyboardEvent } from "react";
import { Check, ChevronsUpDown, User as UserIcon, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface PlayerOption {
  id: string;
  name: string;
  position?: string | null;
  image_url?: string | null;
  club?: string | null;
  representation_status?: string | null;
  category?: string | null;
}

interface PlayerComboboxProps {
  players: PlayerOption[];
  value: string | null;
  onChange: (id: string) => void;
  placeholder?: string;
  className?: string;
  /** When true, show grouping headers by representation status */
  groupedByStatus?: boolean;
  /** Optional disabled state */
  disabled?: boolean;
  /** Optional special "All" option at top with this label */
  allLabel?: string;
  /** Value used for the "All" option */
  allValue?: string;
  /** Show small avatar next to each name */
  showAvatar?: boolean;
  /** Show the player's club next to position */
  showClub?: boolean;
}

const STATUS_ORDER = [
  'represented',
  'mandated',
  'fuel_for_football',
  'previously_mandated',
  'prospect',
  'other',
  'scouted',
];

const STATUS_LABELS: Record<string, string> = {
  represented: 'Represented',
  mandated: 'Mandated',
  previously_mandated: 'Previously Mandated',
  fuel_for_football: 'Fuel For Football',
  prospect: 'Prospect',
  other: 'Other',
  scouted: 'Scouted',
};

const normaliseRepresentationStatus = (status?: string | null) => {
  const normalised = String(status || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

  const map: Record<string, string> = {
    signed: 'represented',
    represented: 'represented',
    mandate: 'mandated',
    mandated: 'mandated',
    'fuel for football': 'fuel_for_football',
    fuel_for_football: 'fuel_for_football',
    'previously mandated': 'previously_mandated',
    previously_mandated: 'previously_mandated',
    prospect: 'prospect',
    scouted: 'scouted',
    other: 'other',
  };

  return map[normalised] || normalised.replace(/\s+/g, '_');
};

const getPlayerStatus = (player: PlayerOption) =>
  normaliseRepresentationStatus(player.representation_status || player.category || 'other');

export const PlayerCombobox = ({
  players,
  value,
  onChange,
  placeholder = "Select a player...",
  className,
  groupedByStatus = true,
  disabled,
  allLabel,
  allValue = "all",
  showAvatar = true,
  showClub = false,
}: PlayerComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = players.find(p => p.id === value);
  const isAllSelected = !!allLabel && value === allValue;

  // Filter players by query
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matching = q ? players.filter(p => {
      const haystack = [p.name, p.position, p.club].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    }) : players;

    return [...matching].sort((a, b) => {
      const aStatusIndex = STATUS_ORDER.indexOf(getPlayerStatus(a));
      const bStatusIndex = STATUS_ORDER.indexOf(getPlayerStatus(b));
      const statusDiff = (aStatusIndex === -1 ? STATUS_ORDER.length : aStatusIndex) - (bStatusIndex === -1 ? STATUS_ORDER.length : bStatusIndex);
      if (statusDiff !== 0) return statusDiff;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [players, query]);

  // Group filtered by status if requested
  const grouped = useMemo(() => {
    if (!groupedByStatus) {
      return [{ status: 'all', label: '', players: filtered }];
    }
    const groups = STATUS_ORDER
      .map(status => ({
        status,
        label: STATUS_LABELS[status] || status,
        players: filtered.filter(p => getPlayerStatus(p) === status),
      }))
      .filter(g => g.players.length > 0);
    // Catch any unrecognised statuses
    const handled = new Set(STATUS_ORDER);
    const others = filtered.filter(p => !handled.has(getPlayerStatus(p)));
    if (others.length > 0) {
      groups.push({ status: 'uncategorised', label: 'Other', players: others });
    }
    return groups;
  }, [filtered, groupedByStatus]);

  // Auto-focus input when opening
  useEffect(() => {
    if (open) {
      // Defer to allow popover transition
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [open]);

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && filtered.length === 1) {
      e.preventDefault();
      handleSelect(filtered[0].id);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const triggerLabel = isAllSelected
    ? allLabel
    : selected
      ? `${selected.name}${selected.position ? ` (${selected.position})` : ''}`
      : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "justify-between font-normal",
            !selected && !isAllSelected && "text-muted-foreground",
            className,
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {showAvatar && selected?.image_url ? (
              <img src={selected.image_url} alt="" className="h-5 w-5 rounded-full object-cover" />
            ) : showAvatar && selected ? (
              <UserIcon className="h-4 w-4 text-muted-foreground" />
            ) : null}
            <span className="truncate">{triggerLabel}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="z-[80] w-[--radix-popover-trigger-width] min-w-[260px] p-0" align="start">
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a player's name..."
            className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        <ScrollArea className="max-h-[320px]">
          <div className="p-1">
            {allLabel && (
              <button
                type="button"
                onClick={() => handleSelect(allValue)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                  isAllSelected && "bg-accent",
                )}
              >
                <Check className={cn("h-4 w-4", isAllSelected ? "opacity-100" : "opacity-0")} />
                <span>{allLabel}</span>
              </button>
            )}
            {grouped.length === 0 || filtered.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">No players found</div>
            ) : (
              grouped.map((group) => (
                <div key={group.status}>
                  {group.label && (
                    <div className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.label}
                    </div>
                  )}
                  {group.players.map((player) => {
                    const isSelected = player.id === value;
                    return (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => handleSelect(player.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
                          isSelected && "bg-accent",
                        )}
                      >
                        <Check className={cn("h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                        {showAvatar && (
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                            {player.image_url ? (
                              <img src={player.image_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <UserIcon className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                        )}
                        <span className="truncate">{player.name}</span>
                        {player.position && (
                          <span className="text-xs text-muted-foreground">({player.position})</span>
                        )}
                        {showClub && player.club && (
                          <span className="ml-auto truncate text-xs text-muted-foreground">{player.club}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
