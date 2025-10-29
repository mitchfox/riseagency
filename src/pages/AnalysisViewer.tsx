import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import smudgedMarbleDate from "@/assets/smudged-marble-date.png";

interface Analysis {
  id: string;
  analysis_type: string;
  title: string | null;
  home_team: string | null;
  away_team: string | null;
  home_score: number | null;
  away_score: number | null;
  match_date: string | null;
  home_team_logo: string | null;
  away_team_logo: string | null;
  home_team_bg_color: string | null;
  away_team_bg_color: string | null;
  selected_scheme: string | null;
  starting_xi: any;
  kit_primary_color: string | null;
  kit_secondary_color: string | null;
  key_details: string | null;
  opposition_strengths: string | null;
  opposition_weaknesses: string | null;
  matchups: any;
  scheme_title: string | null;
  scheme_paragraph_1: string | null;
  scheme_paragraph_2: string | null;
  scheme_image_url: string | null;
  player_image_url: string | null;
  match_image_url: string | null;
  strengths_improvements: string | null;
  concept: string | null;
  explanation: string | null;
  points: any;
  video_url: string | null;
}

// Kit SVG Component - Larger size
const PlayerKit = ({ primaryColor, secondaryColor, number }: { primaryColor: string; secondaryColor: string; number: string }) => (
  <svg width="80" height="80" viewBox="0 0 100 100" className="drop-shadow-lg">
    {/* Kit Body */}
    <path d="M30 25 L25 35 L25 65 L30 75 L70 75 L75 65 L75 35 L70 25 Z" fill={primaryColor} stroke={secondaryColor} strokeWidth="2"/>
    {/* Stripes */}
    <rect x="42" y="25" width="16" height="50" fill={secondaryColor} opacity="0.8"/>
    {/* Collar */}
    <circle cx="50" cy="25" r="8" fill={primaryColor} stroke={secondaryColor} strokeWidth="2"/>
    {/* Number */}
    <text x="50" y="55" textAnchor="middle" fontSize="24" fontWeight="bold" fill="white" stroke="black" strokeWidth="1">
      {number}
    </text>
  </svg>
);

const AnalysisViewer = () => {
  const { analysisId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  useEffect(() => {
    if (analysisId) {
      fetchAnalysis();
    }
  }, [analysisId]);

  const fetchAnalysis = async () => {
    try {
      const { data, error } = await supabase
        .from("analyses")
        .select("*")
        .eq("id", analysisId)
        .single();

      if (error) throw error;
      
      // Parse matchups and points from JSON
      const parsedAnalysis: Analysis = {
        ...data,
        match_date: data.match_date || null,
        home_team_logo: data.home_team_logo || null,
        away_team_logo: data.away_team_logo || null,
        match_image_url: data.match_image_url || null,
        home_team_bg_color: data.home_team_bg_color || '#1a1a1a',
        away_team_bg_color: data.away_team_bg_color || '#8B0000',
        selected_scheme: data.selected_scheme || null,
        starting_xi: Array.isArray(data.starting_xi) ? data.starting_xi : [],
        kit_primary_color: data.kit_primary_color || '#FFD700',
        kit_secondary_color: data.kit_secondary_color || '#000000',
        matchups: Array.isArray(data.matchups) ? data.matchups : [],
        points: Array.isArray(data.points) ? data.points : []
      };
      
      setAnalysis(parsedAnalysis);
    } catch (error: any) {
      console.error("Error fetching analysis:", error);
      toast.error("Failed to load analysis");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 px-4">
          <p className="text-muted-foreground">Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 px-4">
          <p className="text-muted-foreground">Analysis not found</p>
        </div>
      </div>
    );
  }

  const isPreMatch = analysis.analysis_type === "pre-match";
  const isPostMatch = analysis.analysis_type === "post-match";
  const isConcept = analysis.analysis_type === "concept";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="flex justify-between items-center mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="text-white hover:text-primary"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {analysis.video_url && (
              <Button
                onClick={() => window.open(analysis.video_url!, '_blank')}
                className="btn-shine font-bebas uppercase tracking-wider"
              >
                Watch Analysis Video
              </Button>
            )}
          </div>

          {/* Pre-Match Content - Redesigned */}
          {isPreMatch && (
            <div className="border-4 border-primary rounded-lg">
              <Accordion type="single" collapsible className="space-y-0">
                {/* Teams Header with Gold Background */}
                <div className="relative border-t-4 border-b-4 border-primary rounded-lg overflow-hidden bg-primary">
                  <div className="flex items-center justify-between">
                    {/* Home Team */}
                    <div 
                      className="flex-1 flex items-center justify-center gap-3 py-2 px-4"
                      style={{ backgroundColor: analysis.home_team_bg_color || '#1a1a1a' }}
                    >
                      {analysis.home_team_logo && (
                        <div className="w-16 h-16 rounded-lg flex items-center justify-center overflow-hidden p-1">
                          <img
                            src={analysis.home_team_logo}
                            alt={analysis.home_team || "Home team"}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                      <span className="text-2xl md:text-3xl font-bebas text-white tracking-wide uppercase">
                        {analysis.home_team}
                      </span>
                    </div>

                    {/* VS Divider */}
                    <div className="px-4 bg-black">
                      <span className="text-white text-xl font-bebas">VS</span>
                    </div>

                    {/* Away Team */}
                    <div 
                      className="flex-1 flex items-center justify-center gap-3 py-2 px-4"
                      style={{ backgroundColor: analysis.away_team_bg_color || '#8B0000' }}
                    >
                      <span className="text-2xl md:text-3xl font-bebas text-white tracking-wide uppercase">
                        {analysis.away_team}
                      </span>
                      {analysis.away_team_logo && (
                        <div className="w-16 h-16 rounded-lg flex items-center justify-center overflow-hidden p-1">
                          <img
                            src={analysis.away_team_logo}
                            alt={analysis.away_team || "Away team"}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Match Date underneath teams in italics */}
                  {analysis.match_date && (
                    <div 
                      className="text-center text-white/90 text-base font-bebas tracking-wide italic py-2 bg-cover bg-center"
                      style={{ backgroundImage: `url(${smudgedMarbleDate})` }}
                    >
                      {new Date(analysis.match_date).toLocaleDateString('en-GB', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  )}
                </div>

                {/* Optional Match Image */}
                {analysis.match_image_url && (
                  <div className="mb-8 flex justify-center">
                    <img 
                      src={analysis.match_image_url} 
                      alt="Match" 
                      className="w-full max-w-5xl rounded-lg shadow-lg max-h-[540px] object-cover"
                    />
                  </div>
                )}

              {/* Overview Section with Custom Background */}
              {analysis.key_details && (
                <AccordionItem value="overview" className="mb-8 border-0 data-[state=open]:border-4 data-[state=open]:border-primary data-[state=open]:rounded-lg">
                  <AccordionTrigger 
                    className="w-full text-center bg-primary py-4 rounded-t-lg hover:opacity-90 flex items-center justify-center gap-2 transition-all [&[data-state=open]>svg]:rotate-180"
                  >
                    <h2 className="text-3xl font-bebas uppercase tracking-widest text-black">
                      Overview
                    </h2>
                    <ChevronDown className="w-5 h-5 text-black transition-transform duration-200" />
                  </AccordionTrigger>
                  <AccordionContent>
                    <Card className="rounded-t-none border-t-0 border-0 animate-accordion-down" style={{ backgroundColor: 'rgba(245, 245, 245, 0.95)' }}>
                      <CardContent className="p-3">
                        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                          {analysis.key_details}
                        </p>
                      </CardContent>
                    </Card>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Opposition Strengths */}
              {analysis.opposition_strengths && (
                <AccordionItem value="strengths" className="mb-8 border-0 data-[state=open]:border-4 data-[state=open]:border-primary data-[state=open]:rounded-lg">
                  <AccordionTrigger 
                    className="w-full text-center bg-primary py-4 rounded-t-lg hover:opacity-90 flex items-center justify-center gap-2 transition-all [&[data-state=open]>svg]:rotate-180"
                  >
                    <h2 className="text-3xl font-bebas uppercase tracking-widest text-black">
                      Opposition Strengths
                    </h2>
                    <ChevronDown className="w-5 h-5 text-black transition-transform duration-200" />
                  </AccordionTrigger>
                  <AccordionContent>
                    <Card className="bg-gradient-to-br from-gray-900 to-black rounded-t-none border-t-0 border-0 animate-accordion-down">
                      <CardContent className="p-3">
                        <div className="space-y-3 max-w-4xl mx-auto">
                          {analysis.opposition_strengths.split('\n').filter(line => line.trim()).map((line, idx) => {
                            const cleanLine = line.trim().replace(/^[-•]\s*/, '');
                            return (
                              <div key={idx} className="flex items-center justify-center gap-3 bg-white/10 backdrop-blur-sm p-4 rounded-lg shadow-lg hover:bg-white/15 transition-all">
                                <div className="bg-primary rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
                                  <span className="text-black font-bold text-lg">✓</span>
                                </div>
                                <p className="text-white text-lg leading-relaxed flex-1 text-center font-medium">{cleanLine}</p>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Opposition Weaknesses */}
              {analysis.opposition_weaknesses && (
                <AccordionItem value="weaknesses" className="mb-8 border-0 data-[state=open]:border-4 data-[state=open]:border-primary data-[state=open]:rounded-lg">
                  <AccordionTrigger 
                    className="w-full text-center bg-primary py-4 rounded-t-lg hover:opacity-90 flex items-center justify-center gap-2 transition-all [&[data-state=open]>svg]:rotate-180"
                  >
                    <h2 className="text-3xl font-bebas uppercase tracking-widest text-black">
                      Opposition Weaknesses
                    </h2>
                    <ChevronDown className="w-5 h-5 text-black transition-transform duration-200" />
                  </AccordionTrigger>
                  <AccordionContent>
                    <Card className="bg-gradient-to-br from-gray-900 to-black rounded-t-none border-t-0 border-0 animate-accordion-down">
                      <CardContent className="p-3">
                        <div className="space-y-3 max-w-4xl mx-auto">
                          {analysis.opposition_weaknesses.split('\n').filter(line => line.trim()).map((line, idx) => {
                            const cleanLine = line.trim().replace(/^[-•]\s*/, '');
                            return (
                              <div key={idx} className="flex items-center justify-center gap-3 bg-white/10 backdrop-blur-sm p-4 rounded-lg shadow-lg hover:bg-white/15 transition-all">
                                <div className="bg-primary rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
                                  <span className="text-black font-bold text-lg">!</span>
                                </div>
                                <p className="text-white text-lg leading-relaxed flex-1 text-center font-medium">{cleanLine}</p>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Key Matchups */}
              {analysis.matchups && analysis.matchups.length > 0 && (
                <AccordionItem value="matchups" className="mb-8 border-0 data-[state=open]:border-4 data-[state=open]:border-primary data-[state=open]:rounded-lg">
                  <AccordionTrigger 
                    className="w-full text-center bg-primary py-4 rounded-t-lg hover:opacity-90 flex items-center justify-center gap-2 transition-all [&[data-state=open]>svg]:rotate-180"
                  >
                    <h2 className="text-3xl font-bebas uppercase tracking-widest text-black">
                      Potential Matchup(s)
                    </h2>
                    <ChevronDown className="w-5 h-5 text-black transition-transform duration-200" />
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="rounded-t-none border-t-0 bg-transparent animate-accordion-down">
                      <div className="py-3 px-3">
                        <div className={`flex justify-center items-center gap-8 flex-wrap max-w-5xl mx-auto`}>
                          {analysis.matchups.map((matchup: any, index: number) => (
                            <div key={index} className="text-center flex-shrink-0" style={{ 
                              width: analysis.matchups.length === 1 ? '300px' : analysis.matchups.length === 2 ? '250px' : '200px'
                            }}>
                              <div className={`mb-3 rounded-lg overflow-hidden border-4 border-primary/30 bg-gradient-to-br from-gray-50 to-gray-100 aspect-square flex items-center justify-center shadow-lg`} style={{
                                width: analysis.matchups.length === 1 ? '300px' : analysis.matchups.length === 2 ? '250px' : '200px',
                                height: analysis.matchups.length === 1 ? '300px' : analysis.matchups.length === 2 ? '250px' : '200px'
                              }}>
                                {matchup.image_url ? (
                                  <img
                                    src={matchup.image_url}
                                    alt={matchup.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="text-gray-400 text-sm">No image</div>
                                )}
                              </div>
                              <p className="font-bold text-white text-lg">{matchup.name}</p>
                              {matchup.shirt_number && (
                                <p className="text-sm text-white/80 font-semibold">
                                  #{matchup.shirt_number}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Scheme Section */}
              {(analysis.scheme_title || analysis.selected_scheme) && (
                <AccordionItem value="scheme" className="mb-8 border-0 data-[state=open]:border-4 data-[state=open]:border-primary data-[state=open]:rounded-lg print:page-break-after-always">
                  <AccordionTrigger 
                    className="w-full text-center bg-primary py-4 rounded-t-lg hover:opacity-90 flex items-center justify-center gap-2 transition-all [&[data-state=open]>svg]:rotate-180"
                  >
                    <h2 className="text-3xl font-bebas uppercase tracking-widest text-black">
                      {analysis.scheme_title || "Tactical Scheme"}
                    </h2>
                    <ChevronDown className="w-5 h-5 text-black transition-transform duration-200" />
                  </AccordionTrigger>
                  <AccordionContent>
                    <Card className="rounded-t-none border-t-0 border-0 animate-accordion-down" style={{ backgroundColor: 'rgba(245, 245, 245, 0.95)' }}>
                      <CardContent className="p-3 space-y-3">
                        {analysis.scheme_paragraph_1 && (
                          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                            {analysis.scheme_paragraph_1}
                          </p>
                        )}
                        
                        {analysis.selected_scheme && (
                          <div className="relative bg-gradient-to-b from-green-700 to-green-800 rounded-lg p-8 min-h-[700px] border-4 border-white shadow-xl">
                            <div className="text-white text-center mb-4 text-2xl font-bebas tracking-wider">
                              {analysis.selected_scheme}
                            </div>
                            {/* Field markings - Outer border */}
                            <div className="absolute inset-8 border-2 border-white/30 rounded-lg"></div>
                            {/* Halfway line */}
                            <div className="absolute inset-x-8 top-1/2 h-0.5 bg-white/30"></div>
                            {/* Center circle */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-2 border-white/30 rounded-full"></div>
                            {/* 18-yard box - top */}
                            <div className="absolute left-1/2 -translate-x-1/2 top-8 w-48 h-24 border-2 border-white/30 border-t-0"></div>
                            {/* 6-yard box - top */}
                            <div className="absolute left-1/2 -translate-x-1/2 top-8 w-24 h-12 border-2 border-white/30 border-t-0"></div>
                            {/* Penalty spot - top */}
                            <div className="absolute left-1/2 -translate-x-1/2 top-24 w-2 h-2 bg-white/50 rounded-full"></div>
                            {/* 18-yard box - bottom */}
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-8 w-48 h-24 border-2 border-white/30 border-b-0"></div>
                            {/* 6-yard box - bottom */}
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-8 w-24 h-12 border-2 border-white/30 border-b-0"></div>
                            {/* Penalty spot - bottom */}
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-24 w-2 h-2 bg-white/50 rounded-full"></div>
                            
                            {analysis.starting_xi && analysis.starting_xi.length > 0 && (
                              <div className="absolute inset-0 p-8">
                                {analysis.starting_xi.map((player: any, index: number) => (
                                  <div
                                    key={index}
                                    className="absolute flex flex-col items-center gap-1"
                                    style={{
                                      left: `${player.x}%`,
                                      top: `${player.y}%`,
                                      transform: 'translate(-50%, -50%)'
                                    }}
                                  >
                                    <PlayerKit 
                                      primaryColor={analysis.kit_primary_color || '#FFD700'}
                                      secondaryColor={analysis.kit_secondary_color || '#000000'}
                                      number={player.number || '0'}
                                    />
                                    <div className="bg-black/80 text-white px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap">
                                      {player.surname || player.position}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {analysis.scheme_paragraph_2 && (
                          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                            {analysis.scheme_paragraph_2}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Additional Sections from Points with Gap and Custom Background Colors */}
              {analysis.points && analysis.points.length > 0 && (
                <div className="mt-12 space-y-0">
                  {analysis.points.map((point: any, index: number) => {
                    const bgColor = index % 2 === 0 ? 'bg-gray-300' : 'bg-gray-400';
                    return (
                      <AccordionItem key={index} value={`point-${index}`} className={`border-0 data-[state=open]:border-4 data-[state=open]:border-primary data-[state=open]:rounded-lg ${index > 0 ? 'mt-0' : ''}`}>
                        <AccordionTrigger 
                          className={`w-full text-center py-4 rounded-t-lg hover:opacity-90 flex items-center justify-center gap-2 transition-all [&[data-state=open]>svg]:rotate-180 ${bgColor}`}
                        >
                          <h2 className="text-3xl font-bebas uppercase tracking-widest text-black">
                            {point.title}
                          </h2>
                          <ChevronDown className="w-5 h-5 text-black transition-transform duration-200" />
                        </AccordionTrigger>
                        <AccordionContent>
                          <Card className="rounded-t-none border-t-0 border-0 animate-accordion-down" style={{ backgroundColor: 'rgba(245, 245, 245, 0.95)' }}>
                            <CardContent className="p-3 space-y-3">
                              {point.paragraph_1 && (
                                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                                  {point.paragraph_1}
                                </p>
                              )}
                              {point.images && point.images.length > 0 && (
                                <div className="bg-primary -mx-3 px-3 py-3 flex flex-col items-center gap-3">
                                  {point.images.map((img: string, imgIndex: number) => (
                                    <img
                                      key={imgIndex}
                                      src={img}
                                      alt={`${point.title} - Image ${imgIndex + 1}`}
                                      className="w-full max-w-4xl rounded-lg shadow-md"
                                    />
                                  ))}
                                </div>
                              )}
                              {point.paragraph_2 && (
                                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                                  {point.paragraph_2}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </div>
              )}
              </Accordion>
            </div>
          )}

          {/* Post-Match Content */}
          {isPostMatch && (
            <div className="border-4 border-primary rounded-lg">
              <Accordion type="single" collapsible className="space-y-0">
                {/* Teams Header with Custom Background Colors */}
                <div className="relative border-t-4 border-b-4 border-primary rounded-lg overflow-hidden bg-primary">
                  <div className="flex items-center justify-between">
                    {/* Home Team */}
                    <div 
                      className="flex-1 flex items-center justify-center gap-3 py-2 px-4"
                      style={{ backgroundColor: analysis.home_team_bg_color || '#1a1a1a' }}
                    >
                      {analysis.home_team_logo && (
                        <div className="w-16 h-16 rounded-lg flex items-center justify-center overflow-hidden p-1">
                          <img
                            src={analysis.home_team_logo}
                            alt={analysis.home_team || "Home team"}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                      <span className="text-2xl md:text-3xl font-bebas text-white tracking-wide uppercase">
                        {analysis.home_team}
                      </span>
                    </div>

                    {/* Score Divider */}
                    <div className="px-4 bg-black flex items-center gap-2">
                      {analysis.home_score !== null && analysis.away_score !== null && (
                        <span className="text-primary text-xl font-bebas">
                          {analysis.home_score} - {analysis.away_score}
                        </span>
                      )}
                    </div>

                    {/* Away Team */}
                    <div 
                      className="flex-1 flex items-center justify-center gap-3 py-2 px-4"
                      style={{ backgroundColor: analysis.away_team_bg_color || '#8B0000' }}
                    >
                      <span className="text-2xl md:text-3xl font-bebas text-white tracking-wide uppercase">
                        {analysis.away_team}
                      </span>
                      {analysis.away_team_logo && (
                        <div className="w-16 h-16 rounded-lg flex items-center justify-center overflow-hidden p-1">
                          <img
                            src={analysis.away_team_logo}
                            alt={analysis.away_team || "Away team"}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Match Date underneath teams in italics */}
                  {analysis.match_date && (
                    <div 
                      className="text-center text-white/90 text-base font-bebas tracking-wide italic py-2 bg-cover bg-center"
                      style={{ backgroundImage: `url(${smudgedMarbleDate})` }}
                    >
                      {new Date(analysis.match_date).toLocaleDateString('en-GB', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  )}
                </div>

                {/* Optional Player Image */}
                {analysis.player_image_url && (
                  <div className="mb-8 flex justify-center mt-8">
                    <img
                      src={analysis.player_image_url}
                      alt="Player"
                      className="w-full max-w-5xl rounded-lg shadow-lg max-h-48 object-cover"
                    />
                  </div>
                )}

                {/* Overview Section */}
                {analysis.key_details && (
                  <AccordionItem value="overview" className="mb-8 border-0 data-[state=open]:border-4 data-[state=open]:border-primary data-[state=open]:rounded-lg">
                    <AccordionTrigger 
                      className="w-full text-center bg-primary py-4 rounded-t-lg hover:opacity-90 flex items-center justify-center gap-2 transition-all [&[data-state=open]>svg]:rotate-180"
                    >
                      <h2 className="text-3xl font-bebas uppercase tracking-widest text-black">
                        Overview
                      </h2>
                      <ChevronDown className="w-5 h-5 text-black transition-transform duration-200" />
                    </AccordionTrigger>
                    <AccordionContent>
                      <Card className="rounded-t-none border-t-0 border-0 animate-accordion-down" style={{ backgroundColor: 'rgba(245, 245, 245, 0.95)' }}>
                        <CardContent className="p-3">
                          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                            {analysis.key_details}
                          </p>
                        </CardContent>
                      </Card>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Strengths & Areas for Improvement */}
                {analysis.strengths_improvements && (
                  <AccordionItem value="strengths-improvements" className="mb-8 border-0 data-[state=open]:border-4 data-[state=open]:border-primary data-[state=open]:rounded-lg">
                    <AccordionTrigger 
                      className="w-full text-center bg-primary py-4 rounded-t-lg hover:opacity-90 flex items-center justify-center gap-2 transition-all [&[data-state=open]>svg]:rotate-180"
                    >
                      <h2 className="text-3xl font-bebas uppercase tracking-widest text-black">
                        Strengths & Areas for Improvement
                      </h2>
                      <ChevronDown className="w-5 h-5 text-black transition-transform duration-200" />
                    </AccordionTrigger>
                    <AccordionContent>
                      <Card className="rounded-t-none border-t-0 border-0 animate-accordion-down" style={{ backgroundColor: 'rgba(245, 245, 245, 0.95)' }}>
                        <CardContent className="p-3">
                          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                            {analysis.strengths_improvements}
                          </p>
                        </CardContent>
                      </Card>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Additional Sections from Points */}
                {analysis.points && analysis.points.length > 0 && (
                  <div className="mt-12 space-y-0">
                    {analysis.points.map((point: any, index: number) => {
                      const bgColor = index % 2 === 0 ? 'bg-gray-300' : 'bg-gray-400';
                      return (
                        <AccordionItem key={index} value={`point-${index}`} className={`border-0 data-[state=open]:border-4 data-[state=open]:border-primary data-[state=open]:rounded-lg ${index > 0 ? 'mt-0' : ''}`}>
                          <AccordionTrigger 
                            className={`w-full text-center py-4 rounded-t-lg hover:opacity-90 flex items-center justify-center gap-2 transition-all [&[data-state=open]>svg]:rotate-180 ${bgColor}`}
                          >
                            <h2 className="text-3xl font-bebas uppercase tracking-widest text-black">
                              {point.title}
                            </h2>
                            <ChevronDown className="w-5 h-5 text-black transition-transform duration-200" />
                          </AccordionTrigger>
                          <AccordionContent>
                            <Card className="rounded-t-none border-t-0 border-0 animate-accordion-down" style={{ backgroundColor: 'rgba(245, 245, 245, 0.95)' }}>
                              <CardContent className="p-3 space-y-3">
                                {point.paragraph_1 && (
                                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                                    {point.paragraph_1}
                                  </p>
                                )}
                                {point.images && point.images.length > 0 && (
                                  <div className="bg-primary -mx-3 px-3 py-3 flex flex-col items-center gap-3">
                                    {point.images.map((img: string, imgIndex: number) => (
                                      <img
                                        key={imgIndex}
                                        src={img}
                                        alt={`${point.title} - Image ${imgIndex + 1}`}
                                        className="w-full max-w-4xl rounded-lg shadow-md"
                                      />
                                    ))}
                                  </div>
                                )}
                                {point.paragraph_2 && (
                                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                                    {point.paragraph_2}
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </div>
                )}
              </Accordion>
            </div>
          )}

          {/* Concept Content */}
          {isConcept && (
            <div className="space-y-8">
              {/* Header */}
              <div className="text-center mb-8">
                <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-4 py-1 rounded-full inline-block">
                  Concept
                </span>
                <h1 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider text-white mt-4">
                  {analysis.title || "Concept Analysis"}
                </h1>
              </div>

              {analysis.concept && (
                <Card className="bg-card/50 border-primary/20">
                  <CardContent className="p-6">
                    <h3 className="text-2xl font-bebas uppercase tracking-wider text-primary mb-4">
                      Concept
                    </h3>
                    <p className="text-white/90 leading-relaxed whitespace-pre-wrap">
                      {analysis.concept}
                    </p>
                  </CardContent>
                </Card>
              )}

              {analysis.explanation && (
                <Card className="bg-card/50 border-primary/20">
                  <CardContent className="p-6">
                    <h3 className="text-2xl font-bebas uppercase tracking-wider text-primary mb-4">
                      Explanation
                    </h3>
                    <p className="text-white/90 leading-relaxed whitespace-pre-wrap">
                      {analysis.explanation}
                    </p>
                  </CardContent>
                </Card>
              )}

              {analysis.points && analysis.points.length > 0 && (
                <div className="space-y-6">
                  {analysis.points.map((point: any, index: number) => (
                    <Card key={index} className="bg-card/50 border-primary/20">
                      <CardContent className="p-6 space-y-4">
                        <h3 className="text-2xl font-bebas uppercase tracking-wider text-primary">
                          {point.title}
                        </h3>
                        {point.paragraph_1 && (
                          <p className="text-white/90 leading-relaxed whitespace-pre-wrap">
                            {point.paragraph_1}
                          </p>
                        )}
                        {point.images && point.images.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {point.images.map((img: string, imgIndex: number) => (
                              <img
                                key={imgIndex}
                                src={img}
                                alt={`${point.title} - Image ${imgIndex + 1}`}
                                className="w-full rounded-lg"
                              />
                            ))}
                          </div>
                        )}
                        {point.paragraph_2 && (
                          <p className="text-white/90 leading-relaxed whitespace-pre-wrap">
                            {point.paragraph_2}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AnalysisViewer;
