import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, TrendingUp, FileText } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { Link } from "react-router-dom";

interface PlayerProgram {
  id: string;
  program_name: string;
  weekly_schedules: any;
  is_current: boolean;
}

interface PlayerAnalysis {
  id: string;
  analysis_date: string;
  opponent: string;
  r90_score: number;
  result: string;
}

interface HubProps {
  programs: PlayerProgram[];
  analyses: PlayerAnalysis[];
  playerData: any;
}

export const Hub = ({ programs, analyses, playerData }: HubProps) => {
  // Get current program schedule
  const currentProgram = programs.find(p => p.is_current);
  const currentSchedule = currentProgram?.weekly_schedules?.[0] || null;

  // Prepare R90 chart data
  const chartData = analyses
    .filter(a => a.r90_score != null)
    .sort((a, b) => new Date(a.analysis_date).getTime() - new Date(b.analysis_date).getTime())
    .slice(-8)
    .map(a => ({
      date: format(new Date(a.analysis_date), "MMM dd"),
      score: a.r90_score,
      opponent: a.opponent
    }));

  // Get latest fixtures/analyses
  const recentFixtures = analyses
    .sort((a, b) => new Date(b.analysis_date).getTime() - new Date(a.analysis_date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6 mb-8">
      {/* Player Header */}
      <div className="relative">
        <div className="flex items-center gap-6 mb-8">
          {playerData?.image_url && (
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary shadow-[0_0_20px_hsl(var(--primary)/0.5)]">
              <img 
                src={playerData.image_url} 
                alt={playerData.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex-1 space-y-3">
            <h1 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground">
              {playerData?.name || "Player Portal"}
            </h1>

            <div className="flex items-center gap-4 text-muted-foreground">
              {playerData?.position && (
                <span className="text-lg">{playerData.position}</span>
              )}
              {playerData?.nationality && (
                <>
                  <span>•</span>
                  <span className="text-lg">{playerData.nationality}</span>
                </>
              )}
              {playerData?.currentClub && (
                <>
                  <span>•</span>
                  <span className="text-lg">{playerData.currentClub}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-3xl font-bold mb-2">Hub</h2>
        <p className="text-muted-foreground">Your performance overview</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Schedule Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              This Week's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentSchedule ? (
              <div className="space-y-3">
                {Object.entries(currentSchedule.days || {}).map(([day, sessions]: [string, any]) => (
                  <div key={day} className="border-l-2 border-primary pl-3 py-1">
                    <div className="font-medium text-sm">{day}</div>
                    <div className="text-xs text-muted-foreground">
                      {Array.isArray(sessions) ? sessions.join(", ") : sessions}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No active program schedule</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Fixtures Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Fixtures
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentFixtures.length > 0 ? (
              <div className="space-y-3">
                {recentFixtures.map((fixture) => (
                  <Link
                    key={fixture.id}
                    to={`/performance-report/match-${fixture.id}`}
                    className="block border-l-2 border-accent pl-3 py-1 hover:bg-accent/5 transition-colors"
                  >
                    <div className="font-medium text-sm">{fixture.opponent}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{format(new Date(fixture.analysis_date), "MMM dd, yyyy")}</span>
                      {fixture.r90_score && (
                        <span className="text-primary font-medium">R90: {fixture.r90_score}</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent fixtures</p>
            )}
          </CardContent>
        </Card>

        {/* R90 Performance Chart */}
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Form
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                    formatter={(value: any, name: string, props: any) => [
                      `R90: ${value}`,
                      props.payload.opponent
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">No performance data yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
