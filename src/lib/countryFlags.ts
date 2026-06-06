// Country name to ISO 3166-1 alpha-2 code mapping for flag images
// Includes both country names AND demonym/adjective forms for better matching
export const countryCodeMap: Record<string, string> = {
  // A
  'Albania': 'al', 'Albanian': 'al',
  'Algeria': 'dz', 'Algerian': 'dz',
  'Andorra': 'ad', 'Andorran': 'ad',
  'Angola': 'ao', 'Angolan': 'ao',
  'Argentina': 'ar', 'Argentine': 'ar', 'Argentinian': 'ar', 'Argentinean': 'ar',
  'Armenia': 'am', 'Armenian': 'am',
  'Australia': 'au', 'Australian': 'au',
  'Austria': 'at', 'Austrian': 'at',
  'Azerbaijan': 'az', 'Azerbaijani': 'az',
  
  // B
  'Bahrain': 'bh', 'Bahraini': 'bh',
  'Bangladesh': 'bd', 'Bangladeshi': 'bd',
  'Belarus': 'by', 'Belarusian': 'by',
  'Belgium': 'be', 'Belgian': 'be',
  'Benin': 'bj', 'Beninese': 'bj',
  'Bolivia': 'bo', 'Bolivian': 'bo',
  'Bosnia': 'ba', 'Bosnia and Herzegovina': 'ba', 'Bosnian': 'ba',
  'Brazil': 'br', 'Brazilian': 'br',
  'Bulgaria': 'bg', 'Bulgarian': 'bg',
  'Burkina Faso': 'bf', 'Burkinabe': 'bf',
  'Burundi': 'bi', 'Burundian': 'bi',
  
  // C
  'Cameroon': 'cm', 'Cameroonian': 'cm',
  'Canada': 'ca', 'Canadian': 'ca',
  'Cape Verde': 'cv', 'Cape Verdean': 'cv',
  'Central African Republic': 'cf',
  'Chad': 'td', 'Chadian': 'td',
  'Chile': 'cl', 'Chilean': 'cl',
  'China': 'cn', 'Chinese': 'cn',
  'Colombia': 'co', 'Colombian': 'co',
  'Comoros': 'km', 'Comorian': 'km',
  'Congo': 'cg', 'Congolese': 'cg',
  'Costa Rica': 'cr', 'Costa Rican': 'cr',
  'Croatia': 'hr', 'Croatian': 'hr',
  'Cuba': 'cu', 'Cuban': 'cu',
  'Cyprus': 'cy', 'Cypriot': 'cy',
  'Czech Republic': 'cz', 'Czechia': 'cz', 'Czech': 'cz',
  'Cote d\'Ivoire': 'ci', 'Ivory Coast': 'ci', 'Ivorian': 'ci',
  
  // D
  'Denmark': 'dk', 'Danish': 'dk', 'Dane': 'dk',
  'Dominican Republic': 'do', 'Dominican': 'do',
  'DR Congo': 'cd', 'DRC': 'cd',
  
  // E
  'Ecuador': 'ec', 'Ecuadorian': 'ec',
  'Egypt': 'eg', 'Egyptian': 'eg',
  'El Salvador': 'sv', 'Salvadoran': 'sv',
  'England': 'gb-eng', 'English': 'gb-eng',
  'Equatorial Guinea': 'gq', 'Equatoguinean': 'gq',
  'Eritrea': 'er', 'Eritrean': 'er',
  'Estonia': 'ee', 'Estonian': 'ee',
  'Ethiopia': 'et', 'Ethiopian': 'et',
  
  // F
  'Faroe Islands': 'fo', 'Faroese': 'fo',
  'Finland': 'fi', 'Finnish': 'fi', 'Finn': 'fi',
  'France': 'fr', 'French': 'fr',
  
  // G
  'Gabon': 'ga', 'Gabonese': 'ga',
  'Gambia': 'gm', 'Gambian': 'gm',
  'Georgia': 'ge', 'Georgian': 'ge',
  'Germany': 'de', 'German': 'de',
  'Ghana': 'gh', 'Ghanaian': 'gh',
  'Gibraltar': 'gi', 'Gibraltarian': 'gi',
  'Greece': 'gr', 'Greek': 'gr',
  'Guatemala': 'gt', 'Guatemalan': 'gt',
  'Guinea': 'gn', 'Guinean': 'gn',
  'Guinea-Bissau': 'gw',
  
  // H
  'Haiti': 'ht', 'Haitian': 'ht',
  'Honduras': 'hn', 'Honduran': 'hn',
  'Hungary': 'hu', 'Hungarian': 'hu',
  
  // I
  'Iceland': 'is', 'Icelandic': 'is', 'Icelander': 'is',
  'India': 'in', 'Indian': 'in',
  'Indonesia': 'id', 'Indonesian': 'id',
  'Iran': 'ir', 'Iranian': 'ir', 'Persian': 'ir',
  'Iraq': 'iq', 'Iraqi': 'iq',
  'Ireland': 'ie', 'Irish': 'ie', 'Republic of Ireland': 'ie',
  'Israel': 'il', 'Israeli': 'il',
  'Italy': 'it', 'Italian': 'it',
  
  // J
  'Jamaica': 'jm', 'Jamaican': 'jm',
  'Japan': 'jp', 'Japanese': 'jp',
  'Jordan': 'jo', 'Jordanian': 'jo',
  
  // K
  'Kazakhstan': 'kz', 'Kazakh': 'kz', 'Kazakhstani': 'kz',
  'Kenya': 'ke', 'Kenyan': 'ke',
  'Kosovo': 'xk', 'Kosovar': 'xk',
  'Kuwait': 'kw', 'Kuwaiti': 'kw',
  'Kyrgyzstan': 'kg', 'Kyrgyz': 'kg',
  
  // L
  'Latvia': 'lv', 'Latvian': 'lv',
  'Lebanon': 'lb', 'Lebanese': 'lb',
  'Liberia': 'lr', 'Liberian': 'lr',
  'Libya': 'ly', 'Libyan': 'ly',
  'Liechtenstein': 'li',
  'Lithuania': 'lt', 'Lithuanian': 'lt',
  'Luxembourg': 'lu', 'Luxembourgish': 'lu', 'Luxembourger': 'lu',
  
  // M
  'Madagascar': 'mg', 'Malagasy': 'mg',
  'Malawi': 'mw', 'Malawian': 'mw',
  'Malaysia': 'my', 'Malaysian': 'my',
  'Mali': 'ml', 'Malian': 'ml',
  'Malta': 'mt', 'Maltese': 'mt',
  'Mauritania': 'mr', 'Mauritanian': 'mr',
  'Mauritius': 'mu', 'Mauritian': 'mu',
  'Mexico': 'mx', 'Mexican': 'mx',
  'Moldova': 'md', 'Moldovan': 'md',
  'Monaco': 'mc', 'Monegasque': 'mc',
  'Montenegro': 'me', 'Montenegrin': 'me',
  'Morocco': 'ma', 'Moroccan': 'ma',
  'Mozambique': 'mz', 'Mozambican': 'mz',
  
  // N
  'Namibia': 'na', 'Namibian': 'na',
  'Netherlands': 'nl', 'Dutch': 'nl', 'Netherlander': 'nl',
  'New Zealand': 'nz', 'New Zealander': 'nz', 'Kiwi': 'nz',
  'Nicaragua': 'ni', 'Nicaraguan': 'ni',
  'Niger': 'ne', 'Nigerien': 'ne',
  'Nigeria': 'ng', 'Nigerian': 'ng',
  'North Korea': 'kp', 'North Korean': 'kp',
  'North Macedonia': 'mk', 'North Macedonian': 'mk', 'Macedonian': 'mk',
  'Northern Ireland': 'gb-nir', 'Northern Irish': 'gb-nir',
  'Norway': 'no', 'Norwegian': 'no',
  
  // O
  'Oman': 'om', 'Omani': 'om',
  
  // P
  'Pakistan': 'pk', 'Pakistani': 'pk',
  'Palestine': 'ps', 'Palestinian': 'ps',
  'Panama': 'pa', 'Panamanian': 'pa',
  'Paraguay': 'py', 'Paraguayan': 'py',
  'Peru': 'pe', 'Peruvian': 'pe',
  'Philippines': 'ph', 'Filipino': 'ph', 'Philippine': 'ph',
  'Poland': 'pl', 'Polish': 'pl', 'Pole': 'pl',
  'Portugal': 'pt', 'Portuguese': 'pt',
  
  // Q
  'Qatar': 'qa', 'Qatari': 'qa',
  
  // R
  'Romania': 'ro', 'Romanian': 'ro',
  'Russia': 'ru', 'Russian': 'ru',
  'Rwanda': 'rw', 'Rwandan': 'rw',
  
  // S
  'San Marino': 'sm', 'Sammarinese': 'sm',
  'Saudi Arabia': 'sa', 'Saudi': 'sa', 'Saudi Arabian': 'sa',
  'Scotland': 'gb-sct', 'Scottish': 'gb-sct', 'Scot': 'gb-sct',
  'Senegal': 'sn', 'Senegalese': 'sn',
  'Serbia': 'rs', 'Serbian': 'rs', 'Serb': 'rs',
  'Sierra Leone': 'sl', 'Sierra Leonean': 'sl',
  'Singapore': 'sg', 'Singaporean': 'sg',
  'Slovakia': 'sk', 'Slovak': 'sk', 'Slovakian': 'sk',
  'Slovenia': 'si', 'Slovenian': 'si', 'Slovene': 'si',
  'Somalia': 'so', 'Somali': 'so', 'Somalian': 'so',
  'South Africa': 'za', 'South African': 'za',
  'South Korea': 'kr', 'South Korean': 'kr', 'Korean': 'kr',
  'South Sudan': 'ss', 'South Sudanese': 'ss',
  'Spain': 'es', 'Spanish': 'es', 'Spaniard': 'es',
  'Sri Lanka': 'lk', 'Sri Lankan': 'lk',
  'Sudan': 'sd', 'Sudanese': 'sd',
  'Suriname': 'sr', 'Surinamese': 'sr',
  'Sweden': 'se', 'Swedish': 'se', 'Swede': 'se',
  'Switzerland': 'ch', 'Swiss': 'ch',
  'Syria': 'sy', 'Syrian': 'sy',
  
  // T
  'Taiwan': 'tw', 'Taiwanese': 'tw',
  'Tajikistan': 'tj', 'Tajik': 'tj',
  'Tanzania': 'tz', 'Tanzanian': 'tz',
  'Thailand': 'th', 'Thai': 'th',
  'Togo': 'tg', 'Togolese': 'tg',
  'Trinidad and Tobago': 'tt', 'Trinidadian': 'tt',
  'Tunisia': 'tn', 'Tunisian': 'tn',
  'Turkey': 'tr', 'Turkish': 'tr', 'Turk': 'tr',
  'Turkmenistan': 'tm', 'Turkmen': 'tm',
  
  // U
  'Uganda': 'ug', 'Ugandan': 'ug',
  'Ukraine': 'ua', 'Ukrainian': 'ua',
  'United Arab Emirates': 'ae', 'UAE': 'ae', 'Emirati': 'ae',
  'United Kingdom': 'gb', 'UK': 'gb', 'British': 'gb',
  'United States': 'us', 'USA': 'us', 'American': 'us', 'US': 'us',
  'Uruguay': 'uy', 'Uruguayan': 'uy',
  'Uzbekistan': 'uz', 'Uzbek': 'uz',
  
  // V
  'Venezuela': 've', 'Venezuelan': 've',
  'Vietnam': 'vn', 'Vietnamese': 'vn',
  
  // W
  'Wales': 'gb-wls', 'Welsh': 'gb-wls',
  
  // Y
  'Yemen': 'ye', 'Yemeni': 'ye',
  
  // Z
  'Zambia': 'zm', 'Zambian': 'zm',
  'Zimbabwe': 'zw', 'Zimbabwean': 'zw',
};

export const getCountryCode = (country: string): string | null => {
  if (!country) return null;
  
  // Try exact match first
  let code = countryCodeMap[country];
  
  // If not found, try case-insensitive search
  if (!code) {
    const lowerCountry = country.toLowerCase().trim();
    for (const [key, value] of Object.entries(countryCodeMap)) {
      if (key.toLowerCase() === lowerCountry) {
        code = value;
        break;
      }
    }
  }
  
  // If still not found, try partial match
  if (!code) {
    const lowerCountry = country.toLowerCase().trim();
    for (const [key, value] of Object.entries(countryCodeMap)) {
      if (lowerCountry.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerCountry)) {
        code = value;
        break;
      }
    }
  }
  
  return code || null;
};

export const getCountryFlagUrl = (country: string): string => {
  const code = getCountryCode(country);
  if (!code) return '/flags/un.svg';
  
  // Use local SVG flags from public/flags/
  return `/flags/${code}.svg`;
};

/**
 * Try to infer the country of a league from the league name.
 * Scans country names and demonyms in countryCodeMap for a whole-word match.
 * Examples: "Czech Liga" → cz, "Norwegian Eliteserien" → no, "Liga Portugal 2" → pt.
 * Returns null when no confident match is found (e.g. "Bundesliga" alone).
 */
export const leagueCountryFromName = (league?: string | null): string | null => {
  if (!league) return null;
  const haystack = ` ${league.toLowerCase()} `;
  for (const [name, code] of Object.entries(countryCodeMap)) {
    const n = name.toLowerCase();
    if (n.length < 4) continue; // skip "uk", "us", "uae" etc to avoid false matches
    const re = new RegExp(`(^|[^a-z])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`);
    if (re.test(haystack)) return code;
  }
  return null;
};

export const getLeagueFlagUrl = (league?: string | null): string | null => {
  const code = leagueCountryFromName(league);
  return code ? `/flags/${code}.svg` : null;
};
