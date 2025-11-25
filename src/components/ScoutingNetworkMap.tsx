import { MapPin } from "lucide-react";

const ScoutingNetworkMap = () => {
  // Sample scouting locations across Europe
  const scoutingLocations = [
    { country: "England", city: "London", x: 520, y: 290 },
    { country: "Spain", city: "Madrid", x: 420, y: 480 },
    { country: "Germany", city: "Berlin", x: 650, y: 280 },
    { country: "Italy", city: "Rome", x: 620, y: 490 },
    { country: "France", city: "Paris", x: 510, y: 360 },
    { country: "Netherlands", city: "Amsterdam", x: 560, y: 250 },
    { country: "Portugal", city: "Lisbon", x: 340, y: 490 },
    { country: "Belgium", city: "Brussels", x: 540, y: 275 },
    { country: "Czech Republic", city: "Prague", x: 680, y: 295 },
    { country: "Austria", city: "Vienna", x: 670, y: 345 },
    { country: "Poland", city: "Warsaw", x: 730, y: 260 },
    { country: "Denmark", city: "Copenhagen", x: 605, y: 200 },
    { country: "Sweden", city: "Stockholm", x: 650, y: 140 },
    { country: "Norway", city: "Oslo", x: 600, y: 120 },
  ];

  // European countries borders (simplified paths)
  const europeanCountries = [
    { name: "England", path: "M 520 280 L 540 270 L 560 280 L 550 300 L 530 310 L 510 300 Z" },
    { name: "France", path: "M 480 320 L 520 310 L 540 340 L 560 380 L 540 420 L 500 430 L 470 410 L 460 370 L 470 340 Z" },
    { name: "Spain", path: "M 380 440 L 460 430 L 480 460 L 470 500 L 440 520 L 400 530 L 360 520 L 350 480 Z" },
    { name: "Portugal", path: "M 320 460 L 360 450 L 370 490 L 360 530 L 320 540 L 300 510 Z" },
    { name: "Germany", path: "M 580 260 L 640 250 L 680 270 L 690 310 L 680 350 L 640 360 L 600 350 L 570 320 L 560 280 Z" },
    { name: "Italy", path: "M 600 400 L 620 390 L 640 410 L 650 450 L 640 500 L 620 540 L 600 560 L 580 540 L 570 500 L 580 460 L 590 420 Z" },
    { name: "Netherlands", path: "M 540 240 L 570 230 L 590 250 L 580 270 L 550 280 L 530 260 Z" },
    { name: "Belgium", path: "M 520 270 L 550 260 L 560 280 L 540 290 L 520 280 Z" },
    { name: "Switzerland", path: "M 570 350 L 600 340 L 610 360 L 600 380 L 570 370 Z" },
    { name: "Austria", path: "M 640 330 L 690 320 L 710 340 L 700 360 L 660 370 L 640 350 Z" },
    { name: "Poland", path: "M 700 220 L 760 210 L 780 240 L 770 280 L 740 300 L 700 290 L 680 260 Z" },
    { name: "Czech Republic", path: "M 660 280 L 700 270 L 710 290 L 700 310 L 670 310 L 660 295 Z" },
    { name: "Denmark", path: "M 580 190 L 610 180 L 630 200 L 620 220 L 590 210 Z" },
    { name: "Sweden", path: "M 630 100 L 660 90 L 680 120 L 690 160 L 670 200 L 640 210 L 620 180 L 630 140 Z" },
    { name: "Norway", path: "M 580 80 L 620 60 L 650 90 L 640 140 L 610 170 L 580 150 L 570 110 Z" },
    { name: "Greece", path: "M 740 480 L 770 470 L 790 500 L 780 530 L 750 540 L 730 520 L 730 500 Z" },
    { name: "Turkey", path: "M 820 460 L 900 450 L 920 480 L 900 510 L 860 520 L 820 500 Z" },
    { name: "Scotland", path: "M 510 220 L 540 210 L 550 240 L 530 260 L 510 250 Z" },
    { name: "Ireland", path: "M 440 250 L 470 240 L 480 270 L 470 290 L 440 280 Z" },
    { name: "Romania", path: "M 750 360 L 790 350 L 810 380 L 800 410 L 770 420 L 750 400 Z" },
    { name: "Serbia", path: "M 710 400 L 740 390 L 750 410 L 740 430 L 710 420 Z" },
    { name: "Croatia", path: "M 660 390 L 690 380 L 700 410 L 680 430 L 660 410 Z" },
  ];

  return (
    <div className="w-full space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-3xl font-bebas">SCOUTING NETWORK ACROSS EUROPE</h3>
        <p className="text-muted-foreground">
          Our extensive scouting presence spanning {scoutingLocations.length} major cities
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Section */}
        <div className="lg:col-span-2 bg-card rounded-lg p-6 border">
          <svg
            viewBox="0 0 1000 600"
            className="w-full h-auto"
            style={{ maxHeight: "600px" }}
          >
            {/* Flag Pattern Definitions */}
            <defs>
              {/* England - St George's Cross */}
              <pattern id="flag-england" patternUnits="objectBoundingBox" width="1" height="1">
                <rect width="100%" height="100%" fill="#FFFFFF"/>
                <rect x="45%" width="10%" height="100%" fill="#CE1124"/>
                <rect y="45%" width="100%" height="10%" fill="#CE1124"/>
              </pattern>

              {/* France - Tricolor */}
              <pattern id="flag-france" patternUnits="objectBoundingBox" width="1" height="1">
                <rect width="33.33%" height="100%" fill="#002395"/>
                <rect x="33.33%" width="33.33%" height="100%" fill="#FFFFFF"/>
                <rect x="66.66%" width="33.33%" height="100%" fill="#ED2939"/>
              </pattern>

              {/* Spain */}
              <pattern id="flag-spain" patternUnits="objectBoundingBox" width="1" height="1">
                <rect width="100%" height="100%" fill="#AA151B"/>
                <rect y="25%" width="100%" height="50%" fill="#F1BF00"/>
              </pattern>

              {/* Portugal */}
              <pattern id="flag-portugal" patternUnits="objectBoundingBox" width="1" height="1">
                <rect width="40%" height="100%" fill="#006600"/>
                <rect x="40%" width="60%" height="100%" fill="#FF0000"/>
              </pattern>

              {/* Germany */}
              <pattern id="flag-germany" patternUnits="objectBoundingBox" width="1" height="1">
                <rect width="100%" height="33.33%" fill="#000000"/>
                <rect y="33.33%" width="100%" height="33.33%" fill="#DD0000"/>
                <rect y="66.66%" width="100%" height="33.33%" fill="#FFCE00"/>
              </pattern>

              {/* Italy */}
              <pattern id="flag-italy" patternUnits="objectBoundingBox" width="1" height="1">
                <rect width="33.33%" height="100%" fill="#009246"/>
                <rect x="33.33%" width="33.33%" height="100%" fill="#FFFFFF"/>
                <rect x="66.66%" width="33.33%" height="100%" fill="#CE2B37"/>
              </pattern>

              {/* Netherlands */}
              <pattern id="flag-netherlands" patternUnits="objectBoundingBox" width="1" height="1">
                <rect width="100%" height="33.33%" fill="#AE1C28"/>
                <rect y="33.33%" width="100%" height="33.33%" fill="#FFFFFF"/>
                <rect y="66.66%" width="100%" height="33.33%" fill="#21468B"/>
              </pattern>

              {/* Belgium */}
              <pattern id="flag-belgium" patternUnits="objectBoundingBox" width="1" height="1">
                <rect width="33.33%" height="100%" fill="#000000"/>
                <rect x="33.33%" width="33.33%" height="100%" fill="#FDDA24"/>
                <rect x="66.66%" width="33.33%" height="100%" fill="#EF3340"/>
              </pattern>

              {/* Switzerland - Red with white cross */}
              <pattern id="flag-switzerland" patternUnits="objectBoundingBox" width="1" height="1">
                <rect width="100%" height="100%" fill="#FF0000"/>
                <rect x="35%" y="20%" width="30%" height="60%" fill="#FFFFFF"/>
                <rect x="20%" y="35%" width="60%" height="30%" fill="#FFFFFF"/>
              </pattern>

              {/* Austria */}
              <pattern id="flag-austria" patternUnits="objectBoundingBox" width="1" height="1">
                <rect width="100%" height="100%" fill="#ED2939"/>
                <rect y="33.33%" width="100%" height="33.33%" fill="#FFFFFF"/>
              </pattern>

              {/* Poland */}
              <pattern id="flag-poland" patternUnits="objectBoundingBox" width="1" height="1">
                <rect width="100%" height="50%" fill="#FFFFFF"/>
                <rect y="50%" width="100%" height="50%" fill="#DC143C"/>
              </pattern>

              {/* Czech Republic */}
              <pattern id="flag-czech-republic" patternUnits="objectBoundingBox" width="1" height="1">
                <rect width="100%" height="50%" fill="#FFFFFF"/>
                <rect y="50%" width="100%" height="50%" fill="#D7141A"/>
                <polygon points="0,0 0,100 50,50" fill="#11457E"/>
              </pattern>

              {/* Denmark */}
              <pattern id="flag-denmark" patternUnits="objectBoundingBox" width="1" height="1">
                <rect width="100%" height="100%" fill="#C60C30"/>
                <rect x="28%" width="12%" height="100%" fill="#FFFFFF"/>
                <rect y="42%" width="100%" height="16%" fill="#FFFFFF"/>
              </pattern>

              {/* Sweden */}
              <pattern id="flag-sweden" patternUnits="objectBoundingBox" width="1" height="1">
                <rect width="100%" height="100%" fill="#006AA7"/>
                <rect x="28%" width="12%" height="100%" fill="#FECC00"/>
                <rect y="42%" width="100%" height="16%" fill="#FECC00"/>
              </pattern>

              {/* Norway */}
              <pattern id="flag-norway" patternUnits="objectBoundingBox" width="1" height="1">
                <rect width="100%" height="100%" fill="#BA0C2F"/>
                <rect x="28%" width="12%" height="100%" fill="#FFFFFF"/>
                <rect y="42%" width="100%" height="16%" fill="#FFFFFF"/>
                <rect x="30%" width="8%" height="100%" fill="#00205B"/>
                <rect y="44%" width="100%" height="12%" fill="#00205B"/>
              </pattern>

              {/* Greece */}
              <pattern id="flag-greece" patternUnits="objectBoundingBox" width="1" height="1">
                <rect width="100%" height="100%" fill="#0D5EAF"/>
                <rect y="11.11%" width="100%" height="11.11%" fill="#FFFFFF"/>
                <rect y="33.33%" width="100%" height="11.11%" fill="#FFFFFF"/>
                <rect y="55.55%" width="100%" height="11.11%" fill="#FFFFFF"/>
                <rect y="77.77%" width="100%" height="11.11%" fill="#FFFFFF"/>
              </pattern>

              {/* Turkey */}
              <pattern id="flag-turkey" patternUnits="objectBoundingBox" width="1" height="1">
                <rect width="100%" height="100%" fill="#E30A17"/>
                <circle cx="45%" cy="50%" r="15%" fill="#FFFFFF"/>
                <circle cx="48%" cy="50%" r="12%" fill="#E30A17"/>
              </pattern>

              {/* Scotland */}
              <pattern id="flag-scotland" patternUnits="objectBoundingBox" width="1" height="1">
                <rect width="100%" height="100%" fill="#0065BD"/>
                <polygon points="0,0 30,50 0,100" fill="#FFFFFF"/>
                <polygon points="100,0 70,50 100,100" fill="#FFFFFF"/>
                <polygon points="0,0 50,30 100,0" fill="#FFFFFF"/>
                <polygon points="0,100 50,70 100,100" fill="#FFFFFF"/>
              </pattern>

              {/* Ireland */}
              <pattern id="flag-ireland" patternUnits="objectBoundingBox" width="1" height="1">
                <rect width="33.33%" height="100%" fill="#169B62"/>
                <rect x="33.33%" width="33.33%" height="100%" fill="#FFFFFF"/>
                <rect x="66.66%" width="33.33%" height="100%" fill="#FF883E"/>
              </pattern>

              {/* Romania */}
              <pattern id="flag-romania" patternUnits="objectBoundingBox" width="1" height="1">
                <rect width="33.33%" height="100%" fill="#002B7F"/>
                <rect x="33.33%" width="33.33%" height="100%" fill="#FCD116"/>
                <rect x="66.66%" width="33.33%" height="100%" fill="#CE1126"/>
              </pattern>

              {/* Serbia */}
              <pattern id="flag-serbia" patternUnits="objectBoundingBox" width="1" height="1">
                <rect width="100%" height="33.33%" fill="#C6363C"/>
                <rect y="33.33%" width="100%" height="33.33%" fill="#0C4076"/>
                <rect y="66.66%" width="100%" height="33.33%" fill="#FFFFFF"/>
              </pattern>

              {/* Croatia */}
              <pattern id="flag-croatia" patternUnits="objectBoundingBox" width="1" height="1">
                <rect width="100%" height="33.33%" fill="#FF0000"/>
                <rect y="33.33%" width="100%" height="33.33%" fill="#FFFFFF"/>
                <rect y="66.66%" width="100%" height="33.33%" fill="#171796"/>
              </pattern>
            </defs>

            {/* Background */}
            <rect width="1000" height="600" fill="hsl(var(--background))" />

            {/* Country Fills with Flags */}
            {europeanCountries.map((country) => (
              <g key={country.name}>
                <path
                  d={country.path}
                  fill={`url(#flag-${country.name.toLowerCase().replace(/ /g, '-')})`}
                  stroke="hsl(var(--border))"
                  strokeWidth="2"
                  className="opacity-60 hover:opacity-80 transition-opacity"
                >
                  <title>{country.name}</title>
                </path>
              </g>
            ))}

            {/* Scouting Location Points */}
            {scoutingLocations.map((location, idx) => (
              <g key={idx}>
                {/* Pulse effect */}
                <circle
                  cx={location.x}
                  cy={location.y}
                  r="12"
                  fill="hsl(var(--primary))"
                  className="animate-ping opacity-20"
                />
                {/* Main marker */}
                <circle
                  cx={location.x}
                  cy={location.y}
                  r="6"
                  fill="hsl(var(--primary))"
                  stroke="white"
                  strokeWidth="2"
                  className="cursor-pointer hover:r-8 transition-all"
                >
                  <title>{location.city}, {location.country}</title>
                </circle>
              </g>
            ))}

            {/* Connection lines (sample) */}
            <g opacity="0.1" stroke="hsl(var(--primary))" strokeWidth="1">
              <line x1="520" y1="290" x2="510" y2="360" />
              <line x1="510" y1="360" x2="420" y2="480" />
              <line x1="650" y1="280" x2="680" y2="295" />
              <line x1="560" y1="250" x2="540" y2="275" />
            </g>
          </svg>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary shadow-lg shadow-primary/50" />
              <span>Active Scouting Location</span>
            </div>
          </div>
        </div>

        {/* Stats & Details Section */}
        <div className="space-y-4">
          <div className="bg-card rounded-lg p-4 border">
            <h4 className="font-bebas text-xl mb-3">NETWORK COVERAGE</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Cities Covered</span>
                <span className="font-bold text-xl">{scoutingLocations.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Countries</span>
                <span className="font-bold text-xl">{new Set(scoutingLocations.map(l => l.country)).size}</span>
              </div>
            </div>
          </div>

          {/* Location List */}
          <div className="bg-card rounded-lg p-4 border max-h-96 overflow-y-auto">
            <h4 className="font-bebas text-xl mb-3">SCOUTING LOCATIONS</h4>
            <div className="space-y-2">
              {scoutingLocations.map((location, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-2 rounded hover:bg-accent transition-colors"
                >
                  <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium">{location.city}</div>
                    <div className="text-xs text-muted-foreground">{location.country}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScoutingNetworkMap;
