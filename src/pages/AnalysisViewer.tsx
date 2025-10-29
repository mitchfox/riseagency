import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-4 py-1 rounded-full">
                {analysis.analysis_type.replace("-", " ")}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider text-foreground mb-4">
              {analysis.title || `${analysis.analysis_type} Analysis`}
            </h1>
            {(isPreMatch || isPostMatch) && (
              <div className="flex items-center gap-4 text-xl text-muted-foreground">
                <span>{analysis.home_team}</span>
                {analysis.home_score !== null && analysis.away_score !== null && (
                  <>
                    <span className="font-bold text-foreground">
                      {analysis.home_score} - {analysis.away_score}
                    </span>
                  </>
                )}
                <span>{analysis.away_team}</span>
              </div>
            )}
          </div>

          {/* Pre-Match Content */}
          {isPreMatch && (
            <div className="space-y-8">
              {analysis.key_details && (
                <Card>
                  <CardHeader>
                    <CardTitle className="font-bebas uppercase tracking-wider">
                      Key Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{analysis.key_details}</p>
                  </CardContent>
                </Card>
              )}

              {analysis.opposition_strengths && (
                <Card>
                  <CardHeader>
                    <CardTitle className="font-bebas uppercase tracking-wider">
                      Opposition Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{analysis.opposition_strengths}</p>
                  </CardContent>
                </Card>
              )}

              {analysis.opposition_weaknesses && (
                <Card>
                  <CardHeader>
                    <CardTitle className="font-bebas uppercase tracking-wider">
                      Opposition Weaknesses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{analysis.opposition_weaknesses}</p>
                  </CardContent>
                </Card>
              )}

              {analysis.matchups && analysis.matchups.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="font-bebas uppercase tracking-wider">
                      Key Matchups
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {analysis.matchups.map((matchup: any, index: number) => (
                        <div key={index} className="border rounded-lg p-4">
                          {matchup.image_url && (
                            <img
                              src={matchup.image_url}
                              alt={matchup.name}
                              className="w-full h-32 object-cover rounded mb-2"
                            />
                          )}
                          <p className="font-semibold">{matchup.name}</p>
                          {matchup.shirt_number && (
                            <p className="text-sm text-muted-foreground">
                              #{matchup.shirt_number}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {analysis.scheme_title && (
                <Card>
                  <CardHeader>
                    <CardTitle className="font-bebas uppercase tracking-wider">
                      {analysis.scheme_title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {analysis.scheme_image_url && (
                      <img
                        src={analysis.scheme_image_url}
                        alt="Scheme"
                        className="w-full rounded-lg"
                      />
                    )}
                    {analysis.scheme_paragraph_1 && (
                      <p className="whitespace-pre-wrap">{analysis.scheme_paragraph_1}</p>
                    )}
                    {analysis.scheme_paragraph_2 && (
                      <p className="whitespace-pre-wrap">{analysis.scheme_paragraph_2}</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Post-Match Content */}
          {isPostMatch && (
            <div className="space-y-8">
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
                <Card>
                  <CardHeader>
                    <CardTitle className="font-bebas uppercase tracking-wider">
                      Strengths & Areas for Improvement
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{analysis.strengths_improvements}</p>
                  </CardContent>
                </Card>
              )}

              {analysis.points && analysis.points.length > 0 && (
                <div className="space-y-6">
                  {analysis.points.map((point: any, index: number) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="font-bebas uppercase tracking-wider">
                          {point.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {point.paragraph_1 && (
                          <p className="whitespace-pre-wrap">{point.paragraph_1}</p>
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
                          <p className="whitespace-pre-wrap">{point.paragraph_2}</p>
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
              {analysis.concept && (
                <Card>
                  <CardHeader>
                    <CardTitle className="font-bebas uppercase tracking-wider">
                      Concept
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{analysis.concept}</p>
                  </CardContent>
                </Card>
              )}

              {analysis.explanation && (
                <Card>
                  <CardHeader>
                    <CardTitle className="font-bebas uppercase tracking-wider">
                      Explanation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{analysis.explanation}</p>
                  </CardContent>
                </Card>
              )}

              {analysis.points && analysis.points.length > 0 && (
                <div className="space-y-6">
                  {analysis.points.map((point: any, index: number) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="font-bebas uppercase tracking-wider">
                          {point.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {point.paragraph_1 && (
                          <p className="whitespace-pre-wrap">{point.paragraph_1}</p>
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
                          <p className="whitespace-pre-wrap">{point.paragraph_2}</p>
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
