import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const next = searchParams.get("next") || "/staff";
      
      try {
        // Check for error in URL hash (Supabase puts tokens/errors in hash)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const errorDescription = hashParams.get("error_description");
        
        if (errorDescription) {
          setError(errorDescription);
          return;
        }

        // Check for access_token in hash (recovery flow puts it here)
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const type = hashParams.get("type");

        if (accessToken && refreshToken) {
          // Set the session with the tokens from the URL
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error("Session error:", sessionError);
            setError(sessionError.message);
            return;
          }

          // Successfully set session, redirect
          navigate(next);
          return;
        }

        // Check for code in query params (PKCE flow)
        const code = searchParams.get("code");
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error("Code exchange error:", exchangeError);
            setError(exchangeError.message);
            return;
          }
          navigate(next);
          return;
        }

        // No tokens found, check if there's an existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate(next);
          return;
        }

        // No valid auth data found
        setError("No authentication data found. The link may have expired.");
      } catch (err: any) {
        console.error("Auth callback error:", err);
        setError(err.message || "Authentication failed");
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <div className="text-destructive text-lg font-medium mb-2">Authentication Error</div>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={() => navigate("/staff")}
            className="text-primary hover:underline"
          >
            Return to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-muted-foreground">Processing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
