import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface Analysis {
  id: string;
  analysis_type: string;
  title: string | null;
  home_team: string | null;
  away_team: string | null;
  home_score: number | null;
  away_score: number | null;
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
      const parsedAnalysis = {
        ...data,
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
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#1a472a] to-[#0A1628]">
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
              {/* Header with Logo */}
              <div className="flex flex-col items-center mb-8">
                <div className="w-32 h-32 mb-4">
                  <img 
                    src="/logo.png" 
                    alt="Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-white/80 text-sm uppercase tracking-widest">
                  Fuel for Football
                </p>
                <p className="text-primary text-xs italic">Change The Game</p>
              </div>

              {/* Teams Header with Gold Border */}
              <div className="relative bg-gradient-to-r from-primary/10 via-primary/20 to-primary/10 border-t-4 border-b-4 border-primary rounded-lg p-6 mb-8">
                <div className="flex items-center justify-between">
                  {/* Home Team */}
                  <div className="flex-1 flex items-center justify-center gap-4">
                    <div className="w-20 h-20 bg-red-600 rounded-lg flex items-center justify-center overflow-hidden">
                      <span className="text-2xl font-bold text-white">
                        {analysis.home_team?.substring(0, 3).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-xl md:text-2xl font-bebas text-white tracking-wide">
                      {analysis.home_team}
                    </span>
                  </div>

                  {/* VS Divider */}
                  <div className="px-8">
                    <span className="text-white/60 text-sm">VS</span>
                  </div>

                  {/* Away Team */}
                  <div className="flex-1 flex items-center justify-center gap-4">
                    <span className="text-xl md:text-2xl font-bebas text-white tracking-wide">
                      {analysis.away_team}
                    </span>
                    <div className="w-20 h-20 bg-green-600 rounded-lg flex items-center justify-center overflow-hidden">
                      <span className="text-2xl font-bold text-white">
                        {analysis.away_team?.substring(0, 3).toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Match Title Below */}
                <div className="text-center mt-4">
                  <p className="text-white/80 text-sm italic">
                    {analysis.title || "Pre-Match Analysis"}
                  </p>
                </div>
              </div>

              {/* Overview Section with Gold Header */}
              {analysis.key_details && (
                <div className="mb-8">
                  <div className="bg-primary/90 text-center py-3 rounded-t-lg">
                    <h2 className="text-2xl font-bebas uppercase tracking-widest text-black">
                      Overview
                    </h2>
                  </div>
                  <Card className="bg-white/95 rounded-t-none border-t-0">
                    <CardContent className="p-6">
                      <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {analysis.key_details}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Opposition Strengths */}
              {analysis.opposition_strengths && (
                <div className="mb-8">
                  <div className="bg-primary/90 text-center py-3 rounded-t-lg">
                    <h2 className="text-2xl font-bebas uppercase tracking-widest text-black">
                      Opposition Strengths
                    </h2>
                  </div>
                  <Card className="bg-white/95 rounded-t-none border-t-0">
                    <CardContent className="p-6">
                      <ul className="space-y-2">
                        {analysis.opposition_strengths.split('\n').filter(line => line.trim()).map((line, idx) => (
                          <li key={idx} className="text-gray-800 flex items-start">
                            <span className="text-green-600 mr-2">●</span>
                            <span className="italic">{line.trim()}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Opposition Weaknesses */}
              {analysis.opposition_weaknesses && (
                <div className="mb-8">
                  <div className="bg-primary/90 text-center py-3 rounded-t-lg">
                    <h2 className="text-2xl font-bebas uppercase tracking-widest text-black">
                      Opposition Weaknesses
                    </h2>
                  </div>
                  <Card className="bg-white/95 rounded-t-none border-t-0">
                    <CardContent className="p-6">
                      <ul className="space-y-2">
                        {analysis.opposition_weaknesses.split('\n').filter(line => line.trim()).map((line, idx) => (
                          <li key={idx} className="text-gray-800 flex items-start">
                            <span className="text-red-600 mr-2">●</span>
                            <span className="italic">{line.trim()}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Key Matchups */}
              {analysis.matchups && analysis.matchups.length > 0 && (
                <div className="mb-8">
                  <div className="bg-primary/90 text-center py-3 rounded-t-lg">
                    <h2 className="text-2xl font-bebas uppercase tracking-widest text-black">
                      Potential Matchup(s)
                    </h2>
                  </div>
                  <Card className="bg-white/95 rounded-t-none border-t-0">
                    <CardContent className="p-6">
                      <div className="grid grid-cols-3 gap-6">
                        {analysis.matchups.map((matchup: any, index: number) => (
                          <div key={index} className="text-center">
                            {matchup.image_url && (
                              <div className="mb-3 rounded-lg overflow-hidden">
                                <img
                                  src={matchup.image_url}
                                  alt={matchup.name}
                                  className="w-full h-40 object-cover"
                                />
                              </div>
                            )}
                            <p className="font-semibold text-gray-800">{matchup.name}</p>
                            {matchup.shirt_number && (
                              <p className="text-sm text-gray-600">
                                (#{matchup.shirt_number})
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Scheme Section */}
              {analysis.scheme_title && (
                <div className="mb-8">
                  <div className="bg-primary/90 text-center py-3 rounded-t-lg">
                    <h2 className="text-2xl font-bebas uppercase tracking-widest text-black">
                      {analysis.scheme_title}
                    </h2>
                  </div>
                  <Card className="bg-white/95 rounded-t-none border-t-0">
                    <CardContent className="p-6 space-y-4">
                      {analysis.scheme_image_url && (
                        <img
                          src={analysis.scheme_image_url}
                          alt="Scheme"
                          className="w-full rounded-lg"
                        />
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
                </div>
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
