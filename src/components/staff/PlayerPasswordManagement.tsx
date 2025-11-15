import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { RefreshCw, Key, CheckCircle, XCircle } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  email: string;
  hasAuthAccount: boolean;
}

export const PlayerPasswordManagement = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState<string | null>(null);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      
      // Get all players
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, name, email')
        .not('email', 'is', null)
        .order('name');

      if (playersError) throw playersError;

      // Get all auth users
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/admin/users`,
        {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        }
      );
      
      const authData = await response.json();
      const authEmails = new Set(authData.users?.map((u: any) => u.email) || []);

      // Combine data
      const playersWithAuthStatus = playersData?.map(player => ({
        ...player,
        hasAuthAccount: authEmails.has(player.email)
      })) || [];

      setPlayers(playersWithAuthStatus);
    } catch (error) {
      console.error('Error fetching players:', error);
      toast.error('Failed to load players');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const resetPlayerPassword = async (playerEmail: string, playerName: string) => {
    try {
      setResetting(playerEmail);
      
      const { data, error } = await supabase.functions.invoke('reset-player-password', {
        body: { playerEmail }
      });

      if (error) throw error;

      const message = data.action === 'created' 
        ? `Auth account created for ${playerName}` 
        : `Password reset for ${playerName}`;
      
      toast.success(message);
      fetchPlayers(); // Refresh the list
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error(`Failed to reset password: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setResetting(null);
    }
  };

  const resetAllPasswords = async () => {
    const playersWithoutAuth = players.filter(p => !p.hasAuthAccount);
    
    if (playersWithoutAuth.length === 0) {
      toast.info('All players already have auth accounts');
      return;
    }

    const confirmMsg = `Create auth accounts for ${playersWithoutAuth.length} players?`;
    if (!confirm(confirmMsg)) return;

    for (const player of playersWithoutAuth) {
      await resetPlayerPassword(player.email, player.name);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  const playersWithAuth = players.filter(p => p.hasAuthAccount).length;
  const playersWithoutAuth = players.filter(p => !p.hasAuthAccount).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Player Password Management
        </CardTitle>
        <CardDescription>
          Manage authentication accounts for players. Password format: rise_player_[player_id]
        </CardDescription>
        <div className="flex gap-2 pt-2">
          <Badge variant="outline" className="gap-1">
            <CheckCircle className="h-3 w-3 text-green-500" />
            {playersWithAuth} with auth
          </Badge>
          <Badge variant="outline" className="gap-1">
            <XCircle className="h-3 w-3 text-orange-500" />
            {playersWithoutAuth} without auth
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={fetchPlayers} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {playersWithoutAuth > 0 && (
            <Button onClick={resetAllPasswords} variant="default" size="sm">
              Create Auth for All ({playersWithoutAuth})
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {players.map(player => (
            <div 
              key={player.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex-1">
                <div className="font-medium">{player.name}</div>
                <div className="text-sm text-muted-foreground">{player.email}</div>
              </div>
              <div className="flex items-center gap-2">
                {player.hasAuthAccount ? (
                  <Badge variant="outline" className="gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Has Auth
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <XCircle className="h-3 w-3 text-orange-500" />
                    No Auth
                  </Badge>
                )}
                <Button
                  onClick={() => resetPlayerPassword(player.email, player.name)}
                  disabled={resetting === player.email}
                  size="sm"
                  variant={player.hasAuthAccount ? "outline" : "default"}
                >
                  {resetting === player.email ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    player.hasAuthAccount ? 'Reset' : 'Create'
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
