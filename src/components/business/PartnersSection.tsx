import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { ScrollReveal } from "@/components/ScrollReveal";

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

  if (loading || partners.length === 0) {
    return null;
  }

  // Separate featured and regular partners
  const featuredPartners = partners.filter(p => p.is_featured);
  const regularPartners = partners.filter(p => !p.is_featured);

  return (
    <ScrollReveal>
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground mb-4">
              {t('business.partners_title', 'Our')} <span className="text-primary">{t('business.partners_highlight', 'Partners')}</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('business.partners_subtitle', 'Trusted by leading brands and organisations in football')}
            </p>
          </div>

          {/* Alternating layout grid */}
          <div className="space-y-8">
            {partners.map((partner, index) => {
              const isFeatured = partner.is_featured;
              const isEvenIndex = index % 2 === 0;
              
              if (isFeatured) {
                // Featured: Large card taking most of the screen
                return (
                  <div 
                    key={partner.id}
                    className={cn(
                      "grid gap-6",
                      isEvenIndex ? "md:grid-cols-[2fr_1fr]" : "md:grid-cols-[1fr_2fr]"
                    )}
                  >
                    {/* Large featured card */}
                    <div 
                      className={cn(
                        "relative group rounded-2xl overflow-hidden bg-card border border-border/50 hover:border-primary/50 transition-all duration-500",
                        !isEvenIndex && "md:order-2"
                      )}
                    >
                      {partner.case_study_image_url ? (
                        <div className="aspect-[16/9] md:aspect-auto md:h-full relative">
                          <img 
                            src={partner.case_study_image_url} 
                            alt={partner.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                            <span className="inline-block px-3 py-1 bg-primary/90 text-primary-foreground text-xs font-bebas uppercase tracking-wider rounded mb-3">
                              {partner.category === 'case-study' ? 'Case Study' : 'Featured Partner'}
                            </span>
                            <h3 className="text-2xl md:text-3xl font-bebas uppercase tracking-wider text-white mb-2">
                              {partner.case_study_title || partner.name}
                            </h3>
                            {partner.description && (
                              <p className="text-white/80 line-clamp-2">{partner.description}</p>
                            )}
                            {partner.website_url && (
                              <a 
                                href={partner.website_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 mt-4 text-primary hover:text-primary/80 transition-colors"
                              >
                                <span className="text-sm font-medium">Learn More</span>
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 md:p-12 h-full flex flex-col justify-center">
                          {partner.logo_url && (
                            <img 
                              src={partner.logo_url} 
                              alt={partner.name}
                              className="h-16 md:h-20 object-contain mb-6"
                            />
                          )}
                          <h3 className="text-2xl md:text-3xl font-bebas uppercase tracking-wider text-foreground mb-3">
                            {partner.case_study_title || partner.name}
                          </h3>
                          {partner.description && (
                            <p className="text-muted-foreground">{partner.description}</p>
                          )}
                          {partner.case_study_content && (
                            <p className="text-muted-foreground mt-4 line-clamp-3">{partner.case_study_content}</p>
                          )}
                          {partner.website_url && (
                            <a 
                              href={partner.website_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 mt-6 text-primary hover:text-primary/80 transition-colors"
                            >
                              <span className="text-sm font-medium">Visit Website</span>
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Small logo square */}
                    {regularPartners.length > 0 && (
                      <div 
                        className={cn(
                          "flex flex-col gap-4",
                          !isEvenIndex && "md:order-1"
                        )}
                      >
                        {regularPartners.slice(0, 2).map((regular) => (
                          <a
                            key={regular.id}
                            href={regular.website_url || "#"}
                            target={regular.website_url ? "_blank" : undefined}
                            rel="noopener noreferrer"
                            className="aspect-square bg-card border border-border/50 hover:border-primary/50 rounded-xl flex items-center justify-center p-6 transition-all duration-300 group"
                          >
                            {regular.logo_url ? (
                              <img 
                                src={regular.logo_url} 
                                alt={regular.name}
                                className="max-w-full max-h-full object-contain opacity-70 group-hover:opacity-100 transition-opacity"
                              />
                            ) : (
                              <span className="text-2xl font-bebas uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                                {regular.name}
                              </span>
                            )}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              
              return null;
            })}

            {/* Remaining regular partners in a grid */}
            {regularPartners.length > 2 && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-8">
                {regularPartners.slice(2).map((partner) => (
                  <a
                    key={partner.id}
                    href={partner.website_url || "#"}
                    target={partner.website_url ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="aspect-square bg-card border border-border/50 hover:border-primary/50 rounded-xl flex items-center justify-center p-4 transition-all duration-300 group"
                  >
                    {partner.logo_url ? (
                      <img 
                        src={partner.logo_url} 
                        alt={partner.name}
                        className="max-w-full max-h-full object-contain opacity-60 group-hover:opacity-100 transition-opacity"
                      />
                    ) : (
                      <span className="text-sm font-bebas uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors text-center">
                        {partner.name}
                      </span>
                    )}
                  </a>
                ))}
              </div>
            )}

            {/* If no featured but has regular partners */}
            {featuredPartners.length === 0 && regularPartners.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {regularPartners.map((partner) => (
                  <a
                    key={partner.id}
                    href={partner.website_url || "#"}
                    target={partner.website_url ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="aspect-square bg-card border border-border/50 hover:border-primary/50 rounded-xl flex items-center justify-center p-4 transition-all duration-300 group"
                  >
                    {partner.logo_url ? (
                      <img 
                        src={partner.logo_url} 
                        alt={partner.name}
                        className="max-w-full max-h-full object-contain opacity-60 group-hover:opacity-100 transition-opacity"
                      />
                    ) : (
                      <span className="text-sm font-bebas uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors text-center">
                        {partner.name}
                      </span>
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
};
