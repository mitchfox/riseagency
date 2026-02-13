import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users } from "lucide-react";
import { PlayerOutreachPanel } from "./PlayerOutreachPanel";

export const PlayerOutreach = ({ isAdmin }: { isAdmin: boolean }) => {
  const [activeTab, setActiveTab] = useState("youth");

  return (
    <div className="space-y-4 sm:space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
        <Users className="h-5 w-5 sm:h-6 sm:w-6" />
        Player Outreach
      </h2>

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
    </div>
  );
};
