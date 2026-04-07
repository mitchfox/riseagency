import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { Loader2, Play, ChevronDown, ChevronUp, TrendingUp, BarChart3, Award, Target } from "lucide-react";
import { parsePlayerBio, parsePlayerHighlights } from "@/lib/playerDataParser";
import { getCountryFlagUrl } from "@/lib/countryFlags";
import { METRIC_CATEGORIES, ALL_METRICS, GK_METRIC_CATEGORIES, ALL_GK_METRICS, getMetricCategoriesForPosition, getMetricsForPosition } from "@/components/staff/ComparisonPlayerData";
import blackMarbleBg from "@/assets/black-marble-menu.png";

const GRADE_COLORS: Record<string, string> = {
  'U': '#4d1a1a', 'D': '#b91c1c', 'C-': '#ef4444', 'C': '#c2410c', 'C+': '#eab308',
  'B-': '#a3e635', 'B': '#22c55e', 'B+': '#16a34a', 'A-': '#15803d',
  'A': '#059669', 'A+': '#10b981', 'A*': '#d4af37',
};

const getR90Color = (score: number) => {
  if (score >= 0.08) return 'bg-emerald-500';
  if (score >= 0.05) return 'bg-yellow-500';
  if (score >= 0.02) return 'bg-orange-500';
  return 'bg-red-500';
};

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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [gradeConfigs, setGradeConfigs] = useState<any[]>([]);

  const toggleExpand = (id: string) => setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));

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

      // Fetch grade configs
      const { data: gradeData } = await supabase.from('form_grade_configs').select('*');
      if (gradeData) setGradeConfigs(gradeData);

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

        setPlayer({ ...playerData, ...bioData, bioText, highlightsArray: parsedHighlights });
        setHighlights(parsedHighlights);

        const { data: analysisData } = await supabase
          .from('player_analysis')
          .select('*')
          .eq('player_id', playerData.id)
          .order('analysis_date', { ascending: false });
        setPerformanceReports(analysisData || []);

        if (playerData.position) {
          const { data: compData } = await supabase
            .from('comparison_players')
            .select('*')
            .eq('position', playerData.position)
            .limit(10);
          setComparisonPlayers(compData || []);
        }

        const { data: galleryData } = await supabase
          .from('marketing_gallery')
          .select('*')
          .eq('player_id', playerData.id)
          .order('created_at', { ascending: false })
          .limit(12);
        setGalleryImages(galleryData || []);

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

  // Compute player averages from fixture_stats
  const playerAverages = useMemo(() => {
    if (!player?.position || performanceReports.length === 0) return {};
    const metrics = getMetricsForPosition(player.position);
    const result: Record<string, number> = {};
    metrics.forEach(m => {
      const vals = performanceReports
        .map(r => (r.fixture_stats as Record<string, number>)?.[m.key])
        .filter((v): v is number => v != null && !isNaN(v));
      if (vals.length > 0) result[m.key] = vals.reduce((s, v) => s + v, 0) / vals.length;
    });
    return result;
  }, [performanceReports, player?.position]);

  // Find stats where player is above average compared to comparison players
  const standoutStats = useMemo(() => {
    if (Object.keys(playerAverages).length === 0 || comparisonPlayers.length === 0) return [];
    const metrics = getMetricsForPosition(player?.position);
    const results: { key: string; label: string; playerValue: number; compAvg: number; pctAbove: number; }[] = [];

    metrics.forEach(m => {
      const pVal = playerAverages[m.key];
      if (pVal == null) return;
      const compVals = comparisonPlayers
        .map(cp => (cp.metrics as Record<string, number>)?.[m.key])
        .filter((v): v is number => v != null);
      if (compVals.length === 0) return;
      const compAvg = compVals.reduce((s, v) => s + v, 0) / compVals.length;
      if (compAvg <= 0) return;
      const pctAbove = ((pVal - compAvg) / compAvg) * 100;
      if (pctAbove > 5) { // Only show stats where player is >5% above average
        results.push({ key: m.key, label: m.label, playerValue: pVal, compAvg, pctAbove });
      }
    });

    return results.sort((a, b) => b.pctAbove - a.pctAbove).slice(0, 12);
  }, [playerAverages, comparisonPlayers, player?.position]);

  // Get form grade for a metric
  const getFormGrade = (metricKey: string, value: number): { grade: string; color: string } | null => {
    const config = gradeConfigs.find((c: any) => c.metric_key === metricKey);
    if (!config) return null;
    const thresholds = (config.thresholds as any[]) || [];
    for (const t of thresholds.sort((a: any, b: any) => (b.min ?? -999) - (a.min ?? -999))) {
      if (t.min != null && value >= t.min) {
        return { grade: t.grade, color: GRADE_COLORS[t.grade] || '#666' };
      }
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-2 border-[#d4af37]/30 border-t-[#d4af37] rounded-full animate-spin" />
          <p className="text-[#d4af37]/60 font-bebas uppercase tracking-widest text-sm">Loading Report</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <h1 className="text-3xl font-bebas text-[#d4af37] mb-2">Report Unavailable</h1>
          <p className="text-white/60">{error || 'This report does not exist.'}</p>
        </div>
      </div>
    );
  }

  const includedSections = report.included_sections || [];
  const sectionOrder = report.section_order || ['in_numbers', 'highlights', 'biography', 'stats', 'data_graphics', 'form_chart', 'tactical', 'strengths', 'comparison', 'clips', 'graphics', 'scouting_notes'];

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case 'in_numbers':
        if (!player?.topStats || player.topStats.length === 0) return null;
        return (
          <section key={sectionId}>
            <SectionHeading title="In Numbers" />
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
              {player.topStats.map((stat: any, index: number) => (
                <div key={index} className="relative overflow-hidden rounded-xl border border-[#d4af37]/20 p-5 transition-all hover:border-[#d4af37]/50" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(10,10,10,0.9) 100%)' }}>
                  <div className="text-center">
                    <div className="text-4xl md:text-5xl font-bebas text-[#d4af37] mb-1 leading-none">{stat.value}</div>
                    <div className="text-[10px] text-white/50 uppercase tracking-[0.15em] font-bold">{stat.label}</div>
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
            <div className="rounded-xl border border-[#d4af37]/20 overflow-hidden bg-black">
              {highlights[currentVideoIndex]?.videoUrl ? (
                <video
                  key={highlights[currentVideoIndex].videoUrl}
                  src={highlights[currentVideoIndex].videoUrl}
                  className="w-full aspect-video object-contain"
                  controls playsInline autoPlay
                  onEnded={() => setCurrentVideoIndex((currentVideoIndex + 1) % highlights.length)}
                />
              ) : (
                <div className="aspect-video flex items-center justify-center text-white/40">No video available</div>
              )}
              {highlights.length > 1 && (
                <div className="flex gap-1 p-2 bg-black/80 overflow-x-auto">
                  {highlights.map((h, i) => (
                    <button key={i} onClick={() => setCurrentVideoIndex(i)}
                      className={`flex-shrink-0 px-3 py-1 rounded text-xs font-bebas uppercase tracking-wider transition-all ${
                        i === currentVideoIndex ? 'bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40' : 'text-white/50 hover:text-white/80'
                      }`}>
                      {h.name || `Clip ${i + 1}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        );

      case 'biography': {
        if (!player?.bioText) return null;
        const isExpanded = expandedSections['biography'];
        const shortBio = player.bioText.length > 300 ? player.bioText.slice(0, 300) + '...' : player.bioText;
        return (
          <section key={sectionId}>
            <SectionHeading title="Biography" />
            <div className="rounded-lg border border-[#d4af37]/10 p-5" style={{ background: 'rgba(20,20,20,0.8)' }}>
              <p className="text-white/70 leading-relaxed whitespace-pre-line text-sm">
                {isExpanded ? player.bioText : shortBio}
              </p>
              {player.bioText.length > 300 && (
                <button onClick={() => toggleExpand('biography')} className="mt-3 text-[#d4af37] text-xs font-bebas uppercase tracking-wider flex items-center gap-1 hover:text-[#d4af37]/80">
                  {isExpanded ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Read more</>}
                </button>
              )}
            </div>
          </section>
        );
      }

      case 'stats':
        if (!player?.seasonStats || player.seasonStats.length === 0) return null;
        return (
          <section key={sectionId}>
            <SectionHeading title="Season Statistics" />
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              {player.seasonStats.map((stat: any, idx: number) => (
                <div key={idx} className="rounded-xl border border-[#d4af37]/20 p-5 text-center" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.06) 0%, rgba(10,10,10,0.9) 100%)' }}>
                  <div className="text-4xl md:text-5xl font-bebas text-[#d4af37] mb-1 leading-none">{stat.value || "0"}</div>
                  <div className="text-[10px] text-white/50 uppercase tracking-[0.15em] font-bold">{stat.header}</div>
                </div>
              ))}
            </div>
          </section>
        );

      case 'data_graphics':
        if (standoutStats.length === 0) return null;
        return (
          <section key={sectionId}>
            <SectionHeading title="Data Graphics" icon={<TrendingUp className="h-5 w-5" />} />
            <div className="rounded-xl border border-[#d4af37]/15 overflow-hidden" style={{ background: 'rgba(15,15,15,0.9)' }}>
              <div className="p-4 border-b border-[#d4af37]/10">
                <p className="text-xs text-white/40 uppercase tracking-wider font-bebas">
                  <Award className="h-3 w-3 inline mr-1" />
                  Metrics where {player?.name?.split(' ').pop()} outperforms the positional average
                </p>
              </div>
              <div className="p-4 space-y-3">
                {standoutStats.map((stat, idx) => {
                  const maxVal = Math.max(stat.playerValue, stat.compAvg) * 1.2;
                  const playerPct = (stat.playerValue / maxVal) * 100;
                  const compPct = (stat.compAvg / maxVal) * 100;
                  return (
                    <div key={idx}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-white/70 uppercase tracking-wider font-bebas text-sm">{stat.label}</span>
                        <span className="text-[#d4af37] font-bold text-sm">+{stat.pctAbove.toFixed(0)}%</span>
                      </div>
                      {/* Player bar */}
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] text-[#d4af37] w-14 text-right font-bold">{stat.playerValue.toFixed(2)}</span>
                        <div className="flex-1 h-4 bg-white/5 rounded overflow-hidden">
                          <div className="h-full rounded bg-gradient-to-r from-[#d4af37]/70 to-[#d4af37] transition-all" style={{ width: `${playerPct}%` }} />
                        </div>
                      </div>
                      {/* Comparison avg bar */}
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-white/30 w-14 text-right">{stat.compAvg.toFixed(2)}</span>
                        <div className="flex-1 h-2.5 bg-white/5 rounded overflow-hidden">
                          <div className="h-full rounded bg-white/20 transition-all" style={{ width: `${compPct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-4 pb-3">
                <p className="text-[9px] text-white/25">
                  <span className="inline-block w-3 h-1.5 bg-[#d4af37] rounded mr-1" /> {player?.name}
                  <span className="inline-block w-3 h-1.5 bg-white/20 rounded ml-3 mr-1" /> Positional average ({comparisonPlayers.length} players)
                </p>
              </div>
            </div>
          </section>
        );

      case 'form_chart': {
        if (performanceReports.length === 0) return null;
        const isExpanded = expandedSections['form_chart'];
        const displayReports = isExpanded ? performanceReports.slice(0, 20) : performanceReports.slice(0, 6);
        return (
          <section key={sectionId}>
            <SectionHeading title="Recent Form" />
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {displayReports.map((rpt: any) => {
                const r90Grade = rpt.r90_average != null ? getFormGrade('r90_score', rpt.r90_average) : null;
                return (
                  <div key={rpt.id} className="rounded-lg border border-[#d4af37]/10 p-3 flex items-center justify-between" style={{ background: 'rgba(15,15,15,0.8)' }}>
                    <div>
                      <p className="font-bebas uppercase text-sm text-white tracking-wider">{rpt.opponent || 'Match'}</p>
                      <p className="text-[10px] text-white/40">{rpt.analysis_date ? new Date(rpt.analysis_date).toLocaleDateString('en-GB') : ''}</p>
                      {rpt.minutes_played && <p className="text-[9px] text-white/30">{rpt.minutes_played} mins</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {r90Grade && (
                        <div className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: r90Grade.color + '33', color: r90Grade.color, border: `1px solid ${r90Grade.color}44` }}>
                          {r90Grade.grade}
                        </div>
                      )}
                      {rpt.r90_average != null && (
                        <div className={`w-9 h-9 rounded ${getR90Color(rpt.r90_average)} flex items-center justify-center`}>
                          <span className="text-[10px] font-bold text-white">{rpt.r90_average.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {performanceReports.length > 6 && (
              <button onClick={() => toggleExpand('form_chart')} className="mt-3 text-[#d4af37] text-xs font-bebas uppercase tracking-wider flex items-center gap-1 mx-auto hover:text-[#d4af37]/80">
                {isExpanded ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Show all {performanceReports.length} matches</>}
              </button>
            )}
          </section>
        );
      }

      case 'comparison': {
        if (comparisonPlayers.length === 0 || Object.keys(playerAverages).length === 0) return null;
        const categories = getMetricCategoriesForPosition(player?.position);
        return (
          <section key={sectionId}>
            <SectionHeading title="Player Comparisons" icon={<BarChart3 className="h-5 w-5" />} />
            <div className="space-y-4">
              {categories.map(cat => {
                const catMetrics = cat.metrics.filter(m => playerAverages[m.key] != null);
                if (catMetrics.length === 0) return null;
                return (
                  <div key={cat.category} className="rounded-lg border border-[#d4af37]/10 overflow-hidden" style={{ background: 'rgba(15,15,15,0.8)' }}>
                    <div className="px-4 py-2 border-b border-[#d4af37]/10">
                      <h4 className="text-sm font-bebas uppercase tracking-wider text-[#d4af37]/70">{cat.category}</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/5">
                            <th className="text-left p-2 text-white/40 font-normal">Metric</th>
                            <th className="text-center p-2 text-[#d4af37] font-bold">{player?.name?.split(' ').pop()}</th>
                            {comparisonPlayers.slice(0, 3).map(cp => (
                              <th key={cp.id} className="text-center p-2 text-white/50 font-normal">{cp.name?.split(' ').pop()}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {catMetrics.map(m => {
                            const pVal = playerAverages[m.key];
                            const allVals = [pVal, ...comparisonPlayers.slice(0, 3).map(cp => (cp.metrics as Record<string, number>)?.[m.key])].filter((v): v is number => v != null);
                            const maxVal = Math.max(...allVals);
                            return (
                              <tr key={m.key} className="border-b border-white/5">
                                <td className="p-2 text-white/60">{m.label}</td>
                                <td className={`p-2 text-center font-bold ${pVal === maxVal ? 'text-[#d4af37]' : 'text-white/80'}`}>
                                  {pVal?.toFixed(2) ?? '-'}
                                </td>
                                {comparisonPlayers.slice(0, 3).map(cp => {
                                  const val = (cp.metrics as Record<string, number>)?.[m.key];
                                  return (
                                    <td key={cp.id} className={`p-2 text-center ${val === maxVal ? 'text-white font-bold' : 'text-white/40'}`}>
                                      {val?.toFixed(2) ?? '-'}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      }

      case 'tactical':
        if (!player?.tacticalFormations || player.tacticalFormations.length === 0) return null;
        return (
          <section key={sectionId}>
            <SectionHeading title="Tactical History" />
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {player.tacticalFormations.map((scheme: any, idx: number) => (
                <div key={idx} className="rounded-xl border border-[#d4af37]/15 p-4 transition-all hover:border-[#d4af37]/30" style={{ background: 'rgba(15,15,15,0.8)' }}>
                  <div className="flex items-center gap-3 mb-2">
                    {scheme.clubLogo && <img src={scheme.clubLogo} alt={scheme.club} className="w-8 h-8 object-contain" />}
                    <div>
                      <p className="font-bebas uppercase tracking-wider text-white">{scheme.club}</p>
                      <p className="text-[10px] text-white/40">{scheme.formation} · {scheme.positions?.join(', ')}</p>
                    </div>
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
            <div className="rounded-lg border border-[#d4af37]/10 p-5" style={{ background: 'rgba(15,15,15,0.8)' }}>
              {Array.isArray(player.strengthsAndPlayStyle) ? (
                <div className="flex flex-wrap gap-2">
                  {player.strengthsAndPlayStyle.map((s: string, i: number) => (
                    <span key={i} className="px-3 py-1.5 rounded-md border border-[#d4af37]/20 bg-[#d4af37]/5 text-sm text-white/70 font-medium">{s}</span>
                  ))}
                </div>
              ) : (
                <p className="text-white/60 text-sm">{player.strengthsAndPlayStyle}</p>
              )}
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
                  <div className="rounded-xl border border-[#d4af37]/20 overflow-hidden bg-black mb-3">
                    <video src={activeVideoReport.video_url} className="w-full aspect-video object-contain" controls playsInline autoPlay />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bebas uppercase tracking-wider text-white">{activeVideoReport.title}</p>
                    <button onClick={() => setActiveVideoReport(null)} className="text-xs text-[#d4af37] hover:underline">Back to list</button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-2">
                  {videoReports.map((vr: any) => (
                    <button key={vr.id} onClick={() => setActiveVideoReport(vr)}
                      className="flex items-center gap-3 p-3 rounded-lg border border-[#d4af37]/10 hover:border-[#d4af37]/30 transition-colors text-left w-full" style={{ background: 'rgba(15,15,15,0.8)' }}>
                      <Play className="h-5 w-5 text-[#d4af37] shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bebas uppercase tracking-wider text-white truncate">{vr.title}</p>
                        <p className="text-[10px] text-white/40">{vr.analysis_type} · {new Date(vr.created_at).toLocaleDateString('en-GB')}</p>
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
                <div key={img.id} className="rounded-lg overflow-hidden border border-[#d4af37]/10 aspect-square">
                  <img src={img.file_url || img.thumbnail_url} alt={img.title} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </section>
        );

      case 'scouting_notes': {
        if (!report.custom_notes) return null;
        const isExpanded = expandedSections['scouting_notes'];
        const shortNotes = report.custom_notes.length > 300 ? report.custom_notes.slice(0, 300) + '...' : report.custom_notes;
        return (
          <section key={sectionId}>
            <SectionHeading title="Scouting Notes" />
            <div className="rounded-lg border border-[#d4af37]/10 p-5" style={{ background: 'rgba(15,15,15,0.8)' }}>
              <p className="text-white/70 whitespace-pre-wrap leading-relaxed text-sm">
                {isExpanded ? report.custom_notes : shortNotes}
              </p>
              {report.custom_notes.length > 300 && (
                <button onClick={() => toggleExpand('scouting_notes')} className="mt-3 text-[#d4af37] text-xs font-bebas uppercase tracking-wider flex items-center gap-1 hover:text-[#d4af37]/80">
                  {isExpanded ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Read more</>}
                </button>
              )}
            </div>
          </section>
        );
      }

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
      <div className="min-h-screen bg-[#0a0a0a]">
        {/* Hero Header with marble accent */}
        <div className="relative overflow-hidden border-b border-[#d4af37]/20">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: `url(${blackMarbleBg})`, backgroundSize: 'cover' }} />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent" />
          <div className="container mx-auto px-4 py-10 max-w-5xl relative z-10">
            <div className="flex items-center gap-8">
              {player?.image_url && (
                <div className="relative flex-shrink-0">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-lg overflow-hidden border-2 border-[#d4af37]">
                    <img src={player.image_url} alt={player?.name} className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[#d4af37]/50 font-bebas uppercase tracking-[0.3em] text-sm mb-1">Transfer Report</p>
                <h1 className="text-4xl md:text-5xl font-bebas uppercase tracking-wide text-white leading-none mb-3">{player?.name}</h1>
                <div className="flex flex-wrap items-center gap-4 text-white/60">
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
          {sectionOrder
            .filter((id: string) => includedSections.includes(id))
            .map((id: string) => renderSection(id))}

          {/* Footer with marble accent */}
          <div className="relative text-center py-10 border-t border-[#d4af37]/10 overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `url(${blackMarbleBg})`, backgroundSize: 'cover' }} />
            <div className="relative z-10">
              <p className="text-[10px] text-white/25 font-bebas uppercase tracking-[0.3em]">Prepared by RISE Football Agency</p>
              <p className="text-[10px] text-white/15 mt-1">{new Date(report.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const SectionHeading = ({ title, icon }: { title: string; icon?: React.ReactNode }) => (
  <h2 className="text-2xl font-bebas text-[#d4af37] uppercase tracking-widest mb-5 flex items-center gap-3">
    <span className="w-10 h-0.5 bg-[#d4af37]" />
    {icon}
    {title}
    <span className="flex-1 h-0.5 bg-[#d4af37]/15" />
  </h2>
);

export default TransferReportView;
