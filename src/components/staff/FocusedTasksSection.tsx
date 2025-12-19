import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2,
  Users,
  Megaphone,
  MessageSquare,
  Lightbulb,
  FolderOpen
} from "lucide-react";
import { ClubOutreachManagement } from "./ClubOutreachManagement";
import { QuickMessageSection } from "./QuickMessageSection";
import { PlayerOutreach } from "./PlayerOutreach";
import { MarketingIdeas } from "./marketing/MarketingIdeas";
import { MarketingResources } from "./marketing/MarketingResources";

interface FocusedTask {
  id: string;
  name: string;
  icon: React.ElementType;
}

const FOCUSED_TASKS: FocusedTask[] = [
  { id: "club-networking", name: "Club", icon: Building2 },
  { id: "player-networking", name: "Player", icon: Users },
  { id: "content-creation", name: "Content", icon: Megaphone }
];

export const FocusedTasksSection = () => {
  const [activeTask, setActiveTask] = useState(FOCUSED_TASKS[0].id);
  const [clubSubTab, setClubSubTab] = useState("outreach");
  const [playerSubTab, setPlayerSubTab] = useState("outreach");
  const [contentSubTab, setContentSubTab] = useState("ideas");

  return (
    <Tabs value={activeTask} onValueChange={setActiveTask} className="w-full">
      <TabsList className="h-8 gap-0.5 bg-muted/30 p-0.5 w-auto">
        {FOCUSED_TASKS.map((task) => {
          const Icon = task.icon;
          return (
            <TabsTrigger
              key={task.id}
              value={task.id}
              className="gap-1 text-xs py-1 px-2.5 h-7"
            >
              <Icon className="h-3 w-3" />
              <span>{task.name}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {/* Club Networking Tab */}
      <TabsContent value="club-networking" className="mt-3 space-y-3">
        <Tabs value={clubSubTab} onValueChange={setClubSubTab}>
          <TabsList className="h-7 bg-muted/20 p-0.5">
            <TabsTrigger value="outreach" className="text-xs h-6 px-2 gap-1">
              <Building2 className="h-3 w-3" />
              Outreach
            </TabsTrigger>
            <TabsTrigger value="messages" className="text-xs h-6 px-2 gap-1">
              <MessageSquare className="h-3 w-3" />
              Templates
            </TabsTrigger>
          </TabsList>
          <TabsContent value="outreach" className="mt-2">
            <ClubOutreachManagement />
          </TabsContent>
          <TabsContent value="messages" className="mt-2">
            <QuickMessageSection />
          </TabsContent>
        </Tabs>
      </TabsContent>

      {/* Player Networking Tab */}
      <TabsContent value="player-networking" className="mt-3 space-y-3">
        <Tabs value={playerSubTab} onValueChange={setPlayerSubTab}>
          <TabsList className="h-7 bg-muted/20 p-0.5">
            <TabsTrigger value="outreach" className="text-xs h-6 px-2 gap-1">
              <Users className="h-3 w-3" />
              Outreach
            </TabsTrigger>
            <TabsTrigger value="messages" className="text-xs h-6 px-2 gap-1">
              <MessageSquare className="h-3 w-3" />
              Templates
            </TabsTrigger>
          </TabsList>
          <TabsContent value="outreach" className="mt-2">
            <PlayerOutreach isAdmin={true} />
          </TabsContent>
          <TabsContent value="messages" className="mt-2">
            <QuickMessageSection />
          </TabsContent>
        </Tabs>
      </TabsContent>

      {/* Content Creation Tab */}
      <TabsContent value="content-creation" className="mt-3 space-y-3">
        <Tabs value={contentSubTab} onValueChange={setContentSubTab}>
          <TabsList className="h-7 bg-muted/20 p-0.5">
            <TabsTrigger value="ideas" className="text-xs h-6 px-2 gap-1">
              <Lightbulb className="h-3 w-3" />
              Ideas
            </TabsTrigger>
            <TabsTrigger value="resources" className="text-xs h-6 px-2 gap-1">
              <FolderOpen className="h-3 w-3" />
              Resources
            </TabsTrigger>
          </TabsList>
          <TabsContent value="ideas" className="mt-2">
            <MarketingIdeas />
          </TabsContent>
          <TabsContent value="resources" className="mt-2">
            <MarketingResources />
          </TabsContent>
        </Tabs>
      </TabsContent>
    </Tabs>
  );
};
