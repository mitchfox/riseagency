import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { MessageCircle, Mail, Users, Handshake, Globe, Shield, TrendingUp, Target, Award, Building, CheckCircle2, ArrowRight, Clock, FileText, Phone, MapPin, Briefcase, Star } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLanguage } from "@/contexts/LanguageContext";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Marquee } from "@/components/Marquee";

const Agents = () => {
  const { t } = useLanguage();

  const processSteps = [
    {
      step: "01",
      titleKey: "agents.step1_title",
      titleFallback: "Initial Contact",
      descKey: "agents.step1_desc",
      descFallback: "Reach out via WhatsApp or email. We respond within 24 hours to discuss potential collaboration.",
      icon: Phone,
    },
    {
      step: "02",
      titleKey: "agents.step2_title",
      titleFallback: "Discovery Call",
      descKey: "agents.step2_desc",
      descFallback: "A confidential call to understand your needs, player profiles, and how we can work together.",
      icon: MessageCircle,
    },
    {
      step: "03",
      titleKey: "agents.step3_title",
      titleFallback: "Agreement",
      descKey: "agents.step3_desc",
      descFallback: "Clear, fair terms documented. No hidden clauses, transparent commission structures.",
      icon: FileText,
    },
    {
      step: "04",
      titleKey: "agents.step4_title",
      titleFallback: "Collaboration",
      descKey: "agents.step4_desc",
      descFallback: "Active partnership with regular updates, shared insights, and mutual success.",
      icon: Handshake,
    },
  ];

  const faqs = [
    {
      questionKey: "agents.faq1_q",
      questionFallback: "What commission structures do you offer?",
      answerKey: "agents.faq1_a",
      answerFallback: "We operate on flexible, market-standard commission structures that are always negotiated upfront. Typical arrangements range from 5-15% depending on deal complexity and parties involved. Everything is documented clearly before any work begins.",
    },
    {
      questionKey: "agents.faq2_q",
      questionFallback: "How do you handle player confidentiality?",
      answerKey: "agents.faq2_a",
      answerFallback: "Confidentiality is paramount. All player information shared with us is protected under strict NDAs. We never discuss player details with third parties without explicit written consent from all relevant parties.",
    },
    {
      questionKey: "agents.faq3_q",
      questionFallback: "Which leagues do you have connections in?",
      answerKey: "agents.faq3_a",
      answerFallback: "Our primary focus is the English Football League (Championship, League One, League Two), Scottish Premiership, and select European leagues including Netherlands, Belgium, and Scandinavia. We also have growing connections in MLS and the Middle East.",
    },
    {
      questionKey: "agents.faq4_q",
      questionFallback: "Can you help with players outside your usual markets?",
      answerKey: "agents.faq4_a",
      answerFallback: "Absolutely. While we have strongest connections in certain markets, we are always open to exploring opportunities elsewhere. If we do not have direct contacts, we are transparent about it and can often facilitate introductions through our wider network.",
    },
    {
      questionKey: "agents.faq5_q",
      questionFallback: "What makes RISE different from other agencies?",
      answerKey: "agents.faq5_a",
      answerFallback: "We prioritize player development over quick deals. Our performance analysis, coaching connections, and athlete-centric approach means players we work with are better prepared for the next level. This benefits everyone - players perform better, clubs get more value, and agents build stronger reputations.",
    },
    {
      questionKey: "agents.faq6_q",
      questionFallback: "How quickly can you act on opportunities?",
      answerKey: "agents.faq6_a",
      answerFallback: "We pride ourselves on responsiveness. For urgent transfer window opportunities, we can typically provide club feedback within 48-72 hours. Our streamlined decision-making means no bureaucratic delays.",
    },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <SEO 
        title="For Agents - Collaborate with RISE"
        description="Partner with RISE Football Agency. Collaborate on player opportunities, share networks, and grow together."
        image="/og-preview-agents.png"
        url="/agents"
      />
      <Header />
      
      <main className="pt-32 md:pt-24">
        {/* Hero Section */}
        <section className="relative min-h-[70vh] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
          
          <div className="relative z-10 text-center max-w-4xl mx-auto pt-12 md:pt-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-6">
              <Handshake className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">{t('agents.badge', 'Agent Partnerships')}</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider mb-6 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
              {t('agents.title', 'Partner With Us')}
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-4 font-light">
              {t('agents.subtitle', 'Collaborate on player opportunities, share networks, and grow together in the football industry.')}
            </p>
            
            <p className="text-base text-muted-foreground/80 max-w-xl mx-auto mb-8">
              {t('agents.intro', 'We believe the best outcomes happen when agents work together. Whether you need club connections, player development support, or a trusted partner for complex deals - we are here to collaborate.')}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                asChild
                className="btn-shine text-lg font-bebas uppercase tracking-wider"
                size="lg"
              >
                <a 
                  href="https://wa.me/447508342901"
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
                className="text-lg font-bebas uppercase tracking-wider"
                size="lg"
              >
                <a 
                  href="mailto:jolon.levene@risefootballagency.com?subject=Agent Collaboration Inquiry"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Mail className="mr-2 h-5 w-5" />
                  Email
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* Marquee */}
        <Marquee />

        {/* Why Partner Section */}
        <ScrollReveal>
          <section className="py-8 md:py-12 px-4 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />
            
            <div className="container mx-auto relative z-10">
              <div className="text-center mb-12">
                <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider mb-4 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                  {t('agents.why_partner', 'Why Partner With RISE')}
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  {t('agents.why_partner_desc', 'Access our network, development infrastructure, and industry expertise to better serve your players.')}
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                <Card className="group p-6 border-2 border-transparent hover:border-primary/30 bg-gradient-to-br from-card to-primary/5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Globe className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-bebas text-2xl uppercase tracking-wider mb-2">
                    {t('agents.network_title', 'Extensive Network')}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                    {t('agents.network_desc', 'Leverage our established relationships with clubs across the UK and Europe to find the right opportunities for your players.')}
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{t('agents.network_point1', 'Direct relationships with sporting directors')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{t('agents.network_point2', 'EFL, Scottish & European connections')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{t('agents.network_point3', 'Academy pathway relationships')}</span>
                    </li>
                  </ul>
                </Card>

                <Card className="group p-6 border-2 border-transparent hover:border-primary/30 bg-gradient-to-br from-card to-primary/5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <TrendingUp className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-bebas text-2xl uppercase tracking-wider mb-2">
                    {t('agents.dev_title', 'Player Development')}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                    {t('agents.dev_desc', 'Our in-house performance analysis and coaching connections help players improve, making them more attractive to clubs.')}
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{t('agents.dev_point1', 'Professional performance analysis')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{t('agents.dev_point2', 'Tailored training programmes')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{t('agents.dev_point3', 'Specialised sports psychology support')}</span>
                    </li>
                  </ul>
                </Card>

                <Card className="group p-6 border-2 border-transparent hover:border-primary/30 bg-gradient-to-br from-card to-primary/5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Shield className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-bebas text-2xl uppercase tracking-wider mb-2">
                    {t('agents.standards_title', 'Professional Standards')}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                    {t('agents.standards_desc', 'We operate with full transparency and integrity. All agreements are documented, fees are fair, and player welfare comes first.')}
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{t('agents.standards_point1', 'FA Licensed intermediaries')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{t('agents.standards_point2', 'Transparent fee structures')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{t('agents.standards_point3', 'Player welfare first approach')}</span>
                    </li>
                  </ul>
                </Card>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Process Section */}
        <ScrollReveal>
          <section className="py-8 md:py-12 px-4 relative bg-muted/20">
            <div className="container mx-auto">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-4">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">{t('agents.process_badge', 'Simple Process')}</span>
                </div>
                
                <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider mb-4 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                  {t('agents.how_it_works', 'How It Works')}
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  {t('agents.how_it_works_desc', 'Getting started is straightforward. No complex onboarding, no lengthy contracts – just a conversation about how we can help each other.')}
                </p>
              </div>

              <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
                {processSteps.map((step, index) => (
                  <div key={index} className="relative">
                    <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors h-full">
                      <div className="text-5xl font-bebas text-primary/20 mb-2">{step.step}</div>
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                        <step.icon className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="font-bebas text-xl uppercase tracking-wider mb-2">{t(step.titleKey, step.titleFallback)}</h3>
                      <p className="text-sm text-muted-foreground">{t(step.descKey, step.descFallback)}</p>
                    </div>
                    {index < processSteps.length - 1 && (
                      <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                        <ArrowRight className="h-6 w-6 text-primary/30" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Collaboration Types Section */}
        <section className="py-8 md:py-12 px-4 relative">
          <div className="container mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-4">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{t('agents.collab_badge', 'Collaboration Options')}</span>
              </div>
              
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider mb-4 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                {t('agents.collab_title', 'How We Work Together')}
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t('agents.collab_desc', "Flexible arrangements designed around your needs and your players' best interests.")}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <div className="p-8 border-2 border-border rounded-2xl bg-card hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-bebas text-2xl uppercase tracking-wider">
                    {t('agents.referrals_title', 'Player Referrals')}
                  </h3>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  {t('agents.referrals_desc', 'Have a player who could benefit from our development programmes or network? We offer fair referral arrangements that benefit all parties, ensuring the player gets the best opportunities.')}
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {t('agents.referrals_point1', 'Transparent commission structures')}
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {t('agents.referrals_point2', 'Player welfare prioritized')}
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {t('agents.referrals_point3', 'Clear communication throughout')}
                  </li>
                </ul>
              </div>

              <div className="p-8 border-2 border-border rounded-2xl bg-card hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-bebas text-2xl uppercase tracking-wider">
                    {t('agents.intros_title', 'Club Introductions')}
                  </h3>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  {t('agents.intros_desc', 'Looking to place a player at a specific club? We can facilitate introductions and negotiations through our established relationships, helping you secure the best deals for your clients.')}
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {t('agents.intros_point1', 'EFL & Scottish Premiership connections')}
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {t('agents.intros_point2', 'European league access')}
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {t('agents.intros_point3', 'Decision-maker relationships')}
                  </li>
                </ul>
              </div>

              <div className="p-8 border-2 border-border rounded-2xl bg-card hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Award className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-bebas text-2xl uppercase tracking-wider">
                    {t('agents.joint_title', 'Joint Representation')}
                  </h3>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  {t('agents.joint_desc', "For complex deals or players requiring specialised support, we offer joint representation arrangements that leverage both parties' strengths and networks.")}
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {t('agents.joint_point1', 'Shared expertise & resources')}
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {t('agents.joint_point2', 'Combined network access')}
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {t('agents.joint_point3', 'Equitable fee arrangements')}
                  </li>
                </ul>
              </div>

              <div className="p-8 border-2 border-border rounded-2xl bg-card hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Briefcase className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-bebas text-2xl uppercase tracking-wider">
                    {t('agents.strategic_title', 'Strategic Partnerships')}
                  </h3>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  {t('agents.strategic_desc', "Looking for a longer-term collaboration? We're open to strategic partnerships that create mutual value and help both parties grow in the industry.")}
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {t('agents.strategic_point1', 'Regional market partnerships')}
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {t('agents.strategic_point2', 'Specialist collaborations')}
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {t('agents.strategic_point3', 'Long-term growth focus')}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-8 md:py-12 px-4 relative bg-muted/20">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider mb-4 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                {t('agents.faq_title', 'Frequently Asked Questions')}
              </h2>
              <p className="text-lg text-muted-foreground">
                {t('agents.faq_desc', 'Common questions from agents looking to collaborate')}
              </p>
            </div>

            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="border border-border rounded-xl px-6 bg-card data-[state=open]:border-primary/30"
                >
                  <AccordionTrigger className="text-left font-semibold hover:no-underline py-4">
                    {t(faq.questionKey, faq.questionFallback)}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    {t(faq.answerKey, faq.answerFallback)}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Testimonial/Trust Section */}
        <section className="py-16 md:py-24 px-4 relative">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center p-8 md:p-12 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <div className="flex justify-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                ))}
              </div>
              <blockquote className="text-xl md:text-2xl font-light italic mb-6 text-foreground">
                {t('agents.testimonial', '"Working with RISE has been refreshingly straightforward. They understand the industry, respect confidentiality, and genuinely put player welfare first. Exactly the kind of agency I want to collaborate with."')}
              </blockquote>
              <div className="flex items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="font-bebas text-primary text-lg">JM</span>
                </div>
                <div className="text-left">
                  <div className="font-semibold">{t('agents.testimonial_role', 'Licensed Intermediary')}</div>
                  <div className="text-sm text-muted-foreground">{t('agents.testimonial_location', 'UK-based Agent')}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 px-4 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
          
          <div className="container mx-auto relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-4">
                {t('agents.cta_title', 'Ready to Collaborate?')}
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                {t('agents.cta_desc', 'Get in touch to discuss how we can work together. No obligations, just a conversation about opportunities.')}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Button 
                  asChild
                  className="btn-shine text-lg font-bebas uppercase tracking-wider"
                  size="lg"
                >
                  <a 
                    href="https://wa.me/447508342901"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="mr-2 h-5 w-5" />
                    {t('agents.cta_whatsapp', 'Start a Conversation')}
                  </a>
                </Button>
                <Button 
                  asChild
                  variant="outline"
                  className="text-lg font-bebas uppercase tracking-wider"
                  size="lg"
                >
                  <a 
                    href="mailto:jolon.levene@risefootballagency.com?subject=Agent Collaboration Inquiry"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Mail className="mr-2 h-5 w-5" />
                    {t('agents.cta_email', 'Email Us')}
                  </a>
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{t('agents.location', 'Based in London, UK')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>{t('agents.response_time', 'Response within 24 hours')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>{t('agents.confidential', '100% Confidential')}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Agents;