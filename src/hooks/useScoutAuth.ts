import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Scout {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  country: string | null;
  regions: string[] | null;
  commission_rate: number | null;
  status: string;
  total_submissions: number;
  successful_signings: number;
  profile_image_url: string | null;
  notes: string | null;
}

export const useScoutAuth = () => {
  const navigate = useNavigate();
  const [scout, setScout] = useState<Scout | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const scoutEmail = localStorage.getItem("scout_email") || sessionStorage.getItem("scout_email");
      
      if (!scoutEmail) {
        navigate("/login");
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("scouts")
          .select("*")
          .ilike("email", scoutEmail.toLowerCase().trim())
          .maybeSingle();

        if (error || !data) {
          localStorage.removeItem("scout_email");
          sessionStorage.removeItem("scout_email");
          navigate("/login");
          return;
        }

        setScout(data);
      } catch (error) {
        console.error("Auth check error:", error);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const signOut = () => {
    localStorage.removeItem("scout_email");
    sessionStorage.removeItem("scout_email");
    localStorage.removeItem("scout_saved_email");
    localStorage.removeItem("scout_remember_me");
    localStorage.removeItem("scout_login_timestamp");
    setScout(null);
    navigate("/staff");
  };

  return { scout, loading, signOut };
};
