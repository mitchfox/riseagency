import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Users, MessageSquare } from "lucide-react";

export const RecruitmentManagement = () => {
  const [activeTab, setActiveTab] = useState("prospects");

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="prospects">
            <Users className="w-4 h-4 mr-2" />
            Prospect Board
          </TabsTrigger>
          <TabsTrigger value="templates">
            <MessageSquare className="w-4 h-4 mr-2" />
            Message Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prospects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Prospect Board</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No prospects added yet</p>
                <p className="text-sm mb-4">Track potential players and their recruitment status</p>
                <Button>Add Prospect</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Message Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No message templates created yet</p>
                <p className="text-sm mb-4">Create reusable templates for prospect outreach</p>
                <Button>Create Template</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
