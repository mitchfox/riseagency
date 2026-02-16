import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface NextFixtureCountdownProps {
  playerName?: string;
}

export const NextFixtureCountdown = ({ playerName }: NextFixtureCountdownProps) => {
  const [nextFixture, setNextFixture] = useState<{ match_date: string; home_team: string; away_team: string; venue?: string } | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const fetchNext = async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("fixtures")
        .select("match_date, home_team, away_team, venue")
        .gte("match_date", today)
        .order("match_date", { ascending: true })
        .limit(1);

      if (data && data.length > 0) {
        setNextFixture(data[0]);
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
    const target = new Date(nextFixture.match_date);
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
    <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-primary border-b-0">
      <CardHeader marble className="py-2">
        <div className="flex items-center gap-2 container mx-auto px-4">
          <Clock className="h-5 w-5" />
          <CardTitle className="font-heading tracking-tight ml-[9px] mt-[1px]">Next Fixture</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="container mx-auto px-4 pt-3 pb-4">
        <div className="text-center space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            {nextFixture.home_team} vs {nextFixture.away_team}
            {nextFixture.venue && <span className="ml-1">· {nextFixture.venue}</span>}
          </p>

          {countdown.passed ? (
            <p className="text-primary font-bold text-lg">Match day!</p>
          ) : (
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
          )}
        </div>
      </CardContent>
    </Card>
  );
};
