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
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
      });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        stream.getTracks().forEach(t => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250); // collect data every 250ms for pause support
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        toast.error("Microphone access denied. Check browser permissions.");
      } else {
        toast.error("Failed to start recording");
      }
    }
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
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
      setIsRecording(false);
      setIsPaused(false);
    }
  }, []);

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
          <Button size="sm" variant="outline" onClick={() => { setRecordedBlob(null); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setDuration(0); }}>
            Re-record
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setRecordedBlob(null); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setDuration(0); }}>
            Discard
          </Button>
        </div>
      </div>
    );
  }

  // Recording in progress
  if (isRecording) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
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
