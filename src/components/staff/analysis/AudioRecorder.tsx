import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Pause, Play, Upload, Trash2, Loader2, RotateCcw } from "lucide-react";
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
  const previewUrlRef = useRef<string | null>(null);
  const sessionRef = useRef(0);

  const setManagedPreviewUrl = useCallback((nextUrl: string | null) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    previewUrlRef.current = nextUrl;
    setPreviewUrl(nextUrl);
  }, []);

  const clearTimers = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const clearRecorder = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    recorder.ondataavailable = null;
    recorder.onstop = null;
    recorder.onerror = null;

    if (recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // no-op
      }
    }

    mediaRecorderRef.current = null;
  }, []);

  const resetRecorderState = useCallback((clearPreview = false) => {
    clearTimers();
    clearRecorder();
    stopStream();
    chunksRef.current = [];
    setIsRecording(false);
    setIsPaused(false);
    setCountdown(null);
    setDuration(0);

    if (clearPreview) {
      setRecordedBlob(null);
      setManagedPreviewUrl(null);
    }
  }, [clearRecorder, clearTimers, setManagedPreviewUrl, stopStream]);

  useEffect(() => {
    if (audioUrl) {
      setRecordedBlob(null);
      setManagedPreviewUrl(null);
    }
  }, [audioUrl, setManagedPreviewUrl]);

  useEffect(() => {
    return () => {
      sessionRef.current += 1;
      resetRecorderState(true);
    };
  }, [resetRecorderState]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const startRecording = useCallback(async () => {
    if (isUploading) return;

    const sessionId = sessionRef.current + 1;
    sessionRef.current = sessionId;
    resetRecorderState(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
        },
      });

      if (sessionRef.current !== sessionId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      setCountdown(3);

      let count = 3;
      countdownRef.current = setInterval(() => {
        if (sessionRef.current !== sessionId) {
          clearTimers();
          return;
        }

        count -= 1;

        if (count <= 0) {
          clearTimers();

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

          recorder.ondataavailable = (event) => {
            if (sessionRef.current !== sessionId) return;
            if (event.data.size > 0) {
              chunksRef.current.push(event.data);
            }
          };

          recorder.onerror = (event) => {
            console.error("Recording error:", event);
            if (sessionRef.current !== sessionId) return;
            resetRecorderState(false);
            toast.error("Audio recording failed");
          };

          recorder.onstop = () => {
            if (sessionRef.current !== sessionId) return;

            const blob = new Blob(chunksRef.current, { type: mimeType });
            stopStream();
            mediaRecorderRef.current = null;
            clearTimers();
            setIsRecording(false);
            setIsPaused(false);

            if (!blob.size) {
              toast.error("No audio was captured. Please try again.");
              return;
            }

            setRecordedBlob(blob);
            setManagedPreviewUrl(URL.createObjectURL(blob));
          };

          mediaRecorderRef.current = recorder;
          recorder.start(250);
          setCountdown(null);
          setDuration(0);
          setIsPaused(false);
          setIsRecording(true);

          timerRef.current = setInterval(() => {
            setDuration((current) => current + 1);
          }, 1000);
        } else {
          setCountdown(count);
        }
      }, 1000);
    } catch (err: any) {
      resetRecorderState(false);
      if (err?.name === "NotAllowedError") {
        toast.error("Microphone access denied. Check browser permissions.");
      } else {
        toast.error("Failed to start recording");
        console.error("Recording error:", err);
      }
    }
  }, [clearTimers, isUploading, resetRecorderState, stopStream, setManagedPreviewUrl]);

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
        setDuration((current) => current + 1);
      }, 1000);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const cancelCountdown = useCallback(() => {
    sessionRef.current += 1;
    resetRecorderState(false);
  }, [resetRecorderState]);

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
      setManagedPreviewUrl(null);
      setDuration(0);
      toast.success("Audio saved");
    } catch (err: any) {
      toast.error("Failed to upload audio: " + err.message);
    } finally {
      setIsUploading(false);
    }
  }, [onAudioChange, recordedBlob, setManagedPreviewUrl]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
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
      event.target.value = "";
    }
  }, [onAudioChange]);

  const removeAudio = useCallback(() => {
    sessionRef.current += 1;
    resetRecorderState(true);
    onAudioChange(undefined);
  }, [onAudioChange, resetRecorderState]);

  const discardRecording = useCallback(() => {
    sessionRef.current += 1;
    resetRecorderState(true);
  }, [resetRecorderState]);

  const rerecordAudio = useCallback(async () => {
    onAudioChange(undefined);
    await startRecording();
  }, [onAudioChange, startRecording]);

  if (audioUrl) {
    return (
      <div className="space-y-2 rounded-lg border bg-muted/50 p-2">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-primary flex-shrink-0" />
          <audio controls src={audioUrl} className="h-8 flex-1 min-w-0" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={rerecordAudio} className="flex-1 gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            Re-record
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={removeAudio}>
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </Button>
        </div>
      </div>
    );
  }

  if (recordedBlob && previewUrl) {
    return (
      <div className="space-y-2 rounded-lg border bg-muted/50 p-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Preview ({formatTime(duration)})</span>
        </div>
        <audio controls src={previewUrl} className="w-full h-8" />
        <div className="flex gap-2">
          <Button size="sm" onClick={saveRecording} disabled={isUploading} className="flex-1">
            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
            {isUploading ? "Saving..." : "Save"}
          </Button>
          <Button size="sm" variant="outline" onClick={rerecordAudio} className="gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            Re-record
          </Button>
          <Button size="sm" variant="ghost" onClick={discardRecording}>
            Discard
          </Button>
        </div>
      </div>
    );
  }

  if (countdown !== null) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10">
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

  if (isRecording) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2">
        <div className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
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

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={startRecording} className="gap-1.5">
        <Mic className="w-3.5 h-3.5" /> Record Audio
      </Button>
      <span className="text-xs text-muted-foreground">or</span>
      <label className="cursor-pointer">
        <input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
        <Button size="sm" variant="outline" className="pointer-events-none gap-1.5" tabIndex={-1}>
          {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          Upload
        </Button>
      </label>
    </div>
  );
};
