import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, Plus, X, Crop, Sparkles, Settings } from "lucide-react";
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
import { useState, useEffect } from "react";
import { ImageCropDialog } from "../ImageCropDialog";

interface Matchup {
  name: string;
  shirt_number: string;
  image_url: string;
  notes?: string;
}

interface StrengthPoint {
  color: 'green' | 'amber' | 'red';
  text: string;
}

interface OverviewSectionProps {
  formData: any;
  setFormData: (data: any) => void;
  handleVideoUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleImageUpload: (event: React.ChangeEvent<HTMLInputElement>, field: string, pointIndex?: number, isMultiple?: boolean, matchupIndex?: number) => Promise<void>;
  uploadingImage: boolean;
  players: any[];
  selectedPlayerId: string;
  setSelectedPlayerId: (id: string) => void;
  performanceReports: any[];
  selectedPerformanceReportId: string;
  setSelectedPerformanceReportId: (id: string) => void;
  analysisType: "pre-match" | "post-match" | "concept";
  addMatchup?: () => void;
  removeMatchup?: (index: number) => void;
  updateMatchup?: (index: number, field: string, value: string) => void;
  defaultOpen?: boolean;
  generateOverviewWithAI?: () => Promise<void>;
  aiGenerating?: boolean;
  onOpenSettings?: (category: string) => void;
  spellCheckOn?: boolean;
}

export const AnalysisOverviewSection = ({
  formData,
  setFormData,
  handleVideoUpload,
  handleImageUpload,
  uploadingImage,
  players,
  selectedPlayerId,
  setSelectedPlayerId,
  performanceReports,
  selectedPerformanceReportId,
  setSelectedPerformanceReportId,
  analysisType,
  addMatchup,
  removeMatchup,
  updateMatchup,
  defaultOpen = false,
  generateOverviewWithAI,
  aiGenerating = false,
  onOpenSettings,
  spellCheckOn = false,
}: OverviewSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState("");
  const [cropMatchupIndex, setCropMatchupIndex] = useState<number | null>(null);

  // Strengths & Areas for Improvement logic
  const parseStrengthPoints = (): StrengthPoint[] => {
    if (formData.strength_points && Array.isArray(formData.strength_points)) {
      return formData.strength_points;
    }
    if (formData.strengths_improvements && typeof formData.strengths_improvements === 'string') {
      const parts = formData.strengths_improvements.split('|').map((p: string) => p.trim()).filter(Boolean);
      return parts.map((part: string) => {
        const match = part.match(/^(Green|Amber|Red):\s*(.*)$/i);
        if (match) {
          return { color: match[1].toLowerCase() as 'green' | 'amber' | 'red', text: match[2].trim() };
        }
        return { color: 'green' as const, text: part };
      });
    }
    return [];
  };

  const [strengthPoints, setStrengthPoints] = useState<StrengthPoint[]>(parseStrengthPoints);

  useEffect(() => {
    const parsed = parseStrengthPoints();
    if (JSON.stringify(parsed) !== JSON.stringify(strengthPoints)) {
      setStrengthPoints(parsed);
    }
  }, [formData.strengths_improvements, formData.strength_points]);

  const updateStrengthPoint = (index: number, field: 'color' | 'text', value: string) => {
    const updated = [...strengthPoints];
    updated[index] = { ...updated[index], [field]: value as any };
    setStrengthPoints(updated);
    const legacyFormat = updated.map(p => `${p.color.charAt(0).toUpperCase() + p.color.slice(1)}: ${p.text}`).join(' | ');
    setFormData({ ...formData, strengths_improvements: legacyFormat, strength_points: updated });
  };

  const addStrengthPoint = () => {
    const updated = [...strengthPoints, { color: 'green' as const, text: '' }];
    setStrengthPoints(updated);
    const legacyFormat = updated.map(p => `${p.color.charAt(0).toUpperCase() + p.color.slice(1)}: ${p.text}`).join(' | ');
    setFormData({ ...formData, strengths_improvements: legacyFormat, strength_points: updated });
  };

  const removeStrengthPoint = (index: number) => {
    const updated = strengthPoints.filter((_, i) => i !== index);
    setStrengthPoints(updated);
    const legacyFormat = updated.map(p => `${p.color.charAt(0).toUpperCase() + p.color.slice(1)}: ${p.text}`).join(' | ');
    setFormData({ ...formData, strengths_improvements: legacyFormat, strength_points: updated });
  };

  const getColorClass = (color: 'green' | 'amber' | 'red') => {
    switch (color) {
      case 'green': return 'bg-green-500';
      case 'amber': return 'bg-amber-500';
      case 'red': return 'bg-red-500';
    }
  };

  const handleMatchupImageSelect = (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setCropMatchupIndex(index);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (cropMatchupIndex === null) return;
    const file = new File([croppedBlob], `matchup-${cropMatchupIndex}.png`, { type: 'image/png' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    const syntheticEvent = { target: { files: dataTransfer.files } } as React.ChangeEvent<HTMLInputElement>;
    await handleImageUpload(syntheticEvent, "matchup_image", undefined, false, cropMatchupIndex);
  };

  const settingsCategory = analysisType === 'pre-match' ? 'pre-match' : 'post-match';

  return (
    <>
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
        <h3 className="font-semibold text-lg">OVERVIEW</h3>
        <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4 space-y-4">
        {/* Pre-match specific fields */}
        {analysisType === "pre-match" && (
          <>
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label>Key Details</Label>
                  {onOpenSettings && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => onOpenSettings(settingsCategory)}
                      title="Edit overview examples"
                    >
                      <Settings className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                {generateOverviewWithAI && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={generateOverviewWithAI}
                    disabled={aiGenerating}
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {aiGenerating ? 'Generating...' : 'Use AI'}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-1">
                AI will summarize points content in the style of your overview examples
              </p>
              <Textarea
                value={formData.key_details || ""}
                onChange={(e) => setFormData({ ...formData, key_details: e.target.value })}
                placeholder="Key tactical information about the match..."
                spellCheck={false}
                lang="en-GB"
              />
            </div>

            <div>
              <Label>Opposition Strengths</Label>
              <Textarea
                value={formData.opposition_strengths || ""}
                onChange={(e) => setFormData({ ...formData, opposition_strengths: e.target.value })}
                placeholder="• Strong aerial presence
• Fast counter attacks
• Set piece threat"
                spellCheck={false}
                lang="en-GB"
              />
            </div>

            <div>
              <Label>Opposition Weaknesses</Label>
              <Textarea
                value={formData.opposition_weaknesses || ""}
                onChange={(e) => setFormData({ ...formData, opposition_weaknesses: e.target.value })}
                placeholder="• Weak on the left flank
• Slow to transition
• Vulnerable to through balls"
                spellCheck={false}
                lang="en-GB"
              />
            </div>

            {addMatchup && removeMatchup && updateMatchup && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Matchups</Label>
                  <Button size="sm" onClick={addMatchup}>
                    <Plus className="w-4 h-4 mr-1" /> Add Matchup
                  </Button>
                </div>
                {formData.matchups?.map((matchup: Matchup, index: number) => (
                  <Card key={index} className="p-4 mb-2">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <Input
                          placeholder="Player Name"
                          value={matchup.name}
                          onChange={(e) => updateMatchup(index, "name", e.target.value)}
                        />
                        <Input
                          placeholder="Shirt Number"
                          value={matchup.shirt_number}
                          onChange={(e) => updateMatchup(index, "shirt_number", e.target.value)}
                        />
                        <div>
                          <Label className="text-xs flex items-center gap-1 mb-1">
                            Photo <Crop className="w-3 h-3" />
                          </Label>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleMatchupImageSelect(e, index)}
                            disabled={uploadingImage}
                          />
                          {matchup.image_url && (
                            <img src={matchup.image_url} alt="Matchup" className="mt-2 w-20 h-20 object-cover rounded" />
                          )}
                        </div>
                        <div>
                          <Label className="text-xs mb-1">Notes (brief intro to player)</Label>
                          <Textarea
                            placeholder="Brief introduction to this player..."
                            value={matchup.notes || ""}
                            onChange={(e) => updateMatchup(index, "notes", e.target.value)}
                            rows={2}
                            spellCheck={false}
                            lang="en-GB"
                          />
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeMatchup(index)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Post-match specific fields */}
        {analysisType === "post-match" && (
          <>
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label>Key Details</Label>
                  {onOpenSettings && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => onOpenSettings(settingsCategory)}
                      title="Edit overview examples"
                    >
                      <Settings className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                {generateOverviewWithAI && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={generateOverviewWithAI}
                    disabled={aiGenerating}
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {aiGenerating ? 'Generating...' : 'Use AI'}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-1">
                AI will summarize points content in the style of your overview examples
              </p>
              <Textarea
                value={formData.key_details || ""}
                onChange={(e) => setFormData({ ...formData, key_details: e.target.value })}
                spellCheck={false}
                lang="en-GB"
              />
            </div>

            {/* Strengths & Areas for Improvement */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Strengths & Areas For Improvement</Label>
                <Button variant="outline" size="sm" onClick={addStrengthPoint}>
                  <Plus className="w-3 h-3 mr-1" /> Add Point
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Green = Strength, Amber = Consistency, Red = Improvement
              </p>
              <div className="space-y-2">
                {strengthPoints.map((point, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {(['green', 'amber', 'red'] as const).map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => updateStrengthPoint(index, 'color', color)}
                          className={`w-6 h-6 rounded ${getColorClass(color)} ${
                            point.color === color ? 'ring-2 ring-offset-2 ring-foreground' : 'opacity-50 hover:opacity-75'
                          } transition-all`}
                        />
                      ))}
                    </div>
                    <Input
                      value={point.text}
                      onChange={(e) => updateStrengthPoint(index, 'text', e.target.value)}
                      placeholder="Enter point..."
                      className="flex-1"
                    />
                    {strengthPoints.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeStrengthPoint(index)}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {analysisType === "concept" && (
          <>
            <div>
              <Label>Concept</Label>
              <Input
                value={formData.concept || ""}
                onChange={(e) => setFormData({ ...formData, concept: e.target.value })}
                placeholder="What is this concept about?"
              />
            </div>
            <div>
              <Label>Explanation</Label>
              <Textarea
                value={formData.explanation || ""}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                placeholder="Detailed explanation of the concept..."
                rows={4}
                spellCheck={false}
                lang="en-GB"
              />
            </div>
          </>
        )}

        <div>
          <Label>Video URL (Optional)</Label>
          <Input
            value={formData.video_url || ""}
            onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
            placeholder="Video URL or upload below..."
          />
        </div>
        <div>
          <Label>Or Upload Video</Label>
          <Input
            type="file"
            accept="video/*"
            onChange={handleVideoUpload}
            disabled={uploadingImage}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>

    <ImageCropDialog
      open={cropDialogOpen}
      onOpenChange={setCropDialogOpen}
      imageSrc={cropImageSrc}
      onCropComplete={handleCropComplete}
      aspectRatio={1}
      title="Crop Matchup Image"
      showBackgroundRemoval={true}
    />
    </>
  );
};
