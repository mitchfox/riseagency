import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useRoleSubdomain, RoleSubdomain } from "@/hooks/useRoleSubdomain";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import logo from "@/assets/logo.png";
import { useLanguage } from "@/contexts/LanguageContext";

type Role = "player" | "coach" | "club" | "agent" | "parent" | "media" | "scout" | "other" | null;

// Map subdomain to role
const subdomainToRole: Record<Exclude<RoleSubdomain, null>, Role> = {
  players: "player",
  clubs: "club",
  agents: "agent",
  coaches: "coach",
  scouts: "scout",
  business: "other",
  media: "media",
};

// Role label translations
const roleTranslations: Record<string, Record<string, string>> = {
  player: { en: "Player", es: "Jugador", pt: "Jogador", fr: "Joueur", de: "Spieler", it: "Giocatore", pl: "Zawodnik", cs: "Hráč", ru: "Игрок", tr: "Oyuncu", hr: "Igrač", no: "Spiller" },
  coach: { en: "Coach", es: "Entrenador", pt: "Treinador", fr: "Entraîneur", de: "Trainer", it: "Allenatore", pl: "Trener", cs: "Trenér", ru: "Тренер", tr: "Antrenör", hr: "Trener", no: "Trener" },
  club: { en: "Club", es: "Club", pt: "Clube", fr: "Club", de: "Verein", it: "Club", pl: "Klub", cs: "Klub", ru: "Клуб", tr: "Kulüp", hr: "Klub", no: "Klubb" },
  agent: { en: "Agent", es: "Agente", pt: "Agente", fr: "Agent", de: "Agent", it: "Agente", pl: "Agent", cs: "Agent", ru: "Агент", tr: "Menajer", hr: "Agent", no: "Agent" },
  parent: { en: "Parent", es: "Padre/Madre", pt: "Pai/Mãe", fr: "Parent", de: "Elternteil", it: "Genitore", pl: "Rodzic", cs: "Rodič", ru: "Родитель", tr: "Veli", hr: "Roditelj", no: "Forelder" },
  media: { en: "Media", es: "Medios", pt: "Mídia", fr: "Média", de: "Medien", it: "Media", pl: "Media", cs: "Média", ru: "СМИ", tr: "Medya", hr: "Mediji", no: "Media" },
  scout: { en: "Scout", es: "Ojeador", pt: "Olheiro", fr: "Recruteur", de: "Scout", it: "Scout", pl: "Skaut", cs: "Skaut", ru: "Скаут", tr: "İzci", hr: "Skaut", no: "Speider" },
  other: { en: "Other", es: "Otro", pt: "Outro", fr: "Autre", de: "Andere", it: "Altro", pl: "Inne", cs: "Jiné", ru: "Другое", tr: "Diğer", hr: "Ostalo", no: "Annet" },
};

const dialogTranslations: Record<string, Record<string, string>> = {
  selectRole: { 
    en: "Please select your role to continue", 
    es: "Por favor selecciona tu rol para continuar", 
    pt: "Por favor selecione sua função para continuar", 
    fr: "Veuillez sélectionner votre rôle pour continuer", 
    de: "Bitte wählen Sie Ihre Rolle aus, um fortzufahren", 
    it: "Seleziona il tuo ruolo per continuare", 
    pl: "Wybierz swoją rolę, aby kontynuować", 
    cs: "Vyberte svou roli pro pokračování", 
    ru: "Выберите вашу роль, чтобы продолжить", 
    tr: "Devam etmek için lütfen rolünüzü seçin",
    hr: "Odaberite svoju ulogu za nastavak",
    no: "Velg din rolle for å fortsette"
  },
  otherOptions: { 
    en: "Other Options", 
    es: "Otras opciones", 
    pt: "Outras opções", 
    fr: "Autres options", 
    de: "Andere Optionen", 
    it: "Altre opzioni", 
    pl: "Inne opcje", 
    cs: "Další možnosti", 
    ru: "Другие варианты", 
    tr: "Diğer seçenekler",
    hr: "Ostale opcije",
    no: "Andre alternativer"
  },
  backToRoleSelection: { 
    en: "← Back to role selection", 
    es: "← Volver a selección de rol", 
    pt: "← Voltar para seleção de função", 
    fr: "← Retour à la sélection du rôle", 
    de: "← Zurück zur Rollenauswahl", 
    it: "← Torna alla selezione del ruolo", 
    pl: "← Powrót do wyboru roli", 
    cs: "← Zpět na výběr role", 
    ru: "← Назад к выбору роли", 
    tr: "← Rol seçimine geri dön",
    hr: "← Natrag na odabir uloge",
    no: "← Tilbake til rollevalg"
  },
  fullName: { en: "Full Name *", es: "Nombre Completo *", pt: "Nome Completo *", fr: "Nom Complet *", de: "Vollständiger Name *", it: "Nome Completo *", pl: "Imię i Nazwisko *", cs: "Celé jméno *", ru: "Полное имя *", tr: "Tam Ad *", hr: "Puno ime *", no: "Fullt navn *" },
  email: { en: "Email *", es: "Correo Electrónico *", pt: "E-mail *", fr: "E-mail *", de: "E-Mail *", it: "E-mail *", pl: "E-mail *", cs: "E-mail *", ru: "Электронная почта *", tr: "E-posta *", hr: "E-mail *", no: "E-post *" },
  whatsapp: { en: "WhatsApp Number *", es: "Número de WhatsApp *", pt: "Número do WhatsApp *", fr: "Numéro WhatsApp *", de: "WhatsApp-Nummer *", it: "Numero WhatsApp *", pl: "Numer WhatsApp *", cs: "Číslo WhatsApp *", ru: "Номер WhatsApp *", tr: "WhatsApp Numarası *", hr: "WhatsApp broj *", no: "WhatsApp-nummer *" },
  position: { en: "Position *", es: "Posición *", pt: "Posição *", fr: "Poste *", de: "Position *", it: "Posizione *", pl: "Pozycja *", cs: "Pozice *", ru: "Позиция *", tr: "Pozisyon *", hr: "Pozicija *", no: "Posisjon *" },
  age: { en: "Age *", es: "Edad *", pt: "Idade *", fr: "Âge *", de: "Alter *", it: "Età *", pl: "Wiek *", cs: "Věk *", ru: "Возраст *", tr: "Yaş *", hr: "Dob *", no: "Alder *" },
  currentClub: { en: "Current Club", es: "Club Actual", pt: "Clube Atual", fr: "Club Actuel", de: "Aktueller Verein", it: "Club Attuale", pl: "Obecny Klub", cs: "Současný klub", ru: "Текущий клуб", tr: "Mevcut Kulüp", hr: "Trenutni klub", no: "Nåværende klubb" },
  tellAboutYourself: { en: "Tell us about yourself", es: "Cuéntanos sobre ti", pt: "Conte-nos sobre você", fr: "Parlez-nous de vous", de: "Erzählen Sie uns von sich", it: "Parlaci di te", pl: "Opowiedz nam o sobie", cs: "Řekněte nám o sobě", ru: "Расскажите о себе", tr: "Kendinizden bahsedin", hr: "Recite nam o sebi", no: "Fortell oss om deg selv" },
  submitApplication: { en: "Submit Application", es: "Enviar Solicitud", pt: "Enviar Candidatura", fr: "Soumettre la Candidature", de: "Bewerbung Einreichen", it: "Invia Candidatura", pl: "Wyślij Aplikację", cs: "Odeslat přihlášku", ru: "Отправить заявку", tr: "Başvuruyu Gönder", hr: "Pošalji prijavu", no: "Send søknad" },
  submitInquiry: { en: "Submit Inquiry", es: "Enviar Consulta", pt: "Enviar Consulta", fr: "Soumettre la Demande", de: "Anfrage Einreichen", it: "Invia Richiesta", pl: "Wyślij Zapytanie", cs: "Odeslat dotaz", ru: "Отправить запрос", tr: "Sorguyu Gönder", hr: "Pošalji upit", no: "Send forespørsel" },
  specialization: { en: "Specialization *", es: "Especialización *", pt: "Especialização *", fr: "Spécialisation *", de: "Spezialisierung *", it: "Specializzazione *", pl: "Specjalizacja *", cs: "Specializace *", ru: "Специализация *", tr: "Uzmanlık *", hr: "Specijalizacija *", no: "Spesialisering *" },
  licenses: { en: "Coaching Licenses", es: "Licencias de Entrenador", pt: "Licenças de Treinador", fr: "Licences d'Entraîneur", de: "Trainerlizenzen", it: "Licenze Allenatore", pl: "Licencje Trenerskie", cs: "Trenérské licence", ru: "Тренерские лицензии", tr: "Antrenör Lisansları", hr: "Trenerske licence", no: "Trenerlisenser" },
  experience: { en: "Years of Experience *", es: "Años de Experiencia *", pt: "Anos de Experiência *", fr: "Années d'Expérience *", de: "Jahre Erfahrung *", it: "Anni di Esperienza *", pl: "Lata Doświadczenia *", cs: "Roky zkušeností *", ru: "Лет опыта *", tr: "Deneyim Yılı *", hr: "Godine iskustva *", no: "År med erfaring *" },
  coachingPhilosophy: { en: "Tell us about your coaching philosophy", es: "Cuéntanos sobre tu filosofía de entrenamiento", pt: "Conte-nos sobre sua filosofia de treinamento", fr: "Parlez-nous de votre philosophie d'entraînement", de: "Erzählen Sie uns von Ihrer Trainingsphilosophie", it: "Parlaci della tua filosofia di allenamento", pl: "Opowiedz nam o swojej filozofii trenerskiej", cs: "Řekněte nám o své trenérské filozofii", ru: "Расскажите о своей тренерской философии", tr: "Antrenörlük felsefenizi anlatın", hr: "Recite nam o svojoj trenerskoj filozofiji", no: "Fortell oss om din treningsfilosofi" },
  clubName: { en: "Club Name *", es: "Nombre del Club *", pt: "Nome do Clube *", fr: "Nom du Club *", de: "Vereinsname *", it: "Nome del Club *", pl: "Nazwa Klubu *", cs: "Název klubu *", ru: "Название клуба *", tr: "Kulüp Adı *", hr: "Naziv kluba *", no: "Klubbnavn *" },
  contactPerson: { en: "Contact Person *", es: "Persona de Contacto *", pt: "Pessoa de Contato *", fr: "Personne de Contact *", de: "Ansprechpartner *", it: "Persona di Contatto *", pl: "Osoba Kontaktowa *", cs: "Kontaktní osoba *", ru: "Контактное лицо *", tr: "İletişim Kişisi *", hr: "Kontakt osoba *", no: "Kontaktperson *" },
  league: { en: "League/Division *", es: "Liga/División *", pt: "Liga/Divisão *", fr: "Ligue/Division *", de: "Liga/Division *", it: "Campionato/Divisione *", pl: "Liga/Dywizja *", cs: "Liga/Divize *", ru: "Лига/Дивизион *", tr: "Lig/Bölüm *", hr: "Liga/Divizija *", no: "Liga/Divisjon *" },
  whatLookingFor: { en: "What are you looking for?", es: "¿Qué estás buscando?", pt: "O que você está procurando?", fr: "Que recherchez-vous?", de: "Was suchen Sie?", it: "Cosa stai cercando?", pl: "Czego szukasz?", cs: "Co hledáte?", ru: "Что вы ищете?", tr: "Ne arıyorsunuz?", hr: "Što tražite?", no: "Hva ser du etter?" },
  agencyName: { en: "Agency Name", es: "Nombre de la Agencia", pt: "Nome da Agência", fr: "Nom de l'Agence", de: "Agenturname", it: "Nome Agenzia", pl: "Nazwa Agencji", cs: "Název agentury", ru: "Название агентства", tr: "Ajans Adı", hr: "Naziv agencije", no: "Byråets navn" },
  fifaLicense: { en: "FIFA License Number", es: "Número de Licencia FIFA", pt: "Número da Licença FIFA", fr: "Numéro de Licence FIFA", de: "FIFA-Lizenznummer", it: "Numero Licenza FIFA", pl: "Numer Licencji FIFA", cs: "Číslo licence FIFA", ru: "Номер лицензии FIFA", tr: "FIFA Lisans Numarası", hr: "Broj FIFA licence", no: "FIFA-lisensnummer" },
  howCollaborate: { en: "How can we collaborate?", es: "¿Cómo podemos colaborar?", pt: "Como podemos colaborar?", fr: "Comment pouvons-nous collaborer?", de: "Wie können wir zusammenarbeiten?", it: "Come possiamo collaborare?", pl: "Jak możemy współpracować?", cs: "Jak můžeme spolupracovat?", ru: "Как мы можем сотрудничать?", tr: "Nasıl işbirliği yapabiliriz?", hr: "Kako možemo surađivati?", no: "Hvordan kan vi samarbeide?" },
  playerName: { en: "Player's Name *", es: "Nombre del Jugador *", pt: "Nome do Jogador *", fr: "Nom du Joueur *", de: "Name des Spielers *", it: "Nome del Giocatore *", pl: "Imię Zawodnika *", cs: "Jméno hráče *", ru: "Имя игрока *", tr: "Oyuncu Adı *", hr: "Ime igrača *", no: "Spillerens navn *" },
  playerAge: { en: "Player's Age *", es: "Edad del Jugador *", pt: "Idade do Jogador *", fr: "Âge du Joueur *", de: "Alter des Spielers *", it: "Età del Giocatore *", pl: "Wiek Zawodnika *", cs: "Věk hráče *", ru: "Возраст игрока *", tr: "Oyuncu Yaşı *", hr: "Dob igrača *", no: "Spillerens alder *" },
  currentClubAcademy: { en: "Current Club/Academy", es: "Club/Academia Actual", pt: "Clube/Academia Atual", fr: "Club/Académie Actuel", de: "Aktueller Verein/Akademie", it: "Club/Accademia Attuale", pl: "Obecny Klub/Akademia", cs: "Současný klub/Akademie", ru: "Текущий клуб/Академия", tr: "Mevcut Kulüp/Akademi", hr: "Trenutni klub/Akademija", no: "Nåværende klubb/akademi" },
  tellAboutPlayer: { en: "Tell us about the player", es: "Cuéntanos sobre el jugador", pt: "Conte-nos sobre o jogador", fr: "Parlez-nous du joueur", de: "Erzählen Sie uns vom Spieler", it: "Parlaci del giocatore", pl: "Opowiedz nam o zawodniku", cs: "Řekněte nám o hráči", ru: "Расскажите об игроке", tr: "Oyuncu hakkında bilgi verin", hr: "Recite nam o igraču", no: "Fortell oss om spilleren" },
  mediaOutlet: { en: "Media Outlet *", es: "Medio de Comunicación *", pt: "Veículo de Mídia *", fr: "Média *", de: "Medienunternehmen *", it: "Media *", pl: "Medium *", cs: "Médium *", ru: "СМИ *", tr: "Medya Kuruluşu *", hr: "Medij *", no: "Mediehus *" },
  yourRole: { en: "Your Role *", es: "Tu Rol *", pt: "Sua Função *", fr: "Votre Rôle *", de: "Ihre Rolle *", it: "Il Tuo Ruolo *", pl: "Twoja Rola *", cs: "Vaše role *", ru: "Ваша роль *", tr: "Rolünüz *", hr: "Vaša uloga *", no: "Din rolle *" },
  inquiryAbout: { en: "What's your inquiry about?", es: "¿Sobre qué es tu consulta?", pt: "Qual é sua consulta?", fr: "Quel est l'objet de votre demande?", de: "Worum geht es in Ihrer Anfrage?", it: "Di cosa tratta la tua richiesta?", pl: "O co chodzi w twoim zapytaniu?", cs: "O čem je váš dotaz?", ru: "О чём ваш запрос?", tr: "Sorgunuz ne hakkında?", hr: "O čemu je vaš upit?", no: "Hva gjelder forespørselen din?" },
  subject: { en: "Subject *", es: "Asunto *", pt: "Assunto *", fr: "Sujet *", de: "Betreff *", it: "Oggetto *", pl: "Temat *", cs: "Předmět *", ru: "Тема *", tr: "Konu *", hr: "Predmet *", no: "Emne *" },
  message: { en: "Message *", es: "Mensaje *", pt: "Mensagem *", fr: "Message *", de: "Nachricht *", it: "Messaggio *", pl: "Wiadomość *", cs: "Zpráva *", ru: "Сообщение *", tr: "Mesaj *", hr: "Poruka *", no: "Melding *" },
  howCanWeHelp: { en: "Tell us how we can help you...", es: "Cuéntanos cómo podemos ayudarte...", pt: "Conte-nos como podemos ajudá-lo...", fr: "Dites-nous comment nous pouvons vous aider...", de: "Sagen Sie uns, wie wir Ihnen helfen können...", it: "Dicci come possiamo aiutarti...", pl: "Powiedz nam, jak możemy ci pomóc...", cs: "Řekněte nám, jak vám můžeme pomoci...", ru: "Расскажите, чем мы можем помочь...", tr: "Size nasıl yardımcı olabileceğimizi anlatın...", hr: "Recite nam kako vam možemo pomoći...", no: "Fortell oss hvordan vi kan hjelpe deg..." },
  applicationTitle: { en: "Application", es: "Solicitud", pt: "Candidatura", fr: "Candidature", de: "Bewerbung", it: "Candidatura", pl: "Aplikacja", cs: "Přihláška", ru: "Заявка", tr: "Başvuru", hr: "Prijava", no: "Søknad" },
  formDescription: { en: "Fill out the form below and we'll get back to you soon", es: "Completa el formulario a continuación y te responderemos pronto", pt: "Preencha o formulário abaixo e entraremos em contato em breve", fr: "Remplissez le formulaire ci-dessous et nous vous répondrons bientôt", de: "Füllen Sie das Formular aus und wir melden uns bald bei Ihnen", it: "Compila il modulo qui sotto e ti risponderemo presto", pl: "Wypełnij poniższy formularz, a wkrótce się z tobą skontaktujemy", cs: "Vyplňte formulář níže a brzy se vám ozveme", ru: "Заполните форму ниже, и мы скоро свяжемся с вами", tr: "Aşağıdaki formu doldurun, en kısa sürede size geri dönelim", hr: "Ispunite obrazac ispod i javit ćemo vam se uskoro", no: "Fyll ut skjemaet nedenfor, så kontakter vi deg snart" },
};

interface WorkWithUsDialogProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const WorkWithUsDialog = ({ children, open, onOpenChange }: WorkWithUsDialogProps) => {
  const { toast } = useToast();
  const { currentRole: subdomainRole } = useRoleSubdomain();
  const { language } = useLanguage();
  const [selectedRole, setSelectedRole] = useState<Role>(null);
  const [otherRolesOpen, setOtherRolesOpen] = useState(false);

  // Helper to get translated text
  const getTranslation = (key: keyof typeof dialogTranslations) => {
    return dialogTranslations[key][language] || dialogTranslations[key].en;
  };

  const getRoleLabel = (role: string) => {
    return roleTranslations[role]?.[language] || roleTranslations[role]?.en || role;
  };

  // Get the default role based on subdomain
  const defaultRole = subdomainRole ? subdomainToRole[subdomainRole] : null;

  const resetSelection = () => {
    setSelectedRole(null);
    setOtherRolesOpen(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetSelection();
    }
    onOpenChange?.(isOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = new FormData(e.target as HTMLFormElement);
    const data: Record<string, any> = { role: selectedRole };
    formData.forEach((value, key) => {
      data[key] = value;
    });

    try {
      const { error } = await supabase.functions.invoke("send-form-email", {
        body: { formType: "work-with-us", data },
      });

      if (error) throw error;

      toast({
        title: "Application Submitted!",
        description: "We'll review your application and get back to you soon.",
      });
      setSelectedRole(null);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    }
  };

  const roles = [
    { value: "player" as const, label: getRoleLabel("player") },
    { value: "coach" as const, label: getRoleLabel("coach") },
    { value: "club" as const, label: getRoleLabel("club") },
    { value: "agent" as const, label: getRoleLabel("agent") },
    { value: "parent" as const, label: getRoleLabel("parent") },
    { value: "media" as const, label: getRoleLabel("media") },
    { value: "scout" as const, label: getRoleLabel("scout") },
    { value: "other" as const, label: getRoleLabel("other") },
  ];

  const renderRoleForm = () => {
    if (!selectedRole) {
      // Filter roles based on subdomain
      const otherRoles = defaultRole 
        ? roles.filter(r => r.value !== defaultRole)
        : roles;
      const primaryRole = defaultRole 
        ? roles.find(r => r.value === defaultRole)
        : null;

      return (
        <div className="space-y-4">
          <p className="text-center text-muted-foreground mb-6">
            {getTranslation("selectRole")}
          </p>
          
          {/* Show primary role (from subdomain) prominently */}
          {primaryRole && (
            <Button
              onClick={() => setSelectedRole(primaryRole.value)}
              size="lg"
              className="w-full font-bebas uppercase tracking-wider text-lg h-16"
            >
              {primaryRole.label}
            </Button>
          )}
          
          {/* Other roles in collapsible */}
          {defaultRole ? (
            <Collapsible open={otherRolesOpen} onOpenChange={setOtherRolesOpen}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full font-bebas uppercase tracking-wider justify-between"
                >
                  <span>{getTranslation("otherOptions")}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${otherRolesOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {otherRoles.map((role) => (
                    <Button
                      key={role.value}
                      onClick={() => setSelectedRole(role.value)}
                      variant="secondary"
                      size="lg"
                      className="font-bebas uppercase tracking-wider text-lg h-14"
                    >
                      {role.label}
                    </Button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            /* No subdomain - show all roles in grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {roles.map((role) => (
                <Button
                  key={role.value}
                  onClick={() => setSelectedRole(role.value)}
                  size="lg"
                  className="font-bebas uppercase tracking-wider text-lg h-16"
                >
                  {role.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Common fields for all forms
    const commonFields = (
      <>
        <div className="space-y-2">
          <Label htmlFor="name">{getTranslation("fullName")}</Label>
          <Input id="name" name="name" placeholder="John Doe" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{getTranslation("email")}</Label>
          <Input id="email" name="email" type="email" placeholder="john@example.com" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="whatsapp">{getTranslation("whatsapp")}</Label>
          <Input id="whatsapp" name="whatsapp" type="tel" placeholder="+1 (555) 000-0000" required />
        </div>
      </>
    );

    // Role-specific forms
    switch (selectedRole) {
      case "player":
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetSelection}
              className="mb-2"
            >
              {getTranslation("backToRoleSelection")}
            </Button>
            {commonFields}
            <div className="space-y-2">
              <Label htmlFor="position">Position *</Label>
              <Input id="position" name="position" placeholder="e.g., Striker, Midfielder" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="age">Age *</Label>
              <Input id="age" name="age" type="number" placeholder="21" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentClub">Current Club</Label>
              <Input id="currentClub" name="currentClub" placeholder="Your current club" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Tell us about yourself</Label>
              <Textarea
                id="message"
                name="message"
                placeholder="Share your experience, goals, and what you are looking for..."
                className="min-h-[100px]"
              />
            </div>
            <Button type="submit" size="lg" hoverEffect className="w-full btn-shine font-bebas uppercase tracking-wider">
              Submit Application
            </Button>
          </form>
        );

      case "coach":
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetSelection}
              className="mb-2"
            >
              {getTranslation("backToRoleSelection")}
            </Button>
            {commonFields}
            <div className="space-y-2">
              <Label htmlFor="specialization">Specialization *</Label>
              <Input id="specialization" name="specialization" placeholder="e.g., Youth Development, First Team" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licenses">Coaching Licenses</Label>
              <Input id="licenses" name="licenses" placeholder="UEFA A, B, etc." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="experience">Years of Experience *</Label>
              <Input id="experience" name="experience" type="number" placeholder="5" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Tell us about your coaching philosophy</Label>
              <Textarea
                id="message"
                name="message"
                placeholder="Share your experience, approach, and what you are looking for..."
                className="min-h-[100px]"
              />
            </div>
            <Button type="submit" size="lg" hoverEffect className="w-full btn-shine font-bebas uppercase tracking-wider">
              Submit Application
            </Button>
          </form>
        );

      case "club":
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetSelection}
              className="mb-2"
            >
              {getTranslation("backToRoleSelection")}
            </Button>
            <div className="space-y-2">
              <Label htmlFor="clubName">Club Name *</Label>
              <Input id="clubName" name="clubName" placeholder="Your Club Name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Person *</Label>
              <Input id="contactName" name="contactName" placeholder="Full Name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" placeholder="contact@club.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp Number *</Label>
              <Input id="whatsapp" name="whatsapp" type="tel" placeholder="+1 (555) 000-0000" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="league">League/Division *</Label>
              <Input id="league" name="league" placeholder="e.g., Championship, League Two" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">What are you looking for?</Label>
              <Textarea
                id="message"
                name="message"
                placeholder="Player recruitment, coaching staff, scouting services..."
                className="min-h-[100px]"
              />
            </div>
            <Button type="submit" size="lg" hoverEffect className="w-full btn-shine font-bebas uppercase tracking-wider">
              Submit Inquiry
            </Button>
          </form>
        );

      case "agent":
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetSelection}
              className="mb-2"
            >
              {getTranslation("backToRoleSelection")}
            </Button>
            {commonFields}
            <div className="space-y-2">
              <Label htmlFor="agency">Agency Name</Label>
              <Input id="agency" name="agency" placeholder="Your agency name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="license">FIFA License Number</Label>
              <Input id="license" name="license" placeholder="If applicable" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">How can we collaborate?</Label>
              <Textarea
                id="message"
                name="message"
                placeholder="Tell us about potential collaboration opportunities..."
                className="min-h-[100px]"
              />
            </div>
            <Button type="submit" size="lg" hoverEffect className="w-full btn-shine font-bebas uppercase tracking-wider">
              Submit Inquiry
            </Button>
          </form>
        );

      case "parent":
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetSelection}
              className="mb-2"
            >
              {getTranslation("backToRoleSelection")}
            </Button>
            {commonFields}
            <div className="space-y-2">
              <Label htmlFor="playerName">Player's Name *</Label>
              <Input id="playerName" name="playerName" placeholder="Your child's name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="playerAge">Player's Age *</Label>
              <Input id="playerAge" name="playerAge" type="number" placeholder="16" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position *</Label>
              <Input id="position" name="position" placeholder="e.g., Striker, Midfielder" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentClub">Current Club/Academy</Label>
              <Input id="currentClub" name="currentClub" placeholder="Current club or academy" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Tell us about the player</Label>
              <Textarea
                id="message"
                name="message"
                placeholder="Share their experience, strengths, and aspirations..."
                className="min-h-[100px]"
              />
            </div>
            <Button type="submit" size="lg" hoverEffect className="w-full btn-shine font-bebas uppercase tracking-wider">
              Submit Application
            </Button>
          </form>
        );

      case "media":
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetSelection}
              className="mb-2"
            >
              {getTranslation("backToRoleSelection")}
            </Button>
            {commonFields}
            <div className="space-y-2">
              <Label htmlFor="outlet">Media Outlet *</Label>
              <Input id="outlet" name="outlet" placeholder="Publication/Channel name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Your Role *</Label>
              <Input id="role" name="role" placeholder="e.g., Journalist, Content Creator" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">What's your inquiry about?</Label>
              <Textarea
                id="message"
                name="message"
                placeholder="Interview requests, press releases, media partnerships..."
                className="min-h-[100px]"
              />
            </div>
            <Button type="submit" size="lg" hoverEffect className="w-full btn-shine font-bebas uppercase tracking-wider">
              Submit Inquiry
            </Button>
          </form>
        );

      case "scout":
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetSelection}
              className="mb-2"
            >
              {getTranslation("backToRoleSelection")}
            </Button>
            {commonFields}
            <div className="space-y-2">
              <Label htmlFor="regions">Regions/Countries You Scout *</Label>
              <Input id="regions" name="regions" placeholder="e.g., Northern Europe, Spain, Germany" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="experience">Years of Scouting Experience *</Label>
              <Input id="experience" name="experience" type="number" placeholder="3" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="networks">Current Scouting Networks/Clubs</Label>
              <Input id="networks" name="networks" placeholder="Previous or current affiliations" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Tell us about your scouting experience</Label>
              <Textarea
                id="message"
                name="message"
                placeholder="Share your background, the levels you scout at, notable discoveries..."
                className="min-h-[100px]"
              />
            </div>
            <Button type="submit" size="lg" hoverEffect className="w-full btn-shine font-bebas uppercase tracking-wider">
              {getTranslation("submitApplication")}
            </Button>
          </form>
        );

      case "other":
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetSelection}
              className="mb-2"
            >
              {getTranslation("backToRoleSelection")}
            </Button>
            {commonFields}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input id="subject" name="subject" placeholder="What is this regarding?" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                name="message"
                placeholder="Tell us how we can help you..."
                className="min-h-[120px]"
                required
              />
            </div>
            <Button type="submit" size="lg" hoverEffect className="w-full btn-shine font-bebas uppercase tracking-wider">
              Submit Inquiry
            </Button>
          </form>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="w-[95vw] max-w-[900px] max-h-[90vh] overflow-y-auto">
        {!selectedRole && (
          <div className="flex justify-center pt-4 mb-4">
            <img src={logo} alt="RISE Football Agency" className="h-16" />
          </div>
        )}
        <DialogHeader>
          {selectedRole && (
            <>
              <DialogTitle className="text-3xl font-bebas uppercase tracking-wider">
                {`${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Application`}
              </DialogTitle>
              <DialogDescription>
                Fill out the form below and we'll get back to you soon
              </DialogDescription>
            </>
          )}
        </DialogHeader>
        {renderRoleForm()}
      </DialogContent>
    </Dialog>
  );
};
