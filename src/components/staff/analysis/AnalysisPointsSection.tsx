import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, X, Sparkles, ChevronDown, Film, GripVertical, Scissors, PenLine, Loader2, ArrowUp, ArrowDown, ArrowRightLeft, BookOpen, Crop } from "lucide-react";
import { AudioRecorder } from "./AudioRecorder";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VideoTrimmerDialog } from "./VideoTrimmerDialog";
import { VideoCropDialog } from "./VideoCropDialog";
import { AnnotationEditor } from "@/components/staff/annotations/AnnotationEditor";
import type { AnnotationProject } from "@/components/staff/annotations/AnnotationProjects";
import { ReadOnlyAnnotationPlayback } from "@/components/portal/ReadOnlyAnnotationPlayback";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Point {
  title: string;
  paragraph_1: string;
  paragraph_2: string;
  images: string[];
  video_url?: string;
  video_urls?: string[];
  audio_url?: string;
  annotation_ids?: Record<string, string>; // video_url -> annotation_project_id
  concept_tags?: string[]; // concept IDs from coaching_analysis
}

interface PerformanceReportAction {
  id: string;
  video_url?: string;
  action_type?: string;
  action_number?: number;
  minute?: number;
  action_score?: number;
}

interface VideoAnalysisClip {
  id: string;
  label: string;
  start: number;
  end: number;
  action_type: string;
  video_url: string;
  video_title: string;
}

interface PointsSectionProps {
  formData: any;
  setFormData: (data: any) => void;
  addPoint: () => void;
  removePoint: (index: number) => void;
  updatePoint: (index: number, field: keyof Point, value: any) => void;
  handleImageUpload: (event: React.ChangeEvent<HTMLInputElement>, field: string, pointIndex?: number, isMultiple?: boolean) => Promise<void>;
  handleVideoUploadForPoint: (event: React.ChangeEvent<HTMLInputElement>, pointIndex: number) => Promise<void>;
  removeImageFromPoint: (pointIndex: number, imageIndex: number) => void;
  uploadingImage: boolean;
  generateWithAI: (field: string, pointIndex?: number) => Promise<void>;
  aiGenerating: boolean;
  analysisType: "pre-match" | "post-match" | "concept";
  defaultOpen?: boolean;
  performanceReportClips?: PerformanceReportAction[];
  analysisId?: string;
}

// Helper to get R90 action score color - matches PerformanceReportDialog exactly
const getActionScoreColor = (score: number | undefined | null): string => {
  if (score === undefined || score === null) return 'text-muted-foreground';
  if (score >= 0.15) return "text-green-800";
  if (score >= 0.1) return "text-green-600";
  if (score >= 0.05) return "text-green-500";
  if (score >= 0.02) return "text-green-400";
  if (score > 0.005) return "text-lime-500";
  if (score > 0) return "text-lime-400";
  if (score === 0) return "text-muted-foreground";
  if (score > -0.005) return "text-orange-400";
  if (score > -0.02) return "text-orange-500";
  if (score > -0.04) return "text-red-400";
  if (score > -0.06) return "text-red-500";
  return "text-red-700";
};

// Background color version for badges - matches the text colors
const getActionScoreBgColor = (score: number | undefined | null): string => {
  if (score === undefined || score === null) return 'bg-muted';
  if (score >= 0.15) return "bg-green-800";
  if (score >= 0.1) return "bg-green-600";
  if (score >= 0.05) return "bg-green-500";
  if (score >= 0.02) return "bg-green-400";
  if (score > 0.005) return "bg-lime-500";
  if (score > 0) return "bg-lime-400";
  if (score === 0) return "bg-muted";
  if (score > -0.005) return "bg-orange-400";
  if (score > -0.02) return "bg-orange-500";
  if (score > -0.04) return "bg-red-400";
  if (score > -0.06) return "bg-red-500";
  return "bg-red-700";
};

// Concept types
interface CoachingConcept {
  id: string;
  title: string;
  content: string | null;
  description: string | null;
  category: string | null;
  attachments?: any;
}

// Concept detail dialog - widescreen popup
const ConceptDetailDialog = ({
  concept,
  open,
  onOpenChange,
}: {
  concept: CoachingConcept | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  if (!concept) return null;

  // Parse attachments for images/videos
  const attachments = concept.attachments ? (Array.isArray(concept.attachments) ? concept.attachments : []) : [];
  const imageAttachments = attachments.filter((a: any) => a.type === 'image' || a.url?.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i));
  const videoAttachments = attachments.filter((a: any) => a.type === 'video' || a.url?.match(/\.(mp4|webm|mov)$/i));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] w-full max-h-[85vh] overflow-y-auto">
        <DialogTitle className="text-xl font-bold flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-gold" />
          {concept.title}
        </DialogTitle>
        {concept.category && (
          <Badge variant="secondary" className="w-fit">{concept.category}</Badge>
        )}
        {concept.description && (
          <p className="text-sm text-muted-foreground">{concept.description}</p>
        )}
        {concept.content && (
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed">
            {concept.content}
          </div>
        )}
        {imageAttachments.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-2">
            {imageAttachments.map((att: any, i: number) => (
              <img key={i} src={att.url} alt={att.name || ''} className="max-w-xs rounded shadow" />
            ))}
          </div>
        )}
        {videoAttachments.length > 0 && (
          <div className="space-y-2 mt-2">
            {videoAttachments.map((att: any, i: number) => (
              <video key={i} src={att.url} controls className="w-full max-w-md rounded" />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Individual video item with trim support
const VideoItem = ({
  url,
  onRemove,
  onTrimComplete,
  pointIndex,
  totalPoints,
  onMoveToPoint,
  onAnnotationSaved,
  existingAnnotationId,
}: {
  url: string;
  onRemove: () => void;
  onTrimComplete: (newUrl: string) => void;
  pointIndex: number;
  totalPoints: number;
  onMoveToPoint: (targetPointIndex: number) => void;
  onAnnotationSaved?: (annotationProjectId: string) => void;
  existingAnnotationId?: string;
}) => {
  const [trimOpen, setTrimOpen] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [annotateOpen, setAnnotateOpen] = useState(false);
  const [annotationProject, setAnnotationProject] = useState<AnnotationProject | null>(null);
  const [annotationVersion, setAnnotationVersion] = useState(0); // bump to refresh preview
  const [moveOpen, setMoveOpen] = useState(false);

  // Load existing annotation project if one exists
  useEffect(() => {
    if (existingAnnotationId && !annotationProject) {
      supabase
        .from("annotation_projects")
        .select("*")
        .eq("id", existingAnnotationId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setAnnotationProject({
              id: data.id,
              name: data.name,
              videoUrl: data.video_url,
              videoName: data.video_name,
              createdAt: data.created_at,
              klips: Array.isArray(data.klips) ? (data.klips as any) : [],
            });
          }
        });
    }
  }, [existingAnnotationId]);

  const handleOpenAnnotate = () => {
    if (annotationProject) {
      setAnnotateOpen(true);
      return;
    }
    const project: AnnotationProject = {
      id: crypto.randomUUID(),
      name: "Point Video Annotation",
      videoUrl: url,
      videoName: "clip",
      createdAt: new Date().toISOString(),
      klips: [],
    };
    setAnnotationProject(project);
    setAnnotateOpen(true);
  };

  const handleSaveAnnotation = async (proj: AnnotationProject) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Must be logged in to save annotations");
        return;
      }

      const { error } = await supabase
        .from("annotation_projects")
        .upsert({
          id: proj.id,
          name: proj.name,
          video_url: proj.videoUrl,
          video_name: proj.videoName,
          klips: JSON.parse(JSON.stringify(proj.klips)),
          user_id: user.id,
        });

      if (error) throw error;

      setAnnotationProject(proj);
      setAnnotationVersion(v => v + 1); // force preview refresh
      // Store the annotation project ID on the point data so it persists
      onAnnotationSaved?.(proj.id);
      toast.success("Annotations saved — remember to save the analysis to persist the link");
    } catch (err: any) {
      toast.error("Failed to save annotations: " + err.message);
    }
  };

  // Build list of other points to move to
  const otherPoints = Array.from({ length: totalPoints }, (_, i) => i).filter(i => i !== pointIndex);

  // Get preloaded elements from local state for preview (avoids refetch)
  const previewElements = useMemo(() => {
    if (!annotationProject?.klips) return undefined;
    return annotationProject.klips.flatMap((klip: any) => klip.elements || []);
  }, [annotationProject, annotationVersion]);

  const hasAnnotation = !!(existingAnnotationId || (previewElements && previewElements.length > 0));

  return (
    <div className="relative max-w-xs">
      {hasAnnotation ? (
        <ReadOnlyAnnotationPlayback
          key={`preview-${annotationVersion}`}
          videoUrl={url}
          annotationProjectId={!previewElements?.length ? existingAnnotationId : undefined}
          preloadedElements={previewElements?.length ? previewElements : undefined}
          className="rounded overflow-hidden"
        />
      ) : (
        <video
          src={url}
          autoPlay
          loop
          muted
          playsInline
          className="w-full rounded"
        />
      )}
      <div className="absolute top-1 right-1 flex gap-1 z-10">
        <Button
          variant="secondary"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={handleOpenAnnotate}
          title="Annotate video"
        >
          <PenLine className="w-3 h-3" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => setTrimOpen(true)}
          title="Trim video"
        >
          <Scissors className="w-3 h-3" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => setCropOpen(true)}
          title="Crop video frame"
        >
          <Crop className="w-3 h-3" />
        </Button>
        {otherPoints.length > 0 && (
          <Select
            value=""
            onValueChange={(val) => {
              onMoveToPoint(Number(val));
            }}
          >
            <SelectTrigger className="h-6 w-6 p-0 border-0 bg-secondary hover:bg-secondary/80 [&>svg.lucide-chevron-down]:hidden">
              <ArrowRightLeft className="w-3 h-3" />
            </SelectTrigger>
            <SelectContent>
              {otherPoints.map((i) => (
                <SelectItem key={i} value={String(i)}>
                  Move to Point {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button
          variant="destructive"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={onRemove}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
      <VideoTrimmerDialog
        open={trimOpen}
        onOpenChange={setTrimOpen}
        videoUrl={url}
        onTrimComplete={onTrimComplete}
      />
      <VideoCropDialog
        open={cropOpen}
        onOpenChange={setCropOpen}
        videoUrl={url}
        onCropComplete={onTrimComplete}
      />
      <Dialog open={annotateOpen} onOpenChange={(open) => { if (!open) { setAnnotateOpen(false); } }}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 overflow-hidden">
          <VisuallyHidden><DialogTitle>Annotate Video</DialogTitle></VisuallyHidden>
          {annotationProject && (
            <AnnotationEditor
              project={annotationProject}
              onSave={handleSaveAnnotation}
              onBack={() => setAnnotateOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Sortable Point Card Component
interface SortablePointCardProps {
  point: Point;
  index: number;
  pointId: string;
  totalPoints: number;
  analysisType: string;
  removePoint: (index: number) => void;
  updatePoint: (index: number, field: keyof Point, value: any) => void;
  onMovePoint: (fromIndex: number, toIndex: number) => void;
  onMoveVideoToPoint: (fromPointIndex: number, videoIndex: number, toPointIndex: number) => void;
  handleImageUpload: (event: React.ChangeEvent<HTMLInputElement>, field: string, pointIndex?: number, isMultiple?: boolean) => Promise<void>;
  handleVideoUploadForPoint: (event: React.ChangeEvent<HTMLInputElement>, pointIndex: number) => Promise<void>;
  removeImageFromPoint: (pointIndex: number, imageIndex: number) => void;
  uploadingImage: boolean;
  generateWithAI: (field: string, pointIndex?: number) => Promise<void>;
  aiGenerating: boolean;
  performanceReportClips: PerformanceReportAction[];
  videoAnalysisClips: VideoAnalysisClip[];
  concepts: CoachingConcept[];
}

const SortablePointCard = ({
  point,
  index,
  pointId,
  totalPoints,
  analysisType,
  removePoint,
  updatePoint,
  onMovePoint,
  onMoveVideoToPoint,
  handleImageUpload,
  handleVideoUploadForPoint,
  removeImageFromPoint,
  uploadingImage,
  generateWithAI,
  aiGenerating,
  performanceReportClips,
  videoAnalysisClips,
  concepts,
}: SortablePointCardProps) => {
  const [viewingConcept, setViewingConcept] = useState<CoachingConcept | null>(null);
  const [conceptPickerOpen, setConceptPickerOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pointId });

  const [dragOver, setDragOver] = useState(false);
  const [dropUploading, setDropUploading] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('video/')) return;

    setDropUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'mp4';
      const fileName = `point-videos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('analysis-files')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('analysis-files').getPublicUrl(fileName);
      const currentVideos = point.video_urls || (point.video_url ? [point.video_url] : []);
      updatePoint(index, "video_urls", [...currentVideos, publicUrl]);
      toast.success('Video added to point');
    } catch (err: any) {
      toast.error('Failed to upload video: ' + err.message);
    } finally {
      setDropUploading(false);
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`p-4 transition-colors ${dragOver ? 'ring-2 ring-primary bg-primary/5' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {dropUploading && (
        <div className="flex items-center gap-2 text-xs text-primary mb-2">
          <Loader2 className="w-3 h-3 animate-spin" /> Uploading dropped video...
        </div>
      )}
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </button>
            <h4 className="font-medium">
              {analysisType === "concept" ? `Image Set ${index + 1}` : `Point ${index + 1}`}
            </h4>
            <div className="flex items-center gap-0.5 ml-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onMovePoint(index, index - 1)}
                disabled={index === 0}
                title="Move up"
              >
                <ArrowUp className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onMovePoint(index, index + 1)}
                disabled={index === totalPoints - 1}
                title="Move down"
              >
                <ArrowDown className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => removePoint(index)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {analysisType !== "concept" && (
          <>
            <div>
              <div className="flex items-center justify-between">
                <Label>Title</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => generateWithAI('point_title', index)}
                  disabled={aiGenerating}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  {aiGenerating ? 'Generating...' : 'Use AI'}
                </Button>
              </div>
              <Input
                value={point.title}
                onChange={(e) => updatePoint(index, "title", e.target.value)}
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label>Paragraph 1</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => generateWithAI('point_paragraph_1', index)}
                  disabled={aiGenerating}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  {aiGenerating ? 'Generating...' : 'Use AI'}
                </Button>
              </div>
              <Textarea
                value={point.paragraph_1}
                onChange={(e) => updatePoint(index, "paragraph_1", e.target.value)}
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label>Paragraph 2</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => generateWithAI('point_paragraph_2', index)}
                  disabled={aiGenerating}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  {aiGenerating ? 'Generating...' : 'Use AI'}
                </Button>
              </div>
              <Textarea
                value={point.paragraph_2}
                onChange={(e) => updatePoint(index, "paragraph_2", e.target.value)}
              />
            </div>
          </>
        )}

        {/* Concept Tags */}
        {analysisType !== "concept" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                Linked Concepts
              </Label>
              <Popover open={conceptPickerOpen} onOpenChange={setConceptPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    <Plus className="w-3 h-3 mr-1" />
                    Add Concept
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-2" align="end">
                  <ScrollArea className="max-h-60">
                    <div className="space-y-0.5">
                      {concepts
                        .filter(c => !(point.concept_tags || []).includes(c.id))
                        .map(c => (
                          <button
                            key={c.id}
                            className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted transition-colors"
                            onClick={() => {
                              const current = point.concept_tags || [];
                              updatePoint(index, "concept_tags" as keyof Point, [...current, c.id]);
                              setConceptPickerOpen(false);
                            }}
                          >
                            <span className="font-medium">{c.title}</span>
                            {c.category && (
                              <span className="ml-1.5 text-xs text-muted-foreground">({c.category})</span>
                            )}
                          </button>
                        ))}
                      {concepts.filter(c => !(point.concept_tags || []).includes(c.id)).length === 0 && (
                        <p className="text-xs text-muted-foreground px-2 py-1">No more concepts available</p>
                      )}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>
            {(point.concept_tags || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(point.concept_tags || []).map(tagId => {
                  const concept = concepts.find(c => c.id === tagId);
                  if (!concept) return null;
                  return (
                    <div key={tagId} className="flex items-center gap-0.5">
                      <button
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 transition-colors"
                        onClick={() => setViewingConcept(concept)}
                      >
                        <BookOpen className="w-3 h-3" />
                        {concept.title}
                      </button>
                      <button
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        onClick={() => {
                          const current = point.concept_tags || [];
                          updatePoint(index, "concept_tags" as keyof Point, current.filter(id => id !== tagId));
                        }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <ConceptDetailDialog
          concept={viewingConcept}
          open={!!viewingConcept}
          onOpenChange={(open) => { if (!open) setViewingConcept(null); }}
        />

        {analysisType !== "concept" && (
          <div>
            <Label>Audio Commentary (Optional)</Label>
            <div className="mt-1">
              <AudioRecorder
                audioUrl={point.audio_url}
                onAudioChange={(url) => updatePoint(index, "audio_url" as keyof Point, url)}
              />
            </div>
          </div>
        )}

        <div>
          <Label>Images (Optional)</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => handleImageUpload(e, "point_image", index, true)}
            disabled={uploadingImage}
          />
          <div className="flex flex-wrap gap-2 sm:gap-4 mt-2">
            {point.images?.map((img, imgIndex) => (
              <div key={imgIndex} className="relative">
                <img
                  src={img}
                  alt={`Point ${index + 1} Image ${imgIndex + 1}`}
                  className="w-32 h-32 sm:w-48 sm:h-48 object-cover rounded shadow-lg"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 h-6 w-6 p-0"
                  onClick={() => removeImageFromPoint(index, imgIndex)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label>Videos (Optional - Add Multiple) — or drag and drop a video file here</Label>
          
          {/* Select from R90 clips if available */}
          {performanceReportClips.length > 0 && (
            <div className="mb-2">
              <Select
                value=""
                onValueChange={(value) => {
                  const currentVideos = point.video_urls || (point.video_url ? [point.video_url] : []);
                  updatePoint(index, "video_urls", [...currentVideos, value]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add from R90 clips..." />
                </SelectTrigger>
                <SelectContent>
                  {performanceReportClips
                    .filter(clip => clip.video_url)
                    .map((clip) => (
                      <SelectItem key={clip.id} value={clip.video_url!}>
                        <div className="flex items-center gap-2">
                          <Film className="w-3 h-3" />
                          <span>
                            {clip.action_type || 'Action'} #{clip.action_number}
                            {clip.minute ? ` (${clip.minute}')` : ''}
                          </span>
{clip.action_score !== undefined && clip.action_score !== null && (
                            <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-bold text-white ${getActionScoreBgColor(clip.action_score)}`}>
                              {clip.action_score}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Select from Video Analysis clips if available */}
          {videoAnalysisClips.length > 0 && (
            <div className="mb-2">
              <Select
                value=""
                onValueChange={(value) => {
                  const currentVideos = point.video_urls || (point.video_url ? [point.video_url] : []);
                  updatePoint(index, "video_urls", [...currentVideos, value]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add from Video Analysis clips..." />
                </SelectTrigger>
                <SelectContent>
                  {videoAnalysisClips.map((clip) => (
                    <SelectItem key={clip.id} value={`${clip.video_url}#t=${clip.start},${clip.end}`}>
                      <div className="flex items-center gap-2">
                        <Film className="w-3 h-3" />
                        <span className="truncate">
                          {clip.label}
                          {clip.action_type && <span className="ml-1 capitalize text-muted-foreground">({clip.action_type})</span>}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-1 shrink-0">
                          {Math.floor(clip.start / 60)}:{String(Math.floor(clip.start % 60)).padStart(2, '0')}
                          →
                          {Math.floor(clip.end / 60)}:{String(Math.floor(clip.end % 60)).padStart(2, '0')}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Input
            type="file"
            accept="video/*"
            onChange={(e) => handleVideoUploadForPoint(e, index)}
            disabled={uploadingImage}
          />
          <Input
            placeholder="Or paste video URL and press Enter..."
            className="mt-2"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const input = e.target as HTMLInputElement;
                if (input.value.trim()) {
                  const currentVideos = point.video_urls || (point.video_url ? [point.video_url] : []);
                  updatePoint(index, "video_urls", [...currentVideos, input.value.trim()]);
                  input.value = '';
                }
              }
            }}
          />
          
          {/* Display all videos */}
          {(point.video_urls?.length || point.video_url) && (
            <div className="mt-2 space-y-2">
              {(point.video_urls || (point.video_url ? [point.video_url] : [])).map((url, vidIndex) => (
                <VideoItem
                  key={vidIndex}
                  url={url}
                  pointIndex={index}
                  totalPoints={totalPoints}
                  existingAnnotationId={point.annotation_ids?.[url]}
                  onMoveToPoint={(targetIdx) => onMoveVideoToPoint(index, vidIndex, targetIdx)}
                  onAnnotationSaved={(annotationId) => {
                    const currentIds = point.annotation_ids || {};
                    updatePoint(index, "annotation_ids", { ...currentIds, [url]: annotationId });
                  }}
                  onRemove={() => {
                    const currentVideos = point.video_urls || (point.video_url ? [point.video_url] : []);
                    updatePoint(index, "video_urls", currentVideos.filter((_, i) => i !== vidIndex));
                  }}
                  onTrimComplete={(newUrl) => {
                    const currentVideos = [...(point.video_urls || (point.video_url ? [point.video_url] : []))];
                    currentVideos[vidIndex] = newUrl;
                    updatePoint(index, "video_urls", currentVideos);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export const AnalysisPointsSection = ({
  formData,
  setFormData,
  addPoint,
  removePoint,
  updatePoint,
  handleImageUpload,
  handleVideoUploadForPoint,
  removeImageFromPoint,
  uploadingImage,
  generateWithAI,
  aiGenerating,
  analysisType,
  defaultOpen = false,
  performanceReportClips = [],
  analysisId,
}: PointsSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [vaClips, setVaClips] = useState<VideoAnalysisClip[]>([]);
  const [concepts, setConcepts] = useState<CoachingConcept[]>([]);

  // Fetch coaching concepts
  useEffect(() => {
    const fetchConcepts = async () => {
      const { data } = await supabase
        .from("coaching_analysis")
        .select("id, title, content, description, category, attachments")
        .eq("analysis_type", "concept")
        .order("title");
      if (data) setConcepts(data as CoachingConcept[]);
    };
    fetchConcepts();
  }, []);

  // Fetch linked video analysis clips when analysisId is available
  useEffect(() => {
    if (!analysisId) { setVaClips([]); return; }
    const fetchVAClips = async () => {
      try {
        const { data: analysis } = await supabase
          .from("analyses")
          .select("linked_video_analysis_ids")
          .eq("id", analysisId)
          .single();

        const linkedIds = (analysis?.linked_video_analysis_ids || []) as string[];
        if (linkedIds.length === 0) { setVaClips([]); return; }

        const { data: vas } = await supabase
          .from("video_analyses")
          .select("id, title, video_url, clips")
          .in("id", linkedIds);

        if (vas) {
          const allClips: VideoAnalysisClip[] = [];
          for (const va of vas) {
            const clips = (va.clips as any as Array<any>) || [];
            for (const clip of clips) {
              allClips.push({
                id: clip.id,
                label: clip.label || clip.action_description || 'Clip',
                start: clip.start,
                end: clip.end,
                action_type: clip.action_type || '',
                video_url: va.video_url,
                video_title: va.title,
              });
            }
          }
          setVaClips(allClips);
        }
      } catch (err) {
        console.error('Error fetching VA clips:', err);
      }
    };
    fetchVAClips();
  }, [analysisId]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Use stable _id from each point, falling back to index
  const pointIds = (formData.points || []).map((p: any, index: number) => 
    p._id || `point-fallback-${index}`
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = pointIds.indexOf(active.id as string);
      const newIndex = pointIds.indexOf(over.id as string);

      const newPoints = arrayMove(formData.points || [], oldIndex, newIndex);
      setFormData({ ...formData, points: newPoints });
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
        <h3 className="font-semibold text-lg">{analysisType === "concept" ? "IMAGES" : "POINTS"}</h3>
        <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4 space-y-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={pointIds} strategy={verticalListSortingStrategy}>
            {formData.points?.map((point: Point, index: number) => (
              <SortablePointCard
                key={pointIds[index]}
                pointId={pointIds[index]}
                point={point}
                index={index}
                totalPoints={(formData.points || []).length}
                analysisType={analysisType}
                removePoint={removePoint}
                updatePoint={updatePoint}
                onMovePoint={(fromIdx, toIdx) => {
                  const newPoints = [...(formData.points || [])];
                  const [moved] = newPoints.splice(fromIdx, 1);
                  newPoints.splice(toIdx, 0, moved);
                  setFormData({ ...formData, points: newPoints });
                }}
                onMoveVideoToPoint={(fromPointIdx, videoIdx, toPointIdx) => {
                  const newPoints = JSON.parse(JSON.stringify(formData.points || []));
                  const fromVideos = newPoints[fromPointIdx].video_urls || (newPoints[fromPointIdx].video_url ? [newPoints[fromPointIdx].video_url] : []);
                  const [movedUrl] = fromVideos.splice(videoIdx, 1);
                  newPoints[fromPointIdx].video_urls = fromVideos;
                  // Migrate annotation_ids entry with the video
                  const fromIds = newPoints[fromPointIdx].annotation_ids || {};
                  if (fromIds[movedUrl]) {
                    const toIds = newPoints[toPointIdx].annotation_ids || {};
                    toIds[movedUrl] = fromIds[movedUrl];
                    delete fromIds[movedUrl];
                    newPoints[fromPointIdx].annotation_ids = fromIds;
                    newPoints[toPointIdx].annotation_ids = toIds;
                  }
                  const toVideos = newPoints[toPointIdx].video_urls || (newPoints[toPointIdx].video_url ? [newPoints[toPointIdx].video_url] : []);
                  toVideos.push(movedUrl);
                  newPoints[toPointIdx].video_urls = toVideos;
                  setFormData({ ...formData, points: newPoints });
                  toast.success(`Video moved to Point ${toPointIdx + 1}`);
                }}
                handleImageUpload={handleImageUpload}
                handleVideoUploadForPoint={handleVideoUploadForPoint}
                removeImageFromPoint={removeImageFromPoint}
                uploadingImage={uploadingImage}
                generateWithAI={generateWithAI}
                aiGenerating={aiGenerating}
                performanceReportClips={performanceReportClips}
                videoAnalysisClips={vaClips}
                concepts={concepts}
              />
            ))}
          </SortableContext>
        </DndContext>

        <Button onClick={addPoint} variant="outline" className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add {analysisType === "concept" ? "Images" : "Point"}
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
};