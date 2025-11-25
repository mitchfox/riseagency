import { MapPin } from "lucide-react";
import { useState } from "react";
import europeOutline from "@/assets/europe-outline.gif";
import norwichLogo from "@/assets/clubs/norwich-city-official.png";
import bohemiansLogo from "@/assets/clubs/bohemians-1905-official.png";
import jihlavaLogo from "@/assets/clubs/fc-vysocina-jihlava-official.png";
import domazliceLogo from "@/assets/clubs/tj-jiskra-domazlice-official.png";
import forestGreenLogo from "@/assets/clubs/forest-green-rovers.png";

const ScoutingNetworkMap = () => {
  const [viewBox, setViewBox] = useState("0 0 1000 600");
  const [zoomLevel, setZoomLevel] = useState(0); // 0 = out, 1 = medium, 2 = fully zoomed
  const [showGrid, setShowGrid] = useState(true);
  // Europe outline is rendered from raster map image (europe-outline.gif)

  // Football clubs with their real locations
  const footballClubs = [
    { name: "Norwich City FC", country: "England", city: "Norwich", x: 530, y: 270, logo: norwichLogo },
    { name: "Bohemians 1905", country: "Czech Republic", city: "Prague", x: 680, y: 295, logo: bohemiansLogo },
    { name: "FC Vysočina Jihlava", country: "Czech Republic", city: "Jihlava", x: 675, y: 310, logo: jihlavaLogo },
    { name: "TJ Jiskra Domažlice", country: "Czech Republic", city: "Domažlice", x: 665, y: 315, logo: domazliceLogo },
    { name: "Forest Green Rovers", country: "England", city: "Nailsworth", x: 510, y: 290, logo: forestGreenLogo },
  ];

  // Country centers with flag markers
  const countryMarkers = [
    { country: "England", x: 325, y: 375 },
    { country: "Scotland", x: 275, y: 310 },
    { country: "Ireland", x: 230, y: 375 },
    { country: "Iceland", x: 225, y: 110 },
    { country: "Portugal", x: 250, y: 525 },
    { country: "Spain", x: 325, y: 525 },
    { country: "France", x: 350, y: 450 },
    { country: "Norway", x: 400, y: 100 },
    { country: "Sweden", x: 450, y: 130 },
    { country: "Denmark", x: 410, y: 240 },
    { country: "Netherlands", x: 375, y: 350 },
    { country: "Belgium", x: 360, y: 375 },
    { country: "Germany", x: 450, y: 375 },
    { country: "Switzerland", x: 425, y: 425 },
    { country: "Austria", x: 500, y: 425 },
    { country: "Czech Republic", x: 500, y: 350 },
    { country: "Poland", x: 550, y: 300 },
    { country: "Italy", x: 475, y: 500 },
    { country: "Greece", x: 575, y: 550 },
    { country: "Turkey", x: 650, y: 525 },
    { country: "Romania", x: 600, y: 425 },
    { country: "Serbia", x: 575, y: 475 },
    { country: "Croatia", x: 500, y: 475 },
  ];

  const handleMapClick = (event: React.MouseEvent<SVGSVGElement>) => {
    const svg = event.currentTarget;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    
    const svgPoint = point.matrixTransform(svg.getScreenCTM()?.inverse());
    
    if (zoomLevel === 0) {
      // First zoom: medium zoom
      const zoom = 2.5;
      const newWidth = 1000 / zoom;
      const newHeight = 600 / zoom;
      const newX = Math.max(0, Math.min(1000 - newWidth, svgPoint.x - newWidth / 2));
      const newY = Math.max(0, Math.min(600 - newHeight, svgPoint.y - newHeight / 2));
      setViewBox(`${newX} ${newY} ${newWidth} ${newHeight}`);
      setZoomLevel(1);
    } else if (zoomLevel === 1) {
      // Second zoom: fully zoomed
      const zoom = 5;
      const newWidth = 1000 / zoom;
      const newHeight = 600 / zoom;
      const newX = Math.max(0, Math.min(1000 - newWidth, svgPoint.x - newWidth / 2));
      const newY = Math.max(0, Math.min(600 - newHeight, svgPoint.y - newHeight / 2));
      setViewBox(`${newX} ${newY} ${newWidth} ${newHeight}`);
      setZoomLevel(2);
    } else {
      // Zoom out to original
      setViewBox("0 0 1000 600");
      setZoomLevel(0);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-3xl font-bebas">SCOUTING NETWORK ACROSS EUROPE</h3>
        <p className="text-muted-foreground">
          Our extensive scouting presence spanning {countryMarkers.length} countries
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Section */}
        <div className="lg:col-span-2 bg-card rounded-lg p-6 border">
          <svg
            viewBox={viewBox}
            className="w-full h-auto cursor-pointer transition-all duration-700 ease-in-out"
            style={{ maxHeight: "600px" }}
            onClick={handleMapClick}
          >
            {/* Flag Pattern Definitions */}
            <defs>
              {/* England - St George's Cross */}
              <pattern id="flag-england" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <rect width="60" height="60" fill="#FFFFFF"/>
                <rect x="25" width="10" height="60" fill="#CE1124"/>
                <rect y="25" width="60" height="10" fill="#CE1124"/>
              </pattern>

              {/* France - Tricolor */}
              <pattern id="flag-france" x="0" y="0" width="60" height="40" patternUnits="userSpaceOnUse">
                <rect width="20" height="40" fill="#002395"/>
                <rect x="20" width="20" height="40" fill="#FFFFFF"/>
                <rect x="40" width="20" height="40" fill="#ED2939"/>
              </pattern>

              {/* Spain */}
              <pattern id="flag-spain" x="0" y="0" width="60" height="40" patternUnits="userSpaceOnUse">
                <rect width="60" height="40" fill="#AA151B"/>
                <rect y="10" width="60" height="20" fill="#F1BF00"/>
              </pattern>

              {/* Portugal */}
              <pattern id="flag-portugal" x="0" y="0" width="60" height="40" patternUnits="userSpaceOnUse">
                <rect width="24" height="40" fill="#006600"/>
                <rect x="24" width="36" height="40" fill="#FF0000"/>
              </pattern>

              {/* Germany */}
              <pattern id="flag-germany" x="0" y="0" width="60" height="30" patternUnits="userSpaceOnUse">
                <rect width="60" height="10" fill="#000000"/>
                <rect y="10" width="60" height="10" fill="#DD0000"/>
                <rect y="20" width="60" height="10" fill="#FFCE00"/>
              </pattern>

              {/* Italy */}
              <pattern id="flag-italy" x="0" y="0" width="60" height="40" patternUnits="userSpaceOnUse">
                <rect width="20" height="40" fill="#009246"/>
                <rect x="20" width="20" height="40" fill="#FFFFFF"/>
                <rect x="40" width="20" height="40" fill="#CE2B37"/>
              </pattern>

              {/* Netherlands */}
              <pattern id="flag-netherlands" x="0" y="0" width="60" height="30" patternUnits="userSpaceOnUse">
                <rect width="60" height="10" fill="#AE1C28"/>
                <rect y="10" width="60" height="10" fill="#FFFFFF"/>
                <rect y="20" width="60" height="10" fill="#21468B"/>
              </pattern>

              {/* Belgium */}
              <pattern id="flag-belgium" x="0" y="0" width="60" height="40" patternUnits="userSpaceOnUse">
                <rect width="20" height="40" fill="#000000"/>
                <rect x="20" width="20" height="40" fill="#FDDA24"/>
                <rect x="40" width="20" height="40" fill="#EF3340"/>
              </pattern>

              {/* Switzerland - Red with white cross */}
              <pattern id="flag-switzerland" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                <rect width="32" height="32" fill="#FF0000"/>
                <rect x="11" y="6" width="10" height="20" fill="#FFFFFF"/>
                <rect x="6" y="11" width="20" height="10" fill="#FFFFFF"/>
              </pattern>

              {/* Austria */}
              <pattern id="flag-austria" x="0" y="0" width="60" height="30" patternUnits="userSpaceOnUse">
                <rect width="60" height="30" fill="#ED2939"/>
                <rect y="10" width="60" height="10" fill="#FFFFFF"/>
              </pattern>

              {/* Poland */}
              <pattern id="flag-poland" x="0" y="0" width="60" height="40" patternUnits="userSpaceOnUse">
                <rect width="60" height="20" fill="#FFFFFF"/>
                <rect y="20" width="60" height="20" fill="#DC143C"/>
              </pattern>

              {/* Czech Republic */}
              <pattern id="flag-czech-republic" x="0" y="0" width="60" height="40" patternUnits="userSpaceOnUse">
                <rect width="60" height="20" fill="#FFFFFF"/>
                <rect y="20" width="60" height="20" fill="#D7141A"/>
                <polygon points="0,0 0,40 30,20" fill="#11457E"/>
              </pattern>

              {/* Denmark */}
              <pattern id="flag-denmark" x="0" y="0" width="60" height="40" patternUnits="userSpaceOnUse">
                <rect width="60" height="40" fill="#C60C30"/>
                <rect x="17" width="7" height="40" fill="#FFFFFF"/>
                <rect y="17" width="60" height="6" fill="#FFFFFF"/>
              </pattern>

              {/* Sweden */}
              <pattern id="flag-sweden" x="0" y="0" width="60" height="40" patternUnits="userSpaceOnUse">
                <rect width="60" height="40" fill="#006AA7"/>
                <rect x="17" width="7" height="40" fill="#FECC00"/>
                <rect y="17" width="60" height="6" fill="#FECC00"/>
              </pattern>

              {/* Norway */}
              <pattern id="flag-norway" x="0" y="0" width="60" height="40" patternUnits="userSpaceOnUse">
                <rect width="60" height="40" fill="#BA0C2F"/>
                <rect x="17" width="10" height="40" fill="#FFFFFF"/>
                <rect y="15" width="60" height="10" fill="#FFFFFF"/>
                <rect x="19" width="6" height="40" fill="#00205B"/>
                <rect y="17" width="60" height="6" fill="#00205B"/>
              </pattern>

              {/* Greece */}
              <pattern id="flag-greece" x="0" y="0" width="60" height="45" patternUnits="userSpaceOnUse">
                <rect width="60" height="45" fill="#0D5EAF"/>
                <rect y="5" width="60" height="5" fill="#FFFFFF"/>
                <rect y="15" width="60" height="5" fill="#FFFFFF"/>
                <rect y="25" width="60" height="5" fill="#FFFFFF"/>
                <rect y="35" width="60" height="5" fill="#FFFFFF"/>
              </pattern>

              {/* Turkey */}
              <pattern id="flag-turkey" x="0" y="0" width="60" height="40" patternUnits="userSpaceOnUse">
                <rect width="60" height="40" fill="#E30A17"/>
                <circle cx="27" cy="20" r="9" fill="#FFFFFF"/>
                <circle cx="30" cy="20" r="7" fill="#E30A17"/>
                <polygon points="37,20 39,22 42,21 40,24 42,26 39,25 37,28 36,25 33,26 35,24 33,21 36,22" fill="#FFFFFF"/>
              </pattern>

              {/* Scotland */}
              <pattern id="flag-scotland" x="0" y="0" width="60" height="40" patternUnits="userSpaceOnUse">
                <rect width="60" height="40" fill="#0065BD"/>
                <polygon points="0,0 12,20 0,40" fill="#FFFFFF"/>
                <polygon points="60,0 48,20 60,40" fill="#FFFFFF"/>
                <polygon points="0,0 30,10 60,0" fill="#FFFFFF"/>
                <polygon points="0,40 30,30 60,40" fill="#FFFFFF"/>
              </pattern>

              {/* Ireland */}
              <pattern id="flag-ireland" x="0" y="0" width="60" height="40" patternUnits="userSpaceOnUse">
                <rect width="20" height="40" fill="#169B62"/>
                <rect x="20" width="20" height="40" fill="#FFFFFF"/>
                <rect x="40" width="20" height="40" fill="#FF883E"/>
              </pattern>

              {/* Romania */}
              <pattern id="flag-romania" x="0" y="0" width="60" height="40" patternUnits="userSpaceOnUse">
                <rect width="20" height="40" fill="#002B7F"/>
                <rect x="20" width="20" height="40" fill="#FCD116"/>
                <rect x="40" width="20" height="40" fill="#CE1126"/>
              </pattern>

              {/* Serbia */}
              <pattern id="flag-serbia" x="0" y="0" width="60" height="30" patternUnits="userSpaceOnUse">
                <rect width="60" height="10" fill="#C6363C"/>
                <rect y="10" width="60" height="10" fill="#0C4076"/>
                <rect y="20" width="60" height="10" fill="#FFFFFF"/>
              </pattern>

              {/* Croatia */}
              <pattern id="flag-croatia" x="0" y="0" width="60" height="30" patternUnits="userSpaceOnUse">
                <rect width="60" height="10" fill="#FF0000"/>
                <rect y="10" width="60" height="10" fill="#FFFFFF"/>
                <rect y="20" width="60" height="10" fill="#171796"/>
              </pattern>
            </defs>

            {/* Background */}
            <rect width="1000" height="600" fill="hsl(var(--background))" />

            {/* Grid System */}
            {showGrid && (
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

            {/* Europe outline image */}
            <image
              href={europeOutline}
              x="0"
              y="0"
              width="1000"
              height="600"
              preserveAspectRatio="xMidYMid meet"
              opacity="0.7"
            />

            {/* Country Flag Markers */}
            {countryMarkers.map((country, idx) => {
              const patternId = `flag-${country.country.toLowerCase().replace(/ /g, '-')}`;
              return (
                <g key={`country-${idx}`}>
                  {/* Glow effect */}
                  <circle
                    cx={country.x}
                    cy={country.y}
                    r="35"
                    fill="hsl(var(--primary))"
                    className="animate-pulse opacity-10"
                  />
                  {/* Country flag circle */}
                  <circle
                    cx={country.x}
                    cy={country.y}
                    r="25"
                    fill={`url(#${patternId})`}
                    stroke="white"
                    strokeWidth="2"
                    className="cursor-pointer hover:r-28 transition-all"
                    opacity="0.8"
                  >
                    <title>{country.country}</title>
                  </circle>
                </g>
              );
            })}

            {/* Football Club Logos */}
            {footballClubs.map((club, idx) => (
              <g key={`club-${idx}`}>
                {/* Glow effect */}
                <circle
                  cx={club.x}
                  cy={club.y}
                  r="8"
                  fill="hsl(var(--primary))"
                  className="animate-pulse opacity-20"
                />
                {/* Circular clip path for logo */}
                <defs>
                  <clipPath id={`clip-${idx}`}>
                    <circle cx={club.x} cy={club.y} r="5" />
                  </clipPath>
                </defs>
                {/* Club logo in circle */}
                <image
                  href={club.logo}
                  x={club.x - 5}
                  y={club.y - 5}
                  width="10"
                  height="10"
                  clipPath={`url(#clip-${idx})`}
                  className="cursor-pointer"
                />
                {/* Circle border */}
                <circle
                  cx={club.x}
                  cy={club.y}
                  r="5"
                  fill="none"
                  stroke="white"
                  strokeWidth="1"
                  className="cursor-pointer hover:r-6 transition-all"
                >
                  <title>{club.name} - {club.city}, {club.country}</title>
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
          <div className="flex items-center justify-center gap-6 mt-4 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full border-2 border-white bg-primary/30" />
              <span>Country Coverage</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border border-white bg-primary/20" />
              <span>Partner Club</span>
            </div>
            <button
              onClick={() => setShowGrid(!showGrid)}
              className="flex items-center gap-2 px-3 py-1 rounded border border-border hover:bg-accent transition-colors"
            >
              <span>{showGrid ? "Hide" : "Show"} Grid</span>
            </button>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>{zoomLevel === 0 ? "Click to zoom in" : zoomLevel === 1 ? "Click to zoom further" : "Click to zoom out"}</span>
            </div>
          </div>
        </div>

        {/* Stats & Details Section */}
        <div className="space-y-4">
          <div className="bg-card rounded-lg p-4 border">
            <h4 className="font-bebas text-xl mb-3">NETWORK COVERAGE</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Partner Clubs</span>
                <span className="font-bold text-xl">{footballClubs.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Countries</span>
                <span className="font-bold text-xl">{countryMarkers.length}</span>
              </div>
            </div>
          </div>

          {/* Country List */}
          <div className="bg-card rounded-lg p-4 border max-h-96 overflow-y-auto">
            <h4 className="font-bebas text-xl mb-3">COVERAGE REGIONS</h4>
            <div className="space-y-2">
              {countryMarkers.map((country, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-2 rounded hover:bg-accent transition-colors"
                >
                  <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium">{country.country}</div>
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
