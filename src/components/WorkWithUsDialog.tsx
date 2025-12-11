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

type Role = "player" | "coach" | "club" | "agent" | "parent" | "media" | "other" | null;

// Map subdomain to role
const subdomainToRole: Record<Exclude<RoleSubdomain, null>, Role> = {
  players: "player",
  clubs: "club",
  agents: "agent",
  coaches: "coach",
  scouts: "other",
  business: "other",
  media: "media",
};

// Role label translations
const roleTranslations: Record<string, Record<string, string>> = {
  player: { en: "Player", es: "Jugador", pt: "Jogador", fr: "Joueur", de: "Spieler", it: "Giocatore", pl: "Zawodnik", cs: "Hráč", ru: "Игрок", tr: "Oyuncu" },
  coach: { en: "Coach", es: "Entrenador", pt: "Treinador", fr: "Entraîneur", de: "Trainer", it: "Allenatore", pl: "Trener", cs: "Trenér", ru: "Тренер", tr: "Antrenör" },
  club: { en: "Club", es: "Club", pt: "Clube", fr: "Club", de: "Verein", it: "Club", pl: "Klub", cs: "Klub", ru: "Клуб", tr: "Kulüp" },
  agent: { en: "Agent", es: "Agente", pt: "Agente", fr: "Agent", de: "Agent", it: "Agente", pl: "Agent", cs: "Agent", ru: "Агент", tr: "Menajer" },
  parent: { en: "Parent", es: "Padre/Madre", pt: "Pai/Mãe", fr: "Parent", de: "Elternteil", it: "Genitore", pl: "Rodzic", cs: "Rodič", ru: "Родитель", tr: "Veli" },
  media: { en: "Media", es: "Medios", pt: "Mídia", fr: "Média", de: "Medien", it: "Media", pl: "Media", cs: "Média", ru: "СМИ", tr: "Medya" },
  other: { en: "Other", es: "Otro", pt: "Outro", fr: "Autre", de: "Andere", it: "Altro", pl: "Inne", cs: "Jiné", ru: "Другое", tr: "Diğer" },
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
    tr: "Devam etmek için lütfen rolünüzü seçin" 
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
    tr: "Diğer seçenekler" 
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
    tr: "← Rol seçimine geri dön" 
  },
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
          <Label htmlFor="name">Full Name *</Label>
          <Input id="name" name="name" placeholder="John Doe" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input id="email" name="email" type="email" placeholder="john@example.com" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="whatsapp">WhatsApp Number *</Label>
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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
