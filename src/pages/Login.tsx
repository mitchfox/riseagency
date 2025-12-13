import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import smudgedMarbleBg from "@/assets/smudged-marble-login.png";
import { 
  Video, 
  BarChart3, 
  Dumbbell, 
  FileText, 
  Users, 
  Trophy,
  Play,
  TrendingUp,
  Calendar,
  Target
} from "lucide-react";

const portalFeatures = [
  {
    icon: Video,
    title: "Match Analysis",
    description: "Detailed breakdown of your performances with expert insights and tactical analysis from every match."
  },
  {
    icon: BarChart3,
    title: "Performance Stats",
    description: "Track your progress with comprehensive statistics, ratings, and performance metrics over time."
  },
  {
    icon: Dumbbell,
    title: "Training Programmes",
    description: "Personalized training sessions and workout programmes designed specifically for your development."
  },
  {
    icon: Play,
    title: "Video Highlights",
    description: "Access your curated highlight reels and individual clip collections from your matches."
  },
  {
    icon: TrendingUp,
    title: "Development Tracking",
    description: "Monitor your growth with test results, benchmarks, and development milestones."
  },
  {
    icon: Users,
    title: "Club Outreach",
    description: "Stay informed about club interest, trial opportunities, and representation progress."
  },
  {
    icon: Calendar,
    title: "Weekly Schedule",
    description: "View your personalized weekly training schedule and upcoming sessions at a glance."
  },
  {
    icon: Target,
    title: "Positional Guides",
    description: "Access tactical guides and educational content tailored to your playing position."
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

      {/* Features Section */}
      <section className="py-16 md:py-24 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bebas uppercase tracking-wider text-foreground mb-4">
              EVERYTHING YOU NEED
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Access comprehensive tools and resources designed to accelerate your football development.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {portalFeatures.map((feature, index) => (
              <div 
                key={index}
                className="group p-6 bg-secondary/30 border border-border/50 hover:border-primary/50 transition-all duration-300"
              >
                <feature.icon className="w-10 h-10 text-primary mb-4 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="text-lg font-bebas uppercase tracking-wider text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-secondary/20 border-t border-border/50">
        <div className="max-w-3xl mx-auto text-center">
          <Trophy className="w-12 h-12 text-primary mx-auto mb-6" />
          <h2 className="text-2xl md:text-3xl font-bebas uppercase tracking-wider text-foreground mb-4">
            READY TO ELEVATE YOUR GAME?
          </h2>
          <p className="text-muted-foreground mb-8">
            Not a member yet? Get in touch to learn more about our player development programme.
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
