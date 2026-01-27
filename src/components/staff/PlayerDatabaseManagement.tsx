import { PlayerDatabase } from './PlayerDatabase';

export const PlayerDatabaseManagement = ({ isAdmin }: { isAdmin: boolean }) => {
  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 rounded-xl bg-gradient-to-b from-background via-background to-muted/30 border border-border/50">
      <PlayerDatabase />
    </div>
  );
};
