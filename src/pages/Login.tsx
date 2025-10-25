import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");

  const handleEmailLogin = async (e: React.FormEvent) => {
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

      // Store email in session storage for dashboard access
      sessionStorage.setItem("player_email", email);
      
      toast.success("Welcome to your portal!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Failed to access portal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-20 px-4">
        <div className="max-w-md mx-auto">
          <Card className="w-full bg-marble">
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl font-bebas uppercase tracking-wider text-center">
              Player Portal
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              Access your personal analysis and programming
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="email"
                />
                <p className="text-sm text-muted-foreground">
                  Enter your email to access your portal
                </p>
              </div>
              <Button 
                type="submit" 
                className="w-full btn-shine font-bebas text-lg uppercase tracking-wider"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Access Portal"}
              </Button>
            </form>
          </CardContent>
        </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Login;
