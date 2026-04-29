/**
 * Translation strings used by the public-facing example viewers
 * (`/analysis/:id` and `/performance-report/:slug`) and by portal UI
 * labels that need to render in the visitor's chosen language even
 * when no per-record translated content is stored on the analysis
 * itself.
 *
 * All keys default to English; missing locales transparently fall
 * back to the English value via {@link et}. This is intentional so
 * adding a new language only requires filling in the keys you have
 * translations for.
 */

import { normalizePortalLanguage } from "@/lib/portalTranslations";

type Lang = "en" | "es" | "pt" | "fr" | "de" | "it" | "pl" | "cs" | "ru" | "tr" | "hr" | "no";

const dict: Record<string, Partial<Record<Lang, string>>> = {
  loading_analysis: {
    en: "Loading Analysis", es: "Cargando análisis", pt: "A carregar análise",
    fr: "Chargement de l'analyse", de: "Analyse wird geladen", it: "Caricamento analisi",
    pl: "Ładowanie analizy", cs: "Načítání analýzy", ru: "Загрузка анализа",
    tr: "Analiz yükleniyor", hr: "Učitavanje analize", no: "Laster analyse",
  },
  analysis_not_found: {
    en: "Analysis not found", es: "Análisis no encontrado", pt: "Análise não encontrada",
    fr: "Analyse introuvable", de: "Analyse nicht gefunden", it: "Analisi non trovata",
    pl: "Nie znaleziono analizy", cs: "Analýza nenalezena", ru: "Анализ не найден",
    tr: "Analiz bulunamadı", hr: "Analiza nije pronađena", no: "Fant ikke analysen",
  },
  go_back: {
    en: "Go Back", es: "Volver", pt: "Voltar", fr: "Retour", de: "Zurück", it: "Indietro",
    pl: "Wstecz", cs: "Zpět", ru: "Назад", tr: "Geri", hr: "Natrag", no: "Tilbake",
  },
  watch_video: {
    en: "Watch Video", es: "Ver vídeo", pt: "Ver vídeo", fr: "Voir la vidéo",
    de: "Video ansehen", it: "Guarda video", pl: "Zobacz wideo", cs: "Přehrát video",
    ru: "Смотреть видео", tr: "Videoyu izle", hr: "Pogledaj video", no: "Se video",
  },
  jump_to_section: {
    en: "Jump to Section", es: "Ir a sección", pt: "Saltar para secção",
    fr: "Aller à la section", de: "Zum Abschnitt springen", it: "Vai alla sezione",
    pl: "Przejdź do sekcji", cs: "Přejít na sekci", ru: "Перейти к разделу",
    tr: "Bölüme git", hr: "Idi na odjeljak", no: "Hopp til seksjon",
  },
  key_info: {
    en: "Key Info", es: "Información clave", pt: "Informação-chave", fr: "Informations clés",
    de: "Wichtige Infos", it: "Info chiave", pl: "Kluczowe informacje", cs: "Klíčové informace",
    ru: "Ключевая информация", tr: "Temel bilgiler", hr: "Ključne informacije", no: "Nøkkelinfo",
  },
  analysis_points: {
    en: "Analysis Points", es: "Puntos de análisis", pt: "Pontos de análise",
    fr: "Points d'analyse", de: "Analysepunkte", it: "Punti di analisi",
    pl: "Punkty analizy", cs: "Body analýzy", ru: "Пункты анализа",
    tr: "Analiz noktaları", hr: "Točke analize", no: "Analysepunkter",
  },
  overview: {
    en: "Overview", es: "Resumen", pt: "Resumo", fr: "Aperçu", de: "Überblick",
    it: "Panoramica", pl: "Przegląd", cs: "Přehled", ru: "Обзор", tr: "Genel bakış",
    hr: "Pregled", no: "Oversikt",
  },
  opposition_strengths: {
    en: "Opposition Strengths", es: "Fortalezas del rival", pt: "Pontos fortes do adversário",
    fr: "Forces de l'adversaire", de: "Stärken des Gegners", it: "Punti di forza dell'avversario",
    pl: "Mocne strony rywala", cs: "Silné stránky soupeře", ru: "Сильные стороны соперника",
    tr: "Rakibin güçlü yönleri", hr: "Snage protivnika", no: "Motstanderens styrker",
  },
  opposition_weaknesses: {
    en: "Opposition Weaknesses", es: "Debilidades del rival", pt: "Pontos fracos do adversário",
    fr: "Faiblesses de l'adversaire", de: "Schwächen des Gegners", it: "Punti deboli dell'avversario",
    pl: "Słabe strony rywala", cs: "Slabé stránky soupeře", ru: "Слабые стороны соперника",
    tr: "Rakibin zayıf yönleri", hr: "Slabosti protivnika", no: "Motstanderens svakheter",
  },
  potential_matchups: {
    en: "Potential Matchup(s)", es: "Posibles enfrentamientos", pt: "Possíveis confrontos",
    fr: "Confrontations potentielles", de: "Mögliche Duelle", it: "Possibili duelli",
    pl: "Możliwe pojedynki", cs: "Možná střetnutí", ru: "Возможные дуэли",
    tr: "Olası eşleşmeler", hr: "Mogući dueli", no: "Mulige dueller",
  },
  tactical_scheme: {
    en: "Tactical Scheme", es: "Esquema táctico", pt: "Esquema tático",
    fr: "Schéma tactique", de: "Taktisches Schema", it: "Schema tattico",
    pl: "Schemat taktyczny", cs: "Taktické schéma", ru: "Тактическая схема",
    tr: "Taktik şema", hr: "Taktička shema", no: "Taktisk skjema",
  },
  scheme: {
    en: "Scheme", es: "Esquema", pt: "Esquema", fr: "Schéma", de: "Schema", it: "Schema",
    pl: "Schemat", cs: "Schéma", ru: "Схема", tr: "Şema", hr: "Shema", no: "Skjema",
  },
  strengths_improvements: {
    en: "Strengths & Areas for Improvement", es: "Fortalezas y áreas de mejora",
    pt: "Pontos fortes e áreas a melhorar", fr: "Points forts et axes d'amélioration",
    de: "Stärken & Verbesserungsbereiche", it: "Punti di forza e aree di miglioramento",
    pl: "Mocne strony i obszary do poprawy", cs: "Silné stránky a oblasti ke zlepšení",
    ru: "Сильные стороны и зоны роста", tr: "Güçlü yönler ve gelişim alanları",
    hr: "Snage i područja za poboljšanje", no: "Styrker og forbedringsområder",
  },
  strengths: {
    en: "Strengths", es: "Fortalezas", pt: "Pontos fortes", fr: "Points forts",
    de: "Stärken", it: "Punti di forza", pl: "Mocne strony", cs: "Silné stránky",
    ru: "Сильные стороны", tr: "Güçlü yönler", hr: "Snage", no: "Styrker",
  },
  areas_for_consistency: {
    en: "Areas for Consistency", es: "Áreas de consistencia", pt: "Áreas para consistência",
    fr: "Zones de constance", de: "Bereiche für Konstanz", it: "Aree di coerenza",
    pl: "Obszary do utrzymania", cs: "Oblasti konzistence", ru: "Зоны стабильности",
    tr: "Süreklilik alanları", hr: "Područja dosljednosti", no: "Områder for konsistens",
  },
  areas_for_improvement: {
    en: "Areas for Improvement", es: "Áreas de mejora", pt: "Áreas a melhorar",
    fr: "Axes d'amélioration", de: "Verbesserungsbereiche", it: "Aree di miglioramento",
    pl: "Obszary do poprawy", cs: "Oblasti ke zlepšení", ru: "Зоны роста",
    tr: "Gelişim alanları", hr: "Područja za poboljšanje", no: "Forbedringsområder",
  },
  back_to_top: {
    en: "Back to Top", es: "Volver arriba", pt: "Voltar ao topo", fr: "Retour en haut",
    de: "Nach oben", it: "Torna su", pl: "Do góry", cs: "Zpět nahoru", ru: "Наверх",
    tr: "Yukarı dön", hr: "Natrag na vrh", no: "Til toppen",
  },
  concept: {
    en: "Concept", es: "Concepto", pt: "Conceito", fr: "Concept", de: "Konzept",
    it: "Concetto", pl: "Koncepcja", cs: "Koncept", ru: "Концепция", tr: "Kavram",
    hr: "Koncept", no: "Konsept",
  },
  explanation: {
    en: "Explanation", es: "Explicación", pt: "Explicação", fr: "Explication",
    de: "Erklärung", it: "Spiegazione", pl: "Wyjaśnienie", cs: "Vysvětlení",
    ru: "Объяснение", tr: "Açıklama", hr: "Objašnjenje", no: "Forklaring",
  },
  concept_analysis: {
    en: "Concept Analysis", es: "Análisis de concepto", pt: "Análise de conceito",
    fr: "Analyse de concept", de: "Konzeptanalyse", it: "Analisi del concetto",
    pl: "Analiza koncepcji", cs: "Analýza konceptu", ru: "Анализ концепции",
    tr: "Kavram analizi", hr: "Analiza koncepta", no: "Konseptanalyse",
  },
  failed_to_load_analysis: {
    en: "Failed to load analysis", es: "No se pudo cargar el análisis",
    pt: "Falha ao carregar a análise", fr: "Échec du chargement de l'analyse",
    de: "Analyse konnte nicht geladen werden", it: "Impossibile caricare l'analisi",
    pl: "Nie udało się załadować analizy", cs: "Načtení analýzy selhalo",
    ru: "Не удалось загрузить анализ", tr: "Analiz yüklenemedi",
    hr: "Učitavanje analize nije uspjelo", no: "Kunne ikke laste analysen",
  },
};

/** Common football action labels used in performance reports. Keyed by
 *  the canonical English Title Case version. Multi-token labels (e.g.
 *  "Triple Threat, Shot") are split on commas and translated piecewise
 *  via {@link translateActionType}. */
const actionDict: Record<string, Partial<Record<Lang, string>>> = {
  "Applied Pressure": {
    es: "Presión aplicada", pt: "Pressão aplicada", fr: "Pression appliquée",
    de: "Druck ausgeübt", it: "Pressione applicata", pl: "Wywarty pressing",
    cs: "Vyvinutý tlak", ru: "Прессинг", tr: "Baskı uygulandı",
    hr: "Pritisak", no: "Press utøvd",
  },
  "Loose Ball": {
    es: "Balón suelto", pt: "Bola perdida", fr: "Ballon libre", de: "Loser Ball",
    it: "Palla vagante", pl: "Luźna piłka", cs: "Volný míč", ru: "Свободный мяч",
    tr: "Serbest top", hr: "Slobodna lopta", no: "Løs ball",
  },
  "Pass": {
    es: "Pase", pt: "Passe", fr: "Passe", de: "Pass", it: "Passaggio",
    pl: "Podanie", cs: "Přihrávka", ru: "Передача", tr: "Pas", hr: "Dodavanje", no: "Pasning",
  },
  "Hold-Up Play": {
    es: "Juego de espaldas", pt: "Jogo de costas", fr: "Jeu en pivot",
    de: "Wandspiel", it: "Gioco di sponda", pl: "Gra plecami do bramki",
    cs: "Hra zády", ru: "Игра спиной к воротам", tr: "Sırtı dönük oyun",
    hr: "Igra leđima", no: "Holdspill",
  },
  "Offensive Positioning": {
    es: "Posicionamiento ofensivo", pt: "Posicionamento ofensivo",
    fr: "Placement offensif", de: "Offensives Stellungsspiel",
    it: "Posizionamento offensivo", pl: "Pozycjonowanie ofensywne",
    cs: "Útočné postavení", ru: "Атакующее расположение",
    tr: "Hücum konumlanma", hr: "Napadačko pozicioniranje", no: "Offensiv posisjonering",
  },
  "Offer In Behind": {
    es: "Desmarque en profundidad", pt: "Movimento em profundidade",
    fr: "Appel en profondeur", de: "Tiefenlauf", it: "Movimento in profondità",
    pl: "Zbieg w głąb", cs: "Náběh za obranu", ru: "Забегание за спину",
    tr: "Arka koşu", hr: "Trčanje iza", no: "Løp i dybden",
  },
  "Shot": {
    es: "Disparo", pt: "Remate", fr: "Tir", de: "Schuss", it: "Tiro",
    pl: "Strzał", cs: "Střela", ru: "Удар", tr: "Şut", hr: "Udarac", no: "Skudd",
  },
  "Aerial Duel": {
    es: "Duelo aéreo", pt: "Duelo aéreo", fr: "Duel aérien", de: "Kopfballduell",
    it: "Duello aereo", pl: "Pojedynek powietrzny", cs: "Hlavičkový souboj",
    ru: "Воздушная борьба", tr: "Hava topu", hr: "Zračni duel", no: "Hodedyster",
  },
  "Dribble": {
    es: "Regate", pt: "Drible", fr: "Dribble", de: "Dribbling", it: "Dribbling",
    pl: "Drybling", cs: "Klička", ru: "Дриблинг", tr: "Çalım", hr: "Driblanje", no: "Driblinger",
  },
  "Turnover": {
    es: "Pérdida", pt: "Perda de bola", fr: "Perte de balle", de: "Ballverlust",
    it: "Palla persa", pl: "Strata", cs: "Ztráta míče", ru: "Потеря",
    tr: "Top kaybı", hr: "Gubitak lopte", no: "Balltap",
  },
  "Foul": {
    es: "Falta", pt: "Falta", fr: "Faute", de: "Foul", it: "Fallo",
    pl: "Faul", cs: "Faul", ru: "Фол", tr: "Faul", hr: "Prekršaj", no: "Frispark",
  },
  "Fouled": {
    es: "Falta recibida", pt: "Falta sofrida", fr: "Faute subie", de: "Gefoult",
    it: "Subito fallo", pl: "Faulowany", cs: "Faulován", ru: "Сфолили",
    tr: "Faul yapıldı", hr: "Faulan", no: "Bli felt",
  },
  "Triple Threat": {
    es: "Triple amenaza", pt: "Tripla ameaça", fr: "Triple menace",
    de: "Dreifache Bedrohung", it: "Tripla minaccia", pl: "Potrójne zagrożenie",
    cs: "Trojitá hrozba", ru: "Тройная угроза", tr: "Üçlü tehdit",
    hr: "Trostruka prijetnja", no: "Trippel trussel",
  },
  "Cross": {
    es: "Centro", pt: "Cruzamento", fr: "Centre", de: "Flanke", it: "Cross",
    pl: "Dośrodkowanie", cs: "Centr", ru: "Навес", tr: "Orta", hr: "Centaršut", no: "Innlegg",
  },
  "Interception": {
    es: "Intercepción", pt: "Interceção", fr: "Interception", de: "Abfangen",
    it: "Intercetto", pl: "Przechwyt", cs: "Zachycení", ru: "Перехват",
    tr: "Top kapma", hr: "Presijecanje", no: "Bryt",
  },
  "Tackle": {
    es: "Entrada", pt: "Desarme", fr: "Tacle", de: "Tackling", it: "Contrasto",
    pl: "Odbiór", cs: "Skluz", ru: "Отбор", tr: "Müdahale", hr: "Oduzimanje", no: "Takling",
  },
  "Header": {
    es: "Cabezazo", pt: "Cabeceio", fr: "Tête", de: "Kopfball", it: "Colpo di testa",
    pl: "Główka", cs: "Hlavička", ru: "Удар головой", tr: "Kafa vuruşu",
    hr: "Udarac glavom", no: "Heading",
  },
  "Goal": {
    es: "Gol", pt: "Golo", fr: "But", de: "Tor", it: "Gol",
    pl: "Gol", cs: "Gól", ru: "Гол", tr: "Gol", hr: "Gol", no: "Mål",
  },
  "Assist": {
    es: "Asistencia", pt: "Assistência", fr: "Passe décisive", de: "Vorlage",
    it: "Assist", pl: "Asysta", cs: "Asistence", ru: "Голевая передача",
    tr: "Asist", hr: "Asistencija", no: "Målgivende",
  },
};

/** Resolve a UI string for the example viewers. Falls back to English. */
export function et(language: string | null | undefined, key: string, fallback?: string): string {
  const code = (normalizePortalLanguage(language) || "en") as Lang;
  const row = dict[key];
  return row?.[code] || row?.en || fallback || key;
}

/** Translate a single canonical action label or a comma-separated list of
 *  them. Unknown tokens are returned untouched so analyst custom labels
 *  stay intact. */
export function translateActionType(language: string | null | undefined, value: string | null | undefined): string {
  if (!value) return "";
  const code = (normalizePortalLanguage(language) || "en") as Lang;
  if (code === "en") return value;
  const tokens = value.includes(",") ? value.split(",").map((s) => s.trim()).filter(Boolean) : [value.trim()];
  const out = tokens.map((tok) => {
    const row = actionDict[tok];
    return row?.[code] || tok;
  });
  return out.join(", ");
}
