import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, X, Crop, ArrowLeftRight } from "lucide-react";
import { sortPlayersByRepresentation, getStatusLabel } from "@/lib/playerSorting";
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
import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { ImageCropDialog } from "../ImageCropDialog";

interface StrengthPoint {
  color: 'green' | 'amber' | 'red';
  text: string;
}

interface MatchDetailsProps {
  formData: any;
  setFormData: (data: any) => void;
  handleImageUpload: (event: React.ChangeEvent<HTMLInputElement>, field: string, pointIndex?: number, isMultiple?: boolean, matchupIndex?: number) => Promise<void>;
  handleVideoUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  uploadingImage: boolean;
  analysisType: "pre-match" | "post-match";
  players: any[];
  selectedPlayerId: string;
  setSelectedPlayerId: (id: string) => void;
  performanceReports: any[];
  selectedPerformanceReportId: string;
  setSelectedPerformanceReportId: (id: string) => void;
  defaultOpen?: boolean;
  showPlayerLinking?: boolean;
  taggedPlayerIds: string[];
  setTaggedPlayerIds: (ids: string[]) => void;
  defaultPlayerId?: string;
}

export const AnalysisMatchDetails = ({
  formData,
  setFormData,
  handleImageUpload,
  handleVideoUpload,
  uploadingImage,
  analysisType,
  players,
  selectedPlayerId,
  setSelectedPlayerId,
  performanceReports,
  selectedPerformanceReportId,
  setSelectedPerformanceReportId,
  defaultOpen = false,
  showPlayerLinking = false,
  taggedPlayerIds,
  setTaggedPlayerIds,
  defaultPlayerId,
}: MatchDetailsProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Crop dialog state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState("");
  const [cropField, setCropField] = useState("");
  const homeLogoInputRef = useRef<HTMLInputElement>(null);
  const awayLogoInputRef = useRef<HTMLInputElement>(null);
  const matchImageInputRef = useRef<HTMLInputElement>(null);

  const handleLogoFileSelect = (event: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setCropField(field);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);

    // Reset input so the same file can be selected again
    event.target.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    // Create a synthetic event with the cropped blob as a file
    const file = new File([croppedBlob], `cropped-${cropField}.png`, { type: 'image/png' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    // Create a minimal synthetic event
    const syntheticEvent = {
      target: { files: dataTransfer.files }
    } as React.ChangeEvent<HTMLInputElement>;

    await handleImageUpload(syntheticEvent, cropField);
  };

  const parseStrengthPoints = (): StrengthPoint[] => {
    // First check for the array format
    if (formData.strength_points && Array.isArray(formData.strength_points)) {
      return formData.strength_points;
    }
    
    // Parse from legacy string format (e.g., "Green: text | Amber: text")
    if (formData.strengths_improvements && typeof formData.strengths_improvements === 'string') {
      const parts = formData.strengths_improvements.split('|').map((p: string) => p.trim()).filter(Boolean);
      return parts.map((part: string) => {
        const match = part.match(/^(Green|Amber|Red):\s*(.*)$/i);
        if (match) {
          return {
            color: match[1].toLowerCase() as 'green' | 'amber' | 'red',
            text: match[2].trim()
          };
        }
        return { color: 'green' as const, text: part };
      });
    }
    
    // Default to empty array
    return [];
  };

  const [strengthPoints, setStrengthPoints] = useState<StrengthPoint[]>(parseStrengthPoints);
  
  // Update strengthPoints when formData changes (e.g., when loading an existing analysis)
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

    // Convert to legacy format for saving
    const legacyFormat = updated.map(p => `${p.color.charAt(0).toUpperCase() + p.color.slice(1)}: ${p.text}`).join(' | ');
    setFormData({ ...formData, strengths_improvements: legacyFormat, strength_points: updated });
  };

  const addStrengthPoint = () => {
    const updated = [...strengthPoints, { color: 'green' as const, text: '' }];
    setStrengthPoints(updated);
    setFormData({ ...formData, strength_points: updated });
  };

  const removeStrengthPoint = (index: number) => {
    const updated = strengthPoints.filter((_, i) => i !== index);
    setStrengthPoints(updated);
    const legacyFormat = updated.map(p => `${p.color.charAt(0).toUpperCase() + p.color.slice(1)}: ${p.text}`).join(' | ');
    setFormData({ ...formData, strengths_improvements: legacyFormat, strength_points: updated });
  };

  const getColorClass = (color: string) => {
    switch (color) {
      case 'green': return 'bg-green-500';
      case 'amber': return 'bg-amber-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  useEffect(() => {
    if (defaultPlayerId) {
      if (selectedPlayerId !== defaultPlayerId) {
        setSelectedPlayerId(defaultPlayerId);
      }
      return;
    }

    const primaryTaggedPlayerId = taggedPlayerIds[0] || "none";
    if (selectedPlayerId !== primaryTaggedPlayerId) {
      setSelectedPlayerId(primaryTaggedPlayerId);
      if (!primaryTaggedPlayerId || primaryTaggedPlayerId === "none") {
        setSelectedPerformanceReportId("none");
      }
    }
  }, [defaultPlayerId, taggedPlayerIds, selectedPlayerId, setSelectedPlayerId, setSelectedPerformanceReportId]);

  return (
    <>
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
        <h3 className="font-semibold text-lg">MATCH DETAILS</h3>
        <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4 space-y-4">
        {/* Performance report linking (uses first tagged player) - for post-match only */}
        {showPlayerLinking && analysisType === "post-match" && selectedPlayerId && selectedPlayerId !== "none" && performanceReports.length > 0 && (
          <div>
            <Label>Link to Performance Report (R90)</Label>
            <Select value={selectedPerformanceReportId} onValueChange={setSelectedPerformanceReportId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a performance report..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No report link</SelectItem>
                {performanceReports.map((report) => (
                  <SelectItem key={report.id} value={report.id}>
                    {report.opponent} - {new Date(report.analysis_date).toLocaleDateString()}
                    {report.r90_score ? ` (R90: ${report.r90_score})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Tag Players */}
        <div>
          <Label>Tag Players (visible on their portal)</Label>
          <Select
            value=""
            onValueChange={(playerId) => {
              if (!taggedPlayerIds.includes(playerId)) {
                setTaggedPlayerIds([...taggedPlayerIds, playerId]);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select players to tag..." />
            </SelectTrigger>
            <SelectContent>
              {sortPlayersByRepresentation(players)
                .filter((p: any) => !taggedPlayerIds.includes(p.id))
                .map((player: any) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name}
                    {player.representation_status && player.representation_status !== 'other' && (
                      <span className="text-xs text-muted-foreground ml-1">({getStatusLabel(player.representation_status)})</span>
                    )}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {taggedPlayerIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {taggedPlayerIds.map(id => {
                const player = players.find(p => p.id === id);
                return (
                  <span key={id} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-primary/10 text-primary border border-primary/20">
                    {player?.name || 'Unknown'}
                    <button
                      type="button"
                      onClick={() => setTaggedPlayerIds(taggedPlayerIds.filter(pid => pid !== id))}
                      className="hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Title - shared for both types */}
        <div>
          <Label>Title</Label>
          <Input
            value={formData.title || ""}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Analysis title..."
          />
        </div>

        {analysisType === "pre-match" ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Match Date</Label>
                <Input
                  type="date"
                  value={formData.match_date || ""}
                  onChange={(e) => setFormData({ ...formData, match_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Kick-off Time</Label>
                <Input
                  type="time"
                  value={formData.match_time || ""}
                  onChange={(e) => setFormData({ ...formData, match_time: e.target.value })}
                  placeholder="HH:MM"
                />
              </div>
            </div>

            {/* Teams on one line with swap */}
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
              <div>
                <Label>Home Team</Label>
                <Input
                  value={formData.home_team || ""}
                  onChange={(e) => setFormData({ ...formData, home_team: e.target.value })}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 mb-0.5"
                title="Swap home and away"
                onClick={() => setFormData({
                  ...formData,
                  home_team: formData.away_team || "",
                  away_team: formData.home_team || "",
                  home_team_logo: formData.away_team_logo || "",
                  away_team_logo: formData.home_team_logo || "",
                  home_team_bg_color: formData.away_team_bg_color || "",
                  away_team_bg_color: formData.home_team_bg_color || "",
                  home_score: formData.away_score,
                  away_score: formData.home_score,
                })}
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
              <div>
                <Label>Away Team</Label>
                <Input
                  value={formData.away_team || ""}
                  onChange={(e) => setFormData({ ...formData, away_team: e.target.value })}
                />
              </div>
            </div>


            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-1">
                  Home Team Logo
                  <Crop className="w-3 h-3" />
                </Label>
                <p className="text-xs text-muted-foreground mb-1">Click to upload & crop</p>
                <Input
                  type="file"
                  accept="image/*"
                  ref={homeLogoInputRef}
                  onChange={(e) => handleLogoFileSelect(e, "home_team_logo")}
                  disabled={uploadingImage}
                />
                {formData.home_team_logo && (
                  <img src={formData.home_team_logo} alt="Home logo" className="mt-2 w-16 h-16 object-contain" />
                )}
              </div>
              <div>
                <Label className="flex items-center gap-1">
                  Away Team Logo
                  <Crop className="w-3 h-3" />
                </Label>
                <p className="text-xs text-muted-foreground mb-1">Click to upload & crop</p>
                <Input
                  type="file"
                  accept="image/*"
                  ref={awayLogoInputRef}
                  onChange={(e) => handleLogoFileSelect(e, "away_team_logo")}
                  disabled={uploadingImage}
                />
                {formData.away_team_logo && (
                  <img src={formData.away_team_logo} alt="Away logo" className="mt-2 w-16 h-16 object-contain" />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Home Team Background Color</Label>
                <p className="text-xs text-muted-foreground mb-1">Background color for home team sections</p>
                <Input
                  type="color"
                  value={formData.home_team_bg_color || "#1a1a1a"}
                  onChange={(e) => setFormData({ ...formData, home_team_bg_color: e.target.value })}
                />
              </div>
              <div>
                <Label>Away Team Background Color</Label>
                <p className="text-xs text-muted-foreground mb-1">Background color for opposition sections</p>
                <Input
                  type="color"
                  value={formData.away_team_bg_color || "#1a1a1a"}
                  onChange={(e) => setFormData({ ...formData, away_team_bg_color: e.target.value })}
                />
              </div>
            </div>

            {/* Match Image for pre-match */}
            <div>
              <Label className="flex items-center gap-1">
                Match Image
                <Crop className="w-3 h-3" />
              </Label>
              <p className="text-xs text-muted-foreground mb-1">Square format (1:1) - appears in match header</p>
              <Input
                type="file"
                accept="image/*"
                ref={matchImageInputRef}
                onChange={(e) => handleLogoFileSelect(e, "match_image_url")}
                disabled={uploadingImage}
              />
              {formData.match_image_url && (
                <img src={formData.match_image_url} alt="Match" className="mt-2 w-32 h-32 object-cover rounded" />
              )}
            </div>
          </>
        ) : (
          <>
            <div>
              <Label>Match Date</Label>
              <Input
                type="date"
                value={formData.match_date || ""}
                onChange={(e) => setFormData({ ...formData, match_date: e.target.value })}
              />
            </div>

            {/* Match Image - single unified field */}
            <div>
              <Label className="flex items-center gap-1">
                Match / Player Image
                <Crop className="w-3 h-3" />
              </Label>
              <p className="text-xs text-muted-foreground mb-1">Square format (1:1) - appears in match header with gold arch</p>
              <Input
                type="file"
                accept="image/*"
                ref={matchImageInputRef}
                onChange={(e) => handleLogoFileSelect(e, "match_image_url")}
                disabled={uploadingImage}
              />
              {formData.match_image_url && (
                <img src={formData.match_image_url} alt="Match" className="mt-2 w-32 h-32 object-cover rounded" />
              )}
            </div>

            {/* Teams and Score all on one line */}
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label>Home Team</Label>
                <Input
                  value={formData.home_team || ""}
                  onChange={(e) => setFormData({ ...formData, home_team: e.target.value })}
                />
              </div>
              <div>
                <Label>Score</Label>
                <Input
                  type="number"
                  value={formData.home_score ?? ""}
                  onChange={(e) => setFormData({ ...formData, home_score: e.target.value === "" ? undefined : parseInt(e.target.value) })}
                  className="text-center"
                />
              </div>
              <div>
                <Label>Score</Label>
                <Input
                  type="number"
                  value={formData.away_score ?? ""}
                  onChange={(e) => setFormData({ ...formData, away_score: e.target.value === "" ? undefined : parseInt(e.target.value) })}
                  className="text-center"
                />
              </div>
              <div>
                <Label>Away Team</Label>
                <Input
                  value={formData.away_team || ""}
                  onChange={(e) => setFormData({ ...formData, away_team: e.target.value })}
                />
              </div>
            </div>

            {/* Team Logos */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-1">
                  Home Team Logo
                  <Crop className="w-3 h-3" />
                </Label>
                <p className="text-xs text-muted-foreground mb-1">Click to upload & crop</p>
                <Input
                  type="file"
                  accept="image/*"
                  ref={homeLogoInputRef}
                  onChange={(e) => handleLogoFileSelect(e, "home_team_logo")}
                  disabled={uploadingImage}
                />
                {formData.home_team_logo && (
                  <img src={formData.home_team_logo} alt="Home logo" className="mt-2 w-16 h-16 object-contain" />
                )}
              </div>
              <div>
                <Label className="flex items-center gap-1">
                  Away Team Logo
                  <Crop className="w-3 h-3" />
                </Label>
                <p className="text-xs text-muted-foreground mb-1">Click to upload & crop</p>
                <Input
                  type="file"
                  accept="image/*"
                  ref={awayLogoInputRef}
                  onChange={(e) => handleLogoFileSelect(e, "away_team_logo")}
                  disabled={uploadingImage}
                />
                {formData.away_team_logo && (
                  <img src={formData.away_team_logo} alt="Away logo" className="mt-2 w-16 h-16 object-contain" />
                )}
              </div>
            </div>

            {/* Background Colors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Home Team Background Color</Label>
                <p className="text-xs text-muted-foreground mb-1">Background color for home team sections</p>
                <Input
                  type="color"
                  value={formData.home_team_bg_color || "#1a1a1a"}
                  onChange={(e) => setFormData({ ...formData, home_team_bg_color: e.target.value })}
                />
              </div>
              <div>
                <Label>Away Team Background Color</Label>
                <p className="text-xs text-muted-foreground mb-1">Background color for opposition sections</p>
                <Input
                  type="color"
                  value={formData.away_team_bg_color || "#1a1a1a"}
                  onChange={(e) => setFormData({ ...formData, away_team_bg_color: e.target.value })}
                />
              </div>
            </div>
          </>
        )}
      </CollapsibleContent>
    </Collapsible>

    {/* Image Crop Dialog - flexible for logos, 16:9 for match images */}
    <ImageCropDialog
      open={cropDialogOpen}
      onOpenChange={setCropDialogOpen}
      imageSrc={cropImageSrc}
      onCropComplete={handleCropComplete}
      aspectRatio={cropField === "match_image_url" ? (analysisType === "pre-match" ? 1 : 16/9) : undefined}
      title={cropField === "match_image_url" ? "Crop Match Image" : "Crop Team Logo"}
      showBackgroundRemoval={cropField !== "match_image_url"}
      cropHeight={cropField === "match_image_url" && analysisType === "post-match" ? 250 : undefined}
    />
    </>
  );
};
