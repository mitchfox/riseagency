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

/**
 * Strips audio from a video file by re-encoding it without an audio track.
 * This ensures downloaded videos have no audio data at all.
 */
async function stripVideoAudio(videoFile: File, onProgress?: (progress: number) => void): Promise<File> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    let mediaRecorder: MediaRecorder | null = null;
    let animationId: number | null = null;

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Create a MediaStream from the canvas (video only, no audio)
      const stream = canvas.captureStream(30); // 30 fps
      
      // Determine best supported mime type
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'video/mp4';
      
      // Use MediaRecorder to encode the stream without audio
      mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 5000000, // 5 Mbps for good quality
      });
      
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const extension = mimeType.includes('webm') ? 'webm' : 'mp4';
        const blob = new Blob(chunks, { type: mimeType });
        const strippedFile = new File(
          [blob], 
          videoFile.name.replace(/\.[^.]+$/, `-silent.${extension}`), 
          { type: mimeType }
        );
        URL.revokeObjectURL(video.src);
        resolve(strippedFile);
      };
      
      mediaRecorder.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('MediaRecorder error'));
      };
      
      // Draw video frames to canvas
      const drawFrame = () => {
        if (video.ended || video.paused) {
          if (mediaRecorder?.state === 'recording') {
            mediaRecorder.stop();
          }
          if (animationId) {
            cancelAnimationFrame(animationId);
          }
          return;
        }
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Report progress
        if (onProgress && video.duration) {
          onProgress((video.currentTime / video.duration) * 100);
        }
        
        animationId = requestAnimationFrame(drawFrame);
      };
      
      video.onplay = () => {
        if (mediaRecorder) {
          mediaRecorder.start(100); // Collect data every 100ms
          drawFrame();
        }
      };
      
      video.onended = () => {
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
        if (mediaRecorder?.state === 'recording') {
          mediaRecorder.stop();
        }
      };
      
      // Increase playback speed to process faster (will still capture all frames)
      video.playbackRate = 4.0;
      
      // Start playback (muted, so no audio processed)
      video.play().catch((err) => {
        URL.revokeObjectURL(video.src);
        reject(err);
      });
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video'));
    };
    
    // Load the video file
    video.src = URL.createObjectURL(videoFile);
  });
}

export const ActionVideoUpload = ({
  actionId,
  currentVideoUrl,
  onVideoUploaded,
  disabled = false,
}: ActionVideoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
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

    // Validate file size (100MB max)
    if (file.size > 100 * 1024 * 1024) {
      toast.error('Video must be under 100MB');
      return;
    }

    setUploading(true);
    setProgress(0);
    setStatus('Removing audio...');
    
    try {
      // Strip audio from the video before uploading
      const silentVideo = await stripVideoAudio(file, (p) => setProgress(Math.round(p)));
      
      setStatus('Uploading...');
      setProgress(0);
      
      const extension = silentVideo.name.split('.').pop() || 'webm';
      const fileName = `action-clips/${actionId}-${Date.now()}-silent.${extension}`;
      
      const { error: uploadError } = await supabase.storage
        .from('analysis-files')
        .upload(fileName, silentVideo, {
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
      toast.success('Video clip uploaded (audio removed)');
    } catch (error: any) {
      console.error('Error uploading video:', error);
      toast.error('Failed to upload video');
    } finally {
      setUploading(false);
      setStatus('');
      setProgress(0);
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
          <span className="text-xs text-primary flex items-center gap-1">
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
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-[10px]">
                {status} {progress > 0 && `${progress}%`}
              </span>
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
