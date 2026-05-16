import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export interface HighlightMaker {
  id: string;
  username: string;
  display_name: string;
  status: string;
}

const STORAGE_KEY = "highlight_maker_username";

export const useHighlightMakerAuth = () => {
  const navigate = useNavigate();
  const [maker, setMaker] = useState<HighlightMaker | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      const username =
        localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
      if (!username) {
        navigate("/highlights-login");
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke(
          "highlight-maker-login-check",
          { body: { username } },
        );
        const m = (data as any)?.maker ?? null;
        if (error || !m || m.status !== "active") {
          localStorage.removeItem(STORAGE_KEY);
          sessionStorage.removeItem(STORAGE_KEY);
          navigate("/highlights-login");
          return;
        }
        setMaker(m);
      } catch (e) {
        console.error(e);
        navigate("/highlights-login");
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [navigate]);

  const signOut = () => {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    setMaker(null);
    navigate("/highlights-login");
  };

  return { maker, loading, signOut };
};