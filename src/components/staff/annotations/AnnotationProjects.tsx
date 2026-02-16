import { useState, useEffect } from "react";
import { Plus, FolderOpen, Film, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AnnotationEditor } from "./AnnotationEditor";

export interface AnnotationProject {
  id: string;
  name: string;
  videoUrl: string;
  videoName: string;
  createdAt: string;
  annotations: AnnotationLayer[];
}

export interface AnnotationLayer {
  id: string;
  frameStart: number;
  frameEnd: number;
  elements: AnnotationElement[];
}

export interface AnnotationElement {
  id: string;
  type: 'line' | 'arrow' | 'curve' | 'rect' | 'circle' | 'spotlight' | 'text' | 'freehand' | 'player-marker';
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
  points?: { x: number; y: number }[];
  number?: number;
}

export const AnnotationProjects = () => {
  const [projects, setProjects] = useState<AnnotationProject[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('annotation_projects') || '[]');
    } catch { return []; }
  });
  const [activeProject, setActiveProject] = useState<AnnotationProject | null>(null);

  const saveProjects = (updated: AnnotationProject[]) => {
    setProjects(updated);
    localStorage.setItem('annotation_projects', JSON.stringify(updated));
  };

  const handleNewProject = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const project: AnnotationProject = {
        id: crypto.randomUUID(),
        name: file.name.replace(/\.[^.]+$/, ''),
        videoUrl: url,
        videoName: file.name,
        createdAt: new Date().toISOString(),
        annotations: [],
      };
      setActiveProject(project);
      saveProjects([project, ...projects]);
    };
    input.click();
  };

  const handleDelete = (id: string) => {
    saveProjects(projects.filter(p => p.id !== id));
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Annotations</h2>
          <p className="text-muted-foreground text-sm">Add spotlights, arrows and effects to match videos and clips</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card
          className="flex flex-col items-center justify-center p-8 cursor-pointer hover:border-primary/50 transition-colors border-dashed border-2 min-h-[180px]"
          onClick={handleNewProject}
        >
          <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <Plus className="w-8 h-8 text-primary" />
          </div>
          <span className="font-semibold">New Project</span>
          <span className="text-xs text-muted-foreground mt-1">Upload a video to annotate</span>
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
                    <td className="p-3 flex items-center gap-2">
                      <Film className="w-4 h-4 text-muted-foreground" />
                      {project.name}
                    </td>
                    <td className="p-3 text-muted-foreground">{project.videoName}</td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(project.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }}
                      >
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
