import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Brain, Shuffle, ChevronLeft, ChevronRight, RotateCcw, Target, Lightbulb, BookOpen, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface CognisanceSectionProps {
  playerId: string;
  playerPosition?: string;
}

type GameType = "schemes" | "concepts" | "pre-match" | null;

interface FlashcardData {
  id: string;
  front: string;
  back: string;
  category?: string;
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

export function CognisanceSection({ playerId, playerPosition }: CognisanceSectionProps) {
  const [selectedGame, setSelectedGame] = useState<GameType>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Scheme game state
  const [schemes, setSchemes] = useState<SchemeData[]>([]);
  const [selectedSchemeFilter, setSelectedSchemeFilter] = useState<string>("all");
  const [availableTeamSchemes, setAvailableTeamSchemes] = useState<string[]>([]);
  const [availableOppositionSchemes, setAvailableOppositionSchemes] = useState<string[]>([]);
  const [selectedTeamSchemeFilter, setSelectedTeamSchemeFilter] = useState<string>("all");
  const [selectedOppositionSchemeFilter, setSelectedOppositionSchemeFilter] = useState<string>("all");
  
  // Concept game state
  const [concepts, setConcepts] = useState<ConceptData[]>([]);
  const [selectedConceptFilter, setSelectedConceptFilter] = useState<string>("all");
  
  // Pre-match game state
  const [preMatchAnalyses, setPreMatchAnalyses] = useState<PreMatchData[]>([]);
  const [selectedPreMatchFilter, setSelectedPreMatchFilter] = useState<string>("all");
  
  // Flashcard game state
  const [flashcards, setFlashcards] = useState<FlashcardData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [score, setScore] = useState({ correct: 0, incorrect: 0 });

  // Fetch schemes for the player's position
  const fetchSchemes = useCallback(async () => {
    if (!playerPosition) return;
    
    // Normalize position
    const positionMap: Record<string, string> = {
      'GK': 'Goalkeeper', 'Goalkeeper': 'Goalkeeper',
      'FB': 'Full-Back', 'Full-Back': 'Full-Back', 'Fullback': 'Full-Back',
      'CB': 'Centre-Back', 'Centre-Back': 'Centre-Back', 'Center-Back': 'Centre-Back',
      'CDM': 'Central Defensive-Midfielder', 'Central Defensive-Midfielder': 'Central Defensive-Midfielder',
      'CM': 'Central Midfielder', 'Central Midfielder': 'Central Midfielder',
      'AM': 'Attacking Midfielder', 'Attacking Midfielder': 'Attacking Midfielder', 'CAM': 'Attacking Midfielder',
      'W': 'Winger', 'Winger': 'Winger', 'LW': 'Winger', 'RW': 'Winger',
      'CF': 'Centre-Forward', 'Centre-Forward': 'Centre-Forward', 'ST': 'Centre-Forward', 'Striker': 'Centre-Forward',
    };
    
    const normalizedPosition = positionMap[playerPosition] || playerPosition;
    
    const { data, error } = await supabase
      .from("tactical_schemes")
      .select("*")
      .eq("position", normalizedPosition);
    
    if (!error && data) {
      setSchemes(data);
      const teamSchemes = [...new Set(data.map(s => s.team_scheme))];
      const oppositionSchemes = [...new Set(data.map(s => s.opposition_scheme))];
      setAvailableTeamSchemes(teamSchemes);
      setAvailableOppositionSchemes(oppositionSchemes);
    }
  }, [playerPosition]);

  // Fetch concepts linked to the player
  const fetchConcepts = useCallback(async () => {
    // Get player_analysis records with concept type
    const { data: analysisData } = await supabase
      .from("player_analysis")
      .select("analysis_writer_id")
      .eq("player_id", playerId);
    
    if (!analysisData || analysisData.length === 0) return;
    
    const linkedIds = analysisData
      .filter(a => a.analysis_writer_id)
      .map(a => a.analysis_writer_id);
    
    if (linkedIds.length === 0) return;
    
    const { data: conceptsData } = await supabase
      .from("analyses")
      .select("*")
      .in("id", linkedIds)
      .eq("analysis_type", "concept");
    
    if (conceptsData) {
      setConcepts(conceptsData.map(c => ({
        id: c.id,
        title: c.title || "Untitled Concept",
        points: Array.isArray(c.points) ? c.points : [],
        explanation: c.explanation || undefined
      })));
    }
  }, [playerId]);

  // Fetch pre-match analyses linked to the player
  const fetchPreMatchAnalyses = useCallback(async () => {
    const { data: analysisData } = await supabase
      .from("player_analysis")
      .select("analysis_writer_id")
      .eq("player_id", playerId);
    
    if (!analysisData || analysisData.length === 0) return;
    
    const linkedIds = analysisData
      .filter(a => a.analysis_writer_id)
      .map(a => a.analysis_writer_id);
    
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
  }, [fetchSchemes, fetchConcepts, fetchPreMatchAnalyses]);

  // Generate flashcards based on selected game type and filters
  const generateFlashcards = useCallback(() => {
    const cards: FlashcardData[] = [];
    
    if (selectedGame === "schemes") {
      let filteredSchemes = schemes;
      
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
            cards.push({
              id: `${scheme.id}-${phase.name}`,
              front: `${scheme.team_scheme} vs ${scheme.opposition_scheme}\n\nWhat are your responsibilities in ${phase.name}?`,
              back: phase.content,
              category: phase.name
            });
          }
        });
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
              cards.push({
                id: `${concept.id}-${idx}`,
                front: `${concept.title}\n\n${point.title}`,
                back: point.description,
                category: concept.title
              });
            }
          });
        }
        
        if (concept.explanation) {
          cards.push({
            id: `${concept.id}-explanation`,
            front: `Explain the concept: ${concept.title}`,
            back: concept.explanation,
            category: concept.title
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
          cards.push({
            id: `${analysis.id}-strengths`,
            front: `${analysis.title}\n\nWhat are the opposition's STRENGTHS?`,
            back: analysis.opposition_strengths,
            category: "Opposition Strengths"
          });
        }
        
        if (analysis.opposition_weaknesses) {
          cards.push({
            id: `${analysis.id}-weaknesses`,
            front: `${analysis.title}\n\nWhat are the opposition's WEAKNESSES?`,
            back: analysis.opposition_weaknesses,
            category: "Opposition Weaknesses"
          });
        }
        
        if (analysis.key_details) {
          cards.push({
            id: `${analysis.id}-details`,
            front: `${analysis.title}\n\nWhat are the KEY DETAILS to remember?`,
            back: analysis.key_details,
            category: "Key Details"
          });
        }
        
        if (analysis.points && Array.isArray(analysis.points)) {
          analysis.points.forEach((point: any, idx: number) => {
            if (point.title && point.description) {
              cards.push({
                id: `${analysis.id}-point-${idx}`,
                front: `${analysis.title}\n\n${point.title}`,
                back: point.description,
                category: analysis.title
              });
            }
          });
        }
      });
    }
    
    // Shuffle cards
    const shuffled = cards.sort(() => Math.random() - 0.5);
    setFlashcards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setScore({ correct: 0, incorrect: 0 });
  }, [selectedGame, schemes, concepts, preMatchAnalyses, selectedTeamSchemeFilter, selectedOppositionSchemeFilter, selectedConceptFilter, selectedPreMatchFilter]);

  const startGame = () => {
    generateFlashcards();
    setIsPlaying(true);
  };

  const handleNext = (wasCorrect: boolean) => {
    setScore(prev => ({
      correct: prev.correct + (wasCorrect ? 1 : 0),
      incorrect: prev.incorrect + (wasCorrect ? 0 : 1)
    }));
    
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
    }
  };

  const resetGame = () => {
    setIsPlaying(false);
    setFlashcards([]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setScore({ correct: 0, incorrect: 0 });
  };

  const shuffleCards = () => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    setFlashcards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  // Game selection view
  if (!selectedGame) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bebas text-gold mb-2">Cognisance</h2>
          <p className="text-muted-foreground">Strengthen your football IQ with memory games</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                Test your knowledge of positional responsibilities across different formations
              </p>
              <p className="text-xs text-gold/70 mt-2">{schemes.length} schemes available</p>
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
                Review opposition strengths, weaknesses and key details before a match
              </p>
              <p className="text-xs text-gold/70 mt-2">{preMatchAnalyses.length} analyses available</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Game setup view
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
              {selectedGame === "schemes" && "Tactical Schemes Flashcards"}
              {selectedGame === "concepts" && "Concepts Flashcards"}
              {selectedGame === "pre-match" && "Pre-Match Analysis Flashcards"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedGame === "schemes" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Team Formation</Label>
                  <Select value={selectedTeamSchemeFilter} onValueChange={setSelectedTeamSchemeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All formations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Formations</SelectItem>
                      {availableTeamSchemes.map(scheme => (
                        <SelectItem key={scheme} value={scheme}>{scheme}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Opposition Formation</Label>
                  <Select value={selectedOppositionSchemeFilter} onValueChange={setSelectedOppositionSchemeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All formations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Formations</SelectItem>
                      {availableOppositionSchemes.map(scheme => (
                        <SelectItem key={scheme} value={scheme}>{scheme}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            {selectedGame === "concepts" && (
              <div className="space-y-2">
                <Label>Select Concept</Label>
                <Select value={selectedConceptFilter} onValueChange={setSelectedConceptFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All concepts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Concepts</SelectItem>
                    {concepts.map(concept => (
                      <SelectItem key={concept.id} value={concept.id}>{concept.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {selectedGame === "pre-match" && (
              <div className="space-y-2">
                <Label>Select Pre-Match Analysis</Label>
                <Select value={selectedPreMatchFilter} onValueChange={setSelectedPreMatchFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All analyses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Pre-Match Analyses</SelectItem>
                    {preMatchAnalyses.map(analysis => (
                      <SelectItem key={analysis.id} value={analysis.id}>{analysis.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <Button onClick={startGame} className="w-full bg-gold text-gold-foreground hover:bg-gold/90">
              <Brain className="w-4 h-4 mr-2" />
              Start Flashcards
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Playing view
  const currentCard = flashcards[currentIndex];
  const isComplete = currentIndex === flashcards.length - 1 && isFlipped;

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
            <p className="text-muted-foreground">No flashcards available with the current filters.</p>
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
        
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Card {currentIndex + 1} of {flashcards.length}
          </span>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-green-500">✓ {score.correct}</span>
            <span className="text-red-500">✗ {score.incorrect}</span>
          </div>
        </div>
        
        <Button variant="ghost" size="sm" onClick={shuffleCards}>
          <Shuffle className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Flashcard */}
      <div 
        className="min-h-[400px] perspective-1000 cursor-pointer"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <Card 
          className={cn(
            "min-h-[400px] transition-all duration-500 transform-style-3d relative",
            isFlipped && "rotate-y-180"
          )}
        >
          {/* Front */}
          <CardContent 
            className={cn(
              "absolute inset-0 p-8 flex flex-col items-center justify-center backface-hidden",
              isFlipped && "invisible"
            )}
          >
            {currentCard?.category && (
              <span className="text-xs text-gold/70 uppercase tracking-wider mb-4">
                {currentCard.category}
              </span>
            )}
            <p className="text-lg text-center whitespace-pre-line font-medium">
              {currentCard?.front}
            </p>
            <p className="text-sm text-muted-foreground mt-8">Tap to reveal answer</p>
          </CardContent>
          
          {/* Back */}
          <CardContent 
            className={cn(
              "absolute inset-0 p-8 flex flex-col items-center justify-center backface-hidden rotate-y-180 overflow-y-auto",
              !isFlipped && "invisible"
            )}
          >
            <p className="text-sm text-center whitespace-pre-line leading-relaxed">
              {currentCard?.back}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button 
          variant="outline" 
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        {isFlipped && !isComplete && (
          <>
            <Button 
              variant="outline"
              className="border-red-500/50 text-red-500 hover:bg-red-500/10"
              onClick={() => handleNext(false)}
            >
              Incorrect
            </Button>
            <Button 
              variant="outline"
              className="border-green-500/50 text-green-500 hover:bg-green-500/10"
              onClick={() => handleNext(true)}
            >
              Correct
            </Button>
          </>
        )}
        
        {isComplete && (
          <Button onClick={resetGame} className="bg-gold text-gold-foreground hover:bg-gold/90">
            <RotateCcw className="w-4 h-4 mr-2" />
            Play Again
          </Button>
        )}
        
        <Button 
          variant="outline" 
          onClick={() => handleNext(false)}
          disabled={currentIndex === flashcards.length - 1 || !isFlipped}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Score Summary at end */}
      {isComplete && (
        <Card className="border-gold/30">
          <CardContent className="p-6 text-center">
            <h3 className="font-bebas text-2xl text-gold mb-2">Session Complete!</h3>
            <div className="flex items-center justify-center gap-8 text-lg">
              <div>
                <span className="text-green-500 font-bebas text-3xl">{score.correct}</span>
                <p className="text-sm text-muted-foreground">Correct</p>
              </div>
              <div>
                <span className="text-red-500 font-bebas text-3xl">{score.incorrect}</span>
                <p className="text-sm text-muted-foreground">Incorrect</p>
              </div>
              <div>
                <span className="text-gold font-bebas text-3xl">
                  {Math.round((score.correct / flashcards.length) * 100)}%
                </span>
                <p className="text-sm text-muted-foreground">Accuracy</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
