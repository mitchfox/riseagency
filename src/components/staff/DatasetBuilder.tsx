import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Camera, Download, Trash2, RefreshCw, Search, Loader2, X, Play } from "lucide-react";
import { StaffSearchInput } from "./StaffSearchInput";
import { DatasetFrameCapture } from "./DatasetFrameCapture";
import { DatasetAnnotationCanvas, type BBox } from "./DatasetAnnotationCanvas";
import JSZip from "jszip";

interface ClipRow {
  id: string;
  action_type: string;
  action_description: string | null;
  video_url: string | null;
  action_number: number;
  analysis_id: string;
  minute: string | null;
  notes: string | null;
}

interface DatasetFrame {
  id: string;
  action_id: string | null;
  action_type: string;
  frame_time: number;
  image_url: string;
  annotations: BBox[];
  exported: boolean;
  created_at: string;
}

export const DatasetBuilder = () => {
  const [clips, setClips] = useState<ClipRow[]>([]);
  const [frames, setFrames] = useState<DatasetFrame[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const [selectedClip, setSelectedClip] = useState<ClipRow | null>(null);
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedTime, setCapturedTime] = useState(0);
  const [annotationOpen, setAnnotationOpen] = useState(false);
  const [annotations, setAnnotations] = useState<BBox[]>([]);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const fetchClips = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("performance_report_actions")
      .select("id, action_type, action_description, video_url, action_number, analysis_id, minute, notes")
      .not("video_url", "is", null)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load clips");
    } else {
      setClips((data || []).map((d: any) => ({ ...d, minute: d.minute != null ? String(d.minute) : null })));
    }
    setLoading(false);
  }, []);

  const fetchFrames = useCallback(async () => {
    const { data } = await supabase
      .from("dataset_frames")
      .select("*")
      .order("created_at", { ascending: false });
    setFrames(((data || []) as unknown as DatasetFrame[]));
  }, []);

  useEffect(() => {
    fetchClips();
    fetchFrames();
  }, [fetchClips, fetchFrames]);

  const actionTypes = [...new Set(clips.map((c) => c.action_type))].filter(t => t && t.trim() !== "").sort();

  const filteredClips = clips.filter((c) => {
    if (actionFilter !== "all" && c.action_type !== actionFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        c.action_type.toLowerCase().includes(term) ||
        (c.action_description || "").toLowerCase().includes(term) ||
        (c.notes || "").toLowerCase().includes(term)
      );
    }
    return true;
  });

  const handleFrameCaptured = (dataUrl: string, blob: Blob, time: number) => {
    setCapturedImageUrl(dataUrl);
    setCapturedBlob(blob);
    setCapturedTime(time);
    setAnnotations([]);
    setAnnotationOpen(true);
  };

  const handleSaveFrame = async () => {
    if (!capturedBlob || !selectedClip) return;
    setSaving(true);

    try {
      const fileName = `${selectedClip.action_type}_${Date.now()}.png`;
      const filePath = `frames/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("dataset-images")
        .upload(filePath, capturedBlob, {
          contentType: "image/png",
          cacheControl: "31536000",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("dataset-images")
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from("dataset_frames")
        .insert({
          action_id: selectedClip.id,
          action_type: selectedClip.action_type,
          frame_time: capturedTime,
          image_url: urlData.publicUrl,
          annotations: annotations as any,
        });

      if (insertError) throw insertError;

      toast.success("Frame saved to dataset");
      setAnnotationOpen(false);
      setCapturedImageUrl(null);
      setCapturedBlob(null);
      fetchFrames();
    } catch (err: any) {
      toast.error(err.message || "Failed to save frame");
    }
    setSaving(false);
  };

  const handleDeleteFrame = async (frameId: string) => {
    const { error } = await supabase
      .from("dataset_frames")
      .delete()
      .eq("id", frameId);

    if (error) {
      toast.error("Failed to delete frame");
    } else {
      setFrames((prev) => prev.filter((f) => f.id !== frameId));
      toast.success("Frame deleted");
    }
  };

  const doExport = async (framesToExport: DatasetFrame[], includeYolo: boolean, markExported: boolean) => {
    if (framesToExport.length === 0) {
      toast.info("No frames to export");
      return;
    }

    setExporting(true);
    setExportProgress(0);

    try {
      const zip = new JSZip();
      const countByType: Record<string, number> = {};

      for (let i = 0; i < framesToExport.length; i++) {
        const frame = framesToExport[i];
        setExportProgress(Math.round(((i + 1) / framesToExport.length) * 100));

        if (!countByType[frame.action_type]) countByType[frame.action_type] = 0;
        countByType[frame.action_type]++;
        const num = countByType[frame.action_type];
        const fileName = `${frame.action_type}${num}.png`;

        try {
          const resp = await fetch(frame.image_url);
          const blob = await resp.blob();
          zip.file(`${frame.action_type}/${fileName}`, blob);

          if (includeYolo && frame.annotations?.length > 0) {
            const lines = frame.annotations.map((a, idx) => {
              const xc = a.x + a.width / 2;
              const yc = a.y + a.height / 2;
              return `${idx} ${xc.toFixed(6)} ${yc.toFixed(6)} ${a.width.toFixed(6)} ${a.height.toFixed(6)}`;
            });
            zip.file(
              `${frame.action_type}/labels/${frame.action_type}${num}.txt`,
              lines.join("\n")
            );
          }
        } catch (err) {
          console.error("Failed to download frame image:", err);
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dataset_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      if (markExported) {
        const ids = framesToExport.map((f) => f.id);
        await supabase
          .from("dataset_frames")
          .update({ exported: true })
          .in("id", ids);
      }

      fetchFrames();
      toast.success(`Exported ${framesToExport.length} frames`);
    } catch (err: any) {
      toast.error(err.message || "Export failed");
    }

    setExporting(false);
    setExportProgress(0);
  };

  const handleExport = (includeYolo: boolean) => doExport(frames.filter(f => !f.exported), includeYolo, true);
  const handleExportAll = (includeYolo: boolean) => doExport(frames, includeYolo, false);

  const unexportedCount = frames.filter((f) => !f.exported).length;
  const framesByType: Record<string, number> = {};
  frames.forEach((f) => {
    framesByType[f.action_type] = (framesByType[f.action_type] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Dataset Builder</h2>
          <p className="text-sm text-muted-foreground">
            Capture frames from clips and annotate them for Roboflow training
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchClips(); fetchFrames(); }}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
          {frames.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => handleExportAll(true)} disabled={exporting}>
              {exporting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
              Export All ({frames.length})
            </Button>
          )}
          {unexportedCount > 0 && (
            <Button size="sm" onClick={() => handleExport(true)} disabled={exporting}>
              {exporting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
              Export {unexportedCount} new
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      {frames.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(framesByType).sort(([a], [b]) => a.localeCompare(b)).map(([type, count]) => (
            <Badge key={type} variant="secondary" className="text-xs">
              {type}: {count}
            </Badge>
          ))}
          <Badge variant="outline" className="text-xs">
            Total: {frames.length} ({unexportedCount} new)
          </Badge>
        </div>
      )}

      {exporting && (
        <Progress value={exportProgress} className="h-2" />
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <StaffSearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search clips..."
          className="flex-1"
        />
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All action types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All action types</SelectItem>
            {actionTypes.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clips table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="hidden md:table-cell">Description</TableHead>
              <TableHead className="w-24">Frames</TableHead>
              <TableHead className="w-16">Captured</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredClips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No clips found
                </TableCell>
              </TableRow>
            ) : (
              filteredClips.slice(0, 100).map((clip) => {
                const clipFrameCount = frames.filter((f) => f.action_id === clip.id).length;
                return (
                  <TableRow key={clip.id}>
                    <TableCell className="font-mono text-xs">{clip.action_number}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{clip.action_type}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[300px] truncate">
                      {clip.action_description || "-"}
                    </TableCell>
                    <TableCell>
                      {clipFrameCount > 0 && (
                        <Badge variant="secondary" className="text-xs">{clipFrameCount}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {clipFrameCount > 0 ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedClip(clip)}
                        disabled={!clip.video_url}
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        {filteredClips.length > 100 && (
          <div className="text-center py-2 text-xs text-muted-foreground border-t">
            Showing first 100 of {filteredClips.length} clips
          </div>
        )}
      </div>

      {/* Saved frames gallery */}
      {frames.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Saved Frames ({frames.length})</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {frames.slice(0, 48).map((frame) => (
              <div key={frame.id} className="group relative border rounded-lg overflow-hidden bg-muted">
                <img
                  src={frame.image_url}
                  alt={frame.action_type}
                  className="w-full aspect-video object-cover"
                  loading="lazy"
                />
                <div className="absolute bottom-0 inset-x-0 bg-background/80 px-2 py-1 text-xs flex items-center justify-between">
                  <span className="font-medium truncate">{frame.action_type}</span>
                  {frame.exported && <Badge variant="outline" className="text-[10px] px-1">Exported</Badge>}
                </div>
                <button
                  onClick={() => handleDeleteFrame(frame.id)}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive text-destructive-foreground rounded p-1"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
                {frame.annotations?.length > 0 && (
                  <div className="absolute top-1 left-1">
                    <Badge variant="secondary" className="text-[10px] px-1">
                      {frame.annotations.length} box{frame.annotations.length !== 1 ? "es" : ""}
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Frame capture dialog */}
      {selectedClip && (
        <DatasetFrameCapture
          clip={selectedClip}
          open={!!selectedClip && !annotationOpen}
          onClose={() => setSelectedClip(null)}
          onCapture={handleFrameCaptured}
        />
      )}

      {/* Annotation dialog */}
      <Dialog open={annotationOpen} onOpenChange={(open) => { if (!open) setAnnotationOpen(false); }}>
        <DialogContent className="max-w-4xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>Annotate Frame — {selectedClip?.action_type}</DialogTitle>
          </DialogHeader>
          {capturedImageUrl && (
            <div className="space-y-4">
              <DatasetAnnotationCanvas
                imageUrl={capturedImageUrl}
                annotations={annotations}
                onChange={setAnnotations}
                actionTypes={actionTypes}
              />
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {annotations.length} bounding box{annotations.length !== 1 ? "es" : ""} drawn.
                  Click and drag on the image to draw boxes.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setAnnotationOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveFrame} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Camera className="h-4 w-4 mr-1.5" />}
                    Save Frame
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
