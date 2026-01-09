import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Send, FileText, Users, Globe } from "lucide-react";
import bannerHero from "@/assets/banner-hero.jpg";

const AgentRequests = () => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    agentName: '',
    agencyName: '',
    email: '',
    phone: '',
    requestType: '',
    playerDetails: '',
    leagues: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.agentName || !formData.email || !formData.requestType) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    
    const { error } = await supabase
      .from('form_submissions')
      .insert({
        form_type: 'agent_request',
        data: formData
      });

    if (error) {
      toast.error('Failed to submit request');
    } else {
      toast.success('Request submitted successfully! We will be in touch shortly.');
      setFormData({
        agentName: '',
        agencyName: '',
        email: '',
        phone: '',
        requestType: '',
        playerDetails: '',
        leagues: '',
        message: '',
      });
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO 
        title="Agent Requests - Submit Player Enquiries | RISE Football Agency"
        description="Submit player requests and enquiries. Share details about players you represent or are looking for."
        image="/og-preview-agents.png"
        url="/agent-requests"
      />
      <Header />
      
      <main className="pt-32 md:pt-24">
        {/* Hero Section */}
        <section className="relative h-[40vh] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bannerHero})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-background" />
          
          <div className="relative container mx-auto px-4 text-center z-10">
            <div className="inline-block mb-6">
              <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                {t('requests.badge', 'Agent Portal')}
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider text-white mb-6">
              {t('requests.hero_title', 'SUBMIT A')} <span className="text-primary">{t('requests.hero_highlight', 'REQUEST')}</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              {t('requests.hero_subtitle', 'Share player details or enquiries with our team')}
            </p>
          </div>
        </section>

        {/* Request Types */}
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <div className="p-6 border border-border/50 bg-card rounded-lg text-center">
                <FileText className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="font-bebas text-xl uppercase tracking-wider mb-2">Player Referral</h3>
                <p className="text-sm text-muted-foreground">Refer a player who could benefit from our network and development</p>
              </div>
              <div className="p-6 border border-border/50 bg-card rounded-lg text-center">
                <Users className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="font-bebas text-xl uppercase tracking-wider mb-2">Player Search</h3>
                <p className="text-sm text-muted-foreground">Looking for specific player profiles for your club contacts</p>
              </div>
              <div className="p-6 border border-border/50 bg-card rounded-lg text-center">
                <Globe className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="font-bebas text-xl uppercase tracking-wider mb-2">Market Enquiry</h3>
                <p className="text-sm text-muted-foreground">General market intelligence or availability queries</p>
              </div>
            </div>
          </div>
        </section>

        {/* Request Form */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="agentName">Your Name *</Label>
                    <Input 
                      id="agentName"
                      value={formData.agentName}
                      onChange={(e) => setFormData(prev => ({ ...prev, agentName: e.target.value }))}
                      placeholder="Full name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="agencyName">Agency Name</Label>
                    <Input 
                      id="agencyName"
                      value={formData.agencyName}
                      onChange={(e) => setFormData(prev => ({ ...prev, agencyName: e.target.value }))}
                      placeholder="Your agency"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input 
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="your@email.com"
                      required
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
                </div>

                <div>
                  <Label htmlFor="requestType">Request Type *</Label>
                  <Select 
                    value={formData.requestType} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, requestType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select request type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="player_referral">Player Referral</SelectItem>
                      <SelectItem value="player_search">Player Search</SelectItem>
                      <SelectItem value="market_enquiry">Market Enquiry</SelectItem>
                      <SelectItem value="collaboration">Collaboration Opportunity</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="playerDetails">Player Details (if applicable)</Label>
                  <Textarea 
                    id="playerDetails"
                    value={formData.playerDetails}
                    onChange={(e) => setFormData(prev => ({ ...prev, playerDetails: e.target.value }))}
                    placeholder="Name, age, position, current club, nationality..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="leagues">Target Leagues / Markets</Label>
                  <Input 
                    id="leagues"
                    value={formData.leagues}
                    onChange={(e) => setFormData(prev => ({ ...prev, leagues: e.target.value }))}
                    placeholder="e.g. Championship, Eredivisie, MLS..."
                  />
                </div>

                <div>
                  <Label htmlFor="message">Additional Information</Label>
                  <Textarea 
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Any other details or context..."
                    rows={4}
                  />
                </div>

                <Button 
                  type="submit"
                  disabled={submitting}
                  className="w-full btn-shine font-bebas uppercase tracking-wider text-lg"
                  size="lg"
                >
                  <Send className="w-5 h-5 mr-2" />
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </form>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AgentRequests;