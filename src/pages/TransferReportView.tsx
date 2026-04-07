import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { Loader2, Play, ChevronLeft, ChevronRight, TrendingUp, BarChart3 } from "lucide-react";
import { parsePlayerBio, parsePlayerHighlights } from "@/lib/playerDataParser";
import { getCountryFlagUrl } from "@/lib/countryFlags";
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
  const [comparisonPlayers, setComparisonPlayers] = useState<any[]>([]);
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [videoReports, setVideoReports] = useState<any[]>([]);
  const [activeVideoReport, setActiveVideoReport] = useState<any>(null);

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

        // Fetch comparison players in same position
        if (playerData.position) {
          const { data: compData } = await supabase
            .from('comparison_players')
            .select('*')
            .eq('position', playerData.position)
            .limit(5);
          setComparisonPlayers(compData || []);
        }

        // Fetch gallery images for this player
        const { data: galleryData } = await supabase
          .from('marketing_gallery')
          .select('*')
          .eq('player_id', playerData.id)
          .order('created_at', { ascending: false })
          .limit(12);
        setGalleryImages(galleryData || []);

        // Fetch video reports (analyses with video)
        const { data: videoData } = await supabase
          .from('analyses')
          .select('*')
          .eq('player_name', playerData.name)
          .not('video_url', 'is', null)
          .order('created_at', { ascending: false })
          .limit(10);
        setVideoReports(videoData || []);
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

  const includedSections = report.included_sections || [];
  const sectionOrder = report.section_order || ['in_numbers', 'highlights', 'biography', 'stats', 'data_graphics', 'form_chart', 'tactical', 'strengths', 'comparison', 'clips', 'graphics', 'scouting_notes'];

  const getR90Color = (score: number) => {
    if (score >= 0.08) return 'bg-emerald-500';
    if (score >= 0.05) return 'bg-yellow-500';
    if (score >= 0.02) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Find stats where player is above average compared to comparison players
  const getAboveAverageStats = () => {
    if (!player?.topStats || comparisonPlayers.length === 0) return [];
    // For now return all topStats as highlights
    return player.topStats || [];
  };

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case 'in_numbers':
        if (!player?.topStats || player.topStats.length === 0) return null;
        return (
          <section key={sectionId}>
            <SectionHeading title="In Numbers" />
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
              {player.topStats.map((stat: any, index: number) => (
                <div key={index} className="relative overflow-hidden rounded-xl border-2 border-[hsl(var(--gold))]/30 bg-gradient-to-br from-secondary/40 to-secondary/20 backdrop-blur-sm p-6 transition-all hover:border-[hsl(var(--gold))]/60 hover:shadow-[0_0_30px_rgba(212,175,55,0.2)]">
                  <div className="text-center">
                    <div className="text-4xl md:text-5xl font-bebas text-transparent bg-clip-text bg-gradient-to-br from-[hsl(var(--gold))] to-[hsl(var(--gold))]/60 mb-1 leading-none">
                      {stat.value}
                    </div>
                    <div className="text-xs text-foreground/70 uppercase tracking-[0.15em] font-bold font-bebas">{stat.label}</div>
                    {stat.description && <p className="text-[10px] text-foreground/40 mt-1">{stat.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      case 'highlights':
        if (highlights.length === 0) return null;
        return (
          <section key={sectionId}>
            <SectionHeading title="Highlights" />
            <div className="rounded-xl border-2 border-[hsl(var(--gold))]/30 overflow-hidden bg-black">
              {highlights[currentVideoIndex]?.videoUrl ? (
                <video
                  key={highlights[currentVideoIndex].videoUrl}
                  src={highlights[currentVideoIndex].videoUrl}
                  className="w-full aspect-video object-contain"
                  controls playsInline autoPlay
                  onEnded={() => setCurrentVideoIndex((currentVideoIndex + 1) % highlights.length)}
                />
              ) : (
                <div className="aspect-video flex items-center justify-center text-foreground/40">No video available</div>
              )}
              {highlights.length > 1 && (
                <div className="flex gap-1 p-2 bg-background/50 backdrop-blur-sm overflow-x-auto">
                  {highlights.map((h, i) => (
                    <button key={i} onClick={() => setCurrentVideoIndex(i)}
                      className={`flex-shrink-0 px-3 py-1 rounded text-xs font-bebas uppercase tracking-wider transition-all ${
                        i === currentVideoIndex ? 'bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))] border border-[hsl(var(--gold))]/40' : 'text-foreground/50 hover:text-foreground/80'
                      }`}>
                      {h.name || `Clip ${i + 1}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        );

      case 'biography':
        if (!player?.bioText) return null;
        return (
          <section key={sectionId}>
            <SectionHeading title="Biography" />
            <div className="bg-secondary/20 backdrop-blur-sm rounded-lg border border-[hsl(var(--gold))]/10 p-6">
              <p className="text-foreground/80 leading-relaxed whitespace-pre-line">{player.bioText}</p>
            </div>
          </section>
        );

      case 'stats':
        if (!player?.seasonStats || player.seasonStats.length === 0) return null;
        return (
          <section key={sectionId}>
            <SectionHeading title="Season Statistics" />
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              {player.seasonStats.map((stat: any, idx: number) => (
                <div key={idx} className="group relative overflow-hidden rounded-xl border-2 border-[hsl(var(--gold))]/30 bg-gradient-to-br from-secondary/40 via-secondary/30 to-secondary/20 backdrop-blur-sm p-6 md:p-8 transition-all duration-300 hover:border-[hsl(var(--gold))]/60 hover:shadow-[0_0_30px_rgba(212,175,55,0.2)]">
                  <div className="text-center">
                    <div className="text-5xl md:text-6xl font-bebas text-transparent bg-clip-text bg-gradient-to-br from-[hsl(var(--gold))] via-[hsl(var(--gold))]/80 to-[hsl(var(--gold))]/60 mb-2 leading-none tracking-tight">
                      {stat.value || "0"}
                    </div>
                    <div className="text-xs md:text-sm text-foreground/70 uppercase tracking-[0.15em] font-bold font-bebas">{stat.header}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      case 'data_graphics':
        // Show comparison data graphics - auto pick stats where player is doing better
        if (comparisonPlayers.length === 0 && (!player?.topStats || player.topStats.length === 0)) return null;
        return (
          <section key={sectionId}>
            <SectionHeading title="Data Graphics" />
            <div className="space-y-4">
              {player?.topStats && player.topStats.length > 0 && (
                <div className="bg-secondary/20 backdrop-blur-sm rounded-lg border border-[hsl(var(--gold))]/10 p-6">
                  <h3 className="text-lg font-bebas text-[hsl(var(--gold))]/80 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Key Performance Metrics
                  </h3>
                  <div className="space-y-3">
                    {player.topStats.map((stat: any, idx: number) => {
                      const value = parseFloat(String(stat.value).replace(/[^0-9.]/g, '')) || 0;
                      const maxVal = Math.max(value * 1.3, 10);
                      const pct = Math.min((value / maxVal) * 100, 100);
                      return (
                        <div key={idx}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-foreground/70 uppercase tracking-wider font-bebas">{stat.label}</span>
                            <span className="font-bold text-[hsl(var(--gold))]">{stat.value}</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--gold))]/60 to-[hsl(var(--gold))]" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>
        );

      case 'form_chart':
        if (performanceReports.length === 0) return null;
        return (
          <section key={sectionId}>
            <SectionHeading title="Recent Form" />
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
        );

      case 'tactical':
        if (!player?.tacticalFormations || player.tacticalFormations.length === 0) return null;
        return (
          <section key={sectionId}>
            <SectionHeading title="Tactical History" />
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
                  <div className="text-xs text-foreground/50">
                    {typeof scheme.matches === 'number' ? `${scheme.matches} appearances` : scheme.matches}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      case 'strengths':
        if (!player?.strengthsAndPlayStyle) return null;
        return (
          <section key={sectionId}>
            <SectionHeading title="Strengths & Play Style" />
            <div className="bg-secondary/20 backdrop-blur-sm rounded-lg border border-[hsl(var(--gold))]/10 p-6">
              {Array.isArray(player.strengthsAndPlayStyle) ? (
                <div className="flex flex-wrap gap-2">
                  {player.strengthsAndPlayStyle.map((s: string, i: number) => (
                    <span key={i} className="px-3 py-1.5 rounded-md border border-[hsl(var(--gold))]/20 bg-[hsl(var(--gold))]/5 text-sm text-foreground/80 font-medium">{s}</span>
                  ))}
                </div>
              ) : (
                <p className="text-foreground/70 text-sm">{player.strengthsAndPlayStyle}</p>
              )}
            </div>
          </section>
        );

      case 'comparison':
        if (comparisonPlayers.length === 0) return null;
        return (
          <section key={sectionId}>
            <SectionHeading title="Player Comparisons" />
            <div className="grid gap-3 md:grid-cols-2">
              {comparisonPlayers.map((comp: any) => (
                <div key={comp.id} className="rounded-xl border border-[hsl(var(--gold))]/20 bg-secondary/20 backdrop-blur-sm p-4 flex items-center gap-4">
                  {comp.image_url && <img src={comp.image_url} alt={comp.name} className="w-12 h-12 rounded-full object-cover border border-[hsl(var(--gold))]/20" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-bebas uppercase tracking-wider text-foreground">{comp.name}</p>
                    <p className="text-xs text-foreground/50">{comp.club} · {comp.position}</p>
                    {comp.r90_average != null && (
                      <div className="flex items-center gap-2 mt-1">
                        <BarChart3 className="h-3 w-3 text-[hsl(var(--gold))]" />
                        <span className="text-xs text-[hsl(var(--gold))]">R90: {comp.r90_average.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      case 'clips':
        if (videoReports.length === 0) return null;
        return (
          <section key={sectionId}>
            <SectionHeading title="Wyscout Video Reports" />
            <div className="space-y-3">
              {activeVideoReport ? (
                <div>
                  <div className="rounded-xl border-2 border-[hsl(var(--gold))]/30 overflow-hidden bg-black mb-3">
                    <video src={activeVideoReport.video_url} className="w-full aspect-video object-contain" controls playsInline autoPlay />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bebas uppercase tracking-wider">{activeVideoReport.title}</p>
                    <button onClick={() => setActiveVideoReport(null)} className="text-xs text-[hsl(var(--gold))] hover:underline">Back to list</button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-2">
                  {videoReports.map((vr: any) => (
                    <button
                      key={vr.id}
                      onClick={() => setActiveVideoReport(vr)}
                      className="flex items-center gap-3 p-3 rounded-lg border border-[hsl(var(--gold))]/15 bg-secondary/20 hover:bg-secondary/40 transition-colors text-left w-full"
                    >
                      <Play className="h-5 w-5 text-[hsl(var(--gold))] shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bebas uppercase tracking-wider truncate">{vr.title}</p>
                        <p className="text-[10px] text-foreground/50">{vr.analysis_type} · {new Date(vr.created_at).toLocaleDateString('en-GB')}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        );

      case 'graphics':
        if (galleryImages.length === 0) return null;
        return (
          <section key={sectionId}>
            <SectionHeading title="Graphics & Images" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {galleryImages.map((img: any) => (
                <div key={img.id} className="rounded-lg overflow-hidden border border-[hsl(var(--gold))]/10 aspect-square">
                  <img src={img.file_url || img.thumbnail_url} alt={img.title} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </section>
        );

      case 'scouting_notes':
        if (!report.custom_notes) return null;
        return (
          <section key={sectionId}>
            <SectionHeading title="Scouting Notes" />
            <div className="bg-secondary/20 backdrop-blur-sm rounded-lg border border-[hsl(var(--gold))]/10 p-6">
              <p className="text-foreground/80 whitespace-pre-wrap leading-relaxed">{report.custom_notes}</p>
            </div>
          </section>
        );

      default:
        return null;
    }
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
                  {player?.position && <span className="font-bebas uppercase tracking-wider text-lg">{player.position}</span>}
                  {player?.nationality && (
                    <span className="flex items-center gap-2 font-bebas uppercase tracking-wider text-lg">
                      <img src={getCountryFlagUrl(player.nationality)} alt={player.nationality} className="w-6 h-4 object-cover rounded" />
                      {player.nationality}
                    </span>
                  )}
                  {(player?.dateOfBirth || player?.date_of_birth) && (
                    <span className="font-bebas uppercase tracking-wider text-lg">
                      {new Date(player.dateOfBirth || player.date_of_birth).toLocaleDateString('en-GB')}
                      {player.age ? ` (${player.age})` : ''}
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

        {/* Content - sections in configured order */}
        <div className="container mx-auto px-4 py-10 max-w-5xl space-y-12">
          {sectionOrder
            .filter((id: string) => includedSections.includes(id))
            .map((id: string) => renderSection(id))}

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

const SectionHeading = ({ title }: { title: string }) => (
  <h2 className="text-3xl font-bebas text-[hsl(var(--gold))] uppercase tracking-widest mb-6 flex items-center gap-3">
    <span className="w-12 h-1 bg-[hsl(var(--gold))]" />
    {title}
    <span className="flex-1 h-1 bg-[hsl(var(--gold))]/20" />
  </h2>
);

export default TransferReportView;
