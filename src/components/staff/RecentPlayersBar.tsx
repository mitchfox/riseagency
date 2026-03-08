import { User } from "lucide-react";

interface RecentPlayer {
  id: string;
  name: string;
  image_url: string | null;
}

interface RecentPlayersBarProps {
  recentPlayers: RecentPlayer[];
  selectedPlayerId: string | null;
  onSelect: (id: string) => void;
}

const STORAGE_KEY = "athleteCentre_recentPlayers";

export const getRecentPlayerIds = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

export const addRecentPlayer = (playerId: string) => {
  const existing = getRecentPlayerIds().filter(id => id !== playerId);
  const updated = [playerId, ...existing].slice(0, 5);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const RecentPlayersBar = ({ recentPlayers, selectedPlayerId, onSelect }: RecentPlayersBarProps) => {
  if (recentPlayers.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <span className="text-xs text-muted-foreground shrink-0">Recent:</span>
      {recentPlayers.map((player) => (
        <button
          key={player.id}
          onClick={() => onSelect(player.id)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-medium transition-colors shrink-0 ${
            player.id === selectedPlayerId
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card hover:bg-accent border-border"
          }`}
        >
          <div className="w-5 h-5 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0">
            {player.image_url ? (
              <img src={player.image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
          <span className="truncate max-w-[80px]">{player.name.split(" ").pop()}</span>
        </button>
      ))}
    </div>
  );
};
