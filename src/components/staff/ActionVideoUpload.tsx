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

export const ActionVideoUpload = ({
  actionId,
  currentVideoUrl,
  onVideoUploaded,
  disabled = false,
}: ActionVideoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    // Validate file size (100MB max)
    if (file.size > 100 * 1024 * 1024) {
      toast.error('Video must be under 100MB');
      return;
    }

    setUploading(true);
    try {
      const fileName = `action-clips/${actionId}-${Date.now()}.${file.name.split('.').pop()}`;
      
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
      const { error: updateError } = await supabase
        .from('performance_report_actions')
        .update({ video_url: publicUrl })
        .eq('id', actionId);

      if (updateError) throw updateError;

      onVideoUploaded(publicUrl);
      toast.success('Video clip uploaded');
    } catch (error: any) {
      console.error('Error uploading video:', error);
      toast.error('Failed to upload video');
    } finally {
      setUploading(false);
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
          <span className="text-xs text-green-600 flex items-center gap-1">
            <Video className="h-3 w-3" />
            Clip
          </span>
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
            <Loader2 className="h-3 w-3 animate-spin" />
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
