import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface PlayerReport {
  player_name: string;
  position: string | null;
  report_count: number;
  reports: Array<{
    id: string;
    current_club: string | null;
    nationality: string | null;
    scouting_date: string;
    scout_name: string | null;
    overall_rating: number | null;
    status: string;
    summary: string | null;
  }>;
}

export const PlayerDatabase = () => {
  const [playerReports, setPlayerReports] = useState<PlayerReport[]>([]);
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlayerReports();
  }, []);

  const fetchPlayerReports = async () => {
    try {
      // Fetch from all sources: scouting_reports, youth outreach, and pro outreach
      const [scoutingResult, youthResult, proResult] = await Promise.all([
        supabase.from('scouting_reports').select('*').order('player_name', { ascending: true }),
        supabase.from('player_outreach_youth').select('*').order('player_name', { ascending: true }),
        supabase.from('player_outreach_pro').select('*').order('player_name', { ascending: true })
      ]);

      if (scoutingResult.error) throw scoutingResult.error;
      if (youthResult.error) throw youthResult.error;
      if (proResult.error) throw proResult.error;

      const grouped: Record<string, PlayerReport> = {};

      // Add scouting reports
      scoutingResult.data?.forEach(report => {
        const name = report.player_name;
        if (!grouped[name]) {
          grouped[name] = {
            player_name: name,
            position: report.position,
            report_count: 0,
            reports: []
          };
        }
        grouped[name].report_count++;
        grouped[name].reports.push({
          id: report.id,
          current_club: report.current_club,
          nationality: report.nationality,
          scouting_date: report.scouting_date,
          scout_name: report.scout_name,
          overall_rating: report.overall_rating,
          status: report.status,
          summary: report.summary
        });
      });

      // Add youth outreach players (if not already in scouting reports)
      youthResult.data?.forEach(outreach => {
        const name = outreach.player_name;
        if (!grouped[name]) {
          grouped[name] = {
            player_name: name,
            position: null,
            report_count: 1,
            reports: [{
              id: outreach.id,
              current_club: null,
              nationality: null,
              scouting_date: outreach.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
              scout_name: null,
              overall_rating: null,
              status: 'outreach',
              summary: `Youth outreach${outreach.notes ? ': ' + outreach.notes : ''}`
            }]
          };
        }
      });

      // Add pro outreach players (if not already in scouting reports)
      proResult.data?.forEach(outreach => {
        const name = outreach.player_name;
        if (!grouped[name]) {
          grouped[name] = {
            player_name: name,
            position: null,
            report_count: 1,
            reports: [{
              id: outreach.id,
              current_club: null,
              nationality: null,
              scouting_date: outreach.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
              scout_name: null,
              overall_rating: null,
              status: 'outreach',
              summary: `Pro outreach${outreach.notes ? ': ' + outreach.notes : ''}`
            }]
          };
        }
      });

      // Sort by player name
      const sortedPlayers = Object.values(grouped).sort((a, b) => 
        a.player_name.localeCompare(b.player_name)
      );

      setPlayerReports(sortedPlayers);
    } catch (error) {
      console.error('Error fetching player reports:', error);
      toast.error('Failed to load player database');
    } finally {
      setLoading(false);
    }
  };

  const togglePlayer = (playerName: string) => {
    setExpandedPlayer(expandedPlayer === playerName ? null : playerName);
  };

  if (loading) {
    return <div className="text-center py-8">Loading player database...</div>;
  }

  return (
    <div className="space-y-2">
      {playerReports.map((player) => (
          <div key={player.player_name} className="border rounded-lg bg-card">
            <button
              onClick={() => togglePlayer(player.player_name)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent/5 transition-colors"
            >
              <div className="flex items-center gap-4 text-left">
                {expandedPlayer === player.player_name ? (
                  <ChevronDown className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 flex-shrink-0" />
                )}
                <div>
                  <p className="font-medium">{player.player_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {player.position || 'Unknown position'}
                  </p>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {player.report_count} {player.report_count === 1 ? 'report' : 'reports'}
              </div>
            </button>

            {expandedPlayer === player.player_name && (
              <div className="px-4 pb-4 space-y-3 border-t">
                {player.reports.map((report) => (
                  <div
                    key={report.id}
                    className="mt-3 p-3 bg-muted/30 rounded-lg space-y-2"
                  >
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {report.current_club && (
                        <div>
                          <span className="font-medium">Club:</span> {report.current_club}
                        </div>
                      )}
                      {report.nationality && (
                        <div>
                          <span className="font-medium">Nationality:</span> {report.nationality}
                        </div>
                      )}
                      {report.scout_name && (
                        <div>
                          <span className="font-medium">Scout:</span> {report.scout_name}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Date:</span>{' '}
                        {new Date(report.scouting_date).toLocaleDateString()}
                      </div>
                      {report.overall_rating && (
                        <div>
                          <span className="font-medium">Rating:</span> {report.overall_rating}/10
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Status:</span>{' '}
                        <span className="capitalize">{report.status}</span>
                      </div>
                    </div>
                    {report.summary && (
                      <div className="text-sm pt-2 border-t">
                        <span className="font-medium">Summary:</span>
                        <p className="mt-1 text-muted-foreground">{report.summary}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
      ))}
      {playerReports.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No players in database yet
        </div>
      )}
    </div>
  );
};
