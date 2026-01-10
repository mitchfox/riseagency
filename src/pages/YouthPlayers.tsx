import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";
import { RepresentationDialog } from "@/components/RepresentationDialog";
import { useState } from "react";
import { ScrollReveal, ScrollRevealContainer, ScrollRevealItem } from "@/components/ScrollReveal";
import { 
  Search, 
  MessageCircle, 
  FileCheck, 
  Rocket, 
  Shield, 
  Users, 
  Target, 
  TrendingUp,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Star,
  Heart
} from "lucide-react";
import bannerHero from "@/assets/banner-hero.jpg";

const YouthPlayers = () => {
  const { t } = useLanguage();
  const [representationOpen, setRepresentationOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const signingProcess = [
    {
      step: 1,
      icon: Search,
      titleKey: "youth.step1_title",
      titleFallback: "Discovery",
      descKey: "youth.step1_desc",
      descFallback: "You reach out to us or we scout you. Either way, we identify talent worth investing in."
    },
    {
      step: 2,
      icon: MessageCircle,
      titleKey: "youth.step2_title",
      titleFallback: "Discussion",
      descKey: "youth.step2_desc",
      descFallback: "If we're interested, we discuss further, including with parents if you're under 18. Full transparency from day one."
    },
    {
      step: 3,
      icon: FileCheck,
      titleKey: "youth.step3_title",
      titleFallback: "The Offer",
      descKey: "youth.step3_desc",
      descFallback: "We present exactly what we can offer: development support, representation, and a clear pathway forward."
    },
    {
      step: 4,
      icon: Rocket,
      titleKey: "youth.step4_title",
      titleFallback: "Sign & Start",
      descKey: "youth.step4_desc",
      descFallback: "We begin the development journey together. Performance teams, match analysis, and guidance from day one."
    }
  ];

  const faqs = [
    {
      questionKey: "youth.faq1_q",
      questionFallback: "How does the signing process work?",
      answerKey: "youth.faq1_a",
      answerFallback: "The signing process begins with an initial point of contact, which may originate from our scouting network identifying your potential, or from you reaching out to us directly. Following this, we conduct an internal assessment to determine whether representation is appropriate. If we identify a strong fit, we arrange a formal discussion during which we outline our services, expectations, and the pathway forward. For players under 18 years of age, we require the involvement of a parent or guardian at all stages. Upon mutual agreement, we formalise the partnership through a representation agreement, and work commences immediately on your development programme."
    },
    {
      questionKey: "youth.faq2_q",
      questionFallback: "What level do you work with?",
      answerKey: "youth.faq2_a",
      answerFallback: "We represent first-team professionals competing across Europe's major leagues, as well as exceptionally talented youth players who demonstrate both the ability and commitment required to succeed at the highest level. Our selection criteria are rigorous: we seek players who possess not only technical proficiency but also the psychological attributes, work ethic, and ambition necessary for sustained success in professional football. We do not measure potential solely by current ability, but by the trajectory and scalability of a player's development."
    },
    {
      questionKey: "youth.faq3_q",
      questionFallback: "What makes RISE different from other agencies?",
      answerKey: "youth.faq3_a",
      answerFallback: "RISE was founded by individuals who have experienced the professional football journey firsthand, as both players and coaches. This background informs our unique approach to representation. Unlike traditional agencies that focus primarily on transactional aspects, we have built comprehensive performance infrastructure around our players, including tactical analysis, physical conditioning programmes, and psychological support. We have developed talent that has collectively commanded over £100 million in transfer fees across Europe's major leagues. Our distinguishing characteristic is our deep understanding of player development, which enables us to guide athletes toward their full potential rather than simply facilitating transfers."
    },
    {
      questionKey: "youth.faq4_q",
      questionFallback: "What happens if I'm under 18?",
      answerKey: "youth.faq4_a",
      answerFallback: "For players under the age of 18, we maintain a strict protocol of parental or guardian involvement at every stage of the process. This includes all initial discussions, assessment meetings, contract negotiations, and ongoing career decisions. We provide complete transparency regarding our activities, fees, and strategic recommendations. Parents receive regular updates on their child's development progress and are included in all significant communications with clubs. We consider family support to be an essential component of a young player's success, and we work collaboratively to ensure all parties are fully informed and aligned."
    },
    {
      questionKey: "youth.faq5_q",
      questionFallback: "What support do I actually get?",
      answerKey: "youth.faq5_a",
      answerFallback: "Upon signing with RISE, you gain access to our comprehensive support infrastructure. This includes: detailed performance analysis of your match footage with actionable developmental feedback; bespoke physical conditioning programmes designed around your specific needs and position requirements; psychological performance support to develop mental resilience and competitive mindset; tactical coaching and positional guidance; career strategy and pathway planning; contract negotiation and transfer management when opportunities arise; and continuous access to our team for guidance and support. Our approach is holistic: we focus on developing the complete professional footballer."
    },
    {
      questionKey: "youth.faq6_q",
      questionFallback: "What are the costs involved?",
      answerKey: "youth.faq6_a",
      answerFallback: "Our fee structure is transparent and clearly communicated during our initial discussions. We operate on a success-based model, meaning our remuneration is aligned with your career progression. Standard agency fees apply to contract negotiations and transfers, in accordance with FA regulations. Development services are provided as part of our representation agreement. There are no hidden charges, and all financial arrangements are documented clearly before any partnership is formalised. We encourage prospective clients and their families to seek independent legal advice when reviewing our terms."
    }
  ];

  // FAQ Schema for structured data
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": t(faq.questionKey, faq.questionFallback),
      "acceptedAnswer": {
        "@type": "Answer",
        "text": t(faq.answerKey, faq.answerFallback)
      }
    }))
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO 
        title="For Youth Players & Parents - RISE Agency"
        description="The pathway to the top. Learn how RISE develops youth players with the will and skill to make it. Expert guidance."
        image="/og-preview-youth.png"
        url="/youth-players"
        structuredData={faqSchema}
      />
      <Header />
      <RepresentationDialog open={representationOpen} onOpenChange={setRepresentationOpen} />
      
      <main className="pt-32 md:pt-24 touch-pan-y overflow-x-hidden">
        {/* Hero Section */}
        <section className="relative h-[70vh] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bannerHero})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-background" />
          
          <div className="relative container mx-auto px-4 text-center z-10">
            <div className="inline-block mb-6">
              <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                {t('youth.badge', 'For Players & Parents')}
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bebas uppercase tracking-wider text-white mb-6">
              {t('youth.hero_title', 'THE PATHWAY TO')} <span className="text-primary">{t('youth.hero_highlight', 'THE TOP')}</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto mb-8">
              {t('youth.hero_subtitle', 'The best agency for developing talents and guiding them to the top')}
            </p>
            <Button 
              onClick={() => setRepresentationOpen(true)}
              size="lg" 
              className="btn-shine font-bebas uppercase tracking-wider text-lg px-8"
            >
              {t('youth.request_rep', 'Request Representation')}
            </Button>
          </div>
        </section>

        {/* Who We Work With */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-8">
                {t('youth.who_we_work', 'WHO WE')} <span className="text-primary">{t('youth.work_with', 'WORK WITH')}</span>
              </h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="p-8 border border-border/50 bg-card/30 rounded-lg">
                  <Star className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-bebas uppercase tracking-wider text-primary mb-4">
                    {t('youth.first_team', 'First Team Professionals')}
                  </h3>
                  <p className="text-muted-foreground">
                    {t('youth.first_team_desc', 'Players already competing at the highest levels who want expert representation and career guidance.')}
                  </p>
                </div>
                <div className="p-8 border border-border/50 bg-card/30 rounded-lg">
                  <Target className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-bebas uppercase tracking-wider text-primary mb-4">
                    {t('youth.talented_youth', 'Talented Youth Players')}
                  </h3>
                  <p className="text-muted-foreground">
                    {t('youth.talented_youth_desc', 'Young players with the will and skill to make it. Those committed to reaching their full potential.')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Our Story */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-4">
                  {t('youth.our', 'OUR')} <span className="text-primary">{t('youth.story', 'STORY')}</span>
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  {t('youth.story_intro', 'The foundation of our approach, built on experience.')}
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="p-8 border border-border/50 bg-card/30 rounded-lg">
                  <div className="flex items-start gap-4">
                    <span className="text-4xl font-bebas text-primary/30">01</span>
                    <div>
                      <h3 className="text-xl font-bebas uppercase tracking-wider text-foreground mb-3">
                        {t('youth.story_title_1', 'Player Origins')}
                      </h3>
                      <p className="text-muted-foreground">
                        {t('youth.story_p1', 'We started as players. We understand the journey: the sacrifices, the setbacks, and what it takes to succeed at the highest levels of the game.')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-8 border border-border/50 bg-card/30 rounded-lg">
                  <div className="flex items-start gap-4">
                    <span className="text-4xl font-bebas text-primary/30">02</span>
                    <div>
                      <h3 className="text-xl font-bebas uppercase tracking-wider text-foreground mb-3">
                        {t('youth.story_title_2', 'Coaching Experience')}
                      </h3>
                      <p className="text-muted-foreground">
                        {t('youth.story_p2', 'We became coaches. We learned how to develop talent, identify potential, and build players capable of competing at the highest level.')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-8 border border-border/50 bg-card/30 rounded-lg">
                  <div className="flex items-start gap-4">
                    <span className="text-4xl font-bebas text-primary/30">03</span>
                    <div>
                      <h3 className="text-xl font-bebas uppercase tracking-wider text-foreground mb-3">
                        {t('youth.story_title_3', 'Performance Development')}
                      </h3>
                      <p className="text-muted-foreground">
                        {t('youth.story_p3', 'We developed performance teams around Premier League talents. We witnessed firsthand what separates good players from exceptional ones.')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-8 border border-primary/30 bg-primary/5 rounded-lg">
                  <div className="flex items-start gap-4">
                    <span className="text-4xl font-bebas text-primary">04</span>
                    <div>
                      <h3 className="text-xl font-bebas uppercase tracking-wider text-foreground mb-3">
                        {t('youth.story_title_4', 'The Agency Today')}
                      </h3>
                      <p className="text-foreground">
                        {t('youth.story_p4', 'We built this into the agency we operate today. Every lesson, every insight, every connection: now focused on helping the next generation realise their potential.')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The Signing Process */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-4">
                {t('youth.signing', 'THE SIGNING')} <span className="text-primary">{t('youth.process', 'PROCESS')}</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                {t('youth.process_desc', 'A structured, transparent approach to representation.')}
              </p>
            </div>

            <div className="max-w-6xl mx-auto">
              <div className="relative">
                {/* Horizontal connector line */}
                <div className="hidden md:block absolute top-20 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />
                
                <div className="grid md:grid-cols-4 gap-8">
                  {signingProcess.map((step, index) => (
                    <div key={step.step} className="relative">
                      <div className="relative bg-card border border-border/50 rounded-xl p-8 hover:border-primary/50 hover:shadow-lg transition-all duration-300 group">
                        {/* Step number badge */}
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bebas text-lg z-10">
                          {step.step}
                        </div>
                        
                        {/* Icon */}
                        <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                          <step.icon className="w-10 h-10 text-primary" />
                        </div>
                        
                        <h3 className="text-2xl font-bebas uppercase tracking-wider text-center mb-4">
                          {t(step.titleKey, step.titleFallback)}
                        </h3>
                        
                        <p className="text-sm text-muted-foreground text-center leading-relaxed">
                          {t(step.descKey, step.descFallback)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What Makes Us Different */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-12 text-center">
                {t('youth.what_makes', 'WHAT MAKES US')} <span className="text-primary">{t('youth.different', 'DIFFERENT')}</span>
              </h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div className="flex gap-4">
                  <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bebas uppercase tracking-wider mb-2">
                      {t('youth.been_there', "We've Been There")}
                    </h3>
                    <p className="text-muted-foreground">
                      {t('youth.been_there_desc', 'Our background as players and coaches means we understand development from the inside, not just the business side.')}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bebas uppercase tracking-wider mb-2">
                      {t('youth.dev_first', 'Development First')}
                    </h3>
                    <p className="text-muted-foreground">
                      {t('youth.dev_first_desc', 'Our USP is understanding how to develop a player and guide them to realise their potential. Everything else follows.')}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bebas uppercase tracking-wider mb-2">
                      {t('youth.track_record', 'Proven Track Record')}
                    </h3>
                    <p className="text-muted-foreground">
                      {t('youth.track_record_desc', "74 professionals, 18 Big 5 league players, 10 national team players. Over £100 million in transfer fees for players we've developed.")}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bebas uppercase tracking-wider mb-2">
                      {t('youth.european_network', 'European Network')}
                    </h3>
                    <p className="text-muted-foreground">
                      {t('youth.european_network_desc', 'Eyes across all of Europe. Working with clubs in every major league to find the right opportunities.')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Transparency Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-4 mb-8">
                <Shield className="w-12 h-12 text-primary" />
                <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider">
                  {t('youth.our_commitment', 'OUR')} <span className="text-primary">{t('youth.commitment', 'COMMITMENT')}</span>
                </h2>
              </div>
              
              <div className="space-y-6 text-lg text-muted-foreground">
                <p>
                  <strong className="text-foreground">{t('youth.transparency', 'Full transparency.')}</strong> {t('youth.transparency_desc', "You'll know exactly what we offer, what we expect, and what the journey looks like. No hidden agendas, no surprises.")}
                </p>
                <p>
                  <strong className="text-foreground">{t('youth.parent_inv', 'Parent involvement.')}</strong> {t('youth.parent_inv_desc', 'For players under 18, parents are part of every conversation. We believe families should be informed and involved at every stage.')}
                </p>
                <p>
                  <strong className="text-foreground">{t('youth.realistic', 'Realistic expectations.')}</strong> {t('youth.realistic_desc', "We won't promise what we can't deliver. We'll give you an honest assessment of where you are and what it will take to get where you want to be.")}
                </p>
                <p>
                  <strong className="text-foreground">{t('youth.long_term', 'Long-term thinking.')}</strong> {t('youth.long_term_desc', "We're not interested in quick wins. We build careers, not just contracts.")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-12 text-center">
                {t('youth.faq_title', 'FREQUENTLY ASKED')} <span className="text-primary">{t('youth.questions', 'QUESTIONS')}</span>
              </h2>
              
              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <div 
                    key={index}
                    className="border border-border/50 bg-card/30 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => setOpenFaq(openFaq === index ? null : index)}
                      className="w-full flex items-center justify-between p-6 text-left hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-lg font-bebas uppercase tracking-wider pr-4">
                        {t(faq.questionKey, faq.questionFallback)}
                      </span>
                      {openFaq === index ? (
                        <ChevronUp className="w-5 h-5 text-primary flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      )}
                    </button>
                    {openFaq === index && (
                      <div className="px-6 pb-6">
                        <p className="text-muted-foreground">{t(faq.answerKey, faq.answerFallback)}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-6">
              {t('youth.ready_start', 'READY TO START')} <span className="text-primary">{t('youth.your_journey', 'YOUR JOURNEY?')}</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t('youth.cta_desc', "Whether you're a player looking for representation or a parent exploring options, we'd love to hear from you.")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => setRepresentationOpen(true)}
                size="lg" 
                className="btn-shine font-bebas uppercase tracking-wider"
              >
                {t('youth.request_rep', 'Request Representation')}
              </Button>
              <Button 
                asChild 
                variant="outline" 
                size="lg" 
                className="font-bebas uppercase tracking-wider"
              >
                <Link to="/contact">{t('youth.contact_us', 'Contact Us')}</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default YouthPlayers;
