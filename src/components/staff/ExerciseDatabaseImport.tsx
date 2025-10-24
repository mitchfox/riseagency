import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload } from "lucide-react";

export const ExerciseDatabaseImport = () => {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a CSV file');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-exercises`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import exercises');
      }

      const result = await response.json();
      toast.success(
        `Successfully imported ${result.imported} exercises! (${result.skipped} duplicates skipped)`
      );
      setFile(null);
    } catch (error: any) {
      console.error('Error importing exercises:', error);
      toast.error(`Failed to import: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Exercise Database</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="exercise-csv">Upload CSV File</Label>
          <p className="text-xs text-muted-foreground">
            Upload a CSV file with exercise data. Existing exercises will be skipped automatically.
          </p>
          <Input
            id="exercise-csv"
            type="file"
            accept=".csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setFile(file);
              }
            }}
            disabled={uploading}
          />
          {file && (
            <p className="text-sm text-muted-foreground">
              Selected: {file.name}
            </p>
          )}
        </div>

        <Button onClick={handleImport} disabled={uploading || !file} className="w-full">
          <Upload className="w-4 h-4 mr-2" />
          {uploading ? 'Importing...' : 'Import Exercises'}
        </Button>
      </CardContent>
    </Card>
  );
};
