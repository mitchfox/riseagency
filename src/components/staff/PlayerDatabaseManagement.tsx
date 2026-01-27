import { PlayerDatabase } from './PlayerDatabase';

export const PlayerDatabaseManagement = ({ isAdmin }: { isAdmin: boolean }) => {
  return (
    <div className="space-y-4 md:space-y-6">
      <PlayerDatabase />
    </div>
  );
};
