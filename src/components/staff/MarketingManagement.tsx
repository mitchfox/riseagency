import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, Image, Table, Folder, HardDrive, ExternalLink } from "lucide-react";

const marketingLinks = [
  {
    title: "Post Templates",
    description: "Content templates and planning",
    icon: FileText,
    url: "https://flaxen-voice-e64.notion.site/1c248d32b9a181c9aab5c06bace0237b?v=1c248d32b9a18158b8fc000c0a4166b0",
    color: "text-blue-500"
  },
  {
    title: "Canva Design",
    description: "Design templates and assets",
    icon: Image,
    url: "https://www.canva.com/design/DAG0N9vOwtg/6ZmTuSDkJzR9_b0nl7czJA/edit?utm_content=DAG0N9vOwtg&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton",
    color: "text-purple-500"
  },
  {
    title: "Player Images",
    description: "Player photo templates",
    icon: Image,
    url: "https://www.canva.com/design/DAG0Fs-P2oY/xnS87xfydD4uus5vACSKgA/edit",
    color: "text-green-500"
  },
  {
    title: "Topic Schedule",
    description: "Content calendar and planning",
    icon: Table,
    url: "https://docs.google.com/spreadsheets/d/1UtMiSeVkxDCP0b6DJmuB72dKHTUHAfyInUB_Ts2iRcc/edit?usp=sharing",
    color: "text-orange-500"
  },
  {
    title: "Canva Folder",
    description: "Templates and published posts",
    icon: Folder,
    url: "https://www.canva.com/folder/FAFRi-Qvnf4",
    color: "text-pink-500"
  },
  {
    title: "Google Drive",
    description: "Shared marketing resources",
    icon: HardDrive,
    url: "https://drive.google.com/drive/folders/1fCfrG6bY8YuEjm7bVMaxIGEoXOyCBLMj?usp=sharing",
    color: "text-indigo-500"
  }
];

export const MarketingManagement = ({ isAdmin }: { isAdmin: boolean }) => {
  const [activeTab, setActiveTab] = useState("resources");

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="resources">
            <Folder className="w-4 h-4 mr-2" />
            Resources
          </TabsTrigger>
          <TabsTrigger value="planner">
            <Calendar className="w-4 h-4 mr-2" />
            Planner
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Marketing Resources</CardTitle>
              <CardDescription>Quick access to all marketing tools and templates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {marketingLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <a
                      key={link.title}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group"
                    >
                      <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-lg bg-muted ${link.color}`}>
                              <Icon className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                                  {link.title}
                                </h3>
                                <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {link.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </a>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planner" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Marketing Planner</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No campaigns planned yet</p>
                <p className="text-sm mb-4">Plan and schedule your marketing campaigns</p>
                <Button>Create Campaign</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
