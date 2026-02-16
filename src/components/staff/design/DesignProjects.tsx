import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, LayoutGrid, Pencil, Trash2, Copy } from 'lucide-react';
import { DesignStudio } from './DesignStudio';
import { CANVAS_PRESETS } from './types';
import type { DesignProject } from './types';

const generateId = () => Math.random().toString(36).slice(2, 11);

interface ProjectCard {
  id: string;
  name: string;
  width: number;
  height: number;
  background: string;
  elements: any[];
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
}

export function DesignProjects() {
  const [projects, setProjects] = useState<ProjectCard[]>(() => {
    const saved = localStorage.getItem('design_projects');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newName, setNewName] = useState('Untitled Design');
  const [newPreset, setNewPreset] = useState('Instagram Post');

  const saveProjects = (updated: ProjectCard[]) => {
    setProjects(updated);
    localStorage.setItem('design_projects', JSON.stringify(updated));
  };

  const handleCreate = () => {
    const preset = CANVAS_PRESETS.find(p => p.name === newPreset);
    const project: ProjectCard = {
      id: generateId(),
      name: newName || 'Untitled Design',
      width: preset?.width ?? 1080,
      height: preset?.height ?? 1080,
      background: '#ffffff',
      elements: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveProjects([project, ...projects]);
    setActiveProjectId(project.id);
    setShowNewDialog(false);
    setNewName('Untitled Design');
  };

  const handleDuplicate = (id: string) => {
    const original = projects.find(p => p.id === id);
    if (!original) return;
    const dup: ProjectCard = {
      ...JSON.parse(JSON.stringify(original)),
      id: generateId(),
      name: `${original.name} (copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveProjects([dup, ...projects]);
  };

  const handleDelete = (id: string) => {
    saveProjects(projects.filter(p => p.id !== id));
  };

  const handleSaveFromStudio = (project: DesignProject) => {
    const updated = projects.map(p =>
      p.id === project.id
        ? { ...p, name: project.name, width: project.width, height: project.height, background: project.background, elements: project.elements, updatedAt: new Date().toISOString() }
        : p
    );
    saveProjects(updated);
  };

  const activeProject = projects.find(p => p.id === activeProjectId);

  if (activeProject) {
    return (
      <DesignStudio
        initialProject={{
          ...activeProject,
          backgroundImage: undefined,
        }}
        onBack={() => setActiveProjectId(null)}
        onSave={handleSaveFromStudio}
      />
    );
  }

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-background rounded-lg border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <LayoutGrid className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Design Studio</h2>
          <span className="text-xs text-muted-foreground">{projects.length} designs</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search designs..."
              className="h-8 w-52 pl-8 text-xs"
            />
          </div>
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setShowNewDialog(true)}>
            <Plus className="h-3.5 w-3.5" /> New Design
          </Button>
        </div>
      </div>

      {/* New project dialog */}
      {showNewDialog && (
        <div className="px-6 py-4 border-b bg-muted/10">
          <div className="flex items-end gap-3 max-w-lg">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">Name</label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="h-8 text-xs"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="w-44 space-y-1">
              <label className="text-xs text-muted-foreground">Size</label>
              <Select value={newPreset} onValueChange={setNewPreset}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CANVAS_PRESETS.map(p => (
                    <SelectItem key={p.name} value={p.name}>
                      {p.name} ({p.width}×{p.height})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" className="h-8" onClick={handleCreate}>Create</Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowNewDialog(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Project grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <LayoutGrid className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No designs yet</p>
              <p className="text-sm text-muted-foreground mt-1">Create your first design to get started</p>
            </div>
            <Button size="sm" className="gap-1.5" onClick={() => setShowNewDialog(true)}>
              <Plus className="h-3.5 w-3.5" /> New Design
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map(project => (
              <div
                key={project.id}
                className="group relative border rounded-lg overflow-hidden hover:border-primary/50 hover:shadow-md transition-all cursor-pointer bg-card"
                onClick={() => setActiveProjectId(project.id)}
              >
                {/* Thumbnail */}
                <div
                  className="aspect-square flex items-center justify-center"
                  style={{ backgroundColor: project.background }}
                >
                  <div className="text-xs text-muted-foreground/50 font-medium">
                    {project.width} × {project.height}
                  </div>
                </div>

                {/* Info */}
                <div className="p-3 border-t">
                  <p className="text-sm font-medium truncate">{project.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(project.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>

                {/* Hover actions */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-7 w-7 shadow-sm"
                    onClick={e => { e.stopPropagation(); setActiveProjectId(project.id); }}
                    title="Edit"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-7 w-7 shadow-sm"
                    onClick={e => { e.stopPropagation(); handleDuplicate(project.id); }}
                    title="Duplicate"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-7 w-7 shadow-sm"
                    onClick={e => { e.stopPropagation(); handleDelete(project.id); }}
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
