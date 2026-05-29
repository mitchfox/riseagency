import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { Loader2, Play, ChevronDown, ChevronUp, TrendingUp, BarChart3, Award, Shield, FileText, User, Dumbbell, ChevronLeft, ChevronRight, Eye, EyeOff, Save, X, GripVertical, Settings } from "lucide-react";
import { parsePlayerBio, parsePlayerHighlights } from "@/lib/playerDataParser";
import { getCountryFlagUrl } from "@/lib/countryFlags";
import { METRIC_CATEGORIES, ALL_METRICS, GK_METRIC_CATEGORIES, ALL_GK_METRICS, getMetricCategoriesForPosition, getMetricsForPosition, isGoalkeeperPosition } from "@/components/staff/ComparisonPlayerData";
import { computeAllStatAverages } from "@/lib/statAggregation";
import { normalizeStatKey } from "@/hooks/useFormGradeConfigs";
import { effectiveR90 } from "@/lib/r90";
import blackMarbleBg from "@/assets/black-marble-menu.png";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const RISE_GOLD = '#C6A332';

const GRADE_COLORS: Record<string, string> = {
  'U': '#4d1a1a', 'D': '#b91c1c', 'C-': '#ef4444', 'C': '#c2410c', 'C+': '#eab308',
  'B-': '#a3e635', 'B': '#22c55e', 'B+': '#16a34a', 'A-': '#15803d',
  'A': '#059669', 'A+': '#10b981', 'A*': RISE_GOLD,
};

const getR90Color = (score: number) => {
  if (score >= 0.08) return `bg-emerald-500`;
  if (score >= 0.05) return `bg-yellow-500`;
  if (score >= 0.02) return `bg-orange-500`;
  return `bg-red-500`;
};

const ALL_SECTIONS = [
  { id: 'in_numbers', label: 'In Numbers' },
  { id: 'highlights', label: 'Match Highlights' },
  { id: 'biography', label: 'Biography & Profile' },
  { id: 'stats', label: 'Season Statistics' },
  { id: 'data_graphics', label: 'Data Graphics & Visualisations' },
  { id: 'form_chart', label: 'Recent Form' },
  { id: 'tactical', label: 'Tactical History' },
  { id: 'strengths', label: 'Strengths & Play Style' },
  { id: 'comparison', label: 'Player Comparisons' },
  { id: 'clips', label: 'Wyscout Video Reports' },
  { id: 'graphics', label: 'Graphics & Images' },
  { id: 'scouting_notes', label: 'Scouting Notes' },
  { id: 'contract_info', label: 'Contract Information' },
  { id: 'physical_profile', label: 'Physical Profile' },
  { id: 'agent_notes', label: 'Agent Notes' },
];

interface TransferReportViewProps {
  editMode?: boolean;
  reportOverride?: any;
  contentConfigOverride?: Record<string, any>;
  onSave?: (updates: any) => void;
  onClose?: () => void;
}

const TransferReportView = ({ editMode: externalEditMode, reportOverride, contentConfigOverride, onSave, onClose }: TransferReportViewProps = {}) => {
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
  const [tacticalSchemes, setTacticalSchemes] = useState<any[]>([]);

  // Edit mode state — honour externalEditMode prop immediately
  const [isEditing, setIsEditing] = useState(!!externalEditMode);
  const [isStaff, setIsStaff] = useState(!!externalEditMode);
  const [editSections, setEditSections] = useState<string[]>([]);
  const [editSectionOrder, setEditSectionOrder] = useState<string[]>([]);
  const [editContentConfig, setEditContentConfig] = useState<Record<string, any>>({});
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  // Per-section stat visibility toggles
  const [hiddenStats, setHiddenStats] = useState<Record<string, boolean>>({});
  const [swappingCompSlot, setSwappingCompSlot] = useState<number | null>(null);

  const toggleExpand = (id: string) => setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));

  const contentConfig = useMemo(() => {
    if (editContentConfig && Object.keys(editContentConfig).length > 0 && isEditing) return editContentConfig;
    const cfg = contentConfigOverride || report?.content_config;
    if (!cfg) return {};
    if (typeof cfg === 'string') {
      try { return JSON.parse(cfg); } catch { return {}; }
    }
    return cfg as Record<string, any>;
  }, [report?.content_config, contentConfigOverride, editContentConfig, isEditing]);

  // Check if current user is staff
  useEffect(() => {
    const checkStaff = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
        if (roles && roles.some(r => ['admin', 'staff', 'moderator'].includes(r.role))) {
          setIsStaff(true);
          // Auto-enable edit mode if ?edit=true is in the URL
          const params = new URLSearchParams(window.location.search);
          if (params.get('edit') === 'true') {
            setIsEditing(true);
          }
        }
      }
    };
    checkStaff();
  }, []);

  useEffect(() => {
    const reportSlug = reportOverride?.slug || slug;
    if (!reportSlug && !reportOverride) return;
    const fetchReport = async () => {
      setLoading(true);
      let reportData = reportOverride;
      if (!reportData) {
        const { data, error: fetchError } = await supabase
          .from('transfer_reports')
          .select('*')
          .eq('slug', reportSlug)
          .maybeSingle();
        if (fetchError || !data) {
          setError('Report not found.');
          setLoading(false);
          return;
        }
        reportData = data;
      }
      setReport(reportData);
      setEditSections(reportData.included_sections || []);
      setEditSectionOrder(reportData.section_order || ALL_SECTIONS.map(s => s.id));
      setEditTitle(reportData.title || '');
      setEditNotes(reportData.custom_notes || '');
      
      let cfg: Record<string, any> = {};
      if (reportData.content_config) {
        if (typeof reportData.content_config === 'string') {
          try { cfg = JSON.parse(reportData.content_config); } catch {}
        } else {
          cfg = reportData.content_config as Record<string, any>;
        }
      }
      setEditContentConfig(cfg);
      setHiddenStats(cfg.hidden_stats || {});

      const { data: gradeData } = await supabase.from('form_grade_configs').select('*');
      if (gradeData) setGradeConfigs(gradeData);

      const { data: playerData } = await supabase
        .from('players')
        .select('*')
        .eq('id', reportData.player_id)
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
          const positionVariants = isGoalkeeperPosition(playerData.position)
            ? ['GK', 'Goalkeeper', 'GOALKEEPER']
            : [playerData.position, playerData.position.toUpperCase()];
          const { data: compData } = await supabase
            .from('comparison_players')
            .select('*')
            .in('position', positionVariants);
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

        const { data: schemeData } = await supabase
          .from('analyses')
          .select('*')
          .eq('analysis_type', 'scheme')
          .eq('player_name', playerData.name)
          .order('created_at', { ascending: false })
          .limit(6);
        setTacticalSchemes(schemeData || []);
      }
      setLoading(false);
    };
    fetchReport();
  }, [slug, reportOverride]);

  const playerAverages = useMemo(() => {
    if (!player?.position || performanceReports.length === 0) return {};
    const metrics = getMetricsForPosition(player.position);
    const avgs = computeAllStatAverages(performanceReports, metrics);
    const result: Record<string, number> = {};
    Object.entries(avgs).forEach(([key, val]) => {
      if (val != null) result[key] = val;
    });
    return result;
  }, [performanceReports, player?.position]);

  // All stats for data graphics — including hidden ones for toggling
  const allDataStats = useMemo(() => {
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
      if (pctAbove > 5) {
        results.push({ key: m.key, label: m.label, playerValue: pVal, compAvg, pctAbove });
      }
    });

    return results.sort((a, b) => b.pctAbove - a.pctAbove).slice(0, 12);
  }, [playerAverages, comparisonPlayers, player?.position]);

  const standoutStats = useMemo(() => {
    return allDataStats.filter(s => !hiddenStats[`data_${s.key}`]);
  }, [allDataStats, hiddenStats]);

  const getFormGrade = (metricKey: string, value: number): { grade: string; color: string } | null => {
    // Normalise the key to match what's in the DB
    const normalised = normalizeStatKey(metricKey);
    const config = gradeConfigs.find((c: any) => c.metric_key === normalised || c.metric_key === metricKey);
    if (!config) return null;
    const thresholds = (config.thresholds as any[]) || [];
    for (const t of thresholds.sort((a: any, b: any) => (b.min ?? -999) - (a.min ?? -999))) {
      if (t.min != null && value >= t.min) {
        return { grade: t.grade, color: GRADE_COLORS[t.grade] || '#666' };
      }
    }
    return null;
  };

  const parsedBio = useMemo(() => {
    if (!player?.bio) return {};
    try {
      return typeof player.bio === 'string' ? JSON.parse(player.bio) : player.bio;
    } catch { return {}; }
  }, [player?.bio]);

  const configuredCompPlayers = useMemo(() => {
    const ids = contentConfig?.comparison_player_ids as string[] | undefined;
    if (ids && ids.length > 0) {
      return comparisonPlayers.filter(cp => ids.includes(cp.id));
    }
    return comparisonPlayers.slice(0, 3);
  }, [contentConfig, comparisonPlayers]);

  // Edit mode helpers
  const toggleEditSection = (id: string) => {
    setEditSections(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const updateEditConfig = (key: string, value: any) => {
    setEditContentConfig(prev => ({ ...prev, [key]: value }));
  };

  const toggleStatVisibility = (statKey: string) => {
    setHiddenStats(prev => {
      const updated = { ...prev, [statKey]: !prev[statKey] };
      setEditContentConfig(cfg => ({ ...cfg, hidden_stats: updated }));
      return updated;
    });
  };

  const handleSave = async () => {
    if (!report?.id) return;
    setSaving(true);
    const { error } = await supabase.from('transfer_reports').update({
      included_sections: editSections,
      section_order: editSectionOrder,
      custom_notes: editNotes || null,
      title: editTitle,
      content_config: editContentConfig,
    }).eq('id', report.id);
    if (error) toast.error('Failed to save');
    else {
      toast.success('Changes saved and live');
      setReport((prev: any) => ({
        ...prev,
        included_sections: editSections,
        section_order: editSectionOrder,
        custom_notes: editNotes || null,
        title: editTitle,
        content_config: editContentConfig,
      }));
    }
    setSaving(false);
  };

  const includedSections = isEditing ? editSections : (report?.included_sections || []);
  const sectionOrder = isEditing ? editSectionOrder : (report?.section_order || ALL_SECTIONS.map(s => s.id));

  const isExclusive = contentConfig?.exclusive_representation ?? parsedBio?.exclusive_representation ?? false;

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    setEditSectionOrder(prev => {
      const idx = prev.indexOf(sectionId);
      if (idx < 0) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  };

  // Section edit overlay wrapper
  const SectionEditWrapper = ({ sectionId, children }: { sectionId: string; children: React.ReactNode }) => {
    if (!isEditing) return <>{children}</>;
    const isVisible = editSections.includes(sectionId);
    const sectionLabel = ALL_SECTIONS.find(s => s.id === sectionId)?.label || sectionId;
    const idx = editSectionOrder.indexOf(sectionId);
    return (
      <div className={`relative group ${!isVisible ? 'opacity-30' : ''}`}>
        <div className="absolute -top-2 -right-2 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => moveSection(sectionId, 'up')}
            disabled={idx <= 0}
            className="flex items-center justify-center w-6 h-6 rounded-full backdrop-blur-sm border transition-colors disabled:opacity-20"
            style={{ background: `${RISE_GOLD}20`, borderColor: `${RISE_GOLD}40`, color: RISE_GOLD }}
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            onClick={() => moveSection(sectionId, 'down')}
            disabled={idx >= editSectionOrder.length - 1}
            className="flex items-center justify-center w-6 h-6 rounded-full backdrop-blur-sm border transition-colors disabled:opacity-20"
            style={{ background: `${RISE_GOLD}20`, borderColor: `${RISE_GOLD}40`, color: RISE_GOLD }}
          >
            <ChevronDown className="w-3 h-3" />
          </button>
          <button
            onClick={() => toggleEditSection(sectionId)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-sm border transition-colors"
            style={isVisible
              ? { background: `${RISE_GOLD}33`, borderColor: `${RISE_GOLD}66`, color: RISE_GOLD }
              : { background: 'rgba(239,68,68,0.2)', borderColor: 'rgba(239,68,68,0.4)', color: '#f87171' }
            }
          >
            {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            {isVisible ? 'Visible' : 'Hidden'}
          </button>
        </div>
        {children}
        {!isVisible && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white/30 font-bebas uppercase tracking-wider text-lg">{sectionLabel} — Hidden</span>
          </div>
        )}
      </div>
    );
  };

  const renderSection = (sectionId: string) => {
    // In edit mode, show ALL sections (visible or hidden) so staff can toggle them
    // In view mode, only show included sections
    if (!isEditing && !includedSections.includes(sectionId)) return null;

    switch (sectionId) {
      case 'in_numbers':
        return (
          <SectionEditWrapper key={sectionId} sectionId={sectionId}>
            <section id="section-in_numbers">
              <SectionHeading title="In Numbers" />
              {player?.topStats && player.topStats.length > 0 ? (
                <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
                  {player.topStats.map((stat: any, index: number) => (
                    <div key={index} className="relative overflow-hidden rounded-xl border border-[${RISE_GOLD}]/20 p-5 transition-all hover:border-[${RISE_GOLD}]/50" style={{ background: `linear-gradient(135deg, rgba(198,163,50,0.08) 0%, rgba(10,10,10,0.9) 100%)`, borderColor: `${RISE_GOLD}33` }}>
                      <div className="text-center">
                        <div className="text-4xl md:text-5xl font-bebas mb-1 leading-none" style={{ color: RISE_GOLD }}>{stat.value}</div>
                        <div className="text-[11px] text-white/50 uppercase tracking-[0.15em] font-bold">{stat.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/30 text-sm italic">No key statistics available yet.</p>
              )}
            </section>
          </SectionEditWrapper>
        );

      case 'highlights':
        return (
          <SectionEditWrapper key={sectionId} sectionId={sectionId}>
            <section id="section-highlights">
              <SectionHeading title="Match Highlights" />
              {highlights.length > 0 ? (
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-black" style={{ border: `4px solid ${RISE_GOLD}` }}>
                  {highlights[currentVideoIndex]?.videoUrl ? (
                    <>
                      <video
                        key={highlights[currentVideoIndex].videoUrl}
                        src={highlights[currentVideoIndex].videoUrl}
                        className="w-full h-full object-contain"
                        controls playsInline autoPlay
                        onEnded={() => setCurrentVideoIndex((currentVideoIndex + 1) % highlights.length)}
                      />
                      {highlights.length > 1 && (
                        <div className="absolute bottom-[24px] left-1/2 -translate-x-1/2 z-10 w-full px-3 pointer-events-none">
                          <div className="relative flex items-center justify-center gap-2">
                            {highlights.length > 8 && (
                              <button onClick={() => { const c = document.getElementById('tr-highlights-scroll'); if (c) c.scrollBy({ left: -200, behavior: 'smooth' }); }}
                                className="pointer-events-auto flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white transition-colors" style={{ background: `${RISE_GOLD}33`, border: `1px solid ${RISE_GOLD}66` }}>
                                <ChevronLeft className="w-5 h-5" />
                              </button>
                            )}
                            <div id="tr-highlights-scroll" className="flex gap-1.5 overflow-x-auto max-w-[calc(100%-80px)] pointer-events-auto" style={{ scrollbarWidth: 'none' }}>
                              {highlights.map((h: any, i: number) => (
                                <button key={i} onClick={() => setCurrentVideoIndex(i)}
                                  className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded overflow-hidden bg-black/90 backdrop-blur-sm transition-all"
                                  style={{ border: i === currentVideoIndex ? `2px solid ${RISE_GOLD}` : `1px solid ${RISE_GOLD}33`, transform: i === currentVideoIndex ? 'scale(1.1)' : 'scale(1)' }}
                                  title={h.name || `Clip ${i + 1}`}>
                                  {(h.logoUrl || h.clubLogo) ? (
                                    <img src={h.logoUrl || h.clubLogo} alt="" className="w-full h-full object-contain p-0.5" />
                                  ) : (
                                    <span className="text-[8px] font-bebas flex items-center justify-center h-full" style={{ color: RISE_GOLD }}>{i + 1}</span>
                                  )}
                                </button>
                              ))}
                            </div>
                            {highlights.length > 8 && (
                              <button onClick={() => { const c = document.getElementById('tr-highlights-scroll'); if (c) c.scrollBy({ left: 200, behavior: 'smooth' }); }}
                                className="pointer-events-auto flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white transition-colors" style={{ background: `${RISE_GOLD}33`, border: `1px solid ${RISE_GOLD}66` }}>
                                <ChevronRight className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="absolute top-3 left-3 bg-black/80 rounded-lg px-3 py-1.5" style={{ border: `1px solid ${RISE_GOLD}4d` }}>
                        <span className="text-lg font-bebas" style={{ color: RISE_GOLD }}>{currentVideoIndex + 1}</span>
                        <span className="text-xs text-white/40 ml-1">/ {highlights.length}</span>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                      <Play className="w-12 h-12" style={{ color: RISE_GOLD }} />
                      <p className="text-white/40 font-bebas uppercase tracking-wider">No video available</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-white/30 text-sm italic">No match highlights available yet.</p>
              )}
            </section>
          </SectionEditWrapper>
        );

      case 'biography': {
        const isExpanded = expandedSections['biography'];
        const bio = player?.bioText || '';
        const shortBio = bio.length > 300 ? bio.slice(0, 300) + '...' : bio;
        return (
          <SectionEditWrapper key={sectionId} sectionId={sectionId}>
            <section id="section-biography">
              <SectionHeading title="Biography & Profile" />
              {bio ? (
                <div className="rounded-2xl p-5" style={{ background: 'rgba(20,20,20,0.8)', border: `1px solid ${RISE_GOLD}1a` }}>
                  <p className="text-white/70 leading-relaxed whitespace-pre-line text-sm md:text-base">
                    {isExpanded ? bio : shortBio}
                  </p>
                  {bio.length > 300 && (
                    <button onClick={() => toggleExpand('biography')} className="mt-3 text-xs font-bebas uppercase tracking-wider flex items-center gap-1 hover:opacity-80" style={{ color: RISE_GOLD }}>
                      {isExpanded ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Read more</>}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-white/30 text-sm italic">No biography available yet.</p>
              )}
            </section>
          </SectionEditWrapper>
        );
      }

      case 'stats':
        return (
          <SectionEditWrapper key={sectionId} sectionId={sectionId}>
            <section id="section-stats">
              <SectionHeading title="Season Statistics" />
              {player?.seasonStats && player.seasonStats.length > 0 ? (
                <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                  {player.seasonStats.map((stat: any, idx: number) => (
                    <div key={idx} className="rounded-xl p-5 text-center" style={{ background: `linear-gradient(135deg, rgba(198,163,50,0.06) 0%, rgba(10,10,10,0.9) 100%)`, border: `1px solid ${RISE_GOLD}33` }}>
                      <div className="text-4xl md:text-5xl font-bebas mb-1 leading-none" style={{ color: RISE_GOLD }}>{stat.value || "0"}</div>
                      <div className="text-[11px] text-white/50 uppercase tracking-[0.15em] font-bold">{stat.header}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/30 text-sm italic">No season statistics available yet.</p>
              )}
            </section>
          </SectionEditWrapper>
        );

      case 'data_graphics':
        return (
          <SectionEditWrapper key={sectionId} sectionId={sectionId}>
            <section id="section-data_graphics">
              <SectionHeading title="Data Graphics & Visualisations" icon={<TrendingUp className="h-5 w-5" />} />
              {allDataStats.length > 0 ? (
                <div className="space-y-6">
                  {/* Radar chart for top 6 visible stats */}
                  {standoutStats.length >= 3 && (
                    <div className="rounded-xl overflow-hidden p-5" style={{ border: `1px solid ${RISE_GOLD}26`, background: 'rgba(15,15,15,0.9)' }}>
                      <p className="text-xs text-white/40 uppercase tracking-wider font-bebas mb-4">
                        <Award className="h-3 w-3 inline mr-1" />
                        Performance Radar — Top Metrics
                      </p>
                      <div className="flex justify-center">
                        <svg viewBox="-130 -130 260 260" className="w-full max-w-[400px] aspect-square">
                          {/* Grid rings */}
                          {[0.25, 0.5, 0.75, 1].map(scale => {
                            const radarN = Math.min(standoutStats.length, 8);
                            const pts = Array.from({ length: radarN }, (_, i) => {
                              const angle = (i / radarN) * Math.PI * 2 - Math.PI / 2;
                              return `${Math.cos(angle) * 100 * scale},${Math.sin(angle) * 100 * scale}`;
                            }).join(' ');
                            return <polygon key={scale} points={pts} fill="none" stroke="white" strokeOpacity={0.08} strokeWidth={0.5} />;
                          })}
                          {/* Axis lines */}
                          {standoutStats.slice(0, 8).map((_, i) => {
                            const radarN = Math.min(standoutStats.length, 8);
                            const angle = (i / radarN) * Math.PI * 2 - Math.PI / 2;
                            return <line key={i} x1={0} y1={0} x2={Math.cos(angle) * 100} y2={Math.sin(angle) * 100} stroke="white" strokeOpacity={0.06} strokeWidth={0.5} />;
                          })}
                          {/* Player value polygon */}
                          {(() => {
                            const radarN = Math.min(standoutStats.length, 8);
                            const maxPct = Math.max(...standoutStats.slice(0, 8).map(s => s.pctAbove));
                            const pts = standoutStats.slice(0, 8).map((s, i) => {
                              const angle = (i / radarN) * Math.PI * 2 - Math.PI / 2;
                              const r = Math.min((s.pctAbove / Math.max(maxPct, 50)) * 100, 100);
                              return `${Math.cos(angle) * r},${Math.sin(angle) * r}`;
                            }).join(' ');
                            return (
                              <>
                                <polygon points={pts} fill={RISE_GOLD} fillOpacity={0.15} stroke={RISE_GOLD} strokeWidth={1.5} strokeOpacity={0.8} />
                                {standoutStats.slice(0, 8).map((s, i) => {
                                  const angle = (i / radarN) * Math.PI * 2 - Math.PI / 2;
                                  const r = Math.min((s.pctAbove / Math.max(maxPct, 50)) * 100, 100);
                                  return <circle key={i} cx={Math.cos(angle) * r} cy={Math.sin(angle) * r} r={3} fill={RISE_GOLD} />;
                                })}
                              </>
                            );
                          })()}
                          {/* Labels */}
                          {standoutStats.slice(0, 8).map((s, i) => {
                            const radarN = Math.min(standoutStats.length, 8);
                            const angle = (i / radarN) * Math.PI * 2 - Math.PI / 2;
                            const lx = Math.cos(angle) * 118;
                            const ly = Math.sin(angle) * 118;
                            return (
                              <text key={i} x={lx} y={ly} fill="white" fillOpacity={0.6} fontSize={7} textAnchor="middle" dominantBaseline="central" fontFamily="Bebas Neue, sans-serif" letterSpacing={0.5}>
                                {s.label.length > 14 ? s.label.slice(0, 12) + '…' : s.label}
                              </text>
                            );
                          })}
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* Bar charts for all stats with visibility toggles */}
                  <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${RISE_GOLD}26`, background: 'rgba(15,15,15,0.9)' }}>
                    <div className="p-4" style={{ borderBottom: `1px solid ${RISE_GOLD}1a` }}>
                      <p className="text-xs text-white/40 uppercase tracking-wider font-bebas">
                        <Award className="h-3 w-3 inline mr-1" />
                        Metrics where {player?.name?.split(' ').pop()} outperforms the positional average
                      </p>
                    </div>
                    <div className="p-4 space-y-3">
                      {allDataStats.map((stat, idx) => {
                        const isHidden = hiddenStats[`data_${stat.key}`];
                        const maxVal = Math.max(stat.playerValue, stat.compAvg) * 1.2;
                        const playerPct = (stat.playerValue / maxVal) * 100;
                        const compPct = (stat.compAvg / maxVal) * 100;
                        const isStrongest = stat.pctAbove > 20;
                        return (
                          <div key={idx} className={`relative transition-opacity ${isHidden ? 'opacity-30' : ''}`}>
                            {isEditing && (
                              <button onClick={() => toggleStatVisibility(`data_${stat.key}`)} className="absolute -left-6 top-1 z-10 text-white/30 hover:text-white/60">
                                {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                            )}
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="text-white/70 uppercase tracking-wider font-bebas text-sm md:text-base">{stat.label}</span>
                              <span className="font-bold text-sm md:text-base" style={{ color: RISE_GOLD }}>+{stat.pctAbove.toFixed(0)}%</span>
                            </div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[10px] w-14 text-right font-bold" style={{ color: RISE_GOLD }}>{stat.playerValue.toFixed(2)}</span>
                              <div className="flex-1 h-5 bg-white/5 rounded overflow-hidden relative">
                                <div className="h-full rounded transition-all" style={{ width: `${playerPct}%`, background: isStrongest ? `linear-gradient(90deg, ${RISE_GOLD}b3, ${RISE_GOLD})` : `linear-gradient(90deg, ${RISE_GOLD}80, ${RISE_GOLD})` }} />
                                {isStrongest && (
                                  <div className="absolute inset-y-0 right-2 flex items-center">
                                    <span className="text-[8px] font-bold text-black/70">★</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-white/30 w-14 text-right">{stat.compAvg.toFixed(2)}</span>
                              <div className="flex-1 h-3 bg-white/5 rounded overflow-hidden">
                                <div className="h-full rounded bg-white/20 transition-all" style={{ width: `${compPct}%` }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="px-4 pb-3">
                      <p className="text-[10px] text-white/25">
                        <span className="inline-block w-3 h-1.5 rounded mr-1" style={{ background: RISE_GOLD }} /> {player?.name}
                        <span className="inline-block w-3 h-1.5 bg-white/20 rounded ml-3 mr-1" /> Positional average ({comparisonPlayers.length} players)
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-white/30 text-sm italic">Not enough data to generate visualisations yet.</p>
              )}
            </section>
          </SectionEditWrapper>
        );

      case 'form_chart': {
        const isExpanded = expandedSections['form_chart'];
        const displayReports = isExpanded ? performanceReports.slice(0, 20) : performanceReports.slice(0, 6);
        return (
          <SectionEditWrapper key={sectionId} sectionId={sectionId}>
            <section id="section-form_chart">
              <SectionHeading title="Recent Form" />
              {performanceReports.length > 0 ? (
                <>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {displayReports.map((rpt: any) => {
                      const isHidden = hiddenStats[`form_${rpt.id}`];
                      // In view mode skip hidden, in edit mode show greyed out
                      if (isHidden && !isEditing) return null;
                      const r90Val = rpt.r90_score;
                      const r90Grade = r90Val != null ? getFormGrade('r90', r90Val) : null;
                      return (
                        <div key={rpt.id} className={`relative rounded-2xl p-3 flex items-center justify-between transition-opacity ${isHidden ? 'opacity-30' : ''}`} style={{ background: 'rgba(15,15,15,0.8)', border: `1px solid ${RISE_GOLD}1a` }}>
                          {isEditing && (
                            <button onClick={() => toggleStatVisibility(`form_${rpt.id}`)} className="absolute -left-5 top-1/2 -translate-y-1/2 z-10 text-white/30 hover:text-white/60">
                              {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          )}
                          <div>
                            <p className="font-bebas uppercase text-sm md:text-base text-white tracking-wider">{rpt.opponent || 'Match'}</p>
                            <p className="text-[11px] text-white/40">{rpt.analysis_date ? new Date(rpt.analysis_date).toLocaleDateString('en-GB') : ''}</p>
                            {rpt.minutes_played && <p className="text-[10px] text-white/30">{rpt.minutes_played} mins</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            {r90Grade && (
                              <div className="px-2.5 py-1 rounded text-xs font-bold" style={{ backgroundColor: r90Grade.color + '33', color: r90Grade.color, border: `1px solid ${r90Grade.color}44` }}>
                                {r90Grade.grade}
                              </div>
                            )}
                            {r90Val != null && (
                              <div className="w-10 h-10 rounded flex items-center justify-center" style={{ backgroundColor: r90Val >= 0.08 ? '#22c55e' : r90Val >= 0.05 ? '#eab308' : r90Val >= 0.02 ? '#f97316' : '#ef4444' }}>
                                <span className="text-[11px] font-bold text-white">{r90Val.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {performanceReports.length > 6 && (
                    <button onClick={() => toggleExpand('form_chart')} className="mt-3 text-xs font-bebas uppercase tracking-wider flex items-center gap-1 mx-auto hover:opacity-80" style={{ color: RISE_GOLD }}>
                      {isExpanded ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Show all {performanceReports.length} matches</>}
                    </button>
                  )}
                </>
              ) : (
                <p className="text-white/30 text-sm italic">No form data available yet.</p>
              )}
            </section>
          </SectionEditWrapper>
        );
      }

      case 'comparison': {
        const categories = getMetricCategoriesForPosition(player?.position);
        // swappingCompSlot state is lifted to component level
        return (
          <SectionEditWrapper key={sectionId} sectionId={sectionId}>
            <section id="section-comparison">
              <SectionHeading title="Player Comparisons" icon={<BarChart3 className="h-5 w-5" />} />
              {configuredCompPlayers.length > 0 && Object.keys(playerAverages).length > 0 ? (
                <div className="space-y-4">
                  {categories.map(cat => {
                    const catMetrics = cat.metrics.filter(m => !hiddenStats[`comp_${m.key}`] && playerAverages[m.key] != null);
                    if (catMetrics.length === 0) return null;
                    return (
                      <div key={cat.category} className="rounded-lg overflow-hidden" style={{ background: 'rgba(15,15,15,0.8)', border: `1px solid ${RISE_GOLD}1a` }}>
                        <div className="px-4 py-2" style={{ borderBottom: `1px solid ${RISE_GOLD}1a` }}>
                          <h4 className="text-sm font-bebas uppercase tracking-wider" style={{ color: `${RISE_GOLD}b3` }}>{cat.category}</h4>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs md:text-sm">
                            <thead>
                              <tr style={{ borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                                <th className="text-left p-2.5 text-white/40 font-normal">Metric</th>
                                <th className="text-center p-2.5 font-bold" style={{ color: RISE_GOLD }}>{player?.name?.split(' ').pop()}</th>
                                {configuredCompPlayers.map((cp, cpIdx) => (
                                  <th key={cp.id} className="text-center p-2.5 relative">
                                    <button
                                      onClick={() => setSwappingCompSlot(swappingCompSlot === cpIdx ? null : cpIdx)}
                                      className="text-white/50 font-normal hover:underline cursor-pointer transition-colors"
                                      style={swappingCompSlot === cpIdx ? { color: RISE_GOLD } : {}}
                                      title="Click to swap player"
                                    >
                                      {cp.name?.split(' ').pop()}
                                    </button>
                                    {swappingCompSlot === cpIdx && (
                                      <div className="absolute top-full left-1/2 -translate-x-1/2 z-30 mt-1 w-48 max-h-48 overflow-y-auto rounded-lg shadow-xl" style={{ background: 'rgba(20,20,20,0.98)', border: `1px solid ${RISE_GOLD}40` }}>
                                        {comparisonPlayers.filter(p => !configuredCompPlayers.some(c => c.id === p.id)).map(p => (
                                          <button
                                            key={p.id}
                                            onClick={() => {
                                              const currentIds = (editContentConfig.comparison_player_ids || configuredCompPlayers.map((c: any) => c.id)) as string[];
                                              const updated = [...currentIds];
                                              updated[cpIdx] = p.id;
                                              updateEditConfig('comparison_player_ids', updated);
                                              setSwappingCompSlot(null);
                                            }}
                                            className="w-full text-left px-3 py-2 text-xs text-white/70 hover:text-white transition-colors"
                                            style={{ borderBottom: `1px solid rgba(255,255,255,0.05)` }}
                                          >
                                            {p.name} <span className="text-white/30">· {p.club}</span>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {catMetrics.map(m => {
                                const pVal = playerAverages[m.key];
                                const allVals = [pVal, ...configuredCompPlayers.map(cp => (cp.metrics as Record<string, number>)?.[m.key])].filter((v): v is number => v != null);
                                const maxVal = Math.max(...allVals);
                                return (
                                  <tr key={m.key} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td className="p-2.5 text-white/60">{m.label}</td>
                                    <td className="p-2.5 text-center font-bold" style={pVal === maxVal ? { color: RISE_GOLD, background: `${RISE_GOLD}15` } : { color: 'rgba(255,255,255,0.8)' }}>
                                      {pVal?.toFixed(2) ?? '-'}
                                    </td>
                                    {configuredCompPlayers.map(cp => {
                                      const val = (cp.metrics as Record<string, number>)?.[m.key];
                                      return (
                                        <td key={cp.id} className={`p-2.5 text-center ${val === maxVal ? 'text-white font-bold' : 'text-white/40'}`}>
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
              ) : (
                <p className="text-white/30 text-sm italic">No comparison data available yet.</p>
              )}
            </section>
          </SectionEditWrapper>
        );
      }

      case 'tactical': {
        const schemes = tacticalSchemes.length > 0 ? tacticalSchemes : (player?.tacticalFormations || []);
        return (
          <SectionEditWrapper key={sectionId} sectionId={sectionId}>
            <section id="section-tactical">
              <SectionHeading title="Tactical History" />
              {schemes.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {schemes.map((scheme: any, idx: number) => (
                    <div key={scheme.id || idx} className="rounded-xl p-4 transition-all" style={{ background: 'rgba(15,15,15,0.8)', border: `1px solid ${RISE_GOLD}26`, borderColor: undefined }}>
                      <div className="flex items-center gap-3 mb-3">
                        {(scheme.home_team_logo || scheme.clubLogo) && (
                          <img src={scheme.home_team_logo || scheme.clubLogo} alt="" className="w-8 h-8 object-contain" />
                        )}
                        <div>
                          <p className="font-bebas uppercase tracking-wider text-white text-sm md:text-base">
                            {scheme.scheme_title || scheme.title || scheme.club || 'Formation'}
                          </p>
                          <p className="text-[11px] text-white/40">
                            {scheme.selected_scheme || scheme.formation}
                            {scheme.positions ? ` · ${Array.isArray(scheme.positions) ? scheme.positions.join(', ') : scheme.positions}` : ''}
                          </p>
                        </div>
                      </div>
                      {scheme.scheme_paragraph_1 && (
                        <p className="text-[12px] text-white/50 leading-relaxed line-clamp-3">{scheme.scheme_paragraph_1}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/30 text-sm italic">No tactical history available yet.</p>
              )}
            </section>
          </SectionEditWrapper>
        );
      }

      case 'strengths':
        return (
          <SectionEditWrapper key={sectionId} sectionId={sectionId}>
            <section id="section-strengths">
              <SectionHeading title="Strengths & Play Style" />
              {player?.strengthsAndPlayStyle ? (
                <div className="rounded-2xl p-5" style={{ background: 'rgba(15,15,15,0.8)', border: `1px solid ${RISE_GOLD}1a` }}>
                  {Array.isArray(player.strengthsAndPlayStyle) ? (
                    <div className="flex flex-wrap gap-2">
                      {player.strengthsAndPlayStyle.map((s: string, i: number) => {
                        const isHidden = hiddenStats[`strength_${i}`];
                        if (isHidden && !isEditing) return null;
                        return (
                          <span key={i} className={`relative px-3 py-1.5 rounded-md text-sm text-white/70 font-medium transition-opacity ${isHidden ? 'opacity-30' : ''}`} style={{ border: `1px solid ${RISE_GOLD}33`, background: `${RISE_GOLD}0d` }}>
                            {s}
                            {isEditing && (
                              <button onClick={() => toggleStatVisibility(`strength_${i}`)} className="ml-1.5 text-white/30 hover:text-white/60">
                                {isHidden ? <EyeOff className="w-2.5 h-2.5 inline" /> : <Eye className="w-2.5 h-2.5 inline" />}
                              </button>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-white/60 text-sm md:text-base">{player.strengthsAndPlayStyle}</p>
                  )}
                </div>
              ) : (
                <p className="text-white/30 text-sm italic">No strengths data available yet.</p>
              )}
            </section>
          </SectionEditWrapper>
        );

      case 'clips':
        return (
          <SectionEditWrapper key={sectionId} sectionId={sectionId}>
            <section id="section-clips">
              <SectionHeading title="Wyscout Video Reports" />
              {videoReports.length > 0 ? (
                <div className="space-y-3">
                  {activeVideoReport ? (
                    <div>
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-black" style={{ border: `4px solid ${RISE_GOLD}` }}>
                        <video src={activeVideoReport.video_url} className="w-full h-full object-contain" controls playsInline autoPlay />
                        <div className="absolute top-3 left-3 bg-black/80 rounded-lg px-3 py-1.5" style={{ border: `1px solid ${RISE_GOLD}4d` }}>
                          <span className="text-sm font-bebas uppercase tracking-wider" style={{ color: RISE_GOLD }}>{activeVideoReport.title}</span>
                        </div>
                      </div>
                      <button onClick={() => setActiveVideoReport(null)} className="mt-3 text-xs font-bebas uppercase tracking-wider flex items-center gap-1 hover:opacity-80" style={{ color: RISE_GOLD }}>
                        <ChevronLeft className="h-3 w-3" /> Back to list
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {videoReports.map((vr: any) => (
                        <button key={vr.id} onClick={() => setActiveVideoReport(vr)}
                          className="flex items-center gap-3 p-3 rounded-lg transition-colors text-left w-full" style={{ background: 'rgba(15,15,15,0.8)', border: `1px solid ${RISE_GOLD}1a` }}>
                          <div className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0" style={{ border: `1px solid ${RISE_GOLD}4d`, background: `${RISE_GOLD}1a` }}>
                            <Play className="h-4 w-4" style={{ color: RISE_GOLD }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm md:text-base font-bebas uppercase tracking-wider text-white truncate">{vr.title}</p>
                            <p className="text-[11px] text-white/40">{vr.analysis_type} · {new Date(vr.created_at).toLocaleDateString('en-GB')}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-white/30 text-sm italic">No video reports available yet.</p>
              )}
            </section>
          </SectionEditWrapper>
        );

      case 'graphics':
        return (
          <SectionEditWrapper key={sectionId} sectionId={sectionId}>
            <section id="section-graphics">
              <SectionHeading title="Graphics & Images" />
              {galleryImages.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {galleryImages.map((img: any) => (
                    <div key={img.id} className="rounded-lg overflow-hidden aspect-square" style={{ border: `1px solid ${RISE_GOLD}1a` }}>
                      <img src={img.file_url || img.thumbnail_url} alt={img.title} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/30 text-sm italic">No graphics available yet.</p>
              )}
            </section>
          </SectionEditWrapper>
        );

      case 'scouting_notes': {
        const notes = isEditing ? editNotes : report?.custom_notes;
        const isExpanded = expandedSections['scouting_notes'];
        const shortNotes = notes && notes.length > 300 ? notes.slice(0, 300) + '...' : notes;
        return (
          <SectionEditWrapper key={sectionId} sectionId={sectionId}>
            <section id="section-scouting_notes">
              <SectionHeading title="Scouting Notes" />
              {isEditing ? (
                <Textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  className="bg-black/50 border-white/10 text-white/80 text-sm md:text-base min-h-[120px]"
                  placeholder="Add scouting notes..."
                />
              ) : notes ? (
                <div className="rounded-lg p-5" style={{ background: 'rgba(15,15,15,0.8)', border: `1px solid ${RISE_GOLD}1a` }}>
                  <p className="text-white/70 whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                    {isExpanded ? notes : shortNotes}
                  </p>
                  {notes.length > 300 && (
                    <button onClick={() => toggleExpand('scouting_notes')} className="mt-3 text-xs font-bebas uppercase tracking-wider flex items-center gap-1 hover:opacity-80" style={{ color: RISE_GOLD }}>
                      {isExpanded ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Read more</>}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-white/30 text-sm italic">No scouting notes added yet.</p>
              )}
            </section>
          </SectionEditWrapper>
        );
      }

      case 'contract_info': {
        const contract = contentConfig?.contract_info || parsedBio || {};
        const hasData = contract?.current_club || contract?.contract_expiry || contract?.wage || contract?.market_value || contract?.agent;
        return (
          <SectionEditWrapper key={sectionId} sectionId={sectionId}>
            <section id="section-contract_info">
              <SectionHeading title="Contract Information" icon={<FileText className="h-5 w-5" />} />
              {isEditing ? (
                <div className="grid grid-cols-2 gap-3">
                  {['current_club', 'contract_expiry', 'wage', 'market_value'].map(field => (
                    <div key={field}>
                      <label className="text-[11px] text-white/40 uppercase tracking-wider font-bebas mb-1 block">{field.replace(/_/g, ' ')}</label>
                      <Input
                        value={(editContentConfig.contract_info || {})[field] || ''}
                        onChange={e => updateEditConfig('contract_info', { ...(editContentConfig.contract_info || {}), [field]: e.target.value })}
                        className="bg-black/50 border-white/10 text-white/80 text-sm"
                        placeholder={`Enter ${field.replace(/_/g, ' ')}...`}
                      />
                    </div>
                  ))}
                </div>
              ) : hasData ? (
                <div className="rounded-lg p-5" style={{ background: 'rgba(15,15,15,0.8)', border: `1px solid ${RISE_GOLD}1a` }}>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { key: 'current_club', label: 'Current Club' },
                      { key: 'contract_expiry', label: 'Contract Expiry' },
                      { key: 'wage', label: 'Wage' },
                      { key: 'market_value', label: 'Market Value' },
                      { key: 'agent', label: 'Representation' },
                      { key: 'previous_clubs', label: 'Previous Clubs', span: true },
                    ].map(item => {
                      const val = contract[item.key];
                      if (!val) return null;
                      return (
                        <div key={item.key} className={item.span ? 'col-span-2 md:col-span-3' : ''}>
                          <p className="text-[11px] text-white/40 uppercase tracking-wider font-bebas mb-1">{item.label}</p>
                          <p className="text-white/80 text-sm md:text-base font-medium">{val}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-white/30 text-sm italic">No contract information added yet.</p>
              )}
            </section>
          </SectionEditWrapper>
        );
      }

      case 'physical_profile': {
        const physical = contentConfig?.physical_profile || parsedBio || {};
        const hasData = physical?.height || physical?.weight || physical?.preferred_foot || physical?.fitness_level;
        return (
          <SectionEditWrapper key={sectionId} sectionId={sectionId}>
            <section id="section-physical_profile">
              <SectionHeading title="Physical Profile" icon={<Dumbbell className="h-5 w-5" />} />
              {isEditing ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['height', 'weight', 'preferred_foot', 'fitness_level'].map(field => (
                    <div key={field}>
                      <label className="text-[11px] text-white/40 uppercase tracking-wider font-bebas mb-1 block">{field.replace(/_/g, ' ')}</label>
                      <Input
                        value={(editContentConfig.physical_profile || {})[field] || ''}
                        onChange={e => updateEditConfig('physical_profile', { ...(editContentConfig.physical_profile || {}), [field]: e.target.value })}
                        className="bg-black/50 border-white/10 text-white/80 text-sm"
                        placeholder={field.replace(/_/g, ' ')}
                      />
                    </div>
                  ))}
                </div>
              ) : hasData ? (
                <div className="rounded-lg p-5" style={{ background: 'rgba(15,15,15,0.8)', border: `1px solid ${RISE_GOLD}1a` }}>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { key: 'height', label: 'Height' },
                      { key: 'weight', label: 'Weight' },
                      { key: 'preferred_foot', label: 'Preferred Foot' },
                      { key: 'fitness_level', label: 'Fitness' },
                    ].map(item => {
                      const val = physical[item.key];
                      if (!val) return null;
                      return (
                        <div key={item.key} className="text-center rounded-lg p-4" style={{ border: `1px solid ${RISE_GOLD}1a`, background: `${RISE_GOLD}0a` }}>
                          <div className="text-2xl font-bebas" style={{ color: RISE_GOLD }}>{val}</div>
                          <div className="text-[11px] text-white/40 uppercase tracking-wider">{item.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-white/30 text-sm italic">No physical profile data added yet.</p>
              )}
            </section>
          </SectionEditWrapper>
        );
      }

      case 'agent_notes': {
        const notes = isEditing ? (editContentConfig.agent_notes || '') : (contentConfig?.agent_notes || '');
        return (
          <SectionEditWrapper key={sectionId} sectionId={sectionId}>
            <section id="section-agent_notes">
              <SectionHeading title="Agent Notes" icon={<User className="h-5 w-5" />} />
              {isEditing ? (
                <Textarea
                  value={editContentConfig.agent_notes || ''}
                  onChange={e => updateEditConfig('agent_notes', e.target.value)}
                  className="bg-black/50 border-white/10 text-white/80 text-sm md:text-base min-h-[100px]"
                  placeholder="Add agent notes..."
                />
              ) : notes ? (
                <div className="rounded-lg p-5" style={{ background: 'rgba(15,15,15,0.8)', border: `1px solid ${RISE_GOLD}1a` }}>
                  <p className="text-white/70 whitespace-pre-wrap leading-relaxed text-sm md:text-base">{notes}</p>
                </div>
              ) : (
                <p className="text-white/30 text-sm italic">No agent notes added yet.</p>
              )}
            </section>
          </SectionEditWrapper>
        );
      }

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full animate-spin" style={{ border: `2px solid ${RISE_GOLD}4d`, borderTopColor: RISE_GOLD }} />
          <p className="font-bebas uppercase tracking-widest text-sm" style={{ color: `${RISE_GOLD}99` }}>Loading Report</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <h1 className="text-3xl font-bebas mb-2" style={{ color: RISE_GOLD }}>Report Unavailable</h1>
          <p className="text-white/60">{error || 'This report does not exist.'}</p>
        </div>
      </div>
    );
  }

  // In edit mode, show ALL sections in their order. In view mode, only included ones.
  const sectionsToRender = isEditing
    ? (editSectionOrder.length > 0 ? editSectionOrder : ALL_SECTIONS.map(s => s.id))
    : sectionOrder.filter((id: string) => includedSections.includes(id));

  return (
    <>
      <SEO
        title={`${report.title} - RISE Football Agency`}
        description={`Transfer report for ${player?.name || 'Player'}`}
      />
      <div className="min-h-screen bg-[#0a0a0a]">
        {/* Staff edit toolbar */}
        {isStaff && (
          <div className="sticky top-0 z-50 backdrop-blur-md" style={{ background: isEditing ? `rgba(198,163,50,0.08)` : 'rgba(10,10,10,0.9)', borderBottom: `1px solid ${isEditing ? RISE_GOLD + '40' : RISE_GOLD + '1a'}` }}>
            <div className="container mx-auto px-4 max-w-5xl py-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isEditing && (
                  <Badge className="text-[10px] font-bebas uppercase tracking-wider" style={{ background: `${RISE_GOLD}20`, color: RISE_GOLD, border: `1px solid ${RISE_GOLD}40` }}>
                    Editing
                  </Badge>
                )}
                <span className="text-xs text-white/40 font-bebas uppercase tracking-wider">
                  {isEditing ? 'Hover sections to toggle visibility' : 'Staff view'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isEditing && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => setShowSettingsPanel(!showSettingsPanel)} className="text-white/60 hover:text-white text-xs">
                      <Settings className="w-3.5 h-3.5 mr-1" /> Settings
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs" style={{ background: RISE_GOLD, color: '#000' }}>
                      {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="text-white/40 hover:text-white text-xs">
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
                {!isEditing && (
                  <Button size="sm" onClick={() => setIsEditing(true)} className="text-xs" style={{ background: `${RISE_GOLD}20`, color: RISE_GOLD, border: `1px solid ${RISE_GOLD}40` }}>
                    <Settings className="w-3.5 h-3.5 mr-1" /> Edit Report
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Settings panel (slide down when editing) */}
        {isEditing && showSettingsPanel && (
          <div className="border-b py-4" style={{ background: 'rgba(15,15,15,0.95)', borderColor: `${RISE_GOLD}20` }}>
            <div className="container mx-auto px-4 max-w-5xl space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-white/40 uppercase tracking-wider font-bebas mb-1 block">Report Title</label>
                  <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="bg-black/50 border-white/10 text-white/80" />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg" style={{ border: `1px solid ${RISE_GOLD}26`, background: `${RISE_GOLD}08` }}>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" style={{ color: RISE_GOLD }} />
                    <span className="text-sm text-white/70">Exclusive Representation</span>
                  </div>
                  <Switch
                    checked={!!editContentConfig.exclusive_representation}
                    onCheckedChange={(checked) => updateEditConfig('exclusive_representation', checked)}
                  />
                </div>
              </div>

              {/* Comparison player selection */}
              {comparisonPlayers.length > 0 && (
                <div>
                  <label className="text-[11px] text-white/40 uppercase tracking-wider font-bebas mb-2 block">Comparison Players</label>
                  <div className="flex flex-wrap gap-1.5">
                    {comparisonPlayers.map(cp => {
                      const selected = ((editContentConfig.comparison_player_ids || []) as string[]).includes(cp.id);
                      return (
                        <button
                          key={cp.id}
                          onClick={() => {
                            const current = (editContentConfig.comparison_player_ids || []) as string[];
                            const updated = selected ? current.filter(id => id !== cp.id) : [...current, cp.id];
                            updateEditConfig('comparison_player_ids', updated);
                          }}
                          className="px-2.5 py-1 rounded text-[11px] transition-colors"
                          style={selected ? { background: `${RISE_GOLD}20`, border: `1px solid ${RISE_GOLD}60`, color: RISE_GOLD } : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                        >
                          {cp.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hero Header */}
        <div className="relative overflow-hidden" style={{ borderBottom: `1px solid ${RISE_GOLD}33` }}>
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: `url(${blackMarbleBg})`, backgroundSize: 'cover' }} />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent" />
          <div className="container mx-auto px-4 py-10 max-w-5xl relative z-10">
            <div className="flex items-center gap-8">
              {player?.image_url && (
                <div className="relative flex-shrink-0">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden" style={{ border: `2px solid ${RISE_GOLD}` }}>
                    <img src={player.image_url} alt={player?.name} className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bebas uppercase tracking-[0.3em] text-sm mb-1" style={{ color: `${RISE_GOLD}80` }}>Transfer Report</p>
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

        {/* Exclusive Representation Banner */}
        {isExclusive && (
          <div style={{ borderBottom: `1px solid ${RISE_GOLD}33`, background: `linear-gradient(90deg, ${RISE_GOLD}1f 0%, rgba(10,10,10,0.95) 50%, ${RISE_GOLD}1f 100%)` }}>
            <div className="container mx-auto px-4 max-w-5xl py-3 text-center">
              <div className="flex items-center justify-center gap-2">
                <Shield className="h-4 w-4" style={{ color: RISE_GOLD }} />
                <span className="text-xs font-bebas uppercase tracking-[0.25em]" style={{ color: RISE_GOLD }}>Exclusive Representation by RISE Football Agency</span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Navigation Menu */}
        <div className="sticky top-12 z-40 backdrop-blur-md" style={{ background: 'rgba(10,10,10,0.85)', borderBottom: `1px solid ${RISE_GOLD}1a` }}>
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="flex items-center gap-1 overflow-x-auto py-2" style={{ scrollbarWidth: 'none' }}>
              {sectionsToRender.map((id: string) => {
                const label = ALL_SECTIONS.find(s => s.id === id)?.label;
                if (!label) return null;
                return (
                  <button
                    key={id}
                    onClick={() => document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bebas uppercase tracking-wider transition-colors hover:opacity-80"
                    style={{ color: `${RISE_GOLD}b3`, background: `${RISE_GOLD}0d`, border: `1px solid ${RISE_GOLD}1a` }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-10 max-w-5xl space-y-12">
          {sectionsToRender.map((id: string) => renderSection(id))}

          {/* Footer */}
          <div className="relative text-center py-10 overflow-hidden" style={{ borderTop: `1px solid ${RISE_GOLD}1a` }}>
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
  <h2 className="text-2xl md:text-3xl font-bebas uppercase tracking-widest mb-5 flex items-center gap-3" style={{ color: RISE_GOLD }}>
    <span className="w-10 h-0.5" style={{ background: RISE_GOLD }} />
    {icon}
    {title}
    <span className="flex-1 h-0.5" style={{ background: `${RISE_GOLD}26` }} />
  </h2>
);

export default TransferReportView;
