// Real-world coordinates for major European football cities
// These are used for geo-calibration of the scouting map

export interface CityCoordinates {
  city: string;
  country: string;
  lat: number;
  lng: number;
}

// Major football cities with their real-world coordinates
export const europeanCityCoordinates: CityCoordinates[] = [
  // Austria
  { city: "Vienna", country: "Austria", lat: 48.2082, lng: 16.3738 },
  { city: "Salzburg", country: "Austria", lat: 47.8095, lng: 13.0550 },
  { city: "Graz", country: "Austria", lat: 47.0707, lng: 15.4395 },
  { city: "Linz", country: "Austria", lat: 48.3069, lng: 14.2858 },
  
  // Belgium
  { city: "Brussels", country: "Belgium", lat: 50.8503, lng: 4.3517 },
  { city: "Bruges", country: "Belgium", lat: 51.2093, lng: 3.2247 },
  { city: "Liège", country: "Belgium", lat: 50.6326, lng: 5.5797 },
  { city: "Ghent", country: "Belgium", lat: 51.0543, lng: 3.7174 },
  { city: "Antwerp", country: "Belgium", lat: 51.2194, lng: 4.4025 },
  { city: "Genk", country: "Belgium", lat: 50.9654, lng: 5.5002 },
  
  // Croatia
  { city: "Zagreb", country: "Croatia", lat: 45.8150, lng: 15.9819 },
  { city: "Split", country: "Croatia", lat: 43.5081, lng: 16.4402 },
  { city: "Rijeka", country: "Croatia", lat: 45.3271, lng: 14.4422 },
  
  // Czech Republic
  { city: "Prague", country: "Czech Republic", lat: 50.0755, lng: 14.4378 },
  { city: "Brno", country: "Czech Republic", lat: 49.1951, lng: 16.6068 },
  { city: "Plzeň", country: "Czech Republic", lat: 49.7384, lng: 13.3736 },
  
  // Denmark
  { city: "Copenhagen", country: "Denmark", lat: 55.6761, lng: 12.5683 },
  { city: "Aarhus", country: "Denmark", lat: 56.1629, lng: 10.2039 },
  { city: "Odense", country: "Denmark", lat: 55.4038, lng: 10.4024 },
  
  // England
  { city: "London", country: "England", lat: 51.5074, lng: -0.1278 },
  { city: "Manchester", country: "England", lat: 53.4808, lng: -2.2426 },
  { city: "Liverpool", country: "England", lat: 53.4084, lng: -2.9916 },
  { city: "Birmingham", country: "England", lat: 52.4862, lng: -1.8904 },
  { city: "Leeds", country: "England", lat: 53.8008, lng: -1.5491 },
  { city: "Newcastle", country: "England", lat: 54.9783, lng: -1.6178 },
  { city: "Brighton", country: "England", lat: 50.8225, lng: -0.1372 },
  { city: "Southampton", country: "England", lat: 50.9097, lng: -1.4044 },
  
  // France
  { city: "Paris", country: "France", lat: 48.8566, lng: 2.3522 },
  { city: "Marseille", country: "France", lat: 43.2965, lng: 5.3698 },
  { city: "Lyon", country: "France", lat: 45.7640, lng: 4.8357 },
  { city: "Lille", country: "France", lat: 50.6292, lng: 3.0573 },
  { city: "Nice", country: "France", lat: 43.7102, lng: 7.2620 },
  { city: "Bordeaux", country: "France", lat: 44.8378, lng: -0.5792 },
  { city: "Nantes", country: "France", lat: 47.2184, lng: -1.5536 },
  { city: "Strasbourg", country: "France", lat: 48.5734, lng: 7.7521 },
  { city: "Monaco", country: "France", lat: 43.7384, lng: 7.4246 },
  { city: "Lens", country: "France", lat: 50.4289, lng: 2.8311 },
  
  // Germany
  { city: "Munich", country: "Germany", lat: 48.1351, lng: 11.5820 },
  { city: "Berlin", country: "Germany", lat: 52.5200, lng: 13.4050 },
  { city: "Dortmund", country: "Germany", lat: 51.5136, lng: 7.4653 },
  { city: "Frankfurt", country: "Germany", lat: 50.1109, lng: 8.6821 },
  { city: "Stuttgart", country: "Germany", lat: 48.7758, lng: 9.1829 },
  { city: "Leipzig", country: "Germany", lat: 51.3397, lng: 12.3731 },
  { city: "Cologne", country: "Germany", lat: 50.9375, lng: 6.9603 },
  { city: "Hamburg", country: "Germany", lat: 53.5511, lng: 9.9937 },
  { city: "Bremen", country: "Germany", lat: 53.0793, lng: 8.8017 },
  { city: "Hoffenheim", country: "Germany", lat: 49.2947, lng: 8.8892 },
  { city: "Freiburg", country: "Germany", lat: 47.9990, lng: 7.8421 },
  { city: "Wolfsburg", country: "Germany", lat: 52.4227, lng: 10.7865 },
  { city: "Leverkusen", country: "Germany", lat: 51.0459, lng: 7.0192 },
  { city: "Mönchengladbach", country: "Germany", lat: 51.1805, lng: 6.4428 },
  { city: "Mainz", country: "Germany", lat: 49.9929, lng: 8.2473 },
  { city: "Augsburg", country: "Germany", lat: 48.3705, lng: 10.8978 },
  
  // Greece
  { city: "Athens", country: "Greece", lat: 37.9838, lng: 23.7275 },
  { city: "Thessaloniki", country: "Greece", lat: 40.6401, lng: 22.9444 },
  { city: "Piraeus", country: "Greece", lat: 37.9475, lng: 23.6471 },
  
  // Hungary
  { city: "Budapest", country: "Hungary", lat: 47.4979, lng: 19.0402 },
  
  // Italy
  { city: "Milan", country: "Italy", lat: 45.4642, lng: 9.1900 },
  { city: "Rome", country: "Italy", lat: 41.9028, lng: 12.4964 },
  { city: "Turin", country: "Italy", lat: 45.0703, lng: 7.6869 },
  { city: "Naples", country: "Italy", lat: 40.8518, lng: 14.2681 },
  { city: "Florence", country: "Italy", lat: 43.7696, lng: 11.2558 },
  { city: "Bologna", country: "Italy", lat: 44.4949, lng: 11.3426 },
  { city: "Genoa", country: "Italy", lat: 44.4056, lng: 8.9463 },
  { city: "Venice", country: "Italy", lat: 45.4408, lng: 12.3155 },
  { city: "Verona", country: "Italy", lat: 45.4384, lng: 10.9916 },
  { city: "Bergamo", country: "Italy", lat: 45.6983, lng: 9.6773 },
  
  // Netherlands
  { city: "Amsterdam", country: "Netherlands", lat: 52.3676, lng: 4.9041 },
  { city: "Rotterdam", country: "Netherlands", lat: 51.9244, lng: 4.4777 },
  { city: "Eindhoven", country: "Netherlands", lat: 51.4416, lng: 5.4697 },
  { city: "Utrecht", country: "Netherlands", lat: 52.0907, lng: 5.1214 },
  { city: "The Hague", country: "Netherlands", lat: 52.0705, lng: 4.3007 },
  { city: "Arnhem", country: "Netherlands", lat: 51.9851, lng: 5.8987 },
  { city: "Alkmaar", country: "Netherlands", lat: 52.6324, lng: 4.7534 },
  
  // Norway
  { city: "Oslo", country: "Norway", lat: 59.9139, lng: 10.7522 },
  { city: "Bergen", country: "Norway", lat: 60.3913, lng: 5.3221 },
  { city: "Trondheim", country: "Norway", lat: 63.4305, lng: 10.3951 },
  
  // Poland
  { city: "Warsaw", country: "Poland", lat: 52.2297, lng: 21.0122 },
  { city: "Krakow", country: "Poland", lat: 50.0647, lng: 19.9450 },
  { city: "Poznań", country: "Poland", lat: 52.4064, lng: 16.9252 },
  { city: "Wrocław", country: "Poland", lat: 51.1079, lng: 17.0385 },
  { city: "Gdańsk", country: "Poland", lat: 54.3520, lng: 18.6466 },
  
  // Portugal
  { city: "Lisbon", country: "Portugal", lat: 38.7223, lng: -9.1393 },
  { city: "Porto", country: "Portugal", lat: 41.1579, lng: -8.6291 },
  { city: "Braga", country: "Portugal", lat: 41.5454, lng: -8.4265 },
  { city: "Guimarães", country: "Portugal", lat: 41.4425, lng: -8.2918 },
  
  // Romania
  { city: "Bucharest", country: "Romania", lat: 44.4268, lng: 26.1025 },
  { city: "Cluj-Napoca", country: "Romania", lat: 46.7712, lng: 23.6236 },
  
  // Scotland
  { city: "Glasgow", country: "Scotland", lat: 55.8642, lng: -4.2518 },
  { city: "Edinburgh", country: "Scotland", lat: 55.9533, lng: -3.1883 },
  { city: "Aberdeen", country: "Scotland", lat: 57.1497, lng: -2.0943 },
  { city: "Dundee", country: "Scotland", lat: 56.4620, lng: -2.9707 },
  
  // Serbia
  { city: "Belgrade", country: "Serbia", lat: 44.7866, lng: 20.4489 },
  
  // Spain
  { city: "Madrid", country: "Spain", lat: 40.4168, lng: -3.7038 },
  { city: "Barcelona", country: "Spain", lat: 41.3851, lng: 2.1734 },
  { city: "Valencia", country: "Spain", lat: 39.4699, lng: -0.3763 },
  { city: "Seville", country: "Spain", lat: 37.3891, lng: -5.9845 },
  { city: "Bilbao", country: "Spain", lat: 43.2630, lng: -2.9350 },
  { city: "San Sebastián", country: "Spain", lat: 43.3183, lng: -1.9812 },
  { city: "Vigo", country: "Spain", lat: 42.2406, lng: -8.7207 },
  { city: "Villarreal", country: "Spain", lat: 39.9381, lng: -0.1015 },
  { city: "Girona", country: "Spain", lat: 41.9794, lng: 2.8214 },
  { city: "Mallorca", country: "Spain", lat: 39.5696, lng: 2.6502 },
  { city: "Las Palmas", country: "Spain", lat: 28.1235, lng: -15.4363 },
  { city: "Pamplona", country: "Spain", lat: 42.8125, lng: -1.6458 },
  { city: "Oviedo", country: "Spain", lat: 43.3619, lng: -5.8494 },
  { city: "Málaga", country: "Spain", lat: 36.7213, lng: -4.4214 },
  
  // Sweden
  { city: "Stockholm", country: "Sweden", lat: 59.3293, lng: 18.0686 },
  { city: "Gothenburg", country: "Sweden", lat: 57.7089, lng: 11.9746 },
  { city: "Malmö", country: "Sweden", lat: 55.6050, lng: 13.0038 },
  
  // Switzerland
  { city: "Zurich", country: "Switzerland", lat: 47.3769, lng: 8.5417 },
  { city: "Basel", country: "Switzerland", lat: 47.5596, lng: 7.5886 },
  { city: "Bern", country: "Switzerland", lat: 46.9480, lng: 7.4474 },
  { city: "Geneva", country: "Switzerland", lat: 46.2044, lng: 6.1432 },
  
  // Turkey
  { city: "Istanbul", country: "Turkey", lat: 41.0082, lng: 28.9784 },
  { city: "Ankara", country: "Turkey", lat: 39.9334, lng: 32.8597 },
  { city: "Izmir", country: "Turkey", lat: 38.4237, lng: 27.1428 },
  
  // Ukraine
  { city: "Kyiv", country: "Ukraine", lat: 50.4501, lng: 30.5234 },
  { city: "Kharkiv", country: "Ukraine", lat: 49.9935, lng: 36.2304 },
  { city: "Donetsk", country: "Ukraine", lat: 48.0159, lng: 37.8029 },
  
  // Wales
  { city: "Cardiff", country: "Wales", lat: 51.4816, lng: -3.1791 },
  { city: "Swansea", country: "Wales", lat: 51.6214, lng: -3.9436 },
  
  // Ireland
  { city: "Dublin", country: "Ireland", lat: 53.3498, lng: -6.2603 },
];

// Club name to city mapping for common clubs
export const clubCityMapping: Record<string, string> = {
  // Austria
  "Austria Wien": "Vienna",
  "Rapid Vienna": "Vienna",
  "Red Bull Salzburg": "Salzburg",
  "SK Sturm Graz": "Graz",
  "Grazer AK": "Graz",
  "FC Blau-Weiss Linz": "Linz",
  
  // Belgium
  "RSC Anderlecht": "Brussels",
  "Club Brugge KV": "Bruges",
  "Cercle Brugge": "Bruges",
  "Standard Liège": "Liège",
  "KAA Gent": "Ghent",
  "Royal Antwerp FC": "Antwerp",
  "KRC Genk": "Genk",
  
  // England
  "Arsenal FC": "London",
  "Chelsea FC": "London",
  "Tottenham Hotspur": "London",
  "West Ham United": "London",
  "Crystal Palace": "London",
  "Fulham FC": "London",
  "Brentford FC": "London",
  "Manchester United": "Manchester",
  "Manchester City": "Manchester",
  "Liverpool FC": "Liverpool",
  "Everton FC": "Liverpool",
  "Aston Villa": "Birmingham",
  "Leeds United": "Leeds",
  "Newcastle United": "Newcastle",
  "Brighton & Hove Albion": "Brighton",
  "Southampton FC": "Southampton",
  
  // France
  "Paris Saint-Germain": "Paris",
  "Olympique Marseille": "Marseille",
  "Olympique Lyonnais": "Lyon",
  "LOSC Lille": "Lille",
  "OGC Nice": "Nice",
  "Girondins de Bordeaux": "Bordeaux",
  "FC Nantes": "Nantes",
  "RC Strasbourg": "Strasbourg",
  "AS Monaco": "Monaco",
  "RC Lens": "Lens",
  
  // Germany
  "Bayern Munich": "Munich",
  "FC Bayern München": "Munich",
  "TSV 1860 Munich": "Munich",
  "Hertha BSC": "Berlin",
  "1. FC Union Berlin": "Berlin",
  "Borussia Dortmund": "Dortmund",
  "Eintracht Frankfurt": "Frankfurt",
  "VfB Stuttgart": "Stuttgart",
  "RB Leipzig": "Leipzig",
  "1. FC Köln": "Cologne",
  "Hamburger SV": "Hamburg",
  "Werder Bremen": "Bremen",
  "TSG 1899 Hoffenheim": "Hoffenheim",
  "SC Freiburg": "Freiburg",
  "VfL Wolfsburg": "Wolfsburg",
  "Bayer 04 Leverkusen": "Leverkusen",
  "Borussia Mönchengladbach": "Mönchengladbach",
  "1. FSV Mainz 05": "Mainz",
  "FC Augsburg": "Augsburg",
  
  // Italy
  "AC Milan": "Milan",
  "Inter Milan": "Milan",
  "AS Roma": "Rome",
  "SS Lazio": "Rome",
  "Juventus": "Turin",
  "Torino FC": "Turin",
  "SSC Napoli": "Naples",
  "ACF Fiorentina": "Florence",
  "Bologna FC": "Bologna",
  "Genoa CFC": "Genoa",
  "UC Sampdoria": "Genoa",
  "Venezia FC": "Venice",
  "Hellas Verona": "Verona",
  "Atalanta BC": "Bergamo",
  
  // Netherlands
  "Ajax Amsterdam": "Amsterdam",
  "AFC Ajax": "Amsterdam",
  "Feyenoord": "Rotterdam",
  "PSV Eindhoven": "Eindhoven",
  "FC Utrecht": "Utrecht",
  "ADO Den Haag": "The Hague",
  "Vitesse Arnhem": "Arnhem",
  "AZ Alkmaar": "Alkmaar",
  
  // Portugal
  "SL Benfica": "Lisbon",
  "Sporting CP": "Lisbon",
  "FC Porto": "Porto",
  "SC Braga": "Braga",
  "Vitória SC": "Guimarães",
  
  // Scotland
  "Celtic FC": "Glasgow",
  "Rangers FC": "Glasgow",
  "Heart of Midlothian": "Edinburgh",
  "Hibernian FC": "Edinburgh",
  "Aberdeen FC": "Aberdeen",
  "Dundee United": "Dundee",
  "Dundee FC": "Dundee",
  
  // Spain
  "Real Madrid": "Madrid",
  "Atlético Madrid": "Madrid",
  "Getafe CF": "Madrid",
  "Rayo Vallecano": "Madrid",
  "FC Barcelona": "Barcelona",
  "RCD Espanyol": "Barcelona",
  "Valencia CF": "Valencia",
  "Levante UD": "Valencia",
  "Sevilla FC": "Seville",
  "Real Betis": "Seville",
  "Athletic Bilbao": "Bilbao",
  "Real Sociedad": "San Sebastián",
  "Celta Vigo": "Vigo",
  "Villarreal CF": "Villarreal",
  "Girona FC": "Girona",
  "RCD Mallorca": "Mallorca",
  "UD Las Palmas": "Las Palmas",
  "CA Osasuna": "Pamplona",
  "Real Oviedo": "Oviedo",
  "Málaga CF": "Málaga",
  
  // Other countries
  "Dinamo Zagreb": "Zagreb",
  "Hajduk Split": "Split",
  "Sparta Prague": "Prague",
  "Slavia Prague": "Prague",
  "FC Midtjylland": "Aarhus",
  "FC Copenhagen": "Copenhagen",
  "Odense Boldklub": "Odense",
  "PAOK FC": "Thessaloniki",
  "Olympiacos FC": "Piraeus",
  "AEK Athens": "Athens",
  "Panathinaikos": "Athens",
  "Ferencváros": "Budapest",
  "Legia Warsaw": "Warsaw",
  "Lech Poznań": "Poznań",
  "Śląsk Wrocław": "Wrocław",
  "Wisła Kraków": "Krakow",
  "FCSB": "Bucharest",
  "CFR Cluj": "Cluj-Napoca",
  "Red Star Belgrade": "Belgrade",
  "Partizan Belgrade": "Belgrade",
  "Malmö FF": "Malmö",
  "AIK Stockholm": "Stockholm",
  "IFK Göteborg": "Gothenburg",
  "FC Zürich": "Zurich",
  "FC Basel": "Basel",
  "BSC Young Boys": "Bern",
  "Servette FC": "Geneva",
  "Galatasaray": "Istanbul",
  "Fenerbahçe": "Istanbul",
  "Beşiktaş": "Istanbul",
  "Shakhtar Donetsk": "Donetsk",
  "Dynamo Kyiv": "Kyiv",
};

// Get coordinates for a club based on name matching
export function getClubCoordinates(clubName: string, country: string): { lat: number; lng: number } | null {
  // First try direct club mapping
  const cityName = clubCityMapping[clubName];
  if (cityName) {
    const cityCoords = europeanCityCoordinates.find(
      c => c.city === cityName && (c.country === country || c.country.toLowerCase() === country?.toLowerCase())
    );
    if (cityCoords) {
      return { lat: cityCoords.lat, lng: cityCoords.lng };
    }
    // Try without country match
    const cityOnlyCoords = europeanCityCoordinates.find(c => c.city === cityName);
    if (cityOnlyCoords) {
      return { lat: cityOnlyCoords.lat, lng: cityOnlyCoords.lng };
    }
  }
  
  // Try to find a city name within the club name
  for (const city of europeanCityCoordinates) {
    if (city.country === country || city.country.toLowerCase() === country?.toLowerCase()) {
      if (clubName.toLowerCase().includes(city.city.toLowerCase())) {
        return { lat: city.lat, lng: city.lng };
      }
    }
  }
  
  return null;
}

// Get the center coordinates for a country (for fallback positioning)
export function getCountryCenter(country: string): { lat: number; lng: number } | null {
  const countryCities = europeanCityCoordinates.filter(
    c => c.country === country || c.country.toLowerCase() === country?.toLowerCase()
  );
  
  if (countryCities.length === 0) return null;
  
  const avgLat = countryCities.reduce((sum, c) => sum + c.lat, 0) / countryCities.length;
  const avgLng = countryCities.reduce((sum, c) => sum + c.lng, 0) / countryCities.length;
  
  return { lat: avgLat, lng: avgLng };
}
