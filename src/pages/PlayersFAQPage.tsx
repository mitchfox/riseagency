import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { PlayersFAQ } from "@/components/PlayersFAQ";
import { WhatsAppWidget } from "@/components/WhatsAppWidget";
import { useLanguage } from "@/contexts/LanguageContext";

const PlayersFAQPage = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO 
        title={t("faq.seo_title", "FAQ - Common Questions | RISE Football Agency")}
        description={t("faq.seo_desc", "Find answers to common questions about player representation, our services, the player portal, and working with RISE Football Agency.")}
        url="/faq"
      />
      <Header />
      <main className="pt-24">
        <PlayersFAQ />
      </main>
      <Footer />
      <WhatsAppWidget />
    </div>
  );
};

export default PlayersFAQPage;
