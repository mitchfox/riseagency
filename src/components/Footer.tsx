import { Link } from "react-router-dom";
import { FaInstagram, FaTwitter, FaLinkedin, FaYoutube } from "react-icons/fa";
import logo from "@/assets/logo.png";
import { WorkWithUsDialog } from "@/components/WorkWithUsDialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { LocalizedLink } from "@/components/LocalizedLink";
import { SubdomainLink } from "@/components/SubdomainLink";

export const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-muted/20 border-t border-primary/10">
      <div className="container mx-auto px-4 py-16">
        {/* Top Section - Logo & Description */}
        <div className="max-w-4xl mx-auto text-center mb-16">
          <img src={logo} alt="RISE Football Agency" className="h-16 mx-auto mb-6" />
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            {t("footer.description", "RISE Football Agency is built on a deep understanding of performance and how it shapes decisions at every level of the game. We represent and work directly with clubs through an established international network, underpinned by an unrivalled background in developing Premier League level talent. With scouting coverage across Europe and Africa informing recruitment and placement through evidence, standards and proven pathways - our stars share our ethic, mindset and attention to detail to performance.")}
          </p>
        </div>

        {/* Main Footer Content */}
        <div className="grid md:grid-cols-3 gap-12 max-w-6xl mx-auto mb-12">
          {/* Quick Links */}
          <div>
            <h3 className="font-bebas text-2xl uppercase tracking-wider text-foreground mb-6">
              {t("footer.quick_links", "Quick Links")}
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
                {t("footer.home", "Home")}
              </Link>
              <LocalizedLink to="/stars" className="text-muted-foreground hover:text-primary transition-colors">
                {t("footer.stars", "Stars")}
              </LocalizedLink>
              <SubdomainLink role="players" className="text-muted-foreground hover:text-primary transition-colors">
                {t("footer.players", "Player")}
              </SubdomainLink>
              <SubdomainLink role="clubs" className="text-muted-foreground hover:text-primary transition-colors">
                {t("footer.clubs", "Club")}
              </SubdomainLink>
              <SubdomainLink role="coaches" className="text-muted-foreground hover:text-primary transition-colors">
                {t("footer.coaches", "Coach")}
              </SubdomainLink>
              <SubdomainLink role="scouts" className="text-muted-foreground hover:text-primary transition-colors">
                {t("footer.scouts", "Scout")}
              </SubdomainLink>
              <LocalizedLink to="/performance" className="text-muted-foreground hover:text-primary transition-colors">
                {t("footer.realise_potential", "Realise Potential")}
              </LocalizedLink>
              <LocalizedLink to="/about" className="text-muted-foreground hover:text-primary transition-colors">
                {t("footer.about", "About")}
              </LocalizedLink>
              <LocalizedLink to="/news" className="text-muted-foreground hover:text-primary transition-colors">
                {t("footer.news", "News")}
              </LocalizedLink>
              <LocalizedLink to="/jobs" className="text-muted-foreground hover:text-primary transition-colors">
                {t("footer.jobs", "Jobs")}
              </LocalizedLink>
              <Link to="/staff" className="text-muted-foreground hover:text-primary transition-colors">
                {t("footer.staff", "Staff")}
              </Link>
              <LocalizedLink to="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                {t("footer.contact", "Contact")}
              </LocalizedLink>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bebas text-2xl uppercase tracking-wider text-foreground mb-6">
              {t("footer.get_in_touch", "Get In Touch")}
            </h3>
            <WorkWithUsDialog>
              <Button 
                size="lg"
                hoverEffect
                className="w-full btn-shine font-bebas uppercase tracking-wider text-lg"
              >
                {t("footer.contact_us", "Contact Us")}
              </Button>
            </WorkWithUsDialog>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="font-bebas text-2xl uppercase tracking-wider text-foreground mb-6">
              {t("footer.follow_us", "Follow Us")}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <a
                href="https://www.instagram.com/rise.footballagency"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-primary/5 hover:bg-primary/10 rounded-lg border border-primary/20 hover:border-primary/40 transition-all group"
              >
                <FaInstagram className="w-5 h-5 text-primary" />
                <span className="text-sm font-bebas uppercase tracking-wider text-foreground group-hover:text-primary transition-colors">{t("footer.instagram", "Instagram")}</span>
              </a>
              <a
                href="https://x.com/RISE_FTBL"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-primary/5 hover:bg-primary/10 rounded-lg border border-primary/20 hover:border-primary/40 transition-all group"
              >
                <FaTwitter className="w-5 h-5 text-primary" />
                <span className="text-sm font-bebas uppercase tracking-wider text-foreground group-hover:text-primary transition-colors">{t("footer.twitter", "Twitter")}</span>
              </a>
              <a
                href="https://www.linkedin.com/company/rise-football-agency"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-primary/5 hover:bg-primary/10 rounded-lg border border-primary/20 hover:border-primary/40 transition-all group"
              >
                <FaLinkedin className="w-5 h-5 text-primary" />
                <span className="text-sm font-bebas uppercase tracking-wider text-foreground group-hover:text-primary transition-colors">{t("footer.linkedin", "LinkedIn")}</span>
              </a>
              <a
                href="https://www.youtube.com/@RISEFootball"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-primary/5 hover:bg-primary/10 rounded-lg border border-primary/20 hover:border-primary/40 transition-all group"
              >
                <FaYoutube className="w-5 h-5 text-primary" />
                <span className="text-sm font-bebas uppercase tracking-wider text-foreground group-hover:text-primary transition-colors">{t("footer.youtube", "YouTube")}</span>
              </a>
            </div>
          </div>
        </div>

        {/* About RISE Section */}
        <div className="pt-8 border-t border-primary/10 mb-8">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="font-bebas text-2xl uppercase tracking-wider text-foreground mb-4">
              {t("footer.about_rise_title", "About RISE")}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("footer.about_rise_text", "RISE Football Agency is built on a deep understanding of performance and how it shapes decisions at every level of the game. We represent and work directly with clubs through an established international network, underpinned by an unrivalled background in developing Premier League level talent. With scouting coverage across Europe and Africa informing recruitment and placement through evidence, standards and proven pathways - our stars share our ethic, mindset and attention to detail to performance.")}
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-primary/10">
          <p className="text-xs text-muted-foreground/80 text-center max-w-3xl mx-auto mb-6 px-4">
            {t("footer.regulatory_text", "RISE Agency operates in accordance with the regulatory frameworks established by FIFA and UEFA. Our work follows the standards required for player representation, governance and integrity.")}
          </p>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} RISE Football Agency. {t("footer.all_rights_reserved", "All rights reserved.")}
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <a 
                href="https://open.spotify.com/show/1Ep6k8p6j4rMT1a0AFqX8C" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-primary transition-colors font-bebas uppercase tracking-wider"
              >
                {t("footer.podcast", "RISE Podcast")}
              </a>
              <Link to="/privacy-policy" className="text-sm text-muted-foreground hover:text-primary transition-colors font-bebas uppercase tracking-wider">
                {t("footer.privacy_policy", "Privacy Policy")}
              </Link>
              <a 
                href="/FIFA_Football_Agent_Regulations.pdf" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-primary transition-colors font-bebas uppercase tracking-wider"
              >
                {t("footer.regulations", "REGULATIONS")}
              </a>
              <a 
                href="https://www.fifa.com/legal/football-regulatory/agents" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-primary transition-colors font-bebas uppercase tracking-wider"
              >
                {t("footer.fifa_framework", "FIFA Framework")}
              </a>
              <a 
                href="https://www.uefa.com/insideuefa/protecting-the-game/football-regulatory" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-primary transition-colors font-bebas uppercase tracking-wider"
              >
                {t("footer.uefa_framework", "UEFA Framework")}
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
