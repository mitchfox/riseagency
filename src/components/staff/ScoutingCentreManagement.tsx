import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ClipboardList } from "lucide-react";
import { ScoutingCentre } from "./ScoutingCentre";

export const ScoutingCentreManagement = ({ isAdmin }: { isAdmin: boolean }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Scouting Centre</h2>
          <p className="text-muted-foreground mt-1">
            Create detailed scouting reports and add promising players to your prospect board
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <ClipboardList className="h-4 w-4 mr-2" />
          Open Scouting Centre
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-card rounded-lg p-6 border">
          <h3 className="font-semibold mb-2">Create Reports</h3>
          <p className="text-sm text-muted-foreground">
            Document detailed scouting observations with ratings, strengths, weaknesses, and recommendations
          </p>
        </div>
        <div className="bg-card rounded-lg p-6 border">
          <h3 className="font-semibold mb-2">Track Progress</h3>
          <p className="text-sm text-muted-foreground">
            Monitor player status from initial scouting through to prospect board addition
          </p>
        </div>
        <div className="bg-card rounded-lg p-6 border">
          <h3 className="font-semibold mb-2">Add to Prospects</h3>
          <p className="text-sm text-muted-foreground">
            Convert promising scouting reports directly into tracked prospects with one click
          </p>
        </div>
      </div>

      <ScoutingCentre open={open} onOpenChange={setOpen} />
    </div>
  );
};