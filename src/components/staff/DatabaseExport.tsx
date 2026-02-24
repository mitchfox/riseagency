import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Loader2, Database, Image, FileDown } from "lucide-react";
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

interface SiteAsset {
  id: string;
  label: string;
  description: string;
  type: 'image' | 'asset';
  path: string;
}

const SITE_ASSETS: SiteAsset[] = [
  { id: "logo", label: "Rise Logo", description: "Main logo used across the site", type: "image", path: "/src/assets/logo.png" },
  { id: "logo-full", label: "Rise Logo (Full)", description: "Full version of the Rise logo", type: "image", path: "/src/assets/rise-logo-full.png" },
  { id: "rise-star", label: "Rise Star Icon", description: "Star icon used for branding", type: "image", path: "/src/assets/rise-star.png" },
  { id: "rise-star-icon", label: "Rise Star (Small)", description: "Small star icon", type: "image", path: "/src/assets/rise-star-icon.png" },
  { id: "banner-hero", label: "Hero Banner", description: "Homepage hero banner image", type: "image", path: "/src/assets/banner-hero-new.jpg" },
  { id: "banner-team", label: "Team Banner", description: "Team hero banner image", type: "image", path: "/src/assets/banner-hero-team.jpg" },
  { id: "black-marble", label: "Black Marble Background", description: "Dark marble texture used as background", type: "image", path: "/src/assets/black-marble-bg.png" },
  { id: "black-marble-menu", label: "Black Marble Menu", description: "Menu background texture", type: "image", path: "/src/assets/black-marble-menu.png" },
  { id: "white-marble", label: "White Marble", description: "Light marble texture", type: "image", path: "/src/assets/white-marble.png" },
  { id: "marble-texture", label: "Marble Texture", description: "General marble texture", type: "image", path: "/src/assets/marble-texture.png" },
  { id: "working-together", label: "Working Together", description: "Collaboration section image", type: "image", path: "/src/assets/working-together.jpg" },
  { id: "clubs-section", label: "Clubs Section", description: "Clubs page section image", type: "image", path: "/src/assets/clubs-section.png" },
  { id: "coaches-section", label: "Coaches Section", description: "Coaches page section image", type: "image", path: "/src/assets/coaches-section.png" },
  { id: "europe-map", label: "Europe Map Animation", description: "Animated Europe outline GIF", type: "asset", path: "/src/assets/europe-outline.gif" },
  { id: "intro-modal", label: "Intro Modal Background", description: "Landing page intro modal background", type: "image", path: "/src/assets/intro-modal-background.png" },
  { id: "scouting-pitch", label: "Scouting Pitch", description: "Scouting pitch background", type: "image", path: "/src/assets/scouting-pitch-bg.jpg" },
  { id: "depth-map", label: "Depth Map", description: "3D depth map for effects", type: "image", path: "/src/assets/depth-map.png" },
];

// Components that can be exported as recordings/captures
interface SiteComponent {
  id: string;
  label: string;
  description: string;
  type: 'component' | 'video';
}

const SITE_COMPONENTS: SiteComponent[] = [
  { id: "page-transition", label: "Page Transition (Shader)", description: "The animated shader transition that plays between page navigations", type: "component" },
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
  const [downloadingAsset, setDownloadingAsset] = useState<string | null>(null);

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

  const handleDownloadAsset = async (asset: SiteAsset) => {
    setDownloadingAsset(asset.id);
    try {
      // Fetch the file from the project
      const response = await fetch(asset.path);
      if (!response.ok) throw new Error("Failed to fetch asset");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = asset.path.split("/").pop() || asset.label;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${asset.label}`);
    } catch (err) {
      toast.error(`Failed to download ${asset.label}`);
    }
    setDownloadingAsset(null);
  };

  const handleRecordTransition = async (componentId: string) => {
    setDownloadingAsset(componentId);
    try {
      toast.info("Recording transition animation...");
      
      const canvas = document.createElement("canvas");
      canvas.width = 1920;
      canvas.height = 1080;
      
      const THREE = await import("three");
      const camera = new THREE.Camera();
      camera.position.z = 1;
      const scene = new THREE.Scene();
      const geometry = new THREE.PlaneGeometry(2, 2);
      const uniforms = {
        time: { type: "f", value: 1.0 },
        resolution: { type: "v2", value: new THREE.Vector2(canvas.width * 2, canvas.height * 2) },
      };
      const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: `void main() { gl_Position = vec4(position, 1.0); }`,
        fragmentShader: `
          precision highp float;
          uniform vec2 resolution;
          uniform float time;
          void main(void) {
            vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
            float t = time*0.05;
            float lineWidth = 0.002;
            vec3 riseGold = vec3(0.792, 0.694, 0.443);
            vec3 white = vec3(1.0, 1.0, 1.0);
            float intensity = 0.0;
            for(int i=0; i < 5; i++){
              intensity += lineWidth*float(i*i) / abs(fract(t + float(i)*0.01)*5.0 - length(uv) + mod(uv.x+uv.y, 0.2));
            }
            float colorMix = sin(uv.x * 3.0 + uv.y * 2.0 + t * 2.0) * 0.5 + 0.5;
            vec3 baseColor = mix(riseGold, white, colorMix * 0.6);
            vec3 color = baseColor * intensity;
            gl_FragColor = vec4(color, 1.0);
          }
        `,
      });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setSize(canvas.width, canvas.height);
      
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `rise-page-transition-${new Date().toISOString().split("T")[0]}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        renderer.dispose();
        geometry.dispose();
        material.dispose();
        toast.success("Transition video downloaded");
        setDownloadingAsset(null);
      };
      
      recorder.start();
      let frame = 0;
      const totalFrames = 75;
      const animate = () => {
        if (frame >= totalFrames) { recorder.stop(); return; }
        uniforms.time.value += 0.05;
        renderer.render(scene, camera);
        frame++;
        requestAnimationFrame(animate);
      };
      animate();
    } catch (err) {
      console.error("Error recording transition:", err);
      toast.error("Failed to record transition");
      setDownloadingAsset(null);
    }
  };

  const handleDownloadAllAssets = async () => {
    setExporting(true);
    setProgress(0);
    const zip = new JSZip();
    let completed = 0;

    for (const asset of SITE_ASSETS) {
      try {
        const response = await fetch(asset.path);
        if (response.ok) {
          const blob = await response.blob();
          const filename = asset.path.split("/").pop() || `${asset.id}.png`;
          zip.file(filename, blob);
        }
      } catch {}
      completed++;
      setProgress(Math.round((completed / SITE_ASSETS.length) * 100));
    }

    try {
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rise-site-assets-${new Date().toISOString().split("T")[0]}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("All assets downloaded");
    } catch {
      toast.error("Download failed");
    }

    setExporting(false);
    setProgress(0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bebas mb-2">DATA EXPORT</h2>
        <p className="text-muted-foreground">Export database content and site assets</p>
      </div>

      <Tabs defaultValue="data" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="data" className="gap-1.5">
            <Database className="h-4 w-4" /> Database Export
          </TabsTrigger>
          <TabsTrigger value="assets" className="gap-1.5">
            <Image className="h-4 w-4" /> Site Content
          </TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="space-y-4 mt-4">
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
        </TabsContent>

        <TabsContent value="assets" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Site Content & Assets
              </CardTitle>
              <CardDescription>Download logos, backgrounds, textures and other site assets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Page Transition / Components Section */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Components & Animations</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SITE_COMPONENTS.map(comp => (
                    <div key={comp.id} className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{comp.label}</p>
                          <p className="text-xs text-muted-foreground">{comp.description}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          disabled={downloadingAsset === comp.id}
                          onClick={() => handleRecordTransition(comp.id)}
                        >
                          {downloadingAsset === comp.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Static Assets Section */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Static Assets</h4>
                <Button onClick={handleDownloadAllAssets} disabled={exporting} variant="outline" className="w-full gap-2 mb-3">
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                  Download All Assets as ZIP
                </Button>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {SITE_ASSETS.map(asset => (
                    <div key={asset.id} className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{asset.label}</p>
                          <p className="text-xs text-muted-foreground">{asset.description}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          disabled={downloadingAsset === asset.id}
                          onClick={() => handleDownloadAsset(asset)}
                        >
                          {downloadingAsset === asset.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {exporting && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Processing...</span>
            <span className="font-mono font-bold">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}
    </div>
  );
};