import { Link } from "react-router-dom";
import { FaInstagram, FaTwitter, FaLinkedin, FaYoutube } from "react-icons/fa";
import logo from "@/assets/logo.png";

export const Footer = () => {
  return (
    <footer className="bg-secondary/30 border-t border-primary/10">
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Logo & Description */}
          <div className="space-y-6">
            <img src={logo} alt="RISE Football Agency" className="h-12" />
            <p className="text-muted-foreground text-base leading-relaxed">
              Professional football representation helping players reach their full potential.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bebas text-2xl uppercase tracking-wider text-foreground mb-6">
              Quick Links
            </h3>
            <ul className="space-y-3">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-primary transition-colors text-base">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/stars" className="text-muted-foreground hover:text-primary transition-colors text-base">
                  Stars
                </Link>
              </li>
              <li>
                <Link to="/players" className="text-muted-foreground hover:text-primary transition-colors text-base">
                  Players
                </Link>
              </li>
              <li>
                <Link to="/clubs" className="text-muted-foreground hover:text-primary transition-colors text-base">
                  Clubs
                </Link>
              </li>
              <li>
                <Link to="/coaches" className="text-muted-foreground hover:text-primary transition-colors text-base">
                  Coaches
                </Link>
              </li>
              <li>
                <Link to="/scouts" className="text-muted-foreground hover:text-primary transition-colors text-base">
                  Scouts
                </Link>
              </li>
              <li>
                <Link to="/performance" className="text-muted-foreground hover:text-primary transition-colors text-base">
                  Performance
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors text-base">
                  About
                </Link>
              </li>
              <li>
                <Link to="/news" className="text-muted-foreground hover:text-primary transition-colors text-base">
                  News
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bebas text-2xl uppercase tracking-wider text-foreground mb-6">
              Contact
            </h3>
            <ul className="space-y-3">
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors text-base">
                  Get In Touch
                </Link>
              </li>
              <li>
                <a 
                  href="mailto:jolon.levene@risefootballagency.com"
                  className="text-muted-foreground hover:text-primary transition-colors text-base"
                >
                  General Enquiries
                </a>
              </li>
              <li>
                <a 
                  href="mailto:kuda.butawo@risefootballagency.com"
                  className="text-muted-foreground hover:text-primary transition-colors text-base"
                >
                  Media & Sponsors
                </a>
              </li>
              <li>
                <a 
                  href="http://wa.link/mabnsw"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors text-base"
                >
                  WhatsApp
                </a>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="font-bebas text-2xl uppercase tracking-wider text-foreground mb-6">
              Follow Us
            </h3>
            <div className="flex gap-5">
              <a
                href="https://www.instagram.com/rise.footballagency"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-all hover:scale-110"
                aria-label="Instagram"
              >
                <FaInstagram className="w-7 h-7" />
              </a>
              <a
                href="https://x.com/RISE_FTBL"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-all hover:scale-110"
                aria-label="X (Twitter)"
              >
                <FaTwitter className="w-7 h-7" />
              </a>
              <a
                href="https://www.linkedin.com/company/rise-football-agency"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-all hover:scale-110"
                aria-label="LinkedIn"
              >
                <FaLinkedin className="w-7 h-7" />
              </a>
              <a
                href="https://www.youtube.com/@RISEFootball"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-all hover:scale-110"
                aria-label="YouTube"
              >
                <FaYoutube className="w-7 h-7" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-primary/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-muted-foreground text-base">
              © {new Date().getFullYear()} RISE Football Agency. All rights reserved.
            </p>
            <div className="flex gap-8 text-base">
              <a 
                href="https://www.youtube.com/@RISEFootball" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                RISE Podcast
              </a>
              <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
