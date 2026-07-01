import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ChevronLeft, MessageCircle, X,
  Compass, MapPin, Dumbbell, HeartPulse, Trophy, Users2, Languages,
  Play,
  CalendarClock, CheckCircle2,
} from "lucide-react";
import { SlantedBox, widont } from "@/components/SlantedBox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { enGB, es, pt, fr, de, it, pl, cs, ru, tr, hr, nb } from "date-fns/locale";
import { insertStaffNotification } from "@/lib/staffNotifications";
import NotFound from "./NotFound";
import { RiseBrandedLoader } from "@/components/RiseBrandedLoader";
import { RepresentationAudio } from "@/components/RepresentationAudio";
import { usePlayerLanguageTranslations } from "@/hooks/usePlayerLanguageTranslations";
import { useAutoTranslateStrings } from "@/hooks/useAutoTranslateStrings";
import { SectionSliderWheel } from "@/components/SectionSliderWheel";
import { ScoutingDatabaseCard } from "@/components/risewithus/ScoutingDatabaseCard";
import { ReadOnlyAnnotationOverlay } from "@/components/portal/ReadOnlyAnnotationOverlay";
import {
  CARD_META, GROUPS, GROUP_LABELS,
  CARD_TITLE_KEYS, CARD_SUBTITLE_KEYS,
  formatCardSubtitle, solidBlackSectionStyle,
  getCardContent, MISSION_BIO_KEY, MISSION_BIO_FALLBACK,
  DetailView,
  TitlePlate,
  type CardKey, type AgeGroup, type GroupKey,
  type PerformanceSub,
} from "./RequestRepresentation";
import { type ScoutingPosition } from "@/data/scoutingSkills";
import { normalisePosition } from "@/lib/positionNormalise";
import riseLogoWhiteLowRes from "@/assets/RISEWhite.png";
import riseLogoWhiteHQ from "@/assets/RISEWhiteHQ.png";
// Use the high-resolution mark everywhere - the low-res file is kept around
// only to keep the asset import graph stable.
const riseLogoWhite = riseLogoWhiteHQ;
void riseLogoWhiteLowRes;
import smudgedMarbleBg from "@/assets/smudged-marble-login.png";
import ballondorAsset from "@/assets/ballondor.png.asset.json";

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
  intro_media: Array<{ id: string; kind: "image" | "video"; url: string; show: boolean; position: "intro" | "hub" | "both"; objectPosition?: string; annotations?: any[] }>;
  rise_with_us_under18?: boolean;
  representation_subtitle_secondary?: string | null;
  show_database_card?: boolean | null;
  show_have_agent?: boolean;
}

const TYRESE_PORTAL_EMBED_BASE = "/portal?staff_login=tyelanders%40gmail.com&hide_invoices=1&hide_logout=1&hide_music=1";
const tyresePortalEmbed = (lang: string) =>
  `${TYRESE_PORTAL_EMBED_BASE}&lang=${encodeURIComponent(lang || "en")}`;
const WHATSAPP_BASE = "https://wa.me/447508342901";
/**
 * Translate the opening line of the WhatsApp deep link so the prospect
 * sees a message in their own language when they tap "Message us on
 * WhatsApp". English is the fallback so the link is always usable.
 */
const buildWhatsappUrl = (lang: string) => {
  const msg = offerT(lang, "rwu_whatsapp_opener", "Hi RISE, I just read my invitation");
  return `${WHATSAPP_BASE}?text=${encodeURIComponent(msg)}`;
};
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
  and_family: {
    en: "& family", es: "y familia", pt: "e família",
    fr: "et famille", de: "& Familie", it: "e famiglia",
    pl: "i rodzina", cs: "a rodina", ru: "и семья",
    tr: "ve aile", hr: "i obitelj", no: "og familie",
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
  i_already_have_agent: {
    en: "I already have an agent",
    es: "Ya tengo agente",
    pt: "Já tenho agente",
    fr: "J'ai déjà un agent",
    de: "Ich habe bereits einen Berater",
    it: "Ho già un agente",
    pl: "Mam już agenta",
    cs: "Už mám agenta",
    ru: "У меня уже есть агент",
    tr: "Zaten bir menajerim var",
    hr: "Već imam agenta",
    no: "Jeg har allerede en agent",
  },
  already_agent_thank_you: {
    en: "Thank you for letting us know. We want to support your long-term career, so please don't hesitate to reach out to us at a later date if your situation changes.",
    es: "Gracias por avisarnos. Queremos apoyar tu carrera a largo plazo, así que no dudes en escribirnos más adelante si tu situación cambia.",
    pt: "Obrigado por nos avisares. Queremos apoiar a tua carreira a longo prazo, por isso não hesites em contactar-nos mais tarde se a tua situação mudar.",
    fr: "Merci de nous l'avoir dit. Nous voulons soutenir ta carrière sur le long terme, alors n'hésite pas à nous recontacter plus tard si ta situation évolue.",
    de: "Danke für die Info. Wir möchten deine langfristige Karriere unterstützen — melde dich gerne wieder, falls sich deine Situation ändert.",
    it: "Grazie per averci avvisati. Vogliamo sostenere la tua carriera a lungo termine, quindi non esitare a contattarci più avanti se la tua situazione cambia.",
    pl: "Dziękujemy za informację. Chcemy wspierać Twoją karierę długofalowo, więc nie wahaj się napisać do nas w przyszłości, jeśli sytuacja się zmieni.",
    cs: "Děkujeme, žes nám dal vědět. Chceme podpořit tvou dlouhodobou kariéru, takže se na nás neváhej ozvat později, pokud se tvá situace změní.",
    ru: "Спасибо, что сообщили. Мы хотим поддержать вашу карьеру в долгосрочной перспективе, поэтому, если ситуация изменится, обязательно напишите нам позже.",
    tr: "Bildirdiğin için teşekkürler. Uzun vadeli kariyerini desteklemek istiyoruz, durumun değişirse ileride bize ulaşmaktan çekinme.",
    hr: "Hvala što si nam javio. Želimo podržati tvoju dugoročnu karijeru pa nas slobodno kontaktiraj kasnije ako se situacija promijeni.",
    no: "Takk for at du gir oss beskjed. Vi vil støtte karrieren din på lang sikt, så ikke nøl med å ta kontakt senere hvis situasjonen endrer seg.",
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
  /* ---------- Vision / Ballon d'Or card ---------- */
  "vision.eyebrow": {
    en: "Our vision", es: "Nuestra visión", pt: "A nossa visão",
    fr: "Notre vision", de: "Unsere Vision", it: "La nostra visione",
    pl: "Nasza wizja", cs: "Naše vize", ru: "Наше видение",
    tr: "Vizyonumuz", hr: "Naša vizija", no: "Vår visjon",
  },
  "vision.headline": {
    en: "Only The Best.", es: "Sólo Los Mejores.", pt: "Só Os Melhores.",
    fr: "Seulement Les Meilleurs.", de: "Nur Die Besten.", it: "Solo I Migliori.",
    pl: "Tylko Najlepsi.", cs: "Jen Ti Nejlepší.", ru: "Только Лучшие.",
    tr: "Sadece En İyiler.", hr: "Samo Najbolji.", no: "Bare De Beste.",
  },
  "vision.body_anon": {
    en: "We are on a 10 year mission to train and represent a future Ballon d'Or winner and World Team of the Year player at every position. We pick a small group of players we genuinely believe can get there and back them all the way. If you have what it takes to work with us, reach out to better understand how we can realise potential together.",
    es: "Estamos en una misión de 10 años para formar y representar a un futuro ganador del Balón de Oro y a un jugador del Equipo Mundial del Año en cada posición. Elegimos a un grupo reducido de jugadores que de verdad creemos pueden llegar y los apoyamos hasta el final. Si tienes lo necesario para trabajar con nosotros, contáctanos para entender mejor cómo realizar el potencial juntos.",
    pt: "Estamos numa missão de 10 anos para formar e representar um futuro vencedor da Bola de Ouro e um jogador da Equipa Mundial do Ano em cada posição. Escolhemos um pequeno grupo de jogadores em quem acreditamos genuinamente e apoiamo-los até ao fim. Se tens o que é preciso para trabalhar connosco, fala connosco para perceber melhor como realizar o potencial juntos.",
    fr: "Nous sommes engagés dans une mission de 10 ans pour former et représenter un futur Ballon d'Or et un joueur de l'Équipe Mondiale de l'Année à chaque poste. Nous choisissons un petit groupe de joueurs que nous croyons sincèrement capables d'y parvenir et nous les soutenons jusqu'au bout. Si tu as ce qu'il faut pour travailler avec nous, contacte-nous pour mieux comprendre comment réaliser ce potentiel ensemble.",
    de: "Wir verfolgen eine 10-Jahres-Mission, einen zukünftigen Ballon-d'Or-Sieger und einen Spieler der Weltauswahl des Jahres auf jeder Position auszubilden und zu vertreten. Wir wählen eine kleine Gruppe von Spielern, von denen wir wirklich überzeugt sind, und unterstützen sie bis zum Ende. Wenn du das Zeug hast, mit uns zu arbeiten, melde dich, um besser zu verstehen, wie wir das Potenzial gemeinsam entfalten können.",
    it: "Abbiamo una missione decennale: formare e rappresentare un futuro vincitore del Pallone d'Oro e un giocatore del World Team of the Year in ogni ruolo. Scegliamo un piccolo gruppo di giocatori in cui crediamo davvero e li sosteniamo fino in fondo. Se hai ciò che serve per lavorare con noi, contattaci per capire meglio come realizzare insieme il tuo potenziale.",
    pl: "Mamy 10-letnią misję: szkolić i reprezentować przyszłego zdobywcę Złotej Piłki i piłkarza Drużyny Roku Świata na każdej pozycji. Wybieramy małą grupę zawodników, w których naprawdę wierzymy, i wspieramy ich do końca. Jeśli masz to, czego potrzeba, by z nami pracować, odezwij się, aby lepiej zrozumieć, jak wspólnie zrealizujemy potencjał.",
    cs: "Máme 10letou misi: vychovat a zastupovat budoucího vítěze Zlatého míče a hráče Světového týmu roku na každém postu. Vybíráme malou skupinu hráčů, o kterých opravdu věříme, že to dokážou, a podporujeme je až do konce. Pokud na to máš, ozvi se, abychom společně lépe pochopili, jak naplnit potenciál.",
    ru: "У нас 10-летняя миссия — подготовить и представлять будущего обладателя «Золотого мяча» и игрока Сборной мира на каждой позиции. Мы выбираем небольшую группу игроков, в которых искренне верим, и поддерживаем их до конца. Если в тебе есть всё нужное, свяжись с нами, чтобы вместе понять, как раскрыть потенциал.",
    tr: "10 yıllık bir hedefimiz var: her mevkide gelecekteki bir Ballon d'Or sahibini ve Yılın Dünya Takımı oyuncusunu yetiştirip temsil etmek. Gerçekten başarabileceğine inandığımız küçük bir oyuncu grubunu seçer ve sonuna kadar destekleriz. Bizimle çalışacak donanıma sahipsen, potansiyeli birlikte nasıl gerçekleştirebileceğimizi anlamak için iletişime geç.",
    hr: "Imamo 10-godišnju misiju: razvijati i zastupati budućeg dobitnika Zlatne lopte i igrača Svjetske momčadi godine na svakoj poziciji. Biramo malu skupinu igrača u koje istinski vjerujemo i podržavamo ih do kraja. Ako imaš ono što treba za rad s nama, javi se kako bismo zajedno bolje razumjeli kako ostvariti potencijal.",
    no: "Vi har et tiårsoppdrag med å utvikle og representere en framtidig Ballon d'Or-vinner og en spiller på World Team of the Year på hver posisjon. Vi velger en liten gruppe spillere vi virkelig tror kan nå dit, og støtter dem hele veien. Har du det som skal til for å jobbe med oss, ta kontakt så vi sammen kan forstå hvordan vi kan realisere potensialet.",
  },
  "vision.cta": {
    en: "Let's Meet", es: "Reunámonos", pt: "Vamos Falar",
    fr: "Rencontrons-nous", de: "Lass uns treffen", it: "Incontriamoci",
    pl: "Spotkajmy się", cs: "Domluvme schůzku", ru: "Давайте встретимся",
    tr: "Tanışalım", hr: "Nađimo se", no: "La oss møtes",
  },
  /* ---------- Why Rise card + pillars heading ---------- */
  why_rise_card: {
    en: "Why Rise?", es: "¿Por qué Rise?", pt: "Porquê Rise?",
    fr: "Pourquoi Rise?", de: "Warum Rise?", it: "Perché Rise?",
    pl: "Dlaczego Rise?", cs: "Proč Rise?", ru: "Почему Rise?",
    tr: "Neden Rise?", hr: "Zašto Rise?", no: "Hvorfor Rise?",
  },
  vision_subtitle_card: {
    en: "A future built with the best",
    es: "Un futuro construido con los mejores",
    pt: "Um futuro construído com os melhores",
    fr: "Un avenir bâti avec les meilleurs",
    de: "Eine Zukunft, gebaut mit den Besten",
    it: "Un futuro costruito con i migliori",
    pl: "Przyszłość budowana z najlepszymi",
    cs: "Budoucnost budovaná s nejlepšími",
    ru: "Будущее, построенное с лучшими",
    tr: "En iyilerle inşa edilen bir gelecek",
    hr: "Budućnost izgrađena s najboljima",
    no: "En framtid bygget med de beste",
  },
  rwu_pillars_heading: {
    en: "Why RISE", es: "Por qué RISE", pt: "Porquê RISE",
    fr: "Pourquoi RISE", de: "Warum RISE", it: "Perché RISE",
    pl: "Dlaczego RISE", cs: "Proč RISE", ru: "Почему RISE",
    tr: "Neden RISE", hr: "Zašto RISE", no: "Hvorfor RISE",
  },
  /* ---------- Pillars ---------- */
  rwu_pathway_title: {
    en: "Pathway Planning", es: "Planificación del Camino", pt: "Planeamento do Percurso",
    fr: "Planification du Parcours", de: "Karriereplanung", it: "Pianificazione del Percorso",
    pl: "Planowanie Ścieżki", cs: "Plánování Cesty", ru: "Планирование Пути",
    tr: "Kariyer Planlaması", hr: "Planiranje Puta", no: "Veiplanlegging",
  },
  rwu_pathway_body: {
    en: "We map out a clear journey from where you are today to where you want to be. Each step is chosen to remove the risk of failure and fit your appetite for risk, so you always know what comes next and why.",
    es: "Trazamos un camino claro desde donde estás hoy hasta donde quieres llegar. Cada paso se elige para reducir el riesgo de fracaso y ajustarse a tu tolerancia al riesgo, para que siempre sepas qué viene después y por qué.",
    pt: "Traçamos um percurso claro desde onde estás hoje até onde queres chegar. Cada passo é escolhido para reduzir o risco de falha e adequar-se ao teu apetite para o risco, para que saibas sempre o que vem a seguir e porquê.",
    fr: "Nous traçons un parcours clair entre ta situation actuelle et celle que tu vises. Chaque étape est choisie pour réduire le risque d'échec et correspondre à ton appétit pour le risque, afin que tu saches toujours ce qui vient ensuite et pourquoi.",
    de: "Wir planen einen klaren Weg von dort, wo du heute stehst, bis dorthin, wo du hin willst. Jeder Schritt minimiert das Risiko des Scheiterns und passt zu deiner Risikobereitschaft, damit du immer weißt, was als Nächstes kommt und warum.",
    it: "Tracciamo un percorso chiaro da dove sei oggi a dove vuoi arrivare. Ogni tappa è scelta per ridurre il rischio di fallimento e adattarsi alla tua propensione al rischio, così sai sempre cosa viene dopo e perché.",
    pl: "Wyznaczamy jasną drogę od miejsca, w którym jesteś dziś, do miejsca, w którym chcesz być. Każdy krok jest dobrany tak, by ograniczyć ryzyko niepowodzenia i pasować do twojej tolerancji ryzyka.",
    cs: "Naplánujeme jasnou cestu z místa, kde jsi dnes, tam, kam chceš dojít. Každý krok je vybrán tak, aby snížil riziko neúspěchu a odpovídal tvé toleranci k riziku.",
    ru: "Мы выстраиваем чёткий путь от того, где ты сейчас, до того, где хочешь быть. Каждый шаг подобран так, чтобы снизить риск неудачи и соответствовать твоей готовности к риску.",
    tr: "Bugün bulunduğun yerden ulaşmak istediğin yere kadar net bir yol çiziyoruz. Her adım, başarısızlık riskini azaltacak ve risk iştahına uyacak şekilde seçilir.",
    hr: "Trasiramo jasan put od mjesta gdje si danas do onoga gdje želiš biti. Svaki je korak odabran da smanji rizik neuspjeha i odgovara tvojoj sklonosti riziku.",
    no: "Vi tegner opp en tydelig vei fra der du er i dag til dit du vil. Hvert steg er valgt for å fjerne risikoen for å mislykkes og passe din risikovilje.",
  },
  rwu_hq_title: {
    en: "London HQ", es: "Sede en Londres", pt: "Sede em Londres",
    fr: "QG à Londres", de: "Hauptsitz London", it: "Sede a Londra",
    pl: "Siedziba w Londynie", cs: "Sídlo v Londýně", ru: "Штаб-квартира в Лондоне",
    tr: "Londra Merkez", hr: "Sjedište u Londonu", no: "Hovedkontor i London",
  },
  rwu_hq_badge: {
    en: "London, England", es: "Londres, Inglaterra", pt: "Londres, Inglaterra",
    fr: "Londres, Angleterre", de: "London, England", it: "Londra, Inghilterra",
    pl: "Londyn, Anglia", cs: "Londýn, Anglie", ru: "Лондон, Англия",
    tr: "Londra, İngiltere", hr: "London, Engleska", no: "London, England",
  },
  rwu_hq_body: {
    en: "Our base in London puts us inside the world's most-watched football market, with daily access to Premier League contacts, recruitment staff and decision-makers.",
    es: "Nuestra base en Londres nos sitúa en el mercado de fútbol más visto del mundo, con acceso diario a contactos de la Premier League, personal de captación y responsables de decisiones.",
    pt: "A nossa base em Londres coloca-nos dentro do mercado de futebol mais visto do mundo, com acesso diário a contactos da Premier League, equipas de recrutamento e decisores.",
    fr: "Notre base à Londres nous place au cœur du marché du football le plus suivi au monde, avec un accès quotidien aux contacts de la Premier League, au recrutement et aux décideurs.",
    de: "Unser Standort in London bringt uns mitten in den meistgesehenen Fußballmarkt der Welt, mit täglichem Zugang zu Premier-League-Kontakten, Scouting-Teams und Entscheidungsträgern.",
    it: "La nostra sede a Londra ci colloca nel mercato calcistico più seguito al mondo, con accesso quotidiano ai contatti della Premier League, ai recruiter e ai decision-maker.",
    pl: "Nasza siedziba w Londynie umieszcza nas w sercu najpopularniejszego rynku piłkarskiego świata, z codziennym dostępem do kontaktów w Premier League, skautów i decydentów.",
    cs: "Naše sídlo v Londýně nás staví doprostřed nejsledovanějšího fotbalového trhu na světě s každodenním přístupem ke kontaktům v Premier League, skautům a rozhodovacím autoritám.",
    ru: "Наша база в Лондоне ставит нас в центр самого популярного футбольного рынка мира с ежедневным доступом к контактам АПЛ, скаутам и людям, принимающим решения.",
    tr: "Londra'daki üssümüz bizi dünyanın en çok izlenen futbol pazarının içine yerleştirir; Premier Lig bağlantılarına, scouting ekiplerine ve karar vericilere her gün erişim sağlar.",
    hr: "Naša baza u Londonu smješta nas u najgledanije nogometno tržište na svijetu, uz svakodnevni pristup kontaktima Premier lige, skautima i donositeljima odluka.",
    no: "Vår base i London plasserer oss midt i verdens mest sette fotballmarked, med daglig tilgang til Premier League-kontakter, speidere og beslutningstakere.",
  },
  rwu_training_title: {
    en: "Training Methodology", es: "Metodología de Entrenamiento", pt: "Metodologia de Treino",
    fr: "Méthodologie d'Entraînement", de: "Trainingsmethodik", it: "Metodologia di Allenamento",
    pl: "Metodologia Treningu", cs: "Metodika Tréninku", ru: "Методика Тренировок",
    tr: "Antrenman Metodolojisi", hr: "Metodologija Treninga", no: "Treningsmetodikk",
  },
  rwu_training_body: {
    en: "Programming is built around match weeks, not generic templates. Strength, power, speed and technical work are sequenced to peak you for the games that matter and recover you properly after.",
    es: "La programación se construye en torno a las semanas de partido, no a plantillas genéricas. La fuerza, la potencia, la velocidad y el trabajo técnico se secuencian para que llegues en tu pico a los partidos importantes y recuperes bien después.",
    pt: "A programação é construída em torno das semanas de jogo, não em modelos genéricos. Força, potência, velocidade e trabalho técnico são sequenciados para chegares no pico aos jogos que importam e recuperares bem depois.",
    fr: "La planification se construit autour des semaines de match, pas de modèles génériques. Force, puissance, vitesse et travail technique sont enchaînés pour que tu sois au top pour les matchs importants et que tu récupères correctement ensuite.",
    de: "Die Programmierung wird um Spielwochen herum aufgebaut, nicht um generische Vorlagen. Kraft, Power, Schnelligkeit und Technik werden so getaktet, dass du für die wichtigen Spiele in Topform bist und danach richtig regenerierst.",
    it: "La programmazione è costruita attorno alle settimane di partita, non a schemi generici. Forza, potenza, velocità e lavoro tecnico sono organizzati per portarti al picco nelle partite importanti e farti recuperare bene dopo.",
    pl: "Programowanie buduje się wokół tygodni meczowych, a nie ogólnych szablonów. Siła, moc, szybkość i praca techniczna są tak ułożone, byś osiągał szczyt formy na ważne mecze i dobrze regenerował się po nich.",
    cs: "Plánování stavíme kolem zápasových týdnů, ne podle obecných šablon. Síla, výbušnost, rychlost i technická práce jsou poskládané tak, abys byl ve formě na zápasy, na kterých záleží, a po nich správně regeneroval.",
    ru: "Планирование строится вокруг матчевых недель, а не по шаблонам. Сила, мощность, скорость и техническая работа выстроены так, чтобы ты подходил к важным играм в пике и правильно восстанавливался после.",
    tr: "Programlama jenerik şablonlar üzerine değil, maç haftaları üzerine kurulur. Kuvvet, güç, sürat ve teknik çalışma; önemli maçlarda zirveye çıkacak ve sonrasında doğru toparlanacak şekilde sıralanır.",
    hr: "Programiranje se gradi oko utakmica, a ne po generičkim predlošcima. Snaga, eksplozivnost, brzina i tehnički rad slažu se tako da budeš u vrhuncu za važne utakmice i dobro se oporaviš nakon njih.",
    no: "Programmering bygges rundt kampuker, ikke generiske maler. Styrke, power, fart og teknisk arbeid sekvenseres for å toppe deg til kampene som teller og hente deg ordentlig tilbake etterpå.",
  },
  rwu_perf_team_title: {
    en: "Performance Team Provision", es: "Equipo de Rendimiento Completo", pt: "Equipa de Performance Completa",
    fr: "Équipe de Performance Complète", de: "Performance-Team-Versorgung", it: "Performance Team Completo",
    pl: "Pełny Zespół Performance", cs: "Kompletní Performance Tým", ru: "Полная команда Performance",
    tr: "Performans Ekibi Desteği", hr: "Performance Tim", no: "Performance-team",
  },
  rwu_perf_team_body: {
    en: "Full Premier League level support across analysis, S&C, nutrition, sports psychology and technique, wrapped around you through one shared plan, not a list of disconnected freelancers.",
    es: "Soporte completo a nivel Premier League en análisis, fuerza y acondicionamiento, nutrición, psicología deportiva y técnica, organizado en torno a ti con un único plan compartido, no con una lista de freelancers desconectados.",
    pt: "Apoio completo ao nível da Premier League em análise, força e condicionamento, nutrição, psicologia desportiva e técnica, organizado à tua volta com um único plano partilhado, não uma lista de freelancers desconectados.",
    fr: "Un soutien complet au niveau Premier League en analyse, préparation physique, nutrition, psychologie sportive et technique, articulé autour de toi via un seul plan partagé, pas une liste de freelances déconnectés.",
    de: "Volle Unterstützung auf Premier-League-Niveau in Analyse, Athletik, Ernährung, Sportpsychologie und Technik, eingebettet in einen gemeinsamen Plan rund um dich, nicht in eine Liste isolierter Freelancer.",
    it: "Supporto completo a livello Premier League su analisi, preparazione atletica, nutrizione, psicologia sportiva e tecnica, integrato attorno a te in un unico piano condiviso, non una lista di freelance scollegati.",
    pl: "Pełne wsparcie na poziomie Premier League w zakresie analizy, S&C, żywienia, psychologii sportu i techniki, zorganizowane wokół ciebie w jednym wspólnym planie, a nie liście rozproszonych freelancerów.",
    cs: "Plná podpora na úrovni Premier League v analýze, kondici, výživě, sportovní psychologii a technice, propojená kolem tebe jedním společným plánem, ne seznamem nesouvisejících freelancerů.",
    ru: "Полная поддержка уровня АПЛ — анализ, физподготовка, питание, спортивная психология и техника — выстроены вокруг тебя в едином плане, а не списком разрозненных фрилансеров.",
    tr: "Analiz, kuvvet-kondisyon, beslenme, spor psikolojisi ve teknikte Premier Lig seviyesinde tam destek; bağlantısız freelance listesi değil, tek bir ortak planda etrafına örülür.",
    hr: "Puna podrška na razini Premier lige u analizi, kondiciji, prehrani, sportskoj psihologiji i tehnici, organizirana oko tebe kroz jedan zajednički plan, a ne popis nepovezanih freelancera.",
    no: "Full støtte på Premier League-nivå innen analyse, styrke og kondisjon, ernæring, idrettspsykologi og teknikk, samlet rundt deg i én felles plan – ikke en liste med løsrevne frilansere.",
  },
  rwu_parent_title: {
    en: "The Parent's Role", es: "El Rol de los Padres", pt: "O Papel dos Pais",
    fr: "Le Rôle des Parents", de: "Die Rolle der Eltern", it: "Il Ruolo dei Genitori",
    pl: "Rola Rodziców", cs: "Role Rodičů", ru: "Роль Родителей",
    tr: "Ailenin Rolü", hr: "Uloga Roditelja", no: "Foreldrenes Rolle",
  },
  rwu_parent_body: {
    en: "We work alongside you, not around you. You stay in the loop on every decision, every conversation with a club, every step in the plan. Your job is the home environment and steady support; ours is the football, the contacts and the standards.",
    es: "Trabajamos contigo, no a tu alrededor. Estás informado en cada decisión, cada conversación con un club y cada paso del plan. Vuestro papel es el entorno familiar y el apoyo constante; el nuestro, el fútbol, los contactos y los estándares.",
    pt: "Trabalhamos contigo, não à tua volta. Estás a par de cada decisão, cada conversa com um clube e cada passo do plano. O vosso papel é o ambiente em casa e o apoio constante; o nosso é o futebol, os contactos e os padrões.",
    fr: "Nous travaillons avec vous, pas autour de vous. Vous êtes informés à chaque décision, chaque échange avec un club et chaque étape du plan. Votre rôle est l'environnement familial et le soutien constant ; le nôtre, le football, les contacts et les standards.",
    de: "Wir arbeiten mit Ihnen, nicht um Sie herum. Sie sind bei jeder Entscheidung, jedem Gespräch mit einem Verein und jedem Planschritt eingebunden. Ihre Aufgabe ist das häusliche Umfeld und stete Unterstützung; unsere ist Fußball, Kontakte und Standards.",
    it: "Lavoriamo con voi, non attorno a voi. Restate aggiornati su ogni decisione, ogni conversazione con un club e ogni passo del piano. Il vostro ruolo è l'ambiente familiare e il sostegno costante; il nostro è il calcio, i contatti e gli standard.",
    pl: "Pracujemy z wami, nie wokół was. Jesteście informowani o każdej decyzji, każdej rozmowie z klubem i każdym kroku planu. Wasza rola to środowisko domowe i stałe wsparcie; nasza to piłka, kontakty i standardy.",
    cs: "Pracujeme s vámi, ne kolem vás. Jste v obraze u každého rozhodnutí, každého rozhovoru s klubem a každého kroku plánu. Vaše role je domácí prostředí a stálá podpora; naše je fotbal, kontakty a standardy.",
    ru: "Мы работаем с вами, а не вокруг вас. Вы в курсе каждого решения, каждого разговора с клубом и каждого шага плана. Ваша задача — домашняя среда и постоянная поддержка; наша — футбол, контакты и стандарты.",
    tr: "Sizinle birlikte çalışırız, etrafınızda değil. Her karardan, kulüple her görüşmeden ve plandaki her adımdan haberdar olursunuz. Sizin işiniz ev ortamı ve istikrarlı destek; bizim işimiz futbol, bağlantılar ve standartlar.",
    hr: "Radimo s vama, ne oko vas. U toku ste sa svakom odlukom, svakim razgovorom s klubom i svakim korakom plana. Vaša je uloga domaće okruženje i stalna podrška; naša je nogomet, kontakti i standardi.",
    no: "Vi jobber sammen med dere, ikke rundt dere. Dere holdes oppdatert på hver beslutning, hver samtale med en klubb og hvert steg i planen. Deres rolle er hjemmemiljøet og stabil støtte; vår er fotballen, kontaktene og standardene.",
  },
  rwu_how_title: {
    en: "How We Work With You", es: "Cómo Trabajamos Contigo", pt: "Como Trabalhamos Contigo",
    fr: "Comment Nous Travaillons Avec Toi", de: "Wie Wir Mit Dir Arbeiten", it: "Come Lavoriamo Con Te",
    pl: "Jak Z Tobą Pracujemy", cs: "Jak S Tebou Pracujeme", ru: "Как Мы Работаем С Тобой",
    tr: "Seninle Nasıl Çalışıyoruz", hr: "Kako Radimo S Tobom", no: "Hvordan Vi Jobber Med Deg",
  },
  rwu_how_body: {
    en: "Direct communication, in your language. The portal, your reports and your day-to-day contact happen in the language you prefer, so nothing is lost in translation.",
    es: "Comunicación directa, en tu idioma. El portal, tus informes y el contacto del día a día se dan en el idioma que prefieras, para que nada se pierda en la traducción.",
    pt: "Comunicação direta, na tua língua. O portal, os teus relatórios e o contacto do dia-a-dia acontecem no idioma que preferires, para que nada se perca na tradução.",
    fr: "Communication directe, dans ta langue. Le portail, tes rapports et le contact quotidien se font dans la langue que tu préfères, pour que rien ne se perde dans la traduction.",
    de: "Direkte Kommunikation in deiner Sprache. Portal, Berichte und tägliche Ansprache laufen in der Sprache, die du bevorzugst, damit nichts in der Übersetzung verloren geht.",
    it: "Comunicazione diretta, nella tua lingua. Il portale, i tuoi report e i contatti quotidiani avvengono nella lingua che preferisci, così nulla si perde nella traduzione.",
    pl: "Bezpośrednia komunikacja, w twoim języku. Portal, raporty i codzienny kontakt odbywają się w wybranym przez ciebie języku, by nic nie zginęło w tłumaczeniu.",
    cs: "Přímá komunikace ve tvém jazyce. Portál, tvé reporty i každodenní kontakt probíhají v jazyce, který preferuješ, aby se v překladu nic neztratilo.",
    ru: "Прямое общение на твоём языке. Портал, отчёты и ежедневный контакт идут на удобном тебе языке, чтобы ничего не терялось при переводе.",
    tr: "Doğrudan iletişim, kendi dilinde. Portal, raporların ve günlük temaslar tercih ettiğin dilde olur; çeviride hiçbir şey kaybolmaz.",
    hr: "Izravna komunikacija, na tvom jeziku. Portal, izvještaji i svakodnevni kontakt odvijaju se na jeziku koji preferiraš, kako se ništa ne bi izgubilo u prijevodu.",
    no: "Direkte kommunikasjon på ditt språk. Portalen, rapportene og den daglige kontakten foregår på språket du foretrekker, slik at ingenting går tapt i oversettelsen.",
  },
  /* ---------- Meeting booker dialog ---------- */
  rwu_meet_title: {
    en: "Let's Meet", es: "Reunámonos", pt: "Vamos Falar",
    fr: "Rencontrons-nous", de: "Lass uns treffen", it: "Incontriamoci",
    pl: "Spotkajmy się", cs: "Domluvme schůzku", ru: "Давайте встретимся",
    tr: "Tanışalım", hr: "Nađimo se", no: "La oss møtes",
  },
  rwu_meet_subtitle: {
    en: "Leave us your WhatsApp and a couple of times that suit you. We'll message you to lock it in.",
    es: "Déjanos tu WhatsApp y un par de horarios que te vengan bien. Te escribiremos para cerrarlo.",
    pt: "Deixa-nos o teu WhatsApp e alguns horários que te dêem jeito. Enviamos mensagem para confirmar.",
    fr: "Laisse-nous ton WhatsApp et quelques créneaux qui te conviennent. On te recontacte pour caler ça.",
    de: "Hinterlass uns deine WhatsApp-Nummer und ein paar passende Zeiten. Wir melden uns, um es festzuzurren.",
    it: "Lasciaci il tuo WhatsApp e un paio di orari che ti vanno bene. Ti scriviamo per fissarlo.",
    pl: "Zostaw nam swój WhatsApp i kilka pasujących ci terminów. Napiszemy, by je potwierdzić.",
    cs: "Nech nám svůj WhatsApp a pár termínů, které ti vyhovují. Napíšeme ti a domluvíme to.",
    ru: "Оставьте свой WhatsApp и удобные варианты времени. Мы напишем и подтвердим.",
    tr: "WhatsApp numaranı ve sana uygun birkaç saati bırak. Kesinleştirmek için sana yazarız.",
    hr: "Ostavi nam svoj WhatsApp i nekoliko termina koji ti odgovaraju. Javit ćemo se da to potvrdimo.",
    no: "Legg igjen WhatsApp-en din og noen tider som passer. Vi sender melding for å lande det.",
  },
  rwu_meet_whatsapp: {
    en: "WhatsApp number", es: "Número de WhatsApp", pt: "Número de WhatsApp",
    fr: "Numéro WhatsApp", de: "WhatsApp-Nummer", it: "Numero WhatsApp",
    pl: "Numer WhatsApp", cs: "Číslo WhatsApp", ru: "Номер WhatsApp",
    tr: "WhatsApp numarası", hr: "WhatsApp broj", no: "WhatsApp-nummer",
  },
  rwu_meet_time_of_day: {
    en: "Preferred time of day", es: "Franja horaria preferida", pt: "Período preferido do dia",
    fr: "Moment de la journée préféré", de: "Bevorzugte Tageszeit", it: "Fascia oraria preferita",
    pl: "Preferowana pora dnia", cs: "Preferovaná denní doba", ru: "Удобное время суток",
    tr: "Tercih edilen saat dilimi", hr: "Preferirano doba dana", no: "Foretrukket tid på dagen",
  },
  rwu_meet_dates: {
    en: "Dates that work for you", es: "Fechas que te van bien", pt: "Datas que te dêem jeito",
    fr: "Dates qui te conviennent", de: "Passende Termine", it: "Date che ti vanno bene",
    pl: "Pasujące terminy", cs: "Termíny, které ti vyhovují", ru: "Удобные даты",
    tr: "Sana uygun tarihler", hr: "Termini koji ti odgovaraju", no: "Datoer som passer deg",
  },
  rwu_meet_dates_hint: {
    en: "Pick as many as suit you over the next month.",
    es: "Elige las que te vayan bien en el próximo mes.",
    pt: "Escolhe as que te dêem jeito no próximo mês.",
    fr: "Choisis-en autant que tu veux dans le mois à venir.",
    de: "Wähle so viele wie passen im nächsten Monat.",
    it: "Scegli quante ne vuoi nel prossimo mese.",
    pl: "Wybierz tyle, ile ci pasuje w ciągu najbliższego miesiąca.",
    cs: "Vyber si tolik, kolik ti vyhovuje, v příštím měsíci.",
    ru: "Выбирайте столько, сколько удобно, в течение следующего месяца.",
    tr: "Önümüzdeki ay içinde sana uyan kadarını seç.",
    hr: "Odaberi koliko ti odgovara u sljedećih mjesec dana.",
    no: "Velg så mange som passer i løpet av neste måned.",
  },
  rwu_meet_note: {
    en: "Anything you want us to know (optional)",
    es: "Cualquier cosa que quieras que sepamos (opcional)",
    pt: "Algo que queiras que saibamos (opcional)",
    fr: "Quelque chose à nous faire savoir (facultatif)",
    de: "Möchtest du uns noch etwas sagen? (optional)",
    it: "Qualcosa che vuoi farci sapere (facoltativo)",
    pl: "Coś, co chciałbyś, abyśmy wiedzieli (opcjonalnie)",
    cs: "Něco, co bychom měli vědět (volitelné)",
    ru: "Что-нибудь, что нам стоит знать (необязательно)",
    tr: "Bilmemizi istediğin bir şey (isteğe bağlı)",
    hr: "Nešto što želiš da znamo (po želji)",
    no: "Noe du vil at vi skal vite (valgfritt)",
  },
  rwu_meet_note_ph: {
    en: "Family present, language preference, questions",
    es: "Familia presente, idioma preferido, preguntas",
    pt: "Família presente, idioma preferido, perguntas",
    fr: "Famille présente, langue préférée, questions",
    de: "Familie dabei, Sprachpräferenz, Fragen",
    it: "Famiglia presente, lingua preferita, domande",
    pl: "Obecność rodziny, preferowany język, pytania",
    cs: "Rodina přítomna, preferovaný jazyk, otázky",
    ru: "Семья рядом, предпочтительный язык, вопросы",
    tr: "Aile yanında, dil tercihi, sorular",
    hr: "Obitelj prisutna, jezik, pitanja",
    no: "Familie til stede, språkpreferanse, spørsmål",
  },
  rwu_meet_cancel: {
    en: "Cancel", es: "Cancelar", pt: "Cancelar", fr: "Annuler",
    de: "Abbrechen", it: "Annulla", pl: "Anuluj", cs: "Zrušit",
    ru: "Отмена", tr: "İptal", hr: "Odustani", no: "Avbryt",
  },
  rwu_meet_sending: {
    en: "Sending...", es: "Enviando...", pt: "A enviar...", fr: "Envoi...",
    de: "Senden...", it: "Invio...", pl: "Wysyłanie...", cs: "Odesílám...",
    ru: "Отправка...", tr: "Gönderiliyor...", hr: "Šaljem...", no: "Sender...",
  },
  rwu_meet_submit: {
    en: "Send Request", es: "Enviar Solicitud", pt: "Enviar Pedido",
    fr: "Envoyer la Demande", de: "Anfrage Senden", it: "Invia Richiesta",
    pl: "Wyślij Prośbę", cs: "Odeslat Žádost", ru: "Отправить Запрос",
    tr: "Talebi Gönder", hr: "Pošalji Zahtjev", no: "Send Forespørsel",
  },
  rwu_meet_done_title: {
    en: "Request received", es: "Solicitud recibida", pt: "Pedido recebido",
    fr: "Demande reçue", de: "Anfrage erhalten", it: "Richiesta ricevuta",
    pl: "Prośba odebrana", cs: "Žádost přijata", ru: "Запрос получен",
    tr: "Talep alındı", hr: "Zahtjev zaprimljen", no: "Forespørsel mottatt",
  },
  rwu_meet_done_body: {
    en: "Thanks. We'll WhatsApp you shortly to lock in a time that works.",
    es: "Gracias. Te escribiremos por WhatsApp en breve para fijar una hora que te vaya bien.",
    pt: "Obrigado. Em breve mandamos WhatsApp para combinar uma hora que te dê jeito.",
    fr: "Merci. On te recontacte sur WhatsApp très vite pour caler un créneau qui te convient.",
    de: "Danke. Wir melden uns gleich per WhatsApp, um eine passende Zeit zu fixieren.",
    it: "Grazie. Ti scriviamo a breve su WhatsApp per fissare un orario che ti vada bene.",
    pl: "Dzięki. Wkrótce napiszemy na WhatsApp, by ustalić pasujący termin.",
    cs: "Díky. Brzy ti napíšeme na WhatsApp a domluvíme čas, který ti vyhovuje.",
    ru: "Спасибо. Скоро напишем в WhatsApp, чтобы согласовать удобное время.",
    tr: "Teşekkürler. Uygun bir saati netleştirmek için kısa süre içinde WhatsApp'tan yazacağız.",
    hr: "Hvala. Uskoro ti šaljemo poruku na WhatsApp da dogovorimo termin koji ti odgovara.",
    no: "Takk. Vi sender deg en WhatsApp snart for å lande en tid som passer.",
  },
  rwu_meet_done_close: {
    en: "Close", es: "Cerrar", pt: "Fechar", fr: "Fermer",
    de: "Schließen", it: "Chiudi", pl: "Zamknij", cs: "Zavřít",
    ru: "Закрыть", tr: "Kapat", hr: "Zatvori", no: "Lukk",
  },
  rwu_meet_error: {
    en: "Something went wrong. Please WhatsApp us directly and we'll sort it.",
    es: "Algo salió mal. Escríbenos por WhatsApp y lo solucionamos.",
    pt: "Algo correu mal. Manda-nos WhatsApp diretamente e resolvemos.",
    fr: "Un souci est survenu. Écris-nous directement sur WhatsApp et on règle ça.",
    de: "Etwas ist schiefgelaufen. Schreib uns direkt auf WhatsApp und wir kümmern uns.",
    it: "Qualcosa è andato storto. Scrivici direttamente su WhatsApp e sistemiamo tutto.",
    pl: "Coś poszło nie tak. Napisz do nas bezpośrednio na WhatsApp, zajmiemy się tym.",
    cs: "Něco se pokazilo. Napiš nám přímo na WhatsApp a vyřešíme to.",
    ru: "Что-то пошло не так. Напишите нам напрямую в WhatsApp, и мы всё уладим.",
    tr: "Bir şeyler ters gitti. Doğrudan WhatsApp'tan yaz, hallederiz.",
    hr: "Nešto je pošlo po zlu. Javi nam izravno na WhatsApp i riješit ćemo to.",
    no: "Noe gikk galt. Send oss en WhatsApp direkte, så ordner vi det.",
  },
  rwu_meet_need_whatsapp: {
    en: "Please add your WhatsApp number so we can reach you.",
    es: "Añade tu número de WhatsApp para que podamos contactarte.",
    pt: "Adiciona o teu número de WhatsApp para podermos contactar-te.",
    fr: "Ajoute ton numéro WhatsApp pour qu'on puisse te joindre.",
    de: "Bitte gib deine WhatsApp-Nummer an, damit wir dich erreichen können.",
    it: "Aggiungi il tuo numero WhatsApp così possiamo contattarti.",
    pl: "Dodaj swój numer WhatsApp, abyśmy mogli się z tobą skontaktować.",
    cs: "Přidej prosím své číslo na WhatsApp, ať tě můžeme kontaktovat.",
    ru: "Пожалуйста, укажите номер WhatsApp, чтобы мы могли с вами связаться.",
    tr: "Sana ulaşabilmemiz için lütfen WhatsApp numaranı ekle.",
    hr: "Dodaj svoj WhatsApp broj kako bismo te mogli kontaktirati.",
    no: "Legg til WhatsApp-nummeret ditt så vi kan nå deg.",
  },
  rwu_meet_cta: {
    en: "Let's Meet", es: "Reunámonos", pt: "Vamos Falar",
    fr: "Rencontrons-nous", de: "Lass uns treffen", it: "Incontriamoci",
    pl: "Spotkajmy się", cs: "Domluvme schůzku", ru: "Давайте встретимся",
    tr: "Tanışalım", hr: "Nađimo se", no: "La oss møtes",
  },
  rwu_private_footer: {
    en: "This page is a private invitation and is not indexed by search engines.",
    es: "Esta página es una invitación privada y no aparece en buscadores.",
    pt: "Esta página é um convite privado e não é indexada pelos motores de busca.",
    fr: "Cette page est une invitation privée et n'est pas indexée par les moteurs de recherche.",
    de: "Diese Seite ist eine private Einladung und wird nicht von Suchmaschinen indexiert.",
    it: "Questa pagina è un invito privato e non viene indicizzata dai motori di ricerca.",
    pl: "Ta strona to prywatne zaproszenie i nie jest indeksowana przez wyszukiwarki.",
    cs: "Tato stránka je soukromá pozvánka a vyhledávače ji neindexují.",
    ru: "Эта страница — личное приглашение и не индексируется поисковиками.",
    tr: "Bu sayfa özel bir davettir ve arama motorlarına dizinlenmez.",
    hr: "Ova je stranica privatni poziv i ne indeksiraju je tražilice.",
    no: "Denne siden er en privat invitasjon og indekseres ikke av søkemotorer.",
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
  rwu_whatsapp_opener: {
    en: "Hi RISE, I just read my invitation",
    es: "Hola RISE, acabo de leer mi invitación",
    pt: "Olá RISE, acabei de ler o meu convite",
    fr: "Bonjour RISE, je viens de lire mon invitation",
    de: "Hallo RISE, ich habe gerade meine Einladung gelesen",
    it: "Ciao RISE, ho appena letto il mio invito",
    pl: "Cześć RISE, właśnie przeczytałem moje zaproszenie",
    cs: "Ahoj RISE, právě jsem si přečetl pozvánku",
    ru: "Здравствуйте, RISE, я только что прочитал приглашение",
    tr: "Merhaba RISE, davetimi az önce okudum",
    hr: "Bok RISE, upravo sam pročitao pozivnicu",
    no: "Hei RISE, jeg har nettopp lest invitasjonen min",
  },
};
const allDicts = { ...offerDict, ...portalWelcomeDict };

const offerT = (lang: string, key: string, fallback: string): string => {
  const code = (lang || "en") as Lang;
  return allDicts[key]?.[code] || allDicts[key]?.en || fallback;
};

const balanceLineBreak = (value: string) => {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 2) return value;
  let bestIndex = 1;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let i = 1; i < words.length; i += 1) {
    const left = words.slice(0, i).join(" ");
    const right = words.slice(i).join(" ");
    const shortLastLinePenalty = right.length < 7 ? 6 : 0;
    const score = Math.abs(left.length - right.length) + shortLastLinePenalty;
    if (score < bestScore) {
      bestIndex = i;
      bestScore = score;
    }
  }
  return `${words.slice(0, bestIndex).join(" ")}\n${words.slice(bestIndex).join(" ")}`;
};

/* ============== AUTO-POSITION RESOLUTION ============== */
/** Map normalised position abbreviations (GK, CB, LW, etc.) to the
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
      "Full Premier League level support across analysis, S&C, nutrition, sports psychology and technique, wrapped around you through one shared plan, not a list of disconnected freelancers.",
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
      "Direct communication, in your language. The portal, your reports and your day-to-day contact happen in the language you prefer, so nothing is lost in translation.",
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

/* ============== BALLON D'OR VISION CARD ============== */
const BallonDorVisionCard = ({
  onBookMeeting,
  t,
}: {
  onBookMeeting: () => void;
  t: (key: string, fallback: string) => string;
}) => {
  const headline = t(
    "vision.headline",
    "Only The Best.",
  );
  const body = t(
    "vision.body_anon",
    "We are on a 10 year mission to train and represent a future Ballon d'Or winner and World Team of the Year player at every position. We pick a small group of players we genuinely believe can get there and back them all the way. If you have what it takes to work with us, reach out to better understand how we can realise potential together.",
  );
  const urgency = "";
  const cta = t("vision.cta", "Let's Meet");

  return (
    <div className="mt-6 md:mt-8">
      <div
        className="relative overflow-hidden rise-slant-card-lg border border-border/60"
        style={solidBlackSectionStyle}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,hsl(var(--gold)/0.20),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,hsl(var(--gold)/0.12),transparent_60%)]" />
        </div>
        <div className="relative flex flex-col items-center gap-4 px-5 py-7 text-center md:gap-5 md:px-8 md:py-9">
          <img
            src={ballondorAsset.url}
            alt="Ballon d'Or"
            loading="lazy"
            decoding="async"
            className="h-24 w-auto md:h-32 lg:h-36 drop-shadow-[0_0_28px_hsl(var(--gold)/0.45)]"
          />
          <p className="font-bebas text-[11px] uppercase tracking-[0.32em] text-primary md:text-[12px]">
            {t("vision.eyebrow", "Our vision")}
          </p>
          <div className="min-w-0">
            <p
              className="font-bebas text-3xl uppercase leading-[1.05] tracking-[0.06em] text-foreground md:text-4xl lg:text-5xl"
              style={{ textShadow: "0 0 22px hsl(var(--gold)/0.35)", textWrap: "balance" } as React.CSSProperties}
            >
              {widont(headline)}
            </p>
            <p
              className="mx-auto mt-3 max-w-3xl text-[13.5px] leading-relaxed text-foreground/90 md:text-[15px]"
              style={{ textWrap: "pretty", hyphens: "none", overflowWrap: "normal" } as React.CSSProperties}
            >
              {widont(body)}
            </p>
            {urgency ? (
              <p
                className="mx-auto mt-3 max-w-2xl text-[12.5px] uppercase tracking-[0.16em] text-primary md:text-[13px]"
                style={{ textWrap: "balance" } as React.CSSProperties}
              >
                {widont(urgency)}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

const WhyRiseDetailView = ({
  lang,
  ageGroup,
  onBack,
  t,
}: {
  lang: string;
  ageGroup: "under18" | "over18";
  onBack: () => void;
  t: (key: string, fallback: string) => string;
}) => (
  <motion.section
    key="why-rise-detail"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
    className="relative min-h-[100dvh] bg-black px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-32 md:px-8 md:pt-6 lg:px-16"
  >
    <div className="relative z-10 mx-auto flex w-full max-w-md flex-col md:max-w-5xl lg:max-w-6xl">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/40 bg-background/70 px-3 py-1 text-[11px] font-bebas uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary/10 md:mb-5"
      >
        <ChevronLeft className="h-3 w-3" />
        {t("representation.back_to_all", "Back to all")}
      </button>
      <TitlePlate
        icon={Trophy}
        title={offerT(lang, "why_rise_card", "Why Rise?")}
        eyebrow={offerT(lang, "vision_subtitle_card", "A future built with the best")}
      />
      <PillarsSection lang={lang} ageGroup={ageGroup} t={t} />
    </div>
  </motion.section>
);

/* ============== PORTAL WELCOME OVERLAY ============== */
const PortalWelcomeOverlay = ({ lang }: { lang: string }) => {
  const [open, setOpen] = useState(true);

  return _PortalWelcomeOverlayImpl({ lang, open, setOpen });
};

/* ============== MEETING BOOKER ==============
 * Item C from the proposal backlog. We do not embed a third-party
 * calendar. The prospect submits their WhatsApp number plus a couple
 * of preferred slots, and the request is logged for staff to follow
 * up manually (TO/MM/MS/PW/ME/JS get tagged on the notification).
 */
const MEETING_STAFF_TAGS = ["TO", "MM", "MS", "PW", "ME", "JS"];

type TimeOfDay = "morning" | "afternoon" | "evening" | "any";
const timeOfDayDict: Record<TimeOfDay, Partial<Record<Lang, string>>> = {
  morning:  { en: "Morning",  es: "Mañana",  pt: "Manhã",   fr: "Matin",   de: "Vormittag", it: "Mattina",     pl: "Rano",      cs: "Ráno",     ru: "Утром",     tr: "Sabah",   hr: "Jutro",   no: "Morgen" },
  afternoon:{ en: "Afternoon",es: "Tarde",   pt: "Tarde",   fr: "Après-midi", de: "Nachmittag", it: "Pomeriggio", pl: "Popołudnie", cs: "Odpoledne", ru: "Днём",     tr: "Öğleden sonra", hr: "Popodne", no: "Ettermiddag" },
  evening:  { en: "Evening",  es: "Noche",   pt: "Noite",   fr: "Soir",    de: "Abend",     it: "Sera",        pl: "Wieczór",   cs: "Večer",    ru: "Вечером",  tr: "Akşam",   hr: "Večer",   no: "Kveld" },
  any:      { en: "Any time", es: "Cualquier hora", pt: "Qualquer hora", fr: "À n'importe quelle heure", de: "Jederzeit", it: "Qualunque ora", pl: "O dowolnej porze", cs: "Kdykoli", ru: "В любое время", tr: "Her saat", hr: "Bilo kada", no: "Når som helst" },
};

const calendarLocales: Record<Lang, typeof enGB> = {
  en: enGB, es, pt, fr, de, it, pl, cs, ru, tr, hr, no: nb,
};

const intlDateLocales: Record<Lang, string> = {
  en: "en-GB", es: "es-ES", pt: "pt-PT", fr: "fr-FR", de: "de-DE", it: "it-IT",
  pl: "pl-PL", cs: "cs-CZ", ru: "ru-RU", tr: "tr-TR", hr: "hr-HR", no: "nb-NO",
};

const MeetingBookerDialog = ({
  open, onOpenChange, player, lang,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  player: ProspectPlayer;
  lang: string;
}) => {
  const [whatsapp, setWhatsapp] = useState("");
  const [preferredDates, setPreferredDates] = useState<Date[]>([]);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("any");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset when reopened.
  useEffect(() => {
    if (open) {
      setDone(false); setError(null);
      setWhatsapp(""); setPreferredDates([]); setTimeOfDay("any"); setNote("");
    }
  }, [open]);

  const labelFor = (k: TimeOfDay) =>
    timeOfDayDict[k]?.[lang as Lang] || timeOfDayDict[k]?.en || k;
  const langCode = ((lang || "en") in calendarLocales ? lang : "en") as Lang;

  // Calendar window: starts tomorrow, runs for one full month.
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1);
    return d;
  }, [open]);
  const oneMonthOut = useMemo(() => {
    const d = new Date(tomorrow);
    d.setMonth(d.getMonth() + 1);
    return d;
  }, [tomorrow]);
  const formatDates = (dates: Date[]) =>
    [...dates]
      .sort((a, b) => a.getTime() - b.getTime())
      .map((d) => d.toLocaleDateString(intlDateLocales[langCode], { weekday: "short", day: "numeric", month: "short" }))
      .join(", ");

  const submit = async () => {
    if (!whatsapp.trim()) {
      setError(offerT(lang, "rwu_meet_need_whatsapp", "Please add your WhatsApp number so we can reach you."));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const slug = window.location.pathname.split("/").filter(Boolean).pop() || null;
      const datesText = formatDates(preferredDates);
      const { error: insertErr } = await (supabase as any)
        .from("proposal_meeting_requests")
        .insert({
          player_id: player.id,
          player_slug: slug,
          player_name: player.name,
          whatsapp_number: whatsapp.trim(),
          preferred_dates: datesText || null,
          preferred_time_of_day: timeOfDay,
          message: note.trim() || null,
          language: lang,
        });
      if (insertErr) throw insertErr;

      await insertStaffNotification({
        eventType: "proposal_meeting_request",
        title: `Meeting requested: ${player.name}`,
        body: `${player.name} (${whatsapp.trim()}) | ${datesText || "no dates"} | ${labelFor(timeOfDay)}`,
        eventData: {
          player_id: player.id,
          player_name: player.name,
          whatsapp_number: whatsapp.trim(),
          preferred_dates: datesText,
          preferred_time_of_day: timeOfDay,
          message: note.trim(),
          tagged_staff: MEETING_STAFF_TAGS,
          source: "rise_with_us",
        },
      });
      setDone(true);
    } catch (e: any) {
      console.error("Meeting request failed", e);
      setError(offerT(lang, "rwu_meet_error", "Something went wrong. Please WhatsApp us directly and we'll sort it."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:max-w-3xl max-h-[calc(100dvh-1rem)] overflow-y-auto border border-primary/30 !bg-black text-foreground shadow-[0_0_60px_-20px_hsl(var(--gold)/0.65)] rounded-xl">
        {!done ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/35 bg-primary/10">
                  <CalendarClock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="font-bebas text-2xl uppercase tracking-[0.12em] md:text-3xl">
                    {offerT(lang, "rwu_meet_title", "Let's Meet")}
                  </DialogTitle>
                  <DialogDescription className="text-foreground/75">
                    {offerT(
                      lang,
                      "rwu_meet_subtitle",
                      "Leave us your WhatsApp and a couple of times that suit you. We'll message you to lock it in.",
                    )}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-1">
                <label className="mb-1.5 block font-bebas text-[11px] uppercase tracking-[0.22em] text-primary">
                  {offerT(lang, "rwu_meet_whatsapp", "WhatsApp number")}
                </label>
                <Input
                  type="tel"
                  inputMode="tel"
                  placeholder="+44 7"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                />
              </div>
              <div className="md:col-span-1">
                <label className="mb-1.5 block font-bebas text-[11px] uppercase tracking-[0.22em] text-primary">
                  {offerT(lang, "rwu_meet_time_of_day", "Preferred time of day")}
                </label>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {(["morning", "afternoon", "evening", "any"] as TimeOfDay[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setTimeOfDay(k)}
                      className={`min-w-0 truncate rounded-md border px-2 py-1.5 font-bebas text-[11px] uppercase tracking-[0.14em] transition-colors ${
                        timeOfDay === k
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border/60 text-foreground/75 hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      {labelFor(k)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block font-bebas text-[11px] uppercase tracking-[0.22em] text-primary">
                  {offerT(lang, "rwu_meet_dates", "Dates that work for you")}
                </label>
                <div className="rounded-md border border-border/60 bg-black/40 p-1 sm:p-2">
                  <Calendar
                    mode="multiple"
                    selected={preferredDates}
                    onSelect={(dates) => setPreferredDates(dates ?? [])}
                    fromDate={tomorrow}
                    toDate={oneMonthOut}
                    defaultMonth={tomorrow}
                    locale={calendarLocales[langCode]}
                    showOutsideDays={false}
                    className="mx-auto"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {preferredDates.length > 0
                    ? formatDates(preferredDates)
                    : offerT(lang, "rwu_meet_dates_hint", "Pick as many as suit you over the next month.")}
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block font-bebas text-[11px] uppercase tracking-[0.22em] text-primary">
                  {offerT(lang, "rwu_meet_note", "Anything you want us to know (optional)")}
                </label>
                <Textarea
                  rows={3}
                  placeholder={offerT(lang, "rwu_meet_note_ph", "Family present, language preference, questions")}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                {offerT(lang, "rwu_meet_cancel", "Cancel")}
              </Button>
              <Button
                onClick={submit}
                disabled={submitting}
                className="font-bebas uppercase tracking-[0.2em] bg-primary text-primary-foreground hover:bg-primary/90 px-6"
              >
                {submitting
                  ? offerT(lang, "rwu_meet_sending", "Sending...")
                  : offerT(lang, "rwu_meet_submit", "Send Request")}
              </Button>
            </div>
          </>
        ) : (
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-primary/40 bg-primary/10 shadow-[0_0_30px_hsl(var(--gold)/0.25)]">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>
            <h3 className="font-bebas text-2xl uppercase tracking-[0.12em] md:text-3xl">
              {offerT(lang, "rwu_meet_done_title", "Request received")}
            </h3>
            <p className="mx-auto mt-3 max-w-xl text-foreground/85">
              {offerT(
                lang,
                "rwu_meet_done_body",
                "Thanks. We'll WhatsApp you shortly to lock in a time that works.",
              )}
            </p>
            <div className="mt-6 flex justify-center">
              <Button
                onClick={() => onOpenChange(false)}
                className="font-bebas uppercase tracking-[0.2em] bg-primary text-primary-foreground hover:bg-primary/90 px-6"
              >
                {offerT(lang, "rwu_meet_done_close", "Close")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

/* ============== STARS SHOWCASE (Why Us: videos and best players) ==============
 * Item A1, A4, A5, A6 from the proposal backlog:
 * - multiple video clips, "Stars" style carousel (homepage_videos)
 * - best-quality player images alongside the videos (visible_on_stars_page)
 * - "who we've worked with" framing inside the Why Us narrative.
 * Renders nothing when no data is available, so the page degrades gracefully.
 */
interface StarPlayerRow {
  id: string; name: string; position: string | null;
  club: string | null; image_url: string | null;
}
const StarsShowcase = ({ lang }: { lang: string }) => {
  const [videos, setVideos] = useState<string[]>([]);
  const [stars, setStars] = useState<StarPlayerRow[]>([]);
  const [videoIdx, setVideoIdx] = useState(0);

  useEffect(() => {
    (async () => {
      const [{ data: vData }, { data: pData }] = await Promise.all([
        supabase
          .from("homepage_videos")
          .select("video_url")
          .eq("is_active", true)
          .order("order_position", { ascending: true })
          .limit(6),
        (supabase as any)
          .from("players")
          .select("id, name, position, club, image_url")
          .eq("visible_on_stars_page", true)
          .eq("representation_status", "represented")
          .not("image_url", "is", null)
          .limit(6),
      ]);
      setVideos((vData || []).map((v: any) => v.video_url).filter(Boolean));
      setStars((pData || []) as StarPlayerRow[]);
    })();
  }, []);

  // Auto-advance video carousel every 9s.
  useEffect(() => {
    if (videos.length < 2) return;
    const id = window.setInterval(() => {
      setVideoIdx((i) => (i + 1) % videos.length);
    }, 9000);
    return () => window.clearInterval(id);
  }, [videos.length]);

  if (videos.length === 0 && stars.length === 0) return null;

  const activeVideo = videos[videoIdx];
  const isIframeVideo = (url: string) =>
    /youtube\.com|youtu\.be|vimeo\.com|player\./i.test(url);

  return (
    <div className="my-6 md:my-8">
      <div className="mb-5 flex items-center gap-3 md:mb-6">
        <div className="h-[1px] flex-1 bg-primary/40" />
        <span className="font-bebas text-xl uppercase tracking-[0.32em] text-primary md:text-2xl">
          {offerT(lang, "rwu_stars_heading", "Our Stars")}
        </span>
        <div className="h-[1px] flex-1 bg-primary/40" />
      </div>

      <p
        className="mx-auto mb-4 max-w-2xl text-center text-[12.5px] leading-relaxed text-foreground/80 md:text-[14px]"
        style={{ hyphens: "none", wordBreak: "normal", overflowWrap: "normal" }}
      >
        {offerT(
          lang,
          "rwu_stars_body",
          "A snapshot of the players we work with day to day, and the on-pitch moments we help create.",
        )}
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-5 md:gap-4">
        {/* Video carousel */}
        {activeVideo && (
          <div
            className="relative md:col-span-3"
            style={{ clipPath: slantClip, WebkitClipPath: slantClip }}
          >
            <div
              className="relative p-[1px]"
              style={{ background: "linear-gradient(135deg, hsl(var(--gold)/0.55), hsl(var(--gold)/0.12) 55%, hsl(var(--gold)/0.35))" }}
            >
              <div
                className="relative aspect-video w-full overflow-hidden bg-black"
                style={{ clipPath: slantClip, WebkitClipPath: slantClip }}
              >
                {isIframeVideo(activeVideo) ? (
                  <iframe
                    key={activeVideo}
                    src={activeVideo}
                    title="RISE Stars"
                    className="absolute inset-0 h-full w-full"
                    frameBorder={0}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                ) : (
                  <video
                    key={activeVideo}
                    src={activeVideo}
                    className="absolute inset-0 h-full w-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                  />
                )}
                {/* Play badge */}
                <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-primary/40 bg-black/55 px-2.5 py-1 backdrop-blur-sm">
                  <Play className="h-3 w-3 text-primary" fill="currentColor" />
                  <span className="font-bebas text-[10px] uppercase tracking-[0.22em] text-primary">
                    {offerT(lang, "rwu_stars_live", "Live")}
                  </span>
                </div>
              </div>
            </div>
            {videos.length > 1 && (
              <div className="mt-2 flex items-center justify-center gap-1.5">
                {videos.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setVideoIdx(i)}
                    aria-label={`Show clip ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${
                      i === videoIdx ? "w-6 bg-primary" : "w-1.5 bg-foreground/30 hover:bg-foreground/55"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Best-player images */}
        {stars.length > 0 && (
          <div
            className={`grid gap-2 ${activeVideo ? "md:col-span-2" : "md:col-span-5"} ${
              stars.length === 1 ? "grid-cols-1" : "grid-cols-2"
            }`}
          >
            {stars.slice(0, activeVideo ? 4 : 6).map((p) => (
              <div
                key={p.id}
                className="relative overflow-hidden"
                style={{ clipPath: slantClip, WebkitClipPath: slantClip }}
              >
                <div
                  className="relative p-[1px]"
                  style={{ background: "linear-gradient(135deg, hsl(var(--gold)/0.45), hsl(var(--gold)/0.10) 55%, hsl(var(--gold)/0.3))" }}
                >
                  <div
                    className="relative aspect-[3/4] w-full overflow-hidden bg-black"
                    style={{ clipPath: slantClip, WebkitClipPath: slantClip }}
                  >
                    {p.image_url && (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="absolute inset-0 h-full w-full object-cover object-top"
                        loading="lazy"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-2">
                      <p className="whitespace-pre-line text-center font-bebas text-[12px] uppercase leading-tight tracking-[0.08em] text-foreground">
                        {balanceLineBreak(p.name)}
                      </p>
                      <p className="font-bebas text-[9px] uppercase tracking-[0.22em] text-primary/95">
                        {[normalisePosition(p.position || ""), p.club].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const _PortalWelcomeOverlayImpl = ({
  lang, open, setOpen,
}: { lang: string; open: boolean; setOpen: (v: boolean) => void }) => {
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
  fullName, lang, extraImages, extraIntro, secondaryParagraph, profileImageUrl, onDone, isUnder18,
  assignedLang, currentLang, onSwitchToEnglish,
}: {
  fullName: string; lang: string; extraImages: string[];
  extraIntro: Array<{ kind: "image" | "video"; url: string; objectPosition?: string; annotations?: any[] }>;
  secondaryParagraph?: string | null; profileImageUrl?: string | null; onDone: () => void; isUnder18?: boolean;
  assignedLang?: string; currentLang?: string; onSwitchToEnglish?: () => void;
}) => {
  const [phase, setPhase] = useState(0);
  // Translate the optional free-text second paragraph on the fly when the
  // offer language isn't English. Falls back to the original string while
  // the translation is in flight.
  const { translate: translateSecondary } = useAutoTranslateStrings(
    secondaryParagraph ? [secondaryParagraph] : [],
    lang,
  );
  const translatedSecondary = secondaryParagraph ? translateSecondary(secondaryParagraph) : secondaryParagraph;
  const totalPhases = 4;
  const [pulses, setPulses] = useState<PulsePoint[]>([]);
  const pulseId = useRef(0);
  // Curated intro media stays safely outside the text column.
  const [introIdx, setIntroIdx] = useState(0);
  const [sideTick, setSideTick] = useState(0);
  useEffect(() => {
    if (extraIntro.length === 0) return;
    const t = setInterval(() => {
      setIntroIdx((i) => (i + 1) % extraIntro.length);
      setSideTick((s) => s + 1);
    }, 3200);
    return () => clearInterval(t);
  }, [extraIntro.length]);

  const advance = (e: React.MouseEvent | React.TouchEvent) => {
    // On phase 0, if a language choice is required, the prospect must tap
    // one of the flag pills below the name — taps elsewhere do nothing.
    if (phase === 0 && assignedLang && assignedLang !== "en") return;
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

  const pickLanguage = (toEnglish: boolean) => {
    if (toEnglish && onSwitchToEnglish) onSwitchToEnglish();
    // Fire the same audio-unlock event the parent listens for.
    try { window.dispatchEvent(new Event("rep-intro-start")); } catch {}
    setPhase((p) => Math.min(totalPhases - 1, p + 1));
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

      {/* Floating gold embers drift upward across every phase to give the
          intro a constant sense of motion without distracting from the text. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[2] overflow-hidden">
        {Array.from({ length: 28 }).map((_, i) => {
          const left = (i * 37) % 100;
          const delay = (i * 0.31) % 6;
          const duration = 9 + ((i * 1.7) % 7);
          const size = 2 + (i % 4);
          const drift = (i % 2 === 0 ? 1 : -1) * (10 + (i % 5) * 6);
          return (
            <motion.span
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${left}%`,
                bottom: -20,
                width: size,
                height: size,
                background: "hsl(var(--gold))",
                boxShadow: "0 0 12px hsl(var(--gold) / 0.85), 0 0 24px hsl(var(--gold) / 0.4)",
              }}
              initial={{ y: 0, x: 0, opacity: 0 }}
              animate={{ y: -window.innerHeight - 60, x: drift, opacity: [0, 0.85, 0.85, 0] }}
              transition={{ duration, delay, repeat: Infinity, ease: "linear" }}
            />
          );
        })}
      </div>

      {/* Soft horizontal shimmer that sweeps across when the phase changes,
          like a stage light grazing the screen. */}
      <motion.div
        aria-hidden="true"
        key={`shimmer-${phase}`}
        className="pointer-events-none absolute inset-y-0 z-[3] w-[40vw]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, hsl(var(--gold) / 0.18) 50%, transparent 100%)",
          filter: "blur(8px)",
        }}
        initial={{ x: "-50vw", opacity: 0 }}
        animate={{ x: "120vw", opacity: [0, 0.9, 0] }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
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

      {/* Uploaded intro media. On wider screens it floats in the outer
          corners, on mobile (where there is no side room) it appears
          stacked above and below the text instead so the prospect still
          sees their own footage during the intro. */}
      {phase !== 3 && extraIntro.length > 0 && (() => {
        const sideFrames: Array<{ className: string; style: React.CSSProperties }> = [
          { className: "h-28 w-28 md:h-36 md:w-36 lg:h-36 lg:w-36 xl:h-44 xl:w-44", style: { top: "8%", left: "3%", rotate: "-4deg" } },
          { className: "h-28 w-28 md:h-36 md:w-36 lg:h-36 lg:w-36 xl:h-44 xl:w-44", style: { top: "8%", right: "3%", rotate: "4deg" } },
          { className: "h-24 w-24 md:h-32 md:w-32 lg:h-32 lg:w-32 xl:h-40 xl:w-40", style: { bottom: "13%", left: "4%", rotate: "3deg" } },
          { className: "h-24 w-24 md:h-32 md:w-32 lg:h-32 lg:w-32 xl:h-40 xl:w-40", style: { bottom: "13%", right: "4%", rotate: "-3deg" } },
        ];
        // Mobile drifts a single frame between alternating top/bottom slots
        // with varying horizontal offsets so it never feels stuck in one
        // place. Matches the desktop pacing of one image at a time with a
        // soft overlap as the next one fades in.
        // When the optional secondary paragraph is present, keep the image
        // clear of the copy and visibly alternate top-left then top-right.
        const hasLongSecondary = !!(secondaryParagraph && secondaryParagraph.trim().length > 0);
        const restrictToTop = hasLongSecondary && phase === 1;
        const m = extraIntro[introIdx % extraIntro.length];
        const frame = sideFrames[sideTick % sideFrames.length];
        // Deterministic-but-feels-random corner + jitter per tick so the
        // mobile image hops between corners (TL/TR/BL/BR) with a tiny
        // 4–8px offset rather than sliding in a predictable pattern.
        // Top corners only while the long secondary paragraph is on screen
        // so the copy never overlaps the image.
        const rand = (seed: number) => {
          const x = Math.sin(seed * 9301 + 49297) * 233280;
          return x - Math.floor(x);
        };
        const allCorners = ["tl", "tr", "bl", "br"] as const;
        const topCorners = ["tl", "tr"] as const;
        const cornerPool = restrictToTop ? topCorners : allCorners;
        // Avoid landing on the same corner twice in a row.
        const prevCornerIdx = Math.floor(rand(sideTick) * cornerPool.length);
        let cornerIdx = Math.floor(rand(sideTick + 1) * cornerPool.length);
        if (cornerPool.length > 1 && cornerIdx === prevCornerIdx) {
          cornerIdx = (cornerIdx + 1) % cornerPool.length;
        }
        const corner = cornerPool[cornerIdx];
        const jitterX = 4 + rand(sideTick * 2 + 3) * 4; // 4–8px
        const jitterY = 4 + rand(sideTick * 2 + 5) * 4; // 4–8px
        const rotateDeg = (rand(sideTick * 2 + 7) * 8 - 4); // -4..+4deg
        const isTop = corner === "tl" || corner === "tr";
        const isLeft = corner === "tl" || corner === "bl";
        const sideClass = `hidden lg:block absolute object-cover rounded-2xl border border-primary/45 shadow-[0_0_42px_-12px_hsl(var(--gold)/0.72)] ${frame.className}`;
        const mobileClass = "block lg:hidden absolute object-cover rounded-2xl border border-primary/45 shadow-[0_0_36px_-12px_hsl(var(--gold)/0.72)] h-28 w-44 sm:h-36 sm:w-56";
        const mobileStyle: React.CSSProperties = {
          [isTop ? "top" : "bottom"]: `calc(${isTop ? "5%" : "10%"} + ${jitterY}px)`,
          [isLeft ? "left" : "right"]: `calc(clamp(0.75rem, 4vw, 1.5rem) + ${jitterX}px)`,
          transform: `rotate(${rotateDeg.toFixed(2)}deg)`,
          objectPosition: m.objectPosition || "50% 35%",
        } as React.CSSProperties;
        const renderMedia = (media: typeof m, key: string, className: string, style?: React.CSSProperties) =>
          media.kind === "video" ? (
            <motion.video
              key={key}
              src={media.url}
              className={className}
              style={{ ...(style || {}), objectPosition: media.objectPosition || (style as any)?.objectPosition || "50% 35%" }}
              autoPlay muted loop playsInline
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 0.82, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          ) : (
            <motion.img
              key={key}
              src={media.url}
              alt=""
              className={className}
              style={{ ...(style || {}), objectPosition: media.objectPosition || (style as any)?.objectPosition || "50% 35%" }}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 0.82, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          );
        return (
          <div className="pointer-events-none absolute inset-0 z-[5]">
            <AnimatePresence>
              {renderMedia(m, `desktop-${m.url}-${sideTick}`, sideClass, frame.style)}
            </AnimatePresence>
            <AnimatePresence mode="wait">
              {renderMedia(m, `mobile-${m.url}-${sideTick}-${corner}`, mobileClass, mobileStyle)}
            </AnimatePresence>
          </div>
        );
      })()}

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
              {isUnder18 && (
                <p className="mt-2 font-bebas text-base sm:text-lg uppercase tracking-[0.3em] text-primary">
                  {offerT(lang, "and_family", "& family")}
                </p>
              )}
              {assignedLang && assignedLang !== "en" && onSwitchToEnglish && (() => {
                const FLAG_META: Record<string, { flagCode: string; native: string }> = {
                  en: { flagCode: "gb", native: "English" },
                  es: { flagCode: "es", native: "Español" },
                  pt: { flagCode: "pt", native: "Português" },
                  fr: { flagCode: "fr", native: "Français" },
                  de: { flagCode: "de", native: "Deutsch" },
                  it: { flagCode: "it", native: "Italiano" },
                  pl: { flagCode: "pl", native: "Polski" },
                  cs: { flagCode: "cz", native: "Čeština" },
                  ru: { flagCode: "ru", native: "Русский" },
                  tr: { flagCode: "tr", native: "Türkçe" },
                  hr: { flagCode: "hr", native: "Hrvatski" },
                  no: { flagCode: "no", native: "Norsk" },
                };
                const assigned = FLAG_META[assignedLang] ?? { flagCode: "un", native: assignedLang };
                const english = FLAG_META.en;
                const isEnglishActive = currentLang === "en";
                return (
                  <div className="mt-3 flex justify-center">
                    <div
                      className="pointer-events-auto relative flex w-full max-w-[320px] items-stretch overflow-hidden rounded-full border border-primary/60 bg-black/70 shadow-[0_0_24px_-8px_hsl(var(--gold)/0.7)] backdrop-blur-sm"
                      onClick={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); pickLanguage(false); }}
                        onTouchStart={(e) => { e.stopPropagation(); }}
                        aria-label={assigned.native}
                        aria-pressed={!isEnglishActive}
                        className={`relative z-10 flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-colors ${!isEnglishActive ? "bg-[hsl(var(--gold)/0.22)] text-foreground" : "text-foreground/85 hover:bg-[hsl(var(--gold)/0.12)]"}`}
                      >
                        <img
                          src={`https://flagcdn.com/w40/${assigned.flagCode}.png`}
                          srcSet={`https://flagcdn.com/w80/${assigned.flagCode}.png 2x`}
                          alt=""
                          className="h-4 w-auto rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
                        />
                        <span>{assigned.native}</span>
                      </button>
                      <div aria-hidden="true" className="w-px bg-primary/40" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); pickLanguage(true); }}
                        onTouchStart={(e) => { e.stopPropagation(); }}
                        aria-label={english.native}
                        aria-pressed={isEnglishActive}
                        className={`relative z-10 flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-colors ${isEnglishActive ? "bg-[hsl(var(--gold)/0.22)] text-foreground" : "text-foreground/85 hover:bg-[hsl(var(--gold)/0.12)]"}`}
                      >
                        <img
                          src={`https://flagcdn.com/w40/${english.flagCode}.png`}
                          srcSet={`https://flagcdn.com/w80/${english.flagCode}.png 2x`}
                          alt=""
                          className="h-4 w-auto rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
                        />
                        <span>{english.native}</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}
          {phase === 1 && (
            <motion.div key="p1"
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45 }}
              className="space-y-4"
            >
              <p className="whitespace-pre-line font-bebas text-2xl sm:text-4xl md:text-5xl uppercase tracking-[0.16em] text-primary"
                 style={{ textShadow: "0 0 24px hsl(var(--gold)/0.45)", textWrap: "balance" } as React.CSSProperties}>
                {balanceLineBreak(fullName).toUpperCase()}
              </p>
              <p
                className="mx-auto max-w-[36ch] text-base sm:text-xl md:text-2xl leading-snug text-foreground font-medium sm:max-w-[42ch] md:max-w-[44ch]"
                style={{ textWrap: "pretty", hyphens: "none", overflowWrap: "normal" } as React.CSSProperties}
              >
                {widont(offerT(lang, "stood_out_line", "As part of our extensive scouting efforts, we are pleased to say that you stood out with the capability to become a star."))}
              </p>
              {secondaryParagraph && (
                <p
                  className="mx-auto max-w-[40ch] text-sm sm:text-lg md:text-xl leading-relaxed text-foreground/90 sm:max-w-[46ch] md:max-w-[50ch]"
                  style={{ textWrap: "pretty", hyphens: "none", overflowWrap: "normal" } as React.CSSProperties}
                >
                  {widont(translatedSecondary || secondaryParagraph)}
                </p>
              )}
            </motion.div>
          )}
          {phase === 2 && (
            <motion.p key="p2"
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45 }}
              className="mx-auto max-w-[38ch] text-base sm:text-xl md:text-2xl leading-relaxed text-foreground/95 sm:max-w-[44ch] md:max-w-[48ch]"
              style={{ textWrap: "pretty", hyphens: "none", overflowWrap: "normal" } as React.CSSProperties}
            >
              {widont(offerT(lang, "differentiate_line", "We differentiate players by their will, skill and potential, to find those who will use our English Premier League Performance Team to the fullest effect to realise their potential on the pitch and in life."))}
            </motion.p>
          )}
          {phase === 3 && (
            <motion.div key="p3"
              initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center gap-5"
            >
              <div className="relative flex items-center justify-center">
                {/* Orbiting gold dots ringing the logo. */}
                <motion.div
                  aria-hidden="true"
                  className="absolute inset-0 -m-10 sm:-m-14"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 14, ease: "linear", repeat: Infinity }}
                >
                  {[0, 60, 120, 180, 240, 300].map((deg, i) => (
                    <span
                      key={deg}
                      className="absolute left-1/2 top-1/2 block h-1.5 w-1.5 rounded-full"
                      style={{
                        background: "hsl(var(--gold))",
                        boxShadow: "0 0 14px hsl(var(--gold) / 0.85)",
                        transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(-78px)`,
                        opacity: 0.4 + ((i % 3) * 0.2),
                      }}
                    />
                  ))}
                </motion.div>
                {/* Pulsing halo behind the mark. */}
                <motion.div
                  aria-hidden="true"
                  className="absolute h-40 w-40 sm:h-56 sm:w-56 md:h-72 md:w-72 rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle, hsl(var(--gold) / 0.55) 0%, transparent 70%)",
                  }}
                  animate={{ scale: [0.85, 1.1, 0.85], opacity: [0.45, 0.85, 0.45] }}
                  transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.img
                  src={riseLogoWhite} alt="RISE"
                  className="relative h-24 sm:h-32 md:h-40 w-auto"
                  style={{ imageRendering: "auto" as any }}
                  initial={{ filter: "drop-shadow(0 0 0px hsl(var(--gold)))" }}
                  animate={{ filter: "drop-shadow(0 0 22px hsl(var(--gold)/0.85))" }}
                  transition={{ duration: 1.2, repeat: Infinity, repeatType: "mirror" }}
                />
              </div>
              <p className="font-bebas text-4xl sm:text-6xl md:text-7xl uppercase tracking-[0.2em] text-foreground"
                 style={{ textShadow: "0 0 28px hsl(var(--gold)/0.55)" }}>
                {offerT(lang, "rise_with_us", "Rise With Us")}
              </p>
              <motion.div
                className="relative mt-1 flex h-28 w-28 items-center justify-center rounded-full border-2 border-primary/70 bg-black/65 shadow-[0_0_34px_-8px_hsl(var(--gold)/0.8)] sm:h-36 sm:w-36"
                initial={{ opacity: 0, y: 10, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              >
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt={fullName}
                    className="h-full w-full rounded-full object-cover object-top"
                    draggable={false}
                  />
                ) : (
                  <span className="font-bebas text-4xl uppercase tracking-[0.08em] text-primary sm:text-5xl">
                    {fullName.trim().charAt(0)}
                  </span>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tap-to-continue hint */}
      {!(phase === 0 && assignedLang && assignedLang !== "en") && (
      <div className="pointer-events-none absolute inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] flex justify-center z-20">
        <motion.span
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="font-bebas text-[11px] sm:text-xs uppercase tracking-[0.3em] text-foreground/80"
        >
          {offerT(lang, "tap_to_continue", "Tap anywhere to continue")}
        </motion.span>
      </div>
      )}

    </motion.div>
  );
};

/* ============== MAIN ============== */

const RiseWithUs = () => {
  const { slug } = useParams<{ slug: string }>();
  const [player, setPlayer] = useState<ProspectPlayer | null>(null);
  const [settings, setSettings] = useState<OfferSettings>({ hidden_sections: [], section_images: {}, intro_media: [], rise_with_us_under18: false, representation_subtitle_secondary: null, show_database_card: null, show_have_agent: true });
  const [fitScore, setFitScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [activeCard, setActiveCard] = useState<CardKey | null>(null);
  const [scoutingPosition, setScoutingPosition] = useState<ScoutingPosition | null>(null);
  const [performanceSub, setPerformanceSub] = useState<PerformanceSub | null>(null);
  const [stage, setStage] = useState<"hub" | "portal" | "next">("hub");
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [showWhyRiseDetail, setShowWhyRiseDetail] = useState(false);
  // "I already have an agent" acknowledgement state. Once flipped we hide the
  // button and show a translated thank-you note in its place.
  const [haveAgentAck, setHaveAgentAck] = useState(false);
  const [haveAgentSubmitting, setHaveAgentSubmitting] = useState(false);
  // Fallback profile image for the final "Next Step" screen when the
  // player has no `image_url` saved, we look up the first image they have
  // uploaded to the marketing gallery so the lockup never shows a blank
  // circle. Independent of any auto-promote upload flow.
  const [finalFallbackImage, setFinalFallbackImage] = useState<string | null>(null);

  const isPickerMode = !slug;

  // Translator scoped to THIS player's portal_language so each prospect's
  // offer page renders in their language regardless of the visitor's
  // current site language preference.
  const assignedLang = player?.portal_language || "en";
  // Visitor-side override so the prospect can opt to view the page in
  // English if their assigned language isn't comfortable for them.
  const [langOverride, setLangOverride] = useState<string | null>(null);
  const playerLang = langOverride || assignedLang;
  const { t } = usePlayerLanguageTranslations(playerLang);

  useEffect(() => {
    if (isPickerMode) { setNotFound(true); setLoading(false); return; }
    (async () => {
      const normalize = (s: string) =>
        s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, "-");
      const target = normalize(decodeURIComponent(slug));
      const searchName = slug.replace(/-/g, " ");
      // Try a fast diacritic-free ilike first, then fall back to a
      // normalized scan so accented names (e.g. "Jan Drašnář") still
      // resolve from the stripped slug ("jan-drasnar") that is the
      // live link we've already sent out.
      let { data, error } = await supabase
        .from("players")
        .select("id, name, position, image_url, club, nationality, portal_language, has_representation_offer, representation_status, fit_score")
        .or("has_representation_offer.eq.true,representation_status.eq.prospect")
        .ilike("name", searchName)
        .maybeSingle();
      if (!data) {
        const { data: candidates } = await supabase
          .from("players")
          .select("id, name, position, image_url, club, nationality, portal_language, has_representation_offer, representation_status, fit_score")
          .or("has_representation_offer.eq.true,representation_status.eq.prospect");
        data = (candidates || []).find((c: any) => normalize(c.name || "") === target) || null;
        error = null as any;
      }
      if (error || !data) { setNotFound(true); }
      else {
        setPlayer(data);
        setFitScore(typeof (data as any).fit_score === "number" ? (data as any).fit_score : null);
        const { data: sData } = await (supabase as any)
          .from("player_offer_settings")
          .select("hidden_sections, section_images, intro_media, show_database_card, show_have_agent")
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
          intro_media: Array.isArray(sData?.intro_media)
            ? (sData!.intro_media as any[])
                .filter((x) => x && typeof x.url === "string" && x.url)
                .map((x) => ({
                  id: String(x.id ?? x.url),
                  kind: x.kind === "video" ? "video" : "image",
                  url: String(x.url),
                  show: x.show !== false,
                  position: x.position === "hub" || x.position === "both" ? x.position : "intro",
                  objectPosition: typeof x.objectPosition === "string" ? x.objectPosition : undefined,
                }))
            : [],
          rise_with_us_under18: !!portalData?.rise_with_us_under18,
          representation_subtitle_secondary: portalData?.representation_subtitle_secondary || null,
          show_database_card: sData?.show_database_card ?? null,
          show_have_agent: sData?.show_have_agent !== false,
        });
        // NOTE: We do NOT call switchLanguage here. It would redirect to a
        // different language subdomain on production and break the offer
        // URL. Imported representation card content uses the current site
        // language; offer-specific strings use the player's portal_language
        // via the offerDict above.
      }
      setLoading(false);
    })();
  }, [slug, isPickerMode]);

  // Pull a marketing-gallery photo if the player has no profile picture
  // yet. Used as the fallback avatar on the closing screen.
  useEffect(() => {
    let alive = true;
    if (!player || player.image_url) { setFinalFallbackImage(null); return; }
    (async () => {
      const { data } = await (supabase as any)
        .from("marketing_gallery")
        .select("file_url")
        .eq("player_id", player.id)
        .eq("file_type", "image")
        .order("created_at", { ascending: true })
        .limit(1);
      if (alive && data && data[0]?.file_url) {
        const fallbackUrl = data[0].file_url as string;
        setFinalFallbackImage(fallbackUrl);
        setPlayer((current) => current?.id === player.id ? { ...current, image_url: fallbackUrl } : current);
        await (supabase as any)
          .from("players")
          .update({ image_url: fallbackUrl })
          .eq("id", player.id)
          .is("image_url", null);
      }
    })();
    return () => { alive = false; };
  }, [player?.id, player?.image_url]);

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
  // The scouting database card is always shown — the card itself decides
  // whether to reveal the numeric fit score (only when it sits between 60
  // and 100). Older settings rows may have an explicit `false`, but the
  // new behaviour is "always visible, conditional number", so we ignore
  // that legacy flag here on purpose.
  const shouldShowDatabaseCard = true;
  // Build the intro pool from the new intro_media list (kind=image|video,
  // show=true, position in intro/both). Fall back to legacy section_images
  // when the player hasn't been migrated yet so we never go blank.
  const introVisible = settings.intro_media.filter(
    (m) => m.show && (m.position === "intro" || m.position === "both"),
  );
  const baseIntro: Array<{ kind: "image" | "video"; url: string; objectPosition?: string }> =
    introVisible.length > 0
      ? introVisible.map((m) => ({ kind: m.kind, url: m.url, objectPosition: m.objectPosition, annotations: m.annotations }))
      : Object.values(settings.section_images)
          .filter(Boolean)
          .map((url) => ({ kind: "image" as const, url: url as string }));
  const priorityIntroImages = [player.image_url, finalFallbackImage].filter(Boolean) as string[];
  const seenIntroUrls = new Set<string>();
  // Map URLs in intro_media to their staff-chosen focal point so the player
  // headshot/fallback honour the focal point the staff set on that exact image.
  const focalByUrl = new Map<string, string | undefined>();
  for (const m of settings.intro_media) {
    if (m?.url) focalByUrl.set(m.url, m.objectPosition);
  }
  const extraIntro: Array<{ kind: "image" | "video"; url: string; objectPosition?: string; annotations?: any[] }> = [
    ...priorityIntroImages.map((url) => ({
      kind: "image" as const,
      url,
      objectPosition: focalByUrl.get(url) || "50% 50%",
    })),
    ...baseIntro,
  ].filter((m) => {
    if (!m.url || seenIntroUrls.has(m.url)) return false;
    seenIntroUrls.add(m.url);
    return true;
  });
  // Keep the old name working for any downstream consumers that just want urls.
  const extraImages = extraIntro.map((m) => m.url);
  // Hub Why-Us strip, using items the staff flagged as hub or both.
  const hubMedia: Array<{ kind: "image" | "video"; url: string }> =
    settings.intro_media
      .filter((m) => m.show && (m.position === "hub" || m.position === "both"))
      .map((m) => ({ kind: m.kind, url: m.url }));
  const lang = playerLang || "en";
  const ot = (key: string, fallback: string) => offerT(lang, key, fallback);
  const playerOfferT = (key: string, fallback: string) => {
    if (offerDict[key]?.en) return offerT(lang, key, fallback);
    const fromDb = t(key, fallback);
    return fromDb && fromDb !== fallback && fromDb !== key ? fromDb : offerT(lang, key, fallback);
  };

  const goPortal = () => { setStage("portal"); window.scrollTo({ top: 0, behavior: "auto" }); };
  const goNext = () => { setStage("next"); window.scrollTo({ top: 0, behavior: "auto" }); };
  const goHub = () => { setStage("hub"); setShowWhyRiseDetail(false); window.scrollTo({ top: 0, behavior: "auto" }); };

  const activeMeta = activeCard ? CARD_META.find((c) => c.key === activeCard)! : null;
  const groupSiblings = activeMeta
    ? CARD_META.filter((c) => c.group === activeMeta.group && visibleCardKeys.has(c.key))
    : [];

  const openCard = (k: CardKey) => {
    setShowWhyRiseDetail(false);
    setActiveCard(k);
    setScoutingPosition(null);
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
            extraIntro={extraIntro}
            secondaryParagraph={settings.representation_subtitle_secondary}
            profileImageUrl={player.image_url || finalFallbackImage || null}
            isUnder18={!!settings.rise_with_us_under18}
            assignedLang={assignedLang}
            currentLang={lang}
            onSwitchToEnglish={() => setLangOverride("en")}
            onDone={() => setIntroDone(true)}
          />
        )}
      </AnimatePresence>

      {introDone && (
        <>
          <RepresentationAudio />

          {/* ============ STAGE: HUB ============ */}
          {stage === "hub" && !activeCard && !showWhyRiseDetail && (
            <section className="relative px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[calc(env(safe-area-inset-bottom)+5.5rem)] md:px-8 md:pt-8 md:pb-[calc(env(safe-area-inset-bottom)+6rem)] lg:px-16 bg-black">
              <div className="relative z-10 mx-auto flex w-full max-w-md flex-col md:max-w-4xl lg:max-w-6xl xl:max-w-7xl">
                <header className="relative pb-6 text-center md:pb-10">
                  <div className="mx-auto flex flex-col items-center gap-3 md:gap-5">
                    <img src={riseLogoWhite} alt="RISE" className="h-16 md:h-24 w-auto" />
                    <div className="relative flex w-full items-center gap-2 md:gap-4">
                      <span className="h-px flex-1 bg-primary/45" />
                      <h1 className="whitespace-nowrap font-bebas text-2xl uppercase leading-none tracking-[0.1em] text-foreground sm:text-3xl md:text-4xl md:tracking-[0.12em] lg:text-5xl lg:tracking-[0.14em]">
                        {ot("rise_with_us_heading", "Rise With Us")}, {firstName}
                      </h1>
                      <span className="h-px flex-1 bg-primary/45" />
                    </div>
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-primary/35" />
                </header>

                {/* "Our Stars" / hub media strip removed per request. The
                    hub stays focused on the prospect's own journey rather
                    than a generic stars carousel. */}

                {/* Mission bio - mirrors the Representation page header so
                    every prospect lands on the same context about RISE
                    before tapping into the grouped cards. */}
                <div className="mx-auto mt-1 w-full rise-slant-card-sm border border-primary/20 bg-black/80 px-4 py-3 md:max-w-3xl md:px-6 md:py-4">
                  <p
                    className="text-[12.4px] leading-relaxed text-foreground/85 md:text-[15.4px]"
                    style={{
                      textWrap: "pretty",
                      hyphens: "none",
                      WebkitHyphens: "none",
                      msHyphens: "none",
                      wordBreak: "normal",
                      overflowWrap: "normal",
                    } as React.CSSProperties}
                  >
                    {t(MISSION_BIO_KEY, MISSION_BIO_FALLBACK)}
                  </p>
                </div>

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

                <div className="mt-8 scroll-mt-[88px] md:mt-10 md:scroll-mt-[96px]">
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.03, y: -3 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setShowWhyRiseDetail(true);
                      window.scrollTo({ top: 0, behavior: "auto" });
                    }}
                    className="group relative mx-auto block w-full max-w-md overflow-hidden rounded-[1.45rem] border border-primary/50 p-3 text-center md:max-w-lg md:p-5"
                    style={solidBlackSectionStyle}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--gold)/0.14),transparent_60%)]" />
                    <div className="relative flex min-h-[140px] flex-col items-center justify-center gap-3 md:min-h-[200px] md:gap-4 lg:min-h-[220px]">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/35 bg-primary/10 shadow-[0_0_26px_hsl(var(--gold)/0.14)] md:h-14 md:w-14">
                        <Trophy className="h-5 w-5 text-primary md:h-6 md:w-6" />
                      </div>
                      <div>
                        <p className="font-bebas text-[clamp(1rem,4.2vw,1.375rem)] uppercase leading-[1.05] tracking-[0.08em] md:text-[clamp(1.15rem,2.6vw,1.75rem)] md:tracking-[0.1em] lg:text-[clamp(1.25rem,2.2vw,2.125rem)]">
                          {ot("why_rise_card", "Why Rise?")}
                        </p>
                        <p className="mx-auto mt-1.5 max-w-[11.5rem] whitespace-pre-line text-[10px] uppercase tracking-[0.14em] text-muted-foreground md:text-xs">
                          {ot("vision_subtitle_card", "A future built with the best")}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                </div>

                <BallonDorVisionCard
                  onBookMeeting={() => setMeetingOpen(true)}
                  t={playerOfferT}
                />

                <p className="mt-4 text-center text-[11px] text-muted-foreground">
                  {offerT(lang, "rwu_private_footer", "This page is a private invitation and is not indexed by search engines.")}
                </p>
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
          {stage === "hub" && activeCard && activeMeta && !showWhyRiseDetail && (
            <div className="relative bg-black min-h-[100dvh]">
              <DetailView
                activeCard={activeCard}
                cardContent={cardContent}
                ageGroup={ageGroup}
                scoutingPosition={scoutingPosition}
                setScoutingPosition={setScoutingPosition}
                performanceSub={performanceSub}
                setPerformanceSub={setPerformanceSub}
                recommendedScoutingPosition={resolveScoutingPosition(player?.position)}
                onBack={onDetailBack}
                playerLang={playerLang}
                extraScoutingContent={shouldShowDatabaseCard ? (
                  <ScoutingDatabaseCard
                    playerId={player.id}
                    playerName={player.name}
                    position={player.position}
                    club={player.club}
                    nationality={player.nationality}
                    imageUrl={player.image_url}
                    fitScore={fitScore}
                    lang={lang}
                    t={t}
                  />
                ) : null}
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

          {stage === "hub" && showWhyRiseDetail && (
            <WhyRiseDetailView
              lang={lang}
              ageGroup={ageGroup}
              onBack={() => { setShowWhyRiseDetail(false); window.scrollTo({ top: 0, behavior: "auto" }); }}
                t={playerOfferT}
            />
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
                    {(player.image_url || finalFallbackImage || extraIntro.find((m) => m.kind === "image")?.url) ? (
                      <img
                        src={player.image_url || finalFallbackImage || extraIntro.find((m) => m.kind === "image")!.url}
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
                  <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-center">
                    <Button
                      size="lg"
                      onClick={() => setMeetingOpen(true)}
                      className="border border-primary font-bebas uppercase tracking-wider shadow-[0_0_28px_-8px_hsl(var(--gold)/0.75)] hover:brightness-95"
                      style={{ backgroundColor: "hsl(var(--gold))", color: "hsl(0 0% 4%)" }}
                    >
                      <CalendarClock className="mr-2 h-5 w-5" /> {ot("rwu_meet_cta", "Let's Meet")}
                    </Button>
                    <Button asChild size="lg" className="font-bebas uppercase tracking-wider border border-[#25D366] bg-[#25D366] text-white hover:bg-[#1ebe57] hover:text-white">
                      <a href={buildWhatsappUrl(lang)} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="mr-2 h-5 w-5" /> {ot("message_whatsapp", "Message us on WhatsApp")}
                      </a>
                    </Button>
                  </div>
                  {settings.show_have_agent && (
                    <div className="pt-4 flex flex-col items-center gap-3">
                      {haveAgentAck ? (
                        <p className="max-w-xl text-sm sm:text-base text-foreground/80 leading-relaxed border-t border-border/40 pt-4">
                          {ot(
                            "already_agent_thank_you",
                            "Thank you for letting us know. We want to support your long-term career, so please don't hesitate to reach out to us at a later date if your situation changes.",
                          )}
                        </p>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={haveAgentSubmitting}
                          onClick={async () => {
                            if (haveAgentSubmitting) return;
                            setHaveAgentSubmitting(true);
                            // Optimistically show the thank-you so the player
                            // never sees a loading spinner — even if the
                            // notification call fails we still want them to
                            // feel acknowledged.
                            setHaveAgentAck(true);
                            try {
                              await insertStaffNotification({
                                eventType: "offer_have_agent",
                                title: `Already has an agent: ${player.name}`,
                                body: `${player.name} confirmed they already have an agent from their Rise With Us page.`,
                                eventData: {
                                  player_id: player.id,
                                  player_name: player.name,
                                  language: lang,
                                  source: "rise_with_us",
                                },
                              });
                            } catch (err) {
                              console.error("Failed to log 'already have agent'", err);
                            } finally {
                              setHaveAgentSubmitting(false);
                            }
                          }}
                          className="font-bebas uppercase tracking-[0.18em] text-xs text-foreground/70 hover:text-foreground border-border/60 hover:bg-muted/40"
                        >
                          {ot("i_already_have_agent", "I already have an agent")}
                        </Button>
                      )}
                    </div>
                  )}
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

          <MeetingBookerDialog
            open={meetingOpen}
            onOpenChange={setMeetingOpen}
            player={player}
            lang={lang}
          />
        </>
      )}
    </div>
  );
};

export default RiseWithUs;
