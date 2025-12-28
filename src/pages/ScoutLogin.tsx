import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import smudgedMarbleBg from "@/assets/smudged-marble-login.png";

const ScoutLogin = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const scoutEmail = localStorage.getItem("scout_email") || sessionStorage.getItem("scout_email");
      if (scoutEmail) {
        const { data } = await supabase
          .from("scouts")
          .select("id")
          .eq("email", scoutEmail)
          .maybeSingle();
          
        if (data) {
          navigate("/potential");
          return;
        } else {
          localStorage.removeItem("scout_email");
          sessionStorage.removeItem("scout_email");
        }
      }
    };

    checkAuth();

    const savedScoutEmail = localStorage.getItem("scout_saved_email");
    if (savedScoutEmail) setEmail(savedScoutEmail);
    
    const savedScoutRemember = localStorage.getItem("scout_remember_me");
    if (savedScoutRemember === "false") {
      setRememberMe(false);
    }
  }, [navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const trimmedEmail = email.toLowerCase().trim();
      const { data: scout, error: scoutError } = await supabase
        .from("scouts")
        .select("id, email, status")
        .ilike("email", trimmedEmail)
        .maybeSingle();

      if (scoutError) throw scoutError;
      
      if (scout) {
        // Check if scout is active
        if (scout.status && scout.status !== 'active') {
          toast.error('Your scout account is not currently active. Please contact the agency.');
          return;
        }

        try {
          localStorage.setItem("scout_email", trimmedEmail);
          sessionStorage.setItem("scout_email", trimmedEmail);
          localStorage.setItem("scout_login_timestamp", Date.now().toString());
          
          if (rememberMe) {
            localStorage.setItem("scout_saved_email", trimmedEmail);
            localStorage.setItem("scout_remember_me", "true");
          } else {
            localStorage.removeItem("scout_saved_email");
            localStorage.setItem("scout_remember_me", "false");
          }
        } catch (storageError) {
          console.error("Storage error:", storageError);
        }
        
        toast.success(t('login.welcome_scout', 'Welcome to your scout portal!'));
        navigate("/potential");
        return;
      }

      toast.error(t('login.scout_email_not_found', 'Email not found. Please contact support to get access.'));
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || t('login.failed', 'Failed to access portal'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Login Section */}
      <section 
        className="relative py-16 md:py-24 px-4 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${smudgedMarbleBg})` }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground mb-4">
            {t('scout_login.title', 'SCOUT PORTAL')}
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl mb-8 max-w-2xl mx-auto">
            {t('scout_login.subtitle', 'Access your scouting dashboard to submit player reports and track your recommendations.')}
          </p>
          
          {/* Compact Login Form */}
          <form onSubmit={handleEmailLogin} className="max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={t('login.email_placeholder', 'Enter your email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoComplete="email"
                className="flex-1 bg-background/20 border-border/50 text-foreground placeholder:text-muted-foreground backdrop-blur-sm h-12"
              />
              <Button 
                type="submit" 
                className="btn-shine font-bebas text-lg uppercase tracking-wider h-12 px-8"
                disabled={loading}
              >
                {loading ? "..." : t('login.enter', 'ENTER')}
              </Button>
            </div>
            <div className="flex items-center justify-center mt-4 gap-2">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-border bg-background/20 text-primary focus:ring-primary focus:ring-offset-0"
              />
              <Label htmlFor="remember" className="text-muted-foreground text-sm cursor-pointer">
                {t('login.remember_me', 'Keep me logged in')}
              </Label>
            </div>
          </form>
        </div>
      </section>

      {/* Scout Info Section */}
      <div className="py-8 px-4 bg-secondary/30 border-y border-border/30">
        <p className="text-center text-muted-foreground">
          {t('scout_login.not_scout', 'Not a registered scout?')}{" "}
          <span className="text-primary font-medium">{t('scout_login.learn_more', 'Learn more about becoming a RISE scout below ↓')}</span>
        </p>
      </div>

      {/* Benefits Section */}
      <section className="py-16 md:py-24 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <p className="text-primary uppercase tracking-widest text-sm mb-3">{t('scout_login.network', 'Join Our Network')}</p>
            <h2 className="text-3xl md:text-5xl font-bebas uppercase tracking-wider text-foreground mb-4">
              {t('scout_login.what_scouts_get', "WHAT OUR SCOUTS GET")}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('scout_login.benefits_desc', 'Join our scouting network and help identify the next generation of football talent.')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-secondary/20 rounded-lg border border-border/50 text-center">
              <h3 className="text-xl font-bebas uppercase tracking-wider text-foreground mb-3">
                {t('scout_login.benefit_1_title', 'Commission Structure')}
              </h3>
              <p className="text-muted-foreground">
                {t('scout_login.benefit_1_desc', 'Earn competitive commissions on successful player signings that you recommend.')}
              </p>
            </div>
            <div className="p-6 bg-secondary/20 rounded-lg border border-border/50 text-center">
              <h3 className="text-xl font-bebas uppercase tracking-wider text-foreground mb-3">
                {t('scout_login.benefit_2_title', 'Easy Reporting')}
              </h3>
              <p className="text-muted-foreground">
                {t('scout_login.benefit_2_desc', 'Submit player reports through our intuitive portal and track their progress.')}
              </p>
            </div>
            <div className="p-6 bg-secondary/20 rounded-lg border border-border/50 text-center">
              <h3 className="text-xl font-bebas uppercase tracking-wider text-foreground mb-3">
                {t('scout_login.benefit_3_title', 'Global Reach')}
              </h3>
              <p className="text-muted-foreground">
                {t('scout_login.benefit_3_desc', 'Scout in your region and connect talented players with opportunities worldwide.')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-background border-t border-border/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bebas uppercase tracking-wider text-foreground mb-4">
            {t('scout_login.become_scout', 'BECOME A SCOUT')}
          </h2>
          <p className="text-muted-foreground mb-8">
            {t('scout_login.get_in_touch', 'Interested in joining our scouting network? Get in touch to learn more.')}
          </p>
          <Button 
            variant="outline" 
            className="font-bebas text-lg uppercase tracking-wider border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            onClick={() => navigate("/contact")}
          >
            {t('login.contact_us', 'CONTACT US')}
          </Button>
        </div>
      </section>
    </div>
  );
};

export default ScoutLogin;
