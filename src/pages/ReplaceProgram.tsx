import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ReplaceProgram = () => {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const replaceProgram = async () => {
    setLoading(true);
    try {
      // Fetch CSV
      const response = await fetch("/tyrese-program.csv");
      const csvContent = await response.text();

      // Call edge function
      const { data, error } = await supabase.functions.invoke("replace-program", {
        body: {
          programId: "7630aaf2-a106-4b47-bb1d-daa0e6967315",
          csvContent,
          playerId: "b94fd8f6-ad14-4ad0-ba0b-6cace592ee8e"
        }
      });

      if (error) throw error;

      toast.success("Program replaced successfully!");
      setDone(true);
    } catch (error) {
      console.error(error);
      toast.error("Failed to replace program");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-run on mount
    replaceProgram();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bebas">Program Replacement</h1>
        {loading && <p>Replacing Tyrese's November program...</p>}
        {done && (
          <div className="space-y-2">
            <p className="text-green-600">✓ Done!</p>
            <Button onClick={() => window.location.href = "/staff"}>
              Go to Staff Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReplaceProgram;
