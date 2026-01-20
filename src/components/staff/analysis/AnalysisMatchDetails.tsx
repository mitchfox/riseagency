import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, X, Crop } from "lucide-react";
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
import { useState, useRef } from "react";
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
    if (formData.strength_points && Array.isArray(formData.strength_points)) {
      return formData.strength_points;
    }
    // Default to 3 empty points
    return [
      { color: 'green', text: '' },
      { color: 'amber', text: '' },
      { color: 'red', text: '' }
    ];
  };

  const [strengthPoints, setStrengthPoints] = useState<StrengthPoint[]>(parseStrengthPoints);

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

  return (
    <>
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
        <h3 className="font-semibold text-lg">MATCH DETAILS</h3>
        <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4 space-y-4">
        {/* Link to Player/Performance Report - for post-match only */}
        {showPlayerLinking && analysisType === "post-match" && (
          <>
            <div>
              <Label>Link to Player</Label>
              <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a player..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No player link</SelectItem>
                  {players.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPlayerId && selectedPlayerId !== "none" && performanceReports.length > 0 && (
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
          </>
        )}

        {/* Title - shared for both types */}
        <div>
          <Label>Title</Label>
          <Input
            value={formData.title || ""}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Analysis title..."
          />
        </div>

        {/* Video URL and Upload */}
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
          <Input type="file" accept="video/*" onChange={handleVideoUpload} disabled={uploadingImage} />
        </div>

        {analysisType === "pre-match" ? (
          <>
            <div>
              <Label>Match Date</Label>
              <Input
                type="date"
                value={formData.match_date || ""}
                onChange={(e) => setFormData({ ...formData, match_date: e.target.value })}
              />
            </div>

            {/* Teams on one line */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Home Team</Label>
                <Input
                  value={formData.home_team || ""}
                  onChange={(e) => setFormData({ ...formData, home_team: e.target.value })}
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

            {/* Player's Team Selector for transparency */}
            <div>
              <Label>Player's Team (Full Opacity)</Label>
              <p className="text-xs text-muted-foreground mb-2">The other team will appear at 70% opacity</p>
              <Select
                value={formData.player_team || ""}
                onValueChange={(value) => setFormData({ ...formData, player_team: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select player's team" />
                </SelectTrigger>
                <SelectContent>
                  {formData.home_team && (
                    <SelectItem value="home">{formData.home_team} (Home)</SelectItem>
                  )}
                  {formData.away_team && (
                    <SelectItem value="away">{formData.away_team} (Away)</SelectItem>
                  )}
                </SelectContent>
              </Select>
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
            {/* Player Name - stored directly on analysis for display */}
            <div>
              <Label>Player Name (for display)</Label>
              <Input
                value={formData.player_name || ""}
                onChange={(e) => setFormData({ ...formData, player_name: e.target.value })}
                placeholder="Enter player's full name (e.g. JAROSLAV SVOBODA)..."
              />
              <p className="text-xs text-muted-foreground mt-1">This name will appear below the player image</p>
            </div>

            <div>
              <Label>Player Image (Optional)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, "player_image_url")}
                disabled={uploadingImage}
              />
              {formData.player_image_url && (
                <img src={formData.player_image_url} alt="Player" className="mt-2 w-32 h-32 object-cover rounded" />
              )}
            </div>

            {/* Match Image with crop/position support - limited to 250px height */}
            <div>
              <Label className="flex items-center gap-1">
                Match Image
                <Crop className="w-3 h-3" />
              </Label>
              <p className="text-xs text-muted-foreground mb-1">Wide format (16:9) - limited to 250px height in viewer</p>
              <Input
                type="file"
                accept="image/*"
                ref={matchImageInputRef}
                onChange={(e) => handleLogoFileSelect(e, "match_image_url")}
                disabled={uploadingImage}
              />
              {formData.match_image_url && (
                <img src={formData.match_image_url} alt="Match" className="mt-2 w-full max-h-40 object-cover rounded" />
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
                  onChange={(e) => setFormData({ ...formData, home_score: parseInt(e.target.value) || undefined })}
                  className="text-center"
                />
              </div>
              <div>
                <Label>Score</Label>
                <Input
                  type="number"
                  value={formData.away_score ?? ""}
                  onChange={(e) => setFormData({ ...formData, away_score: parseInt(e.target.value) || undefined })}
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

            {/* Strengths & Areas for Improvement */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Strengths & Areas For Improvement</Label>
                <Button variant="outline" size="sm" onClick={addStrengthPoint}>
                  <Plus className="w-3 h-3 mr-1" /> Add Point
                </Button>
              </div>
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
