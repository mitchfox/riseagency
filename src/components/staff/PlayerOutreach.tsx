import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Users, Search } from "lucide-react";
import { PlayerOutreachPanel } from "./PlayerOutreachPanel";
import { TransfermarktScraper } from "./TransfermarktScraper";

export const PlayerOutreach = ({ isAdmin }: { isAdmin: boolean }) => {
  const [activeTab, setActiveTab] = useState("youth");
  const [scraperOpen, setScraperOpen] = useState(false);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5 sm:h-6 sm:w-6" />
          Player Outreach
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setScraperOpen(true)}
          className="shrink-0"
        >
          <Search className="h-4 w-4 mr-2" />
          Transfermarkt Scraper
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 h-auto sm:h-10">
          <TabsTrigger value="youth" className="text-sm sm:text-base py-2.5">Youth (U18)</TabsTrigger>
          <TabsTrigger value="pro" className="text-sm sm:text-base py-2.5">Pro</TabsTrigger>
        </TabsList>

        <TabsContent value="youth" className="mt-4">
          <PlayerOutreachPanel type="youth" />
        </TabsContent>

        <TabsContent value="pro" className="mt-4">
          <PlayerOutreachPanel type="pro" />
        </TabsContent>
      </Tabs>

      <TransfermarktScraper open={scraperOpen} onOpenChange={setScraperOpen} />
    </div>
  );
};
