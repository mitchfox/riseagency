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
    <div className="w-full h-full flex items-center justify-center p-8">
      <div className="relative w-48 aspect-[3/4] rounded-lg overflow-hidden border-2 border-primary/50 shadow-2xl shadow-primary/20 animate-[slideFromBottomRight_0.5s_ease-out_forwards]">
        {/* Player Images with Dark Overlay */}
        {starPlayers.map((player, index) => (
          <div
            key={player.id}
            className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
            style={{ opacity: index === starIndex ? 1 : 0 }}
          >
            <img 
              src={player.image_url} 
              alt={player.name}
              className="w-full h-full object-cover" 
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
          </div>
        ))}
      
        {/* Age - Top Left */}
        <div className="absolute top-3 left-3 flex flex-col items-center">
          {starPlayers.map((player, index) => (
            <div
              key={`age-${player.id}`}
              className="transition-opacity duration-1000 ease-in-out"
              style={{ 
                opacity: index === starIndex ? 1 : 0,
                position: index === starIndex ? 'relative' : 'absolute',
                visibility: index === starIndex ? 'visible' : 'hidden'
              }}
            >
              <div className="text-2xl font-bold text-white font-bebas leading-none text-center">{player.age}</div>
              <div className="text-[8px] text-white/80 uppercase tracking-wider mt-0.5 text-center">{t("intro.age", "Age")}</div>
            </div>
          ))}
        </div>
        
        {/* Nationality Flag - Top Right */}
        <div className="absolute top-3 right-3 flex flex-col items-center">
          {starPlayers.map((player, index) => {
            const nat = player.nationality;
            if (!nat) return null;
            const normalizedNat = nat === 'Cape Verdean' ? 'Cape Verde' : nat;
            const flagUrl = getCountryFlagUrl(normalizedNat);
            return (
              <div
                key={`nat-${player.id}`}
                className="flex flex-col items-center transition-opacity duration-1000 ease-in-out"
                style={{ 
                  opacity: index === starIndex ? 1 : 0,
                  position: index === starIndex ? 'relative' : 'absolute',
                  visibility: index === starIndex ? 'visible' : 'hidden'
                }}
              >
                <img 
                  src={flagUrl} 
                  alt={`${normalizedNat} flag`}
                  className="w-8 h-5 object-contain mb-0.5"
                />
                <div className="text-[8px] text-white/80 uppercase tracking-wider text-center">{t("intro.nationality", "Nationality")}</div>
              </div>
            );
          })}
        </div>
        
        {/* Position - Bottom Left */}
        <div className="absolute bottom-3 left-3 flex flex-col items-center">
          {starPlayers.map((player, index) => (
            <div
              key={`pos-${player.id}`}
              className="transition-opacity duration-1000 ease-in-out"
              style={{ 
                opacity: index === starIndex ? 1 : 0,
                position: index === starIndex ? 'relative' : 'absolute',
                visibility: index === starIndex ? 'visible' : 'hidden'
              }}
            >
              <div className="text-xl font-bold text-white font-bebas leading-none text-center">{player.position}</div>
              <div className="text-[8px] text-white/80 uppercase tracking-wider mt-0.5 text-center">{t("intro.position", "Position")}</div>
            </div>
          ))}
        </div>
        
        {/* Club Logo - Bottom Right */}
        <div className="absolute bottom-3 right-3 flex flex-col items-center">
          {starPlayers.map((player, index) => {
            const clubLogo = player.club_logo;
            return clubLogo ? (
              <div
                key={`club-${player.id}`}
                className="flex flex-col items-center transition-opacity duration-1000 ease-in-out"
                style={{ 
                  opacity: index === starIndex ? 1 : 0,
                  position: index === starIndex ? 'relative' : 'absolute',
                  visibility: index === starIndex ? 'visible' : 'hidden'
                }}
              >
                <img src={clubLogo} alt="Club" className="w-8 h-8 object-contain mb-0.5" />
                <div className="text-[8px] text-white/80 uppercase tracking-wider text-center">{t("intro.club", "Club")}</div>
              </div>
            ) : null;
          })}
        </div>

        {/* Label */}
        <div className="absolute top-0 left-0 right-0 bg-primary/90 py-1 text-center">
          <span className="text-xs font-bebas uppercase tracking-wider text-black">Our Stars</span>
        </div>
      </div>
    </div>
  );
};
