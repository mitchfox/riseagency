import { useState } from 'react';
import { PlayerDatabase } from './PlayerDatabase';
import { PlayerAddMode } from './PlayerAddMode';
import { SquadView } from './SquadView';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Table as TableIcon, Sparkles, UserPlus } from 'lucide-react';

type Mode = 'classic' | 'squad';
type AddMode = 'ai' | 'manual';

export const PlayerDatabaseActions = () => {
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>('ai');

  const openAdd = (nextMode: AddMode) => {
    setAddMode(nextMode);
    setAddOpen(true);
  };

  return (
    <section className="rounded-lg border border-[hsl(var(--rise-gold)/0.35)] bg-card/65 px-2.5 py-2 shadow-[0_0_18px_hsl(var(--rise-gold)/0.08)]">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto min-w-0 text-[10px] font-black uppercase tracking-[0.18em] text-[hsl(var(--rise-gold))]">
          Player database actions
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => openAdd('ai')}
          className="h-7 gap-1.5 border !border-[hsl(var(--rise-gold))] !bg-[hsl(var(--rise-gold))] px-2.5 text-[10px] font-black uppercase tracking-wider !text-background shadow-[0_0_14px_hsl(var(--rise-gold)/0.3)] hover:!bg-[hsl(var(--rise-gold)/0.88)]"
        >
          <UserPlus className="h-3.5 w-3.5" /> Add players
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => openAdd('ai')}
          className="h-7 gap-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-wider"
        >
          <Sparkles className="h-3.5 w-3.5" /> AI bulk add
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => openAdd('manual')}
          className="h-7 gap-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-wider"
        >
          Manual add
        </Button>
      </div>
      {addOpen && (
        <div className="mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <PlayerAddMode key={addMode} initialMode={addMode} onExit={() => setAddOpen(false)} />
        </div>
      )}
    </section>
  );
};

export const PlayerDatabaseManagement = ({ isAdmin: _isAdmin }: { isAdmin: boolean }) => {
  const [mode, setMode] = useState<Mode>('classic');
  return (
    <div className="space-y-4 rounded-xl border border-border/50 bg-background/40 p-3 md:p-4">
      <div className="flex items-center justify-end gap-1">
        <div className="flex flex-wrap items-center justify-end gap-1.5">
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
