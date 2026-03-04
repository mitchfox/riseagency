import { Link, useLocation } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";

// Known routes for smart matching
const KNOWN_ROUTES = [
  { path: "/stars", label: "Our Stars", aliases: ["players", "player", "roster", "squad", "team"] },
  { path: "/about", label: "About Us", aliases: ["about-us", "who", "company", "agency"] },
  { path: "/news", label: "News", aliases: ["blog", "articles", "press", "media", "updates"] },
  { path: "/contact", label: "Contact", aliases: ["contact-us", "get-in-touch", "enquiry", "enquiries"] },
  { path: "/portal", label: "Portal", aliases: ["login", "dashboard", "signin", "sign-in"] },
  { path: "/staff", label: "Staff", aliases: ["admin", "management", "backend"] },
  { path: "/about/players", label: "For Players", aliases: ["footballer", "footballers", "representation"] },
  { path: "/about/clubs", label: "For Clubs", aliases: ["club", "clubs", "scouts", "scouting"] },
  { path: "/about/coaches", label: "For Coaches", aliases: ["coach", "coaching", "training"] },
  { path: "/between-the-lines", label: "Between The Lines", aliases: ["btl", "insights", "analysis"] },
  { path: "/careers", label: "Careers", aliases: ["jobs", "hiring", "vacancies", "work"] },
];

const getSuggestions = (pathname: string) => {
  const segments = pathname.toLowerCase().replace(/^\/|\/$/g, "").split(/[-_/]/);
  
  const scored = KNOWN_ROUTES.map(route => {
    let score = 0;
    const allTerms = [route.path.replace("/", ""), route.label.toLowerCase(), ...route.aliases];
    
    for (const segment of segments) {
      if (segment.length < 2) continue;
      for (const term of allTerms) {
        if (term.includes(segment) || segment.includes(term)) {
          score += 2;
        }
        // Levenshtein-lite: check first 3 chars match
        if (segment.length >= 3 && term.length >= 3 && segment.slice(0, 3) === term.slice(0, 3)) {
          score += 1;
        }
      }
    }
    return { ...route, score };
  });

  const matches = scored.filter(r => r.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
  
  // If no matches, return top popular pages
  if (matches.length === 0) {
    return KNOWN_ROUTES.slice(0, 4);
  }
  return matches;
};

const NotFound = () => {
  const location = useLocation();
  const [countdown, setCountdown] = useState(15);
  const { t } = useLanguage();

  const suggestions = useMemo(() => getSuggestions(location.pathname), [location.pathname]);

  useEffect(() => {
    console.log("404 Error: Page not found:", location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = "/";
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <SEO 
        title={t("error_page_title", "Page Not Found | RISE Football Agency")}
        description={t("error_page_description", "The page you're looking for doesn't exist. Return to RISE Football Agency homepage.")}
      />
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-8 max-w-lg">
          {/* 404 Display */}
          <div className="space-y-4">
            <h1 className="text-[120px] md:text-[180px] font-bebas leading-none text-primary tracking-tight">
              404
            </h1>
            <h2 className="text-3xl md:text-4xl font-bebas uppercase tracking-wider text-foreground">
              {t("error_page_not_found", "Page Not Found")}
            </h2>
            <p className="text-muted-foreground text-lg">
              {t("error_page_message", "The page you're looking for doesn't exist or has been moved.")}
            </p>
          </div>

          {/* Smart Suggestions */}
          <div className="pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground mb-5">
              {t("error_did_you_mean", "Were you looking for one of these?")}
            </p>
            <div className="flex flex-col gap-2 max-w-xs mx-auto">
              {suggestions.map((route) => (
                <Link
                  key={route.path}
                  to={route.path}
                  className="flex items-center justify-between px-5 py-3 bg-secondary/50 border border-border hover:border-primary/50 transition-all group"
                >
                  <span className="font-bebas uppercase tracking-wider text-foreground group-hover:text-primary transition-colors">
                    {route.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{route.path}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Countdown */}
          <p className="text-sm text-muted-foreground">
            {t("error_redirecting", "Redirecting to homepage in")}{" "}
            <span className="text-primary font-bold">{countdown}</span> {t("error_seconds", "seconds")}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="btn-shine font-bebas uppercase tracking-wider">
              <Link to="/">
                <Home className="mr-2 h-5 w-5" />
                {t("error_go_home", "Go Home")}
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => window.history.back()}
              className="font-bebas uppercase tracking-wider"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              {t("error_go_back", "Go Back")}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFound;
