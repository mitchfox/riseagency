import { PlayerDatabase } from './PlayerDatabase';

export const PlayerDatabaseManagement = ({ isAdmin }: { isAdmin: boolean }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Player Database</h2>
          <p className="text-muted-foreground mt-1">
            View all players with scouting reports
          </p>
        </div>
      </div>

      <PlayerDatabase />
    </div>
  );
};
