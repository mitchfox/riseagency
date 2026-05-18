import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const TOKEN_KEY = "investor_token";
const USER_KEY = "investor_user";

export interface InvestorUser {
  id: string;
  username: string;
  display_name: string;
}

export function useInvestorSession() {
  const [user, setUser] = useState<InvestorUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    const u = localStorage.getItem(USER_KEY);
    if (t && u) {
      try { setUser(JSON.parse(u)); setToken(t); } catch { /* noop */ }
    }
    setLoading(false);
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const { data, error } = await supabase.functions.invoke("investor-login", {
      body: { username, password },
    });
    if (error) throw new Error(error.message || "Login failed");
    if ((data as any)?.error) throw new Error((data as any).error);
    const d = data as any;
    localStorage.setItem(TOKEN_KEY, d.token);
    localStorage.setItem(USER_KEY, JSON.stringify(d.user));
    setToken(d.token);
    setUser(d.user);
    return d.user as InvestorUser;
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setToken(null);
  }, []);

  return { user, token, loading, signIn, signOut };
}