import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";

const ImportProgramCSV = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [playerId] = useState("00dd8ae4-9e84-458b-b1e1-893f6f9f0e96"); // Michael Mulligan
  const [programName, setProgramName] = useState("SPS Phase 1");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("playerId", playerId);
      formData.append("programName", programName);

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-program-csv`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Upload failed");
      }

      toast.success("Program imported successfully!");
      setFile(null);
      
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to import program");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Import Program CSV</h1>
        
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Player: Michael Mulligan
              </label>
              <p className="text-sm text-muted-foreground">
                Player ID: {playerId}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Program Name
              </label>
              <Input
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder="Enter program name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                CSV File
              </label>
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
              />
              {file && (
                <p className="text-sm text-muted-foreground mt-2">
                  Selected: {file.name}
                </p>
              )}
            </div>

            <Button
              onClick={handleUpload}
              disabled={!file || loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Program
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ImportProgramCSV;
