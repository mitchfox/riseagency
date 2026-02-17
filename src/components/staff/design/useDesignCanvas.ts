import { useState, useCallback } from 'react';
import type { DesignElement, DesignProject, DesignPage, Tool, SnapLine, ShapeType } from './types';
import { SHAPE_DEFAULTS } from './types';

const generateId = () => Math.random().toString(36).slice(2, 11);

function createPage(name: string, background = '#ffffff'): DesignPage {
  return { id: generateId(), name, elements: [], background };
}

export function useDesignCanvas(initial?: DesignProject) {
  const [project, setProject] = useState<DesignProject>(() => {
    const p = initial ?? {
      id: generateId(),
      name: 'Untitled Design',
      width: 1080,
      height: 1080,
      background: '#ffffff',
      elements: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    // Migrate: if no pages, create page 1 from existing elements
    if (!p.pages || p.pages.length === 0) {
      p.pages = [{ id: generateId(), name: 'Page 1', elements: p.elements || [], background: p.background }];
    }
    return p;
  });

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [zoom, setZoom] = useState(0.5);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [snapLines, setSnapLines] = useState<SnapLine[]>([]);
  const [clipboard, setClipboard] = useState<DesignElement[]>([]);
  const [history, setHistory] = useState<DesignPage[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showGrid, setShowGrid] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);

  const pages = project.pages || [];
  const currentPage = pages[currentPageIndex] || pages[0];
  // Expose elements from current page, also keep project.elements in sync
  const elements = currentPage?.elements || [];

  const updatePages = useCallback((newPages: DesignPage[]) => {
    setProject(prev => ({
      ...prev,
      pages: newPages,
      elements: newPages[currentPageIndex]?.elements || [],
      updatedAt: new Date().toISOString(),
    }));
    // Push history
    setHistory(prev => {
      const next = prev.slice(0, historyIndex + 1);
      next.push(JSON.parse(JSON.stringify(newPages)));
      return next;
    });
    setHistoryIndex(prev => prev + 1);
  }, [currentPageIndex, historyIndex]);

  const updateCurrentPage = useCallback((updater: (page: DesignPage) => DesignPage) => {
    const newPages = pages.map((p, i) => i === currentPageIndex ? updater(p) : p);
    updatePages(newPages);
  }, [pages, currentPageIndex, updatePages]);

  const updateElements = useCallback((newElements: DesignElement[]) => {
    updateCurrentPage(p => ({ ...p, elements: newElements }));
  }, [updateCurrentPage]);

  // Page management
  const addPage = useCallback(() => {
    const newPage = createPage(`Page ${pages.length + 1}`, project.background);
    const newPages = [...pages, newPage];
    updatePages(newPages);
    setCurrentPageIndex(newPages.length - 1);
    setSelectedIds([]);
  }, [pages, project.background, updatePages]);

  const duplicatePage = useCallback((index: number) => {
    const source = pages[index];
    if (!source) return;
    const newPage: DesignPage = {
      ...JSON.parse(JSON.stringify(source)),
      id: generateId(),
      name: `${source.name} copy`,
      elements: source.elements.map(el => ({ ...el, id: generateId() })),
    };
    const newPages = [...pages];
    newPages.splice(index + 1, 0, newPage);
    updatePages(newPages);
    setCurrentPageIndex(index + 1);
    setSelectedIds([]);
  }, [pages, updatePages]);

  const deletePage = useCallback((index: number) => {
    if (pages.length <= 1) return;
    const newPages = pages.filter((_, i) => i !== index);
    updatePages(newPages);
    setCurrentPageIndex(prev => Math.min(prev, newPages.length - 1));
    setSelectedIds([]);
  }, [pages, updatePages]);

  const switchPage = useCallback((index: number) => {
    if (index < 0 || index >= pages.length) return;
    setCurrentPageIndex(index);
    setSelectedIds([]);
  }, [pages.length]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const restored = JSON.parse(JSON.stringify(history[newIndex]));
      setProject(prev => ({ ...prev, pages: restored, elements: restored[currentPageIndex]?.elements || [] }));
    }
  }, [history, historyIndex, currentPageIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const restored = JSON.parse(JSON.stringify(history[newIndex]));
      setProject(prev => ({ ...prev, pages: restored, elements: restored[currentPageIndex]?.elements || [] }));
    }
  }, [history, historyIndex, currentPageIndex]);

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
      name: element.name ?? `${element.type} ${elements.length + 1}`,
      ...element,
    };
    updateElements([...elements, newEl]);
    setSelectedIds([newEl.id]);
    setActiveTool('select');
    return newEl;
  }, [project, elements, updateElements]);

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
      name: `Text ${elements.length + 1}`,
    });
  }, [addElement, elements.length]);

  const addShape = useCallback((shapeType: ShapeType) => {
    const defaults = SHAPE_DEFAULTS[shapeType];
    addElement({
      type: 'shape',
      shapeType,
      width: 150,
      height: 150,
      name: `${shapeType} ${elements.length + 1}`,
      ...defaults,
    });
  }, [addElement, elements.length]);

  const addImage = useCallback((src: string, name?: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const maxDim = 500;
      const ratio = img.naturalWidth / img.naturalHeight;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > maxDim || h > maxDim) {
        if (ratio > 1) { w = maxDim; h = maxDim / ratio; }
        else { h = maxDim; w = maxDim * ratio; }
      }
      addElement({
        type: 'image',
        src,
        width: Math.round(w),
        height: Math.round(h),
        objectFit: 'contain',
        name: name ?? `Image ${elements.length + 1}`,
      });
    };
    img.onerror = () => {
      addElement({
        type: 'image',
        src,
        width: 300,
        height: 300,
        objectFit: 'contain',
        name: name ?? `Image ${elements.length + 1}`,
      });
    };
    img.src = src;
  }, [addElement, elements.length]);

  const addLine = useCallback(() => {
    addElement({
      type: 'line',
      width: 200,
      height: 4,
      fill: '#000000',
      strokeWidth: 2,
      name: `Line ${elements.length + 1}`,
    });
  }, [addElement, elements.length]);

  const updateElement = useCallback((id: string, updates: Partial<DesignElement>) => {
    updateElements(elements.map(el => el.id === id ? { ...el, ...updates } : el));
  }, [elements, updateElements]);

  const deleteSelected = useCallback(() => {
    updateElements(elements.filter(el => !selectedIds.includes(el.id)));
    setSelectedIds([]);
  }, [elements, selectedIds, updateElements]);

  const duplicateSelected = useCallback(() => {
    const duplicated = elements
      .filter(el => selectedIds.includes(el.id))
      .map(el => ({ ...el, id: generateId(), x: el.x + 20, y: el.y + 20, name: `${el.name} copy` }));
    updateElements([...elements, ...duplicated]);
    setSelectedIds(duplicated.map(el => el.id));
  }, [elements, selectedIds, updateElements]);

  const copySelected = useCallback(() => {
    const copied = elements.filter(el => selectedIds.includes(el.id));
    setClipboard(JSON.parse(JSON.stringify(copied)));
  }, [elements, selectedIds]);

  const paste = useCallback(() => {
    if (clipboard.length === 0) return;
    const pasted = clipboard.map(el => ({
      ...el,
      id: generateId(),
      x: el.x + 20,
      y: el.y + 20,
      name: `${el.name} copy`,
    }));
    updateElements([...elements, ...pasted]);
    setSelectedIds(pasted.map(el => el.id));
  }, [clipboard, elements, updateElements]);

  const moveLayer = useCallback((id: string, direction: 'up' | 'down' | 'top' | 'bottom') => {
    const els = [...elements];
    const idx = els.findIndex(el => el.id === id);
    if (idx === -1) return;
    const [el] = els.splice(idx, 1);
    switch (direction) {
      case 'up': els.splice(Math.min(idx + 1, els.length), 0, el); break;
      case 'down': els.splice(Math.max(idx - 1, 0), 0, el); break;
      case 'top': els.push(el); break;
      case 'bottom': els.unshift(el); break;
    }
    updateElements(els);
  }, [elements, updateElements]);

  const reorderElements = useCallback((fromIndex: number, toIndex: number) => {
    const els = [...elements];
    const [moved] = els.splice(fromIndex, 1);
    els.splice(toIndex, 0, moved);
    updateElements(els);
  }, [elements, updateElements]);

  const selectAll = useCallback(() => {
    setSelectedIds(elements.map(el => el.id));
  }, [elements]);

  const deselectAll = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // Align element to page
  const alignElement = useCallback((id: string, alignment: 'top' | 'middle' | 'bottom' | 'left' | 'centre' | 'right') => {
    const el = elements.find(e => e.id === id);
    if (!el) return;
    const updates: Partial<DesignElement> = {};
    switch (alignment) {
      case 'top': updates.y = 0; break;
      case 'middle': updates.y = (project.height - el.height) / 2; break;
      case 'bottom': updates.y = project.height - el.height; break;
      case 'left': updates.x = 0; break;
      case 'centre': updates.x = (project.width - el.width) / 2; break;
      case 'right': updates.x = project.width - el.width; break;
    }
    updateElement(id, updates);
  }, [elements, project.width, project.height, updateElement]);

  // Snap calculation
  const calculateSnap = useCallback((el: DesignElement, allElements: DesignElement[]) => {
    if (!snapEnabled) return { x: el.x, y: el.y, lines: [] };
    const SNAP_THRESHOLD = 5;
    const lines: SnapLine[] = [];
    let snappedX = el.x;
    let snappedY = el.y;

    const elCenterX = el.x + el.width / 2;
    const elCenterY = el.y + el.height / 2;
    const elRight = el.x + el.width;
    const elBottom = el.y + el.height;

    if (Math.abs(el.x) < SNAP_THRESHOLD) { snappedX = 0; lines.push({ type: 'vertical', position: 0 }); }
    if (Math.abs(el.y) < SNAP_THRESHOLD) { snappedY = 0; lines.push({ type: 'horizontal', position: 0 }); }
    if (Math.abs(elRight - project.width) < SNAP_THRESHOLD) { snappedX = project.width - el.width; lines.push({ type: 'vertical', position: project.width }); }
    if (Math.abs(elBottom - project.height) < SNAP_THRESHOLD) { snappedY = project.height - el.height; lines.push({ type: 'horizontal', position: project.height }); }

    const canvasCenterX = project.width / 2;
    const canvasCenterY = project.height / 2;
    if (Math.abs(elCenterX - canvasCenterX) < SNAP_THRESHOLD) { snappedX = canvasCenterX - el.width / 2; lines.push({ type: 'vertical', position: canvasCenterX }); }
    if (Math.abs(elCenterY - canvasCenterY) < SNAP_THRESHOLD) { snappedY = canvasCenterY - el.height / 2; lines.push({ type: 'horizontal', position: canvasCenterY }); }

    for (const other of allElements) {
      if (other.id === el.id) continue;
      const otherCenterX = other.x + other.width / 2;
      const otherCenterY = other.y + other.height / 2;
      if (Math.abs(el.x - other.x) < SNAP_THRESHOLD) { snappedX = other.x; lines.push({ type: 'vertical', position: other.x }); }
      if (Math.abs(elRight - (other.x + other.width)) < SNAP_THRESHOLD) { snappedX = other.x + other.width - el.width; lines.push({ type: 'vertical', position: other.x + other.width }); }
      if (Math.abs(elCenterX - otherCenterX) < SNAP_THRESHOLD) { snappedX = otherCenterX - el.width / 2; lines.push({ type: 'vertical', position: otherCenterX }); }
      if (Math.abs(el.y - other.y) < SNAP_THRESHOLD) { snappedY = other.y; lines.push({ type: 'horizontal', position: other.y }); }
      if (Math.abs(elBottom - (other.y + other.height)) < SNAP_THRESHOLD) { snappedY = other.y + other.height - el.height; lines.push({ type: 'horizontal', position: other.y + other.height }); }
      if (Math.abs(elCenterY - otherCenterY) < SNAP_THRESHOLD) { snappedY = otherCenterY - el.height / 2; lines.push({ type: 'horizontal', position: otherCenterY }); }
    }

    return { x: snappedX, y: snappedY, lines };
  }, [snapEnabled, project.width, project.height]);

  return {
    project, setProject,
    pages, currentPageIndex, currentPage,
    switchPage, addPage, duplicatePage, deletePage,
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
    moveLayer, reorderElements, selectAll, deselectAll,
    alignElement,
    undo, redo, historyIndex, historyLength: history.length,
    calculateSnap,
  };
}
