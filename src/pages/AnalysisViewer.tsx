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
  selected_scheme: string | null;
  starting_xi: any;
  key_details: string | null;
  opposition_strengths: string | null;
  opposition_weaknesses: string | null;
  matchups: any;
  scheme_title: string | null;
  scheme_paragraph_1: string | null;
  scheme_paragraph_2: string | null;
  scheme_image_url: string | null;
  player_image_url: string | null;
  strengths_improvements: string | null;
  concept: string | null;
  explanation: string | null;
  points: any;
}

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
        selected_scheme: data.selected_scheme || null,
        starting_xi: Array.isArray(data.starting_xi) ? data.starting_xi : [],
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
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6 text-white hover:text-primary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {/* Pre-Match Content - Redesigned */}
          {isPreMatch && (
            <div className="space-y-0">
              {/* Match Title - Now showing date */}
              <div className="text-center mb-6">
                <h1 className="text-3xl md:text-4xl font-bebas uppercase tracking-wider text-white">
                  {analysis.match_date ? (
                    new Date(analysis.match_date).toLocaleDateString('en-GB', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  ) : (
                    analysis.title || "Pre-Match Analysis"
                  )}
                </h1>
              </div>

              {/* Teams Header with Gold Border */}
              <div className="relative bg-gradient-to-r from-primary/10 via-primary/20 to-primary/10 border-t-4 border-b-4 border-primary rounded-lg p-6 mb-8">
                <div className="flex items-center justify-between">
                  {/* Home Team */}
                  <div className="flex-1 flex items-center justify-center gap-4">
                    {analysis.home_team_logo && (
                      <div className="w-24 h-24 rounded-lg flex items-center justify-center overflow-hidden bg-white/5 p-2">
                        <img
                          src={analysis.home_team_logo}
                          alt={analysis.home_team || "Home team"}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    <span className="text-2xl md:text-3xl font-bebas text-white tracking-wide">
                      {analysis.home_team}
                    </span>
                  </div>

                  {/* VS Divider */}
                  <div className="px-8">
                    <span className="text-white/60 text-xl font-bebas">VS</span>
                  </div>

                  {/* Away Team */}
                  <div className="flex-1 flex items-center justify-center gap-4">
                    <span className="text-2xl md:text-3xl font-bebas text-white tracking-wide">
                      {analysis.away_team}
                    </span>
                    {analysis.away_team_logo && (
                      <div className="w-24 h-24 rounded-lg flex items-center justify-center overflow-hidden bg-white/5 p-2">
                        <img
                          src={analysis.away_team_logo}
                          alt={analysis.away_team || "Away team"}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Overview Section with Gold Header */}
              {analysis.key_details && (
                <Collapsible className="mb-8">
                  <CollapsibleTrigger className="w-full bg-primary/90 text-center py-3 rounded-t-lg hover:bg-primary flex items-center justify-center gap-2 transition-colors">
                    <h2 className="text-2xl font-bebas uppercase tracking-widest text-black">
                      Overview
                    </h2>
                    <ChevronDown className="w-5 h-5 text-black" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Card className="bg-white/95 rounded-t-none border-t-0">
                      <CardContent className="p-6">
                        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                          {analysis.key_details}
                        </p>
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Opposition Strengths */}
              {analysis.opposition_strengths && (
                <Collapsible className="mb-8">
                  <CollapsibleTrigger className="w-full bg-primary/90 text-center py-3 rounded-t-lg hover:bg-primary flex items-center justify-center gap-2 transition-colors">
                    <h2 className="text-2xl font-bebas uppercase tracking-widest text-black">
                      Opposition Strengths
                    </h2>
                    <ChevronDown className="w-5 h-5 text-black" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Card className="bg-white/95 rounded-t-none border-t-0">
                      <CardContent className="p-6">
                        <ul className="space-y-2 text-center">
                          {analysis.opposition_strengths.split('\n').filter(line => line.trim()).map((line, idx) => {
                            const cleanLine = line.trim().replace(/^[-•]\s*/, '');
                            return (
                              <li key={idx} className="text-gray-800 flex items-center justify-center">
                                <span className="text-green-600 mr-2">●</span>
                                <span className="italic">{cleanLine}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Opposition Weaknesses */}
              {analysis.opposition_weaknesses && (
                <Collapsible className="mb-8">
                  <CollapsibleTrigger className="w-full bg-primary/90 text-center py-3 rounded-t-lg hover:bg-primary flex items-center justify-center gap-2 transition-colors">
                    <h2 className="text-2xl font-bebas uppercase tracking-widest text-black">
                      Opposition Weaknesses
                    </h2>
                    <ChevronDown className="w-5 h-5 text-black" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Card className="bg-white/95 rounded-t-none border-t-0">
                      <CardContent className="p-6">
                        <ul className="space-y-2 text-center">
                          {analysis.opposition_weaknesses.split('\n').filter(line => line.trim()).map((line, idx) => {
                            const cleanLine = line.trim().replace(/^[-•]\s*/, '');
                            return (
                              <li key={idx} className="text-gray-800 flex items-center justify-center">
                                <span className="text-red-600 mr-2">●</span>
                                <span className="italic">{cleanLine}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Key Matchups */}
              {analysis.matchups && analysis.matchups.length > 0 && (
                <Collapsible className="mb-8">
                  <CollapsibleTrigger className="w-full bg-primary/90 text-center py-3 rounded-t-lg hover:bg-primary flex items-center justify-center gap-2 transition-colors">
                    <h2 className="text-2xl font-bebas uppercase tracking-widest text-black">
                      Potential Matchup(s)
                    </h2>
                    <ChevronDown className="w-5 h-5 text-black" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Card className="bg-white/95 rounded-t-none border-t-0">
                      <CardContent className="p-6">
                        <div className="grid grid-cols-3 gap-6">
                          {analysis.matchups.map((matchup: any, index: number) => (
                            <div key={index} className="text-center">
                              <div className="mb-3 rounded-lg overflow-hidden border-4 border-primary/20 bg-gray-100 aspect-square flex items-center justify-center">
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
                              <p className="font-semibold text-gray-800">{matchup.name}</p>
                              {matchup.shirt_number && (
                                <p className="text-sm text-gray-600">
                                  #{matchup.shirt_number}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Scheme Section */}
              {(analysis.scheme_title || analysis.selected_scheme) && (
                <Collapsible className="mb-8">
                  <CollapsibleTrigger className="w-full bg-primary/90 text-center py-3 rounded-t-lg hover:bg-primary flex items-center justify-center gap-2 transition-colors">
                    <h2 className="text-2xl font-bebas uppercase tracking-widest text-black">
                      {analysis.scheme_title || "Tactical Scheme"}
                    </h2>
                    <ChevronDown className="w-5 h-5 text-black" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Card className="bg-white/95 rounded-t-none border-t-0">
                      <CardContent className="p-6 space-y-4">
                        {analysis.selected_scheme && (
                          <div className="relative bg-green-700 rounded-lg p-8 min-h-[500px]">
                            <div className="text-white text-center mb-4 text-xl font-bebas">
                              {analysis.selected_scheme}
                            </div>
                            {analysis.starting_xi && analysis.starting_xi.length > 0 && (
                              <div className="absolute inset-0 p-8">
                                {analysis.starting_xi.map((player: any, index: number) => (
                                  <div
                                    key={index}
                                    className="absolute bg-white rounded-full w-16 h-16 flex flex-col items-center justify-center text-xs shadow-lg"
                                    style={{
                                      left: `${player.x}%`,
                                      top: `${player.y}%`,
                                      transform: 'translate(-50%, -50%)'
                                    }}
                                  >
                                    <div className="font-bold text-gray-800">{player.surname}</div>
                                    <div className="text-xs text-gray-600">#{player.number}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        {analysis.scheme_paragraph_1 && (
                          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                            {analysis.scheme_paragraph_1}
                          </p>
                        )}
                        {analysis.scheme_paragraph_2 && (
                          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                            {analysis.scheme_paragraph_2}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )}

          {/* Post-Match Content */}
          {isPostMatch && (
            <div className="space-y-8">
              {/* Header */}
              <div className="text-center mb-8">
                <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-4 py-1 rounded-full inline-block">
                  Post-Match Analysis
                </span>
                <h1 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider text-white mt-4 mb-4">
                  {analysis.title || "Post-Match Analysis"}
                </h1>
                <div className="flex items-center justify-center gap-4 text-xl text-white/80">
                  <span>{analysis.home_team}</span>
                  {analysis.home_score !== null && analysis.away_score !== null && (
                    <span className="font-bold text-primary">
                      {analysis.home_score} - {analysis.away_score}
                    </span>
                  )}
                  <span>{analysis.away_team}</span>
                </div>
              </div>

              {analysis.player_image_url && (
                <div className="w-full">
                  <img
                    src={analysis.player_image_url}
                    alt="Player"
                    className="w-full max-h-96 object-cover rounded-lg"
                  />
                </div>
              )}

              {analysis.strengths_improvements && (
                <Card className="bg-card/50 border-primary/20">
                  <CardContent className="p-6">
                    <h3 className="text-2xl font-bebas uppercase tracking-wider text-primary mb-4">
                      Strengths & Areas for Improvement
                    </h3>
                    <p className="text-white/90 leading-relaxed whitespace-pre-wrap">
                      {analysis.strengths_improvements}
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
