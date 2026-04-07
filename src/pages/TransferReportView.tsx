import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { Loader2 } from "lucide-react";

const TransferReportView = () => {
  const { slug } = useParams<{ slug: string }>();
  const [report, setReport] = useState<any>(null);
  const [player, setPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const fetchReport = async () => {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('transfer_reports')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();

      if (fetchError || !data) {
        setError('Report not found or not yet published.');
        setLoading(false);
        return;
      }

      setReport(data);

      // Fetch player data
      const { data: playerData } = await supabase
        .from('players')
        .select('*')
        .eq('id', data.player_id)
        .maybeSingle();
      
      setPlayer(playerData);
      setLoading(false);
    };
    fetchReport();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Report Unavailable</h1>
          <p className="text-muted-foreground">{error || 'This report does not exist.'}</p>
        </div>
      </div>
    );
  }

  const sections = report.included_sections || [];

  return (
    <>
      <SEO
        title={`${report.title} - RISE Football Agency`}
        description={`Transfer report for ${player?.name || 'Player'}`}
      />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-card border-b border-border">
          <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="flex items-center gap-6">
              {player?.image_url && (
                <img src={player.image_url} alt={player?.name} className="w-24 h-24 rounded-full object-cover border-2 border-primary" />
              )}
              <div>
                <h1 className="text-3xl font-bebas mb-1">{report.title}</h1>
                <p className="text-lg text-muted-foreground">{player?.name}</p>
                {player?.current_club && (
                  <p className="text-sm text-muted-foreground">{player.current_club}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
          {sections.includes('biography') && player && (
            <section>
              <h2 className="text-xl font-semibold mb-3 border-b border-border pb-2">Profile</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {player.date_of_birth && (
                  <div>
                    <p className="text-xs text-muted-foreground">Date of Birth</p>
                    <p className="text-sm font-medium">{new Date(player.date_of_birth).toLocaleDateString('en-GB')}</p>
                  </div>
                )}
                {player.nationality && (
                  <div>
                    <p className="text-xs text-muted-foreground">Nationality</p>
                    <p className="text-sm font-medium">{player.nationality}</p>
                  </div>
                )}
                {player.position && (
                  <div>
                    <p className="text-xs text-muted-foreground">Position</p>
                    <p className="text-sm font-medium">{player.position}</p>
                  </div>
                )}
                {player.height && (
                  <div>
                    <p className="text-xs text-muted-foreground">Height</p>
                    <p className="text-sm font-medium">{player.height}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {sections.includes('stats') && player && (
            <section>
              <h2 className="text-xl font-semibold mb-3 border-b border-border pb-2">Season Statistics</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold">{player.appearances ?? '-'}</p>
                  <p className="text-xs text-muted-foreground">Appearances</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold">{player.goals ?? '-'}</p>
                  <p className="text-xs text-muted-foreground">Goals</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold">{player.assists ?? '-'}</p>
                  <p className="text-xs text-muted-foreground">Assists</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold">{player.minutes_played ?? '-'}</p>
                  <p className="text-xs text-muted-foreground">Minutes</p>
                </div>
              </div>
            </section>
          )}

          {sections.includes('form_chart') && (
            <section>
              <h2 className="text-xl font-semibold mb-3 border-b border-border pb-2">Form Chart</h2>
              <p className="text-sm text-muted-foreground">Form data coming soon.</p>
            </section>
          )}

          {sections.includes('graphics') && (
            <section>
              <h2 className="text-xl font-semibold mb-3 border-b border-border pb-2">Graphics</h2>
              <p className="text-sm text-muted-foreground">Player graphics coming soon.</p>
            </section>
          )}

          {sections.includes('clips') && (
            <section>
              <h2 className="text-xl font-semibold mb-3 border-b border-border pb-2">Match Clips</h2>
              <p className="text-sm text-muted-foreground">Video clips coming soon.</p>
            </section>
          )}

          {sections.includes('highlights') && (
            <section>
              <h2 className="text-xl font-semibold mb-3 border-b border-border pb-2">Highlights</h2>
              <p className="text-sm text-muted-foreground">Highlights reel coming soon.</p>
            </section>
          )}

          {sections.includes('comparison') && (
            <section>
              <h2 className="text-xl font-semibold mb-3 border-b border-border pb-2">Player Comparisons</h2>
              <p className="text-sm text-muted-foreground">Comparison data coming soon.</p>
            </section>
          )}

          {sections.includes('scouting_notes') && report.custom_notes && (
            <section>
              <h2 className="text-xl font-semibold mb-3 border-b border-border pb-2">Notes</h2>
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-sm whitespace-pre-wrap">{report.custom_notes}</p>
              </div>
            </section>
          )}

          {/* Footer */}
          <div className="text-center py-8 border-t border-border">
            <p className="text-xs text-muted-foreground">Prepared by RISE Football Agency</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default TransferReportView;
