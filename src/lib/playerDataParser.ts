// Simplified and optimized player bio parsing

export interface ParsedPlayerData {
  currentClub: string;
  clubLogo: string;
  currentLeague: string;
  tacticalFormations: any[];
  dateOfBirth?: string;
  number?: string;
  currentClubLogo?: string;
  whatsapp?: string;
  externalLinks?: any[];
  strengthsAndPlayStyle?: string;
  topStats?: any;
  seasonStats?: any;
}

export const parsePlayerBio = (bioString: string | null): ParsedPlayerData => {
  const defaultData: ParsedPlayerData = {
    currentClub: '',
    clubLogo: '',
    currentLeague: '',
    tacticalFormations: []
  };

  if (!bioString) return defaultData;

  try {
    const parsed = JSON.parse(bioString);
    
    if (typeof parsed !== 'object' || parsed === null) {
      return defaultData;
    }

    // Extract tactical formations efficiently
    let tacticalFormations: any[] = [];
    
    if (Array.isArray(parsed.schemeHistory)) {
      tacticalFormations = parsed.schemeHistory
        .filter((scheme: any) => scheme.formation && scheme.teamName)
        .map((scheme: any) => ({
          formation: scheme.formation,
          role: scheme.positions?.[0] || '',
          positions: scheme.positions || [],
          club: scheme.teamName,
          clubLogo: scheme.clubLogo,
          playerImage: scheme.playerImage,
          appearances: scheme.matches,
          matches: scheme.matches
        }));
    } else if (Array.isArray(parsed.tacticalFormations)) {
      tacticalFormations = parsed.tacticalFormations;
    }

    return {
      currentClub: parsed.currentClub || '',
      clubLogo: tacticalFormations[0]?.clubLogo || '',
      currentLeague: parsed.currentLeague || tacticalFormations[0]?.league || tacticalFormations[0]?.competition || '',
      tacticalFormations,
      dateOfBirth: parsed.dateOfBirth,
      number: parsed.number,
      currentClubLogo: parsed.currentClubLogo,
      whatsapp: parsed.whatsapp,
      externalLinks: parsed.externalLinks,
      strengthsAndPlayStyle: parsed.strengthsAndPlayStyle,
      topStats: parsed.topStats,
      seasonStats: parsed.seasonStats
    };
  } catch (e) {
    console.error('Error parsing player bio:', e);
    return defaultData;
  }
};

export const parsePlayerHighlights = (highlightsData: any): any[] => {
  if (!highlightsData) return [];

  try {
    const parsed = typeof highlightsData === 'string' 
      ? JSON.parse(highlightsData) 
      : highlightsData;
    
    // Handle new object structure with matchHighlights
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.matchHighlights) {
      return parsed.matchHighlights;
    }
    
    // Handle direct array (backward compatibility)
    if (Array.isArray(parsed)) {
      return parsed;
    }
    
    return [];
  } catch (e) {
    console.error('Error parsing highlights:', e);
    return [];
  }
};
