import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { MessageCircle, Mail } from "lucide-react";

interface ContactSection {
  title: string;
  description: string;
  whatsapp: string;
  email: string;
}

const contactSections: ContactSection[] = [
  {
    title: "Players",
    description: "Take your career to the next level with professional representation",
    whatsapp: "+447508342901",
    email: "jolon.levene@risefootballagency.com"
  },
  {
    title: "Clubs",
    description: "Discover top talent for your squad through our extensive network",
    whatsapp: "+447508342901",
    email: "jolon.levene@risefootballagency.com"
  },
  {
    title: "Media",
    description: "Press inquiries and media relations",
    whatsapp: "+447446365438",
    email: "kuda.butawo@risefootballagency.com"
  },
  {
    title: "Sponsors",
    description: "Partnership and sponsorship opportunities",
    whatsapp: "+447446365438",
    email: "kuda.butawo@risefootballagency.com"
  },
  {
    title: "Agents",
    description: "Professional collaboration and networking",
    whatsapp: "+447508342901",
    email: "jolon.levene@risefootballagency.com"
  },
  {
    title: "Player Parents",
    description: "Supporting your young player's journey",
    whatsapp: "+447508342901",
    email: "jolon.levene@risefootballagency.com"
  },
  {
    title: "Other",
    description: "General inquiries and other matters",
    whatsapp: "+447446365438",
    email: "kuda.butawo@risefootballagency.com"
  }
];

const Contact = () => {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-background pt-24 md:pt-16 touch-pan-y overflow-x-hidden">
        {/* Page Header */}
        <div className="bg-background border-b border-primary/20">
          <div className="container mx-auto px-4 py-12">
            <h1 className="text-6xl md:text-7xl font-bebas uppercase text-foreground mb-4 tracking-wider">
              Contact Us
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Get in touch with the right team member for your needs
            </p>
          </div>
        </div>

        {/* Contact Sections */}
        <main className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {contactSections.map((section) => (
              <div 
                key={section.title}
                className="bg-secondary/30 backdrop-blur-sm p-8 rounded-lg border border-primary/20 hover:border-primary transition-all space-y-6"
              >
                <div>
                  <h2 className="text-3xl font-bebas uppercase tracking-wider text-primary mb-3">
                    {section.title}
                  </h2>
                  <p className="text-muted-foreground">
                    {section.description}
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
                      WhatsApp
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
                      Email
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </>
  );
};

export default Contact;
