import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Pause, Play, Upload, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AudioRecorderProps {
  audioUrl?: string;
  onAudioChange: (url: string | undefined) => void;
}

export const AudioRecorder = ({ audioUrl, onAudioChange }: AudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Full cleanup helper — stops everything and releases resources
  const fullCleanup = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    mediaRecorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      fullCleanup();
      // Revoke any lingering preview URL
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const startRecording = useCallback(async () => {
    try {
      // Always clean up any previous session first
      fullCleanup();

      // Get a fresh stream directly from user gesture
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
        },
      });
      streamRef.current = stream;

      // 3-2-1 countdown
      setCountdown(3);
      let count = 3;
      countdownRef.current = setInterval(() => {
        count--;
        if (count <= 0) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          countdownRef.current = null;

          // Begin recording with the captured stream
          const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : MediaRecorder.isTypeSupported("audio/webm")
            ? "audio/webm"
            : "audio/mp4";

          chunksRef.current = [];

          const recorder = new MediaRecorder(stream, {
            mimeType,
            audioBitsPerSecond: 256000,
          });

          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
          };

          recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: mimeType });
            setRecordedBlob(blob);
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
            // Stop timer
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            // Stop stream tracks to release mic
            if (streamRef.current) {
              streamRef.current.getTracks().forEach(t => t.stop());
              streamRef.current = null;
            }
            mediaRecorderRef.current = null;
            setIsRecording(false);
            setIsPaused(false);
          };

          mediaRecorderRef.current = recorder;
          recorder.start(250);
          setIsRecording(true);
          setCountdown(null);
          setIsPaused(false);
          setDuration(0);

          timerRef.current = setInterval(() => {
            setDuration(d => d + 1);
          }, 1000);
        } else {
          setCountdown(count);
        }
      }, 1000);
    } catch (err: any) {
      fullCleanup();
      if (err.name === "NotAllowedError") {
        toast.error("Microphone access denied. Check browser permissions.");
      } else {
        toast.error("Failed to start recording");
        console.error("Recording error:", err);
      }
    }
  }, [fullCleanup]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      // onstop handler will clean up state
    }
  }, []);

  const cancelCountdown = useCallback(() => {
    fullCleanup();
    setCountdown(null);
  }, [fullCleanup]);

  const saveRecording = useCallback(async () => {
    if (!recordedBlob) return;
    setIsUploading(true);
    try {
      const ext = recordedBlob.type.includes("webm") ? "webm" : "mp4";
      const fileName = `audio/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("analysis-files")
        .upload(fileName, recordedBlob, { contentType: recordedBlob.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("analysis-files")
        .getPublicUrl(fileName);

      onAudioChange(publicUrl);
      setRecordedBlob(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      toast.success("Audio saved");
    } catch (err: any) {
      toast.error("Failed to upload audio: " + err.message);
    } finally {
      setIsUploading(false);
    }
  }, [recordedBlob, onAudioChange, previewUrl]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop() || "mp3";
      const fileName = `audio/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("analysis-files")
        .upload(fileName, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("analysis-files")
        .getPublicUrl(fileName);

      onAudioChange(publicUrl);
      toast.success("Audio uploaded");
    } catch (err: any) {
      toast.error("Failed to upload: " + err.message);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }, [onAudioChange]);

  const removeAudio = useCallback(() => {
    onAudioChange(undefined);
    setRecordedBlob(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }, [onAudioChange, previewUrl]);

  const discardRecording = useCallback(() => {
    setRecordedBlob(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setDuration(0);
  }, [previewUrl]);

  // Already has a saved audio URL
  if (audioUrl) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border">
        <Mic className="w-4 h-4 text-primary flex-shrink-0" />
        <audio controls src={audioUrl} className="h-8 flex-1 min-w-0" />
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={removeAudio}>
          <Trash2 className="w-3.5 h-3.5 text-destructive" />
        </Button>
      </div>
    );
  }

  // Has a recorded but unsaved blob
  if (recordedBlob && previewUrl) {
    return (
      <div className="space-y-2 p-2 rounded-lg bg-muted/50 border">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Preview ({formatTime(duration)})</span>
        </div>
        <audio controls src={previewUrl} className="w-full h-8" />
        <div className="flex gap-2">
          <Button size="sm" onClick={saveRecording} disabled={isUploading} className="flex-1">
            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
            {isUploading ? "Saving..." : "Save"}
          </Button>
          <Button size="sm" variant="outline" onClick={discardRecording}>
            Re-record
          </Button>
          <Button size="sm" variant="ghost" onClick={discardRecording}>
            Discard
          </Button>
        </div>
      </div>
    );
  }

  // Countdown
  if (countdown !== null) {
    return (
      <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 border">
        <div className="w-8 h-8 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center">
          <span className="text-lg font-mono font-bold text-destructive">{countdown}</span>
        </div>
        <span className="text-sm text-muted-foreground">Get ready...</span>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={cancelCountdown} className="h-7">
          Cancel
        </Button>
      </div>
    );
  }

  // Recording in progress
  if (isRecording) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/30">
        <div className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
        <span className="text-sm font-mono font-medium">{formatTime(duration)}</span>
        <div className="flex-1" />
        {isPaused ? (
          <Button size="sm" variant="outline" onClick={resumeRecording} className="h-7 gap-1">
            <Play className="w-3 h-3" /> Resume
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={pauseRecording} className="h-7 gap-1">
            <Pause className="w-3 h-3" /> Pause
          </Button>
        )}
        <Button size="sm" variant="destructive" onClick={stopRecording} className="h-7 gap-1">
          <Square className="w-3 h-3" /> Stop
        </Button>
      </div>
    );
  }

  // Default: record or upload
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={startRecording} className="gap-1.5">
        <Mic className="w-3.5 h-3.5" /> Record Audio
      </Button>
      <span className="text-xs text-muted-foreground">or</span>
      <label className="cursor-pointer">
        <input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
        <Button size="sm" variant="outline" className="gap-1.5 pointer-events-none" tabIndex={-1}>
          {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          Upload
        </Button>
      </label>
    </div>
  );
};
