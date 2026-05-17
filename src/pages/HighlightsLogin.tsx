import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Film } from "lucide-react";

const HighlightsLogin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("highlight_maker_saved_username");
    if (saved) setUsername(saved);
    const existing =
      localStorage.getItem("highlight_maker_username") ||
      sessionStorage.getItem("highlight_maker_username");
    if (existing) navigate("/highlights");
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = username.trim();
      const { data, error } = await supabase.functions.invoke(
        "highlight-maker-login-check",
        { body: { username: u } },
      );
      if (error) throw error;
      const maker = (data as any)?.maker;
      if (!maker) {
        toast.error("Invalid username or password");
        return;
      }
      if (maker.status !== "active") {
        toast.error("Account disabled. Contact the agency.");
        return;
      }
      const store = remember ? localStorage : sessionStorage;
      store.setItem("highlight_maker_username", u);
      if (remember) localStorage.setItem("highlight_maker_saved_username", u);
      else localStorage.removeItem("highlight_maker_saved_username");
      toast.success(`Welcome, ${maker.display_name}`);
      navigate("/highlights");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-lg">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mb-3">
            <Film className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Highlights Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to access player clips</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              checked={remember}
              onCheckedChange={(v) => setRemember(v === true)}
            />
            <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
              Remember me
            </Label>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default HighlightsLogin;