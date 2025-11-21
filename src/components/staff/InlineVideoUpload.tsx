import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, RefreshCw, Check, AlertCircle, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UploadItem {
  id: string;
  file: File;
  clipName: string;
  logoFile: File | null;
  logoPreview: string | null;
  progress: number;
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
  error?: string;
  uploadedBytes?: number;
}

interface InlineVideoUploadProps {
  playerEmail: string;
  playerId: string;
  highlightType: "match" | "best";
  onUploadComplete: () => void;
}

export function InlineVideoUpload({ 
  playerEmail, 
  playerId,
  highlightType, 
  onUploadComplete 
}: InlineVideoUploadProps) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadIntervalsRef = useRef<Record<string, number | undefined>>({});


  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newUploads: UploadItem[] = Array.from(files).map(file => ({
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      file,
      clipName: file.name.replace(/\.[^/.]+$/, ''),
      logoFile: null,
      logoPreview: null,
      progress: 0,
      status: 'idle' as const
    }));

    setUploads(prev => [...prev, ...newUploads]);
    
    // Start uploads with the actual upload data
    newUploads.forEach(upload => startUpload(upload));
  };

  const handleLogoSelect = (uploadId: string, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploads(prev => prev.map(u => 
        u.id === uploadId 
          ? { ...u, logoFile: file, logoPreview: reader.result as string }
          : u
      ));
    };
    reader.readAsDataURL(file);
  };

  const startProgressAnimation = (uploadId: string) => {
    const existingInterval = uploadIntervalsRef.current[uploadId];
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    const intervalId = window.setInterval(() => {
      setUploads(prev =>
        prev.map(u => {
          if (u.id !== uploadId) return u;
          if (u.status !== 'uploading' && u.status !== 'processing') return u;
          const nextProgress = Math.min((u.progress || 0) + 1, 95);
          return { ...u, progress: nextProgress };
        })
      );
    }, 300);

    uploadIntervalsRef.current[uploadId] = intervalId;
  };

  const stopProgressAnimation = (uploadId: string) => {
    const intervalId = uploadIntervalsRef.current[uploadId];
    if (intervalId) {
      clearInterval(intervalId);
      delete uploadIntervalsRef.current[uploadId];
    }
  };
  
  const removeUpload = (uploadId: string) => {
    stopProgressAnimation(uploadId);
    setUploads(prev => prev.filter(u => u.id !== uploadId));
  };

  const startUpload = async (uploadData: UploadItem) => {
    const uploadId = uploadData.id;
    
    setUploads(prev => prev.map(u => 
      u.id === uploadId ? { ...u, status: 'uploading' as const, error: undefined, progress: 1 } : u
    ));

    startProgressAnimation(uploadId);

    try {
      // Get latest upload data with current clipName and logoFile
      const currentUpload = uploads.find(u => u.id === uploadId) || uploadData;

      // Upload video file
      const fileName = `${playerId}_${Date.now()}_${currentUpload.file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `highlights/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('analysis-files')
        .upload(filePath, currentUpload.file, {
          contentType: currentUpload.file.type,
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('analysis-files')
        .getPublicUrl(filePath);

      // Upload logo if provided
      let logoUrl = null;
      if (currentUpload.logoFile) {
        const logoFileName = `${playerId}_${Date.now()}_logo_${currentUpload.logoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { error: logoError } = await supabase.storage
          .from('analysis-files')
          .upload(`highlights/logos/${logoFileName}`, currentUpload.logoFile, {
            contentType: currentUpload.logoFile.type,
            cacheControl: '3600',
            upsert: false
          });

        if (!logoError) {
          const { data: { publicUrl: logoPublicUrl } } = supabase.storage
            .from('analysis-files')
            .getPublicUrl(`highlights/logos/${logoFileName}`);
          logoUrl = logoPublicUrl;
        }
      }

      setUploads(prev => prev.map(u => 
        u.id === uploadId ? { ...u, status: 'processing' as const } : u
      ));

      // Update player highlights
      const { data: player, error: fetchError } = await supabase
        .from('players')
        .select('highlights')
        .eq('id', playerId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch player data: ${fetchError.message}`);
      }

      const highlights = (player?.highlights as any) || {};
      const clipId = `${playerId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newClip = {
        id: clipId,
        name: currentUpload.clipName,
        videoUrl: publicUrl,
        clubLogo: logoUrl,
        addedAt: new Date().toISOString()
      };

      console.log(`[UPLOAD] highlightType=${highlightType}, adding to ${highlightType === 'match' ? 'matchHighlights' : 'bestClips'}`);

      // CRITICAL: Ensure we update the correct array based on highlightType
      const currentMatchHighlights = (highlights as any).matchHighlights || [];
      const currentBestClips = (highlights as any).bestClips || [];

      const updatedHighlights = highlightType === 'match' 
        ? {
            matchHighlights: [...currentMatchHighlights, newClip],
            bestClips: currentBestClips
          }
        : {
            matchHighlights: currentMatchHighlights,
            bestClips: [...currentBestClips, newClip]
          };

      console.log(`[UPLOAD] Updated highlights:`, {
        matchHighlightsCount: updatedHighlights.matchHighlights.length,
        bestClipsCount: updatedHighlights.bestClips.length
      });

      const { error: updateError } = await supabase
        .from('players')
        .update({ highlights: updatedHighlights })
        .eq('id', playerId);

      if (updateError) {
        throw new Error(`Failed to update player highlights: ${updateError.message}`);
      }

      setUploads(prev => prev.map(u => 
        u.id === uploadId ? { ...u, progress: 100, status: 'success' as const } : u
      ));

      toast.success(`${currentUpload.clipName} uploaded successfully`);
      
      // Remove from list and refresh after brief delay to ensure DB is updated
      setTimeout(() => {
        removeUpload(uploadId);
      }, 2000);
      
      // Trigger parent refresh slightly later to ensure data is consistent
      setTimeout(() => {
        onUploadComplete();
      }, 2500);

    } catch (error: any) {
      console.error('Upload error:', error);
      const errorMessage = error.message || 'Upload failed';
      setUploads(prev => prev.map(u => 
        u.id === uploadId 
          ? { 
              ...u, 
              status: 'error' as const, 
              error: errorMessage
            }
          : u
      ));
      toast.error(`Failed to upload: ${errorMessage}`);
    } finally {
      stopProgressAnimation(uploadId);
    }
  };

  const retryUpload = (uploadId: string) => {
    const upload = uploads.find(u => u.id === uploadId);
    if (upload) {
      startUpload(upload);
    }
  };

  return (
    <div className="space-y-4">
      {/* File Selection */}
      <div className="flex gap-2">
        <Button
          onClick={() => fileInputRef.current?.click()}
          size="sm"
        >
          <Upload className="w-4 h-4 mr-2" />
          Select Videos
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
      </div>

      {/* Upload Queue */}
      {uploads.length > 0 && (
        <div className="space-y-3">
          {uploads.map((upload) => (
            <Card key={upload.id} className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {upload.status === 'success' && <Check className="w-4 h-4 text-green-500 flex-shrink-0" />}
                      {upload.status === 'error' && <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />}
                      {upload.status === 'uploading' && (
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
                      )}
                      <Input
                        value={upload.clipName}
                        onChange={(e) => {
                          setUploads(prev => prev.map(u => 
                            u.id === upload.id ? { ...u, clipName: e.target.value } : u
                          ));
                        }}
                        disabled={upload.status === 'success'}
                        className="h-8 text-sm"
                        placeholder="Clip title"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {upload.file.name} ({(upload.file.size / (1024 * 1024)).toFixed(2)} MB)
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!upload.logoPreview && upload.status !== 'success' && (
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e: any) => {
                            const file = e.target.files?.[0];
                            if (file) handleLogoSelect(upload.id, file);
                          };
                          input.click();
                        }}
                        title="Add logo"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </Button>
                    )}
                    
                    {upload.logoPreview && (
                      <img 
                        src={upload.logoPreview} 
                        alt="Logo" 
                        className="h-8 w-8 object-contain rounded border flex-shrink-0" 
                      />
                    )}

                    {upload.status === 'error' && (
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={() => retryUpload(upload.id)}
                        title="Retry upload"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )}

                    {upload.status !== 'success' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={() => removeUpload(upload.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {(upload.status === 'uploading' || upload.status === 'processing') && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        {upload.status === 'processing' ? 'Processing...' : 'Uploading...'}
                      </span>
                      <span className="font-medium">{Math.round(upload.progress)}%</span>
                    </div>
                    <Progress value={upload.progress} className="h-1.5" />
                  </div>
                )}

                {upload.error && (
                  <p className="text-xs text-destructive">{upload.error}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
