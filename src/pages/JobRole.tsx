import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { ScrollReveal } from "@/components/ScrollReveal";
import { ArrowLeft, Briefcase, ChevronRight, Clock, MapPin, PoundSterling } from "lucide-react";
import { JobBody } from "@/components/jobs/JobBody";
import { JobShareButton } from "@/components/jobs/JobShareButton";
import { JobApplyForm } from "@/components/jobs/JobApplyForm";
import smudgedMarble from "@/assets/smudged-marble-overlay.png";

interface Job {
  id: string;
  title: string;
  slug: string;
  department: string;
  location: string | null;
  type: string | null;
  description: string | null;
  requirements: string | null;
  responsibilities: string | null;
  salary_range: string | null;
  summary: string | null;
  seo_image_url: string | null;
  is_active: boolean;
  created_at: string;
}

const JobRole = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useLanguage();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showFloatingApply, setShowFloatingApply] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("jobs")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (cancelled) return;
      if (!data) setNotFound(true);
      else setJob(data as Job);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  // Hide the floating "Apply now" pill once the user reaches the apply section.
  useEffect(() => {
    if (!job) return;
    const target = document.getElementById("apply");
    if (!target || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      ([entry]) => setShowFloatingApply(!entry.isIntersecting),
      { threshold: 0.15 },
    );
    obs.observe(target);
    return () => obs.disconnect();
  }, [job]);

  const canonical = `https://risefootballagency.com/jobs/${slug}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 pt-32 md:pt-24">
          <div className="h-12 w-2/3 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-6 w-1/3 animate-pulse rounded bg-muted" />
          <div className="mt-12 h-64 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (notFound || !job) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-32 pb-24 text-center md:pt-32">
          <h1 className="font-bebas text-4xl uppercase tracking-wider">{t('job_role.role_not_found', 'Role not found')}</h1>
          <p className="mt-3 text-muted-foreground">{t('job_role.this_role_may_have_been_filled_or_removed', 'This role may have been filled or removed.')}</p>
          <Button asChild className="mt-6"><Link to="/jobs">{t('job_role.view_all_roles', 'View all roles')}</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  const seoDescription = job.summary || (job.description ? job.description.slice(0, 155) : `Apply for ${job.title} at RISE Football Agency.`);

  const jobLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: [job.summary, job.description, job.responsibilities, job.requirements].filter(Boolean).join("\n\n"),
    datePosted: job.created_at,
    employmentType: (job.type || "FULL_TIME").toUpperCase().replace("-", "_"),
    hiringOrganization: {
      "@type": "Organization",
      name: "RISE Football Agency",
      sameAs: "https://risefootballagency.com",
    },
    jobLocation: job.location
      ? { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: job.location } }
      : undefined,
    baseSalary: job.salary_range ? { "@type": "MonetaryAmount", currency: "GBP", value: { "@type": "QuantitativeValue", value: job.salary_range, unitText: "YEAR" } } : undefined,
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO
        title={`${job.title} — Careers at RISE`}
        description={seoDescription}
        image={job.seo_image_url || "/og-preview-jobs.png"}
        url={`/jobs/${job.slug}`}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jobLd) }} />
      <Header />

      <main className="pt-32 md:pt-24">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-black" />
          <div
            className="absolute inset-0 bg-cover bg-center opacity-60 mix-blend-screen"
            style={{ backgroundImage: `url(${smudgedMarble})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-background" />
          <div className="relative container mx-auto px-4 py-12 md:py-20">
            <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-4 w-4" />  {t('job_role.all_roles', 'All roles')}
            </Link>
            <div className="mt-4 flex items-center gap-2 text-xs uppercase tracking-widest text-primary/80">
              <span>{t('job_role.careers', 'Careers')}</span><ChevronRight className="h-3 w-3" /><span className="text-muted-foreground">{job.department}</span>
            </div>
            <h1 className="mt-3 font-bebas text-4xl uppercase tracking-wider text-white md:text-6xl">
              {job.title}
            </h1>
            {job.summary && (
              <p className="mt-4 max-w-3xl text-lg text-white/85 md:text-xl">{job.summary}</p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Chip icon={<Briefcase className="h-3.5 w-3.5" />} label={job.department} />
              {job.location && <Chip icon={<MapPin className="h-3.5 w-3.5" />} label={job.location} />}
              {job.type && <Chip icon={<Clock className="h-3.5 w-3.5" />} label={job.type} />}
              {job.salary_range && <Chip icon={<PoundSterling className="h-3.5 w-3.5" />} label={job.salary_range} />}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button asChild className="btn-shine font-bebas uppercase tracking-wider">
                <a href="#apply">{t('job_role.apply_for_this_role', 'Apply for this role')}</a>
              </Button>
              <JobShareButton url={canonical} title={job.title} summary={job.summary || undefined} />
            </div>
          </div>
        </section>

        {/* Body */}
        <section className="container mx-auto px-4 py-12 md:py-16">
          <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
            <ScrollReveal>
              <div className="space-y-10 divide-y divide-primary/15">
                {job.description && (
                  <div className="pt-0">
                    <h2 className="mb-4 font-bebas text-2xl uppercase tracking-wider text-primary">{t('job_role.about_the_role', 'About the role')}</h2>
                    <JobBody content={job.description} />
                  </div>
                )}
                {job.responsibilities && (
                  <div className="pt-10">
                    <h2 className="mb-4 font-bebas text-2xl uppercase tracking-wider text-primary">{t('job_role.responsibilities', 'Responsibilities')}</h2>
                    <JobBody content={job.responsibilities} />
                  </div>
                )}
                {job.requirements && (
                  <div className="pt-10">
                    <h2 className="mb-4 font-bebas text-2xl uppercase tracking-wider text-primary">{t('job_role.requirements', 'Requirements')}</h2>
                    <JobBody content={job.requirements} />
                  </div>
                )}
              </div>
            </ScrollReveal>

            <aside className="lg:sticky lg:top-28 lg:self-start">
              <div className="rounded-2xl border border-primary/20 bg-card/50 p-5 backdrop-blur-sm">
                <h3 className="font-bebas text-lg uppercase tracking-wider text-primary">{t('job_role.at_a_glance', 'At a glance')}</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <Row k="Department" v={job.department} />
                  {job.location && <Row k="Location" v={job.location} />}
                  {job.type && <Row k="Type" v={job.type} />}
                  {job.salary_range && <Row k="Salary" v={job.salary_range} />}
                </dl>
                <Button asChild className="btn-shine mt-4 w-full font-bebas uppercase tracking-wider">
                  <a href="#apply">{t('job_role.apply_now', 'Apply now')}</a>
                </Button>
                <div className="mt-3">
                  <JobShareButton url={canonical} title={job.title} summary={job.summary || undefined} />
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* Apply */}
        <section id="apply" className="container mx-auto px-4 pb-24">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-2 font-bebas text-3xl uppercase tracking-wider md:text-4xl">
              
              {t('job_role.apply_for', 'Apply for')} <span className="text-primary">{job.title}</span>
            </h2>
            <p className="mb-6 text-muted-foreground">{t('job_role.all_fields_except_the_cover_letter_and_cv_are_re', 'All fields except the cover letter and CV are required.')}</p>
            <JobApplyForm jobId={job.id} jobSlug={job.slug} jobTitle={job.title} />
          </div>
        </section>
      </main>

      {/* Floating Apply Now pill — hides once the apply section is in view */}
      {showFloatingApply && (
        <a
          href="#apply"
          className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 inline-flex items-center gap-2 rounded-full border border-primary/60 bg-primary px-6 py-3 font-bebas text-sm uppercase tracking-widest text-primary-foreground shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.7)] backdrop-blur-md transition hover:scale-[1.03] md:bottom-8"
        >
          
          {t('job_role.apply_now_2', 'Apply now')}
        </a>
      )}

      <Footer />
    </div>
  );
};

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-black/40 px-3 py-1 text-xs text-white/90 backdrop-blur-sm">
      {icon}{label}
    </span>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/40 pb-2 last:border-0">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right text-foreground">{v}</dd>
    </div>
  );
}

export default JobRole;