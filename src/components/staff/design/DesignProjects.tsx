import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, LayoutGrid, Pencil, Trash2, Copy, FolderPlus, Folder, FolderOpen, MoreHorizontal, ChevronRight, LayoutList } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
  folderId?: string;
}

interface DesignFolder {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

const FOLDER_COLOURS = [
  'hsl(var(--primary))',
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899',
];

export function DesignProjects() {
  const [projects, setProjects] = useState<ProjectCard[]>(() => {
    const saved = localStorage.getItem('design_projects');
    return saved ? JSON.parse(saved) : [];
  });
  const [folders, setFolders] = useState<DesignFolder[]>(() => {
    const saved = localStorage.getItem('design_folders');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newName, setNewName] = useState('Untitled Design');
  const [newPreset, setNewPreset] = useState('Instagram Post');
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColour, setNewFolderColour] = useState(FOLDER_COLOURS[0]);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const saveProjects = (updated: ProjectCard[]) => {
    setProjects(updated);
    localStorage.setItem('design_projects', JSON.stringify(updated));
  };

  const saveFolders = (updated: DesignFolder[]) => {
    setFolders(updated);
    localStorage.setItem('design_folders', JSON.stringify(updated));
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
      folderId: activeFolderId ?? undefined,
    };
    saveProjects([project, ...projects]);
    setActiveProjectId(project.id);
    setShowNewDialog(false);
    setNewName('Untitled Design');
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const folder: DesignFolder = {
      id: generateId(),
      name: newFolderName.trim(),
      color: newFolderColour,
      createdAt: new Date().toISOString(),
    };
    saveFolders([...folders, folder]);
    setShowNewFolder(false);
    setNewFolderName('');
  };

  const handleDeleteFolder = (id: string) => {
    saveFolders(folders.filter(f => f.id !== id));
    // Move projects to root
    saveProjects(projects.map(p => p.folderId === id ? { ...p, folderId: undefined } : p));
    if (activeFolderId === id) setActiveFolderId(null);
  };

  const handleRenameFolder = (id: string, name: string) => {
    saveFolders(folders.map(f => f.id === id ? { ...f, name } : f));
    setEditingFolderId(null);
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

  const handleMoveToFolder = (projectId: string, folderId: string | null) => {
    saveProjects(projects.map(p => p.id === projectId ? { ...p, folderId: folderId ?? undefined } : p));
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

  const filtered = useMemo(() => {
    let result = projects;
    if (searchQuery) {
      result = result.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    } else if (activeFolderId) {
      result = result.filter(p => p.folderId === activeFolderId);
    } else {
      result = result.filter(p => !p.folderId);
    }
    return result;
  }, [projects, searchQuery, activeFolderId]);

  const activeFolder = folders.find(f => f.id === activeFolderId);

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach(p => { if (p.folderId) counts[p.folderId] = (counts[p.folderId] || 0) + 1; });
    return counts;
  }, [projects]);

  const rootCount = projects.filter(p => !p.folderId).length;

  if (activeProject) {
    return (
      <DesignStudio
        initialProject={{ ...activeProject, backgroundImage: undefined }}
        onBack={() => setActiveProjectId(null)}
        onSave={handleSaveFromStudio}
      />
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-background rounded-lg border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <LayoutGrid className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Design Studio</h2>
          <span className="text-xs text-muted-foreground">{projects.length} designs</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search designs..."
              className="h-8 w-52 pl-8 text-xs"
            />
          </div>
          <div className="flex items-center border rounded-md">
            <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8 rounded-r-none" onClick={() => setViewMode('grid')}>
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8 rounded-l-none" onClick={() => setViewMode('list')}>
              <LayoutList className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setShowNewFolder(true)}>
            <FolderPlus className="h-3.5 w-3.5" /> Folder
          </Button>
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setShowNewDialog(true)}>
            <Plus className="h-3.5 w-3.5" /> New Design
          </Button>
        </div>
      </div>

      {/* New folder dialog */}
      {showNewFolder && (
        <div className="px-6 py-3 border-b bg-muted/10">
          <div className="flex items-end gap-3 max-w-lg">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">Folder name</label>
              <Input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} className="h-8 text-xs" autoFocus onKeyDown={e => e.key === 'Enter' && handleCreateFolder()} />
            </div>
            <div className="flex gap-1 items-center">
              {FOLDER_COLOURS.map(c => (
                <button key={c} className={`w-5 h-5 rounded-full border-2 transition-all ${newFolderColour === c ? 'border-foreground scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} onClick={() => setNewFolderColour(c)} />
              ))}
            </div>
            <Button size="sm" className="h-8" onClick={handleCreateFolder}>Create</Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowNewFolder(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* New project dialog */}
      {showNewDialog && (
        <div className="px-6 py-3 border-b bg-muted/10">
          <div className="flex items-end gap-3 max-w-lg">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">Name</label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} className="h-8 text-xs" autoFocus onKeyDown={e => e.key === 'Enter' && handleCreate()} />
            </div>
            <div className="w-44 space-y-1">
              <label className="text-xs text-muted-foreground">Size</label>
              <Select value={newPreset} onValueChange={setNewPreset}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CANVAS_PRESETS.map(p => (
                    <SelectItem key={p.name} value={p.name}>{p.name} ({p.width}×{p.height})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" className="h-8" onClick={handleCreate}>Create</Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowNewDialog(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      {activeFolderId && !searchQuery && (
        <div className="px-6 py-2 border-b flex items-center gap-1.5 text-xs">
          <button className="text-muted-foreground hover:text-foreground transition-colors" onClick={() => setActiveFolderId(null)}>All Designs</button>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium" style={{ color: activeFolder?.color }}>{activeFolder?.name}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {/* Folder grid */}
        {!activeFolderId && !searchQuery && folders.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Folders</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {folders.map(folder => (
                <div
                  key={folder.id}
                  className="group relative border rounded-lg p-3 hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer bg-card"
                  onClick={() => setActiveFolderId(folder.id)}
                >
                  <div className="flex items-start gap-2.5">
                    <FolderOpen className="h-8 w-8 flex-shrink-0 mt-0.5" style={{ color: folder.color }} />
                    <div className="min-w-0 flex-1">
                      {editingFolderId === folder.id ? (
                        <Input
                          defaultValue={folder.name}
                          className="h-6 text-xs p-1"
                          autoFocus
                          onClick={e => e.stopPropagation()}
                          onBlur={e => handleRenameFolder(folder.id, e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleRenameFolder(folder.id, (e.target as HTMLInputElement).value); }}
                        />
                      ) : (
                        <p className="text-sm font-medium truncate">{folder.name}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">{folderCounts[folder.id] || 0} designs</p>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => e.stopPropagation()}>
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-xs">
                        <DropdownMenuItem onClick={e => { e.stopPropagation(); setEditingFolderId(folder.id); }}>Rename</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={e => { e.stopPropagation(); handleDeleteFolder(folder.id); }}>Delete folder</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Show "Unsorted" label when at root with folders */}
        {!activeFolderId && !searchQuery && folders.length > 0 && rootCount > 0 && (
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Unsorted</h3>
        )}

        {/* Project grid / list */}
        {filtered.length === 0 && !searchQuery && !activeFolderId && folders.length === 0 ? (
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
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Folder className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{searchQuery ? 'No matching designs' : 'This folder is empty'}</p>
            <Button size="sm" className="gap-1.5" onClick={() => setShowNewDialog(true)}>
              <Plus className="h-3.5 w-3.5" /> New Design
            </Button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map(project => (
              <ProjectGridCard
                key={project.id}
                project={project}
                folders={folders}
                onOpen={() => setActiveProjectId(project.id)}
                onDuplicate={() => handleDuplicate(project.id)}
                onDelete={() => handleDelete(project.id)}
                onMoveToFolder={(fId) => handleMoveToFolder(project.id, fId)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map(project => (
              <ProjectListRow
                key={project.id}
                project={project}
                folders={folders}
                onOpen={() => setActiveProjectId(project.id)}
                onDuplicate={() => handleDuplicate(project.id)}
                onDelete={() => handleDelete(project.id)}
                onMoveToFolder={(fId) => handleMoveToFolder(project.id, fId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectGridCard({ project, folders, onOpen, onDuplicate, onDelete, onMoveToFolder }: {
  project: ProjectCard; folders: DesignFolder[]; onOpen: () => void; onDuplicate: () => void; onDelete: () => void; onMoveToFolder: (id: string | null) => void;
}) {
  return (
    <div className="group relative border rounded-lg overflow-hidden hover:border-primary/50 hover:shadow-md transition-all cursor-pointer bg-card" onClick={onOpen}>
      <div className="aspect-square flex items-center justify-center" style={{ backgroundColor: project.background }}>
        <div className="text-xs text-muted-foreground/50 font-medium">{project.width} × {project.height}</div>
      </div>
      <div className="p-3 border-t">
        <p className="text-sm font-medium truncate">{project.name}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {new Date(project.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="h-7 w-7 shadow-sm" onClick={e => e.stopPropagation()}>
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs">
            <DropdownMenuItem onClick={e => { e.stopPropagation(); onOpen(); }}>
              <Pencil className="h-3 w-3 mr-1.5" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={e => { e.stopPropagation(); onDuplicate(); }}>
              <Copy className="h-3 w-3 mr-1.5" /> Duplicate
            </DropdownMenuItem>
            {folders.length > 0 && (
              <>
                <div className="h-px bg-border my-1" />
                {folders.map(f => (
                  <DropdownMenuItem key={f.id} onClick={e => { e.stopPropagation(); onMoveToFolder(f.id); }}>
                    <Folder className="h-3 w-3 mr-1.5" style={{ color: f.color }} /> Move to {f.name}
                  </DropdownMenuItem>
                ))}
                {project.folderId && (
                  <DropdownMenuItem onClick={e => { e.stopPropagation(); onMoveToFolder(null); }}>
                    <Folder className="h-3 w-3 mr-1.5" /> Remove from folder
                  </DropdownMenuItem>
                )}
              </>
            )}
            <div className="h-px bg-border my-1" />
            <DropdownMenuItem className="text-destructive" onClick={e => { e.stopPropagation(); onDelete(); }}>
              <Trash2 className="h-3 w-3 mr-1.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function ProjectListRow({ project, folders, onOpen, onDuplicate, onDelete, onMoveToFolder }: {
  project: ProjectCard; folders: DesignFolder[]; onOpen: () => void; onDuplicate: () => void; onDelete: () => void; onMoveToFolder: (id: string | null) => void;
}) {
  const folder = folders.find(f => f.id === project.folderId);
  return (
    <div className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors" onClick={onOpen}>
      <div className="w-10 h-10 rounded border flex-shrink-0 flex items-center justify-center text-[8px] text-muted-foreground/50" style={{ backgroundColor: project.background }}>
        {project.width}×{project.height}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{project.name}</p>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>{new Date(project.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
          {folder && <span className="px-1.5 py-0.5 rounded-full text-[9px]" style={{ backgroundColor: folder.color + '20', color: folder.color }}>{folder.name}</span>}
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); onDuplicate(); }}><Copy className="h-3 w-3" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); onDelete(); }}><Trash2 className="h-3 w-3" /></Button>
      </div>
    </div>
  );
}
