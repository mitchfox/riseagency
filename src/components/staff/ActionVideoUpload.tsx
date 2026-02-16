import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Video, Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ActionVideoUploadProps {
  actionId: string;
  currentVideoUrl: string | null;
  onVideoUploaded: (videoUrl: string | null) => void;
  disabled?: boolean;
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
}: ActionVideoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    // No file size limit - large videos are supported

    setUploading(true);
    setStatus('Uploading...');
    
    try {
      // Upload the original video directly (UI muting handles audio)
      const extension = file.name.split('.').pop() || 'mp4';
      const fileName = `action-clips/${actionId}-${Date.now()}.${extension}`;
      
      const { error: uploadError } = await supabase.storage
        .from('analysis-files')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('analysis-files')
        .getPublicUrl(fileName);

      // Update the action in database
      const { data: updateData, error: updateError } = await supabase
        .from('performance_report_actions')
        .update({ video_url: publicUrl })
        .eq('id', actionId)
        .select();

      if (updateError) throw updateError;
      
      // Verify the update actually affected a row
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

  return (
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
          <a
            href={currentVideoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary flex items-center gap-1 hover:underline cursor-pointer"
          >
            <Video className="h-3 w-3" />
            Clip
          </a>
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
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => fileInputRef.current?.click()}
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
      )}
    </div>
  );
};
