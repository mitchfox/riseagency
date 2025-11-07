import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { toast } from "sonner";
import smudgedMarbleBg from "@/assets/smudged-marble-login.png";

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  // Check if user is already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    const savedEmail = localStorage.getItem("player_saved_email");
    const savedRememberMe = localStorage.getItem("player_remember_me");
    if (savedEmail) setEmail(savedEmail);
    if (savedRememberMe === "true") setRememberMe(true);
  }, [navigate]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if email exists in players table
      const { data: player, error: playerError } = await supabase
        .from("players")
        .select("id, email")
        .eq("email", email)
        .maybeSingle();

      if (playerError) throw playerError;
      
      if (!player) {
        toast.error("Email not found. Please contact your coach to get access.");
        setLoading(false);
        return;
      }

      // Send OTP via Supabase Auth
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        },
      });

      if (error) throw error;

      // Save email preference if remember me is checked
      if (rememberMe) {
        localStorage.setItem("player_saved_email", email);
        localStorage.setItem("player_remember_me", "true");
      } else {
        localStorage.removeItem("player_saved_email");
        localStorage.removeItem("player_remember_me");
      }

      setOtpSent(true);
      toast.success("Check your email for the login code!");
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Failed to send login code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      });

      if (error) throw error;

      toast.success("Welcome to your portal!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Verification error:", error);
      toast.error(error.message || "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-20 px-4">
        <div className="max-w-md mx-auto">
          <Card 
            className="w-full bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${smudgedMarbleBg})` }}
          >
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl font-bebas uppercase tracking-wider text-center text-white">
              Player Portal
            </CardTitle>
            <CardDescription className="text-center text-white/90">
              The player portal is for our represented players to view their personal analysis and programming
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!otpSent ? (
              <form onSubmit={handleSendOTP} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder=""
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="email"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/10 text-primary focus:ring-primary focus:ring-offset-0"
                  />
                  <Label htmlFor="remember" className="text-white text-sm cursor-pointer">
                    Remember me
                  </Label>
                </div>
                <Button 
                  type="submit" 
                  className="w-full btn-shine font-bebas text-lg uppercase tracking-wider"
                  disabled={loading}
                >
                  {loading ? "Sending code..." : "Send Login Code"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-white">Enter 6-digit code</Label>
                  <Input
                    id="otp"
                    name="otp"
                    type="text"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    disabled={loading}
                    autoComplete="one-time-code"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-center text-2xl tracking-widest"
                    maxLength={6}
                  />
                  <p className="text-white/70 text-sm text-center">
                    Check your email for the code
                  </p>
                </div>
                <div className="space-y-2">
                  <Button 
                    type="submit" 
                    className="w-full btn-shine font-bebas text-lg uppercase tracking-wider"
                    disabled={loading || otp.length !== 6}
                  >
                    {loading ? "Verifying..." : "Access Portal"}
                  </Button>
                  <Button 
                    type="button"
                    variant="ghost"
                    className="w-full text-white hover:bg-white/10"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                    }}
                    disabled={loading}
                  >
                    Back to email
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Login;
