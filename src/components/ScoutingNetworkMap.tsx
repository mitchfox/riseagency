import { MapPin, ZoomOut, ChevronRight, ChevronDown, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLanguage } from "@/contexts/LanguageContext";
import europeOutline from "@/assets/europe-outline.gif";
import norwichLogo from "@/assets/clubs/norwich-city-official.png";
import bohemiansLogo from "@/assets/clubs/bohemians-1905-official.png";
import jihlavaLogo from "@/assets/clubs/fc-vysocina-jihlava-official.png";
import domazliceLogo from "@/assets/clubs/tj-jiskra-domazlice-official.png";
import forestGreenLogo from "@/assets/clubs/forest-green-rovers.png";

// Flag imports
import englandFlag from "@/assets/flags/england.png";
import scotlandFlag from "@/assets/flags/scotland.png";
import irelandFlag from "@/assets/flags/ireland.png";
import icelandFlag from "@/assets/flags/iceland.png";
import portugalFlag from "@/assets/flags/portugal.png";
import spainFlag from "@/assets/flags/spain.png";
import franceFlag from "@/assets/flags/france.png";
import norwayFlag from "@/assets/flags/norway.png";
import swedenFlag from "@/assets/flags/sweden.png";
import denmarkFlag from "@/assets/flags/denmark.png";
import netherlandsFlag from "@/assets/flags/netherlands.png";
import belgiumFlag from "@/assets/flags/belgium.png";
import germanyFlag from "@/assets/flags/germany.png";
import switzerlandFlag from "@/assets/flags/switzerland.png";
import austriaFlag from "@/assets/flags/austria.png";
import czechRepublicFlag from "@/assets/flags/czech-republic.png";
import polandFlag from "@/assets/flags/poland.png";
import italyFlag from "@/assets/flags/italy.png";
import greeceFlag from "@/assets/flags/greece.png";
import turkeyFlag from "@/assets/flags/turkey.png";
import romaniaFlag from "@/assets/flags/romania.png";
import serbiaFlag from "@/assets/flags/serbia.png";
import croatiaFlag from "@/assets/flags/croatia.png";
import ukraineFlag from "@/assets/flags/ukraine.png";
import russiaFlag from "@/assets/flags/russia.png";
import finlandFlag from "@/assets/flags/finland.png";
import estoniaFlag from "@/assets/flags/estonia.png";
import latviaFlag from "@/assets/flags/latvia.png";
import lithuaniaFlag from "@/assets/flags/lithuania.png";
import bulgariaFlag from "@/assets/flags/bulgaria.png";
import belarusFlag from "@/assets/flags/belarus.png";

interface ScoutingNetworkMapProps {
  initialCountry?: string;
  hideStats?: boolean;
  hideGridToggle?: boolean;
  onClubPositionChange?: (clubName: string, x: number, y: number) => void;
}

const ScoutingNetworkMap = ({ initialCountry, hideStats = false, hideGridToggle = false, onClubPositionChange }: ScoutingNetworkMapProps = {}) => {
  const { t } = useLanguage();
  const [viewBox, setViewBox] = useState("0 0 1000 600");
  const [zoomLevel, setZoomLevel] = useState(0); // 0 = out, 1 = medium, 2 = fully zoomed
  const [showGrid, setShowGrid] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(initialCountry || null);
  const [selectedCluster, setSelectedCluster] = useState<{x: number, y: number} | null>(null);
  const [expandedCity, setExpandedCity] = useState<string | null>(null);
  const [draggingClub, setDraggingClub] = useState<string | null>(null);
  const [clubPositions, setClubPositions] = useState<Record<string, {x: number, y: number}>>({});
  const [wasDragging, setWasDragging] = useState(false);
  // Country -> Clubs (from footballClubs) with optional scouting data overlay
  const [scoutingData, setScoutingData] = useState<Record<string, {id: string, name: string, age: number | null, position: string | null}[]>>({});
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());
  const [expandedClubs, setExpandedClubs] = useState<Set<string>>(new Set());
  // Europe outline is rendered from raster map image (europe-outline.gif)
  
  // Load club positions from database on mount
  useEffect(() => {
    const loadClubPositions = async () => {
      const { data, error } = await supabase
        .from('club_map_positions')
        .select('club_name, x_position, y_position');
      
      if (!error && data) {
        const positions: Record<string, {x: number, y: number}> = {};
        data.forEach(club => {
          if (club.x_position && club.y_position) {
            positions[club.club_name] = { 
              x: Number(club.x_position), 
              y: Number(club.y_position) 
            };
          }
        });
        setClubPositions(positions);
      }
    };
    
    loadClubPositions();
  }, []);

  // Load scouting data from scouting_reports table
  useEffect(() => {
    const loadScoutingData = async () => {
      const { data, error } = await supabase
        .from('scouting_reports')
        .select('id, player_name, current_club, age, position')
        .not('current_club', 'is', null)
        .order('current_club')
        .order('player_name');
      
      if (!error && data) {
        // Group by club name
        const grouped: Record<string, {id: string, name: string, age: number | null, position: string | null}[]> = {};
        
        data.forEach(report => {
          const club = report.current_club || '';
          if (!grouped[club]) grouped[club] = [];
          grouped[club].push({
            id: report.id,
            name: report.player_name,
            age: report.age,
            position: report.position
          });
        });
        
        setScoutingData(grouped);
      }
    };
    
    loadScoutingData();
  }, []);

  // Handle initialCountry prop changes - zoom to country
  useEffect(() => {
    if (initialCountry) {
      setSelectedCountry(initialCountry);
      // Find country marker coordinates
      const countryData = [
        { country: "England", x: 315, y: 375 },
        { country: "Italy", x: 445, y: 500 },
        { country: "Spain", x: 295, y: 525 },
        { country: "Germany", x: 425, y: 375 },
        { country: "France", x: 350, y: 450 },
        { country: "Netherlands", x: 380, y: 355 },
        { country: "Portugal", x: 250, y: 525 },
        { country: "Belgium", x: 370, y: 385 },
        { country: "Czech Republic", x: 460, y: 410 },
        { country: "Scotland", x: 282, y: 310 },
        { country: "Turkey", x: 650, y: 540 },
        { country: "Austria", x: 500, y: 435 },
        { country: "Greece", x: 525, y: 530 },
        { country: "Switzerland", x: 400, y: 445 },
        { country: "Norway", x: 400, y: 250 },
        { country: "Denmark", x: 410, y: 315 },
        { country: "Croatia", x: 490, y: 485 },
        { country: "Poland", x: 500, y: 375 },
        { country: "Serbia", x: 525, y: 485 },
        { country: "Sweden", x: 450, y: 280 },
        { country: "Ukraine", x: 620, y: 400 },
        { country: "Russia", x: 650, y: 300 },
        { country: "Romania", x: 555, y: 455 },
        { country: "Ireland", x: 250, y: 355 },
        { country: "Iceland", x: 225, y: 110 },
        { country: "Bulgaria", x: 560, y: 500 },
        { country: "Belarus", x: 590, y: 290 },
        { country: "Finland", x: 575, y: 200 },
        { country: "Estonia", x: 570, y: 240 },
        { country: "Latvia", x: 570, y: 270 },
        { country: "Lithuania", x: 550, y: 300 },
      ];
      const marker = countryData.find(c => c.country === initialCountry);
      if (marker) {
        const zoom = 3;
        const newWidth = 1000 / zoom;
        const newHeight = 600 / zoom;
        const newX = Math.max(0, Math.min(1000 - newWidth, marker.x - newWidth / 2));
        const newY = Math.max(0, Math.min(600 - newHeight, marker.y - newHeight / 2));
        setViewBox(`${newX} ${newY} ${newWidth} ${newHeight}`);
        setZoomLevel(1);
      }
    } else {
      // Reset to default view
      setSelectedCountry(null);
      setViewBox("0 0 1000 600");
      setZoomLevel(0);
    }
  }, [initialCountry]);
  
  // Sync hardcoded positions to database for clubs that don't have positions yet
  useEffect(() => {
    const syncPositions = async () => {
      for (const club of footballClubs) {
        const { data: existing } = await supabase
          .from('club_map_positions')
          .select('id, x_position, y_position')
          .eq('club_name', club.name)
          .maybeSingle();
        
        if (existing && (!existing.x_position || !existing.y_position)) {
          await supabase
            .from('club_map_positions')
            .update({ 
              x_position: club.x, 
              y_position: club.y,
              country: club.country,
              image_url: club.logo
            })
            .eq('id', existing.id);
        } else if (!existing) {
          // Insert new club
          await supabase
            .from('club_map_positions')
            .insert({
              club_name: club.name,
              country: club.country,
              x_position: club.x,
              y_position: club.y,
              image_url: club.logo
            });
        }
      }
    };
    
    syncPositions();
  }, []);
  
  const handleClubDragStart = (clubName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingClub(clubName);
  };
  
  const handleMapMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggingClub) return;
    
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const viewBoxParts = viewBox.split(' ').map(Number);
    
    // Calculate position in SVG coordinates
    const scaleX = viewBoxParts[2] / rect.width;
    const scaleY = viewBoxParts[3] / rect.height;
    const x = (e.clientX - rect.left) * scaleX + viewBoxParts[0];
    const y = (e.clientY - rect.top) * scaleY + viewBoxParts[1];
    
    setClubPositions(prev => ({
      ...prev,
      [draggingClub]: { x, y }
    }));
    
    // Notify parent component of position change
    if (onClubPositionChange) {
      onClubPositionChange(draggingClub, x, y);
    }
  };
  
  const handleMapMouseUp = async () => {
    if (draggingClub && clubPositions[draggingClub]) {
      // Save the club position to database immediately
      const position = clubPositions[draggingClub];
      const club = footballClubs.find(c => c.name === draggingClub);
      
      if (club) {
        const { data: existing } = await supabase
          .from('club_map_positions')
          .select('id')
          .eq('club_name', club.name)
          .maybeSingle();
        
        if (existing) {
          await supabase
            .from('club_map_positions')
            .update({
              x_position: position.x,
              y_position: position.y
            })
            .eq('id', existing.id);
        }
      }
      setWasDragging(true);
    }
    setDraggingClub(null);
  };
  
  // Get club position (from database override or hardcoded default)
  const getClubPosition = (club: typeof footballClubs[0]) => {
    const override = clubPositions[club.name];
    return override || { x: club.x, y: club.y };
  };
  
  
  // Calculate distance threshold based on zoom level
  const getClusterThreshold = () => {
    if (zoomLevel === 0) return 30; // Large threshold when zoomed out
    if (zoomLevel === 1) return 15; // Medium threshold
    return 0; // No clustering when fully zoomed in
  };

  // Football clubs with their real locations
  const footballClubs = [
    // Czech Republic clubs
    { name: "Bohemians 1905", country: "Czech Republic", city: "Prague", x: 465, y: 405, logo: bohemiansLogo },
    { name: "FC Vysočina Jihlava", country: "Czech Republic", city: "Jihlava", x: 475, y: 415, logo: jihlavaLogo },
    { name: "TJ Jiskra Domažlice", country: "Czech Republic", city: "Domažlice", x: 455, y: 410, logo: domazliceLogo },
    // England clubs
    { name: "Norwich City FC", country: "England", city: "Norwich", x: 345, y: 365, logo: norwichLogo },
    { name: "Forest Green Rovers", country: "England", city: "Nailsworth", x: 315, y: 380, logo: forestGreenLogo },
    // London clubs
    { name: "Arsenal FC", country: "England", city: "London", x: 335, y: 385, logo: "/clubs/arsenal-fc.png" },
    { name: "Chelsea FC", country: "England", city: "London", x: 332, y: 386, logo: "/clubs/chelsea-fc.png" },
    { name: "Fulham FC", country: "England", city: "London", x: 333, y: 387, logo: "/clubs/fulham-fc.png" },
    { name: "Brentford FC", country: "England", city: "London", x: 334, y: 384, logo: "/clubs/brentford-fc.png" },
    { name: "Crystal Palace", country: "England", city: "London", x: 336, y: 388, logo: "/clubs/crystal-palace.png" },
    { name: "Tottenham Hotspur", country: "England", city: "London", x: 337, y: 383, logo: "/clubs/tottenham-hotspur.png" },
    { name: "West Ham United", country: "England", city: "London", x: 338, y: 386, logo: "/clubs/west-ham-united.png" },
    // Other England clubs
    { name: "Brighton & Hove Albion", country: "England", city: "Brighton", x: 335, y: 393, logo: "/clubs/brighton-hove-albion.png" },
    { name: "AFC Bournemouth", country: "England", city: "Bournemouth", x: 318, y: 390, logo: "/clubs/afc-bournemouth.png" },
    { name: "Aston Villa", country: "England", city: "Birmingham", x: 318, y: 375, logo: "/clubs/aston-villa.png" },
    { name: "Wolverhampton Wanderers", country: "England", city: "Wolverhampton", x: 315, y: 372, logo: "/clubs/wolverhampton-wanderers.png" },
    { name: "Nottingham Forest", country: "England", city: "Nottingham", x: 325, y: 370, logo: "/clubs/nottingham-forest.png" },
    { name: "Liverpool FC", country: "England", city: "Liverpool", x: 312, y: 365, logo: "/clubs/liverpool-fc.png" },
    { name: "Everton FC", country: "England", city: "Liverpool", x: 313, y: 367, logo: "/clubs/everton-fc.png" },
    { name: "Manchester City", country: "England", city: "Manchester", x: 316, y: 363, logo: "/clubs/manchester-city.png" },
    { name: "Manchester United", country: "England", city: "Manchester", x: 317, y: 364, logo: "/clubs/manchester-united.png" },
    { name: "Leeds United", country: "England", city: "Leeds", x: 322, y: 358, logo: "/clubs/leeds-united.png" },
    { name: "Burnley FC", country: "England", city: "Burnley", x: 320, y: 360, logo: "/clubs/burnley-fc.png" },
    { name: "Newcastle United", country: "England", city: "Newcastle", x: 322, y: 345, logo: "/clubs/newcastle-united.png" },
    { name: "Sunderland AFC", country: "England", city: "Sunderland", x: 324, y: 343, logo: "/clubs/sunderland-afc.png" },
    // France clubs
    { name: "LOSC Lille", country: "France", city: "Lille", x: 360, y: 390, logo: "/clubs/losc-lille.png" },
    { name: "Le Havre AC", country: "France", city: "Le Havre", x: 345, y: 410, logo: "/clubs/le-havre-ac.png" },
    { name: "FC Metz", country: "France", city: "Metz", x: 385, y: 415, logo: "/clubs/fc-metz.png" },
    { name: "AJ Auxerre", country: "France", city: "Auxerre", x: 365, y: 435, logo: "/clubs/aj-auxerre.png" },
    { name: "FC Nantes", country: "France", city: "Nantes", x: 335, y: 440, logo: "/clubs/fc-nantes.png" },
    { name: "Angers SCO", country: "France", city: "Angers", x: 340, y: 435, logo: "/clubs/angers-sco.png" },
    { name: "FC Lorient", country: "France", city: "Lorient", x: 325, y: 445, logo: "/clubs/fc-lorient.png" },
    { name: "FC Toulouse", country: "France", city: "Toulouse", x: 350, y: 485, logo: "/clubs/fc-toulouse.png" },
    { name: "AS Monaco", country: "France", city: "Monaco", x: 400, y: 485, logo: "/clubs/as-monaco.png" },
    { name: "OGC Nice", country: "France", city: "Nice", x: 395, y: 490, logo: "/clubs/ogc-nice.png" },
    { name: "Stade Rennais FC", country: "France", city: "Rennes", x: 332, y: 425, logo: "/clubs/stade-rennais-fc.png" },
    { name: "Stade Brestois 29", country: "France", city: "Brest", x: 320, y: 425, logo: "/clubs/stade-brestois-29.png" },
    { name: "Paris Saint-Germain", country: "France", city: "Paris", x: 358, y: 420, logo: "/clubs/paris-saint-germain.png" },
    { name: "Paris FC", country: "France", city: "Paris", x: 359, y: 421, logo: "/clubs/paris-fc.png" },
    { name: "RC Lens", country: "France", city: "Lens", x: 362, y: 395, logo: "/clubs/rc-lens.png" },
    { name: "RC Strasbourg Alsace", country: "France", city: "Strasbourg", x: 395, y: 425, logo: "/clubs/rc-strasbourg-alsace.png" },
    { name: "Olympique Lyon", country: "France", city: "Lyon", x: 378, y: 455, logo: "/clubs/olympique-lyon.png" },
    { name: "Olympique Marseille", country: "France", city: "Marseille", x: 378, y: 495, logo: "/clubs/olympique-marseille.png" },
    // Germany clubs
    { name: "1. FC Union Berlin", country: "Germany", city: "Berlin", x: 480, y: 355, logo: "/clubs/1-fc-union-berlin.png" },
    { name: "Borussia Dortmund", country: "Germany", city: "Dortmund", x: 405, y: 375, logo: "/clubs/borussia-dortmund.png" },
    { name: "Borussia Mönchengladbach", country: "Germany", city: "Mönchengladbach", x: 393, y: 380, logo: "/clubs/borussia-monchengladbach.png" },
    { name: "1. FC Köln", country: "Germany", city: "Köln", x: 395, y: 385, logo: "/clubs/1-fc-koln.png" },
    { name: "Bayer 04 Leverkusen", country: "Germany", city: "Leverkusen", x: 398, y: 387, logo: "/clubs/bayer-04-leverkusen.png" },
    { name: "1. FSV Mainz 05", country: "Germany", city: "Mainz", x: 405, y: 405, logo: "/clubs/1-fsv-mainz-05.png" },
    { name: "Eintracht Frankfurt", country: "Germany", city: "Frankfurt", x: 410, y: 405, logo: "/clubs/eintracht-frankfurt.png" },
    { name: "1. FC Heidenheim 1846", country: "Germany", city: "Heidenheim", x: 420, y: 415, logo: "/clubs/1-fc-heidenheim-1846.png" },
    { name: "FC Augsburg", country: "Germany", city: "Augsburg", x: 430, y: 425, logo: "/clubs/fc-augsburg.png" },
    { name: "Bayern Munich", country: "Germany", city: "München", x: 435, y: 425, logo: "/clubs/bayern-munich.png" },
    { name: "VfB Stuttgart", country: "Germany", city: "Stuttgart", x: 415, y: 420, logo: "/clubs/vfb-stuttgart.png" },
    { name: "SC Freiburg", country: "Germany", city: "Freiburg", x: 405, y: 430, logo: "/clubs/sc-freiburg.png" },
    { name: "TSG 1899 Hoffenheim", country: "Germany", city: "Hoffenheim", x: 413, y: 412, logo: "/clubs/tsg-1899-hoffenheim.png" },
    { name: "VfL Wolfsburg", country: "Germany", city: "Wolfsburg", x: 430, y: 355, logo: "/clubs/vfl-wolfsburg.png" },
    { name: "SV Werder Bremen", country: "Germany", city: "Bremen", x: 415, y: 345, logo: "/clubs/sv-werder-bremen.png" },
    { name: "Hamburger SV", country: "Germany", city: "Hamburg", x: 425, y: 335, logo: "/clubs/hamburger-sv.png" },
    { name: "FC St. Pauli", country: "Germany", city: "Hamburg", x: 426, y: 336, logo: "/clubs/fc-st-pauli.png" },
    { name: "RB Leipzig", country: "Germany", city: "Leipzig", x: 455, y: 375, logo: "/clubs/rb-leipzig.png" },
    // Spain clubs
    { name: "Celta de Vigo", country: "Spain", city: "Vigo", x: 270, y: 500, logo: "/clubs/celta-de-vigo.png" },
    { name: "Athletic Bilbao", country: "Spain", city: "Bilbao", x: 300, y: 495, logo: "/clubs/athletic-bilbao.png" },
    { name: "Deportivo Alavés", country: "Spain", city: "Vitoria-Gasteiz", x: 305, y: 495, logo: "/clubs/deportivo-alaves.png" },
    { name: "CA Osasuna", country: "Spain", city: "Pamplona", x: 310, y: 500, logo: "/clubs/ca-osasuna.png" },
    { name: "Atlético de Madrid", country: "Spain", city: "Madrid", x: 310, y: 520, logo: "/clubs/atletico-de-madrid.png" },
    { name: "Getafe CF", country: "Spain", city: "Getafe", x: 311, y: 521, logo: "/clubs/getafe-cf.png" },
    { name: "FC Barcelona", country: "Spain", city: "Barcelona", x: 360, y: 515, logo: "/clubs/fc-barcelona.png" },
    { name: "Girona FC", country: "Spain", city: "Girona", x: 365, y: 505, logo: "/clubs/girona-fc.png" },
    { name: "Levante UD", country: "Spain", city: "Valencia", x: 335, y: 535, logo: "/clubs/levante-ud.png" },
    { name: "Elche CF", country: "Spain", city: "Elche", x: 330, y: 540, logo: "/clubs/elche-cf.png" },
    { name: "Real Madrid", country: "Spain", city: "Madrid", x: 310, y: 520, logo: "/clubs/real-madrid.png" },
    { name: "Rayo Vallecano", country: "Spain", city: "Madrid", x: 312, y: 519, logo: "/clubs/rayo-vallecano.png" },
    { name: "Real Sociedad", country: "Spain", city: "San Sebastián", x: 308, y: 493, logo: "/clubs/real-sociedad.png" },
    { name: "Real Oviedo", country: "Spain", city: "Oviedo", x: 278, y: 493, logo: "/clubs/real-oviedo.png" },
    { name: "Sevilla FC", country: "Spain", city: "Sevilla", x: 290, y: 555, logo: "/clubs/sevilla-fc.png" },
    { name: "Real Betis Balompié", country: "Spain", city: "Sevilla", x: 291, y: 556, logo: "/clubs/real-betis-balompie.png" },
    { name: "Valencia CF", country: "Spain", city: "Valencia", x: 334, y: 536, logo: "/clubs/valencia-cf.png" },
    { name: "Villarreal CF", country: "Spain", city: "Villarreal", x: 337, y: 532, logo: "/clubs/villarreal-cf.png" },
    { name: "RCD Espanyol Barcelona", country: "Spain", city: "Barcelona", x: 361, y: 516, logo: "/clubs/rcd-espanyol-barcelona.png" },
    { name: "RCD Mallorca", country: "Spain", city: "Palma", x: 365, y: 540, logo: "/clubs/rcd-mallorca.png" },
    // Italy clubs
    { name: "Inter Milan", country: "Italy", city: "Milano", x: 445, y: 455, logo: "/clubs/inter-milan.png" },
    { name: "AC Milan", country: "Italy", city: "Milano", x: 446, y: 456, logo: "/clubs/ac-milan.png" },
    { name: "Como 1907", country: "Italy", city: "Como", x: 442, y: 452, logo: "/clubs/como-1907.png" },
    { name: "Atalanta BC", country: "Italy", city: "Bergamo", x: 448, y: 453, logo: "/clubs/atalanta-bc.png" },
    { name: "Hellas Verona", country: "Italy", city: "Verona", x: 455, y: 455, logo: "/clubs/hellas-verona.png" },
    { name: "Genoa CFC", country: "Italy", city: "Genova", x: 425, y: 475, logo: "/clubs/genoa-cfc.png" },
    { name: "Bologna FC 1909", country: "Italy", city: "Bologna", x: 450, y: 475, logo: "/clubs/bologna-fc-1909.png" },
    { name: "ACF Fiorentina", country: "Italy", city: "Firenze", x: 450, y: 490, logo: "/clubs/acf-fiorentina.png" },
    { name: "AS Roma", country: "Italy", city: "Roma", x: 465, y: 515, logo: "/clubs/as-roma.png" },
    { name: "Cagliari Calcio", country: "Italy", city: "Cagliari", x: 425, y: 530, logo: "/clubs/cagliari-calcio.png" },
    { name: "Juventus FC", country: "Italy", city: "Torino", x: 405, y: 455, logo: "/clubs/juventus-fc.png" },
    { name: "Torino FC", country: "Italy", city: "Torino", x: 406, y: 456, logo: "/clubs/torino-fc.png" },
    { name: "Udinese Calcio", country: "Italy", city: "Udine", x: 480, y: 450, logo: "/clubs/udinese-calcio.png" },
    { name: "Parma Calcio 1913", country: "Italy", city: "Parma", x: 440, y: 470, logo: "/clubs/parma-calcio-1913.png" },
    { name: "US Sassuolo", country: "Italy", city: "Sassuolo", x: 445, y: 472, logo: "/clubs/us-sassuolo.png" },
    { name: "US Cremonese", country: "Italy", city: "Cremona", x: 448, y: 457, logo: "/clubs/us-cremonese.png" },
    { name: "Pisa Sporting Club", country: "Italy", city: "Pisa", x: 440, y: 490, logo: "/clubs/pisa-sporting-club.png" },
    { name: "SS Lazio", country: "Italy", city: "Roma", x: 466, y: 516, logo: "/clubs/ss-lazio.png" },
    { name: "SSC Napoli", country: "Italy", city: "Napoli", x: 470, y: 525, logo: "/clubs/ssc-napoli.png" },
    { name: "US Lecce", country: "Italy", city: "Lecce", x: 510, y: 530, logo: "/clubs/us-lecce.png" },
    
    // Ukraine
    { name: "Dynamo Kyiv", country: "Ukraine", city: "Kyiv", x: 635, y: 405, logo: "/clubs/dynamo-kyiv.png" },
    { name: "Obolon Kyiv", country: "Ukraine", city: "Kyiv", x: 636, y: 406, logo: "/clubs/obolon-kyiv.png" },
    { name: "Shakhtar Donetsk", country: "Ukraine", city: "Donetsk", x: 700, y: 440, logo: "/clubs/shakhtar-donetsk.png" },
    { name: "Zorya Lugansk", country: "Ukraine", city: "Lugansk", x: 720, y: 430, logo: "/clubs/zorya-lugansk.png" },
    { name: "Metalist 1925 Kharkiv", country: "Ukraine", city: "Kharkiv", x: 680, y: 410, logo: "/clubs/metalist-1925-kharkiv.png" },
    { name: "Rukh Lviv", country: "Ukraine", city: "Lviv", x: 560, y: 410, logo: "/clubs/rukh-lviv.png" },
    { name: "Karpaty Lviv", country: "Ukraine", city: "Lviv", x: 561, y: 411, logo: "/clubs/karpaty-lviv.png" },
    { name: "Kryvbas Kryvyi Rig", country: "Ukraine", city: "Kryvyi Rig", x: 650, y: 440, logo: "/clubs/kryvbas-kryvyi-rig.png" },
    { name: "LNZ Cherkasy", country: "Ukraine", city: "Cherkasy", x: 640, y: 420, logo: "/clubs/lnz-cherkasy.png" },
    { name: "NK Veres Rivne", country: "Ukraine", city: "Rivne", x: 580, y: 395, logo: "/clubs/nk-veres-rivne.png" },
    { name: "Polissya Zhytomyr", country: "Ukraine", city: "Zhytomyr", x: 610, y: 400, logo: "/clubs/polissya-zhytomyr.png" },
    { name: "SC Poltava", country: "Ukraine", city: "Poltava", x: 665, y: 415, logo: "/clubs/sc-poltava.png" },
    { name: "Epicentr Kamyanets-Podilskyi", country: "Ukraine", city: "Kamyanets-Podilskyi", x: 585, y: 430, logo: "/clubs/epicentr-kamyanets-podilskyi.png" },
    { name: "Kolos Kovalivka", country: "Ukraine", city: "Kovalivka", x: 630, y: 410, logo: "/clubs/kolos-kovalivka.png" },
    { name: "FC Oleksandriya", country: "Ukraine", city: "Oleksandriya", x: 645, y: 430, logo: "/clubs/fc-oleksandriya.png" },
    { name: "FC Kudrivka", country: "Ukraine", city: "Kudrivka", x: 632, y: 408, logo: "/clubs/fc-kudrivka.png" },
    
    // Portugal
    { name: "FC Porto", country: "Portugal", city: "Porto", x: 235, y: 518, logo: "/clubs/fc-porto.png" },
    { name: "FC Arouca", country: "Portugal", city: "Arouca", x: 238, y: 522, logo: "/clubs/fc-arouca.png" },
    { name: "FC Famalicão", country: "Portugal", city: "Famalicão", x: 238, y: 515, logo: "/clubs/fc-famalicao.png" },
    { name: "FC Alverca", country: "Portugal", city: "Alverca", x: 235, y: 535, logo: "/clubs/fc-alverca.png" },
    { name: "SC Braga", country: "Portugal", city: "Braga", x: 237, y: 515, logo: "/clubs/sc-braga.png" },
    { name: "SL Benfica", country: "Portugal", city: "Lisboa", x: 235, y: 536, logo: "/clubs/sl-benfica.png" },
    { name: "Sporting CP", country: "Portugal", city: "Lisboa", x: 236, y: 537, logo: "/clubs/sporting-cp.png" },
    { name: "Vitória Guimarães SC", country: "Portugal", city: "Guimarães", x: 238, y: 516, logo: "/clubs/vitoria-guimaraes-sc.png" },
    { name: "AVS Futebol", country: "Portugal", city: "Vila das Aves", x: 237, y: 517, logo: "/clubs/avs-futebol.png" },
    { name: "Casa Pia AC", country: "Portugal", city: "Lisboa", x: 236, y: 536, logo: "/clubs/casa-pia-ac.png" },
    { name: "CD Nacional", country: "Portugal", city: "Funchal", x: 200, y: 560, logo: "/clubs/cd-nacional.png" },
    { name: "CD Santa Clara", country: "Portugal", city: "Ponta Delgada", x: 150, y: 535, logo: "/clubs/cd-santa-clara.png" },
    { name: "CD Tondela", country: "Portugal", city: "Tondela", x: 232, y: 525, logo: "/clubs/cd-tondela.png" },
    { name: "CF Estrela Amadora", country: "Portugal", city: "Amadora", x: 236, y: 535, logo: "/clubs/cf-estrela-amadora.png" },
    { name: "GD Estoril Praia", country: "Portugal", city: "Estoril", x: 234, y: 536, logo: "/clubs/gd-estoril-praia.png" },
    { name: "Gil Vicente FC", country: "Portugal", city: "Barcelos", x: 237, y: 516, logo: "/clubs/gil-vicente-fc.png" },
    { name: "Moreirense FC", country: "Portugal", city: "Moreira de Cónegos", x: 237, y: 517, logo: "/clubs/moreirense-fc.png" },
    { name: "Rio Ave FC", country: "Portugal", city: "Vila do Conde", x: 236, y: 517, logo: "/clubs/rio-ave-fc.png" },
    
    // Romania
    { name: "CFR Cluj", country: "Romania", city: "Cluj-Napoca", x: 565, y: 450, logo: "/clubs/cfr-cluj.png" },
    { name: "CS Universitatea Craiova", country: "Romania", city: "Craiova", x: 560, y: 485, logo: "/clubs/cs-universitatea-craiova.png" },
    { name: "FC Botosani", country: "Romania", city: "Botosani", x: 585, y: 440, logo: "/clubs/fc-botosani.png" },
    { name: "ACSC FC Arges", country: "Romania", city: "Pitesti", x: 565, y: 475, logo: "/clubs/acsc-fc-arges.png" },
    { name: "AFC Unirea 04 Slobozia", country: "Romania", city: "Slobozia", x: 590, y: 480, logo: "/clubs/afc-unirea-04-slobozia.png" },
    { name: "AFK Csikszereda Miercurea Ciuc", country: "Romania", city: "Miercurea Ciuc", x: 575, y: 450, logo: "/clubs/afk-csikszereda-miercurea-ciuc.png" },
    { name: "FC Universitatea Cluj", country: "Romania", city: "Cluj-Napoca", x: 566, y: 451, logo: "/clubs/fc-universitatea-cluj.png" },
    { name: "FCSB", country: "Romania", city: "Bucharest", x: 580, y: 485, logo: "/clubs/fcsb.png" },
    { name: "FCV Farul Constanta", country: "Romania", city: "Constanta", x: 600, y: 485, logo: "/clubs/fcv-farul-constanta.png" },
    { name: "Petrolul Ploiesti", country: "Romania", city: "Ploiesti", x: 580, y: 475, logo: "/clubs/petrolul-ploiesti.png" },
    { name: "SC Otelul Galati", country: "Romania", city: "Galati", x: 600, y: 455, logo: "/clubs/sc-otelul-galati.png" },
    { name: "UTA Arad", country: "Romania", city: "Arad", x: 540, y: 455, logo: "/clubs/uta-arad.png" },
    { name: "FC Dinamo 1948", country: "Romania", city: "Bucharest", x: 581, y: 486, logo: "/clubs/fc-dinamo-1948.png" },
    { name: "FC Hermannstadt", country: "Romania", city: "Sibiu", x: 565, y: 460, logo: "/clubs/fc-hermannstadt.png" },
    { name: "FC Metaloglobus Bucharest", country: "Romania", city: "Bucharest", x: 580, y: 484, logo: "/clubs/fc-metaloglobus-bucharest.png" },
    { name: "FC Rapid 1923", country: "Romania", city: "Bucharest", x: 581, y: 485, logo: "/clubs/fc-rapid-1923.png" },
    
    // Russia
    { name: "CSKA Moscow", country: "Russia", city: "Moscow", x: 695, y: 345, logo: "/clubs/cska-moscow.png" },
    { name: "Dynamo Moscow", country: "Russia", city: "Moscow", x: 696, y: 346, logo: "/clubs/dynamo-moscow.png" },
    { name: "FC Krasnodar", country: "Russia", city: "Krasnodar", x: 720, y: 455, logo: "/clubs/fc-krasnodar.png" },
    { name: "FC Rostov", country: "Russia", city: "Rostov-on-Don", x: 710, y: 440, logo: "/clubs/fc-rostov.png" },
    { name: "FC Sochi", country: "Russia", city: "Sochi", x: 730, y: 470, logo: "/clubs/fc-sochi.png" },
    { name: "Akhmat Grozny", country: "Russia", city: "Grozny", x: 750, y: 470, logo: "/clubs/akhmat-grozny.png" },
    { name: "Akron Togliatti", country: "Russia", city: "Togliatti", x: 785, y: 380, logo: "/clubs/akron-togliatti.png" },
    { name: "Baltika Kaliningrad", country: "Russia", city: "Kaliningrad", x: 540, y: 370, logo: "/clubs/baltika-kaliningrad.png" },
    { name: "Dinamo Makhachkala", country: "Russia", city: "Makhachkala", x: 750, y: 465, logo: "/clubs/dinamo-makhachkala.png" },
    { name: "FC Pari Nizhniy Novgorod", country: "Russia", city: "Nizhniy Novgorod", x: 730, y: 350, logo: "/clubs/fc-pari-nizhniy-novgorod.png" },
    { name: "Zenit St. Petersburg", country: "Russia", city: "St. Petersburg", x: 635, y: 315, logo: "/clubs/zenit-st-petersburg.png" },
    { name: "Krylya Sovetov Samara", country: "Russia", city: "Samara", x: 800, y: 380, logo: "/clubs/krylya-sovetov-samara.png" },
    { name: "Lokomotiv Moscow", country: "Russia", city: "Moscow", x: 697, y: 347, logo: "/clubs/lokomotiv-moscow.png" },
    { name: "Rubin Kazan", country: "Russia", city: "Kazan", x: 780, y: 350, logo: "/clubs/rubin-kazan.png" },
    { name: "Spartak Moscow", country: "Russia", city: "Moscow", x: 695, y: 346, logo: "/clubs/spartak-moscow.png" },
    { name: "Torpedo Moscow", country: "Russia", city: "Moscow", x: 696, y: 345, logo: "/clubs/torpedo-moscow.png" },
    
    // Scotland
    { name: "Celtic FC", country: "Scotland", city: "Glasgow", x: 280, y: 312, logo: "/clubs/celtic-fc.png" },
    { name: "Rangers FC", country: "Scotland", city: "Glasgow", x: 281, y: 313, logo: "/clubs/rangers-fc.png" },
    { name: "Aberdeen FC", country: "Scotland", city: "Aberdeen", x: 288, y: 305, logo: "/clubs/aberdeen-fc.png" },
    { name: "Dundee FC", country: "Scotland", city: "Dundee", x: 288, y: 310, logo: "/clubs/dundee-fc.png" },
    { name: "Dundee United FC", country: "Scotland", city: "Dundee", x: 289, y: 311, logo: "/clubs/dundee-united-fc.png" },
    { name: "Motherwell FC", country: "Scotland", city: "Motherwell", x: 282, y: 313, logo: "/clubs/motherwell-fc.png" },
    { name: "St. Mirren FC", country: "Scotland", city: "Paisley", x: 279, y: 313, logo: "/clubs/st-mirren-fc.png" },
    { name: "Falkirk FC", country: "Scotland", city: "Falkirk", x: 284, y: 314, logo: "/clubs/falkirk-fc.png" },
    { name: "Heart of Midlothian FC", country: "Scotland", city: "Edinburgh", x: 286, y: 315, logo: "/clubs/heart-of-midlothian-fc.png" },
    { name: "Hibernian FC", country: "Scotland", city: "Edinburgh", x: 287, y: 316, logo: "/clubs/hibernian-fc.png" },
    { name: "Kilmarnock FC", country: "Scotland", city: "Kilmarnock", x: 280, y: 314, logo: "/clubs/kilmarnock-fc.png" },
    { name: "Livingston FC", country: "Scotland", city: "Livingston", x: 285, y: 314, logo: "/clubs/livingston-fc.png" },
    
    // Serbia
    { name: "FK IMT Belgrad", country: "Serbia", city: "Belgrade", x: 525, y: 485, logo: "/clubs/fk-imt-belgrad.png" },
    { name: "FK Cukaricki", country: "Serbia", city: "Belgrade", x: 526, y: 486, logo: "/clubs/fk-cukaricki.png" },
    { name: "FK Partizan Belgrade", country: "Serbia", city: "Belgrade", x: 527, y: 487, logo: "/clubs/fk-partizan-belgrade.png" },
    { name: "Red Star Belgrade", country: "Serbia", city: "Belgrade", x: 528, y: 488, logo: "/clubs/red-star-belgrade.png" },
    { name: "OFK Beograd", country: "Serbia", city: "Belgrade", x: 529, y: 489, logo: "/clubs/ofk-beograd.png" },
    { name: "FK Vojvodina Novi Sad", country: "Serbia", city: "Novi Sad", x: 522, y: 471, logo: "/clubs/fk-vojvodina-novi-sad.png" },
    { name: "Zeleznicar Pancevo", country: "Serbia", city: "Pancevo", x: 530, y: 480, logo: "/clubs/zeleznicar-pancevo.png" },
    { name: "FK Radnik Surdulica", country: "Serbia", city: "Surdulica", x: 538, y: 500, logo: "/clubs/fk-radnik-surdulica.png" },
    { name: "FK Spartak Subotica", country: "Serbia", city: "Subotica", x: 520, y: 468, logo: "/clubs/fk-spartak-subotica.png" },
    { name: "FK TSC Backa Topola", country: "Serbia", city: "Backa Topola", x: 521, y: 469, logo: "/clubs/fk-tsc-backa-topola.png" },
    { name: "FK Javor-Matis Ivanjica", country: "Serbia", city: "Ivanjica", x: 518, y: 490, logo: "/clubs/fk-javor-matis-ivanjica.png" },
    { name: "FK Mladost Lucani", country: "Serbia", city: "Lucani", x: 522, y: 486, logo: "/clubs/fk-mladost-lucani.png" },
    { name: "FK Napredak Krusevac", country: "Serbia", city: "Krusevac", x: 530, y: 490, logo: "/clubs/fk-napredak-krusevac.png" },
    { name: "FK Novi Pazar", country: "Serbia", city: "Novi Pazar", x: 518, y: 495, logo: "/clubs/fk-novi-pazar.png" },
    { name: "FK Radnicki 1923 Kragujevac", country: "Serbia", city: "Kragujevac", x: 524, y: 488, logo: "/clubs/fk-radnicki-1923-kragujevac.png" },
    { name: "FK Radnicki Nis", country: "Serbia", city: "Nis", x: 532, y: 494, logo: "/clubs/fk-radnicki-nis.png" },
    
    // Sweden
    { name: "AIK", country: "Sweden", city: "Stockholm", x: 430, y: 280, logo: "/clubs/aik.png" },
    { name: "Djurgårdens IF", country: "Sweden", city: "Stockholm", x: 431, y: 281, logo: "/clubs/djurgardens-if.png" },
    { name: "Hammarby IF", country: "Sweden", city: "Stockholm", x: 432, y: 282, logo: "/clubs/hammarby-if.png" },
    { name: "IF Brommapojkarna", country: "Sweden", city: "Stockholm", x: 433, y: 283, logo: "/clubs/if-brommapojkarna.png" },
    { name: "BK Häcken", country: "Sweden", city: "Gothenburg", x: 395, y: 300, logo: "/clubs/bk-hacken.png" },
    { name: "GAIS", country: "Sweden", city: "Gothenburg", x: 396, y: 301, logo: "/clubs/gais.png" },
    { name: "IFK Göteborg", country: "Sweden", city: "Gothenburg", x: 397, y: 302, logo: "/clubs/ifk-goteborg.png" },
    { name: "IF Elfsborg", country: "Sweden", city: "Borås", x: 398, y: 305, logo: "/clubs/if-elfsborg.png" },
    { name: "Halmstads BK", country: "Sweden", city: "Halmstad", x: 398, y: 315, logo: "/clubs/halmstads-bk.png" },
    { name: "Degerfors IF", country: "Sweden", city: "Degerfors", x: 410, y: 290, logo: "/clubs/degerfors-if.png" },
    { name: "IFK Norrköping", country: "Sweden", city: "Norrköping", x: 422, y: 295, logo: "/clubs/ifk-norrkoping.png" },
    { name: "IK Sirius", country: "Sweden", city: "Uppsala", x: 425, y: 285, logo: "/clubs/ik-sirius.png" },
    { name: "Malmö FF", country: "Sweden", city: "Malmö", x: 398, y: 325, logo: "/clubs/malmo-ff.png" },
    { name: "Mjällby AIF", country: "Sweden", city: "Sölvesborg", x: 412, y: 320, logo: "/clubs/mjallby-aif.png" },
    { name: "IFK Värnamo", country: "Sweden", city: "Värnamo", x: 408, y: 308, logo: "/clubs/ifk-varnamo.png" },
    { name: "Östers IF", country: "Sweden", city: "Växjö", x: 415, y: 315, logo: "/clubs/osters-if.png" },
    
    // Switzerland
    { name: "FC Zürich", country: "Switzerland", city: "Zürich", x: 402, y: 440, logo: "/clubs/fc-zurich.png" },
    { name: "Grasshopper Club Zürich", country: "Switzerland", city: "Zürich", x: 403, y: 441, logo: "/clubs/grasshopper-club-zurich.png" },
    { name: "FC Winterthur", country: "Switzerland", city: "Winterthur", x: 404, y: 438, logo: "/clubs/fc-winterthur.png" },
    { name: "BSC Young Boys", country: "Switzerland", city: "Bern", x: 395, y: 445, logo: "/clubs/bsc-young-boys.png" },
    { name: "FC Thun", country: "Switzerland", city: "Thun", x: 395, y: 455, logo: "/clubs/fc-thun.png" },
    { name: "FC Basel 1893", country: "Switzerland", city: "Basel", x: 385, y: 440, logo: "/clubs/fc-basel-1893.png" },
    { name: "FC Luzern", country: "Switzerland", city: "Luzern", x: 398, y: 448, logo: "/clubs/fc-luzern.png" },
    { name: "FC Lausanne-Sport", country: "Switzerland", city: "Lausanne", x: 388, y: 455, logo: "/clubs/fc-lausanne-sport.png" },
    { name: "Servette FC", country: "Switzerland", city: "Geneva", x: 386, y: 460, logo: "/clubs/servette-fc.png" },
    { name: "FC Sion", country: "Switzerland", city: "Sion", x: 390, y: 465, logo: "/clubs/fc-sion.png" },
    { name: "FC St. Gallen 1879", country: "Switzerland", city: "St. Gallen", x: 412, y: 438, logo: "/clubs/fc-st-gallen-1879.png" },
    { name: "FC Lugano", country: "Switzerland", city: "Lugano", x: 405, y: 470, logo: "/clubs/fc-lugano.png" },
    
    // Turkey
    { name: "Fenerbahçe", country: "Turkey", city: "Istanbul", x: 635, y: 545, logo: "/clubs/fenerbahce.png" },
    { name: "Beşiktaş JK", country: "Turkey", city: "Istanbul", x: 636, y: 546, logo: "/clubs/besiktas-jk.png" },
    { name: "Galatasaray", country: "Turkey", city: "Istanbul", x: 637, y: 547, logo: "/clubs/galatasaray.png" },
    { name: "Başakşehir FK", country: "Turkey", city: "Istanbul", x: 638, y: 548, logo: "/clubs/basaksehir-fk.png" },
    { name: "Eyüpspor", country: "Turkey", city: "Istanbul", x: 639, y: 549, logo: "/clubs/eyupspor.png" },
    { name: "Kasımpaşa", country: "Turkey", city: "Istanbul", x: 640, y: 550, logo: "/clubs/kasimpasa.png" },
    { name: "Fatih Karagümrük", country: "Turkey", city: "Istanbul", x: 641, y: 551, logo: "/clubs/fatih-karagumruk.png" },
    { name: "Alanyaspor", country: "Turkey", city: "Alanya", x: 655, y: 565, logo: "/clubs/alanyaspor.png" },
    { name: "Antalyaspor", country: "Turkey", city: "Antalya", x: 650, y: 565, logo: "/clubs/antalyaspor.png" },
    { name: "Çaykur Rizespor", country: "Turkey", city: "Rize", x: 710, y: 545, logo: "/clubs/caykur-rizespor.png" },
    { name: "Trabzonspor", country: "Turkey", city: "Trabzon", x: 700, y: 545, logo: "/clubs/trabzonspor.png" },
    { name: "Samsunspor", country: "Turkey", city: "Samsun", x: 680, y: 540, logo: "/clubs/samsunspor.png" },
    { name: "Gaziantep FK", country: "Turkey", city: "Gaziantep", x: 685, y: 565, logo: "/clubs/gaziantep-fk.png" },
    { name: "Gençlerbirliği Ankara", country: "Turkey", city: "Ankara", x: 655, y: 535, logo: "/clubs/genclerbirligi-ankara.png" },
    { name: "Göztepe", country: "Turkey", city: "Izmir", x: 605, y: 560, logo: "/clubs/goztepe.png" },
    { name: "Kayserispor", country: "Turkey", city: "Kayseri", x: 670, y: 555, logo: "/clubs/kayserispor.png" },
    { name: "Kocaelispor", country: "Turkey", city: "Kocaeli", x: 642, y: 540, logo: "/clubs/kocaelispor.png" },
    { name: "Konyaspor", country: "Turkey", city: "Konya", x: 655, y: 560, logo: "/clubs/konyaspor.png" },
    
    // Netherlands
    { name: "Ajax Amsterdam", country: "Netherlands", city: "Amsterdam", x: 378, y: 355, logo: "/clubs/ajax-amsterdam.png" },
    { name: "FC Volendam", country: "Netherlands", city: "Volendam", x: 380, y: 352, logo: "/clubs/fc-volendam.png" },
    { name: "AZ Alkmaar", country: "Netherlands", city: "Alkmaar", x: 377, y: 350, logo: "/clubs/az-alkmaar.png" },
    { name: "SC Telstar", country: "Netherlands", city: "Velsen-Zuid", x: 376, y: 353, logo: "/clubs/sc-telstar.png" },
    { name: "Feyenoord Rotterdam", country: "Netherlands", city: "Rotterdam", x: 372, y: 364, logo: "/clubs/feyenoord-rotterdam.png" },
    { name: "Excelsior Rotterdam", country: "Netherlands", city: "Rotterdam", x: 373, y: 365, logo: "/clubs/excelsior-rotterdam.png" },
    { name: "Sparta Rotterdam", country: "Netherlands", city: "Rotterdam", x: 374, y: 366, logo: "/clubs/sparta-rotterdam.png" },
    { name: "FC Utrecht", country: "Netherlands", city: "Utrecht", x: 380, y: 360, logo: "/clubs/fc-utrecht.png" },
    { name: "FC Groningen", country: "Netherlands", city: "Groningen", x: 388, y: 335, logo: "/clubs/fc-groningen.png" },
    { name: "SC Heerenveen", country: "Netherlands", city: "Heerenveen", x: 383, y: 340, logo: "/clubs/sc-heerenveen.png" },
    { name: "Heracles Almelo", country: "Netherlands", city: "Almelo", x: 388, y: 352, logo: "/clubs/heracles-almelo.png" },
    { name: "FC Twente", country: "Netherlands", city: "Enschede", x: 390, y: 355, logo: "/clubs/twente-enschede-fc.png" },
    { name: "Go Ahead Eagles", country: "Netherlands", city: "Deventer", x: 386, y: 355, logo: "/clubs/go-ahead-eagles.png" },
    { name: "PEC Zwolle", country: "Netherlands", city: "Zwolle", x: 385, y: 350, logo: "/clubs/pec-zwolle.png" },
    { name: "NEC Nijmegen", country: "Netherlands", city: "Nijmegen", x: 383, y: 368, logo: "/clubs/nec-nijmegen.png" },
    { name: "PSV Eindhoven", country: "Netherlands", city: "Eindhoven", x: 378, y: 375, logo: "/clubs/psv-eindhoven.png" },
    { name: "NAC Breda", country: "Netherlands", city: "Breda", x: 375, y: 370, logo: "/clubs/nac-breda.png" },
    { name: "Fortuna Sittard", country: "Netherlands", city: "Sittard", x: 370, y: 375, logo: "/clubs/fortuna-sittard.png" },
    
    // Norway
    { name: "FK Bodø/Glimt", country: "Norway", city: "Bodø", x: 420, y: 190, logo: "/clubs/fk-bodo-glimt.png" },
    { name: "Tromsø IL", country: "Norway", city: "Tromsø", x: 445, y: 160, logo: "/clubs/tromso-il.png" },
    { name: "Rosenborg BK", country: "Norway", city: "Trondheim", x: 410, y: 230, logo: "/clubs/rosenborg-bk.png" },
    { name: "Molde FK", country: "Norway", city: "Molde", x: 390, y: 240, logo: "/clubs/molde-fk.png" },
    { name: "Kristiansund BK", country: "Norway", city: "Kristiansund", x: 385, y: 238, logo: "/clubs/kristiansund-bk.png" },
    { name: "SK Brann", country: "Norway", city: "Bergen", x: 360, y: 260, logo: "/clubs/sk-brann.png" },
    { name: "FK Haugesund", country: "Norway", city: "Haugesund", x: 355, y: 270, logo: "/clubs/fk-haugesund.png" },
    { name: "Viking FK", country: "Norway", city: "Stavanger", x: 350, y: 280, logo: "/clubs/viking-fk.png" },
    { name: "Bryne FK", country: "Norway", city: "Bryne", x: 355, y: 285, logo: "/clubs/bryne-fk.png" },
    { name: "Sandefjord Fotball", country: "Norway", city: "Sandefjord", x: 410, y: 275, logo: "/clubs/sandefjord-fotball.png" },
    { name: "Sarpsborg 08 FF", country: "Norway", city: "Sarpsborg", x: 415, y: 275, logo: "/clubs/sarpsborg-08-ff.png" },
    { name: "Fredrikstad FK", country: "Norway", city: "Fredrikstad", x: 415, y: 278, logo: "/clubs/fredrikstad-fk.png" },
    { name: "Strømsgodset IF", country: "Norway", city: "Drammen", x: 408, y: 272, logo: "/clubs/stromsgodset-if.png" },
    { name: "KFUM-Kameratene Oslo", country: "Norway", city: "Oslo", x: 412, y: 270, logo: "/clubs/kfum-kameratene-oslo.png" },
    { name: "Vålerenga Fotball", country: "Norway", city: "Oslo", x: 413, y: 271, logo: "/clubs/valerenga-fotball-elite.png" },
    { name: "Hamarkameratene", country: "Norway", city: "Hamar", x: 418, y: 260, logo: "/clubs/hamarkameratene.png" },
    
    // Poland
    { name: "Arka Gdynia", country: "Poland", city: "Gdynia", x: 465, y: 340, logo: "/clubs/arka-gdynia.png" },
    { name: "Jagiellonia Białystok", country: "Poland", city: "Białystok", x: 540, y: 345, logo: "/clubs/jagiellonia-bialystok.png" },
    { name: "Lechia Gdańsk", country: "Poland", city: "Gdańsk", x: 467, y: 338, logo: "/clubs/lechia-gdansk.png" },
    { name: "Legia Warszawa", country: "Poland", city: "Warsaw", x: 510, y: 362, logo: "/clubs/legia-warszawa.png" },
    { name: "Radomiak Radom", country: "Poland", city: "Radom", x: 515, y: 370, logo: "/clubs/radomiak-radom.png" },
    { name: "Motor Lublin", country: "Poland", city: "Lublin", x: 545, y: 375, logo: "/clubs/motor-lublin.png" },
    { name: "Widzew Łódź", country: "Poland", city: "Łódź", x: 500, y: 370, logo: "/clubs/widzew-lodz.png" },
    { name: "Korona Kielce", country: "Poland", city: "Kielce", x: 515, y: 385, logo: "/clubs/korona-kielce.png" },
    { name: "Raków Częstochowa", country: "Poland", city: "Częstochowa", x: 505, y: 390, logo: "/clubs/rakow-czestochowa.png" },
    { name: "Cracovia", country: "Poland", city: "Kraków", x: 520, y: 405, logo: "/clubs/cracovia.png" },
    { name: "Bruk-Bet Termalica Nieciecza", country: "Poland", city: "Nieciecza", x: 528, y: 410, logo: "/clubs/bruk-bet-termalica-nieciecza.png" },
    { name: "GKS Katowice", country: "Poland", city: "Katowice", x: 515, y: 400, logo: "/clubs/gks-katowice.png" },
    { name: "Górnik Zabrze", country: "Poland", city: "Zabrze", x: 512, y: 398, logo: "/clubs/gornik-zabrze.png" },
    { name: "Piast Gliwice", country: "Poland", city: "Gliwice", x: 513, y: 395, logo: "/clubs/piast-gliwice.png" },
    { name: "Pogoń Szczecin", country: "Poland", city: "Szczecin", x: 440, y: 345, logo: "/clubs/pogon-szczecin.png" },
    { name: "Lech Poznań", country: "Poland", city: "Poznań", x: 470, y: 365, logo: "/clubs/lech-poznan.png" },
    { name: "Zagłębie Lubin", country: "Poland", city: "Lubin", x: 475, y: 375, logo: "/clubs/zaglebie-lubin.png" },
    { name: "Wisła Płock", country: "Poland", city: "Płock", x: 505, y: 360, logo: "/clubs/wisla-plock.png" },
    
    // Austria
    { name: "SK Sturm Graz", country: "Austria", city: "Graz", x: 455, y: 420, logo: "/clubs/sk-sturm-graz.png" },
    { name: "Grazer AK", country: "Austria", city: "Graz", x: 456, y: 421, logo: "/clubs/grazer-ak-1902.png" },
    { name: "Wolfsberger AC", country: "Austria", city: "Wolfsberg", x: 445, y: 425, logo: "/clubs/wolfsberger-ac.png" },
    { name: "TSV Hartberg", country: "Austria", city: "Hartberg", x: 460, y: 423, logo: "/clubs/tsv-hartberg.png" },
    { name: "Austria Wien", country: "Austria", city: "Vienna", x: 480, y: 410, logo: "/clubs/austria-vienna.png" },
    { name: "FC Blau-Weiss Linz", country: "Austria", city: "Linz", x: 445, y: 410, logo: "/clubs/fc-blau-weiss-linz.png" },
    { name: "WSG Tirol", country: "Austria", city: "Wattens", x: 415, y: 425, logo: "/clubs/wsg-tirol.png" },
    { name: "SV Ried", country: "Austria", city: "Ried", x: 435, y: 413, logo: "/clubs/sv-ried.png" },
    { name: "Red Bull Salzburg", country: "Austria", city: "Salzburg", x: 430, y: 415, logo: "/clubs/red-bull-salzburg.png" },
    { name: "SCR Altach", country: "Austria", city: "Altach", x: 420, y: 420, logo: "/clubs/scr-altach.png" },
    
    // Belgium
    { name: "Club Brugge KV", country: "Belgium", city: "Brugge", x: 360, y: 375, logo: "/clubs/club-brugge-kv.png" },
    { name: "Cercle Brugge", country: "Belgium", city: "Brugge", x: 361, y: 376, logo: "/clubs/cercle-brugge.png" },
    { name: "KAA Gent", country: "Belgium", city: "Gent", x: 365, y: 378, logo: "/clubs/kaa-gent.png" },
    { name: "Oud-Heverlee Leuven", country: "Belgium", city: "Leuven", x: 370, y: 380, logo: "/clubs/oud-heverlee-leuven.png" },
    { name: "KV Mechelen", country: "Belgium", city: "Mechelen", x: 372, y: 382, logo: "/clubs/kv-mechelen.png" },
    { name: "KVC Westerlo", country: "Belgium", city: "Westerlo", x: 375, y: 384, logo: "/clubs/kvc-westerlo.png" },
    { name: "KRC Genk", country: "Belgium", city: "Genk", x: 380, y: 385, logo: "/clubs/krc-genk.png" },
    { name: "FCV Dender EH", country: "Belgium", city: "Denderleeuw", x: 368, y: 382, logo: "/clubs/fcv-dender-eh.png" },
    { name: "Royal Antwerp FC", country: "Belgium", city: "Antwerp", x: 373, y: 378, logo: "/clubs/royal-antwerp-fc.png" },
    { name: "RSC Anderlecht", country: "Belgium", city: "Brussels", x: 371, y: 380, logo: "/clubs/rsc-anderlecht.png" },
    { name: "Union Saint-Gilloise", country: "Belgium", city: "Brussels", x: 372, y: 381, logo: "/clubs/union-saint-gilloise.png" },
    { name: "Standard Liège", country: "Belgium", city: "Liège", x: 382, y: 383, logo: "/clubs/standard-liege.png" },
    { name: "Royal Charleroi SC", country: "Belgium", city: "Charleroi", x: 374, y: 383, logo: "/clubs/royal-charleroi-sc.png" },
    { name: "Sint-Truidense VV", country: "Belgium", city: "Sint-Truiden", x: 378, y: 382, logo: "/clubs/sint-truidense-vv.png" },
    { name: "Zulte Waregem", country: "Belgium", city: "Waregem", x: 364, y: 380, logo: "/clubs/zulte-waregem.png" },
    { name: "RAAL La Louvière", country: "Belgium", city: "La Louvière", x: 370, y: 383, logo: "/clubs/raal-la-louviere.png" },
    
    // Bulgaria
    { name: "Arda Kardzhali", country: "Bulgaria", city: "Kardzhali", x: 550, y: 450, logo: "/clubs/arda-kardzhali.png" },
    { name: "Beroe Stara Zagora", country: "Bulgaria", city: "Stara Zagora", x: 545, y: 445, logo: "/clubs/beroe-stara-zagora.png" },
    { name: "Botev Plovdiv", country: "Bulgaria", city: "Plovdiv", x: 544, y: 446, logo: "/clubs/botev-plovdiv.png" },
    { name: "Lokomotiv Plovdiv", country: "Bulgaria", city: "Plovdiv", x: 545, y: 447, logo: "/clubs/lokomotiv-plovdiv.png" },
    { name: "CSKA Sofia", country: "Bulgaria", city: "Sofia", x: 535, y: 445, logo: "/clubs/cska-sofia.png" },
    { name: "CSKA 1948", country: "Bulgaria", city: "Sofia", x: 536, y: 446, logo: "/clubs/cska-1948.png" },
    { name: "Levski Sofia", country: "Bulgaria", city: "Sofia", x: 537, y: 447, logo: "/clubs/levski-sofia.png" },
    { name: "Lokomotiv Sofia", country: "Bulgaria", city: "Sofia", x: 538, y: 448, logo: "/clubs/lokomotiv-sofia.png" },
    { name: "Septemvri Sofia", country: "Bulgaria", city: "Sofia", x: 539, y: 449, logo: "/clubs/septemvri-sofia.png" },
    { name: "Slavia Sofia", country: "Bulgaria", city: "Sofia", x: 540, y: 450, logo: "/clubs/slavia-sofia.png" },
    { name: "Cherno More Varna", country: "Bulgaria", city: "Varna", x: 555, y: 440, logo: "/clubs/cherno-more-varna.png" },
    { name: "Spartak Varna", country: "Bulgaria", city: "Varna", x: 556, y: 441, logo: "/clubs/spartak-varna.png" },
    { name: "Ludogorets Razgrad", country: "Bulgaria", city: "Razgrad", x: 552, y: 438, logo: "/clubs/ludogorets-razgrad.png" },
    { name: "Botev Vratsa", country: "Bulgaria", city: "Vratsa", x: 540, y: 440, logo: "/clubs/botev-vratsa.png" },
    { name: "Dobrudzha Dobrich", country: "Bulgaria", city: "Dobrich", x: 557, y: 437, logo: "/clubs/dobrudzha-dobrich.png" },
    { name: "Montana", country: "Bulgaria", city: "Montana", x: 532, y: 440, logo: "/clubs/montana.png" },
    
    // Croatia
    { name: "GNK Dinamo Zagreb", country: "Croatia", city: "Zagreb", x: 470, y: 410, logo: "/clubs/gnk-dinamo-zagreb.png" },
    { name: "HNK Gorica", country: "Croatia", city: "Velika Gorica", x: 471, y: 411, logo: "/clubs/hnk-gorica.png" },
    { name: "NK Lokomotiva Zagreb", country: "Croatia", city: "Zagreb", x: 472, y: 412, logo: "/clubs/nk-lokomotiva-zagreb.png" },
    { name: "HNK Hajduk Split", country: "Croatia", city: "Split", x: 465, y: 440, logo: "/clubs/hnk-hajduk-split.png" },
    { name: "HNK Rijeka", country: "Croatia", city: "Rijeka", x: 455, y: 415, logo: "/clubs/hnk-rijeka.png" },
    { name: "NK Istra 1961", country: "Croatia", city: "Pula", x: 450, y: 420, logo: "/clubs/nk-istra-1961.png" },
    { name: "HNK Vukovar 1991", country: "Croatia", city: "Vukovar", x: 500, y: 415, logo: "/clubs/hnk-vukovar-1991.png" },
    { name: "NK Osijek", country: "Croatia", city: "Osijek", x: 495, y: 413, logo: "/clubs/nk-osijek.png" },
    { name: "Slaven Belupo Koprivnica", country: "Croatia", city: "Koprivnica", x: 475, y: 408, logo: "/clubs/slaven-belupo-koprivnica.png" },
    { name: "NK Varaždin", country: "Croatia", city: "Varaždin", x: 473, y: 407, logo: "/clubs/nk-varazdin.png" },
    
    // Czech Republic
    { name: "AC Sparta Prague", country: "Czech Republic", city: "Prague", x: 455, y: 365, logo: "/clubs/ac-sparta-prague.png" },
    { name: "Bohemians Prague 1905", country: "Czech Republic", city: "Prague", x: 456, y: 366, logo: "/clubs/bohemians-prague-1905.png" },
    { name: "SK Slavia Prague", country: "Czech Republic", city: "Prague", x: 457, y: 367, logo: "/clubs/sk-slavia-prague.png" },
    { name: "FK Dukla Prague", country: "Czech Republic", city: "Prague", x: 458, y: 368, logo: "/clubs/fk-dukla-prague.png" },
    { name: "FC Slovan Liberec", country: "Czech Republic", city: "Liberec", x: 465, y: 360, logo: "/clubs/fc-slovan-liberec.png" },
    { name: "FK Jablonec", country: "Czech Republic", city: "Jablonec nad Nisou", x: 466, y: 361, logo: "/clubs/fk-jablonec.png" },
    { name: "FC Baník Ostrava", country: "Czech Republic", city: "Ostrava", x: 490, y: 360, logo: "/clubs/fc-banik-ostrava.png" },
    { name: "MFK Karviná", country: "Czech Republic", city: "Karviná", x: 491, y: 361, logo: "/clubs/mfk-karvina.png" },
    { name: "FC Hradec Králové", country: "Czech Republic", city: "Hradec Králové", x: 468, y: 363, logo: "/clubs/fc-hradec-kralove.png" },
    { name: "FK Pardubice", country: "Czech Republic", city: "Pardubice", x: 470, y: 365, logo: "/clubs/fk-pardubice.png" },
    { name: "FK Mladá Boleslav", country: "Czech Republic", city: "Mladá Boleslav", x: 460, y: 363, logo: "/clubs/fk-mlada-boleslav.png" },
    { name: "FK Teplice", country: "Czech Republic", city: "Teplice", x: 450, y: 362, logo: "/clubs/fk-teplice.png" },
    { name: "FC Viktoria Plzeň", country: "Czech Republic", city: "Plzeň", x: 448, y: 368, logo: "/clubs/fc-viktoria-plzen.png" },
    { name: "1.FC Slovácko", country: "Czech Republic", city: "Uherské Hradiště", x: 478, y: 370, logo: "/clubs/1fc-slovacko.png" },
    { name: "FC Zlín", country: "Czech Republic", city: "Zlín", x: 480, y: 371, logo: "/clubs/fc-zlin.png" },
    { name: "SK Sigma Olomouc", country: "Czech Republic", city: "Olomouc", x: 482, y: 365, logo: "/clubs/sk-sigma-olomouc.png" },
    
    // Denmark
    { name: "FC Copenhagen", country: "Denmark", city: "Copenhagen", x: 420, y: 315, logo: "/clubs/fc-copenhagen.png" },
    { name: "Brøndby IF", country: "Denmark", city: "Brøndby", x: 421, y: 316, logo: "/clubs/brondby-if.png" },
    { name: "FC Nordsjælland", country: "Denmark", city: "Farum", x: 422, y: 314, logo: "/clubs/fc-nordsjaelland.png" },
    { name: "FC Midtjylland", country: "Denmark", city: "Herning", x: 395, y: 320, logo: "/clubs/fc-midtjylland.png" },
    { name: "Silkeborg IF", country: "Denmark", city: "Silkeborg", x: 398, y: 322, logo: "/clubs/silkeborg-if.png" },
    { name: "Aarhus GF", country: "Denmark", city: "Aarhus", x: 405, y: 323, logo: "/clubs/aarhus-gf.png" },
    { name: "Randers FC", country: "Denmark", city: "Randers", x: 408, y: 321, logo: "/clubs/randers-fc.png" },
    { name: "Odense Boldklub", country: "Denmark", city: "Odense", x: 405, y: 330, logo: "/clubs/odense-boldklub.png" },
    { name: "SønderjyskE", country: "Denmark", city: "Haderslev", x: 395, y: 333, logo: "/clubs/sonderjyske.png" },
    { name: "FC Fredericia", country: "Denmark", city: "Fredericia", x: 398, y: 332, logo: "/clubs/fc-fredericia.png" },
    { name: "Viborg FF", country: "Denmark", city: "Viborg", x: 400, y: 323, logo: "/clubs/viborg-ff.png" },
    { name: "Vejle Boldklub", country: "Denmark", city: "Vejle", x: 402, y: 329, logo: "/clubs/vejle-boldklub.png" },
    
    // Greece
    { name: "AEK Athens", country: "Greece", city: "Athens", x: 540, y: 475, logo: "/clubs/aek-athens.png" },
    { name: "AE Kifisias", country: "Greece", city: "Kifisia", x: 541, y: 476, logo: "/clubs/ae-kifisias.png" },
    { name: "Panathinaikos FC", country: "Greece", city: "Athens", x: 542, y: 477, logo: "/clubs/panathinaikos-fc.png" },
    { name: "Atromitos Athens", country: "Greece", city: "Athens", x: 543, y: 478, logo: "/clubs/atromitos-athens.png" },
    { name: "Olympiacos Piraeus", country: "Greece", city: "Piraeus", x: 544, y: 475, logo: "/clubs/olympiacos-piraeus.png" },
    { name: "APO Levadiakos", country: "Greece", city: "Livadeia", x: 535, y: 473, logo: "/clubs/apo-levadiakos.png" },
    { name: "AE Larisa", country: "Greece", city: "Larisa", x: 530, y: 468, logo: "/clubs/ae-larisa.png" },
    { name: "Volos NPS", country: "Greece", city: "Volos", x: 532, y: 467, logo: "/clubs/volos-nps.png" },
    { name: "PAOK Thessaloniki", country: "Greece", city: "Thessaloniki", x: 525, y: 460, logo: "/clubs/paok-thessaloniki.png" },
    { name: "Aris Thessaloniki", country: "Greece", city: "Thessaloniki", x: 526, y: 461, logo: "/clubs/aris-thessaloniki.png" },
    { name: "Panserraikos", country: "Greece", city: "Serres", x: 528, y: 458, logo: "/clubs/panserraikos.png" },
    { name: "Asteras Aktor", country: "Greece", city: "Tripoli", x: 530, y: 478, logo: "/clubs/asteras-aktor.png" },
    { name: "Panetolikos GFS", country: "Greece", city: "Agrinio", x: 518, y: 471, logo: "/clubs/panetolikos-gfs.png" },
    { name: "OFI Crete FC", country: "Greece", city: "Heraklion", x: 548, y: 500, logo: "/clubs/ofi-crete-fc.png" },
  ];

  // Flag mapping
  const flagImages: Record<string, string> = {
    "England": englandFlag,
    "Scotland": scotlandFlag,
    "Ireland": irelandFlag,
    "Iceland": icelandFlag,
    "Portugal": portugalFlag,
    "Spain": spainFlag,
    "France": franceFlag,
    "Norway": norwayFlag,
    "Sweden": swedenFlag,
    "Denmark": denmarkFlag,
    "Netherlands": netherlandsFlag,
    "Belgium": belgiumFlag,
    "Germany": germanyFlag,
    "Switzerland": switzerlandFlag,
    "Austria": austriaFlag,
    "Czech Republic": czechRepublicFlag,
    "Poland": polandFlag,
    "Italy": italyFlag,
    "Greece": greeceFlag,
    "Turkey": turkeyFlag,
    "Romania": romaniaFlag,
    "Serbia": serbiaFlag,
    "Croatia": croatiaFlag,
    "Ukraine": ukraineFlag,
    "Russia": russiaFlag,
    "Finland": finlandFlag,
    "Estonia": estoniaFlag,
    "Latvia": latviaFlag,
    "Lithuania": lithuaniaFlag,
    "Bulgaria": bulgariaFlag,
    "Belarus": belarusFlag,
  };

  // Country centers with flag markers and leagues - ordered by UEFA Coefficient
  const countryMarkers = [
    { country: "England", x: 315, y: 375, leagues: ["Premier League", "Championship", "League One", "League Two"] },
    { country: "Italy", x: 445, y: 500, leagues: ["Serie A", "Serie B", "Serie C"] },
    { country: "Spain", x: 295, y: 525, leagues: ["La Liga", "La Liga 2", "Primera RFEF"] },
    { country: "Germany", x: 425, y: 375, leagues: ["Bundesliga", "2. Bundesliga", "3. Liga"] },
    { country: "France", x: 350, y: 450, leagues: ["Ligue 1", "Ligue 2", "National"] },
    { country: "Netherlands", x: 380, y: 355, leagues: ["Eredivisie", "Eerste Divisie"] },
    { country: "Portugal", x: 250, y: 525, leagues: ["Primeira Liga", "Liga Portugal 2"] },
    { country: "Belgium", x: 370, y: 385, leagues: ["Pro League", "Challenger Pro League"] },
    { country: "Czech Republic", x: 460, y: 410, leagues: ["Czech First League", "Czech National Football League"] },
    { country: "Scotland", x: 282, y: 310, leagues: ["Scottish Premiership", "Scottish Championship"] },
    { country: "Turkey", x: 650, y: 540, leagues: ["Süper Lig", "TFF First League"] },
    { country: "Austria", x: 500, y: 435, leagues: ["Austrian Bundesliga", "2. Liga"] },
    { country: "Greece", x: 525, y: 530, leagues: ["Super League Greece", "Super League 2"] },
    { country: "Switzerland", x: 400, y: 445, leagues: ["Super League", "Challenge League"] },
    { country: "Norway", x: 400, y: 250, leagues: ["Eliteserien", "1. divisjon"] },
    { country: "Denmark", x: 410, y: 315, leagues: ["Danish Superliga", "1st Division"] },
    { country: "Croatia", x: 490, y: 485, leagues: ["Croatian First Football League", "Croatian Second Football League"] },
    { country: "Poland", x: 500, y: 375, leagues: ["Ekstraklasa", "I Liga"] },
    { country: "Serbia", x: 525, y: 485, leagues: ["Serbian SuperLiga", "Serbian First League"] },
    { country: "Sweden", x: 450, y: 280, leagues: ["Allsvenskan", "Superettan"] },
    { country: "Ukraine", x: 620, y: 400, leagues: ["Ukrainian Premier League", "Ukrainian First League"] },
    { country: "Russia", x: 650, y: 300, leagues: ["Russian Premier League", "FNL"] },
    { country: "Romania", x: 555, y: 455, leagues: ["Liga I", "Liga II"] },
    { country: "Ireland", x: 250, y: 355, leagues: ["League of Ireland Premier Division"] },
    { country: "Iceland", x: 225, y: 110, leagues: ["Úrvalsdeild karla"] },
    { country: "Bulgaria", x: 560, y: 500, leagues: ["First Professional Football League", "Second Professional Football League"] },
    { country: "Belarus", x: 590, y: 290, leagues: ["Belarusian Premier League", "Belarusian First League"] },
    { country: "Finland", x: 575, y: 200, leagues: ["Veikkausliiga", "Ykkönen"] },
    { country: "Estonia", x: 570, y: 240, leagues: ["Meistriliiga", "Esiliiga"] },
    { country: "Latvia", x: 570, y: 270, leagues: ["Virslīga", "1. līga"] },
    { country: "Lithuania", x: 550, y: 300, leagues: ["A Lyga", "I Lyga"] },
  ];

  const handleCountryClick = (country: string, x: number, y: number, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedCountry(country);
    const zoom = 3;
    const newWidth = 1000 / zoom;
    const newHeight = 600 / zoom;
    const newX = Math.max(0, Math.min(1000 - newWidth, x - newWidth / 2));
    const newY = Math.max(0, Math.min(600 - newHeight, y - newHeight / 2));
    setViewBox(`${newX} ${newY} ${newWidth} ${newHeight}`);
    setZoomLevel(1);
  };

  const handleMapClick = () => {
    if (wasDragging) {
      setWasDragging(false);
      return;
    }
    if (expandedCity) {
      setExpandedCity(null);
    } else if (zoomLevel > 0) {
      setViewBox("0 0 1000 600");
      setZoomLevel(0);
      setSelectedCountry(null);
      setSelectedCluster(null);
    }
  };
  
  // Group clubs by city (only when a country is selected)
  const groupClubsByCity = () => {
    // If no country selected, show all clubs individually
    if (!selectedCountry) {
      return { cityGroups: [], singleClubs: footballClubs };
    }
    
    const visibleClubs = footballClubs.filter(club => club.country === selectedCountry);
    
    const cityMap = new Map<string, typeof footballClubs>();
    
    visibleClubs.forEach(club => {
      const cityKey = `${club.city}-${club.country}`;
      if (!cityMap.has(cityKey)) {
        cityMap.set(cityKey, []);
      }
      cityMap.get(cityKey)!.push(club);
    });
    
    const cityGroups: Array<{cityName: string, country: string, x: number, y: number, clubs: typeof footballClubs}> = [];
    const singleClubs: typeof footballClubs = [];
    
    cityMap.forEach((clubs, cityKey) => {
      if (clubs.length > 1) {
        // Multiple clubs in same city - calculate center point using current positions
        const sumX = clubs.reduce((sum, club) => sum + getClubPosition(club).x, 0);
        const sumY = clubs.reduce((sum, club) => sum + getClubPosition(club).y, 0);
        cityGroups.push({
          cityName: clubs[0].city,
          country: clubs[0].country,
          x: sumX / clubs.length,
          y: sumY / clubs.length,
          clubs
        });
      } else {
        // Single club in city
        singleClubs.push(clubs[0]);
      }
    });
    
    return { cityGroups, singleClubs };
  };
  
  const { cityGroups, singleClubs } = groupClubsByCity();
  
  const handleCityClick = (cityGroup: {cityName: string, country: string, x: number, y: number, clubs: typeof footballClubs}, event: React.MouseEvent) => {
    event.stopPropagation();
    setExpandedCity(`${cityGroup.cityName}-${cityGroup.country}`);
    
    // Zoom in on the city
    const zoom = 8;
    const newWidth = 1000 / zoom;
    const newHeight = 600 / zoom;
    const newX = Math.max(0, Math.min(1000 - newWidth, cityGroup.x - newWidth / 2));
    const newY = Math.max(0, Math.min(600 - newHeight, cityGroup.y - newHeight / 2));
    setViewBox(`${newX} ${newY} ${newWidth} ${newHeight}`);
    setZoomLevel(2);
  };
  
  const getClubPositionInCircle = (index: number, total: number, centerX: number, centerY: number) => {
    const radius = 25; // Distance from center
    const angle = (index * 2 * Math.PI) / total;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    };
  };
  
  // Calculate font size to fit text within circle
  const getCityFontSize = (cityName: string, circleRadius: number) => {
    // Approximate character width is about 65% of font size for better accuracy
    const textLength = cityName.length;
    // We want text width to be about 65% of circle diameter to have generous padding
    const maxTextWidth = circleRadius * 2 * 0.65;
    const approximateFontSize = maxTextWidth / (textLength * 0.65);
    // Clamp between 2 and 6 for readability
    return Math.max(2, Math.min(6, approximateFontSize));
  };

  const handleCountryListClick = (country: string, x: number, y: number) => {
    setSelectedCountry(country);
    const zoom = 3;
    const newWidth = 1000 / zoom;
    const newHeight = 600 / zoom;
    const newX = Math.max(0, Math.min(1000 - newWidth, x - newWidth / 2));
    const newY = Math.max(0, Math.min(600 - newHeight, y - newHeight / 2));
    setViewBox(`${newX} ${newY} ${newWidth} ${newHeight}`);
    setZoomLevel(1);
  };

  return (
    <div className="w-full h-full">
      <div className={hideStats ? "h-full" : "grid grid-cols-1 lg:grid-cols-4 gap-4"} style={!hideStats ? { maxHeight: '650px' } : undefined}>
        {/* Map Section */}
        <div className={`${hideStats ? "h-full" : "lg:col-span-3"} bg-card rounded-lg p-2 md:p-3 border relative -mx-4 md:mx-0`}>
          {/* Country Flag Overlay when zoomed - compact on mobile */}
          {selectedCountry && (
            <div className="absolute top-2 left-2 md:top-6 md:left-6 z-10 bg-card/95 backdrop-blur-sm border border-primary/20 rounded-lg p-2 md:p-4 shadow-xl">
              <div className="flex items-center gap-2 md:flex-col md:gap-3 md:items-center">
                <div className="w-8 h-8 md:w-16 md:h-16 rounded-full overflow-hidden border-2 md:border-4 border-primary shadow-lg flex-shrink-0">
                  <img 
                    src={flagImages[selectedCountry]} 
                    alt={selectedCountry}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-left md:text-center">
                  <h4 className="font-bebas text-sm md:text-xl leading-tight">{selectedCountry}</h4>
                </div>
                <button
                  onClick={handleMapClick}
                  className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1 md:py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors ml-auto md:ml-0"
                >
                  <ZoomOut className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="text-xs md:text-sm font-medium">Back</span>
                </button>
              </div>
            </div>
          )}
          
          <svg
            viewBox={viewBox}
            className="w-full h-auto cursor-pointer transition-all duration-700 ease-in-out"
            style={{ maxHeight: "600px" }}
            onClick={handleMapClick}
            onMouseMove={handleMapMouseMove}
            onMouseUp={handleMapMouseUp}
            onMouseLeave={handleMapMouseUp}
          >
            {/* Rotating ring animation definition */}
            <defs>
              <style>
                {`
                  @keyframes rotate-ring {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }
                  .rotating-ring {
                    animation: rotate-ring 3s linear infinite;
                    transform-origin: center;
                  }
                `}
              </style>
            </defs>

            {/* Background */}
            <rect width="1000" height="600" fill="hsl(var(--background))" />

            {/* Grid System */}
            {showGrid && !expandedCity && (
              <g opacity="0.3">
                {/* Vertical grid lines every 50px */}
                {Array.from({ length: 21 }, (_, i) => i * 50).map((x) => (
                  <g key={`v-${x}`}>
                    <line
                      x1={x}
                      y1="0"
                      x2={x}
                      y2="600"
                      stroke="hsl(var(--primary))"
                      strokeWidth="0.5"
                      strokeDasharray="2,2"
                    />
                    <text
                      x={x}
                      y="15"
                      fontSize="10"
                      fill="hsl(var(--primary))"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      {x}
                    </text>
                  </g>
                ))}
                {/* Horizontal grid lines every 50px */}
                {Array.from({ length: 13 }, (_, i) => i * 50).map((y) => (
                  <g key={`h-${y}`}>
                    <line
                      x1="0"
                      y1={y}
                      x2="1000"
                      y2={y}
                      stroke="hsl(var(--primary))"
                      strokeWidth="0.5"
                      strokeDasharray="2,2"
                    />
                    <text
                      x="15"
                      y={y + 5}
                      fontSize="10"
                      fill="hsl(var(--primary))"
                      fontWeight="bold"
                    >
                      {y}
                    </text>
                  </g>
                ))}
              </g>
            )}

            {/* Europe outline image - hide when zoomed in or city expanded */}
            {!expandedCity && zoomLevel < 2 && (
              <image
                href={europeOutline}
                x="0"
                y="0"
                width="1000"
                height="600"
                preserveAspectRatio="xMidYMid meet"
                opacity="0.7"
              />
            )}

            {/* City Groups with Multiple Clubs */}
            {cityGroups.map((cityGroup, idx) => {
              const isExpanded = expandedCity === `${cityGroup.cityName}-${cityGroup.country}`;
              
              // If a city is expanded, only show that city
              if (expandedCity && !isExpanded) {
                return null;
              }
              
              if (isExpanded) {
                // Show clubs arranged in circle
                return (
                  <g key={`city-expanded-${idx}`}>
                    {/* Connection lines from center to each club */}
                    {cityGroup.clubs.map((club, clubIdx) => {
                      // Use custom position if available, otherwise calculate circle position
                      const customPos = clubPositions[club.name];
                      const defaultPos = getClubPositionInCircle(clubIdx, cityGroup.clubs.length, cityGroup.x, cityGroup.y);
                      const pos = customPos || defaultPos;
                      
                      return (
                        <line
                          key={`line-${clubIdx}`}
                          x1={cityGroup.x}
                          y1={cityGroup.y}
                          x2={pos.x}
                          y2={pos.y}
                          stroke="hsl(var(--primary))"
                          strokeWidth="1"
                          opacity="0.5"
                        />
                      );
                    })}
                    
                    {/* Center city marker */}
                    <g>
                      <circle
                        cx={cityGroup.x}
                        cy={cityGroup.y}
                        r="10"
                        fill="hsl(var(--primary))"
                        opacity="0.9"
                      />
                      <circle
                        cx={cityGroup.x}
                        cy={cityGroup.y}
                        r="10"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                      />
                      <text
                        x={cityGroup.x}
                        y={cityGroup.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={getCityFontSize(cityGroup.cityName, 10)}
                        fontWeight="bold"
                        fill="white"
                        className="pointer-events-none uppercase"
                      >
                        {cityGroup.cityName.toUpperCase()}
                      </text>
                    </g>
                    
                    {/* Club logos in circle */}
                    {cityGroup.clubs.map((club, clubIdx) => {
                      // Use custom position if available, otherwise calculate circle position
                      const customPos = clubPositions[club.name];
                      const defaultPos = getClubPositionInCircle(clubIdx, cityGroup.clubs.length, cityGroup.x, cityGroup.y);
                      const pos = customPos || defaultPos;
                      
                      return (
                        <g 
                          key={`club-${clubIdx}`}
                          onMouseDown={(e) => handleClubDragStart(club.name, e)}
                          className="cursor-move"
                          style={{ pointerEvents: 'all' }}
                        >
                          <defs>
                            <clipPath id={`clip-expanded-${idx}-${clubIdx}`}>
                              <circle cx={pos.x} cy={pos.y} r="6" />
                            </clipPath>
                          </defs>
                          <image
                            href={club.logo}
                            x={pos.x - 6}
                            y={pos.y - 6}
                            width="12"
                            height="12"
                            clipPath={`url(#clip-expanded-${idx}-${clubIdx})`}
                          />
                          <circle
                            cx={pos.x}
                            cy={pos.y}
                            r="6"
                            fill="none"
                            stroke="hsl(var(--primary))"
                            strokeWidth="2"
                            className="hover:stroke-primary-foreground transition-colors"
                          >
                            <title>{club.name}</title>
                          </circle>
                        </g>
                      );
                    })}
                  </g>
                );
              }
              
              // Show city marker (collapsed state)
              return (
                <g 
                  key={`city-${idx}`}
                  onClick={(e) => handleCityClick(cityGroup, e)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={cityGroup.x}
                    cy={cityGroup.y}
                    r="8"
                    fill="hsl(var(--primary))"
                    opacity="0.9"
                  />
                  <circle
                    cx={cityGroup.x}
                    cy={cityGroup.y}
                    r="8"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    className="hover:stroke-primary-foreground transition-colors"
                  />
                  <text
                    x={cityGroup.x}
                    y={cityGroup.y - 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={getCityFontSize(cityGroup.cityName, 8)}
                    fontWeight="bold"
                    fill="white"
                    className="pointer-events-none uppercase"
                  >
                    {cityGroup.cityName.toUpperCase()}
                  </text>
                  <text
                    x={cityGroup.x}
                    y={cityGroup.y + 5}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="6"
                    fontWeight="bold"
                    fill="white"
                    className="pointer-events-none"
                  >
                    ({cityGroup.clubs.length})
                  </text>
                  <title>{cityGroup.cityName}: {cityGroup.clubs.map(c => c.name).join(", ")}</title>
                </g>
              );
            })}
            
            {/* Individual Football Club Logos (cities with only one club) */}
            {!expandedCity && singleClubs.map((club, idx) => {
              const pos = getClubPosition(club);
              return (
                <g 
                  key={`single-club-${idx}`}
                  onMouseDown={(e) => handleClubDragStart(club.name, e)}
                  className="cursor-move"
                  style={{ pointerEvents: 'all' }}
                >
                  <defs>
                    <clipPath id={`clip-single-${idx}`}>
                      <circle cx={pos.x} cy={pos.y} r="5" />
                    </clipPath>
                  </defs>
                  <image
                    href={club.logo}
                    x={pos.x - 5}
                    y={pos.y - 5}
                    width="10"
                    height="10"
                    clipPath={`url(#clip-single-${idx})`}
                  />
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="5"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    className="hover:stroke-primary-foreground transition-colors"
                  >
                    <title>{club.name} - {club.city}, {club.country}</title>
                  </circle>
                </g>
              );
            })}

            {/* Connection lines (sample) */}
            {!expandedCity && (
              <g opacity="0.1" stroke="hsl(var(--primary))" strokeWidth="1">
                <line x1="520" y1="290" x2="510" y2="360" />
                <line x1="510" y1="360" x2="420" y2="480" />
                <line x1="650" y1="280" x2="680" y2="295" />
                <line x1="560" y1="250" x2="540" y2="275" />
              </g>
            )}
            
            {/* Country Flag Markers - render on top so they're visible over clusters, hide when zoomed in or city expanded */}
            {!selectedCountry && !expandedCity && zoomLevel < 2 && countryMarkers.map((country, idx) => {
              const flagImage = flagImages[country.country];
              return (
                <g 
                  key={`country-overlay-${idx}`}
                  onClick={(e) => handleCountryClick(country.country, country.x, country.y, e)}
                  className="cursor-pointer"
                  style={{ pointerEvents: 'all' }}
                >
                  {/* Rotating gold ring border */}
                  <g className="rotating-ring" style={{ transformOrigin: `${country.x}px ${country.y}px` }}>
                    <circle
                      cx={country.x}
                      cy={country.y}
                      r="16"
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="2"
                      strokeDasharray="10 20"
                      opacity="0.6"
                    />
                  </g>
                  {/* Circular clip path for flag */}
                  <defs>
                    <clipPath id={`flag-clip-overlay-${idx}`}>
                      <circle cx={country.x} cy={country.y} r="12" />
                    </clipPath>
                  </defs>
                  {/* Country flag image in circle */}
                  <image
                    href={flagImage}
                    x={country.x - 12}
                    y={country.y - 12}
                    width="24"
                    height="24"
                    clipPath={`url(#flag-clip-overlay-${idx})`}
                  />
                  {/* Circle border */}
                  <circle
                    cx={country.x}
                    cy={country.y}
                    r="12"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    className="hover:stroke-primary transition-colors"
                  >
                    <title>{country.country}</title>
                  </circle>
                </g>
              );
            })}
          </svg>

          {/* Legend - only show grid toggle when not hidden */}
          {!hideGridToggle && (
            <div className="flex items-center justify-center gap-6 mt-2 text-sm">
              <button
                onClick={() => setShowGrid(!showGrid)}
                className="flex items-center gap-2 px-3 py-1 rounded border border-border hover:bg-accent transition-colors"
              >
                <span>{showGrid ? t("map.hide_grid", "Hide") : t("map.show_grid", "Show")} {t("map.grid", "Grid")}</span>
              </button>
            </div>
          )}
        </div>

        {/* Stats & Details Section - only show when hideStats is false */}
        {!hideStats && (
        <div className="flex flex-col h-full min-h-0 overflow-hidden">
          <div className="bg-card rounded-lg p-3 border flex-shrink-0">
            <h4 className="font-bebas text-lg mb-2">{t("map.network_coverage", "NETWORK COVERAGE")}</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t("map.professional_players", "Professional Players")}</span>
                <span className="font-bold">10,000+</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t("map.youth_prospects", "Youth Prospects")}</span>
                <span className="font-bold">4,000+</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t("map.teams", "Teams")}</span>
                <span className="font-bold">500+</span>
              </div>
            </div>
          </div>

          {/* Coverage Regions - Country -> Clubs from footballClubs */}
          <div id="coverage-regions-container" className="bg-card rounded-lg p-3 border mt-3 flex-1 min-h-0 overflow-hidden flex flex-col group/coverage">
            <h4 className="font-bebas text-lg mb-2 flex-shrink-0">{t("map.coverage_regions", "COVERAGE REGIONS")}</h4>
            <div className="space-y-1 flex-1 min-h-0 max-h-[240px] overflow-hidden hover:overflow-y-auto transition-all relative">
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent pointer-events-none group-hover/coverage:opacity-0 transition-opacity z-10 flex items-end justify-center pb-1">
                <ChevronDown className="w-4 h-4 text-muted-foreground animate-bounce" />
              </div>
              {(() => {
                // Group footballClubs by country
                const clubsByCountry: Record<string, typeof footballClubs> = {};
                footballClubs.forEach(club => {
                  if (!clubsByCountry[club.country]) clubsByCountry[club.country] = [];
                  clubsByCountry[club.country].push(club);
                });
                
                return Object.entries(clubsByCountry)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([country, clubs]) => {
                    const countryKey = `country-${country}`;
                    const isCountryExpanded = expandedCountries.has(countryKey);
                    const flagImage = flagImages[country];
                    
                    return (
                      <div key={countryKey} className="border-b border-border/30 last:border-b-0">
                        <button
                          onClick={() => {
                            // Toggle expand state
                            const newSet = new Set(expandedCountries);
                            if (isCountryExpanded) {
                              newSet.delete(countryKey);
                              // Reset zoom when collapsing
                              setSelectedCountry(null);
                              setZoomLevel(0);
                            } else {
                              newSet.add(countryKey);
                              // Zoom to country on map
                              setSelectedCountry(country);
                              setZoomLevel(1);
                            }
                            setExpandedCountries(newSet);
                          }}
                          className="w-full flex items-center gap-2 p-2 hover:bg-accent/50 rounded transition-colors text-left"
                        >
                          {isCountryExpanded ? (
                            <ChevronDown className="w-4 h-4 text-primary flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          )}
                          {flagImage && (
                            <img src={flagImage} alt={country} className="w-5 h-4 object-cover rounded-sm flex-shrink-0" />
                          )}
                          <span className="font-medium text-sm flex-1">{t(`countries.${country.toLowerCase().replace(/ /g, '_')}`, country)}</span>
                        </button>
                        
                        {isCountryExpanded && (
                          <div className="ml-6 space-y-1 pb-2">
                            {clubs
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map((club) => {
                                const clubKey = `club-${country}-${club.name}`;
                                const isClubExpanded = expandedClubs.has(clubKey);
                                
                                // Generate random player counts for each age group (seeded by club name)
                                const getSeededRandom = (seed: string, min: number, max: number) => {
                                  let hash = 0;
                                  for (let i = 0; i < seed.length; i++) {
                                    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
                                    hash = hash & hash;
                                  }
                                  const normalized = Math.abs(hash % 1000) / 1000;
                                  return Math.floor(normalized * (max - min + 1)) + min;
                                };
                                
                                const ageGroups = [
                                  { name: "First Team", min: 18, max: 30, count: getSeededRandom(club.name + "first", 18, 30) },
                                  { name: "Reserves/U23/U21", min: 4, max: 14, count: getSeededRandom(club.name + "reserves", 4, 14) },
                                  { name: "U19", min: 14, max: 20, count: getSeededRandom(club.name + "u19", 14, 20) },
                                  { name: "U16", min: 6, max: 17, count: getSeededRandom(club.name + "u16", 6, 17) },
                                  { name: "U15", min: 1, max: 9, count: getSeededRandom(club.name + "u15", 1, 9) },
                                  { name: "U14", min: 1, max: 4, count: getSeededRandom(club.name + "u14", 1, 4) },
                                ];
                                
                                return (
                                  <div key={clubKey}>
                                    <button
                                      onClick={() => {
                                        const newSet = new Set(expandedClubs);
                                        if (isClubExpanded) {
                                          newSet.delete(clubKey);
                                        } else {
                                          newSet.add(clubKey);
                                        }
                                        setExpandedClubs(newSet);
                                      }}
                                      className="w-full flex items-center gap-2 p-1.5 hover:bg-accent/30 rounded transition-colors text-left"
                                    >
                                      {isClubExpanded ? (
                                        <ChevronDown className="w-3 h-3 text-primary flex-shrink-0" />
                                      ) : (
                                        <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                      )}
                                      {club.logo && (
                                        <img 
                                          src={club.logo} 
                                          alt={club.name} 
                                          className="w-4 h-4 object-contain flex-shrink-0"
                                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                      )}
                                      <span className="text-sm flex-1">{club.name}</span>
                                    </button>
                                    
                                    {isClubExpanded && (
                                      <div className="ml-6 py-1 space-y-1">
                                        {ageGroups.map((ageGroup) => (
                                          <div
                                            key={ageGroup.name}
                                            className="flex items-center justify-between gap-2 text-xs py-1 px-2 bg-accent/10 rounded"
                                          >
                                            <span className="text-muted-foreground">{ageGroup.name}</span>
                                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-500 text-yellow-950 font-bold text-xs shadow-sm">
                                              {ageGroup.count}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    );
                  });
              })()}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default ScoutingNetworkMap;
