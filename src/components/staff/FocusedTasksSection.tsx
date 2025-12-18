import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  FileCheck, 
  Megaphone, 
  Target, 
  Dumbbell,
  LineChart,
  Network,
  Building2,
  Layers
} from "lucide-react";

interface FocusedTask {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  sections: string[];
  color: string;
}

const FOCUSED_TASKS: FocusedTask[] = [
  {
    id: "player-onboarding",
    name: "Player Onboarding",
    description: "Complete player setup workflow",
    icon: Users,
    sections: ["Player Management", "Invoices", "Updates"],
    color: "bg-blue-500/10 text-blue-500"
  },
  {
    id: "transfer-window",
    name: "Transfer Window",
    description: "Club outreach and negotiations",
    icon: Building2,
    sections: ["Transfer Hub", "Club Network", "Player List"],
    color: "bg-amber-500/10 text-amber-500"
  },
  {
    id: "content-creation",
    name: "Content Creation",
    description: "Marketing and media workflow",
    icon: Megaphone,
    sections: ["Marketing", "Content Creator", "Highlight Maker"],
    color: "bg-purple-500/10 text-purple-500"
  },
  {
    id: "performance-review",
    name: "Performance Review",
    description: "Analysis and coaching workflow",
    icon: LineChart,
    sections: ["Analysis Writer", "Coaching Database", "Athlete Centre"],
    color: "bg-green-500/10 text-green-500"
  },
  {
    id: "scouting-pipeline",
    name: "Scouting Pipeline",
    description: "Recruitment and scouting workflow",
    icon: Target,
    sections: ["Recruitment", "Scouting Centre", "Player Database"],
    color: "bg-orange-500/10 text-orange-500"
  }
];

export const FocusedTasksSection = () => {
  const [activeTask, setActiveTask] = useState(FOCUSED_TASKS[0].id);

  return (
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

          {FOCUSED_TASKS.map((task) => {
            const Icon = task.icon;
            return (
              <TabsContent key={task.id} value={task.id} className="mt-4">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${task.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{task.name}</h3>
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {task.sections.map((section) => (
                      <Badge
                        key={section}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/10 hover:border-primary/50 transition-colors py-1.5 px-3"
                      >
                        {section}
                      </Badge>
                    ))}
                  </div>

                  <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                    <p className="text-sm text-muted-foreground text-center">
                      Click on a section badge above to navigate, or use the sidebar to access these sections simultaneously.
                    </p>
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
};
