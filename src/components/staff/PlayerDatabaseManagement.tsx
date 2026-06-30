import { useState } from 'react';
import { PlayerDatabase } from './PlayerDatabase';
import { SquadView } from './SquadView';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Table as TableIcon, UserPlus } from 'lucide-react';
import { PlayerAddMode } from './PlayerAddMode';

type Mode = 'classic' | 'squad';

export const PlayerDatabaseManagement = ({ isAdmin }: { isAdmin: boolean }) => {
  const [mode, setMode] = useState<Mode>('classic');
  const [adding, setAdding] = useState(false);
  if (adding) return <PlayerAddMode onExit={() => setAdding(false)} />;
  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 rounded-xl bg-gradient-to-b from-background via-background to-muted/30 border border-border/50">
      <div className="flex items-center justify-between gap-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setAdding(true)}
          className="h-9 text-xs gap-1.5 font-bold uppercase tracking-wider !bg-[hsl(var(--rise-gold))] !text-black border-2 !border-[hsl(var(--rise-gold))] hover:!bg-[hsl(var(--rise-gold)/0.85)] shadow-[0_0_18px_hsl(var(--rise-gold)/0.45)]"
        >
          <UserPlus className="h-4 w-4" /> Add players
        </Button>
        <div className="flex items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant={mode === 'classic' ? 'default' : 'outline'}
          onClick={() => setMode('classic')}
          className="h-8 text-xs gap-1.5"
        >
          <LayoutGrid className="h-3.5 w-3.5" /> Classic
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === 'squad' ? 'default' : 'outline'}
          onClick={() => setMode('squad')}
          className="h-8 text-xs gap-1.5"
        >
          <TableIcon className="h-3.5 w-3.5" /> Squad view
        </Button>
        </div>
      </div>
      {mode === 'classic' ? <PlayerDatabase /> : <SquadView />}
    </div>
  );
};
