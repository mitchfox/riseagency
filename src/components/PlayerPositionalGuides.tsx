import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Map, Video } from "lucide-react";

interface PositionalGuidePoint {
  id: string;
  position: string;
  phase: string;
  subcategory: string;
  title: string;
  paragraphs: string[] | null;
  image_layout: string | null;
  images: any;
  video_url: string | null;
  display_order: number;
}

interface MediaItem {
  url: string;
  caption?: string;
}

interface MediaGridRow {
  id: string;
  layout: string;
  images: MediaItem[];
  video_url?: string;
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
  const [guidePoints, setGuidePoints] = useState<PositionalGuidePoint[]>([]);
  const [mediaData, setMediaData] = useState<Record<string, MediaGridRow[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedPosition) {
      fetchGuidePoints();
      fetchMedia();
    }
  }, [selectedPosition]);

  const fetchGuidePoints = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('positional_guide_points')
        .select('*')
        .eq('position', selectedPosition)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setGuidePoints(data || []);
    } catch (error) {
      console.error('Error fetching guide points:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMedia = async () => {
    try {
      const { data, error } = await supabase
        .from('positional_guide_media')
        .select('*')
        .eq('position', selectedPosition)
        .order('display_order', { ascending: true });

      if (error) throw error;

      const grouped: Record<string, MediaGridRow[]> = {};
      (data || []).forEach((row: any) => {
        const key = `${row.phase}-${row.subcategory}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push({
          id: row.id,
          layout: row.layout,
          images: (row.images || []) as MediaItem[],
          video_url: row.video_url,
          display_order: row.display_order
        });
      });
      setMediaData(grouped);
    } catch (error) {
      console.error('Error fetching media:', error);
    }
  };

  const getMediaForSubcategory = (phase: string, subcategory: string): MediaGridRow[] => {
    return mediaData[`${phase}-${subcategory}`] || [];
  };

  const getPointsForSubcategory = (phase: string, subcategory: string): PositionalGuidePoint[] => {
    return guidePoints.filter(g => g.phase === phase && g.subcategory === subcategory);
  };

  // Count points per phase
  const getPhasePointCount = (phase: string) => {
    return guidePoints.filter(g => g.phase === phase).length;
  };

  // Get all phases that have content
  const getPhasesWithContent = () => {
    const phasesWithContent = new Set(guidePoints.map(g => g.phase));
    return PHASES.filter(phase => phasesWithContent.has(phase));
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
          <div className="py-8 flex justify-center"><LoadingSpinner size="md" /></div>
        ) : guidePoints.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Map className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No positional guide content available for {POSITION_LABELS[selectedPosition]} yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-xl font-bebas uppercase tracking-wider">
              {POSITION_LABELS[selectedPosition]}
            </h3>

            <Accordion type="multiple" className="w-full" defaultValue={getPhasesWithContent()}>
              {PHASES.map(phase => {
                const pointCount = getPhasePointCount(phase);
                
                if (pointCount === 0) return null;
                
                return (
                  <AccordionItem key={phase} value={phase}>
                    <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                      <div className="flex items-center gap-2">
                        {phase}
                        <Badge variant="secondary" className="text-xs">
                          {pointCount}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-6 pt-2">
                      {DEFAULT_SUBCATEGORIES[phase].map(subcategory => {
                        const points = getPointsForSubcategory(phase, subcategory);
                        const mediaRows = getMediaForSubcategory(phase, subcategory);

                        if (points.length === 0 && mediaRows.length === 0) return null;

                        return (
                          <div key={subcategory} className="space-y-4">
                            <h4 className="font-semibold text-accent text-lg border-b border-border pb-2">{subcategory}</h4>
                            
                            {/* Display each point - collapsible */}
                            <Accordion type="multiple" className="w-full">
                              {points.map((point) => {
                                const hasImages = point.images && point.images.length > 0;
                                const hasTwoParagraphs = point.paragraphs && point.paragraphs.length === 2;
                                
                                return (
                                  <AccordionItem key={point.id} value={point.id} className="border-b-0 mb-3">
                                    <div className="bg-[hsl(0,0%,96%)] rounded-lg border border-border overflow-hidden">
                                      <AccordionTrigger className="hover:no-underline py-3 px-4 w-full">
                                        <h5 className="font-medium text-black text-left text-base">{point.title}</h5>
                                      </AccordionTrigger>
                                      <AccordionContent className="px-4 pb-4">
                                        <div className="space-y-4">
                                          {/* If 2 paragraphs: first paragraph, then images, then second paragraph */}
                                          {hasTwoParagraphs && hasImages ? (
                                            <>
                                              <p className="text-black text-base leading-relaxed text-justify">{point.paragraphs![0]}</p>
                                              
                                              {/* Images between paragraphs */}
                                              <div className="relative">
                                                {point.video_url && (
                                                  <button
                                                    onClick={() => window.open(point.video_url!, '_blank')}
                                                    className="absolute top-2 right-2 z-10 bg-primary/90 hover:bg-primary p-1.5 rounded-md transition-colors"
                                                  >
                                                    <Video className="h-4 w-4 text-primary-foreground" />
                                                  </button>
                                                )}
                                                <div className="grid grid-cols-1 gap-4">
                                                  {point.images.map((img: any, idx: number) => (
                                                    <div key={idx} className="w-full rounded-lg overflow-hidden">
                                                      <img src={img.url || img} alt="" className="w-full h-auto object-contain" />
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                              
                                              <p className="text-black text-base leading-relaxed text-justify">{point.paragraphs![1]}</p>
                                            </>
                                          ) : (
                                            <>
                                              {/* Standard layout: paragraphs then images */}
                                              {point.paragraphs && point.paragraphs.length > 0 && (
                                                <div className="space-y-4">
                                                  {point.paragraphs.map((para, idx) => (
                                                    <p key={idx} className="text-black text-base leading-relaxed text-justify">{para}</p>
                                                  ))}
                                                </div>
                                              )}
                                              
                                              {/* Images */}
                                              {hasImages && (
                                                <div className="relative">
                                                  {point.video_url && (
                                                    <button
                                                      onClick={() => window.open(point.video_url!, '_blank')}
                                                      className="absolute top-2 right-2 z-10 bg-primary/90 hover:bg-primary p-1.5 rounded-md transition-colors"
                                                    >
                                                      <Video className="h-4 w-4 text-primary-foreground" />
                                                    </button>
                                                  )}
                                                  <div className="grid grid-cols-1 gap-4">
                                                    {point.images.map((img: any, idx: number) => (
                                                      <div key={idx} className="w-full rounded-lg overflow-hidden">
                                                        <img src={img.url || img} alt="" className="w-full h-auto object-contain" />
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      </AccordionContent>
                                    </div>
                                  </AccordionItem>
                                );
                              })}
                            </Accordion>
                            
                            {/* Additional Media Grid Display from positional_guide_media */}
                            {mediaRows.map((row) => (
                              <div key={row.id} className="relative border rounded-lg p-3 bg-muted/30">
                                {row.video_url && (
                                  <button
                                    onClick={() => window.open(row.video_url, '_blank')}
                                    className="absolute top-2 right-2 z-10 bg-primary/90 hover:bg-primary p-1.5 rounded-md transition-colors"
                                  >
                                    <Video className="h-4 w-4 text-primary-foreground" />
                                  </button>
                                )}
                                <div className={`grid gap-2 ${row.layout === '1' ? 'grid-cols-1' : row.layout === '2' ? 'grid-cols-2' : 'grid-cols-3'}`}>
                                  {row.images.map((img, idx) => (
                                    <div key={idx} className="aspect-video bg-muted rounded-lg overflow-hidden">
                                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
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