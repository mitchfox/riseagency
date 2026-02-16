import { useState, useCallback, useRef } from 'react';
import type { DesignElement, DesignProject, Tool, SnapLine, ShapeType } from './types';
import { SHAPE_DEFAULTS } from './types';

const generateId = () => Math.random().toString(36).slice(2, 11);

export function useDesignCanvas(initial?: DesignProject) {
  const [project, setProject] = useState<DesignProject>(initial ?? {
    id: generateId(),
    name: 'Untitled Design',
    width: 1080,
    height: 1080,
    background: '#ffffff',
    elements: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [zoom, setZoom] = useState(0.5);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [snapLines, setSnapLines] = useState<SnapLine[]>([]);
  const [clipboard, setClipboard] = useState<DesignElement[]>([]);
  const [history, setHistory] = useState<DesignElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showGrid, setShowGrid] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);

  const pushHistory = useCallback((elements: DesignElement[]) => {
    setHistory(prev => {
      const next = prev.slice(0, historyIndex + 1);
      next.push(JSON.parse(JSON.stringify(elements)));
      return next;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setProject(prev => ({ ...prev, elements: JSON.parse(JSON.stringify(history[newIndex])) }));
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setProject(prev => ({ ...prev, elements: JSON.parse(JSON.stringify(history[newIndex])) }));
    }
  }, [history, historyIndex]);

  const updateElements = useCallback((elements: DesignElement[]) => {
    setProject(prev => ({ ...prev, elements, updatedAt: new Date().toISOString() }));
    pushHistory(elements);
  }, [pushHistory]);

  const addElement = useCallback((element: Partial<DesignElement> & { type: DesignElement['type'] }) => {
    const newEl: DesignElement = {
      id: generateId(),
      x: element.x ?? project.width / 2 - 75,
      y: element.y ?? project.height / 2 - 25,
      width: element.width ?? 150,
      height: element.height ?? 50,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      name: element.name ?? `${element.type} ${project.elements.length + 1}`,
      ...element,
    };
    const newElements = [...project.elements, newEl];
    updateElements(newElements);
    setSelectedIds([newEl.id]);
    setActiveTool('select');
    return newEl;
  }, [project, updateElements]);

  const addText = useCallback(() => {
    addElement({
      type: 'text',
      text: 'Double-click to edit',
      fontSize: 32,
      fontFamily: 'Agrandir Tight',
      fontWeight: '400',
      color: '#000000',
      textAlign: 'center',
      width: 300,
      height: 60,
      name: `Text ${project.elements.length + 1}`,
    });
  }, [addElement, project.elements.length]);

  const addShape = useCallback((shapeType: ShapeType) => {
    const defaults = SHAPE_DEFAULTS[shapeType];
    addElement({
      type: 'shape',
      shapeType,
      width: 150,
      height: 150,
      name: `${shapeType} ${project.elements.length + 1}`,
      ...defaults,
    });
  }, [addElement, project.elements.length]);

  const addImage = useCallback((src: string, name?: string) => {
    addElement({
      type: 'image',
      src,
      width: 300,
      height: 300,
      objectFit: 'cover',
      name: name ?? `Image ${project.elements.length + 1}`,
    });
  }, [addElement, project.elements.length]);

  const addLine = useCallback(() => {
    addElement({
      type: 'line',
      width: 200,
      height: 4,
      fill: '#000000',
      strokeWidth: 2,
      name: `Line ${project.elements.length + 1}`,
    });
  }, [addElement, project.elements.length]);

  const updateElement = useCallback((id: string, updates: Partial<DesignElement>) => {
    const newElements = project.elements.map(el =>
      el.id === id ? { ...el, ...updates } : el
    );
    updateElements(newElements);
  }, [project.elements, updateElements]);

  const deleteSelected = useCallback(() => {
    const newElements = project.elements.filter(el => !selectedIds.includes(el.id));
    updateElements(newElements);
    setSelectedIds([]);
  }, [project.elements, selectedIds, updateElements]);

  const duplicateSelected = useCallback(() => {
    const duplicated = project.elements
      .filter(el => selectedIds.includes(el.id))
      .map(el => ({ ...el, id: generateId(), x: el.x + 20, y: el.y + 20, name: `${el.name} copy` }));
    updateElements([...project.elements, ...duplicated]);
    setSelectedIds(duplicated.map(el => el.id));
  }, [project.elements, selectedIds, updateElements]);

  const copySelected = useCallback(() => {
    const copied = project.elements.filter(el => selectedIds.includes(el.id));
    setClipboard(JSON.parse(JSON.stringify(copied)));
  }, [project.elements, selectedIds]);

  const paste = useCallback(() => {
    if (clipboard.length === 0) return;
    const pasted = clipboard.map(el => ({
      ...el,
      id: generateId(),
      x: el.x + 20,
      y: el.y + 20,
      name: `${el.name} copy`,
    }));
    updateElements([...project.elements, ...pasted]);
    setSelectedIds(pasted.map(el => el.id));
  }, [clipboard, project.elements, updateElements]);

  const moveLayer = useCallback((id: string, direction: 'up' | 'down' | 'top' | 'bottom') => {
    const elements = [...project.elements];
    const idx = elements.findIndex(el => el.id === id);
    if (idx === -1) return;
    const [el] = elements.splice(idx, 1);
    switch (direction) {
      case 'up': elements.splice(Math.min(idx + 1, elements.length), 0, el); break;
      case 'down': elements.splice(Math.max(idx - 1, 0), 0, el); break;
      case 'top': elements.push(el); break;
      case 'bottom': elements.unshift(el); break;
    }
    updateElements(elements);
  }, [project.elements, updateElements]);

  const selectAll = useCallback(() => {
    setSelectedIds(project.elements.map(el => el.id));
  }, [project.elements]);

  const deselectAll = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // Snap calculation
  const calculateSnap = useCallback((el: DesignElement, elements: DesignElement[]) => {
    if (!snapEnabled) return { x: el.x, y: el.y, lines: [] };
    const SNAP_THRESHOLD = 5;
    const lines: SnapLine[] = [];
    let snappedX = el.x;
    let snappedY = el.y;

    const elCenterX = el.x + el.width / 2;
    const elCenterY = el.y + el.height / 2;
    const elRight = el.x + el.width;
    const elBottom = el.y + el.height;

    // Canvas edges
    if (Math.abs(el.x) < SNAP_THRESHOLD) { snappedX = 0; lines.push({ type: 'vertical', position: 0 }); }
    if (Math.abs(el.y) < SNAP_THRESHOLD) { snappedY = 0; lines.push({ type: 'horizontal', position: 0 }); }
    if (Math.abs(elRight - project.width) < SNAP_THRESHOLD) { snappedX = project.width - el.width; lines.push({ type: 'vertical', position: project.width }); }
    if (Math.abs(elBottom - project.height) < SNAP_THRESHOLD) { snappedY = project.height - el.height; lines.push({ type: 'horizontal', position: project.height }); }

    // Canvas center
    const canvasCenterX = project.width / 2;
    const canvasCenterY = project.height / 2;

    if (Math.abs(elCenterX - canvasCenterX) < SNAP_THRESHOLD) {
      snappedX = canvasCenterX - el.width / 2;
      lines.push({ type: 'vertical', position: canvasCenterX });
    }
    if (Math.abs(elCenterY - canvasCenterY) < SNAP_THRESHOLD) {
      snappedY = canvasCenterY - el.height / 2;
      lines.push({ type: 'horizontal', position: canvasCenterY });
    }

    // Snap to other elements
    for (const other of elements) {
      if (other.id === el.id) continue;
      const otherCenterX = other.x + other.width / 2;
      const otherCenterY = other.y + other.height / 2;

      // Vertical snaps
      if (Math.abs(el.x - other.x) < SNAP_THRESHOLD) { snappedX = other.x; lines.push({ type: 'vertical', position: other.x }); }
      if (Math.abs(elRight - (other.x + other.width)) < SNAP_THRESHOLD) { snappedX = other.x + other.width - el.width; lines.push({ type: 'vertical', position: other.x + other.width }); }
      if (Math.abs(elCenterX - otherCenterX) < SNAP_THRESHOLD) { snappedX = otherCenterX - el.width / 2; lines.push({ type: 'vertical', position: otherCenterX }); }

      // Horizontal snaps
      if (Math.abs(el.y - other.y) < SNAP_THRESHOLD) { snappedY = other.y; lines.push({ type: 'horizontal', position: other.y }); }
      if (Math.abs(elBottom - (other.y + other.height)) < SNAP_THRESHOLD) { snappedY = other.y + other.height - el.height; lines.push({ type: 'horizontal', position: other.y + other.height }); }
      if (Math.abs(elCenterY - otherCenterY) < SNAP_THRESHOLD) { snappedY = otherCenterY - el.height / 2; lines.push({ type: 'horizontal', position: otherCenterY }); }
    }

    return { x: snappedX, y: snappedY, lines };
  }, [snapEnabled, project.width, project.height]);

  return {
    project, setProject,
    selectedIds, setSelectedIds,
    activeTool, setActiveTool,
    zoom, setZoom,
    panOffset, setPanOffset,
    snapLines, setSnapLines,
    showGrid, setShowGrid,
    snapEnabled, setSnapEnabled,
    addText, addShape, addImage, addLine,
    updateElement, deleteSelected, duplicateSelected,
    copySelected, paste,
    moveLayer, selectAll, deselectAll,
    undo, redo, historyIndex, historyLength: history.length,
    calculateSnap,
  };
}
