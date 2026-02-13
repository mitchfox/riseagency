import { useState, useCallback, useRef } from 'react';

export const useResizableColumns = (storageKey: string) => {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(`col-widths-${storageKey}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const resizing = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  const saveWidths = useCallback((widths: Record<string, number>) => {
    try {
      localStorage.setItem(`col-widths-${storageKey}`, JSON.stringify(widths));
    } catch {}
  }, [storageKey]);

  const onMouseDown = useCallback((key: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const th = (e.target as HTMLElement).closest('th');
    if (!th) return;
    const startWidth = columnWidths[key] || th.offsetWidth;
    resizing.current = { key, startX: e.clientX, startWidth };

    const onMouseMove = (moveE: MouseEvent) => {
      if (!resizing.current) return;
      const diff = moveE.clientX - resizing.current.startX;
      const newWidth = Math.max(40, resizing.current.startWidth + diff);
      setColumnWidths(prev => {
        const updated = { ...prev, [resizing.current!.key]: newWidth };
        saveWidths(updated);
        return updated;
      });
    };

    const onMouseUp = () => {
      resizing.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [columnWidths, saveWidths]);

  const getHeaderProps = useCallback((key: string) => ({
    style: columnWidths[key] ? { width: columnWidths[key], minWidth: 40 } as React.CSSProperties : undefined,
  }), [columnWidths]);

  const ResizeHandle = useCallback(({ columnKey }: { columnKey: string }) => (
    <span
      onMouseDown={(e) => onMouseDown(columnKey, e)}
      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/40 transition-colors"
      onClick={(e) => e.stopPropagation()}
    />
  ), [onMouseDown]);

  return { getHeaderProps, ResizeHandle, columnWidths };
};
