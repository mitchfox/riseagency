import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Send, FileText, Users, Globe, MessageCircle, Mail, Clock, MapPin, User, Target, ArrowRight } from "lucide-react";
import { ScrollReveal, ScrollRevealContainer, ScrollRevealItem } from "@/components/ScrollReveal";
import bannerHero from "@/assets/banner-hero.jpg";

interface PlayerRequest {
  id: string;
  position: string;
  age_range: string | null;
  league: string;
  playstyle: string | null;
  status: string;
  is_visible: boolean;
  created_at: string;
}

const AgentRequests = () => {
  const { t } = useLanguage();
  const [formOpen, setFormOpen] = useState(false);
  const [activeRequests, setActiveRequests] = useState<PlayerRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [formData, setFormData] = useState({
    agentName: '',
    agencyName: '',
    email: '',
    phone: '',
    position: '',
    ageRange: '',
    leagues: '',
    playstyle: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch active requests from database
  useEffect(() => {
    const fetchRequests = async () => {
      const { data, error } = await supabase
        .from('player_requests')
        .select('*')
        .eq('is_visible', true)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setActiveRequests(data as PlayerRequest[]);
      }
      setLoadingRequests(false);
    };
    fetchRequests();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.agentName || !formData.email || !formData.position) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    
    const { error } = await supabase
      .from('form_submissions')
      .insert({
        form_type: 'agent_player_suggestion',
        data: formData
      });

    if (error) {
      toast.error('Failed to submit suggestion');
    } else {
      toast.success('Player suggestion submitted! We will review and be in touch.');
      setFormData({
        agentName: '',
        agencyName: '',
        email: '',
        phone: '',
        position: '',
        ageRange: '',
        leagues: '',
        playstyle: '',
        message: '',
      });
      setFormOpen(false);
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO 
        title="Agent Requests - Current Player Searches | RISE Football Agency"
        description="View our current player search requests and suggest players that match our criteria."
        image="/og-preview-agents.png"
        url="/agent-requests"
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
          
          <ScrollReveal className="relative container mx-auto px-4 text-center z-10">
            <div className="inline-block mb-6">
              <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                {t('requests.badge', 'Agent Portal')}
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider text-white mb-6">
              {t('requests.hero_title', 'CURRENT')} <span className="text-primary">{t('requests.hero_highlight', 'REQUESTS')}</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              {t('requests.hero_subtitle', 'View our active player searches and suggest matching players from your network')}
            </p>
          </ScrollReveal>
        </section>

        {/* Quick Contact */}
        <section className="py-8 bg-primary/5 border-b border-border/50">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
              <span className="text-sm text-muted-foreground">Have a player in mind?</span>
              <div className="flex gap-4">
                <Button asChild variant="outline" size="sm">
                  <a href="https://wa.me/447508342901" target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href="mailto:jolon.levene@risefootballagency.com?subject=Player Suggestion">
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Active Requests Grid */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <ScrollReveal className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-4">
                {t('requests.active_title', 'ACTIVE')} <span className="text-primary">{t('requests.active_highlight', 'SEARCHES')}</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                These are players we are actively seeking for club partners. If you represent someone matching these profiles, get in touch.
              </p>
            </ScrollReveal>

            <ScrollRevealContainer className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto" staggerDelay={0.1}>
              {loadingRequests ? (
                <div className="col-span-2 text-center py-12 text-muted-foreground">Loading requests...</div>
              ) : activeRequests.length === 0 ? (
                <div className="col-span-2 text-center py-12 text-muted-foreground">No active requests at the moment. Check back soon!</div>
              ) : activeRequests.map((request) => (
                <ScrollRevealItem key={request.id}>
                  <Card className="group hover:border-primary/50 transition-all hover:shadow-lg">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs font-bebas uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded">
                            {request.status}
                          </span>
                          <CardTitle className="text-2xl font-bebas uppercase tracking-wider mt-2 group-hover:text-primary transition-colors">
                            {request.position}
                          </CardTitle>
                        </div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(request.created_at)}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {request.age_range && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="w-4 h-4 text-primary" />
                            <span>Age: {request.age_range}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span>{request.league}</span>
                        </div>
                      </div>
                      {request.playstyle && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Target className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{request.playstyle}</span>
                        </div>
                      )}
                      
                      <Dialog open={formOpen} onOpenChange={setFormOpen}>
                        <DialogTrigger asChild>
                          <Button className="w-full mt-4 font-bebas uppercase tracking-wider" variant="outline">
                            Suggest a Player
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="font-bebas text-2xl uppercase tracking-wider">
                              Suggest a Player
                            </DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-4">
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
                            </div>

                            <div>
                              <Label htmlFor="position">Player Position *</Label>
                              <Input 
                                id="position"
                                value={formData.position}
                                onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                                placeholder="e.g. Central Midfielder"
                                required
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="ageRange">Player Age</Label>
                                <Input 
                                  id="ageRange"
                                  value={formData.ageRange}
                                  onChange={(e) => setFormData(prev => ({ ...prev, ageRange: e.target.value }))}
                                  placeholder="e.g. 24"
                                />
                              </div>
                              <div>
                                <Label htmlFor="leagues">Current League</Label>
                                <Input 
                                  id="leagues"
                                  value={formData.leagues}
                                  onChange={(e) => setFormData(prev => ({ ...prev, leagues: e.target.value }))}
                                  placeholder="e.g. Championship"
                                />
                              </div>
                            </div>

                            <div>
                              <Label htmlFor="playstyle">Player Strengths / Style</Label>
                              <Textarea 
                                id="playstyle"
                                value={formData.playstyle}
                                onChange={(e) => setFormData(prev => ({ ...prev, playstyle: e.target.value }))}
                                placeholder="Key attributes and playing style..."
                                rows={2}
                              />
                            </div>

                            <div>
                              <Label htmlFor="message">Additional Information</Label>
                              <Textarea 
                                id="message"
                                value={formData.message}
                                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                                placeholder="Contract situation, availability, links to footage..."
                                rows={3}
                              />
                            </div>

                            <Button 
                              type="submit"
                              disabled={submitting}
                              className="w-full btn-shine font-bebas uppercase tracking-wider"
                            >
                              <Send className="w-4 h-4 mr-2" />
                              {submitting ? 'Submitting...' : 'Submit Suggestion'}
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>
                </ScrollRevealItem>
              ))}
            </ScrollRevealContainer>
          </div>
        </section>

        {/* General Request Form */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <ScrollReveal className="max-w-2xl mx-auto text-center">
              <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-4">
                {t('requests.custom_title', "DON'T SEE A")} <span className="text-primary">{t('requests.custom_highlight', 'MATCH?')}</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Have a player that does not fit our current searches but you think would be a good fit? Send us the details directly.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="btn-shine font-bebas uppercase tracking-wider">
                  <a href="https://wa.me/447508342901" target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-5 h-5 mr-2" />
                    WhatsApp Us
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg" className="font-bebas uppercase tracking-wider">
                  <a href="mailto:jolon.levene@risefootballagency.com?subject=Player Suggestion">
                    <Mail className="w-5 h-5 mr-2" />
                    Send Email
                  </a>
                </Button>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AgentRequests;
