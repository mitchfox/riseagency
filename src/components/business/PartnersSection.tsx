import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { ScrollReveal } from "@/components/ScrollReveal";
import { motion, AnimatePresence } from "framer-motion";

interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  website_url: string | null;
  is_featured: boolean;
  category: string;
  case_study_title: string | null;
  case_study_content: string | null;
  case_study_image_url: string | null;
}

export const PartnersSection = () => {
  const { t } = useLanguage();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchPartners = async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .order("display_order", { ascending: true });
      
      if (!error && data) {
        setPartners(data);
      }
      setLoading(false);
    };
    fetchPartners();
  }, []);

  // Auto-rotate featured partner every 8 seconds
  useEffect(() => {
    if (partners.length > 1) {
      intervalRef.current = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % partners.length);
      }, 8000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [partners.length]);

  if (loading || partners.length === 0) {
    return null;
  }

  const activePartner = partners[activeIndex];
  const otherPartners = partners.filter((_, i) => i !== activeIndex);

  return (
    <ScrollReveal>
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground mb-4">
              {t('business.partners_title', 'Our')} <span className="text-primary">{t('business.partners_highlight', 'Partners')}</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto italic">
              {t('business.partners_subtitle', 'Trusted by leading brands and organisations in football')}
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            {/* Featured Partner - Large Detail Card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activePartner.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="mb-8"
              >
                <div className="relative rounded-2xl overflow-hidden bg-card border border-border/50 hover:border-primary/50 transition-all duration-500">
                  {activePartner.case_study_image_url ? (
                    <div className="grid md:grid-cols-2 gap-0">
                      <div className="aspect-video md:aspect-auto md:h-80 relative">
                        <img 
                          src={activePartner.case_study_image_url} 
                          alt={activePartner.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-6 md:p-8 flex flex-col justify-center">
                        <span className="inline-block px-3 py-1 bg-primary/90 text-primary-foreground text-xs font-bebas uppercase tracking-wider rounded mb-3 w-fit">
                          {activePartner.category === 'case-study' ? 'Case Study' : 'Featured Partner'}
                        </span>
                        {activePartner.logo_url && (
                          <img 
                            src={activePartner.logo_url} 
                            alt={activePartner.name}
                            className="h-12 object-contain mb-4 w-fit"
                          />
                        )}
                        <h3 className="text-2xl md:text-3xl font-bebas uppercase tracking-wider text-foreground mb-3">
                          {activePartner.case_study_title || activePartner.name}
                        </h3>
                        {activePartner.description && (
                          <p className="text-muted-foreground mb-4">{activePartner.description}</p>
                        )}
                        {activePartner.case_study_content && (
                          <p className="text-sm text-muted-foreground line-clamp-3">{activePartner.case_study_content}</p>
                        )}
                        {activePartner.website_url && (
                          <a 
                            href={activePartner.website_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 mt-4 text-primary hover:text-primary/80 transition-colors w-fit"
                          >
                            <span className="text-sm font-medium">Learn More</span>
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 md:p-12">
                      <div className="flex flex-col md:flex-row md:items-center gap-6">
                        {activePartner.logo_url && (
                          <img 
                            src={activePartner.logo_url} 
                            alt={activePartner.name}
                            className="h-16 md:h-20 object-contain"
                          />
                        )}
                        <div className="flex-1">
                          <span className="inline-block px-3 py-1 bg-primary/90 text-primary-foreground text-xs font-bebas uppercase tracking-wider rounded mb-3">
                            Featured Partner
                          </span>
                          <h3 className="text-2xl md:text-3xl font-bebas uppercase tracking-wider text-foreground mb-3">
                            {activePartner.case_study_title || activePartner.name}
                          </h3>
                          {activePartner.description && (
                            <p className="text-muted-foreground">{activePartner.description}</p>
                          )}
                          {activePartner.website_url && (
                            <a 
                              href={activePartner.website_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 mt-4 text-primary hover:text-primary/80 transition-colors"
                            >
                              <span className="text-sm font-medium">Visit Website</span>
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Other Partners - Small Logo Grid */}
            {otherPartners.length > 0 && (
              <div className="flex flex-wrap justify-center gap-4">
                {otherPartners.map((partner, index) => (
                  <button
                    key={partner.id}
                    onClick={() => setActiveIndex(partners.findIndex(p => p.id === partner.id))}
                    className={cn(
                      "w-20 h-20 md:w-24 md:h-24 rounded-xl bg-card border border-border/50 hover:border-primary/50 flex items-center justify-center p-3 transition-all duration-300 group",
                      "hover:scale-105"
                    )}
                  >
                    {partner.logo_url ? (
                      <img 
                        src={partner.logo_url} 
                        alt={partner.name}
                        className="max-w-full max-h-full object-contain opacity-50 group-hover:opacity-100 transition-opacity"
                      />
                    ) : (
                      <span className="text-xs font-bebas uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors text-center">
                        {partner.name}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Indicator dots */}
            {partners.length > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                {partners.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveIndex(index)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-300",
                      index === activeIndex ? "bg-primary w-6" : "bg-border hover:bg-primary/50"
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
};
