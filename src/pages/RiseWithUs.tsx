import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ChevronLeft, MessageCircle, X,
  Compass, MapPin, Dumbbell, HeartPulse, Trophy, Users2, Languages,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import NotFound from "./NotFound";
import { RiseBrandedLoader } from "@/components/RiseBrandedLoader";
import { RepresentationAudio } from "@/components/RepresentationAudio";
import { usePlayerLanguageTranslations } from "@/hooks/usePlayerLanguageTranslations";
import { SectionSliderWheel } from "@/components/SectionSliderWheel";
import {
  CARD_META, GROUPS, GROUP_LABELS,
  CARD_TITLE_KEYS, CARD_SUBTITLE_KEYS,
  formatCardSubtitle, solidBlackSectionStyle,
  getCardContent, MISSION_BIO_KEY, MISSION_BIO_FALLBACK,
  DetailView,
  type CardKey, type AgeGroup, type GroupKey,
  type PerformanceSub,
} from "./RequestRepresentation";
import { type ScoutingPosition } from "@/data/scoutingSkills";
import { normalisePosition } from "@/lib/positionNormalise";
import riseLogoWhite from "@/assets/RISEWhite.png";
import smudgedMarbleBg from "@/assets/smudged-marble-login.png";

interface ProspectPlayer {
  id: string;
  name: string;
  position: string;
  image_url: string | null;
  club: string | null;
  nationality: string | null;
  portal_language?: string | null;
}
interface OfferSettings {
  hidden_sections: string[];
  section_images: Record<string, string>;
  rise_with_us_under18?: boolean;
  representation_subtitle_secondary?: string | null;
}

const TYRESE_PORTAL_EMBED_BASE = "/portal?staff_login=tyelanders%40gmail.com&hide_invoices=1&hide_logout=1&hide_music=1";
const tyresePortalEmbed = (lang: string) =>
  `${TYRESE_PORTAL_EMBED_BASE}&lang=${encodeURIComponent(lang || "en")}`;
const WHATSAPP_URL = "https://wa.me/447508342901?text=" + encodeURIComponent("Hi RISE, I just read my invitation");
const HOMEPAGE_URL = "https://www.risefootballagency.com";

/* ============== TRANSLATION DICT (offer-only strings) ============== */
type Lang = "en" | "es" | "pt" | "fr" | "de" | "it" | "pl" | "cs" | "ru" | "tr" | "hr" | "no";
const offerDict: Record<string, Partial<Record<Lang, string>>> = {
  tap_to_continue: {
    en: "Tap anywhere to continue", es: "Toca en cualquier lugar para continuar",
    pt: "Toque em qualquer lugar para continuar", fr: "Touchez pour continuer",
    de: "Zum Fortfahren tippen", it: "Tocca per continuare",
    pl: "Dotknij, aby kontynuować", cs: "Klepnutím pokračujte",
    ru: "Нажмите, чтобы продолжить", tr: "Devam etmek için dokun",
    hr: "Dodirni za nastavak", no: "Trykk for å fortsette",
  },
  invitation_to: {
    en: "An invitation to", es: "Una invitación para", pt: "Um convite para",
    fr: "Une invitation pour", de: "Eine Einladung an", it: "Un invito per",
    pl: "Zaproszenie dla", cs: "Pozvání pro", ru: "Приглашение для",
    tr: "Bir davet", hr: "Poziv za", no: "En invitasjon til",
  },
  stood_out_line: {
    en: "As part of our extensive scouting efforts, we are pleased to say that you stood out with the capability to become a star.",
    es: "Como parte de nuestro extenso trabajo de scouting, nos complace decirte que destacaste con la capacidad de convertirte en una estrella.",
    pt: "Como parte do nosso trabalho de scouting, temos o prazer de dizer que se destacou com capacidade para se tornar uma estrela.",
    fr: "Dans le cadre de notre travail de détection, nous sommes ravis de vous dire que vous vous êtes distingué avec le potentiel de devenir une star.",
    de: "Im Rahmen unserer umfangreichen Scouting-Arbeit freuen wir uns, dir mitzuteilen, dass du mit dem Potenzial zu einem Star herausgestochen bist.",
    it: "Nell'ambito del nostro accurato lavoro di scouting, siamo lieti di dirti che ti sei distinto con il potenziale per diventare una stella.",
    pl: "W ramach naszej szeroko zakrojonej pracy skautingowej z radością informujemy, że wyróżniłeś się jako potencjalna gwiazda.",
    cs: "V rámci našeho rozsáhlého skautingu nás těší, že jste vynikl s potenciálem stát se hvězdou.",
    ru: "В рамках нашей масштабной скаутской работы мы рады сообщить, что вы выделились с потенциалом стать звездой.",
    tr: "Geniş kapsamlı scouting çalışmamızın bir parçası olarak, yıldız olma potansiyeliyle öne çıktığını söylemekten mutluluk duyuyoruz.",
    hr: "U sklopu našeg opsežnog skautskog rada, zadovoljstvo nam je reći da si se istaknuo s potencijalom da postaneš zvijezda.",
    no: "Som en del av vårt omfattende speiderarbeid er vi glade for å si at du skilte deg ut med kapasitet til å bli en stjerne.",
  },
  differentiate_line: {
    en: "We differentiate players by their will, skill and potential, to find those who will use our English Premier League Performance Team to the fullest effect to realise their potential on the pitch and in life.",
    es: "Diferenciamos a los jugadores por su voluntad, habilidad y potencial, para encontrar a aquellos que aprovechen al máximo nuestro equipo de rendimiento de la Premier League inglesa para alcanzar su potencial dentro y fuera del campo.",
    pt: "Diferenciamos os jogadores pela vontade, habilidade e potencial, para encontrar quem irá usar a nossa equipa de performance da Premier League inglesa ao máximo para alcançar todo o seu potencial dentro e fora do campo.",
    fr: "Nous différencions les joueurs par leur volonté, leur talent et leur potentiel, afin de trouver ceux qui sauront utiliser au mieux notre équipe de performance de la Premier League anglaise pour réaliser leur potentiel sur le terrain et dans la vie.",
    de: "Wir unterscheiden Spieler nach Wille, Können und Potenzial, um diejenigen zu finden, die unser Premier-League-Performance-Team voll ausschöpfen, um ihr Potenzial auf dem Platz und im Leben zu entfalten.",
    it: "Distinguiamo i giocatori per volontà, talento e potenziale, per trovare chi saprà sfruttare al massimo il nostro Performance Team della Premier League inglese e realizzare il proprio potenziale in campo e nella vita.",
    pl: "Wyróżniamy zawodników po woli, umiejętnościach i potencjale, aby znaleźć tych, którzy w pełni wykorzystają nasz zespół Performance z angielskiej Premier League, aby zrealizować swój potencjał na boisku i w życiu.",
    cs: "Hráče rozlišujeme podle vůle, dovedností a potenciálu, abychom našli ty, kdo náš tým Performance z anglické Premier League využijí naplno k realizaci svého potenciálu na hřišti i v životě.",
    ru: "Мы различаем игроков по воле, мастерству и потенциалу, чтобы найти тех, кто максимально использует нашу команду Performance из английской Премьер-лиги для реализации потенциала на поле и в жизни.",
    tr: "Oyuncuları irade, yetenek ve potansiyel açısından ayırarak, İngiltere Premier Lig Performans Ekibimizden en iyi şekilde yararlanıp sahada ve hayatta potansiyelini gerçekleştirecek olanları buluyoruz.",
    hr: "Igrače razlikujemo po volji, vještini i potencijalu kako bismo pronašli one koji će naš Performance tim engleske Premier lige iskoristiti maksimalno i ostvariti potencijal na terenu i u životu.",
    no: "Vi skiller spillere etter vilje, ferdigheter og potensial, for å finne de som vil bruke vårt Performance Team fra engelske Premier League fullt ut for å realisere sitt potensial på banen og i livet.",
  },
  rise_with_us: {
    en: "Rise With Us", es: "Crece Con Nosotros", pt: "Cresça Connosco",
    fr: "Grandissez Avec Nous", de: "Wachse Mit Uns", it: "Cresci Con Noi",
    pl: "Rośnij Z Nami", cs: "Rosti S Námi", ru: "Расти С Нами",
    tr: "Bizimle Yüksel", hr: "Rasti S Nama", no: "Vokse Med Oss",
  },
  explore_player_portal: {
    en: "Explore Our Player Portal", es: "Explora Nuestro Portal de Jugador",
    pt: "Explora o Nosso Portal de Jogador", fr: "Découvrez notre portail joueur",
    de: "Entdecke unser Spielerportal", it: "Esplora il nostro portale giocatore",
    pl: "Poznaj nasz portal zawodnika", cs: "Prozkoumej náš hráčský portál",
    ru: "Откройте наш портал игрока", tr: "Oyuncu Portalımızı Keşfet",
    hr: "Istraži naš portal igrača", no: "Utforsk spillerportalen vår",
  },
  the_next_step: {
    en: "The Next Step", es: "El siguiente paso", pt: "O próximo passo",
    fr: "L'étape suivante", de: "Der nächste Schritt", it: "Il prossimo passo",
    pl: "Następny krok", cs: "Další krok", ru: "Следующий шаг",
    tr: "Sonraki Adım", hr: "Sljedeći korak", no: "Neste steg",
  },
  over_to_you: {
    en: "Over to you", es: "Te toca a ti", pt: "Está nas tuas mãos",
    fr: "À toi de jouer", de: "Du bist am Zug", it: "Tocca a te",
    pl: "Twoja kolej", cs: "Je to na tobě", ru: "Слово за тобой",
    tr: "Söz sende", hr: "Na tebi je", no: "Over til deg",
  },
  wed_love_to_hear: {
    en: "We'd love to hear what you think and any questions you have.",
    es: "Nos encantaría saber qué piensas y resolver cualquier duda que tengas.",
    pt: "Adoraríamos saber o que pensas e responder a qualquer dúvida.",
    fr: "Nous aimerions connaître ton avis et répondre à toutes tes questions.",
    de: "Wir würden gerne hören, was du denkst, und alle deine Fragen beantworten.",
    it: "Ci farebbe piacere sapere cosa ne pensi e rispondere a ogni tua domanda.",
    pl: "Chętnie poznamy Twoje zdanie i odpowiemy na wszelkie pytania.",
    cs: "Rádi bychom slyšeli, co si myslíš, a zodpověděli jakékoli otázky.",
    ru: "Будем рады узнать, что вы думаете, и ответить на любые вопросы.",
    tr: "Ne düşündüğünü ve sorularını duymak isteriz.",
    hr: "Voljeli bismo čuti što misliš i odgovoriti na sva pitanja.",
    no: "Vi vil gjerne høre hva du tenker og svare på spørsmålene dine.",
  },
  message_whatsapp: {
    en: "Message us on WhatsApp", es: "Escríbenos por WhatsApp",
    pt: "Envia-nos uma mensagem no WhatsApp", fr: "Écris-nous sur WhatsApp",
    de: "Schreib uns auf WhatsApp", it: "Scrivici su WhatsApp",
    pl: "Napisz do nas na WhatsApp", cs: "Napiš nám na WhatsApp",
    ru: "Напишите нам в WhatsApp", tr: "WhatsApp'tan bize yaz",
    hr: "Poruka na WhatsApp", no: "Send oss en WhatsApp",
  },
  visit_homepage: {
    en: "Visit our homepage", es: "Visita nuestra web",
    pt: "Visita o nosso site", fr: "Visiter notre site",
    de: "Zur Website", it: "Visita il nostro sito",
    pl: "Odwiedź naszą stronę", cs: "Navštivte naše stránky",
    ru: "Перейти на сайт", tr: "Web sitemizi ziyaret et",
    hr: "Posjeti naš sajt", no: "Besøk nettsiden vår",
  },
  back_to_info: {
    en: "Back to Info", es: "Volver a Info", pt: "Voltar à Info",
    fr: "Retour aux Infos", de: "Zurück zu Infos", it: "Torna alle Info",
    pl: "Wróć do informacji", cs: "Zpět na informace", ru: "К информации",
    tr: "Bilgiye dön", hr: "Natrag na info", no: "Tilbake til info",
  },
  back_to_portal: {
    en: "Back to Portal", es: "Volver al Portal", pt: "Voltar ao Portal",
    fr: "Retour au portail", de: "Zurück zum Portal", it: "Torna al portale",
    pl: "Wróć do portalu", cs: "Zpět na portál", ru: "К порталу",
    tr: "Portala dön", hr: "Natrag na portal", no: "Tilbake til portalen",
  },
  back_to_all: {
    en: "Back to all", es: "Volver a todas", pt: "Voltar a todas",
    fr: "Retour à tout", de: "Zurück zur Übersicht", it: "Torna a tutte",
    pl: "Wróć do wszystkich", cs: "Zpět na vše", ru: "Ко всем",
    tr: "Tümüne dön", hr: "Natrag na sve", no: "Tilbake til alle",
  },
  rise_with_us_heading: {
    en: "Rise With Us", es: "Crece Con Nosotros", pt: "Cresça Connosco",
    fr: "Grandissez Avec Nous", de: "Wachse Mit Uns", it: "Cresci Con Noi",
    pl: "Rośnij Z Nami", cs: "Rosti S Námi", ru: "Расти С Нами",
    tr: "Bizimle Yüksel", hr: "Rasti S Nama", no: "Vokse Med Oss",
  },
};

const portalWelcomeDict: Record<string, Partial<Record<Lang, string>>> = {
  welcome_title: {
    en: "A real preview", es: "Una vista previa real", pt: "Uma pré-visualização real",
    fr: "Un véritable aperçu", de: "Eine echte Vorschau", it: "Un'anteprima reale",
    pl: "Prawdziwy podgląd", cs: "Skutečná ukázka", ru: "Настоящий предпросмотр",
    tr: "Gerçek bir önizleme", hr: "Pravi pregled", no: "En ekte forhåndsvisning",
  },
  welcome_body: {
    en: "See a real preview of the work we do with our Stars to make the difference on the pitch.",
    es: "Mira una vista real del trabajo que hacemos con nuestras Estrellas para marcar la diferencia en el campo.",
    pt: "Vê uma pré-visualização real do trabalho que fazemos com as nossas Estrelas para fazer a diferença em campo.",
    fr: "Découvrez un véritable aperçu du travail que nous menons avec nos Stars pour faire la différence sur le terrain.",
    de: "Sieh dir eine echte Vorschau der Arbeit an, die wir mit unseren Stars leisten, um auf dem Platz den Unterschied zu machen.",
    it: "Guarda un'anteprima reale del lavoro che facciamo con le nostre Stelle per fare la differenza in campo.",
    pl: "Zobacz prawdziwy podgląd pracy, jaką wykonujemy z naszymi Gwiazdami, by robić różnicę na boisku.",
    cs: "Podívej se na skutečnou ukázku práce, kterou s našimi hvězdami děláme, aby na hřišti dělali rozdíl.",
    ru: "Посмотрите реальный предпросмотр работы, которую мы проводим с нашими звёздами, чтобы делать разницу на поле.",
    tr: "Sahada fark yaratmak için Yıldızlarımızla yaptığımız çalışmanın gerçek bir önizlemesini gör.",
    hr: "Pogledaj pravi pregled rada koji radimo s našim Zvijezdama kako bismo napravili razliku na terenu.",
    no: "Se en ekte forhåndsvisning av arbeidet vi gjør med våre Stjerner for å utgjøre forskjellen på banen.",
  },
  got_it: {
    en: "Got it", es: "Entendido", pt: "Entendido", fr: "Compris",
    de: "Verstanden", it: "Capito", pl: "Rozumiem", cs: "Rozumím",
    ru: "Понятно", tr: "Anladım", hr: "Razumijem", no: "Skjønner",
  },
};
const allDicts = { ...offerDict, ...portalWelcomeDict };

const offerT = (lang: string, key: string, fallback: string): string => {
  const code = (lang || "en") as Lang;
  return allDicts[key]?.[code] || allDicts[key]?.en || fallback;
};

/* ============== AUTO-POSITION RESOLUTION ============== */
/** Map normalised position abbreviations (GK, CB, LW, …) to the
 *  broader scouting groupings used by the Scouting card. Mirrors
 *  POSITION_TO_SCOUTING in RequestRepresentation.tsx. */
const ABBR_TO_SCOUTING: Record<string, ScoutingPosition> = {
  GK: "Goalkeeper",
  LB: "Full-Back", RB: "Full-Back", LWB: "Full-Back", RWB: "Full-Back",
  CB: "Centre-Back",
  CDM: "Central Defensive Midfielder",
  CM: "Central Midfielder", LM: "Central Midfielder", RM: "Central Midfielder",
  CAM: "Central Attacking Midfielder",
  LW: "Winger / Wide Forward", RW: "Winger / Wide Forward",
  CF: "Centre Forward / Striker",
};

const resolveScoutingPosition = (raw?: string | null): ScoutingPosition | null => {
  if (!raw) return null;
  const abbr = normalisePosition(raw);
  return ABBR_TO_SCOUTING[abbr] || null;
};

/* ============== PILLARS (Why Us / Pathway / How We Work) ============== */
/** Slanted-edge "pillar" boxes that sit between the hub mission
 *  paragraph and the existing three card groups. They cover the
 *  proposal-side narrative the existing cards do not: pathway
 *  planning, HQ, training methodology, performance team provision,
 *  Ballon d'Or vision / FOMO, parent's role (under 18 only), and
 *  the multilingual "how we work" promise. Slant carries the RISE
 *  brand wedge across the proposal surface. */
const SLANT = 18; // px diagonal cut on top-right / bottom-left corners
const slantClip = `polygon(0 0, calc(100% - ${SLANT}px) 0, 100% ${SLANT}px, 100% 100%, ${SLANT}px 100%, 0 calc(100% - ${SLANT}px))`;

type Pillar = {
  key: string;
  icon: typeof Compass;
  titleKey: string; titleFallback: string;
  bodyKey: string;  bodyFallback: string;
  badgeKey?: string; badgeFallback?: string;
  showFor?: "under18" | "over18" | "all";
};

const PILLARS: Pillar[] = [
  {
    key: "pathway",
    icon: Compass,
    titleKey: "rwu_pathway_title", titleFallback: "Pathway Planning",
    bodyKey:  "rwu_pathway_body",
    bodyFallback:
      "We map out a clear journey from where you are today to where you want to be. Each step is chosen to remove the risk of failure and fit your appetite for risk, so you always know what comes next and why.",
  },
  {
    key: "hq",
    icon: MapPin,
    titleKey: "rwu_hq_title", titleFallback: "London HQ",
    bodyKey:  "rwu_hq_body",
    bodyFallback:
      "Our base in London puts us inside the world's most-watched football market, with daily access to Premier League contacts, recruitment staff and decision-makers.",
    badgeKey: "rwu_hq_badge", badgeFallback: "London, England",
  },
  {
    key: "training",
    icon: Dumbbell,
    titleKey: "rwu_training_title", titleFallback: "Training Methodology",
    bodyKey:  "rwu_training_body",
    bodyFallback:
      "Programming is built around match weeks, not generic templates. Strength, power, speed and technical work are sequenced to peak you for the games that matter and recover you properly after.",
  },
  {
    key: "perf_team",
    icon: HeartPulse,
    titleKey: "rwu_perf_team_title", titleFallback: "Performance Team Provision",
    bodyKey:  "rwu_perf_team_body",
    bodyFallback:
      "Full Premier League level support — analysis, S&C, nutrition, sports psychology, technique — wrapped around you, working off one shared plan, not a list of disconnected freelancers.",
  },
  {
    key: "vision",
    icon: Trophy,
    titleKey: "rwu_vision_title", titleFallback: "Our Ballon d'Or Vision",
    bodyKey:  "rwu_vision_body",
    bodyFallback:
      "Our ambition is the highest level the game has — Ballon d'Or, Team of the Year, World Cup. We pick a small group of players we genuinely believe can get there, and we back them all the way. This is the most exciting time to join, with a massive opportunity to be one of the first.",
    badgeKey: "rwu_vision_badge", badgeFallback: "Forward-looking · Limited spots",
  },
  {
    key: "parent",
    icon: Users2,
    titleKey: "rwu_parent_title", titleFallback: "The Parent's Role",
    bodyKey:  "rwu_parent_body",
    bodyFallback:
      "We work alongside you, not around you. You stay in the loop on every decision, every conversation with a club, every step in the plan. Your job is the home environment and steady support; ours is the football, the contacts and the standards.",
    showFor: "under18",
  },
  {
    key: "how_we_work",
    icon: Languages,
    titleKey: "rwu_how_title", titleFallback: "How We Work With You",
    bodyKey:  "rwu_how_body",
    bodyFallback:
      "Direct communication, in your language. The portal, your reports and your day-to-day contact happen in the language you prefer, so nothing is lost in translation and the family is included.",
  },
];

const PillarsSection = ({
  lang, ageGroup, t,
}: {
  lang: string; ageGroup: "under18" | "over18";
  t: (key: string, fallback: string) => string;
}) => {
  const visible = PILLARS.filter((p) => !p.showFor || p.showFor === "all" || p.showFor === ageGroup);
  return (
    <div className="my-6 md:my-8">
      <div className="mb-5 flex items-center gap-3 md:mb-6">
        <div className="h-[1px] flex-1 bg-primary/40" />
        <span className="font-bebas text-xl uppercase tracking-[0.32em] text-primary md:text-2xl">
          {offerT(lang, "rwu_pillars_heading", "Why RISE")}
        </span>
        <div className="h-[1px] flex-1 bg-primary/40" />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
        {visible.map((p, i) => {
          const Icon = p.icon;
          return (
            <motion.div
              key={p.key}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
              style={{ clipPath: slantClip, WebkitClipPath: slantClip }}
            >
              {/* Inner clipped surface; uses a slightly larger outer
                  wrapper so the slanted gold edge reads as a border. */}
              <div
                className="relative h-full p-[1px]"
                style={{ background: "linear-gradient(135deg, hsl(var(--gold)/0.55), hsl(var(--gold)/0.12) 55%, hsl(var(--gold)/0.35))" }}
              >
                <div
                  className="relative h-full px-4 py-4 md:px-5 md:py-5"
                  style={{ ...solidBlackSectionStyle, clipPath: slantClip, WebkitClipPath: slantClip }}
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,hsl(var(--gold)/0.10),transparent_55%)]" />
                  <div className="relative flex items-start gap-3 md:gap-4">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/35 bg-primary/10 shadow-[0_0_22px_hsl(var(--gold)/0.18)] md:h-11 md:w-11">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bebas text-lg uppercase leading-tight tracking-[0.1em] text-foreground md:text-xl">
                        {t(p.titleKey, p.titleFallback)}
                      </p>
                      {p.badgeFallback && (
                        <p className="mt-1 font-bebas text-[10px] uppercase tracking-[0.22em] text-primary/90">
                          {t(p.badgeKey || "", p.badgeFallback)}
                        </p>
                      )}
                      <p
                        className="mt-2 text-[12.5px] leading-relaxed text-foreground/85 md:text-[13.5px]"
                        style={{ hyphens: "none", wordBreak: "normal", overflowWrap: "normal" }}
                      >
                        {t(p.bodyKey, p.bodyFallback)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

/* ============== PORTAL WELCOME OVERLAY ============== */
const PortalWelcomeOverlay = ({ lang }: { lang: string }) => {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={() => setOpen(false)}
    >
      <motion.div
        className="relative w-full max-w-3xl rounded-2xl border border-primary/40 bg-background/95 p-8 sm:p-10 shadow-[0_30px_80px_-20px_hsl(var(--primary)/0.55)]"
        initial={{ scale: 0.96, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full p-1.5 text-foreground/70 hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        <p className="font-bebas text-xs sm:text-sm uppercase tracking-[0.3em] text-primary mb-3">
          {offerT(lang, "welcome_title", "A real preview")}
        </p>
        <h2 className="font-bebas text-3xl sm:text-4xl md:text-5xl uppercase tracking-wider text-foreground leading-tight">
          {offerT(lang, "explore_player_portal", "Explore Our Player Portal")}
        </h2>
        <div className="w-16 h-px bg-primary mt-5 mb-5" />
        <p className="text-base sm:text-lg text-foreground/90 leading-relaxed">
          {offerT(lang, "welcome_body", "See a real preview of the work we do with our Stars to make the difference on the pitch.")}
        </p>
        <div className="mt-7 flex justify-end">
          <Button
            onClick={() => setOpen(false)}
            className="font-bebas uppercase tracking-[0.2em] bg-primary text-primary-foreground hover:bg-primary/90 px-6"
          >
            {offerT(lang, "got_it", "Got it")}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ============== INTRO ============== */
interface PulsePoint { x: number; y: number; id: number }

const introImageFrames: Record<number, Array<{ className: string; style: React.CSSProperties }>> = {
  1: [
    { className: "h-40 w-40 sm:h-56 sm:w-56 md:h-64 md:w-64", style: { top: "9%", right: "7%", rotate: "4deg" } },
  ],
  2: [
    { className: "h-36 w-36 sm:h-52 sm:w-52 md:h-60 md:w-60", style: { top: "9%", left: "7%", rotate: "-5deg" } },
    { className: "h-36 w-36 sm:h-52 sm:w-52 md:h-60 md:w-60", style: { bottom: "11%", right: "7%", rotate: "5deg" } },
  ],
  3: [
    { className: "h-32 w-32 sm:h-48 sm:w-48 md:h-56 md:w-56", style: { top: "7%", left: "7%", rotate: "-5deg" } },
    { className: "h-32 w-32 sm:h-48 sm:w-48 md:h-56 md:w-56", style: { top: "7%", right: "7%", rotate: "5deg" } },
    { className: "h-36 w-36 sm:h-52 sm:w-52 md:h-60 md:w-60", style: { bottom: "8%", left: "50%", transform: "translateX(-50%)", rotate: "-2deg" } },
  ],
  4: [
    { className: "h-32 w-32 sm:h-44 sm:w-44 md:h-52 md:w-52", style: { top: "7%", left: "6%", rotate: "-6deg" } },
    { className: "h-32 w-32 sm:h-44 sm:w-44 md:h-52 md:w-52", style: { top: "7%", right: "6%", rotate: "6deg" } },
    { className: "h-32 w-32 sm:h-44 sm:w-44 md:h-52 md:w-52", style: { bottom: "8%", left: "7%", rotate: "4deg" } },
    { className: "h-32 w-32 sm:h-44 sm:w-44 md:h-52 md:w-52", style: { bottom: "8%", right: "7%", rotate: "-4deg" } },
  ],
  5: [
    { className: "h-28 w-28 sm:h-40 sm:w-40 md:h-48 md:w-48", style: { top: "6%", left: "6%", rotate: "-6deg" } },
    { className: "h-28 w-28 sm:h-40 sm:w-40 md:h-48 md:w-48", style: { top: "6%", right: "6%", rotate: "6deg" } },
    { className: "h-28 w-28 sm:h-40 sm:w-40 md:h-48 md:w-48", style: { bottom: "8%", left: "6%", rotate: "4deg" } },
    { className: "h-28 w-28 sm:h-40 sm:w-40 md:h-48 md:w-48", style: { bottom: "8%", right: "6%", rotate: "-4deg" } },
    { className: "h-24 w-24 sm:h-36 sm:w-36 md:h-44 md:w-44", style: { top: "50%", left: "8%", transform: "translateY(-50%)", rotate: "3deg" } },
  ],
  6: [
    { className: "h-24 w-24 sm:h-36 sm:w-36 md:h-44 md:w-44", style: { top: "6%", left: "6%", rotate: "-6deg" } },
    { className: "h-24 w-24 sm:h-36 sm:w-36 md:h-44 md:w-44", style: { top: "6%", right: "6%", rotate: "6deg" } },
    { className: "h-24 w-24 sm:h-36 sm:w-36 md:h-44 md:w-44", style: { bottom: "8%", left: "6%", rotate: "4deg" } },
    { className: "h-24 w-24 sm:h-36 sm:w-36 md:h-44 md:w-44", style: { bottom: "8%", right: "6%", rotate: "-4deg" } },
    { className: "h-24 w-24 sm:h-32 sm:w-32 md:h-40 md:w-40", style: { top: "50%", left: "7%", transform: "translateY(-50%)", rotate: "3deg" } },
    { className: "h-24 w-24 sm:h-32 sm:w-32 md:h-40 md:w-40", style: { top: "50%", right: "7%", transform: "translateY(-50%)", rotate: "-3deg" } },
  ],
};

const getIntroImageFrames = (count: number) => introImageFrames[Math.min(Math.max(count, 1), 6)] || [];

const IntroCinematic = ({
  fullName, lang, extraImages, secondaryParagraph, onDone,
}: {
  fullName: string; lang: string; extraImages: string[];
  secondaryParagraph?: string | null; onDone: () => void;
}) => {
  const [phase, setPhase] = useState(0);
  const totalPhases = 4;
  const [pulses, setPulses] = useState<PulsePoint[]>([]);
  const pulseId = useRef(0);

  const advance = (e: React.MouseEvent | React.TouchEvent) => {
    // capture click position for ripple
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    if ("touches" in e && e.touches.length > 0) {
      x = e.touches[0].clientX; y = e.touches[0].clientY;
    } else if ("clientX" in e) {
      x = (e as React.MouseEvent).clientX;
      y = (e as React.MouseEvent).clientY;
    }
    const id = ++pulseId.current;
    setPulses((p) => [...p, { x, y, id }]);
    setTimeout(() => setPulses((p) => p.filter((q) => q.id !== id)), 700);

    if (phase >= totalPhases - 1) onDone();
    else setPhase((p) => p + 1);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black"
      onClick={advance}
      onTouchStart={advance}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      role="presentation"
    >
      {/* Smudged marble background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${smudgedMarbleBg})`, opacity: 0.55 }}
      />
      <div className="absolute inset-0 bg-black/60" />
      {/* gold ambience */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(circle at 50% 50%, hsl(var(--gold) / 0.22), transparent 60%)" }}
        animate={{ opacity: [0.4, 0.95, 0.5] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* slow rotating gold sweep */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-1/2"
        style={{
          background: "conic-gradient(from 0deg, transparent 0deg, hsl(var(--gold) / 0.08) 80deg, transparent 160deg, transparent 360deg)",
          mixBlendMode: "screen",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 24, ease: "linear", repeat: Infinity }}
      />

      {/* Click ripples */}
      {pulses.map((p) => (
        <motion.span
          key={p.id}
          aria-hidden="true"
          className="pointer-events-none absolute rounded-full border border-primary/70"
          style={{ left: p.x, top: p.y, transform: "translate(-50%, -50%)" }}
          initial={{ width: 0, height: 0, opacity: 0.85 }}
          animate={{ width: "260vmax", height: "260vmax", opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}

      {/* Uploaded intro images appear only on the final RISE logo beat. */}
      {phase === 3 && extraImages.length > 0 && (
        <div className="pointer-events-none absolute inset-0 z-[5]">
          {extraImages.slice(0, 6).map((src, i) => {
            const frame = getIntroImageFrames(extraImages.slice(0, 6).length)[i];
            return (
              <motion.img
                key={src + i}
                src={src}
                alt=""
                className={`absolute object-cover rounded-2xl border border-primary/45 shadow-[0_0_50px_-10px_hsl(var(--gold)/0.75)] ${frame.className}`}
                style={frame.style}
                initial={{ opacity: 0, scale: 0.75 }}
                animate={{ opacity: 0.9, scale: 1 }}
                transition={{ duration: 0.95, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              />
            );
          })}
        </div>
      )}

      {/* Player image is intentionally NOT rendered in the intro cinematic.
          The intro must show only the smudged marble + RISE logo. */}

      {/* Text reveal */}
      <div className="relative z-10 max-w-xl px-6 text-center">
        <AnimatePresence mode="wait">
          {phase === 0 && (
            <motion.div key="p0"
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="font-bebas text-base sm:text-lg uppercase tracking-[0.3em] text-primary">
                {offerT(lang, "invitation_to", "An invitation to")}
              </p>
              <p className="mt-3 font-bebas text-5xl sm:text-7xl md:text-8xl uppercase tracking-wider text-foreground"
                 style={{ textShadow: "0 0 30px hsl(var(--gold)/0.5)" }}>
                {fullName.split(" ")[0]}
              </p>
            </motion.div>
          )}
          {phase === 1 && (
            <motion.div key="p1"
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45 }}
              className="space-y-4"
            >
              <p className="font-bebas text-2xl sm:text-4xl md:text-5xl uppercase tracking-[0.16em] text-primary"
                 style={{ textShadow: "0 0 24px hsl(var(--gold)/0.45)" }}>
                {fullName.toUpperCase()}
              </p>
              <p className="text-justify text-base sm:text-xl md:text-2xl leading-snug text-foreground font-medium"
                 style={{ wordSpacing: "-0.03em" }}>
                {offerT(lang, "stood_out_line", "As part of our extensive scouting efforts, we are pleased to say that you stood out with the capability to become a star.")}
              </p>
              {secondaryParagraph && (
                <p className="text-justify text-sm sm:text-lg md:text-xl leading-relaxed text-foreground/90"
                   style={{ wordSpacing: "-0.02em" }}>
                  {secondaryParagraph}
                </p>
              )}
            </motion.div>
          )}
          {phase === 2 && (
            <motion.p key="p2"
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45 }}
              className="text-justify text-base sm:text-xl md:text-2xl leading-relaxed text-foreground/95"
              style={{ wordSpacing: "-0.02em" }}
            >
              {offerT(lang, "differentiate_line", "We differentiate players by their will, skill and potential, to find those who will use our English Premier League Performance Team to the fullest effect to realise their potential on the pitch and in life.")}
            </motion.p>
          )}
          {phase === 3 && (
            <motion.div key="p3"
              initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center gap-5"
            >
              <motion.img
                src={riseLogoWhite} alt="RISE"
                className="h-24 sm:h-32 md:h-40 w-auto"
                initial={{ filter: "drop-shadow(0 0 0px hsl(var(--gold)))" }}
                animate={{ filter: "drop-shadow(0 0 22px hsl(var(--gold)/0.7))" }}
                transition={{ duration: 1.2, repeat: Infinity, repeatType: "mirror" }}
              />
              <p className="font-bebas text-4xl sm:text-6xl md:text-7xl uppercase tracking-[0.2em] text-foreground"
                 style={{ textShadow: "0 0 28px hsl(var(--gold)/0.55)" }}>
                {offerT(lang, "rise_with_us", "Rise With Us")}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tap-to-continue hint */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] flex justify-center z-20">
        <motion.span
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="font-bebas text-[11px] sm:text-xs uppercase tracking-[0.3em] text-foreground/80"
        >
          {offerT(lang, "tap_to_continue", "Tap anywhere to continue")}
        </motion.span>
      </div>
    </motion.div>
  );
};

/* ============== MAIN ============== */
const RiseWithUs = () => {
  const { slug } = useParams<{ slug: string }>();
  const [player, setPlayer] = useState<ProspectPlayer | null>(null);
  const [settings, setSettings] = useState<OfferSettings>({ hidden_sections: [], section_images: {}, rise_with_us_under18: false, representation_subtitle_secondary: null });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [activeCard, setActiveCard] = useState<CardKey | null>(null);
  const [scoutingPosition, setScoutingPosition] = useState<ScoutingPosition | null>(null);
  const [performanceSub, setPerformanceSub] = useState<PerformanceSub | null>(null);
  const [stage, setStage] = useState<"hub" | "portal" | "next">("hub");

  const isPickerMode = !slug;

  // Translator scoped to THIS player's portal_language so each prospect's
  // offer page renders in their language regardless of the visitor's
  // current site language preference.
  const playerLang = player?.portal_language || "en";
  const { t } = usePlayerLanguageTranslations(playerLang);

  useEffect(() => {
    if (isPickerMode) { setNotFound(true); setLoading(false); return; }
    (async () => {
      const searchName = slug.replace(/-/g, " ");
      const { data, error } = await supabase
        .from("players")
        .select("id, name, position, image_url, club, nationality, portal_language, has_representation_offer, representation_status")
        .or("has_representation_offer.eq.true,representation_status.eq.prospect")
        .ilike("name", searchName)
        .maybeSingle();
      if (error || !data) { setNotFound(true); }
      else {
        setPlayer(data);
        const { data: sData } = await (supabase as any)
          .from("player_offer_settings")
          .select("hidden_sections, section_images")
          .eq("player_id", data.id)
          .maybeSingle();
        const { data: portalData } = await (supabase as any)
          .from("player_portal_settings")
          .select("rise_with_us_under18, representation_subtitle_secondary")
          .eq("player_id", data.id)
          .maybeSingle();
        setSettings({
          hidden_sections: (sData?.hidden_sections || []) as string[],
          section_images: (sData?.section_images || {}) as Record<string, string>,
          rise_with_us_under18: !!portalData?.rise_with_us_under18,
          representation_subtitle_secondary: portalData?.representation_subtitle_secondary || null,
        });
        // NOTE: We do NOT call switchLanguage here — it would redirect to a
        // different language subdomain on production and break the offer
        // URL. Imported representation card content uses the current site
        // language; offer-specific strings use the player's portal_language
        // via the offerDict above.
      }
      setLoading(false);
    })();
  }, [slug, isPickerMode]);

  // ageGroup defaults to over18 (most prospects). Card content uses this
  // to switch the under18/over18 specific copy in fees/agreement/expectations.
  const ageGroup: Exclude<AgeGroup, null> = settings.rise_with_us_under18 ? "under18" : "over18";

  const cardContent = useMemo(() => getCardContent(ageGroup), [ageGroup]);

  if (loading) return <RiseBrandedLoader />;
  if (notFound || !player) return <NotFound />;

  const fullName = player.name;
  const firstName = player.name.split(" ")[0];
  const visibleCardKeys = new Set(
    CARD_META.filter((c) => !settings.hidden_sections.includes(c.key)).map((c) => c.key)
  );
  const extraImages = Object.values(settings.section_images).filter(Boolean) as string[];
  const lang = player.portal_language || "en";
  const ot = (key: string, fallback: string) => offerT(lang, key, fallback);

  const goPortal = () => { setStage("portal"); window.scrollTo({ top: 0, behavior: "auto" }); };
  const goNext = () => { setStage("next"); window.scrollTo({ top: 0, behavior: "auto" }); };
  const goHub = () => { setStage("hub"); window.scrollTo({ top: 0, behavior: "auto" }); };

  const activeMeta = activeCard ? CARD_META.find((c) => c.key === activeCard)! : null;
  const groupSiblings = activeMeta
    ? CARD_META.filter((c) => c.group === activeMeta.group && visibleCardKeys.has(c.key))
    : [];

  const openCard = (k: CardKey) => {
    setActiveCard(k);
    // Auto-select the player's primary position when entering the
    // Scouting card so they land directly on their own breakdown
    // instead of the position picker.
    if (k === "scouting") {
      setScoutingPosition(resolveScoutingPosition(player?.position));
    } else {
      setScoutingPosition(null);
    }
    setPerformanceSub(null);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const onDetailBack = () => {
    if (performanceSub) { setPerformanceSub(null); return; }
    if (scoutingPosition) { setScoutingPosition(null); return; }
    setActiveCard(null);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Rise With Us - RISE Football Agency</title>
      </Helmet>

      <AnimatePresence>
        {!introDone && (
          <IntroCinematic
            fullName={fullName}
            lang={lang}
            extraImages={extraImages}
            secondaryParagraph={settings.representation_subtitle_secondary}
            onDone={() => setIntroDone(true)}
          />
        )}
      </AnimatePresence>

      {introDone && (
        <>
          <RepresentationAudio />

          {/* ============ STAGE: HUB ============ */}
          {stage === "hub" && !activeCard && (
            <section className="relative min-h-[100dvh] px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-44 md:px-8 md:pt-8 lg:px-16 bg-black">
              <div className="relative z-10 mx-auto flex w-full max-w-md flex-col md:max-w-4xl lg:max-w-6xl xl:max-w-7xl">
                <header className="relative pb-6 text-center md:pb-10">
                  <div className="mx-auto flex flex-col items-center gap-3 md:gap-5">
                    <img src={riseLogoWhite} alt="RISE" className="h-14 md:h-20 w-auto" />
                    <div className="relative flex w-full items-center gap-2 md:gap-4">
                      <span className="h-px flex-1 bg-primary/45" />
                      <h1 className="whitespace-nowrap font-bebas text-2xl uppercase leading-none tracking-[0.1em] text-foreground sm:text-3xl md:text-4xl md:tracking-[0.12em] lg:text-5xl lg:tracking-[0.14em]">
                        {ot("rise_with_us_heading", "Rise With Us")}, {firstName}
                      </h1>
                      <span className="h-px flex-1 bg-primary/45" />
                    </div>
                    <div className="mt-1 w-full rounded-2xl border border-primary/20 bg-black/55 px-4 py-3 backdrop-blur-sm md:max-w-3xl md:px-6 md:py-4">
                      <p
                        className="text-justify text-[12.4px] leading-relaxed text-foreground/85 md:text-[15.4px] [text-justify:inter-word]"
                        style={{ hyphens: "none", wordBreak: "normal", overflowWrap: "normal" }}
                      >
                        {t(MISSION_BIO_KEY, MISSION_BIO_FALLBACK)}
                      </p>
                    </div>
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-primary/35" />
                </header>

                {/* Pillar boxes — pathway, HQ, training methodology,
                    performance team, Ballon d'Or vision/FOMO,
                    parent's role (U18 only), multilingual support. */}
                <PillarsSection lang={lang} ageGroup={ageGroup} t={t} />

                {GROUPS.map((g: GroupKey) => {
                  const cards = CARD_META.filter((c) => c.group === g && visibleCardKeys.has(c.key));
                  if (cards.length === 0) return null;
                  return (
                    <div key={g} className="scroll-mt-[88px] md:scroll-mt-[96px]">
                      <div className="my-6 flex items-center gap-3 md:my-8">
                        <div className="h-[1px] flex-1 bg-primary/40" />
                        <span className="font-bebas text-xl uppercase tracking-[0.32em] text-primary md:text-2xl">
                          {t(GROUP_LABELS[g].key, GROUP_LABELS[g].fallback)}
                        </span>
                        <div className="h-[1px] flex-1 bg-primary/40" />
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4 lg:gap-5">
                        {cards.map((card, index) => {
                          const Icon = card.icon;
                          return (
                            <motion.button
                              key={card.key}
                              type="button"
                              initial={{ opacity: 0, y: 18 }}
                              animate={{ opacity: 1, y: 0 }}
                              whileHover={{ scale: 1.03, y: -3 }}
                              whileTap={{ scale: 0.97 }}
                              transition={{ delay: index * 0.04, duration: 0.42 }}
                              onClick={() => openCard(card.key)}
                              className="group relative overflow-hidden rounded-[1.45rem] border border-border/60 p-3 text-center md:p-5"
                              style={solidBlackSectionStyle}
                            >
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--gold)/0.08),transparent_60%)]" />
                              <div className="relative flex min-h-[140px] flex-col items-center justify-center gap-3 md:min-h-[200px] md:gap-4 lg:min-h-[220px]">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/35 bg-primary/10 shadow-[0_0_26px_hsl(var(--gold)/0.14)] md:h-14 md:w-14">
                                  <Icon className="h-5 w-5 text-primary md:h-6 md:w-6" />
                                </div>
                                <div>
                                  <p className="font-bebas text-[clamp(1rem,4.2vw,1.375rem)] uppercase leading-[1.05] tracking-[0.08em] whitespace-nowrap overflow-hidden text-ellipsis md:text-[clamp(1.15rem,2.6vw,1.75rem)] md:tracking-[0.1em] lg:text-[clamp(1.25rem,2.2vw,2.125rem)]">
                                    {t(CARD_TITLE_KEYS[card.key].key, CARD_TITLE_KEYS[card.key].fallback)}
                                  </p>
                                  <p className="mx-auto mt-1.5 max-w-[9.5rem] whitespace-pre-line text-[10px] uppercase tracking-[0.14em] text-muted-foreground md:max-w-[11.5rem] md:text-xs">
                                    {formatCardSubtitle(card.key, t(CARD_SUBTITLE_KEYS[card.key].key, CARD_SUBTITLE_KEYS[card.key].fallback))}
                                  </p>
                                </div>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Persistent: Explore Player Portal */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="fixed left-0 right-0 bottom-4 sm:bottom-6 z-40 flex justify-center px-4 pointer-events-none"
                style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
              >
                <Button
                  onClick={goPortal}
                  size="lg"
                  className="pointer-events-auto font-bebas uppercase tracking-[0.2em] shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.6)] bg-primary text-primary-foreground hover:bg-primary/90 px-8"
                >
                  {ot("explore_player_portal", "Explore Our Player Portal")} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            </section>
          )}

          {/* ============ STAGE: HUB → DETAIL VIEW ============ */}
          {stage === "hub" && activeCard && activeMeta && (
            <div className="relative bg-black min-h-[100dvh]">
              <DetailView
                activeCard={activeCard}
                cardContent={cardContent}
                ageGroup={ageGroup}
                scoutingPosition={scoutingPosition}
                setScoutingPosition={setScoutingPosition}
                performanceSub={performanceSub}
                setPerformanceSub={setPerformanceSub}
                recommendedScoutingPosition={null}
                onBack={onDetailBack}
                playerLang={playerLang}
              />

              {/* Scoped slider + back-to-all + next button */}
              <div className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                <div className="mx-auto max-w-md md:max-w-3xl lg:max-w-4xl">
                  {groupSiblings.length > 0 && (
                    <div className="mb-1.5 rounded-2xl border border-border/60 bg-background/85 px-3 py-2 backdrop-blur-md">
                      <div className="mb-2 flex w-full justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (performanceSub) { setPerformanceSub(null); return; }
                            if (scoutingPosition) { setScoutingPosition(null); return; }
                            setActiveCard(null);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-background/70 px-3 py-1 text-[11px] font-bebas uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary/10"
                        >
                          <ChevronLeft className="h-3 w-3" />
                          {performanceSub
                            ? t("representation.back_to_performance", "Back to Performance")
                            : scoutingPosition
                              ? t("representation.back_to_scouting", "Back to Scouting")
                              : t("representation.back_to_all", ot("back_to_all", "Back to all"))}
                        </button>
                      </div>
                      <SectionSliderWheel
                        sections={groupSiblings.map((c) => ({
                          key: c.key,
                          label: t(CARD_TITLE_KEYS[c.key].key, CARD_TITLE_KEYS[c.key].fallback),
                        }))}
                        activeKey={activeCard}
                        onChange={(k) => openCard(k as CardKey)}
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-1">
                    <Button
                      onClick={goPortal}
                      size="lg"
                      className="font-bebas uppercase tracking-[0.2em] shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.6)] bg-primary text-primary-foreground hover:bg-primary/90 px-8"
                    >
                      {ot("explore_player_portal", "Explore Our Player Portal")} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============ STAGE: PORTAL ============ */}
          {stage === "portal" && (
            <section className="relative w-full bg-background" style={{ minHeight: "100dvh" }}>
              <PortalWelcomeOverlay lang={lang} />
              <div
                className="relative mx-auto"
                style={{
                  paddingTop: "max(1rem, env(safe-area-inset-top))",
                  paddingBottom: "calc(max(1rem, env(safe-area-inset-bottom)) + 5.5rem)",
                  paddingLeft: "max(0.5rem, env(safe-area-inset-left))",
                  paddingRight: "max(0.5rem, env(safe-area-inset-right))",
                }}
              >
                <iframe
                  src={tyresePortalEmbed(lang)}
                  title="Live portal preview"
                  className="block w-full rounded-xl border border-border/40 bg-background shadow-[0_30px_80px_-30px_hsl(var(--primary)/0.4)]"
                  style={{ height: "calc(100dvh - 7rem)" }}
                />
              </div>
              <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <Button
                  onClick={goNext}
                  size="lg"
                  className="pointer-events-auto font-bebas uppercase tracking-[0.2em] shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.7)] bg-primary text-primary-foreground hover:bg-primary/90 px-8"
                >
                  {ot("the_next_step", "The Next Step")} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </section>
          )}

          {/* ============ STAGE: FINAL ============ */}
          {stage === "next" && (
            <section className="relative min-h-[100dvh] flex flex-col items-center justify-between px-4 py-12 bg-gradient-to-b from-background to-primary/10">
              <div className="flex-1 flex items-center w-full">
                <div className="max-w-2xl mx-auto text-center space-y-7">
                  <div className="flex items-center justify-center gap-4 sm:gap-6">
                    <img src={riseLogoWhite} alt="RISE" className="h-10 sm:h-14 w-auto" />
                    <X className="h-5 w-5 sm:h-7 sm:w-7 text-foreground/85" strokeWidth={2.5} />
                    {player.image_url ? (
                      <img
                        src={player.image_url}
                        alt={player.name}
                        className="h-12 w-12 sm:h-16 sm:w-16 rounded-full object-cover object-top border-2 border-primary/60 shadow-[0_0_30px_-6px_hsl(var(--primary)/0.6)]"
                      />
                    ) : (
                      <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full border-2 border-primary/60 bg-muted/40" />
                    )}
                  </div>

                  <span className="inline-block text-xs font-bebas uppercase tracking-[0.3em] text-primary border border-primary/30 px-4 py-1.5">
                    {ot("the_next_step", "The Next Step")}
                  </span>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bebas uppercase tracking-wider">
                    {ot("over_to_you", "Over to you")}, {firstName}
                  </h2>
                  <p className="text-base sm:text-lg text-foreground/90 leading-relaxed">
                    {ot("wed_love_to_hear", "We'd love to hear what you think and any questions you have.")}
                  </p>
                  <div className="pt-2">
                    <Button asChild size="lg" className="font-bebas uppercase tracking-wider bg-[#25D366] hover:bg-[#1fb858] text-white">
                      <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="mr-2 h-5 w-5" /> {ot("message_whatsapp", "Message us on WhatsApp")}
                      </a>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="w-full max-w-md mx-auto pt-10">
                <div className="grid grid-cols-2 gap-2 rounded-full border border-border/60 bg-card/40 backdrop-blur p-1">
                  <button
                    type="button"
                    onClick={goHub}
                    className="rounded-full px-3 py-2 font-bebas text-xs uppercase tracking-[0.2em] text-foreground/80 hover:bg-primary/10 hover:text-foreground"
                  >
                    {ot("back_to_info", "Back to Info")}
                  </button>
                  <button
                    type="button"
                    onClick={goPortal}
                    className="rounded-full px-3 py-2 font-bebas text-xs uppercase tracking-[0.2em] text-foreground/80 hover:bg-primary/10 hover:text-foreground"
                  >
                    {ot("back_to_portal", "Back to Portal")}
                  </button>
                </div>

                <div className="pt-6 text-center">
                  <a
                    href={HOMEPAGE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bebas uppercase tracking-[0.28em] text-muted-foreground hover:text-primary"
                  >
                    {ot("visit_homepage", "Visit our homepage")} → risefootballagency.com
                  </a>
                </div>
              </div>
            </section>
          )}

          {stage === "hub" && !activeCard && (
            <footer className="py-8 px-4 text-center">
              <p className="text-xs text-muted-foreground">This page is a private invitation and is not indexed by search engines.</p>
            </footer>
          )}
        </>
      )}
    </div>
  );
};

export default RiseWithUs;
