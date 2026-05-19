import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, RotateCcw } from "lucide-react";

const STORAGE_KEY = "athleteCentre_lastSession";

export interface SessionState {
  playerId: string;
  playerName: string;
  mainTab: string;
  openSections: Record<string, boolean>;
  inlineReport?: {
    playerId: string;
    playerName: string;
    analysisId?: string;
    reportType?: 'player' | 'team';
    opponent?: string;
  };
  savedAt: number;
}

export const saveSession = (state: Omit<SessionState, "savedAt">) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
};

export const clearSession = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const getSavedSession = (): SessionState | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as SessionState;
    // Expire after 24 hours
    if (Date.now() - session.savedAt > 24 * 60 * 60 * 1000) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
};

interface SessionResumeBannerProps {
  onResume: (session: SessionState) => void;
}

export const SessionResumeBanner = ({ onResume }: SessionResumeBannerProps) => {
  const [session, setSession] = useState<SessionState | null>(null);

  useEffect(() => {
    setSession(getSavedSession());
  }, []);

  if (!session) return null;

  const description = session.inlineReport
    ? `Editing ${session.inlineReport.playerName}'s report${session.inlineReport.opponent ? ` vs ${session.inlineReport.opponent}` : ""}`
    : `Working on ${session.playerName}`;

  const openSectionNames = Object.entries(session.openSections)
    .filter(([, open]) => open)
    .map(([key]) => key);

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-accent/30 border-accent">
      <RotateCcw className="h-4 w-4 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{description}</p>
        {openSectionNames.length > 0 && !session.inlineReport && (
          <p className="text-xs text-muted-foreground truncate">
            Sections open: {openSectionNames.join(", ")}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          size="sm"
          variant="default"
          className="h-7 text-xs"
          onClick={() => {
            onResume(session);
            clearSession();
            setSession(null);
          }}
        >
          Resume
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={() => {
            clearSession();
            setSession(null);
          }}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
