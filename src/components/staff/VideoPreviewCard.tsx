import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';

interface VideoPreviewCardProps {
  videoUrl: string;
  videoTitle: string;
  onImport: () => void;
  isImporting: boolean;
}

export const VideoPreviewCard = ({ videoUrl, videoTitle, onImport, isImporting }: VideoPreviewCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video bg-muted group">
        {!isPlaying ? (
          <>
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10">
              <button
                onClick={() => setIsPlaying(true)}
                className="w-16 h-16 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-all group-hover:scale-110"
              >
                <Play className="w-8 h-8 text-black ml-1" fill="black" />
              </button>
            </div>
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Play className="w-12 h-12 opacity-20" />
            </div>
          </>
        ) : (
          <video
            src={videoUrl}
            className="w-full h-full object-cover"
            controls
            autoPlay
          />
        )}
      </div>
      <CardContent className="p-3">
        <p className="text-sm font-medium mb-2">{videoTitle}</p>
        <Button
          size="sm"
          className="w-full"
          onClick={onImport}
          disabled={isImporting}
        >
          {isImporting ? 'Importing...' : 'Import to Gallery'}
        </Button>
      </CardContent>
    </Card>
  );
};
