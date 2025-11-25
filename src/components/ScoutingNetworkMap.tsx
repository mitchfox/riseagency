import { MapPin } from "lucide-react";
import { useState } from "react";
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
  };

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

  const handleCountryClick = (x: number, y: number, event: React.MouseEvent) => {
    event.stopPropagation();
    const zoom = 3;
    const newWidth = 1000 / zoom;
    const newHeight = 600 / zoom;
    const newX = Math.max(0, Math.min(1000 - newWidth, x - newWidth / 2));
    const newY = Math.max(0, Math.min(600 - newHeight, y - newHeight / 2));
    setViewBox(`${newX} ${newY} ${newWidth} ${newHeight}`);
    setZoomLevel(1);
  };

  const handleMapClick = () => {
    if (zoomLevel > 0) {
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
              const flagImage = flagImages[country.country];
              return (
                <g 
                  key={`country-${idx}`}
                  onClick={(e) => handleCountryClick(country.x, country.y, e)}
                  className="cursor-pointer"
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
                    <clipPath id={`flag-clip-${idx}`}>
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
                    clipPath={`url(#flag-clip-${idx})`}
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

            {/* Football Club Logos */}
            {footballClubs.map((club, idx) => (
              <g key={`club-${idx}`}>
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
                  className="cursor-pointer hover:stroke-primary transition-colors"
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
              <div className="w-3 h-3 rounded-full border border-white bg-primary/30" />
              <span>Country Coverage</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full border border-white bg-primary/20" />
              <span>Partner Club</span>
            </div>
            <button
              onClick={() => setShowGrid(!showGrid)}
              className="flex items-center gap-2 px-3 py-1 rounded border border-border hover:bg-accent transition-colors"
            >
              <span>{showGrid ? "Hide" : "Show"} Grid</span>
            </button>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>{zoomLevel === 0 ? "Click country to zoom in" : "Click map to zoom out"}</span>
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
