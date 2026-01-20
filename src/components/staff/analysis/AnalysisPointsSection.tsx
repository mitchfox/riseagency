import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, X, Sparkles, ChevronDown, Film, GripVertical } from "lucide-react";
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
import { useState } from "react";
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
}

interface PerformanceReportAction {
  id: string;
  video_url?: string;
  action_type?: string;
  action_number?: number;
  minute?: number;
  action_score?: number;
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

// Sortable Point Card Component
interface SortablePointCardProps {
  point: Point;
  index: number;
  pointId: string;
  analysisType: string;
  removePoint: (index: number) => void;
  updatePoint: (index: number, field: keyof Point, value: any) => void;
  handleImageUpload: (event: React.ChangeEvent<HTMLInputElement>, field: string, pointIndex?: number, isMultiple?: boolean) => Promise<void>;
  handleVideoUploadForPoint: (event: React.ChangeEvent<HTMLInputElement>, pointIndex: number) => Promise<void>;
  removeImageFromPoint: (pointIndex: number, imageIndex: number) => void;
  uploadingImage: boolean;
  generateWithAI: (field: string, pointIndex?: number) => Promise<void>;
  aiGenerating: boolean;
  performanceReportClips: PerformanceReportAction[];
}

const SortablePointCard = ({
  point,
  index,
  pointId,
  analysisType,
  removePoint,
  updatePoint,
  handleImageUpload,
  handleVideoUploadForPoint,
  removeImageFromPoint,
  uploadingImage,
  generateWithAI,
  aiGenerating,
  performanceReportClips,
}: SortablePointCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pointId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} className="p-4">
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
          <Label>Videos (Optional - Add Multiple)</Label>
          
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
                <div key={vidIndex} className="relative">
                  <video 
                    src={url} 
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="max-w-xs rounded"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-1 right-1 h-6 w-6 p-0"
                    onClick={() => {
                      const currentVideos = point.video_urls || (point.video_url ? [point.video_url] : []);
                      updatePoint(index, "video_urls", currentVideos.filter((_, i) => i !== vidIndex));
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
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
}: PointsSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Generate stable IDs for points
  const pointIds = (formData.points || []).map((_: Point, index: number) => `point-${index}`);

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
                analysisType={analysisType}
                removePoint={removePoint}
                updatePoint={updatePoint}
                handleImageUpload={handleImageUpload}
                handleVideoUploadForPoint={handleVideoUploadForPoint}
                removeImageFromPoint={removeImageFromPoint}
                uploadingImage={uploadingImage}
                generateWithAI={generateWithAI}
                aiGenerating={aiGenerating}
                performanceReportClips={performanceReportClips}
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