import { useState, useEffect } from "react";
import { Plus, Film, Trash2, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AnnotationEditor } from "./AnnotationEditor";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
    | 'semi-circle' | 'point' | 'space-oval' | 'image-layer'
    | 'cylinder-spotlight' | 'text-banner';
  /** For text-banner: 'top' or 'bottom' anchoring with margins */
  anchor?: 'top' | 'bottom';
  /** For text-banner: border colour (default Rise Gold) */
  borderColor?: string;
  /** For text-banner: background fill colour (default black) */
  bgColor?: string;
  /** For text-banner: typography style (default 'tight' = Agrandir Tight) */
  fontStyle?: 'tight' | 'normal';
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
  appearAt: number;
  duration?: number;
  animateIn?: number;
  animateOut?: number;
  keyframes?: ElementKeyframe[];
  isTrackingEvent?: boolean;
  holdFrame?: boolean;
}

export interface Klip {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
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

interface AnnotationProjectsProps {
  defaultPlayerId?: string;
}

export const AnnotationProjects = ({ defaultPlayerId }: AnnotationProjectsProps = {}) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<AnnotationProject[]>([]);
  const [activeProject, setActiveProject] = useState<AnnotationProject | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load projects from database on mount
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const load = async () => {
      const [{ data, error }, { data: playerVideos }] = await Promise.all([
        supabase
          .from('annotation_projects')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        defaultPlayerId
          ? supabase
              .from('video_analyses')
              .select('video_url')
              .eq('player_id', defaultPlayerId)
          : Promise.resolve({ data: null, error: null } as any),
      ]);

      if (error) {
        console.error('Failed to load annotation projects:', error);
        toast.error('Failed to load projects');
      } else if (data) {
        const playerVideoUrlSet = new Set((playerVideos || []).map((v: any) => v.video_url));
        const filteredRows = defaultPlayerId
          ? data.filter((row: any) => playerVideoUrlSet.has(row.video_url))
          : data;

        setProjects(filteredRows.map(row => ({
          id: row.id,
          name: row.name,
          videoUrl: row.video_url,
          videoName: row.video_name,
          createdAt: row.created_at,
          klips: (row.klips as unknown as Klip[]) || [],
        })));
      }
      setLoading(false);
    };
    load();
  }, [user, defaultPlayerId]);

  const handleNewProject = () => {
    if (!user) { toast.error('You must be logged in'); return; }
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

      // Save to database
      const { error: dbError } = await supabase
        .from('annotation_projects')
        .insert({
          id: project.id,
          name: project.name,
          video_url: project.videoUrl,
          video_name: project.videoName,
          klips: JSON.parse(JSON.stringify(project.klips)),
          user_id: user.id,
        } as any);

      if (dbError) {
        toast.error('Failed to save project: ' + dbError.message);
        setUploading(false);
        return;
      }

      setActiveProject(project);
      setProjects(prev => [project, ...prev]);
      setUploading(false);
    };
    input.click();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('annotation_projects').delete().eq('id', id);
    setProjects(prev => prev.filter(p => p.id !== id));
    toast.success("Project deleted");
  };

  const handleDuplicate = async (project: AnnotationProject) => {
    if (!user) return;
    const dup: AnnotationProject = {
      ...project,
      id: crypto.randomUUID(),
      name: `${project.name} (copy)`,
      createdAt: new Date().toISOString(),
    };
    await supabase.from('annotation_projects').insert({
      id: dup.id,
      name: dup.name,
      video_url: dup.videoUrl,
      video_name: dup.videoName,
      klips: JSON.parse(JSON.stringify(dup.klips)),
      user_id: user.id,
    } as any);
    setProjects(prev => [dup, ...prev]);
    toast.success("Project duplicated");
  };

  const handleRename = async (id: string) => {
    await supabase.from('annotation_projects').update({ name: renameValue }).eq('id', id);
    setProjects(prev => prev.map(p => p.id === id ? { ...p, name: renameValue } : p));
    setRenaming(null);
  };

  const handleSave = async (project: AnnotationProject) => {
    // Update local state
    setProjects(prev => prev.map(p => p.id === project.id ? project : p));
    setActiveProject(project);

    // Persist to database
    await supabase.from('annotation_projects').update({
      name: project.name,
      video_url: project.videoUrl,
      video_name: project.videoName,
      klips: JSON.parse(JSON.stringify(project.klips)),
    } as any).eq('id', project.id);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
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
