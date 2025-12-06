import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Save, Map } from "lucide-react";

interface PositionalGuide {
  id: string;
  position: string;
  phase: string;
  subcategory: string;
  content: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
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

export const PositionalGuides = ({ isAdmin }: { isAdmin: boolean }) => {
  const [selectedPosition, setSelectedPosition] = useState<string>(POSITIONS[0]);
  const [guides, setGuides] = useState<PositionalGuide[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingGuide, setEditingGuide] = useState<PositionalGuide | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formContent, setFormContent] = useState("");
  const [addingToPhase, setAddingToPhase] = useState<string | null>(null);
  const [addingToSubcategory, setAddingToSubcategory] = useState<string | null>(null);
  const [newBulletPoint, setNewBulletPoint] = useState("");

  useEffect(() => {
    fetchGuides();
  }, [selectedPosition]);

  const fetchGuides = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('positional_guides')
        .select('*')
        .eq('position', selectedPosition)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setGuides(data || []);
    } catch (error) {
      console.error('Error fetching guides:', error);
      toast.error('Failed to load positional guides');
    } finally {
      setLoading(false);
    }
  };

  const getGuideForSubcategory = (phase: string, subcategory: string) => {
    return guides.find(g => g.phase === phase && g.subcategory === subcategory);
  };

  const parseBulletPoints = (content: string | null): string[] => {
    if (!content) return [];
    return content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.replace(/^[•\-*]\s*/, ''));
  };

  const handleAddBulletPoint = async (phase: string, subcategory: string) => {
    if (!newBulletPoint.trim()) {
      toast.error('Please enter a bullet point');
      return;
    }

    const existingGuide = getGuideForSubcategory(phase, subcategory);
    
    try {
      if (existingGuide) {
        // Update existing guide
        const existingPoints = parseBulletPoints(existingGuide.content);
        const newContent = [...existingPoints, newBulletPoint.trim()].map(p => `• ${p}`).join('\n');
        
        const { error } = await supabase
          .from('positional_guides')
          .update({ content: newContent, updated_at: new Date().toISOString() })
          .eq('id', existingGuide.id);

        if (error) throw error;
      } else {
        // Create new guide
        const { error } = await supabase
          .from('positional_guides')
          .insert({
            position: selectedPosition,
            phase,
            subcategory,
            content: `• ${newBulletPoint.trim()}`,
            display_order: 0
          });

        if (error) throw error;
      }

      toast.success('Bullet point added');
      setNewBulletPoint("");
      setAddingToPhase(null);
      setAddingToSubcategory(null);
      fetchGuides();
    } catch (error) {
      console.error('Error adding bullet point:', error);
      toast.error('Failed to add bullet point');
    }
  };

  const handleDeleteBulletPoint = async (guide: PositionalGuide, pointIndex: number) => {
    const points = parseBulletPoints(guide.content);
    points.splice(pointIndex, 1);

    try {
      if (points.length === 0) {
        // Delete the entire guide if no points remain
        const { error } = await supabase
          .from('positional_guides')
          .delete()
          .eq('id', guide.id);

        if (error) throw error;
      } else {
        const newContent = points.map(p => `• ${p}`).join('\n');
        const { error } = await supabase
          .from('positional_guides')
          .update({ content: newContent, updated_at: new Date().toISOString() })
          .eq('id', guide.id);

        if (error) throw error;
      }

      toast.success('Bullet point deleted');
      fetchGuides();
    } catch (error) {
      console.error('Error deleting bullet point:', error);
      toast.error('Failed to delete bullet point');
    }
  };

  const handleEditContent = (guide: PositionalGuide) => {
    setEditingGuide(guide);
    setFormContent(guide.content || '');
    setIsDialogOpen(true);
  };

  const handleSaveContent = async () => {
    if (!editingGuide) return;

    try {
      const { error } = await supabase
        .from('positional_guides')
        .update({ 
          content: formContent, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', editingGuide.id);

      if (error) throw error;

      toast.success('Content saved');
      setIsDialogOpen(false);
      setEditingGuide(null);
      fetchGuides();
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('Failed to save content');
    }
  };

  return (
    <div className="space-y-6">
      {/* Position Selector */}
      <div className="flex flex-wrap gap-2">
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="w-5 h-5" />
            {POSITION_LABELS[selectedPosition]} ({selectedPosition})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {PHASES.map(phase => (
                <AccordionItem key={phase} value={phase}>
                  <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                    <div className="flex items-center gap-2">
                      {phase}
                      <Badge variant="secondary" className="text-xs">
                        {guides.filter(g => g.phase === phase).length} items
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    {DEFAULT_SUBCATEGORIES[phase].map(subcategory => {
                      const guide = getGuideForSubcategory(phase, subcategory);
                      const points = parseBulletPoints(guide?.content || null);
                      const isAddingHere = addingToPhase === phase && addingToSubcategory === subcategory;

                      return (
                        <Card key={subcategory} className="border-l-4 border-l-primary">
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">{subcategory}</CardTitle>
                              <div className="flex gap-2">
                                {isAdmin && guide && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleEditContent(guide)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                )}
                                {isAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      setAddingToPhase(phase);
                                      setAddingToSubcategory(subcategory);
                                      setNewBulletPoint("");
                                    }}
                                  >
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {points.length === 0 && !isAddingHere ? (
                              <p className="text-sm text-muted-foreground italic">No content added yet.</p>
                            ) : (
                              <div className="space-y-2">
                                {points.map((point, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg group"
                                  >
                                    <span className="text-primary font-bold mt-0.5">•</span>
                                    <p className="flex-1 text-sm">{point}</p>
                                    {isAdmin && guide && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleDeleteBulletPoint(guide, idx)}
                                      >
                                        <Trash2 className="w-3 h-3 text-destructive" />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Add new bullet point inline */}
                            {isAddingHere && (
                              <div className="mt-3 flex gap-2">
                                <Input
                                  placeholder="Enter new bullet point..."
                                  value={newBulletPoint}
                                  onChange={(e) => setNewBulletPoint(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleAddBulletPoint(phase, subcategory);
                                    } else if (e.key === 'Escape') {
                                      setAddingToPhase(null);
                                      setAddingToSubcategory(null);
                                    }
                                  }}
                                  autoFocus
                                />
                                <Button
                                  size="icon"
                                  onClick={() => handleAddBulletPoint(phase, subcategory)}
                                >
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setAddingToPhase(null);
                                    setAddingToSubcategory(null);
                                  }}
                                >
                                  ✕
                                </Button>
                              </div>
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

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit Content - {editingGuide?.subcategory}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Each line starting with • will be displayed as a bullet point.
            </p>
            <Textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="• First point&#10;• Second point&#10;• Third point"
              rows={10}
              className="font-mono"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveContent}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
