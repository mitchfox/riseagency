import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Target, Gauge, Users, Sparkles, FileText, PoundSterling, HelpCircle,
  ArrowRight, MessageCircle, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import NotFound from "./NotFound";
import { RiseBrandedLoader } from "@/components/RiseBrandedLoader";
import { RepresentationAudio } from "@/components/RepresentationAudio";
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
}

const TYRESE_PORTAL_EMBED_BASE = "/portal?staff_login=tyelanders%40gmail.com&hide_invoices=1&hide_logout=1";
const tyresePortalEmbed = (lang: string) =>
  `${TYRESE_PORTAL_EMBED_BASE}&lang=${encodeURIComponent(lang || "en")}`;
const WHATSAPP_URL = "https://wa.me/447508342901?text=" + encodeURIComponent("Hi RISE, I just read my invitation");
const HOMEPAGE_URL = "https://www.risefootballagency.com";

type GroupKey = "who" | "how" | "terms";
type CardKey =
  | "scouting" | "expectations"
  | "performance" | "network" | "brand" | "negotiation"
  | "fees" | "agreement" | "faqs";

const GROUP_LABELS: Record<GroupKey, string> = {
  who: "Who We Select",
  how: "How We Work",
  terms: "What Are The Terms",
};

interface CardDef {
  key: CardKey;
  group: GroupKey;
  title: string;
  subtitle: string;
  icon: typeof Search;
  bullets: string[];
}

const CARDS: CardDef[] = [
  { key: "scouting", group: "who", title: "Scouting", subtitle: "How We Assess Star Potential", icon: Search,
    bullets: [
      "Position-specific profiling against elite benchmarks.",
      "Multi-match observation, never a one-off snapshot.",
      "Will, skill and potential weighted equally.",
      "Cross-checked against our Premier League performance team.",
    ] },
  { key: "expectations", group: "who", title: "Expectations", subtitle: "Standards on and off the pitch", icon: Target,
    bullets: [
      "Train and live like a professional from day one.",
      "Be coachable, on time and accountable.",
      "Look after your body, your sleep and your nutrition.",
      "Treat every minute on the pitch as a chance to build.",
    ] },
  { key: "performance", group: "how", title: "Performance", subtitle: "How We Ensure On-Pitch Success", icon: Gauge,
    bullets: [
      "Action-by-action analysis of every match.",
      "R90 scoring against Premier League standards.",
      "Strength, power and speed programmes built around your position.",
      "Nutrition, technique and psychology support layered in.",
    ] },
  { key: "network", group: "how", title: "Club Network", subtitle: "Introductions with proper context", icon: Users,
    bullets: [
      "Active outreach to clubs that genuinely fit your profile.",
      "Trusted relationships across multiple leagues and federations.",
      "Strategic timing of conversations to maximise your value.",
      "Reports and clips delivered the way scouts want them.",
    ] },
  { key: "brand", group: "how", title: "Brand", subtitle: "A sharper public-facing profile", icon: Sparkles,
    bullets: [
      "Highlight reels and content built around your real game.",
      "Your own personal portal as a single source of truth.",
      "Coordinated messaging across the channels that matter.",
      "Always honest, never overhyped.",
    ] },
  { key: "negotiation", group: "how", title: "Negotiation", subtitle: "Short and long-term deal strategy", icon: FileText,
    bullets: [
      "Plain-language contract reviews.",
      "Negotiation handled by people who understand the market.",
      "Multi-year planning so each move builds on the last.",
      "Your interests protected at every stage.",
    ] },
  { key: "fees", group: "terms", title: "Fees", subtitle: "Clear from the start", icon: PoundSterling,
    bullets: [
      "Standard FA-compliant agency fees on contracts and transfers.",
      "Aligned to your career progression, not hidden line items.",
      "Everything written down and discussed before anything is signed.",
      "Independent legal advice always welcomed.",
    ] },
  { key: "agreement", group: "terms", title: "Agreement", subtitle: "What the relationship covers", icon: FileText,
    bullets: [
      "Clear scope of representation and services.",
      "Defined term length with proper exit terms.",
      "Parental involvement throughout for under-18s.",
      "Agreement reviewed with you line by line.",
    ] },
  { key: "faqs", group: "terms", title: "FAQs", subtitle: "Quick answers before you reach out", icon: HelpCircle,
    bullets: [
      "How does the process actually start?",
      "What is the day-to-day support like?",
      "How do clubs hear about me?",
      "What happens if it isn't working?",
    ] },
];

const GROUPS: GroupKey[] = ["who", "how", "terms"];

/* ============== TRANSLATION HELPERS ============== */
/** Static dictionary for the new offer-page-only strings. Card titles,
 *  bullets, group labels and the mission/intro lines are pulled from
 *  the shared `representation.*` keys via the `translations` table. */
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
    en: "As part of our extensive scouting efforts, we are pleased to say that you stood out with the capability to become a star",
    es: "Como parte de nuestro extenso trabajo de scouting, nos complace decirte que destacaste con la capacidad de convertirte en una estrella",
    pt: "Como parte do nosso trabalho de scouting, temos o prazer de dizer que se destacou com capacidade para se tornar uma estrela",
    fr: "Dans le cadre de notre travail de détection, nous sommes ravis de vous dire que vous vous êtes distingué avec le potentiel de devenir une star",
    de: "Im Rahmen unserer umfangreichen Scouting-Arbeit freuen wir uns, dir mitzuteilen, dass du mit dem Potenzial zu einem Star herausgestochen bist",
    it: "Nell'ambito del nostro accurato lavoro di scouting, siamo lieti di dirti che ti sei distinto con il potenziale per diventare una stella",
    pl: "W ramach naszej szeroko zakrojonej pracy skautingowej z radością informujemy, że wyróżniłeś się jako potencjalna gwiazda",
    cs: "V rámci našeho rozsáhlého skautingu nás těší, že jste vynikl s potenciálem stát se hvězdou",
    ru: "В рамках нашей масштабной скаутской работы мы рады сообщить, что вы выделились с потенциалом стать звездой",
    tr: "Geniş kapsamlı scouting çalışmamızın bir parçası olarak, yıldız olma potansiyeliyle öne çıktığını söylemekten mutluluk duyuyoruz",
    hr: "U sklopu našeg opsežnog skautskog rada, zadovoljstvo nam je reći da si se istaknuo s potencijalom da postaneš zvijezda",
    no: "Som en del av vårt omfattende speiderarbeid er vi glade for å si at du skilte deg ut med kapasitet til å bli en stjerne",
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
  rise_with_us_heading: {
    en: "Rise With Us", es: "Crece Con Nosotros", pt: "Cresça Connosco",
    fr: "Grandissez Avec Nous", de: "Wachse Mit Uns", it: "Cresci Con Noi",
    pl: "Rośnij Z Nami", cs: "Rosti S Námi", ru: "Расти С Нами",
    tr: "Bizimle Yüksel", hr: "Rasti S Nama", no: "Vokse Med Oss",
  },
};

const offerT = (lang: string, key: string, fallback: string): string => {
  const code = (lang || "en") as Lang;
  return offerDict[key]?.[code] || offerDict[key]?.en || fallback;
};

/** Mission/intro paragraph already translated on representation page. */
const MISSION_BIO_KEY = "representation.mission_bio";
const MISSION_BIO_FALLBACK =
  "RISE Football Agency is built on a deep understanding of performance and how it shapes decisions at every level of the game. We represent and work directly with players and clubs through an established international network, underpinned by an unrivalled background in developing Premier League level talent.";

/* ============== INTRO ============== */
const IntroCinematic = ({
  firstName, lang, onDone,
}: { firstName: string; lang: string; onDone: () => void }) => {
  const [phase, setPhase] = useState(0);
  // 0: invitation chip, 1: stood-out line, 2: differentiate line, 3: RISE WITH US
  const totalPhases = 4;
  const advance = () => {
    if (phase >= totalPhases - 1) onDone();
    else setPhase((p) => p + 1);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black"
      onClick={advance}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
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
        style={{ background: "radial-gradient(circle at 50% 50%, hsl(var(--gold) / 0.18), transparent 60%)" }}
        animate={{ opacity: [0.4, 0.9, 0.5] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Text reveal */}
      <div className="relative z-10 max-w-2xl px-6 text-center">
        <AnimatePresence mode="wait">
          {phase === 0 && (
            <motion.div key="p0"
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="font-bebas text-base sm:text-lg uppercase tracking-[0.3em] text-primary">
                {offerT(lang, "invitation_to", "An invitation to")}
              </p>
              <p className="mt-3 font-bebas text-4xl sm:text-6xl uppercase tracking-wider text-foreground">
                {firstName}
              </p>
            </motion.div>
          )}
          {phase === 1 && (
            <motion.p key="p1"
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.9 }}
              className="text-lg sm:text-2xl md:text-3xl font-semibold leading-snug text-foreground"
            >
              {offerT(lang, "stood_out_line", "As part of our extensive scouting efforts, we are pleased to say that you stood out with the capability to become a star")},{" "}
              <span className="text-primary">{firstName}</span>.
            </motion.p>
          )}
          {phase === 2 && (
            <motion.p key="p2"
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.9 }}
              className="text-base sm:text-xl md:text-2xl leading-relaxed text-foreground/95"
            >
              {offerT(lang, "differentiate_line", "We differentiate players by their will, skill and potential, to find those who will use our English Premier League Performance Team to the fullest effect to realise their potential on the pitch and in life.")}
            </motion.p>
          )}
          {phase === 3 && (
            <motion.div key="p3"
              initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center gap-4"
            >
              <img src={riseLogoWhite} alt="RISE" className="h-14 sm:h-20 w-auto" />
              <p className="font-bebas text-3xl sm:text-5xl md:text-6xl uppercase tracking-[0.18em] text-foreground">
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
  const [settings, setSettings] = useState<OfferSettings>({ hidden_sections: [], section_images: {} });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [activeCard, setActiveCard] = useState<CardKey | null>(null);
  const [stage, setStage] = useState<"hub" | "portal" | "next">("hub");

  const portalRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLDivElement>(null);

  // Representation key translations fetched from the shared translations
  // table. Cards/group labels/mission bio use these so we stay in sync
  // with the public representation page.
  const [repTr, setRepTr] = useState<Record<string, string>>({});

  const isPickerMode = !slug;

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
        if (sData) {
          setSettings({
            hidden_sections: (sData.hidden_sections || []) as string[],
            section_images: (sData.section_images || {}) as Record<string, string>,
          });
        }
        const lang = data.portal_language || "en";
        if (lang !== "en") {
          const { data: tData } = await (supabase as any)
            .from("translations")
            .select("key, value")
            .eq("language", lang)
            .like("key", "representation.%");
          if (tData) {
            const map: Record<string, string> = {};
            (tData as Array<{ key: string; value: string }>).forEach((r) => { map[r.key] = r.value; });
            setRepTr(map);
          }
        }
      }
      setLoading(false);
    })();
  }, [slug, isPickerMode]);

  if (loading) return <RiseBrandedLoader />;
  if (notFound || !player) return <NotFound />;

  const firstName = player.name.split(" ")[0];
  const visibleCards = CARDS.filter((c) => !settings.hidden_sections.includes(c.key));
  const lang = player.portal_language || "en";
  const tx = (key: string, fallback: string) => repTr[key] || fallback;
  const ot = (key: string, fallback: string) => offerT(lang, key, fallback);
  const groupLabel = (g: GroupKey) =>
    tx(`representation.${g === "who" ? "who_we_select" : g === "how" ? "how_we_work" : "what_are_the_terms"}`, GROUP_LABELS[g]);
  const cardKeyMap: Record<CardKey, string> = {
    scouting: "scouting", expectations: "expectations",
    performance: "performance", network: "club_network", brand: "brand", negotiation: "negotiation",
    fees: "fees", agreement: "agreement", faqs: "faqs",
  };
  const cardTitle = (c: CardDef) => tx(`representation.${cardKeyMap[c.key]}`, c.title);
  const cardSubtitle = (c: CardDef) => tx(`representation.${cardKeyMap[c.key]}_subtitle`, c.subtitle);

  const goPortal = () => {
    setStage("portal");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goNext = () => {
    setStage("next");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goHub = () => { setStage("hub"); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const activeCardDef = activeCard ? CARDS.find((c) => c.key === activeCard) ?? null : null;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Rise With Us - RISE Football Agency</title>
      </Helmet>

      <AnimatePresence>
        {!introDone && (
          <IntroCinematic
            firstName={firstName}
            lang={lang}
            onDone={() => setIntroDone(true)}
          />
        )}
      </AnimatePresence>

      {introDone && (
        <>
          <RepresentationAudio />

          {/* ============ STAGE: HUB (representation cards) ============ */}
          {stage === "hub" && (
          <section className="relative min-h-[100dvh] px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-44 md:px-8 md:pt-8 lg:px-16">
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
                    <p className="text-justify text-[12.4px] leading-relaxed text-foreground/85 md:text-[15.4px]">
                      {tx(MISSION_BIO_KEY, MISSION_BIO_FALLBACK)}
                    </p>
                  </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-primary/35" />
              </header>

              {GROUPS.map((g) => {
                const cards = visibleCards.filter((c) => c.group === g);
                if (cards.length === 0) return null;
                return (
                  <div key={g} className="scroll-mt-[88px]">
                    <div className="my-6 flex items-center gap-3 md:my-8">
                      <div className="h-[1px] flex-1 bg-primary/40" />
                      <span className="font-bebas text-xl uppercase tracking-[0.32em] text-primary md:text-2xl">
                        {groupLabel(g)}
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
                            onClick={() => setActiveCard(card.key)}
                            className="group relative overflow-hidden rounded-[1.45rem] border border-border/60 p-3 text-center md:p-5"
                            style={{ backgroundColor: "hsl(0 0% 4%)" }}
                          >
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--gold)/0.08),transparent_60%)]" />
                            <div className="relative flex min-h-[140px] flex-col items-center justify-center gap-3 md:min-h-[200px] md:gap-4 lg:min-h-[220px]">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/35 bg-primary/10 shadow-[0_0_26px_hsl(var(--gold)/0.14)] md:h-14 md:w-14">
                                <Icon className="h-5 w-5 text-primary md:h-6 md:w-6" />
                              </div>
                              <div>
                                <p className="font-bebas text-[clamp(1rem,4.2vw,1.375rem)] uppercase leading-[1.05] tracking-[0.08em] whitespace-nowrap overflow-hidden text-ellipsis md:text-[clamp(1.15rem,2.6vw,1.75rem)] md:tracking-[0.1em] lg:text-[clamp(1.25rem,2.2vw,2.125rem)]">
                                  {cardTitle(card)}
                                </p>
                                <p className="mx-auto mt-1.5 max-w-[9.5rem] text-[10px] uppercase tracking-[0.14em] text-muted-foreground md:max-w-[11.5rem] md:text-xs">
                                  {cardSubtitle(card)}
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
          </section>
          )}

          {/* Card detail overlay */}
          <AnimatePresence>
            {activeCardDef && (
              <motion.div
                className="fixed inset-0 z-50 overflow-y-auto bg-black/95 backdrop-blur-md"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-12 md:px-8">
                  <button
                    type="button"
                    onClick={() => setActiveCard(null)}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-background/70 px-3 py-1 text-[11px] font-bebas uppercase tracking-[0.18em] text-primary hover:bg-primary/10"
                  >
                    <X className="h-3 w-3" /> Close
                  </button>
                  <div className="mt-6 flex flex-col items-center gap-3 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/35 bg-primary/10">
                      <activeCardDef.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="font-bebas text-3xl uppercase tracking-[0.12em] text-foreground md:text-5xl">
                      {cardTitle(activeCardDef)}
                    </h2>
                    <p className="text-xs uppercase tracking-[0.24em] text-primary md:text-sm">
                      {cardSubtitle(activeCardDef)}
                    </p>
                  </div>
                  <ul className="mt-8 space-y-3">
                    {activeCardDef.bullets.map((b, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex gap-3 rounded-2xl border border-border/60 bg-card/55 p-4 text-sm leading-relaxed text-foreground/85 md:p-5 md:text-base"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{tx(`representation.${cardKeyMap[activeCardDef.key]}_p${i + 1}`, b)}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ============ STAGE: PORTAL ============ */}
          {stage === "portal" && (
            <section ref={portalRef} className="relative w-full bg-background" style={{ minHeight: "100dvh" }}>
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
              <div
                className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
              >
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
            <section ref={nextRef} className="relative min-h-[100dvh] flex flex-col items-center justify-between px-4 py-12 bg-gradient-to-b from-background to-primary/10">
              <div className="flex-1 flex items-center w-full">
                <div className="max-w-2xl mx-auto text-center space-y-7">
                  {/* Collaboration emblem: RISE white logo + X + circular player image */}
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

              {/* Back-navigation slider: only on final */}
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

                {/* Homepage link at very bottom */}
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

          {/* Persistent THE NEXT STEP button while on hub */}
          {stage === "hub" && (
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
          )}

          {stage === "hub" && (
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
