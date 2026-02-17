import { useState } from "react";
import { Plus, Film, Trash2, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AnnotationEditor } from "./AnnotationEditor";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// ── Types ──

export interface ElementKeyframe {
  time: number;    // seconds into the klip
  x: number;
  y: number;
  opacity?: number;
  scale?: number;
}

export interface AnnotationElement {
  id: string;
  type: 'line' | 'arrow' | 'curved-arrow' | 'curve' | 'rect' | 'circle' | 'spotlight' | 'text' | 'freehand'
    | 'player-marker' | 'vision-cone' | 'distance' | 'magnifier' | 'linked-line'
    | 'semi-circle' | 'point' | 'space-oval' | 'image-layer';
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  width?: number;
  height?: number;
  radius?: number;
  color: string;
  strokeWidth: number;
  text?: string;
  fontSize?: number;
  opacity?: number;
  fillOpacity?: number;
  points?: { x: number; y: number }[];
  number?: number;
  angle?: number;
  coneLength?: number;
  coneSpread?: number;
  linkedTo?: string;
  zoomLevel?: number;
  /** Dash pattern for lines/arrows: 'solid' | 'dashed' | 'dotted' | 'dash-dot' */
  dashPattern?: 'solid' | 'dashed' | 'dotted' | 'dash-dot';
  /** Curve control point offset for curved-arrow (percentage units) */
  curveOffset?: number;
  /** For image-layer: z-index override to keep above other annotations */
  layerZIndex?: number;

  // ── Timeline event properties ──
  // When this element first appears (seconds from klip start)
  appearAt: number;
  // How long it stays visible (seconds). undefined = until end of klip
  duration?: number;
  // Animation in/out duration (seconds)
  animateIn?: number;
  animateOut?: number;
  // Keyframes for motion tracking or scripted movement
  keyframes?: ElementKeyframe[];
  // Whether this is a tracking event (follows object automatically)
  isTrackingEvent?: boolean;
  // Freeze-frame: hold the video at this point for the annotation duration
  holdFrame?: boolean;
}

export interface Klip {
  id: string;
  name: string;
  startTime: number;  // video timecode start
  endTime: number;     // video timecode end
  elements: AnnotationElement[];
  color: string;
}

export interface AnnotationProject {
  id: string;
  name: string;
  videoUrl: string;
  videoName: string;
  createdAt: string;
  klips: Klip[];
}

// ── Projects Dashboard ──

export const AnnotationProjects = () => {
  const [projects, setProjects] = useState<AnnotationProject[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('annotation_projects_v3') || '[]');
    } catch { return []; }
  });
  const [activeProject, setActiveProject] = useState<AnnotationProject | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const saveProjects = (updated: AnnotationProject[]) => {
    setProjects(updated);
    localStorage.setItem('annotation_projects_v3', JSON.stringify(updated));
  };

  const [uploading, setUploading] = useState(false);

  const handleNewProject = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setUploading(true);
      const projectId = crypto.randomUUID();
      const ext = file.name.split('.').pop() || 'mp4';
      const storagePath = `${projectId}.${ext}`;

      const { error } = await supabase.storage
        .from('annotation-videos')
        .upload(storagePath, file, { upsert: true });

      if (error) {
        toast.error('Failed to upload video: ' + error.message);
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('annotation-videos')
        .getPublicUrl(storagePath);

      const project: AnnotationProject = {
        id: projectId,
        name: file.name.replace(/\.[^.]+$/, ''),
        videoUrl: urlData.publicUrl,
        videoName: file.name,
        createdAt: new Date().toISOString(),
        klips: [],
      };
      setActiveProject(project);
      saveProjects([project, ...projects]);
      setUploading(false);
    };
    input.click();
  };

  const handleDelete = (id: string) => {
    saveProjects(projects.filter(p => p.id !== id));
    toast.success("Project deleted");
  };

  const handleDuplicate = (project: AnnotationProject) => {
    const dup: AnnotationProject = {
      ...project,
      id: crypto.randomUUID(),
      name: `${project.name} (copy)`,
      createdAt: new Date().toISOString(),
    };
    saveProjects([dup, ...projects]);
    toast.success("Project duplicated");
  };

  const handleRename = (id: string) => {
    saveProjects(projects.map(p => p.id === id ? { ...p, name: renameValue } : p));
    setRenaming(null);
  };

  const handleSave = (project: AnnotationProject) => {
    const updated = projects.map(p => p.id === project.id ? project : p);
    saveProjects(updated);
    setActiveProject(project);
  };

  if (activeProject) {
    return (
      <AnnotationEditor
        project={activeProject}
        onSave={handleSave}
        onBack={() => setActiveProject(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Annotations</h2>
        <p className="text-muted-foreground text-sm">Draw tactical annotations on video clips with timeline events and motion tracking</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card
          className="flex flex-col items-center justify-center p-8 cursor-pointer hover:border-primary/50 transition-colors border-dashed border-2 min-h-[180px]"
          onClick={uploading ? undefined : handleNewProject}
        >
          <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            {uploading ? <Loader2 className="w-8 h-8 text-primary animate-spin" /> : <Plus className="w-8 h-8 text-primary" />}
          </div>
          <span className="font-semibold">{uploading ? 'Uploading...' : 'New Project'}</span>
          <span className="text-xs text-muted-foreground mt-1">{uploading ? 'Saving video to cloud storage' : 'Upload a video to annotate'}</span>
        </Card>
      </div>

      {projects.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Recent Projects</h3>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Video</th>
                  <th className="text-left p-3 font-medium">Annotations</th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(project => (
                  <tr
                    key={project.id}
                    className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                    onClick={() => setActiveProject(project)}
                  >
                    <td className="p-3">
                      {renaming === project.id ? (
                        <Input
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onBlur={() => handleRename(project.id)}
                          onKeyDown={e => e.key === 'Enter' && handleRename(project.id)}
                          className="h-7 text-sm"
                          autoFocus
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <span
                          className="flex items-center gap-2"
                          onDoubleClick={(e) => { e.stopPropagation(); setRenaming(project.id); setRenameValue(project.name); }}
                        >
                          <Film className="w-4 h-4 text-muted-foreground shrink-0" />
                          {project.name}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">{project.videoName}</td>
                    <td className="p-3 text-muted-foreground">{project.klips.reduce((sum, k) => sum + k.elements.length, 0)}</td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(project.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td className="p-3 text-right space-x-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); handleDuplicate(project); }}>
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
