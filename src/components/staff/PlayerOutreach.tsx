import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Users, Search, Star, LayoutGrid, Target as TargetIcon, Table as TableIcon, Sliders } from "lucide-react";
import { PlayerOutreachPanel } from "./PlayerOutreachPanel";
import { TransfermarktScraper } from "./TransfermarktScraper";
import { TransfermarktShortlist } from "./TransfermarktShortlist";
import { OutreachPipelineBoard } from "./recruitment/OutreachPipelineBoard";
import { OutreachTargetsManager } from "./recruitment/OutreachTargetsManager";
import { ScoringSettings } from "./recruitment/ScoringSettings";

export const PlayerOutreach = ({ isAdmin }: { isAdmin: boolean }) => {
  const [activeTab, setActiveTab] = useState("youth");
  const [view, setView] = useState<"pipeline" | "table" | "targets" | "scoring">("pipeline");
  const [scraperVisible, setScraperVisible] = useState(false);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 text-center sm:text-left">
        <h2 className="text-lg sm:text-2xl font-bold flex items-center justify-center sm:justify-start gap-2">
          <Users className="h-5 w-5 sm:h-6 sm:w-6" />
          Player Outreach
        </h2>
        {!scraperVisible && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScraperVisible(true)}
            className="shrink-0 w-full sm:w-auto"
          >
            <Search className="h-4 w-4 mr-2" />
            Transfermarkt Scraper
          </Button>
        )}
      </div>

      <TransfermarktScraper visible={scraperVisible} onClose={() => setScraperVisible(false)} />

      <Tabs value={view} onValueChange={(v: any) => setView(v)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 sm:w-auto sm:inline-grid h-auto gap-1 p-1">
          <TabsTrigger value="pipeline" className="gap-1.5 text-xs sm:text-sm py-2"><LayoutGrid className="h-3.5 w-3.5" /> Pipeline</TabsTrigger>
          <TabsTrigger value="targets" className="gap-1.5 text-xs sm:text-sm py-2"><TargetIcon className="h-3.5 w-3.5" /> Targets</TabsTrigger>
          <TabsTrigger value="table" className="gap-1.5 text-xs sm:text-sm py-2"><TableIcon className="h-3.5 w-3.5" /> Table</TabsTrigger>
          <TabsTrigger value="scoring" className="gap-1.5 text-xs sm:text-sm py-2"><Sliders className="h-3.5 w-3.5" /> Scoring</TabsTrigger>
        </TabsList>
      </Tabs>

      {view === "targets" ? (
        <OutreachTargetsManager />
      ) : view === "scoring" ? (
        <ScoringSettings />
      ) : (
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 h-auto sm:h-10">
          <TabsTrigger value="youth" className="text-sm sm:text-base py-2.5">Youth (U18)</TabsTrigger>
          <TabsTrigger value="pro" className="text-sm sm:text-base py-2.5">Pro</TabsTrigger>
          <TabsTrigger value="shortlist" className="text-sm sm:text-base py-2.5">
            <Star className="h-3.5 w-3.5 mr-1.5" />
            Shortlist
          </TabsTrigger>
        </TabsList>

        <TabsContent value="youth" className="mt-4">
          {view === "pipeline" ? <OutreachPipelineBoard type="youth" /> : <PlayerOutreachPanel type="youth" />}
        </TabsContent>

        <TabsContent value="pro" className="mt-4">
          {view === "pipeline" ? <OutreachPipelineBoard type="pro" /> : <PlayerOutreachPanel type="pro" />}
        </TabsContent>

        <TabsContent value="shortlist" className="mt-4">
          <TransfermarktShortlist />
        </TabsContent>
      </Tabs>
      )}
    </div>
  );
};
