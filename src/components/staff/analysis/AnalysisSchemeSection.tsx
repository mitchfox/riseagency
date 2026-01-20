import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ChevronDown, Sparkles, RotateCcw } from "lucide-react";
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

interface StartingXIPlayer {
  name: string;
  shirt_number: string;
  position: string;
  x: number;
  y: number;
}

interface SchemeSectionProps {
  formData: any;
  setFormData: (data: any) => void;
  handleImageUpload: (event: React.ChangeEvent<HTMLInputElement>, field: string) => Promise<void>;
  uploadingImage: boolean;
  generateWithAI: (field: string, pointIndex?: number) => Promise<void>;
  aiGenerating: boolean;
  formationTemplates: Record<string, Array<{x: number, y: number, position: string}>>;
  applyFormation: (formation: string) => void;
  updatePlayer: (index: number, field: keyof StartingXIPlayer, value: string | number) => void;
  analysisType: "pre-match" | "post-match";
  defaultOpen?: boolean;
}

export const AnalysisSchemeSection = ({
  formData,
  setFormData,
  handleImageUpload,
  uploadingImage,
  generateWithAI,
  aiGenerating,
  formationTemplates,
  applyFormation,
  updatePlayer,
  analysisType,
  defaultOpen = false,
}: SchemeSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [selectedFormation, setSelectedFormation] = useState(formData.selected_scheme || "");
  const [activePlayerIndex, setActivePlayerIndex] = useState<number | null>(null);

  const formations = Object.keys(formationTemplates);

  const handleFormationChange = (formation: string) => {
    setSelectedFormation(formation);
    setFormData({ ...formData, selected_scheme: formation });
    applyFormation(formation);
  };

  const handlePitchClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activePlayerIndex === null) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    updatePlayer(activePlayerIndex, 'x', Math.round(x));
    updatePlayer(activePlayerIndex, 'y', Math.round(y));
    setActivePlayerIndex(null);
  };

  const getKitStyle = () => {
    const primary = formData.kit_primary_color || '#ffffff';
    const secondary = formData.kit_secondary_color || '#000000';
    const stripeStyle = formData.kit_stripe_style || 'solid';
    const collarColor = formData.kit_collar_color || secondary;
    
    let backgroundStyle: React.CSSProperties = { backgroundColor: primary };
    
    if (stripeStyle === 'thin') {
      backgroundStyle = {
        background: `repeating-linear-gradient(90deg, ${primary} 0px, ${primary} 3px, ${secondary} 3px, ${secondary} 6px)`
      };
    } else if (stripeStyle === 'thick') {
      backgroundStyle = {
        background: `repeating-linear-gradient(90deg, ${primary} 0px, ${primary} 8px, ${secondary} 8px, ${secondary} 16px)`
      };
    } else if (stripeStyle === 'halves') {
      backgroundStyle = {
        background: `linear-gradient(90deg, ${primary} 50%, ${secondary} 50%)`
      };
    }
    
    return { backgroundStyle, collarColor };
  };

  const { backgroundStyle, collarColor } = getKitStyle();

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
        <h3 className="font-semibold text-lg">TACTICAL SCHEME</h3>
        <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4 space-y-4">
        {/* Formation Selector */}
        <div>
          <Label>Formation</Label>
          <Select value={selectedFormation} onValueChange={handleFormationChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select formation" />
            </SelectTrigger>
            <SelectContent>
              {formations.map((formation) => (
                <SelectItem key={formation} value={formation}>
                  {formation}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Kit Customization */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Label>Primary Color</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={formData.kit_primary_color || '#ffffff'}
                onChange={(e) => setFormData({ ...formData, kit_primary_color: e.target.value })}
                className="w-12 h-10 p-1"
              />
              <Input
                value={formData.kit_primary_color || '#ffffff'}
                onChange={(e) => setFormData({ ...formData, kit_primary_color: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>
          <div>
            <Label>Secondary Color</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={formData.kit_secondary_color || '#000000'}
                onChange={(e) => setFormData({ ...formData, kit_secondary_color: e.target.value })}
                className="w-12 h-10 p-1"
              />
              <Input
                value={formData.kit_secondary_color || '#000000'}
                onChange={(e) => setFormData({ ...formData, kit_secondary_color: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>
          <div>
            <Label>Collar Color</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={formData.kit_collar_color || formData.kit_secondary_color || '#000000'}
                onChange={(e) => setFormData({ ...formData, kit_collar_color: e.target.value })}
                className="w-12 h-10 p-1"
              />
              <Input
                value={formData.kit_collar_color || formData.kit_secondary_color || '#000000'}
                onChange={(e) => setFormData({ ...formData, kit_collar_color: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>
          <div>
            <Label>Kit Style</Label>
            <Select 
              value={formData.kit_stripe_style || 'solid'} 
              onValueChange={(value) => setFormData({ ...formData, kit_stripe_style: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Solid</SelectItem>
                <SelectItem value="thin">Thin Stripes</SelectItem>
                <SelectItem value="thick">Thick Stripes</SelectItem>
                <SelectItem value="halves">Halves</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Kit Preview */}
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">Kit Preview:</div>
          <div className="relative w-12 h-16">
            {/* Shirt body */}
            <div 
              className="absolute inset-0 rounded-t-lg border-2 border-border"
              style={backgroundStyle}
            />
            {/* Collar */}
            <div 
              className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-2 rounded-b-sm"
              style={{ backgroundColor: collarColor }}
            />
          </div>
        </div>

        {/* Tactical Board */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>Tactical Board</Label>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setActivePlayerIndex(null)}
              disabled={activePlayerIndex === null}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Cancel Move
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {activePlayerIndex !== null 
              ? `Click on the pitch to move player ${activePlayerIndex + 1}` 
              : 'Click a player marker to select, then click the pitch to reposition'}
          </p>
          
          <div 
            className="relative w-full aspect-[68/105] bg-green-600 rounded-lg overflow-hidden cursor-crosshair"
            onClick={handlePitchClick}
          >
            {/* Pitch markings */}
            <div className="absolute inset-0 border-2 border-white/50" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-white/50" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/50 rounded-full" />
            
            {/* Penalty areas */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-44 h-16 border-2 border-t-0 border-white/50" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-44 h-16 border-2 border-b-0 border-white/50" />
            
            {/* Goal areas */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-6 border-2 border-t-0 border-white/50" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-6 border-2 border-b-0 border-white/50" />

            {/* Players */}
            {formData.starting_xi?.map((player: StartingXIPlayer, index: number) => (
              <div
                key={index}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all ${
                  activePlayerIndex === index ? 'scale-125 ring-2 ring-yellow-400' : 'hover:scale-110'
                }`}
                style={{ left: `${player.x}%`, top: `${player.y}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePlayerIndex(activePlayerIndex === index ? null : index);
                }}
              >
                {/* Kit marker */}
                <div 
                  className="w-8 h-10 rounded-t-lg border-2 border-white shadow-lg flex items-center justify-center"
                  style={backgroundStyle}
                >
                  <span className="text-xs font-bold text-white drop-shadow-lg">
                    {player.shirt_number || index + 1}
                  </span>
                </div>
                <div className="text-[10px] text-white text-center mt-0.5 font-medium drop-shadow-lg truncate max-w-16">
                  {player.name || player.position}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Player List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {formData.starting_xi?.map((player: StartingXIPlayer, index: number) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
              <span className="text-xs font-medium w-6">{index + 1}.</span>
              <Input
                value={player.name}
                onChange={(e) => updatePlayer(index, 'name', e.target.value)}
                placeholder="Name"
                className="flex-1 h-8 text-sm"
              />
              <Input
                value={player.shirt_number}
                onChange={(e) => updatePlayer(index, 'shirt_number', e.target.value)}
                placeholder="#"
                className="w-12 h-8 text-sm text-center"
              />
            </div>
          ))}
        </div>

        {/* Scheme Details */}
        <div>
          <div className="flex items-center justify-between">
            <Label>Scheme Title</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => generateWithAI('scheme_title')}
              disabled={aiGenerating}
            >
              <Sparkles className="w-3 h-3 mr-1" />
              {aiGenerating ? 'Generating...' : 'Use AI'}
            </Button>
          </div>
          <Input
            value={formData.scheme_title || ""}
            onChange={(e) => setFormData({ ...formData, scheme_title: e.target.value })}
            placeholder="e.g., High Press with Quick Transitions"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label>Paragraph 1</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => generateWithAI('scheme_paragraph_1')}
              disabled={aiGenerating}
            >
              <Sparkles className="w-3 h-3 mr-1" />
              {aiGenerating ? 'Generating...' : 'Use AI'}
            </Button>
          </div>
          <Textarea
            value={formData.scheme_paragraph_1 || ""}
            onChange={(e) => setFormData({ ...formData, scheme_paragraph_1: e.target.value })}
            placeholder="Describe the tactical approach..."
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label>Paragraph 2</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => generateWithAI('scheme_paragraph_2')}
              disabled={aiGenerating}
            >
              <Sparkles className="w-3 h-3 mr-1" />
              {aiGenerating ? 'Generating...' : 'Use AI'}
            </Button>
          </div>
          <Textarea
            value={formData.scheme_paragraph_2 || ""}
            onChange={(e) => setFormData({ ...formData, scheme_paragraph_2: e.target.value })}
            placeholder="Additional tactical details..."
          />
        </div>

        <div>
          <Label>Scheme Image (Optional)</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => handleImageUpload(e, "scheme_image_url")}
            disabled={uploadingImage}
          />
          {formData.scheme_image_url && (
            <img 
              src={formData.scheme_image_url} 
              alt="Scheme" 
              className="mt-2 max-w-xs rounded shadow"
            />
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
