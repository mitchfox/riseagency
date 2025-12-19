import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
  Building2,
  Users,
  Megaphone,
  MessageSquare,
  Lightbulb,
  FolderOpen,
  Menu
} from "lucide-react";
import { ClubOutreachManagement } from "./ClubOutreachManagement";
import { QuickMessageSection } from "./QuickMessageSection";
import { PlayerOutreach } from "./PlayerOutreach";
import { MarketingIdeas } from "./marketing/MarketingIdeas";
import { MarketingResources } from "./marketing/MarketingResources";

type TaskType = "club-networking" | "player-networking" | "content-creation";

const TASK_CONFIG = {
  "club-networking": { name: "Club Networking", icon: Building2 },
  "player-networking": { name: "Player Networking", icon: Users },
  "content-creation": { name: "Content Creation", icon: Megaphone }
};

export const FocusedTasksSection = () => {
  const [activeTask, setActiveTask] = useState<TaskType>("club-networking");
  const [clubSubTab, setClubSubTab] = useState("outreach");
  const [playerSubTab, setPlayerSubTab] = useState("outreach");
  const [contentSubTab, setContentSubTab] = useState("ideas");

  const ActiveIcon = TASK_CONFIG[activeTask].icon;

  return (
    <div className="w-full">
      {/* Header with dropdown */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ActiveIcon className="h-4 w-4" />
          <span>{TASK_CONFIG[activeTask].name}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Menu className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            {(Object.keys(TASK_CONFIG) as TaskType[]).map((taskId) => {
              const Icon = TASK_CONFIG[taskId].icon;
              return (
                <DropdownMenuItem
                  key={taskId}
                  onClick={() => setActiveTask(taskId)}
                  className={activeTask === taskId ? "bg-accent" : ""}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {TASK_CONFIG[taskId].name}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Club Networking */}
      {activeTask === "club-networking" && (
        <Tabs value={clubSubTab} onValueChange={setClubSubTab} className="w-full">
          <TabsList className="w-full h-10 p-1 grid grid-cols-2">
            <TabsTrigger value="outreach" className="gap-2">
              <Building2 className="h-4 w-4" />
              Outreach
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Templates
            </TabsTrigger>
          </TabsList>
          <TabsContent value="outreach" className="mt-3">
            <ClubOutreachManagement />
          </TabsContent>
          <TabsContent value="messages" className="mt-3">
            <QuickMessageSection />
          </TabsContent>
        </Tabs>
      )}

      {/* Player Networking */}
      {activeTask === "player-networking" && (
        <Tabs value={playerSubTab} onValueChange={setPlayerSubTab} className="w-full">
          <TabsList className="w-full h-10 p-1 grid grid-cols-2">
            <TabsTrigger value="outreach" className="gap-2">
              <Users className="h-4 w-4" />
              Outreach
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Templates
            </TabsTrigger>
          </TabsList>
          <TabsContent value="outreach" className="mt-3">
            <PlayerOutreach isAdmin={true} />
          </TabsContent>
          <TabsContent value="messages" className="mt-3">
            <QuickMessageSection />
          </TabsContent>
        </Tabs>
      )}

      {/* Content Creation */}
      {activeTask === "content-creation" && (
        <Tabs value={contentSubTab} onValueChange={setContentSubTab} className="w-full">
          <TabsList className="w-full h-10 p-1 grid grid-cols-2">
            <TabsTrigger value="ideas" className="gap-2">
              <Lightbulb className="h-4 w-4" />
              Ideas
            </TabsTrigger>
            <TabsTrigger value="resources" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              Resources
            </TabsTrigger>
          </TabsList>
          <TabsContent value="ideas" className="mt-3">
            <MarketingIdeas />
          </TabsContent>
          <TabsContent value="resources" className="mt-3">
            <MarketingResources />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
