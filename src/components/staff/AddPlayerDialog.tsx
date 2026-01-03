import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageIcon, X } from "lucide-react";
import { useState } from "react";

interface AddPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: (e: React.FormEvent) => void;
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
  formData,
  setFormData,
  onSubmit,
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] w-[98vw] sm:w-[95vw] p-3 sm:p-6">
        <DialogHeader className="pb-2 sm:pb-4">
          <DialogTitle className="text-base sm:text-lg">Add New Player</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[calc(95vh-100px)] sm:h-[calc(90vh-120px)] pr-2 sm:pr-4">
          <form onSubmit={onSubmit} className="space-y-4 sm:space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="flex w-full overflow-x-auto overflow-y-hidden scrollbar-hide gap-1 h-auto p-1 bg-muted rounded-md mb-4">
                <TabsTrigger value="basic" className="flex-shrink-0 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">Basic</TabsTrigger>
                <TabsTrigger value="career" className="flex-shrink-0 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">Career</TabsTrigger>
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
                    <Label htmlFor="email" className="text-sm">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="h-10 sm:h-11"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="position" className="text-sm">Position *</Label>
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      required
                      className="h-10 sm:h-11"
                    />
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
