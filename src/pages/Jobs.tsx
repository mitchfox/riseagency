import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { ScrollReveal, ScrollRevealContainer, ScrollRevealItem } from "@/components/ScrollReveal";
import { ArrowRight, Briefcase, Clock, MapPin, PoundSterling } from "lucide-react";
import bannerHero from "@/assets/banner-hero.jpg";

interface Job {
  id: string;
  title: string;
  slug: string;
  department: string;
  location: string | null;
  type: string | null;
  description: string | null;
  summary: string | null;
  salary_range: string | null;
  is_active: boolean;
  created_at: string;
}

const Jobs = () => {
  const { t } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("jobs")
        .select("id,title,slug,department,location,type,description,summary,salary_range,is_active,created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (data) setJobs(data as Job[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO 
        title={t('jobs.careers_at_rise_join_our_team_rise_football_agen', 'Careers at RISE - Join Our Team | RISE Football Agency')}
        description={t('jobs.join_rise_football_agency_we_re_looking_for_tale', 'Join RISE Football Agency. We\'re looking for talented individuals passionate about football to help develop the next generation of players.')}
        image="/og-preview-jobs.png"
        url="/jobs"
      />
      <Header />

      <main className="pt-32 md:pt-24">
        {/* Hero */}
        <section className="relative flex items-center justify-center overflow-hidden py-20 md:py-28">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${bannerHero})` }} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/65 to-background" />
          <div className="relative container mx-auto px-4 text-center">
            <span className="inline-block rounded-full border border-primary/30 px-6 py-2 font-bebas text-sm uppercase tracking-widest text-primary">
              {t("jobs.badge", "Careers")}
            </span>
            <h1 className="mt-6 font-bebas text-5xl uppercase tracking-wider text-white md:text-7xl">
              {t("jobs.hero_title", "JOIN THE")} <span className="text-primary">{t("jobs.hero_highlight", "RISE TEAM")}</span>
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-lg text-white/85 md:text-xl">
              {t("jobs.hero_subtitle", "Help shape the future of football representation")}
            </p>
          </div>
        </section>

        {/* Roles */}
        <section className="bg-background py-16 md:py-20">
          <div className="container mx-auto px-4">
            <ScrollReveal>
              <div className="mx-auto mb-10 max-w-3xl text-center">
                <h2 className="font-bebas text-4xl uppercase tracking-wider md:text-5xl">
                  {t("jobs.open_positions", "OPEN")} <span className="text-primary">{t("jobs.positions", "POSITIONS")}</span>
                </h2>
                <p className="mt-3 italic text-muted-foreground">
                  {t("jobs.positions_desc", "Find your role in helping players realise their potential")}
                </p>
              </div>
            </ScrollReveal>

            {loading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-48 animate-pulse rounded-2xl bg-muted" />
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <div className="py-16 text-center">
                <p className="mb-3 text-xl text-muted-foreground">
                  {t("jobs.no_positions", "No open positions at this time")}
                </p>
                <p className="text-muted-foreground">
                  {t("jobs.check_back", "Please check back later or send us a speculative application")}
                </p>
              </div>
            ) : (
              <ScrollRevealContainer className="grid gap-4 md:grid-cols-2" staggerDelay={0.08}>
                {jobs.map((job) => (
                  <ScrollRevealItem key={job.id}>
                    <Link
                      to={`/jobs/${job.slug}`}
                      className="group relative block h-full overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-[0_10px_40px_-15px_hsl(var(--primary)/0.5)]"
                    >
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-primary/80">
                        <span>{job.department}</span>
                        {job.location && <><span className="text-border">·</span><span className="text-muted-foreground">{job.location}</span></>}
                      </div>
                      <h3 className="mt-2 font-bebas text-2xl uppercase tracking-wider text-foreground transition-colors group-hover:text-primary md:text-3xl">
                        {job.title}
                      </h3>
                      {(job.summary || job.description) && (
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                          {job.summary || job.description}
                        </p>
                      )}
                      <div className="mt-5 flex flex-wrap items-center gap-2">
                        {job.type && <Pill icon={<Clock className="h-3 w-3" />}>{job.type}</Pill>}
                        {job.location && <Pill icon={<MapPin className="h-3 w-3" />}>{job.location}</Pill>}
                        {job.salary_range && <Pill icon={<PoundSterling className="h-3 w-3" />}>{job.salary_range}</Pill>}
                        <Pill icon={<Briefcase className="h-3 w-3" />}>{job.department}</Pill>
                      </div>
                      <div className="mt-5 flex items-center justify-end gap-1 font-bebas text-sm uppercase tracking-widest text-primary">
                        
                        {t('jobs.view_role', 'View role')} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </Link>
                  </ScrollRevealItem>
                ))}
              </ScrollRevealContainer>
            )}
          </div>
        </section>

        {/* Speculative Application */}
        <ScrollReveal>
          <section className="py-16 md:py-24 bg-muted/30">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-6">
                {t('jobs.dont_see', "DON'T SEE YOUR")} <span className="text-primary">{t('jobs.role', 'ROLE?')}</span>
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                {t('jobs.speculative', "We're always looking for talented individuals. Send us your details and we'll keep you in mind for future opportunities.")}
              </p>
              <Button 
                asChild
                size="lg" 
                className="btn-shine font-bebas uppercase tracking-wider"
              >
                <a href="mailto:jolon.levene@risefootballagency.com?subject=Speculative%20Application">
                  
                  {t('jobs.send_speculative_application', 'Send Speculative Application')}
                </a>
              </Button>
            </div>
          </section>
        </ScrollReveal>
      </main>

      <Footer />
    </div>
  );
};

function Pill({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/40 px-2.5 py-0.5 text-[11px] text-muted-foreground">
      {icon}{children}
    </span>
  );
}

export default Jobs;