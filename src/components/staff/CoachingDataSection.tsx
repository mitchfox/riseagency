import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActionReportsList } from "@/components/staff/analysis/ActionReportsList";
import { AnalysisDataTab } from "@/components/portal/AnalysisDataTab";
import { AnalysisComparisons } from "@/components/portal/AnalysisComparisons";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { ClipboardList, BarChart3, LineChart, Database } from "lucide-react";

interface PlayerAnalysis {
  id: string;
  analysis_date: string;
  opponent: string | null;
  r90_score: number | null;
  minutes_played: number | null;
  result: string | null;
  striker_stats?: any;
  fixture_stats?: any;
}

export const CoachingDataSection = () => {
  const [activeTab, setActiveTab] = useState("reports");
  const [selectedPlayer, setSelectedPlayer] = useState<string>("all");
  const [players, setPlayers] = useState<{ id: string; name: string; position: string; image_url: string | null }[]>([]);
  const [analyses, setAnalyses] = useState<PlayerAnalysis[]>([]);

  useEffect(() => {
    fetchPlayers();
  }, []);

  useEffect(() => {
    if (selectedPlayer && selectedPlayer !== "all") {
      fetchPlayerAnalyses(selectedPlayer);
    }
  }, [selectedPlayer]);

  const fetchPlayers = async () => {
    const { data } = await supabase
      .from("players")
      .select("id, name, position, image_url")
      .order("name");
    setPlayers(data || []);
  };

  const fetchPlayerAnalyses = async (playerId: string) => {
    const { data } = await supabase
      .from("player_analysis")
      .select("id, analysis_date, opponent, r90_score, minutes_played, result, striker_stats, fixture_stats")
      .eq("player_id", playerId)
      .order("analysis_date", { ascending: false });
    setAnalyses(data || []);
  };

  const currentPlayer = players.find(p => p.id === selectedPlayer);

  const tabItems = [
    { value: "reports", label: "Performance Reports", icon: ClipboardList },
    { value: "matchdata", label: "Match Data", icon: Database },
    { value: "comparisons", label: "Comparisons", icon: BarChart3 },
  ];

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Mobile dropdown */}
        <div className="md:hidden mb-4">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tabItems.map((tab) => (
                <SelectItem key={tab.value} value={tab.value}>
                  <div className="flex items-center gap-2">
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop tabs */}
        <TabsList className="hidden md:flex w-full justify-start h-auto p-0 bg-transparent rounded-none gap-1 mb-4">
          {tabItems.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded px-3 py-2 text-sm"
            >
              <tab.icon className="h-4 w-4 mr-1.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="reports" className="mt-0">
          <ActionReportsList />
        </TabsContent>

        <TabsContent value="matchdata" className="mt-0 space-y-4">
          <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
            <SelectTrigger className="w-full sm:w-[300px]">
              <SelectValue placeholder="Select a player..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Select a player...</SelectItem>
              {players.map((player) => (
                <SelectItem key={player.id} value={player.id}>
                  {player.name} ({player.position})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedPlayer !== "all" && currentPlayer ? (
            <AnalysisDataTab analyses={analyses} playerData={currentPlayer} embedded />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a player to view match-by-match data</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="comparisons" className="mt-0 space-y-4">
          <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
            <SelectTrigger className="w-full sm:w-[300px]">
              <SelectValue placeholder="Select a player..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Select a player...</SelectItem>
              {players.map((player) => (
                <SelectItem key={player.id} value={player.id}>
                  {player.name} ({player.position})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedPlayer !== "all" && currentPlayer ? (
            <AnalysisComparisons analyses={analyses} playerData={currentPlayer} embedded />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a player to view comparisons</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
