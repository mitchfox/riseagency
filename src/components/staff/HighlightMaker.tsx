import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Film, 
  Download, 
  Play, 
  Trash2, 
  GripVertical,
  ArrowRight,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { canvasVideoProcessor, TransitionType, ClipWithTransition, ProcessingProgress } from '@/lib/canvasVideoProcessor';

interface Player {
  id: string;
  name: string;
  email: string | null;
}

interface PlaylistClip {
  id?: string;
  name: string;
  videoUrl: string;
}

interface Playlist {
  id: string;
  name: string;
  player_id: string;
  clips: PlaylistClip[];
}

interface HighlightMakerProps {
  isAdmin: boolean;
}

const TRANSITION_OPTIONS: { value: TransitionType; label: string }[] = [
  { value: 'none', label: 'No Transition' },
  { value: 'fade', label: 'Fade' },
  { value: 'fadeblack', label: 'Fade to Black' },
  { value: 'fadewhite', label: 'Fade to White' },
  { value: 'slideleft', label: 'Slide Left' },
  { value: 'slideright', label: 'Slide Right' },
  { value: 'wipeleft', label: 'Wipe Left' },
  { value: 'wiperight', label: 'Wipe Right' },
];

export const HighlightMaker = ({ isAdmin }: HighlightMakerProps) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('');
  const [clips, setClips] = useState<ClipWithTransition[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const [previewClipIndex, setPreviewClipIndex] = useState<number | null>(null);

  // Fetch all players
  useEffect(() => {
    const fetchPlayers = async () => {
      const { data, error } = await supabase
        .from('players')
        .select('id, name, email')
        .order('name');
      
      if (error) {
        console.error('Error fetching players:', error);
        return;
      }
      setPlayers(data || []);
    };
    fetchPlayers();
  }, []);

  // Fetch playlists when player changes
  useEffect(() => {
    if (!selectedPlayerId) {
      setPlaylists([]);
      return;
    }

    const fetchPlaylists = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('player_id', selectedPlayerId)
        .order('name');
      
      if (error) {
        console.error('Error fetching playlists:', error);
        toast.error('Failed to fetch playlists');
      } else {
        const parsedPlaylists: Playlist[] = (data || []).map(p => ({
          id: p.id,
          name: p.name,
          player_id: p.player_id,
          clips: (Array.isArray(p.clips) ? p.clips : []) as unknown as PlaylistClip[]
        }));
        setPlaylists(parsedPlaylists);
      }
      setLoading(false);
    };
    fetchPlaylists();
  }, [selectedPlayerId]);

  // Load clips when playlist changes
  useEffect(() => {
    if (!selectedPlaylistId) {
      setClips([]);
      return;
    }

    const playlist = playlists.find(p => p.id === selectedPlaylistId);
    if (playlist) {
      const clipsWithTransitions: ClipWithTransition[] = playlist.clips.map((clip, index) => ({
        videoUrl: clip.videoUrl,
        name: clip.name,
        order: index,
        transition: {
          type: 'fade' as TransitionType,
          duration: 0.5
        }
      }));
      setClips(clipsWithTransitions);
    }
  }, [selectedPlaylistId, playlists]);

  const handleTransitionChange = (index: number, type: TransitionType) => {
    setClips(prev => prev.map((clip, i) => 
      i === index ? { ...clip, transition: { ...clip.transition, type } } : clip
    ));
  };

  const handleDurationChange = (index: number, duration: number) => {
    setClips(prev => prev.map((clip, i) => 
      i === index ? { ...clip, transition: { ...clip.transition, duration } } : clip
    ));
  };

  const handleRemoveClip = (index: number) => {
    setClips(prev => prev.filter((_, i) => i !== index).map((clip, i) => ({ ...clip, order: i })));
  };

  const handleMoveClip = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= clips.length) return;
    
    const newClips = [...clips];
    const [movedClip] = newClips.splice(fromIndex, 1);
    newClips.splice(toIndex, 0, movedClip);
    
    setClips(newClips.map((clip, i) => ({ ...clip, order: i })));
  };

  const handleExportWithTransitions = async () => {
    if (clips.length === 0) {
      toast.error('No clips to export');
      return;
    }

    setProcessing(true);
    setProgress({ stage: 'loading', progress: 0, message: 'Initializing...' });

    try {
      const blob = await canvasVideoProcessor.processWithTransitions(clips, (p) => setProgress(p));
      
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `highlight_${selectedPlayerId}_${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast.success('Highlight video downloaded!');
      }
    } catch (error) {
      console.error('Export error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to export video';
      toast.error(errorMessage, { duration: 8000 });
    } finally {
      setProcessing(false);
      setProgress(null);
    }
  };

  const selectedPlayer = players.find(p => p.id === selectedPlayerId);
  const selectedPlaylist = playlists.find(p => p.id === selectedPlaylistId);

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Film className="h-5 w-5 md:h-6 md:w-6" />
          Highlight Maker
        </h2>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          Create highlight reels from player playlists with transitions
        </p>
      </div>

      {/* Player and Playlist Selection */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-base md:text-lg">Select Source</CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0 space-y-4">
          <div className="grid grid-cols-1 gap-3 md:gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Player</Label>
              <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a player" />
                </SelectTrigger>
                <SelectContent>
                  {players.map(player => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Playlist</Label>
              <Select 
                value={selectedPlaylistId} 
                onValueChange={setSelectedPlaylistId}
                disabled={!selectedPlayerId || playlists.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Loading..." : "Select a playlist"} />
                </SelectTrigger>
                <SelectContent>
                  {playlists.map(playlist => (
                    <SelectItem key={playlist.id} value={playlist.id}>
                      {playlist.name} ({playlist.clips.length} clips)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedPlayer && selectedPlaylist && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">{selectedPlayer.name}</Badge>
              <ArrowRight className="h-4 w-4" />
              <Badge variant="outline">{selectedPlaylist.name}</Badge>
              <Badge>{clips.length} clips</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clips Timeline */}
      {clips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Clip Timeline</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const playlist = playlists.find(p => p.id === selectedPlaylistId);
                  if (playlist) {
                    const clipsWithTransitions: ClipWithTransition[] = playlist.clips.map((clip, index) => ({
                      videoUrl: clip.videoUrl,
                      name: clip.name,
                      order: index,
                      transition: { type: 'fade' as TransitionType, duration: 0.5 }
                    }));
                    setClips(clipsWithTransitions);
                  }
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {clips.map((clip, index) => (
              <div key={`${clip.videoUrl}-${index}`}>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleMoveClip(index, index - 1)}
                      disabled={index === 0}
                    >
                      <GripVertical className="h-4 w-4 rotate-90" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleMoveClip(index, index + 1)}
                      disabled={index === clips.length - 1}
                    >
                      <GripVertical className="h-4 w-4 rotate-90" />
                    </Button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{clip.name}</p>
                    <p className="text-xs text-muted-foreground">Clip {index + 1}</p>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPreviewClipIndex(previewClipIndex === index ? null : index)}
                  >
                    <Play className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveClip(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Preview */}
                {previewClipIndex === index && (
                  <div className="mt-2 aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                      src={clip.videoUrl}
                      controls
                      autoPlay
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                {/* Transition Settings (between clips) */}
                {index < clips.length - 1 && (
                  <div className="flex items-center gap-4 py-3 px-4 border-l-2 border-primary/30 ml-6 my-2">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs whitespace-nowrap">Transition:</Label>
                        <Select
                          value={clip.transition.type}
                          onValueChange={(value) => handleTransitionChange(index, value as TransitionType)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TRANSITION_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {clip.transition.type !== 'none' && (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs whitespace-nowrap">Duration:</Label>
                          <Slider
                            value={[clip.transition.duration]}
                            onValueChange={([value]) => handleDurationChange(index, value)}
                            min={0.25}
                            max={2}
                            step={0.25}
                            className="w-24"
                          />
                          <span className="text-xs text-muted-foreground w-10">
                            {clip.transition.duration}s
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Export Options */}
      {clips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {processing && progress && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>{progress.message}</span>
                  <span>{progress.progress}%</span>
                </div>
                <Progress value={progress.progress} />
              </div>
            )}

            {!processing && (
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleExportWithTransitions}
                  disabled={processing || clips.length === 0}
                  className="flex-1 min-w-[200px]"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Highlight Video
                </Button>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Note: Video processing happens in your browser. Configure transitions between clips above before exporting.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {selectedPlaylistId && clips.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              This playlist has no clips. Add clips to the playlist first.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
