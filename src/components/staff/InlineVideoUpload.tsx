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

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newUploads: UploadItem[] = Array.from(files).map(file => ({
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      file,
      clipName: file.name.replace(/\.[^/.]+$/, ''),
      logoFile: null,
      logoPreview: null,
      progress: 0,
      status: 'uploading' as const
    }));

    setUploads(prev => {
      const updated = [...prev, ...newUploads];
      // Start uploads after state is updated
      setTimeout(() => {
        newUploads.forEach(upload => startUpload(upload.id));
      }, 0);
      return updated;
    });
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

  const removeUpload = (uploadId: string) => {
    setUploads(prev => prev.filter(u => u.id !== uploadId));
  };

  const startUpload = async (uploadId: string) => {
    setUploads(prev => {
      const upload = prev.find(u => u.id === uploadId);
      if (!upload) return prev;

      return prev.map(u => 
        u.id === uploadId ? { ...u, status: 'uploading' as const, error: undefined, progress: 10 } : u
      );
    });

    // Get the upload item from current state
    const currentUpload = uploads.find(u => u.id === uploadId);
    if (!currentUpload) return;

    try {
      // Upload video file
      const fileName = `${playerId}_${Date.now()}_${currentUpload.file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `highlights/${fileName}`;

      setUploads(prev => prev.map(u => 
        u.id === uploadId ? { ...u, progress: 20 } : u
      ));

      const { error: uploadError } = await supabase.storage
        .from('analysis-files')
        .upload(filePath, currentUpload.file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      setUploads(prev => prev.map(u => 
        u.id === uploadId ? { ...u, progress: 60 } : u
      ));

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('analysis-files')
        .getPublicUrl(filePath);

      setUploads(prev => prev.map(u => 
        u.id === uploadId ? { ...u, progress: 70 } : u
      ));

      // Upload logo if provided
      let logoUrl = null;
      if (currentUpload.logoFile) {
        const logoFileName = `${playerId}_${Date.now()}_logo_${currentUpload.logoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { error: logoError } = await supabase.storage
          .from('analysis-files')
          .upload(`highlights/logos/${logoFileName}`, currentUpload.logoFile, {
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
        u.id === uploadId ? { ...u, progress: 80, status: 'processing' as const } : u
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

      setUploads(prev => prev.map(u => 
        u.id === uploadId ? { ...u, progress: 85 } : u
      ));

      const highlights = (player?.highlights as any) || {};
      const clipId = `${playerId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newClip = {
        id: clipId,
        name: currentUpload.clipName,
        videoUrl: publicUrl,
        logoUrl: logoUrl,
        addedAt: new Date().toISOString()
      };

      const updatedHighlights = highlightType === 'match' 
        ? {
            matchHighlights: [...((highlights as any).matchHighlights || []), newClip],
            bestClips: (highlights as any).bestClips || []
          }
        : {
            matchHighlights: (highlights as any).matchHighlights || [],
            bestClips: [...((highlights as any).bestClips || []), newClip]
          };

      setUploads(prev => prev.map(u => 
        u.id === uploadId ? { ...u, progress: 90 } : u
      ));

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
      
      // Remove from list after 3 seconds
      setTimeout(() => {
        removeUpload(uploadId);
        onUploadComplete();
      }, 3000);

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
    }
  };

  const retryUpload = (uploadId: string) => {
    startUpload(uploadId);
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
                        disabled={upload.status !== 'idle'}
                        className="h-8 text-sm"
                        placeholder="Clip title"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {upload.file.name} ({(upload.file.size / (1024 * 1024)).toFixed(2)} MB)
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!upload.logoPreview && upload.status === 'idle' && (
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

                    {(upload.status === 'idle' || upload.status === 'error') && (
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
