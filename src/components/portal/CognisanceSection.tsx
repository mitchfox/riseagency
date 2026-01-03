import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Brain, ChevronLeft, RotateCcw, Target, Lightbulb, BookOpen, Eye, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CognisanceSectionProps {
  playerId: string;
  playerPosition?: string;
}

type GameType = "schemes" | "concepts" | "pre-match" | "positional-guides" | null;

interface FlashcardData {
  id: string;
  cardKey: string;
  title: string;
  content: string;
  category: string;
  subcategory?: string;
}

interface CardProgress {
  card_key: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review: string;
}

interface SchemeData {
  id: string;
  position: string;
  team_scheme: string;
  opposition_scheme: string;
  defensive_transition: string | null;
  defence: string | null;
  offensive_transition: string | null;
  offence: string | null;
}

interface ConceptData {
  id: string;
  title: string;
  points: any[];
  explanation?: string;
}

interface PreMatchData {
  id: string;
  title: string;
  opposition_strengths: string | null;
  opposition_weaknesses: string | null;
  key_details: string | null;
  points: any[] | null;
}

// SM-2 Algorithm for spaced repetition
function calculateNextReview(quality: number, progress: CardProgress | null) {
  // quality: 1 = Again, 2 = Hard, 3 = Good, 4 = Easy
  const defaultProgress = {
    ease_factor: 2.5,
    interval_days: 0,
    repetitions: 0
  };
  
  const p = progress || defaultProgress;
  let newEaseFactor = p.ease_factor;
  let newInterval = p.interval_days;
  let newRepetitions = p.repetitions;
  
  if (quality < 2) {
    // Failed - reset
    newRepetitions = 0;
    newInterval = 0;
  } else {
    // Success
    if (newRepetitions === 0) {
      newInterval = 1;
    } else if (newRepetitions === 1) {
      newInterval = 3;
    } else {
      newInterval = Math.round(p.interval_days * newEaseFactor);
    }
    newRepetitions += 1;
  }
  
  // Adjust ease factor based on quality
  newEaseFactor = Math.max(1.3, p.ease_factor + (0.1 - (4 - quality) * (0.08 + (4 - quality) * 0.02)));
  
  // Bonus for easy
  if (quality === 4) {
    newInterval = Math.round(newInterval * 1.3);
  }
  
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);
  
  return {
    ease_factor: newEaseFactor,
    interval_days: newInterval,
    repetitions: newRepetitions,
    next_review: nextReview.toISOString()
  };
}

export function CognisanceSection({ playerId, playerPosition }: CognisanceSectionProps) {
  const [selectedGame, setSelectedGame] = useState<GameType>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  
  // Data state
  const [schemes, setSchemes] = useState<SchemeData[]>([]);
  const [concepts, setConcepts] = useState<ConceptData[]>([]);
  const [preMatchAnalyses, setPreMatchAnalyses] = useState<PreMatchData[]>([]);
  const [positionalGuidePoints, setPositionalGuidePoints] = useState<any[]>([]);
  
  // Filter state
  const [selectedSchemePosition, setSelectedSchemePosition] = useState<string>("");
  const [availablePositions, setAvailablePositions] = useState<string[]>([]);
  const [selectedTeamSchemeFilter, setSelectedTeamSchemeFilter] = useState<string>("all");
  const [selectedOppositionSchemeFilter, setSelectedOppositionSchemeFilter] = useState<string>("all");
  const [availableTeamSchemes, setAvailableTeamSchemes] = useState<string[]>([]);
  const [availableOppositionSchemes, setAvailableOppositionSchemes] = useState<string[]>([]);
  const [selectedGuidePosition, setSelectedGuidePosition] = useState<string>("");
  const [availableGuidePositions, setAvailableGuidePositions] = useState<string[]>([]);
  const [selectedConceptFilter, setSelectedConceptFilter] = useState<string>("all");
  const [selectedPreMatchFilter, setSelectedPreMatchFilter] = useState<string>("all");
  
  // Game state
  const [flashcards, setFlashcards] = useState<FlashcardData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardProgress, setCardProgress] = useState<Record<string, CardProgress>>({});
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, newCards: 0, dueCards: 0 });

  // Fetch card progress from database
  const fetchCardProgress = useCallback(async () => {
    if (!playerId) return;
    
    const { data, error } = await supabase
      .from("flashcard_progress")
      .select("*")
      .eq("player_id", playerId);
    
    if (!error && data) {
      const progressMap: Record<string, CardProgress> = {};
      data.forEach(p => {
        progressMap[p.card_key] = {
          card_key: p.card_key,
          ease_factor: Number(p.ease_factor),
          interval_days: p.interval_days,
          repetitions: p.repetitions,
          next_review: p.next_review
        };
      });
      setCardProgress(progressMap);
    }
  }, [playerId]);

  // Fetch schemes
  const fetchSchemes = useCallback(async () => {
    const { data, error } = await supabase
      .from("tactical_schemes")
      .select("*");
    
    if (!error && data) {
      setSchemes(data);
      const positions = [...new Set(data.map(s => s.position))];
      const teamSchemes = [...new Set(data.map(s => s.team_scheme))];
      const oppositionSchemes = [...new Set(data.map(s => s.opposition_scheme))];
      setAvailablePositions(positions);
      setAvailableTeamSchemes(teamSchemes);
      setAvailableOppositionSchemes(oppositionSchemes);
      
      if (playerPosition) {
        const positionMap: Record<string, string> = {
          'GK': 'Goalkeeper', 'Goalkeeper': 'Goalkeeper',
          'FB': 'Full-Back', 'Full-Back': 'Full-Back',
          'CB': 'Centre-Back', 'Centre-Back': 'Centre-Back',
          'CDM': 'Central Defensive-Midfielder',
          'CM': 'Central Midfielder',
          'AM': 'Attacking Midfielder', 'CAM': 'Attacking Midfielder',
          'W': 'Winger', 'LW': 'Winger', 'RW': 'Winger',
          'CF': 'Centre-Forward', 'ST': 'Centre-Forward',
        };
        const normalized = positionMap[playerPosition] || playerPosition;
        if (positions.includes(normalized)) {
          setSelectedSchemePosition(normalized);
        }
      }
    }
  }, [playerPosition]);

  // Fetch positional guide points
  const fetchPositionalGuidePoints = useCallback(async () => {
    const { data, error } = await supabase
      .from("positional_guide_points")
      .select("*")
      .order("display_order", { ascending: true });
    
    if (!error && data) {
      setPositionalGuidePoints(data);
      const positions = [...new Set(data.map(p => p.position))];
      setAvailableGuidePositions(positions);
      if (positions.length > 0 && !selectedGuidePosition) {
        setSelectedGuidePosition(positions[0]);
      }
    }
  }, []);

  // Fetch all concepts from coaching_analysis (available to all players)
  const fetchConcepts = useCallback(async () => {
    const { data: conceptsData, error } = await supabase
      .from("coaching_analysis")
      .select("*")
      .eq("analysis_type", "concept");
    
    if (!error && conceptsData) {
      setConcepts(conceptsData.map(c => ({
        id: c.id,
        title: c.title || "Untitled Concept",
        points: Array.isArray(c.attachments) ? c.attachments : [],
        explanation: c.content || c.description || undefined
      })));
    }
  }, []);

  // Fetch pre-match analyses
  const fetchPreMatchAnalyses = useCallback(async () => {
    const { data: analysisData } = await supabase
      .from("player_analysis")
      .select("analysis_writer_id")
      .eq("player_id", playerId);
    
    if (!analysisData || analysisData.length === 0) return;
    
    const linkedIds = analysisData.filter(a => a.analysis_writer_id).map(a => a.analysis_writer_id);
    if (linkedIds.length === 0) return;
    
    const { data: preMatchData } = await supabase
      .from("analyses")
      .select("*")
      .in("id", linkedIds)
      .eq("analysis_type", "pre-match");
    
    if (preMatchData) {
      setPreMatchAnalyses(preMatchData.map(p => ({
        id: p.id,
        title: p.title || "Untitled Pre-Match",
        opposition_strengths: p.opposition_strengths,
        opposition_weaknesses: p.opposition_weaknesses,
        key_details: p.key_details,
        points: Array.isArray(p.points) ? p.points : null
      })));
    }
  }, [playerId]);

  useEffect(() => {
    fetchSchemes();
    fetchConcepts();
    fetchPreMatchAnalyses();
    fetchPositionalGuidePoints();
    fetchCardProgress();
  }, [fetchSchemes, fetchConcepts, fetchPreMatchAnalyses, fetchPositionalGuidePoints, fetchCardProgress]);

  // Parse scheme content into individual points
  const parseSchemePoints = (content: string): string[] => {
    if (!content) return [];
    // Split by newlines and filter out empty lines
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    // If it's a single block of text, return as one point
    if (lines.length === 1) return lines;
    // Otherwise return individual points
    return lines;
  };

  // Generate flashcards with spaced repetition ordering
  const generateFlashcards = useCallback(() => {
    const cards: FlashcardData[] = [];
    const now = new Date();
    
    if (selectedGame === "schemes") {
      let filteredSchemes = schemes;
      
      if (selectedSchemePosition) {
        filteredSchemes = filteredSchemes.filter(s => s.position === selectedSchemePosition);
      }
      if (selectedTeamSchemeFilter !== "all") {
        filteredSchemes = filteredSchemes.filter(s => s.team_scheme === selectedTeamSchemeFilter);
      }
      if (selectedOppositionSchemeFilter !== "all") {
        filteredSchemes = filteredSchemes.filter(s => s.opposition_scheme === selectedOppositionSchemeFilter);
      }
      
      filteredSchemes.forEach(scheme => {
        const phases = [
          { name: "Defensive Transition", content: scheme.defensive_transition },
          { name: "Defence", content: scheme.defence },
          { name: "Offensive Transition", content: scheme.offensive_transition },
          { name: "In Possession", content: scheme.offence }
        ];
        
        phases.forEach(phase => {
          if (phase.content) {
            // Split into individual points
            const points = parseSchemePoints(phase.content);
            points.forEach((point, idx) => {
              const cardKey = `scheme-${scheme.id}-${phase.name}-${idx}`;
              cards.push({
                id: `${scheme.id}-${phase.name}-${idx}`,
                cardKey,
                title: `${scheme.team_scheme} vs ${scheme.opposition_scheme}`,
                content: point,
                category: phase.name,
                subcategory: `Point ${idx + 1}`
              });
            });
          }
        });
      });
    }
    
    if (selectedGame === "positional-guides") {
      let filteredPoints = positionalGuidePoints;
      
      if (selectedGuidePosition) {
        filteredPoints = filteredPoints.filter(p => p.position === selectedGuidePosition);
      }
      
      filteredPoints.forEach(point => {
        if (point.paragraphs && point.paragraphs.length > 0) {
          // Create a card for each paragraph
          point.paragraphs.forEach((para: string, idx: number) => {
            const cardKey = `guide-${point.id}-${idx}`;
            cards.push({
              id: `${point.id}-${idx}`,
              cardKey,
              title: point.title,
              content: para,
              category: `${point.phase} - ${point.subcategory}`,
              subcategory: point.paragraphs.length > 1 ? `Part ${idx + 1}` : undefined
            });
          });
        }
      });
    }
    
    if (selectedGame === "concepts") {
      let filteredConcepts = concepts;
      if (selectedConceptFilter !== "all") {
        filteredConcepts = filteredConcepts.filter(c => c.id === selectedConceptFilter);
      }
      
      filteredConcepts.forEach(concept => {
        if (concept.points && concept.points.length > 0) {
          concept.points.forEach((point: any, idx: number) => {
            if (point.title && point.description) {
              const cardKey = `concept-${concept.id}-${idx}`;
              cards.push({
                id: `${concept.id}-${idx}`,
                cardKey,
                title: point.title,
                content: point.description,
                category: concept.title
              });
            }
          });
        }
        if (concept.explanation) {
          const cardKey = `concept-${concept.id}-explanation`;
          cards.push({
            id: `${concept.id}-explanation`,
            cardKey,
            title: concept.title,
            content: concept.explanation,
            category: "Concept Explanation"
          });
        }
      });
    }
    
    if (selectedGame === "pre-match") {
      let filteredPreMatch = preMatchAnalyses;
      if (selectedPreMatchFilter !== "all") {
        filteredPreMatch = filteredPreMatch.filter(p => p.id === selectedPreMatchFilter);
      }
      
      filteredPreMatch.forEach(analysis => {
        if (analysis.opposition_strengths) {
          const cardKey = `prematch-${analysis.id}-strengths`;
          cards.push({
            id: `${analysis.id}-strengths`,
            cardKey,
            title: `${analysis.title} - Opposition Strengths`,
            content: analysis.opposition_strengths,
            category: "Opposition Strengths"
          });
        }
        if (analysis.opposition_weaknesses) {
          const cardKey = `prematch-${analysis.id}-weaknesses`;
          cards.push({
            id: `${analysis.id}-weaknesses`,
            cardKey,
            title: `${analysis.title} - Opposition Weaknesses`,
            content: analysis.opposition_weaknesses,
            category: "Opposition Weaknesses"
          });
        }
        if (analysis.key_details) {
          const cardKey = `prematch-${analysis.id}-details`;
          cards.push({
            id: `${analysis.id}-details`,
            cardKey,
            title: `${analysis.title} - Key Details`,
            content: analysis.key_details,
            category: "Key Details"
          });
        }
        if (analysis.points && Array.isArray(analysis.points)) {
          analysis.points.forEach((point: any, idx: number) => {
            if (point.title && point.description) {
              const cardKey = `prematch-${analysis.id}-point-${idx}`;
              cards.push({
                id: `${analysis.id}-point-${idx}`,
                cardKey,
                title: point.title,
                content: point.description,
                category: analysis.title
              });
            }
          });
        }
      });
    }
    
    // Sort cards: due cards first (by how overdue), then new cards shuffled
    const dueCards: FlashcardData[] = [];
    const newCards: FlashcardData[] = [];
    
    cards.forEach(card => {
      const progress = cardProgress[card.cardKey];
      if (progress) {
        const nextReview = new Date(progress.next_review);
        if (nextReview <= now) {
          dueCards.push(card);
        }
      } else {
        newCards.push(card);
      }
    });
    
    // Sort due cards by how overdue they are
    dueCards.sort((a, b) => {
      const aReview = new Date(cardProgress[a.cardKey]?.next_review || now);
      const bReview = new Date(cardProgress[b.cardKey]?.next_review || now);
      return aReview.getTime() - bReview.getTime();
    });
    
    // Shuffle new cards
    newCards.sort(() => Math.random() - 0.5);
    
    // Combine: due cards first, then new cards
    const sortedCards = [...dueCards, ...newCards];
    
    setFlashcards(sortedCards);
    setCurrentIndex(0);
    setIsRevealed(false);
    setSessionStats({ reviewed: 0, newCards: newCards.length, dueCards: dueCards.length });
  }, [selectedGame, schemes, concepts, preMatchAnalyses, positionalGuidePoints, cardProgress, selectedSchemePosition, selectedTeamSchemeFilter, selectedOppositionSchemeFilter, selectedGuidePosition, selectedConceptFilter, selectedPreMatchFilter]);

  const startGame = () => {
    generateFlashcards();
    setIsPlaying(true);
  };

  // Handle recall grade (1-4)
  const handleGrade = async (quality: number) => {
    const currentCard = flashcards[currentIndex];
    if (!currentCard) return;
    
    const progress = cardProgress[currentCard.cardKey];
    const newProgress = calculateNextReview(quality, progress);
    
    // Update local state
    setCardProgress(prev => ({
      ...prev,
      [currentCard.cardKey]: {
        card_key: currentCard.cardKey,
        ...newProgress
      }
    }));
    
    // Save to database
    const { error } = await supabase
      .from("flashcard_progress")
      .upsert({
        player_id: playerId,
        card_key: currentCard.cardKey,
        card_type: selectedGame,
        ease_factor: newProgress.ease_factor,
        interval_days: newProgress.interval_days,
        repetitions: newProgress.repetitions,
        next_review: newProgress.next_review,
        last_reviewed: new Date().toISOString()
      }, { onConflict: 'player_id,card_key' });
    
    if (error) {
      console.error("Error saving progress:", error);
      toast.error("Failed to save progress");
    }
    
    setSessionStats(prev => ({ ...prev, reviewed: prev.reviewed + 1 }));
    
    // Move to next card
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsRevealed(false);
    }
  };

  const resetGame = () => {
    setIsPlaying(false);
    setFlashcards([]);
    setCurrentIndex(0);
    setIsRevealed(false);
  };

  // Game selection view
  if (!selectedGame) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bebas text-gold mb-2">Cognisance</h2>
          <p className="text-muted-foreground">Strengthen your football IQ with spaced repetition learning</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card 
            className="cursor-pointer hover:border-gold/50 transition-all hover:shadow-lg hover:shadow-gold/10"
            onClick={() => setSelectedGame("schemes")}
          >
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-gold" />
              </div>
              <h3 className="font-bebas text-xl text-gold mb-2">Tactical Schemes</h3>
              <p className="text-sm text-muted-foreground">
                Learn your positional responsibilities across different formations
              </p>
              <p className="text-xs text-gold/70 mt-2">{schemes.length} schemes available</p>
            </CardContent>
          </Card>
          
          <Card 
            className="cursor-pointer hover:border-gold/50 transition-all hover:shadow-lg hover:shadow-gold/10"
            onClick={() => setSelectedGame("positional-guides")}
          >
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-gold" />
              </div>
              <h3 className="font-bebas text-xl text-gold mb-2">Positional Guides</h3>
              <p className="text-sm text-muted-foreground">
                Master the key principles for each position and phase of play
              </p>
              <p className="text-xs text-gold/70 mt-2">{positionalGuidePoints.length} points available</p>
            </CardContent>
          </Card>
          
          <Card 
            className="cursor-pointer hover:border-gold/50 transition-all hover:shadow-lg hover:shadow-gold/10"
            onClick={() => setSelectedGame("concepts")}
          >
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4">
                <Lightbulb className="w-8 h-8 text-gold" />
              </div>
              <h3 className="font-bebas text-xl text-gold mb-2">Concepts</h3>
              <p className="text-sm text-muted-foreground">
                Memorise key tactical and technical concepts from your analyses
              </p>
              <p className="text-xs text-gold/70 mt-2">{concepts.length} concepts available</p>
            </CardContent>
          </Card>
          
          <Card 
            className="cursor-pointer hover:border-gold/50 transition-all hover:shadow-lg hover:shadow-gold/10"
            onClick={() => setSelectedGame("pre-match")}
          >
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4">
                <Eye className="w-8 h-8 text-gold" />
              </div>
              <h3 className="font-bebas text-xl text-gold mb-2">Pre-Match Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Review opposition strengths, weaknesses and key details
              </p>
              <p className="text-xs text-gold/70 mt-2">{preMatchAnalyses.length} analyses available</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Setup view (before playing)
  if (!isPlaying) {
    return (
      <div className="space-y-6">
        <Button 
          variant="ghost" 
          onClick={() => setSelectedGame(null)}
          className="text-gold hover:text-gold/80"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Games
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle className="font-bebas text-gold flex items-center gap-2">
              <Brain className="w-6 h-6" />
              {selectedGame === "schemes" && "Tactical Schemes"}
              {selectedGame === "positional-guides" && "Positional Guides"}
              {selectedGame === "concepts" && "Concepts"}
              {selectedGame === "pre-match" && "Pre-Match Analysis"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground text-sm">
              Review each point and grade how well you remembered it. Cards you struggle with will appear more often.
            </p>
            
            {/* Filters */}
            {selectedGame === "schemes" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Select value={selectedSchemePosition} onValueChange={setSelectedSchemePosition}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePositions.map(pos => (
                        <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Team Scheme</Label>
                  <Select value={selectedTeamSchemeFilter} onValueChange={setSelectedTeamSchemeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All team schemes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Team Schemes</SelectItem>
                      {availableTeamSchemes.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Opposition Scheme</Label>
                  <Select value={selectedOppositionSchemeFilter} onValueChange={setSelectedOppositionSchemeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All opposition schemes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Opposition Schemes</SelectItem>
                      {availableOppositionSchemes.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            {selectedGame === "positional-guides" && (
              <div className="space-y-2">
                <Label>Position</Label>
                <Select value={selectedGuidePosition} onValueChange={setSelectedGuidePosition}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGuidePositions.map(pos => (
                      <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {selectedGame === "concepts" && concepts.length > 0 && (
              <div className="space-y-2">
                <Label>Filter by Concept</Label>
                <Select value={selectedConceptFilter} onValueChange={setSelectedConceptFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All concepts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Concepts</SelectItem>
                    {concepts.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {selectedGame === "pre-match" && preMatchAnalyses.length > 0 && (
              <div className="space-y-2">
                <Label>Filter by Analysis</Label>
                <Select value={selectedPreMatchFilter} onValueChange={setSelectedPreMatchFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All analyses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Analyses</SelectItem>
                    {preMatchAnalyses.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <Button onClick={startGame} className="w-full bg-gold text-gold-foreground hover:bg-gold/90">
              <Brain className="w-4 h-4 mr-2" />
              Start Learning
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Playing view
  const currentCard = flashcards[currentIndex];
  const isComplete = currentIndex === flashcards.length - 1 && isRevealed;
  const currentProgress = currentCard ? cardProgress[currentCard.cardKey] : null;

  if (flashcards.length === 0) {
    return (
      <div className="space-y-6">
        <Button 
          variant="ghost" 
          onClick={resetGame}
          className="text-gold hover:text-gold/80"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Setup
        </Button>
        
        <Card>
          <CardContent className="p-12 text-center">
            <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="font-bebas text-2xl text-gold mb-2">All Caught Up!</h3>
            <p className="text-muted-foreground">No cards due for review with the current filters.</p>
            <Button onClick={resetGame} variant="outline" className="mt-4">
              Try Different Filters
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={resetGame}
          className="text-gold hover:text-gold/80"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Exit
        </Button>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Card {currentIndex + 1} of {flashcards.length}</span>
          <span className="text-gold">{sessionStats.reviewed} reviewed</span>
        </div>
      </div>
      
      {/* Flashcard */}
      <Card className="min-h-[400px]">
        <CardContent className="p-6 min-h-[400px] flex flex-col">
          {/* Category header */}
          <div className="text-center mb-4">
            <span className="text-xs text-gold/70 uppercase tracking-wider">
              {currentCard?.category}
            </span>
            {currentCard?.subcategory && (
              <span className="text-xs text-muted-foreground ml-2">
                • {currentCard.subcategory}
              </span>
            )}
          </div>
          
          {/* Question prompt - scenario-based question format */}
          {!isRevealed && (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="text-sm text-muted-foreground mb-4 text-center">
                {currentCard?.category}
              </div>
              <h3 className="text-xl font-semibold text-center mb-6 text-gold">
                {currentCard?.title}
              </h3>
              
              {/* Generate scenario-based question based on the card type */}
              <div className="text-muted-foreground mb-6 text-center max-w-lg space-y-4">
                {selectedGame === "schemes" && (
                  <>
                    <p className="text-lg font-medium text-foreground">Match Scenario:</p>
                    <p>Your team is playing in a {currentCard?.title} system. During the {currentCard?.category} phase, what is your primary responsibility and positioning?</p>
                    <p className="text-sm italic">Consider: Where should you be? What are your key movements? How do you interact with teammates?</p>
                  </>
                )}
                
                {selectedGame === "positional-guides" && (
                  <>
                    <p className="text-lg font-medium text-foreground">Application Question:</p>
                    <p>In the context of "{currentCard?.title}", how would you apply this principle during a match situation?</p>
                    <p className="text-sm italic">Think about: When does this apply? What triggers this action? What's the expected outcome?</p>
                  </>
                )}
                
                {selectedGame === "concepts" && (
                  <>
                    <p className="text-lg font-medium text-foreground">Tactical Scenario:</p>
                    <p>Explain "{currentCard?.title}" and describe a specific match situation where you would apply this concept.</p>
                    <p className="text-sm italic">Consider: What problem does this solve? How does it help the team? What must you do technically?</p>
                  </>
                )}
                
                {selectedGame === "pre-match" && (
                  <>
                    <p className="text-lg font-medium text-foreground">Opponent Analysis:</p>
                    <p>Based on the {currentCard?.category} for this match, what specific adjustments should you make to your game?</p>
                    <p className="text-sm italic">Think about: How will this affect your positioning? What opportunities does it create? What risks should you avoid?</p>
                  </>
                )}
              </div>
              
              <Button 
                onClick={() => setIsRevealed(true)}
                className="bg-gold text-gold-foreground hover:bg-gold/90"
              >
                <Eye className="w-4 h-4 mr-2" />
                Reveal Answer
              </Button>
            </div>
          )}
          
          {/* Answer when revealed */}
          {isRevealed && (
            <div className="flex-1 flex flex-col">
              <h3 className="text-lg font-semibold text-center mb-4 text-gold">
                {currentCard?.title}
              </h3>
              <div className="flex-1 flex items-center justify-center">
                <p className="text-base leading-relaxed text-center max-w-2xl">
                  {currentCard?.content}
                </p>
              </div>
              
              {/* Progress indicator */}
              {currentProgress && (
                <p className="text-xs text-muted-foreground text-center mb-4">
                  Reviewed {currentProgress.repetitions} times • Next review in {currentProgress.interval_days} days
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Grade buttons when revealed */}
      {isRevealed && !isComplete && (
        <div className="space-y-3">
          <p className="text-center text-sm text-muted-foreground">How well did you remember this?</p>
          <div className="grid grid-cols-4 gap-2">
            <Button 
              variant="outline"
              className="border-red-500/50 text-red-500 hover:bg-red-500/10 flex-col h-auto py-3"
              onClick={() => handleGrade(1)}
            >
              <span className="font-semibold">Again</span>
              <span className="text-xs opacity-70">Forgot</span>
            </Button>
            <Button 
              variant="outline"
              className="border-orange-500/50 text-orange-500 hover:bg-orange-500/10 flex-col h-auto py-3"
              onClick={() => handleGrade(2)}
            >
              <span className="font-semibold">Hard</span>
              <span className="text-xs opacity-70">Struggled</span>
            </Button>
            <Button 
              variant="outline"
              className="border-blue-500/50 text-blue-500 hover:bg-blue-500/10 flex-col h-auto py-3"
              onClick={() => handleGrade(3)}
            >
              <span className="font-semibold">Good</span>
              <span className="text-xs opacity-70">Remembered</span>
            </Button>
            <Button 
              variant="outline"
              className="border-green-500/50 text-green-500 hover:bg-green-500/10 flex-col h-auto py-3"
              onClick={() => handleGrade(4)}
            >
              <span className="font-semibold">Easy</span>
              <span className="text-xs opacity-70">Perfect</span>
            </Button>
          </div>
        </div>
      )}
      
      {/* Completion view */}
      {isComplete && (
        <Card className="border-gold/30">
          <CardContent className="p-6 text-center">
            <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="font-bebas text-2xl text-gold mb-2">Session Complete!</h3>
            <p className="text-muted-foreground mb-4">
              You reviewed {sessionStats.reviewed} cards
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button onClick={resetGame} className="bg-gold text-gold-foreground hover:bg-gold/90">
                <RotateCcw className="w-4 h-4 mr-2" />
                New Session
              </Button>
              <Button variant="outline" onClick={() => setSelectedGame(null)}>
                Back to Games
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
