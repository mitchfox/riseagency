import React from 'react';
import { Link } from 'react-router-dom';

interface PlayerLink {
  name: string;
  slug: string;
}

// Create slug from player name
const createPlayerSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
};

/**
 * Parses text content and replaces player names with links to their profiles
 * @param content - The text content to parse
 * @param playerNames - Array of player names to link
 * @returns React nodes with player names as links
 */
export const linkPlayerNames = (
  content: string,
  playerNames: string[]
): React.ReactNode[] => {
  if (!playerNames || playerNames.length === 0) {
    return [content];
  }

  // Create a map of player names to their slugs
  const playerMap: PlayerLink[] = playerNames.map(name => ({
    name,
    slug: createPlayerSlug(name)
  }));

  // Sort by name length (longest first) to avoid partial matches
  playerMap.sort((a, b) => b.name.length - a.name.length);

  // Create regex pattern for all player names (case insensitive)
  const pattern = new RegExp(
    `\\b(${playerMap.map(p => escapeRegExp(p.name)).join('|')})\\b`,
    'gi'
  );

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    // Find the matching player (case insensitive)
    const matchedName = match[1];
    const player = playerMap.find(
      p => p.name.toLowerCase() === matchedName.toLowerCase()
    );

    if (player) {
      // Add the linked player name
      parts.push(
        <Link
          key={`player-${match.index}`}
          to={`/stars/${player.slug}`}
          className="text-primary hover:underline font-medium"
        >
          {matchedName}
        </Link>
      );
    } else {
      parts.push(matchedName);
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last match
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [content];
};

// Helper to escape special regex characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Hook to fetch player names for linking
 */
export const usePlayerNames = () => {
  const [playerNames, setPlayerNames] = React.useState<string[]>([]);

  React.useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data } = await supabase
          .from('players')
          .select('name')
          .eq('visible_on_stars_page', true)
          .eq('representation_status', 'represented');

        if (data) {
          setPlayerNames(data.map(p => p.name));
        }
      } catch (error) {
        console.error('Error fetching player names:', error);
      }
    };

    fetchPlayers();
  }, []);

  return playerNames;
};
