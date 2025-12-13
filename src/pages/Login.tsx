import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import smudgedMarbleBg from "@/assets/smudged-marble-login.png";

// Portal feature screenshots
import analysisScreenshot from "@/assets/realise-potential-analysis.png";
import reportScreenshot from "@/assets/realise-potential-report.png";
import sessionsScreenshot from "@/assets/realise-potential-sessions.png";
import paosScreenshot from "@/assets/realise-potential-paos.png";

const portalFeatures = [
  {
    image: analysisScreenshot,
    title: "Match Analysis",
    description: "Every performance broken down with expert tactical insights, key moments, and actionable feedback."
  },
  {
    image: reportScreenshot,
    title: "Performance Reports",
    description: "Comprehensive match reports with ratings, stats, and detailed analysis of your contributions."
  },
  {
    image: sessionsScreenshot,
    title: "Training Programmes",
    description: "Personalized sessions and workout programmes designed to develop your game week by week."
  },
  {
    image: paosScreenshot,
    title: "Development Tracking",
    description: "Monitor your progress with benchmarks, test results, and development milestones over time."
  }
];

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const playerEmail = localStorage.getItem("player_email") || sessionStorage.getItem("player_email");
      if (playerEmail) {
        const { data } = await supabase
          .from("players")
          .select("id")
          .eq("email", playerEmail)
          .maybeSingle();
          
        if (data) {
          navigate("/portal");
          return;
        } else {
          localStorage.removeItem("player_email");
          sessionStorage.removeItem("player_email");
        }
      }

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

    const savedPlayerEmail = localStorage.getItem("player_saved_email");
    const savedScoutEmail = localStorage.getItem("scout_saved_email");
    const savedEmail = savedPlayerEmail || savedScoutEmail;
    
    if (savedEmail) setEmail(savedEmail);
    
    const savedPlayerRemember = localStorage.getItem("player_remember_me");
    const savedScoutRemember = localStorage.getItem("scout_remember_me");
    
    if (savedPlayerRemember === "false" || savedScoutRemember === "false") {
      setRememberMe(false);
    }
  }, [navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: player, error: playerError } = await supabase
        .from("players")
        .select("id, email")
        .eq("email", email)
        .maybeSingle();

      if (playerError) throw playerError;
      
      if (player) {
        try {
          localStorage.setItem("player_email", email);
          sessionStorage.setItem("player_email", email);
          localStorage.setItem("player_login_timestamp", Date.now().toString());
          
          if (rememberMe) {
            localStorage.setItem("player_saved_email", email);
            localStorage.setItem("player_remember_me", "true");
          } else {
            localStorage.removeItem("player_saved_email");
            localStorage.setItem("player_remember_me", "false");
          }
        } catch (storageError) {
          console.error("Storage error:", storageError);
        }
        
        toast.success("Welcome to your portal!");
        navigate("/portal");
        return;
      }

      const { data: scout, error: scoutError } = await supabase
        .from("scouts")
        .select("id, email")
        .eq("email", email)
        .maybeSingle();

      if (scoutError) throw scoutError;
      
      if (scout) {
        try {
          localStorage.setItem("scout_email", email);
          sessionStorage.setItem("scout_email", email);
          localStorage.setItem("scout_login_timestamp", Date.now().toString());
          
          if (rememberMe) {
            localStorage.setItem("scout_saved_email", email);
            localStorage.setItem("scout_remember_me", "true");
          } else {
            localStorage.removeItem("scout_saved_email");
            localStorage.setItem("scout_remember_me", "false");
          }
        } catch (storageError) {
          console.error("Storage error:", storageError);
        }
        
        toast.success("Welcome to your scout portal!");
        navigate("/potential");
        return;
      }

      toast.error("Email not found. Please contact support to get access.");
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Failed to access portal");
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
            PLAYER PORTAL
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl mb-8 max-w-2xl mx-auto">
            Your dedicated space for performance analysis, training programmes, and career development.
          </p>
          
          {/* Compact Login Form */}
          <form onSubmit={handleEmailLogin} className="max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
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
                {loading ? "..." : "ENTER"}
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
                Keep me logged in
              </Label>
            </div>
          </form>
        </div>
      </section>

      {/* Not a Player CTA */}
      <div className="py-8 px-4 bg-secondary/30 border-y border-border/30">
        <p className="text-center text-muted-foreground">
          Not a player represented by our agency?{" "}
          <span className="text-primary font-medium">Learn more about the RISE Portal below ↓</span>
        </p>
      </div>

      {/* Features Showcase Section */}
      <section className="py-16 md:py-24 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <p className="text-primary uppercase tracking-widest text-sm mb-3">Exclusive Access</p>
            <h2 className="text-3xl md:text-5xl font-bebas uppercase tracking-wider text-foreground mb-4">
              HERE'S WHAT OUR PLAYERS GET
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Every player on our agency receives a dedicated portal with tools and resources to accelerate their development.
            </p>
          </div>

          {/* Feature Cards with Screenshots */}
          <div className="space-y-16 md:space-y-24">
            {portalFeatures.map((feature, index) => (
              <div 
                key={index}
                className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-8 lg:gap-12 items-center`}
              >
                {/* Screenshot */}
                <div className="flex-1 w-full">
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/5 rounded-lg blur-sm group-hover:blur-md transition-all duration-300" />
                    <div className="relative overflow-hidden rounded-lg border border-border/50">
                      <img 
                        src={feature.image} 
                        alt={feature.title}
                        className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                      />
                    </div>
                  </div>
                </div>

                {/* Text Content */}
                <div className="flex-1 text-center lg:text-left">
                  <span className="inline-block text-primary text-sm uppercase tracking-widest mb-2">
                    0{index + 1}
                  </span>
                  <h3 className="text-2xl md:text-3xl font-bebas uppercase tracking-wider text-foreground mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Features List */}
      <section className="py-16 px-4 bg-secondary/20 border-t border-border/50">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl md:text-3xl font-bebas uppercase tracking-wider text-foreground text-center mb-10">
            PLUS SO MUCH MORE
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              "Video Highlights",
              "Weekly Schedules", 
              "Positional Guides",
              "Club Outreach Updates",
              "Physical Testing",
              "Nutrition Plans",
              "Psychology Sessions",
              "Career Planning"
            ].map((item, idx) => (
              <div key={idx} className="p-4">
                <p className="text-foreground font-medium">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-background border-t border-border/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bebas uppercase tracking-wider text-foreground mb-4">
            WANT ACCESS?
          </h2>
          <p className="text-muted-foreground mb-8">
            Get in touch to learn more about joining our player development programme.
          </p>
          <Button 
            variant="outline" 
            className="font-bebas text-lg uppercase tracking-wider border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            onClick={() => navigate("/contact")}
          >
            CONTACT US
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Login;
