// Localized route paths for each language
// Format: { englishPath: { languageCode: localizedPath } }

export const routeTranslations: Record<string, Record<string, string>> = {
  '/players': {
    en: '/players',
    es: '/jugadoras',
    pt: '/jogadoras',
    fr: '/joueurs',
    de: '/spielerinnen',
    it: '/giocatrici',
    pl: '/zawodniczki',
    cs: '/hracky',
    ru: '/igroki',
    tr: '/oyuncular',
  },
  '/playersmore': {
    en: '/playersmore',
    es: '/jugadoras',
    pt: '/jogadoras',
    fr: '/joueurs',
    de: '/spielerinnen',
    it: '/giocatrici',
    pl: '/zawodniczki',
    cs: '/hracky',
    ru: '/igroki',
    tr: '/oyuncular',
  },
  '/stars': {
    en: '/stars',
    es: '/estrellas',
    pt: '/estrelas',
    fr: '/etoiles',
    de: '/sterne',
    it: '/stelle',
    pl: '/gwiazdy',
    cs: '/hvezdy',
    ru: '/zvezdy',
    tr: '/yildizlar',
  },
  '/clubs': {
    en: '/clubs',
    es: '/clubes',
    pt: '/clubes',
    fr: '/clubs',
    de: '/vereine',
    it: '/club',
    pl: '/kluby',
    cs: '/kluby',
    ru: '/kluby',
    tr: '/kulupler',
  },
  '/scouts': {
    en: '/scouts',
    es: '/ojeadores',
    pt: '/olheiros',
    fr: '/recruteurs',
    de: '/scouts',
    it: '/osservatori',
    pl: '/skauci',
    cs: '/skauti',
    ru: '/skauty',
    tr: '/skautlar',
  },
  '/coaches': {
    en: '/coaches',
    es: '/entrenadores',
    pt: '/treinadores',
    fr: '/entraineurs',
    de: '/trainer',
    it: '/allenatori',
    pl: '/trenerzy',
    cs: '/treneri',
    ru: '/trenery',
    tr: '/antrenorler',
  },
  '/agents': {
    en: '/agents',
    es: '/agentes',
    pt: '/agentes',
    fr: '/agents',
    de: '/agenten',
    it: '/agenti',
    pl: '/agenci',
    cs: '/agenti',
    ru: '/agenty',
    tr: '/menajerler',
  },
  '/about': {
    en: '/about',
    es: '/nosotros',
    pt: '/sobre',
    fr: '/a-propos',
    de: '/ueber-uns',
    it: '/chi-siamo',
    pl: '/o-nas',
    cs: '/o-nas',
    ru: '/o-nas',
    tr: '/hakkimizda',
  },
  '/news': {
    en: '/news',
    es: '/noticias',
    pt: '/noticias',
    fr: '/actualites',
    de: '/nachrichten',
    it: '/notizie',
    pl: '/aktualnosci',
    cs: '/novinky',
    ru: '/novosti',
    tr: '/haberler',
  },
  '/contact': {
    en: '/contact',
    es: '/contacto',
    pt: '/contato',
    fr: '/contact',
    de: '/kontakt',
    it: '/contatti',
    pl: '/kontakt',
    cs: '/kontakt',
    ru: '/kontakty',
    tr: '/iletisim',
  },
  '/performance': {
    en: '/performance',
    es: '/rendimiento',
    pt: '/desempenho',
    fr: '/performance',
    de: '/leistung',
    it: '/prestazioni',
    pl: '/wydajnosc',
    cs: '/vykon',
    ru: '/rezultaty',
    tr: '/performans',
  },
  '/between-the-lines': {
    en: '/between-the-lines',
    es: '/entre-lineas',
    pt: '/entre-linhas',
    fr: '/entre-les-lignes',
    de: '/zwischen-den-zeilen',
    it: '/tra-le-righe',
    pl: '/miedzy-wierszami',
    cs: '/mezi-radky',
    ru: '/mezhdu-strok',
    tr: '/satirlar-arasi',
  },
  '/login': {
    en: '/login',
    es: '/acceso',
    pt: '/entrar',
    fr: '/connexion',
    de: '/anmelden',
    it: '/accedi',
    pl: '/logowanie',
    cs: '/prihlaseni',
    ru: '/vhod',
    tr: '/giris',
  },
  '/portal': {
    en: '/portal',
    es: '/portal',
    pt: '/portal',
    fr: '/portail',
    de: '/portal',
    it: '/portale',
    pl: '/portal',
    cs: '/portal',
    ru: '/portal',
    tr: '/portal',
  },
};

// Create reverse mapping: localized path -> english path
export const reverseRouteMap: Record<string, string> = {};
Object.entries(routeTranslations).forEach(([englishPath, translations]) => {
  Object.values(translations).forEach((localizedPath) => {
    reverseRouteMap[localizedPath] = englishPath;
  });
});

// Get localized path for a given english path and language
export function getLocalizedPath(englishPath: string, language: string): string {
  // Handle dynamic routes like /stars/:id
  const basePath = englishPath.split('/').slice(0, 2).join('/');
  const rest = englishPath.split('/').slice(2).join('/');
  
  const translations = routeTranslations[basePath];
  if (translations && translations[language]) {
    return rest ? `${translations[language]}/${rest}` : translations[language];
  }
  
  return englishPath;
}

// Get english path from any localized path
export function getEnglishPath(localizedPath: string): string {
  // Handle dynamic routes
  const basePath = '/' + localizedPath.split('/').filter(Boolean)[0];
  const rest = localizedPath.split('/').slice(2).join('/');
  
  const englishPath = reverseRouteMap[basePath];
  if (englishPath) {
    return rest ? `${englishPath}/${rest}` : englishPath;
  }
  
  return localizedPath;
}

// Get all possible paths for a route (for router config)
export function getAllPathVariants(englishPath: string): string[] {
  const translations = routeTranslations[englishPath];
  if (!translations) return [englishPath];
  
  return [...new Set(Object.values(translations))];
}
