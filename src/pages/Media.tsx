import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ChevronDown, Video, Camera, Mic, FileText, Newspaper, Calendar, Mail } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { WorkWithUsDialog } from "@/components/WorkWithUsDialog";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import bannerHero from "@/assets/banner-hero.jpg";

interface PressRelease {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  published_at: string;
}

interface GalleryItem {
  id: string;
  title: string;
  file_url: string;
  file_type: string;
}

const Media = () => {
  const { t } = useLanguage();
  const [pressReleases, setPressReleases] = useState<PressRelease[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [showPressReleases, setShowPressReleases] = useState(false);

  useEffect(() => {
    const fetchPressReleases = async () => {
      const { data, error } = await supabase
        .from("press_releases")
        .select("id, title, content, excerpt, published_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false });

      if (!error && data) {
        setPressReleases(data);
      }
    };

    const fetchGalleryItems = async () => {
      const { data, error } = await supabase
        .from("marketing_gallery")
        .select("id, title, file_url, file_type")
        .order("created_at", { ascending: false })
        .limit(8);

      if (!error && data) {
        setGalleryItems(data);
      }
    };

    fetchPressReleases();
    fetchGalleryItems();
  }, []);
  
  return (
    <div className="min-h-screen bg-background overflow-x-hidden" key="media-page">
      <SEO 
        title="Media & Press - Request Interviews & Content | RISE Football Agency"
        description="Media professionals can request interviews, access content, and arrange coverage of RISE Football Agency players and activities."
        image="/og-preview-media.png"
        url="/media"
      />
      <Header />
      
      <main className="pt-32 md:pt-24">
        {/* Hero Section */}
        <section className="relative h-[50vh] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bannerHero})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-background" />
          
          <div className="relative container mx-auto px-4 text-center z-10">
            <h1 className="text-6xl md:text-8xl font-bebas uppercase tracking-wider text-white mb-4">
              {t('media.title', 'MEDIA &')} <span className="text-primary">{t('media.title_highlight', 'PRESS')}</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              {t('media.subtitle', 'Request interviews, access content, and connect with our players')}
            </p>
          </div>
        </section>

        {/* INTERVIEW REQUESTS Section */}
        <section className="py-8 md:py-12 bg-background">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 text-primary">
                  <Mic className="h-6 w-6" />
                  <span className="text-sm font-bebas uppercase tracking-widest">{t('media.for_journalists', 'For Journalists')}</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground">
                  {t('media.interview', 'INTERVIEW')} <span className="text-primary">{t('media.requests', 'REQUESTS')}</span>
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {t('media.interview_desc', 'Looking to speak with one of our players? Submit an interview request and our media team will coordinate with player schedules and availability.')}
                </p>
                <Collapsible>
                  <CollapsibleTrigger className="group flex items-center gap-3 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-md transition-all">
                    <span className="text-sm uppercase tracking-wider text-primary font-medium">{t('media.how_it_works', 'How It Works')}</span>
                    <ChevronDown className="h-4 w-4 text-primary transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-6 space-y-4 text-base text-muted-foreground leading-relaxed">
                    <p>
                      {t('media.how_it_works_p1', "Submit your request with details about your publication, the topics you'd like to cover, and your preferred timeline. Our media team reviews all requests and coordinates with players based on their training and match schedules.")}
                    </p>
                    <p>
                      {t('media.how_it_works_p2', 'We aim to respond to all interview requests within 48 hours. Please allow adequate lead time for scheduling, especially during transfer windows or match-heavy periods.')}
                    </p>
                  </CollapsibleContent>
                </Collapsible>
                <Button asChild size="lg" className="btn-shine font-bebas uppercase tracking-wider">
                  <a href="mailto:media@risefootballagency.com?subject=Interview%20Request">
                    {t('media.request_interview', 'Request Interview')}
                  </a>
                </Button>
              </div>
              <div className="bg-card/50 border border-border rounded-lg p-8 space-y-6">
                <h3 className="text-2xl font-bebas uppercase tracking-wider text-foreground">{t('media.request_guidelines', 'Request Guidelines')}</h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <Newspaper className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-foreground">{t('media.publication_details', 'Publication Details')}</span>
                      <p className="text-sm text-muted-foreground">{t('media.publication_details_desc', 'Include your outlet name, circulation/reach, and interview format')}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-foreground">{t('media.topic_brief', 'Topic Brief')}</span>
                      <p className="text-sm text-muted-foreground">{t('media.topic_brief_desc', "Outline the subjects and questions you'd like to discuss")}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-foreground">{t('media.timeline', 'Timeline')}</span>
                      <p className="text-sm text-muted-foreground">{t('media.timeline_desc', 'Provide your deadline and preferred interview dates')}</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CONTENT ACCESS Section */}
        <section className="py-8 md:py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1 grid grid-cols-2 gap-4">
                {galleryItems.length > 0 ? (
                  galleryItems.slice(0, 4).map((item, index) => (
                    <div 
                      key={item.id}
                      className={`aspect-[3/4] bg-card border border-border rounded-lg overflow-hidden ${index === 1 ? 'mt-8' : index === 2 ? '-mt-8' : ''}`}
                    >
                      {item.file_type === 'image' ? (
                        <img 
                          src={item.file_url} 
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="h-12 w-12 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <>
                    <div className="aspect-[3/4] bg-card border border-border rounded-lg overflow-hidden flex items-center justify-center">
                      <Camera className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                    <div className="aspect-[3/4] bg-card border border-border rounded-lg overflow-hidden flex items-center justify-center mt-8">
                      <Video className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                    <div className="aspect-[3/4] bg-card border border-border rounded-lg overflow-hidden flex items-center justify-center -mt-8">
                      <Camera className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                    <div className="aspect-[3/4] bg-card border border-border rounded-lg overflow-hidden flex items-center justify-center">
                      <Video className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  </>
                )}
              </div>
              <div className="order-1 md:order-2 space-y-6">
                <div className="inline-flex items-center gap-2 text-primary">
                  <Camera className="h-6 w-6" />
                  <span className="text-sm font-bebas uppercase tracking-widest">{t('media.media_assets', 'Media Assets')}</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground">
                  {t('media.content', 'CONTENT')} <span className="text-primary">{t('media.access', 'ACCESS')}</span>
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {t('media.content_desc', 'Need high-resolution images, video footage, or press materials? Request access to our media library for your publication needs.')}
                </p>
                <Collapsible>
                  <CollapsibleTrigger className="group flex items-center gap-3 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-md transition-all">
                    <span className="text-sm uppercase tracking-wider text-primary font-medium">{t('media.available_assets', 'Available Assets')}</span>
                    <ChevronDown className="h-4 w-4 text-primary transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-6 space-y-4 text-base text-muted-foreground leading-relaxed">
                    <p>
                      {t('media.available_assets_p1', 'Our media library includes professional photography, video highlights, player headshots, and official press releases. All assets are available in broadcast-quality formats.')}
                    </p>
                    <p>
                      {t('media.available_assets_p2', 'Access is granted on a per-request basis. Please specify which players and content types you require, along with your intended usage.')}
                    </p>
                  </CollapsibleContent>
                </Collapsible>
                <Button asChild size="lg" variant="outline" className="font-bebas uppercase tracking-wider">
                  <a href="mailto:media@risefootballagency.com?subject=Content%20Access%20Request">
                    {t('media.request_content', 'Request Content Access')}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* BROADCAST & FILM Section */}
        <section className="py-8 md:py-12 bg-background">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 text-primary">
                  <Video className="h-6 w-6" />
                  <span className="text-sm font-bebas uppercase tracking-widest">{t('media.tv_documentary', 'TV & Documentary')}</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground">
                  {t('media.broadcast', 'BROADCAST &')} <span className="text-primary">{t('media.film', 'FILM')}</span>
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {t('media.broadcast_desc', 'Producing a documentary, feature, or broadcast segment? We facilitate extended access and behind-the-scenes coverage opportunities.')}
                </p>
                <Collapsible>
                  <CollapsibleTrigger className="group flex items-center gap-3 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-md transition-all">
                    <span className="text-sm uppercase tracking-wider text-primary font-medium">{t('media.production_info', 'Production Info')}</span>
                    <ChevronDown className="h-4 w-4 text-primary transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-6 space-y-4 text-base text-muted-foreground leading-relaxed">
                    <p>
                      {t('media.production_info_p1', 'For documentary or extended coverage projects, we work closely with production teams to coordinate schedules, access permissions, and player availability over multi-day shoots.')}
                    </p>
                    <p>
                      {t('media.production_info_p2', 'Please submit a detailed production brief including your concept, timeline, crew size, and distribution plans. Our team will assess feasibility and discuss terms.')}
                    </p>
                  </CollapsibleContent>
                </Collapsible>
                <Button asChild size="lg" className="btn-shine font-bebas uppercase tracking-wider">
                  <a href="mailto:media@risefootballagency.com?subject=Broadcast%20%2F%20Film%20Inquiry">
                    {t('media.discuss_project', 'Discuss Your Project')}
                  </a>
                </Button>
              </div>
              <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <Video className="h-16 w-16 text-primary mx-auto" />
                    <p className="text-muted-foreground">{t('media.feature_documentary', 'Feature & Documentary')}</p>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <h3 className="font-bebas uppercase tracking-wider text-foreground">{t('media.previous_productions', 'Previous Productions')}</h3>
                  <div className="flex gap-2 flex-wrap">
                    <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bebas uppercase rounded">{t('media.documentaries', 'Documentaries')}</span>
                    <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bebas uppercase rounded">{t('media.broadcast_features', 'Broadcast Features')}</span>
                    <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bebas uppercase rounded">{t('media.behind_scenes', 'Behind The Scenes')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PRESS RELEASES Section */}
        <section className="py-8 md:py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-start">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 text-primary">
                  <Newspaper className="h-6 w-6" />
                  <span className="text-sm font-bebas uppercase tracking-widest">{t('media.official_updates', 'Official Updates')}</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground">
                  {t('media.press', 'PRESS')} <span className="text-primary">{t('media.releases', 'RELEASES')}</span>
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {t('media.press_desc', 'Subscribe to our press list for official announcements, transfer news, and player updates delivered directly to your inbox.')}
                </p>
                
                {!showPressReleases ? (
                  <Button 
                    size="lg" 
                    className="btn-shine font-bebas uppercase tracking-wider"
                    onClick={() => setShowPressReleases(true)}
                  >
                    {t('media.view_releases', 'View Press Releases')}
                  </Button>
                ) : (
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="font-bebas uppercase tracking-wider"
                    onClick={() => setShowPressReleases(false)}
                  >
                    {t('media.hide_releases', 'Hide Press Releases')}
                  </Button>
                )}
              </div>
              
              <div className="bg-card/50 border border-border rounded-lg p-8 space-y-6">
                <h3 className="text-2xl font-bebas uppercase tracking-wider text-foreground">{t('media.stay_updated', 'Stay Updated')}</h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-foreground">{t('media.press_list', 'Press List')}</span>
                      <p className="text-sm text-muted-foreground">{t('media.press_list_desc', 'Join our media distribution list for announcements')}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Newspaper className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-foreground">{t('media.transfer_news', 'Transfer News')}</span>
                      <p className="text-sm text-muted-foreground">{t('media.transfer_news_desc', 'Official statements and player move announcements')}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-foreground">{t('media.player_milestones', 'Player Milestones')}</span>
                      <p className="text-sm text-muted-foreground">{t('media.player_milestones_desc', 'Career achievements and notable performances')}</p>
                    </div>
                  </li>
                </ul>
                <Button asChild variant="outline" className="w-full font-bebas uppercase tracking-wider">
                  <a href="mailto:media@risefootballagency.com?subject=Press%20List%20Subscription">
                    {t('media.join_press_list', 'Join Press List')}
                  </a>
                </Button>
              </div>
            </div>

            {/* Press Releases Accordion */}
            {showPressReleases && (
              <div className="mt-12">
                {pressReleases.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No press releases available at this time.</p>
                  </div>
                ) : (
                  <Accordion type="single" collapsible defaultValue={pressReleases[0]?.id} className="space-y-4">
                    {pressReleases.map((release, index) => (
                      <AccordionItem 
                        key={release.id} 
                        value={release.id}
                        className="border border-border rounded-lg bg-card/50 overflow-hidden"
                      >
                        <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50">
                          <div className="flex flex-col items-start gap-1 text-left">
                            <span className="text-xs text-primary font-bebas uppercase tracking-wider">
                              {format(new Date(release.published_at), "MMMM d, yyyy")}
                            </span>
                            <span className="text-lg font-medium text-foreground">{release.title}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6">
                          <div className="space-y-4 text-muted-foreground whitespace-pre-line">
                            {release.content}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider mb-6">
              {t('media.media_contact', 'Media')} <span className="text-primary">{t('media.contact', 'Contact')}</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t('media.cta_desc', 'For all media inquiries, interview requests, and content access, contact our media relations team.')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="btn-shine font-bebas uppercase tracking-wider">
                <a href="mailto:media@risefootballagency.com?subject=Media%20Inquiry">
                  {t('media.email_team', 'Email Media Team')}
                </a>
              </Button>
              <WorkWithUsDialog>
                <Button size="lg" variant="outline" className="font-bebas uppercase tracking-wider">
                  {t('media.general_inquiries', 'General Inquiries')}
                </Button>
              </WorkWithUsDialog>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Media;