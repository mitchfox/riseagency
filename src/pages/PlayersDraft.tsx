import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import footballIcon from "@/assets/football-icon.png";

const PlayersDraft = () => {
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState(0);
  const sectionsRef = useRef<(HTMLElement | null)[]>([]);

  const sections = [
    {
      titleKey: "players.attract",
      titleFallback: "ATTRACT",
      contentKey: "players.attract_desc",
      contentFallback: "Through our vast scouting network, we maximise visibility across the footballing world to ensure player interest and demand.",
      position: { x: 15, y: 20 }
    },
    {
      titleKey: "players.sign",
      titleFallback: "SIGN",
      contentKey: "players.sign_desc",
      contentFallback: "Sign the dotted line after our team of intermediaries negotiate new and improved contracts. Retain confidence knowing your career opportunities are being created and finalised.",
      position: { x: 35, y: 50 }
    },
    {
      titleKey: "players.develop",
      titleFallback: "DEVELOP",
      contentKey: "players.develop_desc",
      contentFallback: "Receive expert training to maximise your physical capacity for performance. Push the limits of your body and mind to truly know how far you can go in your career.",
      position: { x: 65, y: 50 }
    },
    {
      titleKey: "players.perform",
      titleFallback: "PERFORM",
      contentKey: "players.perform_desc",
      contentFallback: "Play your best on a consistent basis through smart preparation, including psychological training sessions and pre-match analysis specific to your individual matchups.",
      position: { x: 85, y: 80 }
    }
  ];

  useEffect(() => {
    const observers = sectionsRef.current.map((section, index) => {
      if (!section) return null;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveSection(index);
            }
          });
        },
        { threshold: 0.5 }
      );

      observer.observe(section);
      return observer;
    });

    return () => {
      observers.forEach((observer) => observer?.disconnect());
    };
  }, []);

  const getBallPosition = () => {
    if (activeSection === 0) return sections[0].position;
    
    const currentPos = sections[activeSection].position;
    const prevPos = sections[activeSection - 1]?.position || currentPos;
    
    return {
      x: prevPos.x + (currentPos.x - prevPos.x) * 0.5,
      y: prevPos.y + (currentPos.y - prevPos.y) * 0.5
    };
  };

  const ballPos = getBallPosition();

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Players Draft | RISE Football Agency</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <Header />

      {/* Fixed Pitch Background */}
      <div className="fixed inset-0 pointer-events-none z-0 pt-16">
        <div className="w-full h-full relative overflow-hidden bg-background">
          {/* Pitch lines only - no grass */}
          <div className="absolute inset-0 opacity-25">
            {/* Center circle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full" />
            {/* Center line */}
            <div className="absolute top-0 left-1/2 w-0.5 h-full bg-white" />
            {/* Penalty boxes */}
            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-32 h-64 border-2 border-white border-l-0" />
            <div className="absolute top-1/2 right-0 -translate-y-1/2 w-32 h-64 border-2 border-white border-r-0" />
            {/* Goal areas */}
            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-16 h-32 border-2 border-white border-l-0" />
            <div className="absolute top-1/2 right-0 -translate-y-1/2 w-16 h-32 border-2 border-white border-r-0" />
            {/* Penalty arcs (D) */}
            <div className="absolute top-1/2 left-[8rem] -translate-y-1/2 w-10 h-32 border-2 border-white border-l-0 rounded-r-full" />
            <div className="absolute top-1/2 right-[8rem] -translate-y-1/2 w-10 h-32 border-2 border-white border-r-0 rounded-l-full" />
            {/* Corner arcs */}
            <svg className="absolute top-0 left-0 w-16 h-16" viewBox="0 0 100 100">
              <path d="M 100 0 A 100 100 0 0 0 0 100" fill="none" stroke="white" strokeWidth="2" />
            </svg>
            <svg className="absolute top-0 right-0 w-16 h-16" viewBox="0 0 100 100">
              <path d="M 0 0 A 100 100 0 0 1 100 100" fill="none" stroke="white" strokeWidth="2" />
            </svg>
            <svg className="absolute bottom-0 left-0 w-16 h-16" viewBox="0 0 100 100">
              <path d="M 100 100 A 100 100 0 0 1 0 0" fill="none" stroke="white" strokeWidth="2" />
            </svg>
            <svg className="absolute bottom-0 right-0 w-16 h-16" viewBox="0 0 100 100">
              <path d="M 0 100 A 100 100 0 0 0 100 0" fill="none" stroke="white" strokeWidth="2" />
            </svg>
          </div>

          {/* Animated Football */}
          <div
            className="absolute w-12 h-12 transition-all duration-1000 ease-in-out z-10"
            style={{
              left: `${ballPos.x}%`,
              top: `${ballPos.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <img
              src={footballIcon}
              alt="Football"
              className="w-full h-full object-contain drop-shadow-xl"
            />
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-16">
        <div className="relative z-10 container mx-auto px-4 text-center">
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-bebas uppercase tracking-wider text-white mb-6 drop-shadow-2xl animate-fade-in">
            {t('players.hero_title', 'REALISE POTENTIAL')}
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto drop-shadow-lg animate-fade-in">
            {t('players.hero_subtitle', 'Elevating your game through comprehensive support and development')}
          </p>
        </div>
      </section>

      {/* Content Sections */}
      <main className="relative z-10">
        {sections.map((section, index) => (
          <section
            key={index}
            ref={(el) => (sectionsRef.current[index] = el)}
            className="min-h-screen flex items-center justify-center py-20"
          >
            <div className="container mx-auto px-4 max-w-4xl">
              <div 
                className={`bg-black/70 backdrop-blur-md border-2 border-primary/50 rounded-2xl p-8 md:p-12 lg:p-16 transition-all duration-700 ${
                  activeSection === index 
                    ? 'scale-100 opacity-100' 
                    : 'scale-95 opacity-70'
                }`}
              >
                <h2 className="text-5xl md:text-6xl lg:text-7xl font-bebas uppercase tracking-wider text-primary mb-6 md:mb-8">
                  {t(section.titleKey, section.titleFallback)}
                </h2>
                <p className="text-xl md:text-2xl text-white/90 leading-relaxed">
                  {t(section.contentKey, section.contentFallback)}
                </p>
              </div>
            </div>
          </section>
        ))}

        {/* Additional Services Section */}
        <section className="min-h-screen flex items-center justify-center py-20">
          <div className="container mx-auto px-4">
            <div className="bg-black/70 backdrop-blur-md border-2 border-primary/50 rounded-2xl p-8 md:p-12 max-w-6xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider text-center text-primary mb-12">
                {t('players.additional_services', 'Additional Services')}
              </h2>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center space-y-4">
                  <h3 className="text-2xl md:text-3xl font-bebas uppercase tracking-wider text-primary">
                    {t('players.stakeholder_management', 'Stakeholder Management')}
                  </h3>
                  <p className="text-base md:text-lg text-white/80">
                    {t('players.stakeholder_desc', 'Career management through contract negotiations, loans and transfers')}
                  </p>
                </div>

                <div className="text-center space-y-4">
                  <h3 className="text-2xl md:text-3xl font-bebas uppercase tracking-wider text-primary">
                    {t('players.brand_image', 'Brand Image')}
                  </h3>
                  <p className="text-base md:text-lg text-white/80">
                    {t('players.brand_desc', 'Development of your brand image and management of public relations')}
                  </p>
                </div>

                <div className="text-center space-y-4">
                  <h3 className="text-2xl md:text-3xl font-bebas uppercase tracking-wider text-primary">
                    {t('players.commercial_interests', 'Commercial Interests')}
                  </h3>
                  <p className="text-base md:text-lg text-white/80">
                    {t('players.commercial_desc', 'Creating relationships with major brands and negotiating the best sponsorship opportunities')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="min-h-screen flex items-center justify-center py-20">
          <div className="container mx-auto px-4 text-center">
            <div className="bg-black/70 backdrop-blur-md border-2 border-primary/50 rounded-2xl p-8 md:p-12 max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider text-primary mb-6">
                {t('players.cta_title', 'Ready to Elevate Your Game?')}
              </h2>
              <p className="text-xl text-white/90 mb-8">
                {t('players.cta_desc', 'Join RISE and experience comprehensive support designed to maximize your potential')}
              </p>
              <Button asChild size="lg" className="btn-shine font-bebas uppercase tracking-wider">
                <Link to="/contact">{t('players.get_started', 'Get Started')}</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default PlayersDraft;
