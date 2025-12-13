import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCountryFlagUrl } from "@/lib/countryFlags";
import { useLanguage } from "@/contexts/LanguageContext";

interface Player {
  id: string;
  name: string;
  age: number;
  nationality: string;
  position: string;
  club: string;
  club_logo: string;
  image_url: string;
}

export const StarsQuadrantCard = () => {
  const { t } = useLanguage();
  const [starIndex, setStarIndex] = useState(0);
  const [starPlayers, setStarPlayers] = useState<Player[]>([]);

  useEffect(() => {
    const fetchStarPlayers = async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('visible_on_stars_page', true)
        .limit(3);
      
      if (data && !error && data.length > 0) {
        setStarPlayers(data as Player[]);
      }
    };

    fetchStarPlayers();
  }, []);

  useEffect(() => {
    if (starPlayers.length === 0) return;
    
    const interval = setInterval(() => {
      setStarIndex(prev => (prev + 1) % starPlayers.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [starPlayers.length]);

  if (starPlayers.length === 0) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center animate-[fade-in_0.3s_ease-out_forwards]">
      {/* Full quadrant background with player image */}
      {starPlayers.map((player, index) => (
        <div
          key={player.id}
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
          style={{ opacity: index === starIndex ? 1 : 0 }}
        >
          <img 
            src={player.image_url} 
            alt={player.name}
            className="w-full h-full object-cover object-top" 
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-tl from-black/90 via-black/50 to-transparent" />
        </div>
      ))}
      
      {/* Content overlay - positioned in the corner */}
      <div className="absolute bottom-8 right-8 text-right space-y-4">
        {/* Label */}
        <div className="inline-block bg-primary px-4 py-1">
          <span className="text-sm font-bebas uppercase tracking-wider text-black">Our Stars</span>
        </div>
        
        {/* Player info */}
        {starPlayers.map((player, index) => (
          <div
            key={`info-${player.id}`}
            className="transition-opacity duration-1000 ease-in-out"
            style={{ 
              opacity: index === starIndex ? 1 : 0,
              position: index === starIndex ? 'relative' : 'absolute',
              visibility: index === starIndex ? 'visible' : 'hidden',
              right: 0
            }}
          >
            <h3 className="text-3xl font-bebas uppercase text-white tracking-wider">{player.name}</h3>
            <div className="flex items-center justify-end gap-4 mt-2">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bebas text-primary">{player.age}</span>
                <span className="text-xs text-white/60 uppercase">{t("intro.age", "Age")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bebas text-primary">{player.position}</span>
                <span className="text-xs text-white/60 uppercase">{t("intro.position", "Pos")}</span>
              </div>
              {player.nationality && (
                <img 
                  src={getCountryFlagUrl(player.nationality === 'Cape Verdean' ? 'Cape Verde' : player.nationality)} 
                  alt={player.nationality}
                  className="w-8 h-5 object-contain"
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};