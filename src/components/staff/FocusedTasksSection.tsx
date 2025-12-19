import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  {
    id: "club-networking",
    name: "Club Networking",
    icon: Building2,
  },
  {
    id: "player-networking",
    name: "Player Networking",
    icon: Users,
  },
  {
    id: "content-creation",
    name: "Content Creation",
    icon: Megaphone,
  }
];

export const FocusedTasksSection = () => {
  const [activeTask, setActiveTask] = useState(FOCUSED_TASKS[0].id);
  
  // Visibility toggles for sections
  const [clubNetworkingVisible, setClubNetworkingVisible] = useState({
    clubOutreach: true,
    messageTemplates: true
  });
  
  const [playerNetworkingVisible, setPlayerNetworkingVisible] = useState({
    playerOutreach: true,
    messageTemplates: true
  });
  
  const [contentCreationVisible, setContentCreationVisible] = useState({
    ideas: true,
    resources: true
  });

  return (
    <Tabs value={activeTask} onValueChange={setActiveTask} className="w-full">
      <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/30 p-1">
        {FOCUSED_TASKS.map((task) => {
          const Icon = task.icon;
          return (
            <TabsTrigger
              key={task.id}
              value={task.id}
              className="flex-1 min-w-[120px] gap-1.5 text-xs py-2"
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{task.name}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {/* Club Networking Tab */}
      <TabsContent value="club-networking" className="mt-4 space-y-4">
        <div className="flex items-center justify-end gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Switch 
              id="club-outreach-toggle"
              checked={clubNetworkingVisible.clubOutreach}
              onCheckedChange={(checked) => setClubNetworkingVisible(prev => ({ ...prev, clubOutreach: checked }))}
            />
            <Label htmlFor="club-outreach-toggle" className="text-xs">Club Outreach</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch 
              id="club-messages-toggle"
              checked={clubNetworkingVisible.messageTemplates}
              onCheckedChange={(checked) => setClubNetworkingVisible(prev => ({ ...prev, messageTemplates: checked }))}
            />
            <Label htmlFor="club-messages-toggle" className="text-xs">Message Templates</Label>
          </div>
        </div>

        {clubNetworkingVisible.clubOutreach && (
          <div className="border border-border/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-4 w-4 text-amber-500" />
              <h4 className="font-medium text-sm">Club Outreach</h4>
            </div>
            <ClubOutreachManagement />
          </div>
        )}

        {clubNetworkingVisible.messageTemplates && (
          <div className="border border-border/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="h-4 w-4 text-amber-500" />
              <h4 className="font-medium text-sm">Message Templates</h4>
            </div>
            <QuickMessageSection />
          </div>
        )}
      </TabsContent>

      {/* Player Networking Tab */}
      <TabsContent value="player-networking" className="mt-4 space-y-4">
        <div className="flex items-center justify-end gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Switch 
              id="player-outreach-toggle"
              checked={playerNetworkingVisible.playerOutreach}
              onCheckedChange={(checked) => setPlayerNetworkingVisible(prev => ({ ...prev, playerOutreach: checked }))}
            />
            <Label htmlFor="player-outreach-toggle" className="text-xs">Player Outreach</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch 
              id="player-messages-toggle"
              checked={playerNetworkingVisible.messageTemplates}
              onCheckedChange={(checked) => setPlayerNetworkingVisible(prev => ({ ...prev, messageTemplates: checked }))}
            />
            <Label htmlFor="player-messages-toggle" className="text-xs">Message Templates</Label>
          </div>
        </div>

        {playerNetworkingVisible.playerOutreach && (
          <div className="border border-border/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-blue-500" />
              <h4 className="font-medium text-sm">Player Outreach</h4>
            </div>
            <PlayerOutreach isAdmin={true} />
          </div>
        )}

        {playerNetworkingVisible.messageTemplates && (
          <div className="border border-border/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <h4 className="font-medium text-sm">Message Templates</h4>
            </div>
            <QuickMessageSection />
          </div>
        )}
      </TabsContent>

      {/* Content Creation Tab */}
      <TabsContent value="content-creation" className="mt-4 space-y-4">
        <div className="flex items-center justify-end gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Switch 
              id="ideas-toggle"
              checked={contentCreationVisible.ideas}
              onCheckedChange={(checked) => setContentCreationVisible(prev => ({ ...prev, ideas: checked }))}
            />
            <Label htmlFor="ideas-toggle" className="text-xs">Ideas</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch 
              id="resources-toggle"
              checked={contentCreationVisible.resources}
              onCheckedChange={(checked) => setContentCreationVisible(prev => ({ ...prev, resources: checked }))}
            />
            <Label htmlFor="resources-toggle" className="text-xs">Resources</Label>
          </div>
        </div>

        {contentCreationVisible.ideas && (
          <div className="border border-border/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-purple-500" />
              <h4 className="font-medium text-sm">Marketing Ideas</h4>
            </div>
            <MarketingIdeas />
          </div>
        )}

        {contentCreationVisible.resources && (
          <div className="border border-border/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <FolderOpen className="h-4 w-4 text-purple-500" />
              <h4 className="font-medium text-sm">Resources</h4>
            </div>
            <MarketingResources />
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};
