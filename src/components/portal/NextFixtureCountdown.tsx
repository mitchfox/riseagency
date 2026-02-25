import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createAnalysisSlug } from "@/lib/urlHelpers";

interface NextFixtureCountdownProps {
  playerName?: string;
}

export const NextFixtureCountdown = ({ playerName }: NextFixtureCountdownProps) => {
  const navigate = useNavigate();
  const [nextFixture, setNextFixture] = useState<{ id: string; match_date: string; match_time?: string | null; home_team: string; away_team: string; venue?: string } | null>(null);
  const [preMatchAnalysis, setPreMatchAnalysis] = useState<{ id: string; home_team: string; away_team: string } | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const fetchNext = async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("fixtures")
        .select("id, match_date, match_time, home_team, away_team, venue")
        .gte("match_date", today)
        .order("match_date", { ascending: true })
        .limit(1);

      if (data && data.length > 0) {
        setNextFixture(data[0]);
        
        // Fetch pre-match analysis linked to this fixture
        const { data: preMatch } = await supabase
          .from("analyses")
          .select("id, home_team, away_team")
          .eq("analysis_type", "pre-match")
          .eq("fixture_id", data[0].id)
          .limit(1);
        
        if (preMatch && preMatch.length > 0) {
          setPreMatchAnalysis({
            id: preMatch[0].id,
            home_team: preMatch[0].home_team || "",
            away_team: preMatch[0].away_team || "",
          });
        }
      }
    };
    fetchNext();
  }, []);

  // Tick every second
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const countdown = useMemo(() => {
    if (!nextFixture) return null;
    let target: Date;
    if (nextFixture.match_time) {
      const [hours, mins] = nextFixture.match_time.split(":").map(Number);
      target = new Date(nextFixture.match_date);
      target.setHours(hours || 0, mins || 0, 0, 0);
    } else {
      target = new Date(nextFixture.match_date);
    }
    const diff = target.getTime() - now.getTime();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, passed: true };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return { days, hours, minutes, seconds, passed: false };
  }, [nextFixture, now]);

  if (!nextFixture || !countdown) return null;

  const units = [
    { label: "DAYS", value: countdown.days },
    { label: "HRS", value: countdown.hours },
    { label: "MIN", value: countdown.minutes },
    { label: "SEC", value: countdown.seconds },
  ];

  return (
    <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-0 border-b-0 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-background to-primary/10 pointer-events-none" />
      <CardHeader className="py-3 relative z-10">
        <div className="flex items-center gap-2 container mx-auto px-4">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="font-heading tracking-tight text-primary">Next Fixture</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="container mx-auto px-4 pt-1 pb-5 relative z-10">
        <div className="text-center space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            {nextFixture.home_team} vs {nextFixture.away_team}
            {nextFixture.match_time && <span className="ml-1">· {nextFixture.match_time}</span>}
            {nextFixture.venue && <span className="ml-1">· {nextFixture.venue}</span>}
          </p>

          {countdown.passed ? (
            <div className="flex items-center justify-center gap-3">
              <p className="text-primary font-bold text-lg">Match day!</p>
              {preMatchAnalysis && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 bg-black text-white border border-primary/40 hover:bg-primary hover:text-black rounded font-bold text-[10px] flex items-center gap-1"
                  onClick={() => {
                    const slug = createAnalysisSlug(preMatchAnalysis.home_team, preMatchAnalysis.away_team, preMatchAnalysis.id);
                    navigate(slug);
                  }}
                >
                  <Eye className="h-3 w-3" />
                  Pre-Match
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="flex justify-center gap-3">
                {units.map(unit => (
                  <div key={unit.label} className="flex flex-col items-center">
                    <div className="bg-black border border-primary/30 rounded-lg px-3 py-2 md:px-4 md:py-3 min-w-[52px]">
                      <span className="text-2xl md:text-3xl font-bold text-primary tabular-nums">
                        {String(unit.value).padStart(2, "0")}
                      </span>
                    </div>
                    <span className="text-[9px] md:text-[10px] text-muted-foreground mt-1 font-medium">{unit.label}</span>
                  </div>
                ))}
              </div>
              {preMatchAnalysis && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-4 bg-black text-white border border-primary/40 hover:bg-primary hover:text-black rounded font-bold text-xs flex items-center gap-1.5"
                  onClick={() => {
                    const slug = createAnalysisSlug(preMatchAnalysis.home_team, preMatchAnalysis.away_team, preMatchAnalysis.id);
                    navigate(slug);
                  }}
                >
                  <Eye className="h-3.5 w-3.5" />
                  View Pre-Match Analysis
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
