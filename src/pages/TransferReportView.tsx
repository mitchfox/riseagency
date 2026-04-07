import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { Loader2 } from "lucide-react";
import { parsePlayerBio, parsePlayerHighlights } from "@/lib/playerDataParser";
import { getCountryFlagUrl } from "@/lib/countryFlags";
import { FormationDisplay } from "@/components/FormationDisplay";
import blackMarbleBg from "@/assets/black-marble-menu.png";

const TransferReportView = () => {
  const { slug } = useParams<{ slug: string }>();
  const [report, setReport] = useState<any>(null);
  const [player, setPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<any[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [performanceReports, setPerformanceReports] = useState<any[]>([]);

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

      if (playerData) {
        const bioData = parsePlayerBio(playerData.bio);
        const parsedHighlights = parsePlayerHighlights(playerData.highlights);
        
        let bioText = '';
        if (playerData.bio) {
          try {
            const parsed = JSON.parse(playerData.bio);
            bioText = parsed.bio || parsed.text || '';
          } catch {
            bioText = typeof playerData.bio === 'string' ? playerData.bio : '';
          }
        }

        setPlayer({
          ...playerData,
          ...bioData,
          bioText,
          highlightsArray: parsedHighlights,
        });
        setHighlights(parsedHighlights);

        // Fetch performance reports for form chart
        const { data: analysisData } = await supabase
          .from('player_analysis')
          .select('*')
          .eq('player_id', playerData.id)
          .order('analysis_date', { ascending: false });
        setPerformanceReports(analysisData || []);
      }

      setLoading(false);
    };
    fetchReport();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundImage: `url(${blackMarbleBg})`, backgroundSize: 'cover' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-2 border-[hsl(var(--gold))]/30 border-t-[hsl(var(--gold))] rounded-full animate-spin" />
          <p className="text-[hsl(var(--gold))]/60 font-bebas uppercase tracking-widest text-sm">Loading Report</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundImage: `url(${blackMarbleBg})`, backgroundSize: 'cover' }}>
        <div className="text-center">
          <h1 className="text-3xl font-bebas text-[hsl(var(--gold))] mb-2">Report Unavailable</h1>
          <p className="text-foreground/60">{error || 'This report does not exist.'}</p>
        </div>
      </div>
    );
  }

  const sections = report.included_sections || [];

  const getR90Color = (score: number) => {
    if (score >= 0.08) return 'bg-emerald-500';
    if (score >= 0.05) return 'bg-yellow-500';
    if (score >= 0.02) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <>
      <SEO
        title={`${report.title} - RISE Football Agency`}
        description={`Transfer report for ${player?.name || 'Player'}`}
      />
      <div className="min-h-screen" style={{ backgroundImage: `url(${blackMarbleBg})`, backgroundSize: 'cover', backgroundAttachment: 'fixed' }}>

        {/* Hero Header */}
        <div className="relative overflow-hidden border-b-2 border-[hsl(var(--gold))]/30">
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-transparent" />
          <div className="container mx-auto px-4 py-10 max-w-5xl relative z-10">
            <div className="flex items-center gap-8">
              {player?.image_url && (
                <div className="relative flex-shrink-0">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-lg overflow-hidden border-2 border-[hsl(var(--gold))]">
                    <img src={player.image_url} alt={player?.name} className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[hsl(var(--gold))]/60 font-bebas uppercase tracking-[0.3em] text-sm mb-1">Transfer Report</p>
                <h1 className="text-4xl md:text-5xl font-bebas uppercase tracking-wide text-foreground leading-none mb-3">{player?.name}</h1>
                <div className="flex flex-wrap items-center gap-4 text-foreground/70">
                  {player?.position && (
                    <span className="font-bebas uppercase tracking-wider text-lg">{player.position}</span>
                  )}
                  {player?.nationality && (
                    <span className="flex items-center gap-2 font-bebas uppercase tracking-wider text-lg">
                      <img src={getCountryFlagUrl(player.nationality)} alt={player.nationality} className="w-6 h-4 object-cover rounded" />
                      {player.nationality}
                    </span>
                  )}
                  {player?.dateOfBirth && (
                    <span className="font-bebas uppercase tracking-wider text-lg">
                      {new Date(player.dateOfBirth || player.date_of_birth).toLocaleDateString('en-GB')} ({player.age})
                    </span>
                  )}
                  {player?.currentClub && (
                    <span className="flex items-center gap-2 font-bebas uppercase tracking-wider text-lg">
                      {player.currentClubLogo && <img src={player.currentClubLogo} alt={player.currentClub} className="w-6 h-6 object-contain" />}
                      {player.currentClub}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-10 max-w-5xl space-y-12">

          {/* Biography */}
          {sections.includes('biography') && player?.bioText && (
            <section>
              <h2 className="text-3xl font-bebas text-[hsl(var(--gold))] uppercase tracking-widest mb-6 flex items-center gap-3">
                <span className="w-12 h-1 bg-[hsl(var(--gold))]" />
                Biography
                <span className="flex-1 h-1 bg-[hsl(var(--gold))]/20" />
              </h2>
              <div className="bg-secondary/20 backdrop-blur-sm rounded-lg border border-[hsl(var(--gold))]/10 p-6">
                <p className="text-foreground/80 leading-relaxed whitespace-pre-line">{player.bioText}</p>
              </div>

              {/* Strengths */}
              {player.strengthsAndPlayStyle && (
                <div className="mt-6">
                  <h3 className="text-xl font-bebas text-[hsl(var(--gold))]/80 uppercase tracking-wider mb-3">Strengths & Play Style</h3>
                  {Array.isArray(player.strengthsAndPlayStyle) ? (
                    <div className="flex flex-wrap gap-2">
                      {player.strengthsAndPlayStyle.map((s: string, i: number) => (
                        <span key={i} className="px-3 py-1.5 rounded-md border border-[hsl(var(--gold))]/20 bg-[hsl(var(--gold))]/5 text-sm text-foreground/80 font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-foreground/70 text-sm">{player.strengthsAndPlayStyle}</p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Season Statistics */}
          {sections.includes('stats') && player?.seasonStats && player.seasonStats.length > 0 && (
            <section>
              <h2 className="text-3xl font-bebas text-[hsl(var(--gold))] uppercase tracking-widest mb-6 flex items-center gap-3">
                <span className="w-12 h-1 bg-[hsl(var(--gold))]" />
                Season Statistics
                <span className="flex-1 h-1 bg-[hsl(var(--gold))]/20" />
              </h2>
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {player.seasonStats.map((stat: any, idx: number) => (
                  <div
                    key={idx}
                    className="group relative overflow-hidden rounded-xl border-2 border-[hsl(var(--gold))]/30 bg-gradient-to-br from-secondary/40 via-secondary/30 to-secondary/20 backdrop-blur-sm p-6 md:p-8 transition-all duration-300 hover:border-[hsl(var(--gold))]/60 hover:shadow-[0_0_30px_rgba(212,175,55,0.2)]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--gold))]/5 via-transparent to-[hsl(var(--gold))]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative text-center">
                      <div className="text-5xl md:text-6xl font-bebas text-transparent bg-clip-text bg-gradient-to-br from-[hsl(var(--gold))] via-[hsl(var(--gold))]/80 to-[hsl(var(--gold))]/60 mb-2 leading-none tracking-tight">
                        {stat.value || "0"}
                      </div>
                      <div className="text-xs md:text-sm text-foreground/70 uppercase tracking-[0.15em] font-bold font-bebas">
                        {stat.header}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Top Stats / In Numbers */}
              {player.topStats && player.topStats.length > 0 && (
                <div className="mt-8 bg-secondary/20 backdrop-blur-sm rounded-lg border border-[hsl(var(--gold))]/10 p-6 space-y-5">
                  <h3 className="text-xl font-bebas text-[hsl(var(--gold))]/80 uppercase tracking-wider mb-2">In Numbers</h3>
                  {player.topStats.map((stat: any, index: number) => (
                    <div key={index}>
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-14 h-14 bg-[hsl(var(--gold))]/10 rounded-lg flex items-center justify-center">
                          <span className="text-3xl font-bebas text-[hsl(var(--gold))] leading-none">{stat.value}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-foreground/90 uppercase tracking-wider font-bold block mb-1">{stat.label}</span>
                          {stat.description && <p className="text-sm text-foreground/60 leading-relaxed">{stat.description}</p>}
                        </div>
                      </div>
                      {index < player.topStats.length - 1 && <div className="h-px bg-border/30 mt-4" />}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Tactical Formations */}
          {sections.includes('biography') && player?.tacticalFormations && player.tacticalFormations.length > 0 && (
            <section>
              <h2 className="text-3xl font-bebas text-[hsl(var(--gold))] uppercase tracking-widest mb-6 flex items-center gap-3">
                <span className="w-12 h-1 bg-[hsl(var(--gold))]" />
                Tactical History
                <span className="flex-1 h-1 bg-[hsl(var(--gold))]/20" />
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {player.tacticalFormations.map((scheme: any, idx: number) => (
                  <div key={idx} className="rounded-xl border border-[hsl(var(--gold))]/20 bg-secondary/20 backdrop-blur-sm p-4 transition-all hover:border-[hsl(var(--gold))]/40">
                    <div className="flex items-center gap-3 mb-3">
                      {scheme.clubLogo && <img src={scheme.clubLogo} alt={scheme.club} className="w-8 h-8 object-contain" />}
                      <div>
                        <p className="font-bebas uppercase tracking-wider text-foreground">{scheme.club}</p>
                        <p className="text-xs text-foreground/50">{scheme.formation} · {scheme.positions?.join(', ')}</p>
                      </div>
                    </div>
                    {scheme.playerImage && (
                      <img src={scheme.playerImage} alt={scheme.club} className="w-full h-32 object-cover rounded-md mt-2 border border-[hsl(var(--gold))]/10" />
                    )}
                    <div className="flex items-center justify-between mt-3 text-xs text-foreground/50">
                      <span>{typeof scheme.matches === 'number' ? `${scheme.matches} appearances` : scheme.matches}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Form Chart */}
          {sections.includes('form_chart') && performanceReports.length > 0 && (
            <section>
              <h2 className="text-3xl font-bebas text-[hsl(var(--gold))] uppercase tracking-widest mb-6 flex items-center gap-3">
                <span className="w-12 h-1 bg-[hsl(var(--gold))]" />
                Recent Form
                <span className="flex-1 h-1 bg-[hsl(var(--gold))]/20" />
              </h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {performanceReports.slice(0, 12).map((report: any) => (
                  <div key={report.id} className="rounded-lg border border-[hsl(var(--gold))]/15 bg-secondary/20 backdrop-blur-sm p-4 flex items-center justify-between">
                    <div>
                      <p className="font-bebas uppercase text-sm text-foreground tracking-wider">{report.opponent || 'Match'}</p>
                      <p className="text-xs text-foreground/50">{report.analysis_date ? new Date(report.analysis_date).toLocaleDateString('en-GB') : ''}</p>
                    </div>
                    {report.r90_average != null && (
                      <div className={`w-10 h-10 rounded-md ${getR90Color(report.r90_average)} flex items-center justify-center`}>
                        <span className="text-sm font-bold text-white">{report.r90_average.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Highlights */}
          {sections.includes('highlights') && highlights.length > 0 && (
            <section>
              <h2 className="text-3xl font-bebas text-[hsl(var(--gold))] uppercase tracking-widest mb-6 flex items-center gap-3">
                <span className="w-12 h-1 bg-[hsl(var(--gold))]" />
                Highlights
                <span className="flex-1 h-1 bg-[hsl(var(--gold))]/20" />
              </h2>
              <div className="rounded-xl border-2 border-[hsl(var(--gold))]/30 overflow-hidden bg-black">
                {highlights[currentVideoIndex]?.videoUrl ? (
                  <video
                    key={highlights[currentVideoIndex].videoUrl}
                    src={highlights[currentVideoIndex].videoUrl}
                    className="w-full aspect-video object-contain"
                    controls
                    playsInline
                    autoPlay
                    onEnded={() => {
                      const next = (currentVideoIndex + 1) % highlights.length;
                      setCurrentVideoIndex(next);
                    }}
                  />
                ) : (
                  <div className="aspect-video flex items-center justify-center text-foreground/40">No video available</div>
                )}
                {highlights.length > 1 && (
                  <div className="flex gap-1 p-2 bg-background/50 backdrop-blur-sm overflow-x-auto">
                    {highlights.map((h, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentVideoIndex(i)}
                        className={`flex-shrink-0 w-8 h-8 rounded border overflow-hidden transition-all ${
                          i === currentVideoIndex ? 'border-[hsl(var(--gold))] scale-110' : 'border-border/30 hover:border-[hsl(var(--gold))]/40'
                        }`}
                      >
                        {(h.logoUrl || h.clubLogo) && (
                          <img src={h.logoUrl || h.clubLogo} alt={h.name || ''} className="w-full h-full object-contain p-0.5" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Scouting Notes */}
          {sections.includes('scouting_notes') && report.custom_notes && (
            <section>
              <h2 className="text-3xl font-bebas text-[hsl(var(--gold))] uppercase tracking-widest mb-6 flex items-center gap-3">
                <span className="w-12 h-1 bg-[hsl(var(--gold))]" />
                Scouting Notes
                <span className="flex-1 h-1 bg-[hsl(var(--gold))]/20" />
              </h2>
              <div className="bg-secondary/20 backdrop-blur-sm rounded-lg border border-[hsl(var(--gold))]/10 p-6">
                <p className="text-foreground/80 whitespace-pre-wrap leading-relaxed">{report.custom_notes}</p>
              </div>
            </section>
          )}

          {/* Placeholder sections for things not yet populated */}
          {sections.includes('graphics') && (
            <section>
              <h2 className="text-3xl font-bebas text-[hsl(var(--gold))] uppercase tracking-widest mb-6 flex items-center gap-3">
                <span className="w-12 h-1 bg-[hsl(var(--gold))]" />
                Graphics
                <span className="flex-1 h-1 bg-[hsl(var(--gold))]/20" />
              </h2>
              <div className="bg-secondary/10 rounded-lg border border-[hsl(var(--gold))]/5 p-8 text-center text-foreground/30">
                <p className="font-bebas uppercase tracking-wider">Graphics coming soon</p>
              </div>
            </section>
          )}

          {sections.includes('clips') && (
            <section>
              <h2 className="text-3xl font-bebas text-[hsl(var(--gold))] uppercase tracking-widest mb-6 flex items-center gap-3">
                <span className="w-12 h-1 bg-[hsl(var(--gold))]" />
                Match Clips
                <span className="flex-1 h-1 bg-[hsl(var(--gold))]/20" />
              </h2>
              <div className="bg-secondary/10 rounded-lg border border-[hsl(var(--gold))]/5 p-8 text-center text-foreground/30">
                <p className="font-bebas uppercase tracking-wider">Match clips coming soon</p>
              </div>
            </section>
          )}

          {sections.includes('comparison') && (
            <section>
              <h2 className="text-3xl font-bebas text-[hsl(var(--gold))] uppercase tracking-widest mb-6 flex items-center gap-3">
                <span className="w-12 h-1 bg-[hsl(var(--gold))]" />
                Player Comparisons
                <span className="flex-1 h-1 bg-[hsl(var(--gold))]/20" />
              </h2>
              <div className="bg-secondary/10 rounded-lg border border-[hsl(var(--gold))]/5 p-8 text-center text-foreground/30">
                <p className="font-bebas uppercase tracking-wider">Comparison data coming soon</p>
              </div>
            </section>
          )}

          {/* Footer */}
          <div className="text-center py-10 border-t border-[hsl(var(--gold))]/10">
            <p className="text-xs text-foreground/30 font-bebas uppercase tracking-[0.3em]">Prepared by RISE Football Agency</p>
            <p className="text-xs text-foreground/20 mt-1">{new Date(report.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default TransferReportView;
