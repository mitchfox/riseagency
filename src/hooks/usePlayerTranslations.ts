import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

type LanguageCode = 'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'pl' | 'cs' | 'ru' | 'tr';

interface TranslatedPlayerContent {
  bio: string;
  position: string;
}

interface UsePlayerTranslationsOptions {
  bio: string;
  position: string;
  playerId?: string;
}

const positionTranslations: Record<string, Record<string, string>> = {
  'Striker': {
    es: 'Delantero',
    pt: 'Atacante',
    fr: 'Attaquant',
    de: 'Stürmer',
    it: 'Attaccante',
    pl: 'Napastnik',
    cs: 'Útočník',
    ru: 'Нападающий',
    tr: 'Forvet',
  },
  'Forward': {
    es: 'Delantero',
    pt: 'Atacante',
    fr: 'Attaquant',
    de: 'Stürmer',
    it: 'Attaccante',
    pl: 'Napastnik',
    cs: 'Útočník',
    ru: 'Нападающий',
    tr: 'Forvet',
  },
  'Midfielder': {
    es: 'Centrocampista',
    pt: 'Meio-campista',
    fr: 'Milieu de terrain',
    de: 'Mittelfeldspieler',
    it: 'Centrocampista',
    pl: 'Pomocnik',
    cs: 'Záložník',
    ru: 'Полузащитник',
    tr: 'Orta saha',
  },
  'Defender': {
    es: 'Defensor',
    pt: 'Defensor',
    fr: 'Défenseur',
    de: 'Verteidiger',
    it: 'Difensore',
    pl: 'Obrońca',
    cs: 'Obránce',
    ru: 'Защитник',
    tr: 'Defans',
  },
  'Goalkeeper': {
    es: 'Portero',
    pt: 'Goleiro',
    fr: 'Gardien de but',
    de: 'Torwart',
    it: 'Portiere',
    pl: 'Bramkarz',
    cs: 'Brankář',
    ru: 'Вратарь',
    tr: 'Kaleci',
  },
  'Winger': {
    es: 'Extremo',
    pt: 'Ponta',
    fr: 'Ailier',
    de: 'Flügelspieler',
    it: 'Ala',
    pl: 'Skrzydłowy',
    cs: 'Křídelní hráč',
    ru: 'Вингер',
    tr: 'Kanat',
  },
  'Centre-Back': {
    es: 'Defensa central',
    pt: 'Zagueiro',
    fr: 'Défenseur central',
    de: 'Innenverteidiger',
    it: 'Difensore centrale',
    pl: 'Środkowy obrońca',
    cs: 'Střední obránce',
    ru: 'Центральный защитник',
    tr: 'Stoper',
  },
  'Full-Back': {
    es: 'Lateral',
    pt: 'Lateral',
    fr: 'Arrière latéral',
    de: 'Außenverteidiger',
    it: 'Terzino',
    pl: 'Boczny obrońca',
    cs: 'Krajní obránce',
    ru: 'Крайний защитник',
    tr: 'Bek',
  },
  'Attacking Midfielder': {
    es: 'Mediapunta',
    pt: 'Meia atacante',
    fr: 'Milieu offensif',
    de: 'Offensiver Mittelfeldspieler',
    it: 'Trequartista',
    pl: 'Ofensywny pomocnik',
    cs: 'Útočný záložník',
    ru: 'Атакующий полузащитник',
    tr: 'Ofansif orta saha',
  },
  'Defensive Midfielder': {
    es: 'Pivote',
    pt: 'Volante',
    fr: 'Milieu défensif',
    de: 'Defensiver Mittelfeldspieler',
    it: 'Mediano',
    pl: 'Defensywny pomocnik',
    cs: 'Defenzivní záložník',
    ru: 'Опорный полузащитник',
    tr: 'Defansif orta saha',
  },
};

export function usePlayerTranslations({ bio, position, playerId }: UsePlayerTranslationsOptions) {
  const { language } = useLanguage();
  const [translatedBio, setTranslatedBio] = useState<string>(bio);
  const [isTranslating, setIsTranslating] = useState(false);

  // Translate position immediately using useMemo for proper reactivity
  const translatedPosition = useMemo(() => {
    if (language === 'en') return position;
    return positionTranslations[position]?.[language] || position;
  }, [language, position]);

  useEffect(() => {
    // Reset to original when language is English
    if (language === 'en') {
      setTranslatedBio(bio);
      return;
    }

    const translateBioText = async () => {
      if (!bio || bio.trim() === '') {
        setTranslatedBio('');
        return;
      }

      // Check cache first
      const cacheKey = `player_bio_${playerId}_${language}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.bio) {
            setTranslatedBio(parsed.bio);
            return;
          }
        } catch {
          // Invalid cache, continue to translate
        }
      }

      setIsTranslating(true);
      try {
        const { data, error } = await supabase.functions.invoke('ai-translate', {
          body: { text: bio }
        });

        if (error) throw error;

        const langMap: Record<string, string> = {
          'es': 'spanish',
          'pt': 'portuguese',
          'fr': 'french',
          'de': 'german',
          'it': 'italian',
          'pl': 'polish',
          'cs': 'czech',
          'ru': 'russian',
          'tr': 'turkish'
        };
        
        const translationKey = langMap[language];
        const translated = data?.[translationKey] || bio;

        // Cache the translation
        localStorage.setItem(cacheKey, JSON.stringify({ bio: translated }));

        setTranslatedBio(translated);
      } catch (err) {
        console.error('Player bio translation error:', err);
        setTranslatedBio(bio);
      } finally {
        setIsTranslating(false);
      }
    };

    translateBioText();
  }, [bio, language, playerId]);

  // Use useMemo to ensure the returned object updates when language changes
  const translatedContent = useMemo(() => ({
    bio: translatedBio,
    position: translatedPosition,
  }), [translatedBio, translatedPosition]);

  return { 
    translatedContent, 
    isTranslating 
  };
}

// Static label translations for player profile page
export const playerProfileLabels: Record<string, Record<string, string>> = {
  biography: {
    en: 'Biography',
    es: 'Biografía',
    pt: 'Biografia',
    fr: 'Biographie',
    de: 'Biografie',
    it: 'Biografia',
    pl: 'Biografia',
    cs: 'Životopis',
    ru: 'Биография',
    tr: 'Biyografi',
  },
  readMore: {
    en: 'Read More',
    es: 'Leer más',
    pt: 'Ler mais',
    fr: 'Lire plus',
    de: 'Mehr lesen',
    it: 'Leggi di più',
    pl: 'Czytaj więcej',
    cs: 'Číst více',
    ru: 'Читать далее',
    tr: 'Daha fazla oku',
  },
  externalLinks: {
    en: 'External Links',
    es: 'Enlaces externos',
    pt: 'Links externos',
    fr: 'Liens externes',
    de: 'Externe Links',
    it: 'Link esterni',
    pl: 'Linki zewnętrzne',
    cs: 'Externí odkazy',
    ru: 'Внешние ссылки',
    tr: 'Dış bağlantılar',
  },
  inNumbers: {
    en: 'In Numbers',
    es: 'En números',
    pt: 'Em números',
    fr: 'En chiffres',
    de: 'In Zahlen',
    it: 'In numeri',
    pl: 'W liczbach',
    cs: 'V číslech',
    ru: 'В цифрах',
    tr: 'Rakamlarla',
  },
  seasonStats: {
    en: 'Season Stats',
    es: 'Estadísticas de temporada',
    pt: 'Estatísticas da temporada',
    fr: 'Statistiques de saison',
    de: 'Saisonstatistiken',
    it: 'Statistiche stagionali',
    pl: 'Statystyki sezonu',
    cs: 'Statistiky sezóny',
    ru: 'Статистика сезона',
    tr: 'Sezon istatistikleri',
  },
  strengths: {
    en: 'Strengths',
    es: 'Fortalezas',
    pt: 'Pontos fortes',
    fr: 'Points forts',
    de: 'Stärken',
    it: 'Punti di forza',
    pl: 'Mocne strony',
    cs: 'Silné stránky',
    ru: 'Сильные стороны',
    tr: 'Güçlü yönler',
  },
  tacticalFormations: {
    en: 'Tactical Formations',
    es: 'Formaciones tácticas',
    pt: 'Formações táticas',
    fr: 'Formations tactiques',
    de: 'Taktische Formationen',
    it: 'Formazioni tattiche',
    pl: 'Formacje taktyczne',
    cs: 'Taktické formace',
    ru: 'Тактические построения',
    tr: 'Taktik dizilişler',
  },
  schemeHistory: {
    en: 'Scheme History',
    es: 'Historial de esquemas',
    pt: 'Histórico de esquemas',
    fr: 'Historique des schémas',
    de: 'Schemenhistorie',
    it: 'Cronologia schemi',
    pl: 'Historia schematów',
    cs: 'Historie schémat',
    ru: 'История схем',
    tr: 'Şema geçmişi',
  },
  performanceReports: {
    en: 'Performance Reports',
    es: 'Informes de rendimiento',
    pt: 'Relatórios de desempenho',
    fr: 'Rapports de performance',
    de: 'Leistungsberichte',
    it: 'Report prestazioni',
    pl: 'Raporty wydajności',
    cs: 'Výkonnostní zprávy',
    ru: 'Отчёты о результатах',
    tr: 'Performans raporları',
  },
  recentMatches: {
    en: 'Recent Matches',
    es: 'Partidos recientes',
    pt: 'Partidas recentes',
    fr: 'Matchs récents',
    de: 'Letzte Spiele',
    it: 'Partite recenti',
    pl: 'Ostatnie mecze',
    cs: 'Nedávné zápasy',
    ru: 'Последние матчи',
    tr: 'Son maçlar',
  },
  backToStars: {
    en: 'Back to Stars',
    es: 'Volver a estrellas',
    pt: 'Voltar para estrelas',
    fr: 'Retour aux étoiles',
    de: 'Zurück zu den Stars',
    it: 'Torna alle stelle',
    pl: 'Powrót do gwiazd',
    cs: 'Zpět k hvězdám',
    ru: 'Назад к звёздам',
    tr: 'Yıldızlara dön',
  },
  enquirePlayer: {
    en: 'Enquire About This Player',
    es: 'Consultar sobre este jugador',
    pt: 'Perguntar sobre este jogador',
    fr: 'Se renseigner sur ce joueur',
    de: 'Über diesen Spieler anfragen',
    it: 'Informarsi su questo giocatore',
    pl: 'Zapytaj o tego zawodnika',
    cs: 'Dotaz na tohoto hráče',
    ru: 'Узнать об этом игроке',
    tr: 'Bu oyuncu hakkında bilgi al',
  },
  loadingPlayer: {
    en: 'Loading player...',
    es: 'Cargando jugador...',
    pt: 'Carregando jogador...',
    fr: 'Chargement du joueur...',
    de: 'Spieler wird geladen...',
    it: 'Caricamento giocatore...',
    pl: 'Ładowanie zawodnika...',
    cs: 'Načítání hráče...',
    ru: 'Загрузка игрока...',
    tr: 'Oyuncu yükleniyor...',
  },
  playerNotFound: {
    en: 'Player Not Found',
    es: 'Jugador no encontrado',
    pt: 'Jogador não encontrado',
    fr: 'Joueur non trouvé',
    de: 'Spieler nicht gefunden',
    it: 'Giocatore non trovato',
    pl: 'Zawodnik nie znaleziony',
    cs: 'Hráč nenalezen',
    ru: 'Игрок не найден',
    tr: 'Oyuncu bulunamadı',
  },
  backToDirectory: {
    en: 'Back to Directory',
    es: 'Volver al directorio',
    pt: 'Voltar ao diretório',
    fr: 'Retour au répertoire',
    de: 'Zurück zum Verzeichnis',
    it: 'Torna alla directory',
    pl: 'Powrót do katalogu',
    cs: 'Zpět do adresáře',
    ru: 'Назад к каталогу',
    tr: 'Dizine dön',
  },
  highlights: {
    en: 'Highlights',
    es: 'Destacados',
    pt: 'Destaques',
    fr: 'Points forts',
    de: 'Highlights',
    it: 'Highlights',
    pl: 'Najważniejsze momenty',
    cs: 'Sestřihy',
    ru: 'Лучшие моменты',
    tr: 'Öne çıkanlar',
  },
  comingSoon: {
    en: 'Coming Soon',
    es: 'Próximamente',
    pt: 'Em breve',
    fr: 'Bientôt disponible',
    de: 'Demnächst',
    it: 'Prossimamente',
    pl: 'Wkrótce',
    cs: 'Již brzy',
    ru: 'Скоро',
    tr: 'Yakında',
  },
  strengthsPlayStyle: {
    en: 'Strengths & Play Style',
    es: 'Fortalezas y estilo de juego',
    pt: 'Pontos fortes e estilo de jogo',
    fr: 'Points forts et style de jeu',
    de: 'Stärken & Spielstil',
    it: 'Punti di forza e stile di gioco',
    pl: 'Mocne strony i styl gry',
    cs: 'Silné stránky a styl hry',
    ru: 'Сильные стороны и стиль игры',
    tr: 'Güçlü yönler ve oyun tarzı',
  },
  getInTouch: {
    en: 'Get In Touch',
    es: 'Ponte en contacto',
    pt: 'Entre em contato',
    fr: 'Contactez-nous',
    de: 'Kontakt aufnehmen',
    it: 'Contattaci',
    pl: 'Skontaktuj się',
    cs: 'Kontaktujte nás',
    ru: 'Свяжитесь с нами',
    tr: 'İletişime geçin',
  },
  clubsAgents: {
    en: 'Clubs & Agents',
    es: 'Clubes y agentes',
    pt: 'Clubes e agentes',
    fr: 'Clubs et agents',
    de: 'Vereine & Agenten',
    it: 'Club e agenti',
    pl: 'Kluby i agenci',
    cs: 'Kluby a agenti',
    ru: 'Клубы и агенты',
    tr: 'Kulüpler ve ajanlar',
  },
  interestedInSigning: {
    en: "Interested in signing this player? Let's discuss opportunities.",
    es: '¿Interesado en fichar a este jugador? Hablemos de oportunidades.',
    pt: 'Interessado em contratar este jogador? Vamos discutir oportunidades.',
    fr: 'Intéressé par ce joueur? Discutons des opportunités.',
    de: 'Interesse an diesem Spieler? Lassen Sie uns über Möglichkeiten sprechen.',
    it: 'Interessato a ingaggiare questo giocatore? Parliamo delle opportunità.',
    pl: 'Zainteresowany podpisaniem umowy z tym zawodnikiem? Porozmawiajmy o możliwościach.',
    cs: 'Máte zájem o tohoto hráče? Pojďme probrat možnosti.',
    ru: 'Заинтересованы в этом игроке? Давайте обсудим возможности.',
    tr: 'Bu oyuncuyu transfer etmek ister misiniz? Fırsatları tartışalım.',
  },
  media: {
    en: 'Media',
    es: 'Medios',
    pt: 'Mídia',
    fr: 'Médias',
    de: 'Medien',
    it: 'Media',
    pl: 'Media',
    cs: 'Média',
    ru: 'СМИ',
    tr: 'Medya',
  },
  pressInquiries: {
    en: 'Press inquiries and interview requests welcome.',
    es: 'Consultas de prensa y solicitudes de entrevistas son bienvenidas.',
    pt: 'Consultas de imprensa e pedidos de entrevista são bem-vindos.',
    fr: 'Les demandes de presse et les demandes d\'interview sont les bienvenues.',
    de: 'Presseanfragen und Interviewanfragen willkommen.',
    it: 'Richieste stampa e interviste benvenute.',
    pl: 'Zapytania prasowe i prośby o wywiady mile widziane.',
    cs: 'Dotazy tisku a žádosti o rozhovory vítány.',
    ru: 'Приветствуются запросы от прессы и заявки на интервью.',
    tr: 'Basın soruları ve röportaj talepleri memnuniyetle karşılanır.',
  },
  contact: {
    en: 'Contact',
    es: 'Contactar',
    pt: 'Contato',
    fr: 'Contacter',
    de: 'Kontakt',
    it: 'Contatta',
    pl: 'Kontakt',
    cs: 'Kontakt',
    ru: 'Связаться',
    tr: 'İletişim',
  },
  sponsors: {
    en: 'Sponsors',
    es: 'Patrocinadores',
    pt: 'Patrocinadores',
    fr: 'Sponsors',
    de: 'Sponsoren',
    it: 'Sponsor',
    pl: 'Sponsorzy',
    cs: 'Sponzoři',
    ru: 'Спонсоры',
    tr: 'Sponsorlar',
  },
  sponsorOpportunities: {
    en: 'Explore partnership and sponsorship opportunities.',
    es: 'Explore oportunidades de asociación y patrocinio.',
    pt: 'Explore oportunidades de parceria e patrocínio.',
    fr: 'Explorez les opportunités de partenariat et de sponsoring.',
    de: 'Erkunden Sie Partnerschafts- und Sponsoring-Möglichkeiten.',
    it: 'Esplora opportunità di partnership e sponsorizzazione.',
    pl: 'Poznaj możliwości partnerstwa i sponsoringu.',
    cs: 'Prozkoumejte možnosti partnerství a sponzorství.',
    ru: 'Изучите возможности партнёрства и спонсорства.',
    tr: 'Ortaklık ve sponsorluk fırsatlarını keşfedin.',
  },
  reachOut: {
    en: 'Reach Out',
    es: 'Contactar',
    pt: 'Entrar em contato',
    fr: 'Nous contacter',
    de: 'Kontaktieren',
    it: 'Contattaci',
    pl: 'Skontaktuj się',
    cs: 'Ozvěte se',
    ru: 'Связаться',
    tr: 'İletişime geçin',
  },
  readActionReport: {
    en: 'Read Action Report',
    es: 'Leer informe de acción',
    pt: 'Ler relatório de ação',
    fr: 'Lire le rapport d\'action',
    de: 'Aktionsbericht lesen',
    it: 'Leggi il rapporto d\'azione',
    pl: 'Przeczytaj raport akcji',
    cs: 'Přečíst zprávu o akci',
    ru: 'Читать отчёт о действиях',
    tr: 'Eylem raporunu oku',
  },
  watchFullMatch: {
    en: 'Watch Full Match',
    es: 'Ver partido completo',
    pt: 'Assistir partida completa',
    fr: 'Regarder le match complet',
    de: 'Vollständiges Spiel ansehen',
    it: 'Guarda la partita completa',
    pl: 'Obejrzyj cały mecz',
    cs: 'Sledovat celý zápas',
    ru: 'Смотреть полный матч',
    tr: 'Tüm maçı izle',
  },
  highlightedPerformance: {
    en: 'Highlighted Performance',
    es: 'Rendimiento destacado',
    pt: 'Desempenho destacado',
    fr: 'Performance mise en avant',
    de: 'Hervorgehobene Leistung',
    it: 'Prestazione in evidenza',
    pl: 'Wyróżniony występ',
    cs: 'Zvýrazněný výkon',
    ru: 'Выделенное выступление',
    tr: 'Öne çıkan performans',
  },
  performanceMetrics: {
    en: 'Performance Metrics',
    es: 'Métricas de rendimiento',
    pt: 'Métricas de desempenho',
    fr: 'Métriques de performance',
    de: 'Leistungskennzahlen',
    it: 'Metriche di prestazione',
    pl: 'Wskaźniki wydajności',
    cs: 'Výkonnostní metriky',
    ru: 'Показатели производительности',
    tr: 'Performans metrikleri',
  },
};

export function usePlayerProfileLabel(key: keyof typeof playerProfileLabels): string {
  const { language } = useLanguage();
  
  // Memoize to ensure reactivity when language changes
  const label = useMemo(() => {
    const translations = playerProfileLabels[key];
    if (!translations) {
      return key;
    }
    const langKey = language as LanguageCode;
    return translations[langKey] || translations.en || key;
  }, [key, language]);
  
  return label;
}
