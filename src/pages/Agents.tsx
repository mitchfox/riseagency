import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { MessageCircle, Mail, Users, Handshake, Globe, Shield, TrendingUp, Target, Award, Building } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Agents = () => {
  const { t } = useLanguage();
  const handleWhatsApp = () => {
    window.open("https://wa.me/447508342901", "_blank");
  };

  const handleEmail = () => {
    window.location.href = "mailto:info@risefootballagency.com?subject=Agent Collaboration Inquiry";
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <SEO 
        title="For Agents - Collaborate with RISE Football Agency"
        description="Partner with RISE Football Agency. Collaborate on player opportunities, share networks, and grow together in the football industry."
        image="/og-preview-agents.png"
        url="/agents"
      />
      <Header />
      
      <main className="pt-24 md:pt-16">
        {/* Hero Section */}
        <section className="relative min-h-[60vh] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
          
          <div className="relative z-10 text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-6">
              <Handshake className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">{t('agents.badge')}</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider mb-6 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
              {t('agents.title')}
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 font-light">
              {t('agents.subtitle')}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={handleWhatsApp}
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg"
              >
                <MessageCircle className="h-5 w-5" />
                {t('agents.whatsapp')}
              </Button>
              <Button 
                onClick={handleEmail}
                variant="outline"
                className="gap-2 border-primary/50 hover:bg-primary/10 px-8 py-6 text-lg"
              >
                <Mail className="h-5 w-5" />
                {t('agents.email')}
              </Button>
            </div>
          </div>
        </section>

        {/* Why Partner Section */}
        <section className="py-16 md:py-24 px-4 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />
          
          <div className="container mx-auto relative z-10">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider mb-4 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                {t('agents.why_partner')}
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t('agents.why_partner_desc')}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              <Card className="group p-6 border-2 border-transparent hover:border-primary/30 bg-gradient-to-br from-card to-primary/5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Globe className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-bebas text-2xl uppercase tracking-wider mb-2">
                  {t('agents.network_title')}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t('agents.network_desc')}
                </p>
              </Card>

              <Card className="group p-6 border-2 border-transparent hover:border-primary/30 bg-gradient-to-br from-card to-primary/5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <TrendingUp className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-bebas text-2xl uppercase tracking-wider mb-2">
                  {t('agents.development_title')}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t('agents.development_desc')}
                </p>
              </Card>

              <Card className="group p-6 border-2 border-transparent hover:border-primary/30 bg-gradient-to-br from-card to-primary/5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Shield className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-bebas text-2xl uppercase tracking-wider mb-2">
                  {t('agents.standards_title')}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t('agents.standards_desc')}
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Collaboration Types Section */}
        <section className="py-16 md:py-24 px-4 relative">
          <div className="container mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-4">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{t('agents.collab_badge')}</span>
              </div>
              
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider mb-4 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                {t('agents.how_we_work')}
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <div className="p-8 border-2 border-border rounded-2xl bg-card hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-bebas text-2xl uppercase tracking-wider">
                    Player Referrals
                  </h3>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Have a player who could benefit from our development programs or network? 
                  We offer fair referral arrangements that benefit all parties, ensuring 
                  the player gets the best opportunities.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Transparent commission structures
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Player welfare prioritized
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Clear communication throughout
                  </li>
                </ul>
              </div>

              <div className="p-8 border-2 border-border rounded-2xl bg-card hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-bebas text-2xl uppercase tracking-wider">
                    Club Introductions
                  </h3>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Looking to place a player at a specific club? We can facilitate introductions 
                  and negotiations through our established relationships, helping you secure 
                  the best deals for your clients.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Premier League connections
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    European league access
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Decision-maker relationships
                  </li>
                </ul>
              </div>

              <div className="p-8 border-2 border-border rounded-2xl bg-card hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Award className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-bebas text-2xl uppercase tracking-wider">
                    Joint Representation
                  </h3>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  For complex deals or players requiring specialized support, we offer 
                  joint representation arrangements that leverage both parties' strengths 
                  and networks.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Shared expertise
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Combined network access
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Equitable arrangements
                  </li>
                </ul>
              </div>

              <div className="p-8 border-2 border-border rounded-2xl bg-card hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Handshake className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-bebas text-2xl uppercase tracking-wider">
                    Strategic Partnerships
                  </h3>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Looking for a longer-term collaboration? We're open to strategic partnerships 
                  that create mutual value and help both parties grow in the industry.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Regional partnerships
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Specialist collaborations
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Long-term growth focus
                  </li>
                </ul>
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
                {t('agents.cta_title')}
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                {t('agents.cta_subtitle')}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={handleWhatsApp}
                  className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg"
                >
                <MessageCircle className="h-5 w-5" />
                {t('agents.start_convo')}
              </Button>
              <Button 
                onClick={handleEmail}
                variant="outline"
                className="gap-2 border-primary/50 hover:bg-primary/10 px-8 py-6 text-lg"
              >
                <Mail className="h-5 w-5" />
                {t('agents.email_us')}
                </Button>
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
