import { Link } from "react-router-dom";
import { FaInstagram, FaTwitter, FaLinkedin, FaYoutube } from "react-icons/fa";
import logo from "@/assets/logo.png";

export const Footer = () => {
  return (
    <footer className="bg-muted/20 border-t border-primary/10">
      <div className="container mx-auto px-4 py-16">
        {/* Top Section - Logo & Description */}
        <div className="max-w-4xl mx-auto text-center mb-16">
          <img src={logo} alt="RISE Football Agency" className="h-16 mx-auto mb-6" />
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Performance-first football representation helping players, coaches, and clubs reach their full potential through data-driven insights and professional development.
          </p>
        </div>

        {/* Main Footer Content */}
        <div className="grid md:grid-cols-3 gap-12 max-w-6xl mx-auto mb-12">
          {/* Quick Links */}
          <div>
            <h3 className="font-bebas text-2xl uppercase tracking-wider text-foreground mb-6">
              Quick Links
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
                Home
              </Link>
              <Link to="/stars" className="text-muted-foreground hover:text-primary transition-colors">
                Stars
              </Link>
              <Link to="/players" className="text-muted-foreground hover:text-primary transition-colors">
                Players
              </Link>
              <Link to="/clubs" className="text-muted-foreground hover:text-primary transition-colors">
                Clubs
              </Link>
              <Link to="/coaches" className="text-muted-foreground hover:text-primary transition-colors">
                Coaches
              </Link>
              <Link to="/scouts" className="text-muted-foreground hover:text-primary transition-colors">
                Scouts
              </Link>
              <Link to="/performance" className="text-muted-foreground hover:text-primary transition-colors">
                Realise Potential
              </Link>
              <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">
                About
              </Link>
              <Link to="/news" className="text-muted-foreground hover:text-primary transition-colors">
                News
              </Link>
              <Link to="/between-the-lines" className="text-muted-foreground hover:text-primary transition-colors">
                Between The Lines
              </Link>
              <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                Contact
              </Link>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bebas text-2xl uppercase tracking-wider text-foreground mb-6">
              Get In Touch
            </h3>
            <div className="space-y-4">
              <a 
                href="mailto:jolon.levene@risefootballagency.com"
                className="block group"
              >
                <div className="p-4 bg-primary/5 hover:bg-primary/10 rounded-lg border border-primary/20 hover:border-primary/40 transition-all">
                  <p className="text-xs font-bebas uppercase tracking-wider text-primary mb-1">General Enquiries</p>
                  <p className="text-sm text-foreground group-hover:text-primary transition-colors">jolon.levene@risefootballagency.com</p>
                </div>
              </a>
              <a 
                href="mailto:kuda.butawo@risefootballagency.com"
                className="block group"
              >
                <div className="p-4 bg-primary/5 hover:bg-primary/10 rounded-lg border border-primary/20 hover:border-primary/40 transition-all">
                  <p className="text-xs font-bebas uppercase tracking-wider text-primary mb-1">Media & Sponsors</p>
                  <p className="text-sm text-foreground group-hover:text-primary transition-colors">kuda.butawo@risefootballagency.com</p>
                </div>
              </a>
            </div>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="font-bebas text-2xl uppercase tracking-wider text-foreground mb-6">
              Follow Us
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <a
                href="https://www.instagram.com/rise.footballagency"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-primary/5 hover:bg-primary/10 rounded-lg border border-primary/20 hover:border-primary/40 transition-all group"
              >
                <FaInstagram className="w-5 h-5 text-primary" />
                <span className="text-sm font-bebas uppercase tracking-wider text-foreground group-hover:text-primary transition-colors">Instagram</span>
              </a>
              <a
                href="https://x.com/RISE_FTBL"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-primary/5 hover:bg-primary/10 rounded-lg border border-primary/20 hover:border-primary/40 transition-all group"
              >
                <FaTwitter className="w-5 h-5 text-primary" />
                <span className="text-sm font-bebas uppercase tracking-wider text-foreground group-hover:text-primary transition-colors">Twitter</span>
              </a>
              <a
                href="https://www.linkedin.com/company/rise-football-agency"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-primary/5 hover:bg-primary/10 rounded-lg border border-primary/20 hover:border-primary/40 transition-all group"
              >
                <FaLinkedin className="w-5 h-5 text-primary" />
                <span className="text-sm font-bebas uppercase tracking-wider text-foreground group-hover:text-primary transition-colors">LinkedIn</span>
              </a>
              <a
                href="https://www.youtube.com/@RISEFootball"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-primary/5 hover:bg-primary/10 rounded-lg border border-primary/20 hover:border-primary/40 transition-all group"
              >
                <FaYoutube className="w-5 h-5 text-primary" />
                <span className="text-sm font-bebas uppercase tracking-wider text-foreground group-hover:text-primary transition-colors">YouTube</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-primary/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} RISE Football Agency. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <a 
                href="https://open.spotify.com/show/1Ep6k8p6j4rMT1a0AFqX8C" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-primary transition-colors font-bebas uppercase tracking-wider"
              >
                RISE Podcast
              </a>
              <Link to="/privacy-policy" className="text-sm text-muted-foreground hover:text-primary transition-colors font-bebas uppercase tracking-wider">
                Privacy Policy
              </Link>
              <Link to="/terms-of-service" className="text-sm text-muted-foreground hover:text-primary transition-colors font-bebas uppercase tracking-wider">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
