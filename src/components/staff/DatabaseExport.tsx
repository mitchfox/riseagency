import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Loader2, Database, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";

interface ExportCategory {
  id: string;
  label: string;
  tables: { name: string; displayName: string }[];
}

const EXPORT_CATEGORIES: ExportCategory[] = [
  {
    id: "players",
    label: "Players",
    tables: [
      { name: "players", displayName: "Players" },
      { name: "player_analysis", displayName: "Player Analysis" },
      { name: "player_programs", displayName: "Player Programs" },
    ],
  },
  {
    id: "coaching",
    label: "Coaching",
    tables: [
      { name: "coaching_drills", displayName: "Drills" },
      { name: "coaching_sessions", displayName: "Sessions" },
      { name: "coaching_exercises", displayName: "Exercises" },
      { name: "coaching_programmes", displayName: "Programmes" },
    ],
  },
  {
    id: "financial",
    label: "Financial",
    tables: [
      { name: "invoices", displayName: "Invoices" },
      { name: "expenses", displayName: "Expenses" },
      { name: "payments", displayName: "Payments" },
      { name: "tax_records", displayName: "Tax Records" },
    ],
  },
  {
    id: "scouting",
    label: "Scouting",
    tables: [
      { name: "scouting_reports", displayName: "Scouting Reports" },
      { name: "prospects", displayName: "Prospects" },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    tables: [
      { name: "marketing_campaigns", displayName: "Campaigns" },
      { name: "blog_posts", displayName: "Blog Posts" },
    ],
  },
  {
    id: "legal",
    label: "Legal",
    tables: [
      { name: "legal_documents", displayName: "Legal Documents" },
    ],
  },
  {
    id: "network",
    label: "Network",
    tables: [
      { name: "club_network_contacts", displayName: "Club Network" },
    ],
  },
];

function jsonToCsv(data: any[]): string {
  if (data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return "";
      const str = typeof val === "object" ? JSON.stringify(val) : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    }).join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

export const DatabaseExport = () => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedCategories(EXPORT_CATEGORIES.map(c => c.id));
  };

  const handleExport = async () => {
    const categoriesToExport = selectedCategories.length > 0
      ? EXPORT_CATEGORIES.filter(c => selectedCategories.includes(c.id))
      : EXPORT_CATEGORIES;

    const allTables = categoriesToExport.flatMap(c => c.tables);
    if (allTables.length === 0) return;

    setExporting(true);
    setProgress(0);

    const zip = new JSZip();
    let completed = 0;

    for (const table of allTables) {
      try {
        const { data, error } = await supabase
          .from(table.name as any)
          .select("*")
          .limit(10000);

        if (!error && data && data.length > 0) {
          const csv = jsonToCsv(data);
          zip.file(`${table.displayName}.csv`, csv);
        }
      } catch (err) {
        console.error(`Error exporting ${table.name}:`, err);
      }
      completed++;
      setProgress(Math.round((completed / allTables.length) * 100));
    }

    try {
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rise-data-export-${new Date().toISOString().split("T")[0]}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export complete", { description: `${allTables.length} tables exported` });
    } catch (err) {
      toast.error("Export failed");
    }

    setExporting(false);
    setProgress(0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bebas mb-2">DATA EXPORT</h2>
        <p className="text-muted-foreground">Export database content as CSV files in a ZIP archive</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Select Categories
          </CardTitle>
          <CardDescription>Choose which data to export, or leave all unchecked to export everything</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <Button variant="ghost" size="sm" onClick={selectAll}>Select All</Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedCategories([])}>Clear</Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {EXPORT_CATEGORIES.map(cat => (
              <div
                key={cat.id}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedCategories.includes(cat.id) ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'
                }`}
                onClick={() => toggleCategory(cat.id)}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedCategories.includes(cat.id)}
                    onCheckedChange={() => toggleCategory(cat.id)}
                  />
                  <div>
                    <p className="font-medium text-sm">{cat.label}</p>
                    <p className="text-xs text-muted-foreground">{cat.tables.length} table{cat.tables.length > 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {exporting && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Exporting data...</span>
            <span className="font-mono font-bold">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      <div className="flex gap-3">
        <Button onClick={() => { setSelectedCategories([]); handleExport(); }} disabled={exporting} className="flex-1" size="lg" variant="outline">
          {exporting && selectedCategories.length === 0 ? (
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          ) : (
            <Download className="h-5 w-5 mr-2" />
          )}
          Export All Data
        </Button>
        <Button onClick={handleExport} disabled={exporting || selectedCategories.length === 0} className="flex-1" size="lg">
          {exporting && selectedCategories.length > 0 ? (
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          ) : (
            <Download className="h-5 w-5 mr-2" />
          )}
          {exporting ? "Exporting..." : `Export ${selectedCategories.length || 'Selected'} Categories`}
        </Button>
      </div>
    </div>
  );
};
