import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Users, Search, Star } from "lucide-react";
import { PlayerOutreachPanel } from "./PlayerOutreachPanel";
import { TransfermarktScraper } from "./TransfermarktScraper";
import { TransfermarktShortlist } from "./TransfermarktShortlist";

export const PlayerOutreach = ({ isAdmin }: { isAdmin: boolean }) => {
  const [activeTab, setActiveTab] = useState("youth");
  const [scraperVisible, setScraperVisible] = useState(false);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5 sm:h-6 sm:w-6" />
          Player Outreach
        </h2>
        {!scraperVisible && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScraperVisible(true)}
            className="shrink-0"
          >
            <Search className="h-4 w-4 mr-2" />
            Transfermarkt Scraper
          </Button>
        )}
      </div>

      <TransfermarktScraper visible={scraperVisible} onClose={() => setScraperVisible(false)} />

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
          <PlayerOutreachPanel type="youth" />
        </TabsContent>

        <TabsContent value="pro" className="mt-4">
          <PlayerOutreachPanel type="pro" />
        </TabsContent>

        <TabsContent value="shortlist" className="mt-4">
          <TransfermarktShortlist />
        </TabsContent>
      </Tabs>
    </div>
  );
};
