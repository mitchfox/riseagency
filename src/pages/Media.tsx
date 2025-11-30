import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Video, Camera, Mic, FileText, Instagram, Youtube } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import bannerHero from "@/assets/banner-hero.jpg";

const Media = () => {
  const { t } = useLanguage();
  
  return (
    <div className="min-h-screen bg-background" key="media-page">
      <SEO 
        title="Media Services - Football Content & Production | RISE Agency"
        description="Professional media services for football players, clubs, and brands. Video production, content creation, and comprehensive media management."
        image="/og-preview-media.png"
        url="/media"
      />
      <Header />
      
      <main className="pt-24 md:pt-16">
        {/* Hero Section */}
        <section className="relative h-[50vh] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bannerHero})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-background" />
          
          <div className="relative container mx-auto px-4 text-center z-10">
            <h1 className="text-6xl md:text-8xl font-bebas uppercase tracking-wider text-white mb-4">
              MEDIA
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              Professional Content Creation & Media Management
            </p>
          </div>
        </section>

        {/* VIDEO PRODUCTION Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 text-primary">
                  <Video className="h-6 w-6" />
                  <span className="text-sm font-bebas uppercase tracking-widest">Visual Storytelling</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground">
                  VIDEO <span className="text-primary">PRODUCTION</span>
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  From highlight reels to documentary features, our in-house production team creates compelling visual content that showcases talent and tells stories.
                </p>
                <Collapsible>
                  <CollapsibleTrigger className="group flex items-center gap-3 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-md transition-all">
                    <span className="text-sm uppercase tracking-wider text-primary font-medium">Learn More</span>
                    <ChevronDown className="h-4 w-4 text-primary transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-6 space-y-4 text-base text-muted-foreground leading-relaxed">
                    <p>
                      Our video production services encompass the full spectrum of football content. From matchday highlight packages and training ground access pieces to long-form documentaries and promotional content, we deliver broadcast-quality production.
                    </p>
                    <p>
                      Working closely with players and clubs, we ensure authentic storytelling that connects with audiences while maintaining the professional standards expected at the highest levels of the game.
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              </div>
              <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <Video className="h-16 w-16 text-primary mx-auto" />
                    <p className="text-muted-foreground">Featured Productions</p>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <h3 className="font-bebas uppercase tracking-wider text-foreground">Recent Work</h3>
                  <div className="flex gap-2 flex-wrap">
                    <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bebas uppercase rounded">Highlight Reels</span>
                    <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bebas uppercase rounded">Documentaries</span>
                    <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bebas uppercase rounded">Matchday Content</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PHOTOGRAPHY Section */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1 grid grid-cols-2 gap-4">
                <div className="aspect-[3/4] bg-card border border-border rounded-lg overflow-hidden flex items-center justify-center">
                  <Camera className="h-12 w-12 text-muted-foreground/50" />
                </div>
                <div className="aspect-[3/4] bg-card border border-border rounded-lg overflow-hidden flex items-center justify-center mt-8">
                  <Camera className="h-12 w-12 text-muted-foreground/50" />
                </div>
                <div className="aspect-[3/4] bg-card border border-border rounded-lg overflow-hidden flex items-center justify-center -mt-8">
                  <Camera className="h-12 w-12 text-muted-foreground/50" />
                </div>
                <div className="aspect-[3/4] bg-card border border-border rounded-lg overflow-hidden flex items-center justify-center">
                  <Camera className="h-12 w-12 text-muted-foreground/50" />
                </div>
              </div>
              <div className="order-1 md:order-2 space-y-6">
                <div className="inline-flex items-center gap-2 text-primary">
                  <Camera className="h-6 w-6" />
                  <span className="text-sm font-bebas uppercase tracking-widest">Capturing Moments</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground">
                  PHOTO<span className="text-primary">GRAPHY</span>
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Professional photography services for player portfolios, commercial campaigns, and editorial features that capture the essence of elite football.
                </p>
                <Collapsible>
                  <CollapsibleTrigger className="group flex items-center gap-3 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-md transition-all">
                    <span className="text-sm uppercase tracking-wider text-primary font-medium">Learn More</span>
                    <ChevronDown className="h-4 w-4 text-primary transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-6 space-y-4 text-base text-muted-foreground leading-relaxed">
                    <p>
                      Our photography team specializes in capturing the intensity, emotion, and artistry of professional football. From action shots on the pitch to studio portraits and lifestyle imagery, we deliver assets that elevate personal brands.
                    </p>
                    <p>
                      All photography is delivered in formats optimized for social media, press releases, and commercial use, ensuring our clients have the visual assets they need across all platforms.
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
          </div>
        </section>

        {/* SOCIAL MEDIA Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 text-primary">
                  <Instagram className="h-6 w-6" />
                  <span className="text-sm font-bebas uppercase tracking-widest">Digital Presence</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground">
                  SOCIAL <span className="text-primary">MEDIA</span>
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Full-service social media management that builds authentic connections between players and their global fanbase.
                </p>
                <Collapsible>
                  <CollapsibleTrigger className="group flex items-center gap-3 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-md transition-all">
                    <span className="text-sm uppercase tracking-wider text-primary font-medium">Learn More</span>
                    <ChevronDown className="h-4 w-4 text-primary transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-6 space-y-4 text-base text-muted-foreground leading-relaxed">
                    <p>
                      Our social media team handles everything from content strategy and creation to community management and analytics. We help players build their personal brand while protecting their image and reputation.
                    </p>
                    <p>
                      With expertise across Instagram, YouTube, TikTok, X, and emerging platforms, we ensure our clients maintain a consistent and engaging presence across the digital landscape.
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              </div>
              <div className="bg-card/50 border border-border rounded-lg p-8 space-y-6">
                <h3 className="text-2xl font-bebas uppercase tracking-wider text-foreground">Platforms We Manage</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 border border-border/50 rounded-lg">
                    <Instagram className="h-8 w-8 text-primary" />
                    <span className="font-bebas uppercase tracking-wide text-foreground">Instagram</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 border border-border/50 rounded-lg">
                    <Youtube className="h-8 w-8 text-primary" />
                    <span className="font-bebas uppercase tracking-wide text-foreground">YouTube</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 border border-border/50 rounded-lg">
                    <svg className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                    </svg>
                    <span className="font-bebas uppercase tracking-wide text-foreground">TikTok</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 border border-border/50 rounded-lg">
                    <svg className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span className="font-bebas uppercase tracking-wide text-foreground">X / Twitter</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PR & COMMUNICATIONS Section */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1 bg-card/50 border border-border rounded-lg p-8 space-y-6">
                <h3 className="text-2xl font-bebas uppercase tracking-wider text-foreground">Our Services Include</h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <span className="font-medium text-foreground">Press Release Writing</span>
                      <p className="text-sm text-muted-foreground">Professional announcements for transfers, partnerships, and milestones</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Mic className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <span className="font-medium text-foreground">Interview Coordination</span>
                      <p className="text-sm text-muted-foreground">Media training and interview arrangement with major outlets</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <span className="font-medium text-foreground">Crisis Management</span>
                      <p className="text-sm text-muted-foreground">24/7 support for reputation protection and response</p>
                    </div>
                  </li>
                </ul>
              </div>
              <div className="order-1 md:order-2 space-y-6">
                <div className="inline-flex items-center gap-2 text-primary">
                  <Mic className="h-6 w-6" />
                  <span className="text-sm font-bebas uppercase tracking-widest">Public Relations</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground">
                  PR & <span className="text-primary">COMMS</span>
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Strategic communications that protect and enhance player reputations while maximizing positive media exposure.
                </p>
                <Collapsible>
                  <CollapsibleTrigger className="group flex items-center gap-3 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-md transition-all">
                    <span className="text-sm uppercase tracking-wider text-primary font-medium">Learn More</span>
                    <ChevronDown className="h-4 w-4 text-primary transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-6 space-y-4 text-base text-muted-foreground leading-relaxed">
                    <p>
                      Our PR team maintains relationships with journalists and media outlets across Europe, ensuring our clients receive fair and accurate coverage. From transfer announcements to milestone celebrations, we craft narratives that resonate.
                    </p>
                    <p>
                      We also provide comprehensive media training to prepare players for interviews, press conferences, and public appearances, ensuring they communicate effectively and authentically.
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider mb-6">
              Tell Your <span className="text-primary">Story</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Ready to elevate your media presence? Connect with our content team to discuss your needs.
            </p>
            <Button asChild size="lg" className="btn-shine font-bebas uppercase tracking-wider">
              <a href="mailto:jolon.levene@risefootballagency.com?subject=Media%20Inquiry">Contact Media Team</a>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Media;
