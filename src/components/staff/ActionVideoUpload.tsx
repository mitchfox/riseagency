import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Video, Upload, X, Loader2, Film, Play } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LinkedClip {
  id: string;
  label: string;
  start: number;
  end: number;
  action_type: string;
  action_description: string;
  action_score: string;
  notes: string;
  video_url: string;
  video_title: string;
  hasNotes: boolean;
}

interface ActionVideoUploadProps {
  actionId: string;
  currentVideoUrl: string | null;
  onVideoUploaded: (videoUrl: string | null) => void;
  disabled?: boolean;
  /** The analysis_id (player_analysis) this action belongs to, used to find linked clips */
  analysisId?: string;
}

// NOTE: Audio stripping via Canvas re-encoding was removed because it caused:
// 1. Significant quality degradation (re-encoding at lower bitrate)
// 2. Frame rate issues and visual lag
// 3. Longer upload times due to processing
// 
// Instead, we now upload the original video and rely on UI-level muting
// (muted attribute, no controls) to prevent audio playback. This maintains
// original video quality while still preventing users from hearing audio.

export const ActionVideoUpload = ({
  actionId,
  currentVideoUrl,
  onVideoUploaded,
  disabled = false,
  analysisId,
}: ActionVideoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showClipPicker, setShowClipPicker] = useState(false);
  const [linkedClips, setLinkedClips] = useState<LinkedClip[]>([]);
  const [loadingClips, setLoadingClips] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchLinkedClips = async () => {
    if (!analysisId) return;
    setLoadingClips(true);
    try {
      // Get linked video analysis IDs from the player_analysis record
      const { data: report } = await supabase
        .from("player_analysis")
        .select("linked_video_analysis_ids")
        .eq("id", analysisId)
        .single();

      const linkedIds = (report?.linked_video_analysis_ids || []) as string[];
      if (linkedIds.length === 0) {
        setLinkedClips([]);
        setLoadingClips(false);
        return;
      }

      // Fetch the video analyses
      const { data: analyses } = await supabase
        .from("video_analyses")
        .select("id, title, video_url, clips")
        .in("id", linkedIds);

      if (analyses) {
        const allClips: LinkedClip[] = [];
        for (const va of analyses) {
          const clips = (va.clips as any as Array<any>) || [];
          for (const clip of clips) {
            allClips.push({
              id: clip.id,
              label: clip.label || clip.action_description || 'Clip',
              start: clip.start,
              end: clip.end,
              action_type: clip.action_type || '',
              action_description: clip.action_description || '',
              action_score: clip.action_score || '',
              notes: clip.notes || '',
              video_url: va.video_url,
              video_title: va.title,
              hasNotes: !!(clip.notes && clip.notes.trim()),
            });
          }
        }
        // Sort: clips with notes first
        allClips.sort((a, b) => (b.hasNotes ? 1 : 0) - (a.hasNotes ? 1 : 0));
        setLinkedClips(allClips);
      }
    } catch (err) {
      console.error('Error fetching linked clips:', err);
    }
    setLoadingClips(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    setUploading(true);
    setStatus('Uploading...');
    
    try {
      const extension = file.name.split('.').pop() || 'mp4';
      const fileName = `action-clips/${actionId}-${Date.now()}.${extension}`;
      
      const { error: uploadError } = await supabase.storage
        .from('analysis-files')
        .upload(fileName, file, {
          cacheControl: '31536000',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('analysis-files')
        .getPublicUrl(fileName);

      const { data: updateData, error: updateError } = await supabase
        .from('performance_report_actions')
        .update({ video_url: publicUrl })
        .eq('id', actionId)
        .select();

      if (updateError) throw updateError;
      
      if (!updateData || updateData.length === 0) {
        console.error('No action found with id:', actionId);
        toast.error('Failed to save clip - action not found. Please save the report first.');
        return;
      }

      onVideoUploaded(publicUrl);
      toast.success('Video clip uploaded');
    } catch (error: any) {
      console.error('Error uploading video:', error);
      toast.error('Failed to upload video');
    } finally {
      setUploading(false);
      setStatus('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSelectLinkedClip = async (clip: LinkedClip) => {
    // Use media fragment URL to reference just this clip segment
    const clipUrl = `${clip.video_url}#t=${clip.start},${clip.end}`;
    
    try {
      const { error } = await supabase
        .from('performance_report_actions')
        .update({ video_url: clipUrl })
        .eq('id', actionId);

      if (error) throw error;

      onVideoUploaded(clipUrl);
      toast.success('Clip attached from video analysis');
      setShowClipPicker(false);
    } catch (error: any) {
      console.error('Error attaching clip:', error);
      toast.error('Failed to attach clip');
    }
  };

  const handleRemoveVideo = async () => {
    setUploading(true);
    try {
      const { error } = await supabase
        .from('performance_report_actions')
        .update({ video_url: null })
        .eq('id', actionId);

      if (error) throw error;

      onVideoUploaded(null);
      toast.success('Video removed');
    } catch (error: any) {
      console.error('Error removing video:', error);
      toast.error('Failed to remove video');
    } finally {
      setUploading(false);
    }
  };

  const fmtTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />
      
      {currentVideoUrl ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="text-xs text-primary flex items-center gap-1 hover:underline cursor-pointer"
          >
            <Video className="h-3 w-3" />
            Clip
          </button>
          {!disabled && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              onClick={handleRemoveVideo}
              disabled={uploading}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ) : (
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={disabled || uploading}
            >
              {uploading ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-[10px]">{status}</span>
                </span>
              ) : (
                <>
                  <Upload className="h-3 w-3 mr-1" />
                  Clip
                </>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-1" align="start">
            <button
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-accent transition-colors text-left"
              onClick={() => {
                setMenuOpen(false);
                fileInputRef.current?.click();
              }}
            >
              <Upload className="h-3 w-3" />
              Upload
            </button>
            <button
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-accent transition-colors text-left"
              onClick={() => {
                setMenuOpen(false);
                fetchLinkedClips();
                setShowClipPicker(true);
              }}
            >
              <Film className="h-3 w-3" />
              Clip
            </button>
          </PopoverContent>
        </Popover>
      )}
    </div>

    {/* Video Preview Dialog */}
    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
      <DialogContent className="max-w-4xl w-full p-2">
        <video
          src={currentVideoUrl || ''}
          controls
          autoPlay
          muted
          className="w-full rounded-lg"
        />
      </DialogContent>
    </Dialog>

    {/* Linked Clips Picker Dialog */}
    <Dialog open={showClipPicker} onOpenChange={setShowClipPicker}>
      <DialogContent className="max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle>Select from Linked Clips</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {loadingClips ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : linkedClips.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Film className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No linked clips available.</p>
              <p className="text-xs mt-1">Link clips from Video Analysis first using "Link Clips" on the export dialog.</p>
            </div>
          ) : (
            linkedClips.map(clip => (
              <button
                key={clip.id}
                onClick={() => handleSelectLinkedClip(clip)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors text-left"
              >
                <Play className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{clip.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtTime(clip.start)} → {fmtTime(clip.end)}
                    {clip.action_type && <span className="ml-2 capitalize">{clip.action_type}</span>}
                    <span className="ml-2 opacity-60">from {clip.video_title}</span>
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};
