import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { ScrollReveal, ScrollRevealContainer, ScrollRevealItem } from "@/components/ScrollReveal";
import { MapPin, Clock, Briefcase, ChevronDown, ChevronUp, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import bannerHero from "@/assets/banner-hero.jpg";

interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  description: string;
  requirements: string;
  responsibilities: string;
  salary_range: string | null;
  is_active: boolean;
  created_at: string;
}

const Jobs = () => {
  const { t } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [applyingTo, setApplyingTo] = useState<Job | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setJobs(data);
    }
    setLoading(false);
  };

  const handleApply = async () => {
    if (!formData.name || !formData.email || !applyingTo) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    
    const { error } = await supabase
      .from('form_submissions')
      .insert({
        form_type: 'job_application',
        data: {
          job_id: applyingTo.id,
          job_title: applyingTo.title,
          ...formData
        }
      });

    if (error) {
      toast.error('Failed to submit application');
    } else {
      toast.success('Application submitted successfully!');
      setApplyingTo(null);
      setFormData({ name: '', email: '', phone: '', message: '' });
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO 
        title="Careers at RISE - Join Our Team | RISE Football Agency"
        description="Join RISE Football Agency. We're looking for talented individuals passionate about football to help develop the next generation of players."
        image="/og-preview-jobs.png"
        url="/jobs"
      />
      <Header />
      
      <main className="pt-32 md:pt-24">
        {/* Hero Section */}
        <section className="relative h-[50vh] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bannerHero})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-background" />
          
          <div className="relative container mx-auto px-4 text-center z-10">
            <div className="inline-block mb-6">
              <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                {t('jobs.badge', 'Careers')}
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider text-white mb-6">
              {t('jobs.hero_title', 'JOIN THE')} <span className="text-primary">{t('jobs.hero_highlight', 'RISE TEAM')}</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              {t('jobs.hero_subtitle', 'Help shape the future of football representation')}
            </p>
          </div>
        </section>

        {/* Jobs List */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <ScrollReveal>
                <div className="text-center mb-12">
                  <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-4">
                    {t('jobs.open_positions', 'OPEN')} <span className="text-primary">{t('jobs.positions', 'POSITIONS')}</span>
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    {t('jobs.positions_desc', 'Find your role in helping players realise their potential')}
                  </p>
                </div>
              </ScrollReveal>

              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-xl text-muted-foreground mb-4">
                    {t('jobs.no_positions', 'No open positions at this time')}
                  </p>
                  <p className="text-muted-foreground">
                    {t('jobs.check_back', 'Please check back later or send us a speculative application')}
                  </p>
                </div>
              ) : (
                <ScrollRevealContainer className="space-y-4" staggerDelay={0.1}>
                  {jobs.map((job) => (
                    <ScrollRevealItem key={job.id}>
                      <Card className="overflow-hidden border-border/50 hover:border-primary/30 transition-colors">
                        <div 
                          className="p-6 cursor-pointer"
                          onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-2xl font-bebas uppercase tracking-wider text-primary mb-2">
                                {job.title}
                              </h3>
                              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Briefcase className="w-4 h-4" />
                                  {job.department}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  {job.location}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {job.type}
                                </span>
                              </div>
                            </div>
                            <button className="p-2 hover:bg-muted rounded-full transition-colors">
                              {expandedJob === job.id ? (
                                <ChevronUp className="w-5 h-5 text-primary" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                        </div>
                        
                        {expandedJob === job.id && (
                          <div className="px-6 pb-6 space-y-6 border-t border-border/50 pt-6">
                            {job.description && (
                              <div>
                                <h4 className="font-bebas text-lg uppercase tracking-wider mb-2">About the Role</h4>
                                <p className="text-muted-foreground">{job.description}</p>
                              </div>
                            )}
                            
                            {job.requirements && (
                              <div>
                                <h4 className="font-bebas text-lg uppercase tracking-wider mb-2">Requirements</h4>
                                <p className="text-muted-foreground whitespace-pre-line">{job.requirements}</p>
                              </div>
                            )}
                            
                            {job.responsibilities && (
                              <div>
                                <h4 className="font-bebas text-lg uppercase tracking-wider mb-2">Responsibilities</h4>
                                <p className="text-muted-foreground whitespace-pre-line">{job.responsibilities}</p>
                              </div>
                            )}
                            
                            {job.salary_range && (
                              <div>
                                <h4 className="font-bebas text-lg uppercase tracking-wider mb-2">Salary</h4>
                                <p className="text-muted-foreground">{job.salary_range}</p>
                              </div>
                            )}
                            
                            <Dialog open={applyingTo?.id === job.id} onOpenChange={(open) => !open && setApplyingTo(null)}>
                              <DialogTrigger asChild>
                                <Button 
                                  onClick={() => setApplyingTo(job)}
                                  className="btn-shine font-bebas uppercase tracking-wider"
                                >
                                  <Send className="w-4 h-4 mr-2" />
                                  Apply Now
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                  <DialogTitle className="font-bebas text-2xl uppercase tracking-wider">
                                    Apply for {job.title}
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                  <div>
                                    <Label htmlFor="name">Full Name *</Label>
                                    <Input 
                                      id="name"
                                      value={formData.name}
                                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                      placeholder="Your full name"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="email">Email *</Label>
                                    <Input 
                                      id="email"
                                      type="email"
                                      value={formData.email}
                                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                      placeholder="your@email.com"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="phone">Phone</Label>
                                    <Input 
                                      id="phone"
                                      value={formData.phone}
                                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                      placeholder="+44 7..."
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="message">Cover Letter / Message</Label>
                                    <Textarea 
                                      id="message"
                                      value={formData.message}
                                      onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                                      placeholder="Tell us about yourself and why you'd be a great fit..."
                                      rows={4}
                                    />
                                  </div>
                                  <Button 
                                    onClick={handleApply}
                                    disabled={submitting}
                                    className="w-full btn-shine font-bebas uppercase tracking-wider"
                                  >
                                    {submitting ? 'Submitting...' : 'Submit Application'}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                      </Card>
                    </ScrollRevealItem>
                  ))}
                </ScrollRevealContainer>
              )}
            </div>
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
                  Send Speculative Application
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

export default Jobs;