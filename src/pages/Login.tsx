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

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event === "SIGNED_IN") {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;
      setMagicLinkSent(true);
      toast.success("Magic link sent! Check your email to sign in.");
    } catch (error: any) {
      toast.error(error.message || "Failed to send magic link");
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
            {magicLinkSent ? (
              <div className="text-center py-8 space-y-4">
                <div className="text-6xl mb-4">📧</div>
                <h3 className="text-2xl font-bebas uppercase tracking-wider">Check your email</h3>
                <p className="text-muted-foreground">
                  We've sent a magic link to <strong>{email}</strong>
                </p>
                <p className="text-sm text-muted-foreground">
                  Click the link in your email to access your portal
                </p>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setMagicLinkSent(false);
                    setEmail("");
                  }}
                  className="mt-4"
                >
                  Try different email
                </Button>
              </div>
            ) : (
              <form onSubmit={handleMagicLink} className="space-y-6">
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
                    No password needed - we'll send you a secure link
                  </p>
                </div>
                <Button 
                  type="submit" 
                  className="w-full btn-shine font-bebas text-lg uppercase tracking-wider"
                  disabled={loading}
                >
                  {loading ? "Sending link..." : "Send Magic Link"}
                </Button>
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
