import { PlayerDatabase } from './PlayerDatabase';

export const PlayerDatabaseManagement = ({ isAdmin }: { isAdmin: boolean }) => {
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold">Player Database</h2>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          View all players with scouting reports
        </p>
      </div>

      <PlayerDatabase />
    </div>
  );
};
