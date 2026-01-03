import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Map, Video, ChevronUp, ChevronDown, MoveRight, MoreVertical } from "lucide-react";
import { PositionalGuidePointEditor } from "./PositionalGuidePointEditor";

interface MediaItem {
  url: string;
  caption?: string;
}

interface PositionalGuidePoint {
  id: string;
  position: string;
  phase: string;
  subcategory: string;
  title: string;
  paragraphs: string[];
  image_layout: string;
  images: MediaItem[];
  video_url: string | null;
  display_order: number;
}

const POSITIONS = ['GK', 'CB', 'FB', 'CDM', 'CM', 'CAM', 'W', 'CF'] as const;
const PHASES = ['Defensive Transition', 'Defence', 'Offensive Transition', 'Offence', 'Intangibles'] as const;

const DEFAULT_SUBCATEGORIES: Record<string, string[]> = {
  'Defensive Transition': ['Off-Ball Movement', 'On-Ball Decision-Making', 'Positioning', 'Communication'],
  'Defence': ['Off-Ball Movement', 'On-Ball Decision-Making', 'Positioning', 'Duels', 'Communication'],
  'Offensive Transition': ['Off-Ball Movement', 'On-Ball Decision-Making', 'Creating Space', 'End Product'],
  'Offence': ['Off-Ball Movement', 'On-Ball Decision-Making', 'Creating Space', 'End Product', 'Link-Up Play'],
  'Intangibles': ['Leadership', 'Work Rate', 'Composure', 'Decision Making Under Pressure', 'Communication'],
};

const POSITION_LABELS: Record<string, string> = {
  'GK': 'Goalkeeper',
  'CB': 'Centre-Back',
  'FB': 'Full-Back',
  'CDM': 'Defensive Midfielder',
  'CM': 'Central Midfielder',
  'CAM': 'Attacking Midfielder',
  'W': 'Winger',
  'CF': 'Centre-Forward',
};

const IMAGE_LAYOUT_CONFIGS: Record<string, { rows: number; cols: number }> = {
  '1-1': { rows: 1, cols: 1 },
  '2-1': { rows: 1, cols: 2 },
  '1-2': { rows: 2, cols: 1 },
  '2-2': { rows: 2, cols: 2 },
  '3-2': { rows: 2, cols: 3 },
  '3-3': { rows: 3, cols: 3 },
};

export const PositionalGuides = ({ isAdmin }: { isAdmin: boolean }) => {
  const [selectedPosition, setSelectedPosition] = useState<string>(POSITIONS[0]);
  const [points, setPoints] = useState<PositionalGuidePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState<PositionalGuidePoint | null>(null);
  const [addingToPhase, setAddingToPhase] = useState<string | null>(null);
  const [addingToSubcategory, setAddingToSubcategory] = useState<string | null>(null);

  useEffect(() => {
    fetchPoints();
  }, [selectedPosition]);

  const fetchPoints = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('positional_guide_points')
        .select('*')
        .eq('position', selectedPosition)
        .order('display_order', { ascending: true });

      if (error) throw error;
      
      const transformedData: PositionalGuidePoint[] = (data || []).map(item => ({
        id: item.id,
        position: item.position,
        phase: item.phase,
        subcategory: item.subcategory,
        title: item.title,
        paragraphs: item.paragraphs || [],
        image_layout: item.image_layout || '1-1',
        images: Array.isArray(item.images) ? (item.images as unknown as MediaItem[]) : [],
        video_url: item.video_url,
        display_order: item.display_order,
      }));
      
      setPoints(transformedData);
    } catch (error) {
      console.error('Error fetching points:', error);
      toast.error('Failed to load positional guides');
    } finally {
      setLoading(false);
    }
  };

  const getPointsForSubcategory = (phase: string, subcategory: string) => {
    return points.filter(p => p.phase === phase && p.subcategory === subcategory);
  };

  const handleAddPoint = (phase: string, subcategory: string) => {
    setAddingToPhase(phase);
    setAddingToSubcategory(subcategory);
    setEditingPoint(null);
    setEditorOpen(true);
  };

  const handleEditPoint = (point: PositionalGuidePoint) => {
    setEditingPoint(point);
    setAddingToPhase(point.phase);
    setAddingToSubcategory(point.subcategory);
    setEditorOpen(true);
  };

  const handleDeletePoint = async (pointId: string) => {
    if (!confirm('Are you sure you want to delete this point?')) return;

    try {
      const { error } = await supabase
        .from('positional_guide_points')
        .delete()
        .eq('id', pointId);

      if (error) throw error;
      toast.success('Point deleted');
      fetchPoints();
    } catch (error) {
      console.error('Error deleting point:', error);
      toast.error('Failed to delete point');
    }
  };

  const handleMovePoint = async (point: PositionalGuidePoint, direction: 'up' | 'down') => {
    const subcategoryPoints = getPointsForSubcategory(point.phase, point.subcategory);
    const currentIndex = subcategoryPoints.findIndex(p => p.id === point.id);
    
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === subcategoryPoints.length - 1) return;

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const swapPoint = subcategoryPoints[swapIndex];

    try {
      await Promise.all([
        supabase
          .from('positional_guide_points')
          .update({ display_order: swapPoint.display_order })
          .eq('id', point.id),
        supabase
          .from('positional_guide_points')
          .update({ display_order: point.display_order })
          .eq('id', swapPoint.id),
      ]);

      fetchPoints();
    } catch (error) {
      console.error('Error reordering:', error);
      toast.error('Failed to reorder');
    }
  };

  const handleMoveToCategory = async (point: PositionalGuidePoint, newPhase: string, newSubcategory: string) => {
    if (point.phase === newPhase && point.subcategory === newSubcategory) return;

    try {
      // Get the next display order for the new subcategory
      const existingPoints = points.filter(p => p.phase === newPhase && p.subcategory === newSubcategory);
      const nextOrder = existingPoints.length === 0 ? 0 : Math.max(...existingPoints.map(p => p.display_order)) + 1;

      const { error } = await supabase
        .from('positional_guide_points')
        .update({ 
          phase: newPhase, 
          subcategory: newSubcategory,
          display_order: nextOrder,
          updated_at: new Date().toISOString()
        })
        .eq('id', point.id);

      if (error) throw error;
      toast.success(`Moved to ${newPhase} → ${newSubcategory}`);
      fetchPoints();
    } catch (error) {
      console.error('Error moving point:', error);
      toast.error('Failed to move point');
    }
  };

  const getNextOrder = (phase: string, subcategory: string) => {
    const subcategoryPoints = getPointsForSubcategory(phase, subcategory);
    if (subcategoryPoints.length === 0) return 0;
    return Math.max(...subcategoryPoints.map(p => p.display_order)) + 1;
  };

  const getGridStyle = (layout: string) => {
    const config = IMAGE_LAYOUT_CONFIGS[layout] || { cols: 1 };
    return { gridTemplateColumns: `repeat(${config.cols}, 1fr)` };
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Position Selector - Mobile dropdown, desktop buttons */}
      <div className="md:hidden">
        <Select value={selectedPosition} onValueChange={setSelectedPosition}>
          <SelectTrigger className="w-full">
            <SelectValue>
              {POSITION_LABELS[selectedPosition]} ({selectedPosition})
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {POSITIONS.map(pos => (
              <SelectItem key={pos} value={pos}>
                {POSITION_LABELS[pos]} ({pos})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="hidden md:flex flex-wrap gap-2">
        {POSITIONS.map(pos => (
          <Button
            key={pos}
            variant={selectedPosition === pos ? "default" : "outline"}
            onClick={() => setSelectedPosition(pos)}
            className="font-bold"
          >
            {pos}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2 md:pb-4">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Map className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">{POSITION_LABELS[selectedPosition]}</span>
            <span className="sm:hidden">{selectedPosition}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 md:px-6">
          {loading ? (
            <div className="flex justify-center py-8"><LoadingSpinner size="md" /></div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {PHASES.map(phase => (
                <AccordionItem key={phase} value={phase}>
                  <AccordionTrigger className="text-lg md:text-xl font-bold hover:no-underline py-3 md:py-4">
                    <div className="flex items-center gap-2 text-left">
                      <span className="line-clamp-1">{phase}</span>
                      <Badge variant="secondary" className="text-[10px] md:text-xs shrink-0">
                        {points.filter(p => p.phase === phase).length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 md:space-y-4 pt-2">
                    {DEFAULT_SUBCATEGORIES[phase].map(subcategory => {
                      const subcategoryPoints = getPointsForSubcategory(phase, subcategory);

                      return (
                        <Card key={subcategory} className="border-l-4 border-l-primary">
                          <CardHeader className="pb-2 px-3 md:px-6 py-2 md:py-4">
                            <div className="flex items-center justify-between gap-2">
                              <CardTitle className="text-base md:text-lg font-semibold line-clamp-1">{subcategory}</CardTitle>
                              {isAdmin && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAddPoint(phase, subcategory)}
                                  className="shrink-0 h-7 md:h-8 text-xs md:text-sm px-2 md:px-3"
                                >
                                  <Plus className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
                                  <span className="hidden md:inline">Add Point</span>
                                </Button>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3 md:space-y-4 px-3 md:px-6">
                            {subcategoryPoints.length === 0 ? (
                              <p className="text-xs md:text-sm text-muted-foreground italic">No points added yet.</p>
                            ) : (
                              subcategoryPoints.map((point, idx) => (
                                <div
                                  key={point.id}
                                  className="border rounded-lg p-3 md:p-4 bg-muted/30 space-y-2 md:space-y-3"
                                >
                                  {/* Point Header */}
                                  <div className="flex items-start justify-between gap-2">
                                    <h4 className="font-bold text-primary text-base md:text-lg">{point.title}</h4>
                                    {isAdmin && (
                                      <>
                                        {/* Desktop actions */}
                                        <div className="hidden md:flex items-center gap-1">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => handleMovePoint(point, 'up')}
                                            disabled={idx === 0}
                                          >
                                            <ChevronUp className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => handleMovePoint(point, 'down')}
                                            disabled={idx === subcategoryPoints.length - 1}
                                          >
                                            <ChevronDown className="w-4 h-4" />
                                          </Button>
                                          
                                          {/* Move to category dropdown */}
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                                <MoveRight className="w-4 h-4" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
                                              {PHASES.map(targetPhase => (
                                                <DropdownMenuSub key={targetPhase}>
                                                  <DropdownMenuSubTrigger className="text-xs">
                                                    {targetPhase}
                                                  </DropdownMenuSubTrigger>
                                                  <DropdownMenuSubContent className="max-h-60 overflow-y-auto">
                                                    {DEFAULT_SUBCATEGORIES[targetPhase].map(targetSubcategory => (
                                                      <DropdownMenuItem
                                                        key={targetSubcategory}
                                                        onClick={() => handleMoveToCategory(point, targetPhase, targetSubcategory)}
                                                        disabled={point.phase === targetPhase && point.subcategory === targetSubcategory}
                                                        className="text-xs"
                                                      >
                                                        {targetSubcategory}
                                                        {point.phase === targetPhase && point.subcategory === targetSubcategory && (
                                                          <span className="ml-2 text-muted-foreground">(current)</span>
                                                        )}
                                                      </DropdownMenuItem>
                                                    ))}
                                                  </DropdownMenuSubContent>
                                                </DropdownMenuSub>
                                              ))}
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                          
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => handleEditPoint(point)}
                                          >
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-destructive"
                                            onClick={() => handleDeletePoint(point.id)}
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                        
                                        {/* Mobile actions - compact dropdown */}
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 md:hidden">
                                              <MoreVertical className="w-4 h-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end" className="w-48">
                                            <DropdownMenuItem 
                                              onClick={() => handleMovePoint(point, 'up')}
                                              disabled={idx === 0}
                                            >
                                              <ChevronUp className="w-4 h-4 mr-2" />
                                              Move Up
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                              onClick={() => handleMovePoint(point, 'down')}
                                              disabled={idx === subcategoryPoints.length - 1}
                                            >
                                              <ChevronDown className="w-4 h-4 mr-2" />
                                              Move Down
                                            </DropdownMenuItem>
                                            
                                            {/* Move to category - nested */}
                                            <DropdownMenuSub>
                                              <DropdownMenuSubTrigger>
                                                <MoveRight className="w-4 h-4 mr-2" />
                                                Move to...
                                              </DropdownMenuSubTrigger>
                                              <DropdownMenuSubContent className="max-h-60 overflow-y-auto">
                                                {PHASES.map(targetPhase => (
                                                  <DropdownMenuSub key={targetPhase}>
                                                    <DropdownMenuSubTrigger className="text-xs">
                                                      {targetPhase}
                                                    </DropdownMenuSubTrigger>
                                                    <DropdownMenuSubContent className="max-h-48 overflow-y-auto">
                                                      {DEFAULT_SUBCATEGORIES[targetPhase].map(targetSubcategory => (
                                                        <DropdownMenuItem
                                                          key={targetSubcategory}
                                                          onClick={() => handleMoveToCategory(point, targetPhase, targetSubcategory)}
                                                          disabled={point.phase === targetPhase && point.subcategory === targetSubcategory}
                                                          className="text-xs"
                                                        >
                                                          {targetSubcategory}
                                                        </DropdownMenuItem>
                                                      ))}
                                                    </DropdownMenuSubContent>
                                                  </DropdownMenuSub>
                                                ))}
                                              </DropdownMenuSubContent>
                                            </DropdownMenuSub>
                                            
                                            <DropdownMenuItem onClick={() => handleEditPoint(point)}>
                                              <Edit className="w-4 h-4 mr-2" />
                                              Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                              onClick={() => handleDeletePoint(point.id)}
                                              className="text-destructive"
                                            >
                                              <Trash2 className="w-4 h-4 mr-2" />
                                              Delete
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </>
                                    )}
                                  </div>

                                  {/* Paragraphs */}
                                  {point.paragraphs.length > 0 && (
                                    <div className="space-y-2">
                                      {point.paragraphs.map((para, pIdx) => (
                                        <p key={pIdx} className="text-sm md:text-base text-muted-foreground whitespace-pre-line leading-relaxed">
                                          {para}
                                        </p>
                                      ))}
                                    </div>
                                  )}

                                  {/* Images */}
                                  {point.images.length > 0 && (
                                    <div 
                                      className="grid gap-2"
                                      style={getGridStyle(point.image_layout)}
                                    >
                                      {point.images.map((img, iIdx) => (
                                        <div key={iIdx} className="aspect-video bg-muted rounded-lg overflow-hidden">
                                          <img
                                            src={img.url}
                                            alt=""
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Video */}
                                  {point.video_url && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.open(point.video_url!, '_blank')}
                                      className="mt-2 h-7 md:h-8 text-xs md:text-sm"
                                    >
                                      <Video className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                                      Watch Video
                                    </Button>
                                  )}
                                </div>
                              ))
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Point Editor Dialog */}
      {editorOpen && addingToPhase && addingToSubcategory && (
        <PositionalGuidePointEditor
          point={editingPoint || undefined}
          position={selectedPosition}
          phase={addingToPhase}
          subcategory={addingToSubcategory}
          open={editorOpen}
          onClose={() => {
            setEditorOpen(false);
            setEditingPoint(null);
            setAddingToPhase(null);
            setAddingToSubcategory(null);
          }}
          onSaved={fetchPoints}
          nextOrder={getNextOrder(addingToPhase, addingToSubcategory)}
        />
      )}
    </div>
  );
};
