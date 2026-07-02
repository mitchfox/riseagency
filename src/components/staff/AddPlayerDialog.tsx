import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ImageIcon, X, Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { PLAYER_POSITIONS } from "@/lib/playerPositions";

interface AddPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: (e: React.FormEvent, data?: any) => void;
  imageFile: File | null;
  imagePreview: string | null;
  clubLogoFile: File | null;
  clubLogoPreview: string | null;
  hoverImageFile: File | null;
  hoverImagePreview: string | null;
  handleImageSelect: (file: File) => void;
  handleRemoveImage: () => void;
  handleClubLogoSelect: (file: File) => void;
  handleRemoveClubLogo: () => void;
  handleHoverImageSelect: (file: File) => void;
  handleRemoveHoverImage: () => void;
}

export const AddPlayerDialog = ({
  open,
  onOpenChange,
  formData: externalFormData,
  setFormData: externalSetFormData,
  onSubmit: externalOnSubmit,
  imageFile,
  imagePreview,
  clubLogoFile,
  clubLogoPreview,
  hoverImageFile,
  hoverImagePreview,
  handleImageSelect,
  handleRemoveImage,
  handleClubLogoSelect,
  handleRemoveClubLogo,
  handleHoverImageSelect,
  handleRemoveHoverImage,
}: AddPlayerDialogProps) => {
  // Local state mirror so per-keystroke typing does NOT re-render the parent
  // (which mounts 900+ player rows). On submit we flush back to the parent
  // and pass the latest data directly via onSubmit so the parent doesn't
  // need to wait for a re-render to read it.
  const [formData, setFormData] = useState<any>(externalFormData);

  // Reset local state whenever the dialog opens (parent has just primed
  // externalFormData with the player being edited, or with empty defaults).
  useEffect(() => {
    if (open) setFormData(externalFormData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Sync image-related fields from parent (handleRemoveImage / Logo / Hover
  // and post-upload URL assignments live in the parent).
  useEffect(() => {
    setFormData((prev: any) => ({
      ...prev,
      image_url: externalFormData.image_url,
      club_logo: externalFormData.club_logo,
      hover_image_url: externalFormData.hover_image_url,
    }));
  }, [externalFormData.image_url, externalFormData.club_logo, externalFormData.hover_image_url]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    externalSetFormData(formData);
    externalOnSubmit(e, formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] w-[98vw] sm:w-[95vw] p-3 sm:p-6">
        <DialogHeader className="pb-2 sm:pb-4">
          <DialogTitle className="text-base sm:text-lg">Add New Player</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[calc(95vh-100px)] sm:h-[calc(90vh-120px)] pr-2 sm:pr-4">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="flex w-full overflow-x-auto overflow-y-hidden scrollbar-hide gap-1 h-auto p-1 bg-muted rounded-md mb-4">
                <TabsTrigger value="basic" className="flex-shrink-0 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">Basic</TabsTrigger>
                <TabsTrigger value="career" className="flex-shrink-0 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">Career</TabsTrigger>
                <TabsTrigger value="bio" className="flex-shrink-0 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">Bio</TabsTrigger>
                <TabsTrigger value="tactical" className="flex-shrink-0 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">Schemes</TabsTrigger>
                <TabsTrigger value="stats" className="flex-shrink-0 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">Stats</TabsTrigger>
                <TabsTrigger value="links" className="flex-shrink-0 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">Links</TabsTrigger>
              </TabsList>

              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-3 sm:space-y-4 pt-2">
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="name" className="text-sm">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="h-10 sm:h-11"
                    />
                  </div>
                  
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="email" className="text-sm">Email / Username</Label>
                    <Input
                      id="email"
                      type="text"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Email or username"
                      className="h-10 sm:h-11"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="position" className="text-sm">Position *</Label>
                    <Select
                      value={formData.position || ''}
                      onValueChange={(value) => setFormData({ ...formData, position: value })}
                    >
                      <SelectTrigger id="position" className="h-10 sm:h-11">
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLAYER_POSITIONS.map((code) => (
                          <SelectItem key={code} value={code}>{code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="age" className="text-sm">Age *</Label>
                      <Input
                        id="age"
                        type="number"
                        value={formData.age}
                        onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                        required
                        className="h-10 sm:h-11"
                      />
                    </div>
                    
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="nationality" className="text-sm">Nationality *</Label>
                      <Input
                        id="nationality"
                        value={formData.nationality}
                        onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                        required
                        className="h-10 sm:h-11"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="dateOfBirth" className="text-sm">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth || ''}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="h-10 sm:h-11"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="whatsapp" className="text-sm">WhatsApp Number</Label>
                    <Input
                      id="whatsapp"
                      value={formData.whatsapp || ''}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                      placeholder="+1234567890"
                      className="h-10 sm:h-11"
                    />
                  </div>
                </div>

                {/* Player Image */}
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="image_url" className="text-sm">Player Image</Label>
                  <div className="flex flex-col gap-3">
                    <Input
                      id="image_url"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="https://example.com/player.jpg or upload below"
                      className="h-10 sm:h-11 text-sm"
                    />
                    <div className="flex items-center gap-3">
                      <Label 
                        htmlFor="image_upload" 
                        className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md cursor-pointer hover:bg-secondary/80 transition-colors text-sm"
                      >
                        <ImageIcon className="w-4 h-4" />
                        Upload Image
                      </Label>
                      <input
                        id="image_upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageSelect(file);
                        }}
                        className="hidden"
                      />
                      {(imagePreview || formData.image_url) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveImage}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Clear
                        </Button>
                      )}
                    </div>
                    {(imagePreview || formData.image_url) && (
                      <div className="relative w-32 h-32 border rounded-md overflow-hidden">
                        <img 
                          src={imagePreview || formData.image_url} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Hover Image */}
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="hover_image_url" className="text-sm">Hover Image (Transparent Background)</Label>
                  <div className="flex flex-col gap-3">
                    <Input
                      id="hover_image_url"
                      value={formData.hover_image_url}
                      onChange={(e) => setFormData({ ...formData, hover_image_url: e.target.value })}
                      placeholder="https://example.com/player-transparent.png or upload below"
                      className="h-10 sm:h-11 text-sm"
                    />
                    <div className="flex items-center gap-3">
                      <Label 
                        htmlFor="hover_image_upload" 
                        className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md cursor-pointer hover:bg-secondary/80 transition-colors text-sm"
                      >
                        <ImageIcon className="w-4 h-4" />
                        Upload Hover Image
                      </Label>
                      <input
                        id="hover_image_upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleHoverImageSelect(file);
                        }}
                        className="hidden"
                      />
                      {(hoverImagePreview || formData.hover_image_url) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveHoverImage}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Clear
                        </Button>
                      )}
                    </div>
                    {(hoverImagePreview || formData.hover_image_url) && (
                      <div className="relative w-32 h-32 border rounded-md overflow-hidden bg-muted/50">
                        <img 
                          src={hoverImagePreview || formData.hover_image_url} 
                          alt="Hover Preview" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="representation_status" className="text-sm">Representation Status *</Label>
                    <Select
                      value={formData.representation_status}
                      onValueChange={(value) => setFormData({ ...formData, representation_status: value })}
                    >
                      <SelectTrigger className="h-10 sm:h-11">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="represented">Represented</SelectItem>
                        <SelectItem value="fuel_for_football">Fuel For Football</SelectItem>
                        <SelectItem value="mandated">Mandated</SelectItem>
                        <SelectItem value="previously_mandated">Previously Mandated</SelectItem>
                        <SelectItem value="scouted">Scouted</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="visible_on_stars_page"
                    checked={formData.visible_on_stars_page}
                    onChange={(e) => setFormData({ ...formData, visible_on_stars_page: e.target.checked })}
                    className="h-5 w-5 sm:h-4 sm:w-4"
                  />
                  <Label htmlFor="visible_on_stars_page" className="text-sm cursor-pointer">Visible on Stars Page</Label>
                </div>
              </TabsContent>

              {/* Career Info Tab */}
              <TabsContent value="career" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="club">Current Club</Label>
                  <Input
                    id="club"
                    value={formData.club}
                    onChange={(e) => setFormData({ ...formData, club: e.target.value })}
                    placeholder="e.g., FC Barcelona"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="club_logo">Club Logo</Label>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <Label 
                        htmlFor="club_logo_upload" 
                        className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md cursor-pointer hover:bg-secondary/80 transition-colors text-sm"
                      >
                        <ImageIcon className="w-4 h-4" />
                        Upload Logo
                      </Label>
                      <input
                        id="club_logo_upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleClubLogoSelect(file);
                        }}
                        className="hidden"
                      />
                      {(clubLogoPreview || formData.club_logo) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveClubLogo}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Clear
                        </Button>
                      )}
                    </div>
                    {(clubLogoPreview || formData.club_logo) && (
                      <div 
                        className="relative w-24 h-24 border rounded-md overflow-hidden p-2"
                        style={{
                          backgroundImage: `
                            linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%),
                            linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%),
                            linear-gradient(45deg, transparent 75%, hsl(var(--muted)) 75%),
                            linear-gradient(-45deg, transparent 75%, hsl(var(--muted)) 75%)
                          `,
                          backgroundSize: '12px 12px',
                          backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px'
                        }}
                      >
                        <img 
                          src={clubLogoPreview || formData.club_logo} 
                          alt="Club Logo Preview" 
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="league">League</Label>
                  <Input
                    id="league"
                    value={formData.league}
                    onChange={(e) => setFormData({ ...formData, league: e.target.value })}
                    placeholder="e.g., La Liga"
                  />
                </div>
              </TabsContent>

              {/* Bio & Strengths Tab */}
              <TabsContent value="bio" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bioText">Bio Text</Label>
                  <Textarea
                    id="bioText"
                    value={formData.bioText}
                    onChange={(e) => setFormData({ ...formData, bioText: e.target.value })}
                    rows={4}
                    placeholder="Player biography..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Strengths & Play Style</Label>
                  {formData.strengths?.map((strength: string, index: number) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={strength}
                        onChange={(e) => {
                          const newStrengths = [...formData.strengths];
                          newStrengths[index] = e.target.value;
                          setFormData({ ...formData, strengths: newStrengths });
                        }}
                        placeholder="e.g., Exceptional dribbling ability"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => {
                          const newStrengths = formData.strengths.filter((_: any, i: number) => i !== index);
                          setFormData({ ...formData, strengths: newStrengths });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormData({ ...formData, strengths: [...(formData.strengths || []), ""] });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Strength
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>External Links (in Bio)</Label>
                  {formData.externalLinks?.map((link: any, index: number) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={link.label}
                        onChange={(e) => {
                          const newLinks = [...formData.externalLinks];
                          newLinks[index].label = e.target.value;
                          setFormData({ ...formData, externalLinks: newLinks });
                        }}
                        placeholder="Label (e.g., Transfermarkt)"
                        className="flex-1"
                      />
                      <Input
                        value={link.url}
                        onChange={(e) => {
                          const newLinks = [...formData.externalLinks];
                          newLinks[index].url = e.target.value;
                          setFormData({ ...formData, externalLinks: newLinks });
                        }}
                        placeholder="URL"
                        className="flex-[2]"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => {
                          const newLinks = formData.externalLinks.filter((_: any, i: number) => i !== index);
                          setFormData({ ...formData, externalLinks: newLinks });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormData({ 
                        ...formData, 
                        externalLinks: [...(formData.externalLinks || []), { label: "", url: "" }] 
                      });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add External Link
                  </Button>
                </div>
              </TabsContent>

              {/* Tactical Schemes Tab */}
              <TabsContent value="tactical" className="space-y-4">
                <Label>Tactical Schemes</Label>
                {formData.tacticalSchemes?.map((scheme: any, index: number) => (
                  <Card key={index} className="p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Scheme {index + 1}</h4>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          const newSchemes = formData.tacticalSchemes.filter((_: any, i: number) => i !== index);
                          setFormData({ ...formData, tacticalSchemes: newSchemes });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        value={scheme.formation || ""}
                        onChange={(e) => {
                          const newSchemes = [...formData.tacticalSchemes];
                          newSchemes[index].formation = e.target.value;
                          setFormData({ ...formData, tacticalSchemes: newSchemes });
                        }}
                        placeholder="Formation (e.g., 4-3-3)"
                      />
                      <Input
                        value={(Array.isArray(scheme.positions) ? scheme.positions : []).join(", ")}
                        onChange={(e) => {
                          const newSchemes = [...formData.tacticalSchemes];
                          newSchemes[index].positions = e.target.value.split(",").map((p: string) => p.trim()).filter((p: string) => p);
                          setFormData({ ...formData, tacticalSchemes: newSchemes });
                        }}
                        placeholder="Positions (e.g., CM, RCM)"
                      />
                      <Input
                        value={scheme.teamName || ""}
                        onChange={(e) => {
                          const newSchemes = [...formData.tacticalSchemes];
                          newSchemes[index].teamName = e.target.value;
                          setFormData({ ...formData, tacticalSchemes: newSchemes });
                        }}
                        placeholder="Team Name"
                      />
                      <Input
                        value={scheme.matches || ""}
                        onChange={(e) => {
                          const newSchemes = [...formData.tacticalSchemes];
                          const value = e.target.value;
                          newSchemes[index].matches = isNaN(Number(value)) ? value : parseInt(value);
                          setFormData({ ...formData, tacticalSchemes: newSchemes });
                        }}
                        placeholder="Matches (e.g., 15 or 'CURRENT CLUB')"
                      />
                    </div>
                  </Card>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormData({ 
                      ...formData, 
                      tacticalSchemes: [
                        ...(formData.tacticalSchemes || []), 
                        {
                          formation: "",
                          positions: [],
                          teamName: "",
                          matches: 0,
                          clubLogo: "",
                          playerImage: "",
                        }
                      ] 
                    });
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Scheme
                </Button>
              </TabsContent>

              {/* Stats Tab */}
              <TabsContent value="stats" className="space-y-4 sm:space-y-6 pt-2">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Season Stats</Label>
                  <div className="space-y-3">
                    {formData.seasonStats?.map((stat: any, index: number) => (
                      <div key={index} className="flex flex-col sm:flex-row gap-2 p-3 sm:p-2 border rounded-lg sm:border-0 sm:rounded-none">
                        <div className="flex flex-col sm:flex-row gap-2 flex-1">
                          <Input
                            value={stat.header}
                            onChange={(e) => {
                              const newStats = [...formData.seasonStats];
                              newStats[index].header = e.target.value;
                              setFormData({ ...formData, seasonStats: newStats });
                            }}
                            placeholder="Goals"
                            className="flex-1 h-11 sm:h-10"
                          />
                          <Input
                            value={stat.value}
                            onChange={(e) => {
                              const newStats = [...formData.seasonStats];
                              newStats[index].value = e.target.value;
                              setFormData({ ...formData, seasonStats: newStats });
                            }}
                            placeholder="15"
                            className="flex-1 h-11 sm:h-10"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => {
                            const newStats = formData.seasonStats.filter((_: any, i: number) => i !== index);
                            setFormData({ ...formData, seasonStats: newStats });
                          }}
                          className="w-full sm:w-10 h-11 sm:h-10"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="ml-2 sm:hidden">Delete</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormData({ 
                        ...formData, 
                        seasonStats: [...(formData.seasonStats || []), { header: "", value: "" }] 
                      });
                    }}
                    className="w-full sm:w-auto h-11 sm:h-9"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Season Stat
                  </Button>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Top Stats</Label>
                  <div className="space-y-3">
                    {formData.topStats?.map((stat: any, index: number) => (
                      <div key={index} className="space-y-2 p-3 border rounded-lg">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Input
                            value={stat.label}
                            onChange={(e) => {
                              const newStats = [...formData.topStats];
                              newStats[index].label = e.target.value;
                              setFormData({ ...formData, topStats: newStats });
                            }}
                            placeholder="Pass Accuracy"
                            className="flex-1 h-11 sm:h-10"
                          />
                          <Input
                            value={stat.value}
                            onChange={(e) => {
                              const newStats = [...formData.topStats];
                              newStats[index].value = e.target.value;
                              setFormData({ ...formData, topStats: newStats });
                            }}
                            placeholder="89%"
                            className="flex-1 h-11 sm:h-10"
                          />
                        </div>
                        <Input
                          value={stat.description || ""}
                          onChange={(e) => {
                            const newStats = [...formData.topStats];
                            newStats[index].description = e.target.value;
                            setFormData({ ...formData, topStats: newStats });
                          }}
                          placeholder="Description (optional)"
                          className="h-11 sm:h-10"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const newStats = formData.topStats.filter((_: any, i: number) => i !== index);
                            setFormData({ ...formData, topStats: newStats });
                          }}
                          className="w-full h-11 sm:h-9"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Top Stat
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormData({ 
                        ...formData, 
                        topStats: [...(formData.topStats || []), { label: "", value: "", description: "" }] 
                      });
                    }}
                    className="w-full sm:w-auto h-11 sm:h-9"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Top Stat
                  </Button>
                </div>
              </TabsContent>

              {/* Links Tab */}
              <TabsContent value="links" className="space-y-4">
                <div className="space-y-2">
                  <Label>External Profile Links</Label>
                  <p className="text-sm text-muted-foreground">
                    These appear as separate link buttons on the player profile
                  </p>
                  {formData.links?.map((link: any, index: number) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={link.label}
                        onChange={(e) => {
                          const newLinks = [...formData.links];
                          newLinks[index].label = e.target.value;
                          setFormData({ ...formData, links: newLinks });
                        }}
                        placeholder="Label (e.g., Transfermarkt)"
                        className="flex-1"
                      />
                      <Input
                        value={link.url}
                        onChange={(e) => {
                          const newLinks = [...formData.links];
                          newLinks[index].url = e.target.value;
                          setFormData({ ...formData, links: newLinks });
                        }}
                        placeholder="URL"
                        className="flex-[2]"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => {
                          const newLinks = formData.links.filter((_: any, i: number) => i !== index);
                          setFormData({ ...formData, links: newLinks });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormData({ 
                        ...formData, 
                        links: [...(formData.links || []), { label: "", url: "" }] 
                      });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Link
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Add Player
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};