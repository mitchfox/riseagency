import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, X } from "lucide-react";
import { PersonalScheduleCalendar } from "./PersonalScheduleCalendar";

interface PersonalScheduleFullscreenProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PersonalScheduleFullscreen = ({ open, onOpenChange }: PersonalScheduleFullscreenProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              My Schedule
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          <PersonalScheduleCalendar 
            isFullscreen={true} 
            showFullscreenButton={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
