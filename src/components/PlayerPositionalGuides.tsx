import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Map } from "lucide-react";

interface PositionalGuide {
  id: string;
  position: string;
  phase: string;
  subcategory: string;
  content: string | null;
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

export const PlayerPositionalGuides = () => {
  const [selectedPosition, setSelectedPosition] = useState<string>('');
  const [guides, setGuides] = useState<PositionalGuide[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedPosition) {
      fetchGuides();
    }
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

  // Count guides per phase
  const getPhaseGuideCount = (phase: string) => {
    return guides.filter(g => g.phase === phase && g.content).length;
  };

  return (
    <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-[hsl(43,49%,61%)] border-b-0">
      <CardHeader marble>
        <div className="container mx-auto px-4">
          <CardTitle className="font-heading tracking-tight flex items-center gap-2">
            <Map className="w-5 h-5" />
            Positional Guides
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="container mx-auto px-4 space-y-6">
        {/* Position Selector */}
        <div className="space-y-2">
          <Label>Select Position</Label>
          <Select value={selectedPosition} onValueChange={setSelectedPosition}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a position to view" />
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

        {/* Quick Position Buttons */}
        <div className="flex flex-wrap gap-2">
          {POSITIONS.map(pos => (
            <Button
              key={pos}
              variant={selectedPosition === pos ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPosition(pos)}
              className="font-bold"
            >
              {pos}
            </Button>
          ))}
        </div>

        {!selectedPosition ? (
          <div className="py-8 text-center text-muted-foreground">
            <Map className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Select a position above to view the tactical guide.</p>
          </div>
        ) : loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-xl font-bebas uppercase tracking-wider">
              {POSITION_LABELS[selectedPosition]}
            </h3>

            <Accordion type="multiple" className="w-full">
              {PHASES.map(phase => {
                const guideCount = getPhaseGuideCount(phase);
                
                return (
                  <AccordionItem key={phase} value={phase}>
                    <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                      <div className="flex items-center gap-2">
                        {phase}
                        {guideCount > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {guideCount}
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                      {DEFAULT_SUBCATEGORIES[phase].map(subcategory => {
                        const guide = getGuideForSubcategory(phase, subcategory);
                        const points = parseBulletPoints(guide?.content || null);

                        if (points.length === 0) return null;

                        return (
                          <div key={subcategory} className="space-y-2">
                            <h4 className="font-semibold text-accent">{subcategory}</h4>
                            <div className="space-y-2">
                              {points.map((point, idx) => (
                                <div
                                  key={idx}
                                  className="bg-muted/50 border border-border rounded-lg p-3 hover:bg-muted/70 transition-colors"
                                >
                                  <div className="flex gap-2">
                                    <span className="text-accent font-semibold mt-0.5">•</span>
                                    <p className="text-muted-foreground flex-1">{point}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Show message if no content in this phase */}
                      {guideCount === 0 && (
                        <p className="text-sm text-muted-foreground italic py-2">
                          No content available for this phase yet.
                        </p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
