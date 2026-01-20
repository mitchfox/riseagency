import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, X, Sparkles, ChevronDown, Film } from "lucide-react";
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

interface Point {
  title: string;
  paragraph_1: string;
  paragraph_2: string;
  images: string[];
  video_url?: string;
}

interface PerformanceReportAction {
  id: string;
  video_url?: string;
  action_type?: string;
  action_number?: number;
  minute?: number;
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

  const handleSelectClip = (pointIndex: number, clipUrl: string) => {
    updatePoint(pointIndex, "video_url", clipUrl);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
        <h3 className="font-semibold text-lg">{analysisType === "concept" ? "IMAGES" : "POINTS"}</h3>
        <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4 space-y-4">
        {formData.points?.map((point: Point, index: number) => (
          <Card key={index} className="p-4">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <h4 className="font-medium">
                  {analysisType === "concept" ? `Image Set ${index + 1}` : `Point ${index + 1}`}
                </h4>
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
                <Label>Video (Optional)</Label>
                
                {/* Select from R90 clips if available */}
                {performanceReportClips.length > 0 && (
                  <div className="mb-2">
                    <Select
                      value=""
                      onValueChange={(value) => handleSelectClip(index, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select from R90 clips..." />
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
                  value={point.video_url || ""}
                  onChange={(e) => updatePoint(index, "video_url", e.target.value)}
                  placeholder="Or paste video URL..."
                  className="mt-2"
                />
                {point.video_url && (
                  <video 
                    src={point.video_url} 
                    controls 
                    muted
                    className="mt-2 max-w-xs rounded"
                  />
                )}
              </div>
            </div>
          </Card>
        ))}

        <Button onClick={addPoint} variant="outline" className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add {analysisType === "concept" ? "Images" : "Point"}
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
};
