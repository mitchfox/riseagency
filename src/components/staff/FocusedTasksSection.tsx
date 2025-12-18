import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Building2,
  Users,
  Megaphone,
  Layers,
  MessageSquare,
  Lightbulb,
  FolderOpen
} from "lucide-react";
import { ClubOutreachManagement } from "./ClubOutreachManagement";
import { QuickMessageSection } from "./QuickMessageSection";

interface FocusedTask {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const FOCUSED_TASKS: FocusedTask[] = [
  {
    id: "club-networking",
    name: "Club Networking",
    description: "Club outreach and messaging",
    icon: Building2,
    color: "bg-amber-500/10 text-amber-500"
  },
  {
    id: "player-networking",
    name: "Player Networking",
    description: "Player outreach and messaging",
    icon: Users,
    color: "bg-blue-500/10 text-blue-500"
  },
  {
    id: "content-creation",
    name: "Content Creation",
    description: "Ideas and resources",
    icon: Megaphone,
    color: "bg-purple-500/10 text-purple-500"
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
    <div className="space-y-6">
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Focused Tasks</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Quick access to related sections for common workflows
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTask} onValueChange={setActiveTask} className="w-full">
            <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/30 p-1">
              {FOCUSED_TASKS.map((task) => {
                const Icon = task.icon;
                return (
                  <TabsTrigger
                    key={task.id}
                    value={task.id}
                    className="flex-1 min-w-[120px] gap-1.5 text-xs py-2 data-[state=active]:bg-background"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{task.name}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* Club Networking Tab */}
            <TabsContent value="club-networking" className="mt-4 space-y-4">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Club Networking</h3>
                  <p className="text-sm text-muted-foreground">Club outreach and messaging</p>
                </div>
                <div className="flex flex-col gap-2 text-sm">
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
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                  <Users className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Player Networking</h3>
                  <p className="text-sm text-muted-foreground">Player outreach and messaging</p>
                </div>
                <div className="flex flex-col gap-2 text-sm">
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
              </div>

              {playerNetworkingVisible.playerOutreach && (
                <div className="border border-border/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4 text-blue-500" />
                    <h4 className="font-medium text-sm">Player Outreach</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">Player outreach component will be displayed here</p>
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
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Content Creation</h3>
                  <p className="text-sm text-muted-foreground">Ideas and resources</p>
                </div>
                <div className="flex flex-col gap-2 text-sm">
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
              </div>

              {contentCreationVisible.ideas && (
                <div className="border border-border/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="h-4 w-4 text-purple-500" />
                    <h4 className="font-medium text-sm">Ideas</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">Marketing ideas component will be displayed here</p>
                </div>
              )}

              {contentCreationVisible.resources && (
                <div className="border border-border/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FolderOpen className="h-4 w-4 text-purple-500" />
                    <h4 className="font-medium text-sm">Resources</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">Marketing resources component will be displayed here</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};