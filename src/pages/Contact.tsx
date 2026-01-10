import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { MessageCircle, Mail } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ScrollReveal, ScrollRevealContainer, ScrollRevealItem } from "@/components/ScrollReveal";

interface ContactSection {
  titleKey: string;
  titleFallback: string;
  descKey: string;
  descFallback: string;
  whatsapp: string;
  email: string;
}

const Contact = () => {
  const { t } = useLanguage();

  const contactSections: ContactSection[] = [
    {
      titleKey: "contact.players",
      titleFallback: "Players",
      descKey: "contact.players_desc",
      descFallback: "Take your career to the next level with professional representation",
      whatsapp: "+447508342901",
      email: "jolon.levene@risefootballagency.com"
    },
    {
      titleKey: "contact.clubs",
      titleFallback: "Clubs",
      descKey: "contact.clubs_desc",
      descFallback: "Discover top talent for your squad through our extensive network",
      whatsapp: "+447508342901",
      email: "jolon.levene@risefootballagency.com"
    },
    {
      titleKey: "contact.media",
      titleFallback: "Media",
      descKey: "contact.media_desc",
      descFallback: "Press inquiries and media relations",
      whatsapp: "+447446365438",
      email: "kuda.butawo@risefootballagency.com"
    },
    {
      titleKey: "contact.sponsors",
      titleFallback: "Sponsors",
      descKey: "contact.sponsors_desc",
      descFallback: "Partnership and sponsorship opportunities",
      whatsapp: "+447446365438",
      email: "kuda.butawo@risefootballagency.com"
    },
    {
      titleKey: "contact.agents",
      titleFallback: "Agents",
      descKey: "contact.agents_desc",
      descFallback: "Professional collaboration and networking",
      whatsapp: "+447508342901",
      email: "jolon.levene@risefootballagency.com"
    },
    {
      titleKey: "contact.parents",
      titleFallback: "Player Parents",
      descKey: "contact.parents_desc",
      descFallback: "Supporting your young player's journey",
      whatsapp: "+447508342901",
      email: "jolon.levene@risefootballagency.com"
    },
    {
      titleKey: "contact.other",
      titleFallback: "Other",
      descKey: "contact.other_desc",
      descFallback: "General inquiries and other matters",
      whatsapp: "+447446365438",
      email: "kuda.butawo@risefootballagency.com"
    }
  ];

  return (
    <>
      <SEO 
        title="Contact Us | RISE Football Agency"
        description="Get in touch with RISE Football Agency for player representation, club partnerships, media inquiries, and more."
        image="/og-preview-contact.png"
        url="/contact"
      />
      <Header />
      <div className="min-h-screen bg-background pt-32 md:pt-24 touch-pan-y overflow-x-hidden">
        {/* Page Header */}
        <div className="bg-background border-b border-primary/20">
          <div className="container mx-auto px-4 py-12">
            <ScrollReveal>
              <h1 className="text-6xl md:text-7xl font-bebas uppercase text-foreground mb-4 tracking-wider">
                {t('contact.title', 'Contact Us')}
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                {t('contact.subtitle', 'Get in touch with the right team member for your needs')}
              </p>
            </ScrollReveal>
          </div>
        </div>

        {/* Contact Sections */}
        <main className="container mx-auto px-4 py-8">
          <ScrollRevealContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-8" staggerDelay={0.08}>
            {contactSections.map((section) => (
              <ScrollRevealItem key={section.titleKey}>
                <div className="bg-secondary/30 backdrop-blur-sm p-8 rounded-lg border border-primary/20 hover:border-primary transition-all space-y-6">
                  <div>
                    <h2 className="text-3xl font-bebas uppercase tracking-wider text-primary mb-3">
                      {t(section.titleKey, section.titleFallback)}
                    </h2>
                    <p className="text-muted-foreground">
                      {t(section.descKey, section.descFallback)}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Button 
                      asChild
                      className="btn-shine w-full text-lg font-bebas uppercase tracking-wider"
                      size="lg"
                    >
                      <a 
                        href={`https://wa.me/${section.whatsapp.replace(/\+/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="mr-2 h-5 w-5" />
                        {t('contact.whatsapp', 'WhatsApp')}
                      </a>
                    </Button>

                    <Button 
                      asChild
                      variant="outline"
                      className="w-full text-lg font-bebas uppercase tracking-wider"
                      size="lg"
                    >
                      <a 
                        href={`mailto:${section.email}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Mail className="mr-2 h-5 w-5" />
                        {t('contact.email', 'Email')}
                      </a>
                    </Button>
                  </div>
                </div>
              </ScrollRevealItem>
            ))}
          </ScrollRevealContainer>
        </main>
      </div>
      <Footer />
    </>
  );
};

export default Contact;
