import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface ActionVideoPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl: string;
  actionTitle?: string;
}

export const ActionVideoPopup = ({
  open,
  onOpenChange,
  videoUrl,
  actionTitle,
}: ActionVideoPopupProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black">
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
          {actionTitle && (
            <div className="absolute top-2 left-2 z-10 bg-black/50 text-white text-sm px-3 py-1 rounded">
              {actionTitle}
            </div>
          )}
          <video
            src={videoUrl}
            className="w-full max-h-[80vh] object-contain"
            controls
            autoPlay
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
