import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCountryFlagUrl } from "@/lib/countryFlags";

interface ClubContact {
  id: string;
  name: string;
  country: string | null;
  city: string | null;
  club_name: string | null;
  position: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface CountryData {
  name: string;
  contacts: number;
}

const EuropeScoutingMap = () => {
  const [contacts, setContacts] = useState<ClubContact[]>([]);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [countryStats, setCountryStats] = useState<Record<string, CountryData>>({});

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    const { data, error } = await supabase
      .from("club_network_contacts")
      .select("*")
      .not("country", "is", null)
      .not("latitude", "is", null)
      .not("longitude", "is", null);

    if (error) {
      console.error("Error fetching contacts:", error);
      return;
    }

    setContacts(data || []);

    // Calculate country statistics
    const stats: Record<string, CountryData> = {};
    (data || []).forEach((contact) => {
      const country = contact.country || "Unknown";
      if (!stats[country]) {
        stats[country] = { name: country, contacts: 0 };
      }
      stats[country].contacts++;
    });
    setCountryStats(stats);
  };

  // Simplified European countries GeoJSON data (key countries)
  const europeanCountries = [
    { name: "England", path: "M 520 280 L 540 270 L 560 280 L 550 300 L 530 310 L 510 300 Z", contacts: 0 },
    { name: "France", path: "M 480 320 L 520 310 L 540 340 L 560 380 L 540 420 L 500 430 L 470 410 L 460 370 L 470 340 Z", contacts: 0 },
    { name: "Spain", path: "M 380 440 L 460 430 L 480 460 L 470 500 L 440 520 L 400 530 L 360 520 L 350 480 Z", contacts: 0 },
    { name: "Portugal", path: "M 320 460 L 360 450 L 370 490 L 360 530 L 320 540 L 300 510 Z", contacts: 0 },
    { name: "Germany", path: "M 580 260 L 640 250 L 680 270 L 690 310 L 680 350 L 640 360 L 600 350 L 570 320 L 560 280 Z", contacts: 0 },
    { name: "Italy", path: "M 600 400 L 620 390 L 640 410 L 650 450 L 640 500 L 620 540 L 600 560 L 580 540 L 570 500 L 580 460 L 590 420 Z", contacts: 0 },
    { name: "Netherlands", path: "M 540 240 L 570 230 L 590 250 L 580 270 L 550 280 L 530 260 Z", contacts: 0 },
    { name: "Belgium", path: "M 520 270 L 550 260 L 560 280 L 540 290 L 520 280 Z", contacts: 0 },
    { name: "Switzerland", path: "M 570 350 L 600 340 L 610 360 L 600 380 L 570 370 Z", contacts: 0 },
    { name: "Austria", path: "M 640 330 L 690 320 L 710 340 L 700 360 L 660 370 L 640 350 Z", contacts: 0 },
    { name: "Poland", path: "M 700 220 L 760 210 L 780 240 L 770 280 L 740 300 L 700 290 L 680 260 Z", contacts: 0 },
    { name: "Czech Republic", path: "M 660 280 L 700 270 L 710 290 L 700 310 L 670 310 L 660 295 Z", contacts: 0 },
    { name: "Denmark", path: "M 580 190 L 610 180 L 630 200 L 620 220 L 590 210 Z", contacts: 0 },
    { name: "Sweden", path: "M 630 100 L 660 90 L 680 120 L 690 160 L 670 200 L 640 210 L 620 180 L 630 140 Z", contacts: 0 },
    { name: "Norway", path: "M 580 80 L 620 60 L 650 90 L 640 140 L 610 170 L 580 150 L 570 110 Z", contacts: 0 },
    { name: "Greece", path: "M 740 480 L 770 470 L 790 500 L 780 530 L 750 540 L 730 520 L 730 500 Z", contacts: 0 },
    { name: "Turkey", path: "M 820 460 L 900 450 L 920 480 L 900 510 L 860 520 L 820 500 Z", contacts: 0 },
    { name: "Scotland", path: "M 510 220 L 540 210 L 550 240 L 530 260 L 510 250 Z", contacts: 0 },
    { name: "Ireland", path: "M 440 250 L 470 240 L 480 270 L 470 290 L 440 280 Z", contacts: 0 },
    { name: "Romania", path: "M 750 360 L 790 350 L 810 380 L 800 410 L 770 420 L 750 400 Z", contacts: 0 },
    { name: "Serbia", path: "M 710 400 L 740 390 L 750 410 L 740 430 L 710 420 Z", contacts: 0 },
    { name: "Croatia", path: "M 660 390 L 690 380 L 700 410 L 680 430 L 660 410 Z", contacts: 0 },
  ];

  // Update countries with contact counts
  const countriesWithStats = europeanCountries.map((country) => ({
    ...country,
    contacts: countryStats[country.name]?.contacts || 0,
  }));

  const getCountryColor = (contacts: number) => {
    if (contacts === 0) return "hsl(var(--muted))";
    if (contacts < 5) return "hsl(var(--primary) / 0.3)";
    if (contacts < 10) return "hsl(var(--primary) / 0.6)";
    return "hsl(var(--primary))";
  };

  const filteredContacts = selectedCountry
    ? contacts.filter((c) => c.country === selectedCountry)
    : contacts;

  return (
    <div className="w-full space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-3xl font-bebas">SCOUTING NETWORK ACROSS EUROPE</h3>
        <p className="text-muted-foreground">
          Our extensive network of contacts spans across {Object.keys(countryStats).length} countries
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
            {/* Background */}
            <rect width="1000" height="600" fill="hsl(var(--background))" />

            {/* Countries */}
            {countriesWithStats.map((country) => (
              <g key={country.name}>
                <path
                  d={country.path}
                  fill={getCountryColor(country.contacts)}
                  stroke="hsl(var(--border))"
                  strokeWidth="2"
                  className="transition-all duration-200 cursor-pointer hover:opacity-80"
                  onMouseEnter={() => setHoveredCountry(country.name)}
                  onMouseLeave={() => setHoveredCountry(null)}
                  onClick={() => setSelectedCountry(country.name === selectedCountry ? null : country.name)}
                  style={{
                    filter: hoveredCountry === country.name ? "brightness(1.2)" : "none",
                  }}
                />
              </g>
            ))}

            {/* Contact Points */}
            {contacts.map((contact) => {
              if (!contact.latitude || !contact.longitude) return null;
              // Convert lat/lng to SVG coordinates (simplified projection)
              const x = ((contact.longitude + 10) * 30) + 300;
              const y = ((55 - (contact.latitude || 0)) * 15) + 50;
              
              return (
                <circle
                  key={contact.id}
                  cx={x}
                  cy={y}
                  r="4"
                  fill="hsl(var(--primary))"
                  stroke="white"
                  strokeWidth="2"
                  className="cursor-pointer hover:r-6 transition-all"
                  opacity={selectedCountry && contact.country !== selectedCountry ? 0.3 : 1}
                >
                  <title>{contact.name} - {contact.club_name}</title>
                </circle>
              );
            })}
          </svg>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(var(--muted))" }} />
              <span>No contacts</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(var(--primary) / 0.3)" }} />
              <span>1-4 contacts</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(var(--primary) / 0.6)" }} />
              <span>5-9 contacts</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(var(--primary))" }} />
              <span>10+ contacts</span>
            </div>
          </div>
        </div>

        {/* Stats & Details Section */}
        <div className="space-y-4">
          <div className="bg-card rounded-lg p-4 border">
            <h4 className="font-bebas text-xl mb-3">NETWORK STATISTICS</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Contacts</span>
                <span className="font-bold text-xl">{contacts.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Countries</span>
                <span className="font-bold text-xl">{Object.keys(countryStats).length}</span>
              </div>
            </div>
          </div>

          {/* Country List */}
          <div className="bg-card rounded-lg p-4 border max-h-96 overflow-y-auto">
            <h4 className="font-bebas text-xl mb-3">
              {selectedCountry || "ALL COUNTRIES"}
            </h4>
            <div className="space-y-2">
              {Object.entries(countryStats)
                .filter(([country]) => !selectedCountry || country === selectedCountry)
                .sort((a, b) => b[1].contacts - a[1].contacts)
                .map(([country, data]) => (
                  <div
                    key={country}
                    className="flex items-center justify-between p-2 rounded hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => setSelectedCountry(country === selectedCountry ? null : country)}
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={getCountryFlagUrl(country)}
                        alt={country}
                        className="w-6 h-4 object-cover rounded"
                      />
                      <span className="font-medium">{country}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {data.contacts} {data.contacts === 1 ? "contact" : "contacts"}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {selectedCountry && filteredContacts.length > 0 && (
            <div className="bg-card rounded-lg p-4 border">
              <h4 className="font-bebas text-xl mb-3">CONTACTS IN {selectedCountry}</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredContacts.map((contact) => (
                  <div key={contact.id} className="p-2 border rounded text-sm">
                    <div className="font-medium">{contact.name}</div>
                    {contact.club_name && (
                      <div className="text-muted-foreground">{contact.club_name}</div>
                    )}
                    {contact.position && (
                      <div className="text-xs text-muted-foreground">{contact.position}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EuropeScoutingMap;
