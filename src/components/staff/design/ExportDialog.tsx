import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Download, FileImage, FileText, FileType, Check } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { DesignProject } from './types';

interface ExportDialogProps {
  canvasRef: React.RefObject<HTMLDivElement>;
  project: DesignProject;
}

type ExportFormat = 'png' | 'jpg' | 'pdf' | 'svg';

export function ExportDialog({ canvasRef, project }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('png');
  const [transparentBg, setTransparentBg] = useState(false);
  const [quality, setQuality] = useState<'1x' | '2x' | '3x'>('2x');
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!canvasRef.current) return;
    setExporting(true);
    try {
      const scale = quality === '1x' ? 1 : quality === '2x' ? 2 : 3;
      const bgColor = transparentBg ? null : project.background;

      if (format === 'svg') {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${project.width}" height="${project.height}" viewBox="0 0 ${project.width} ${project.height}">
          <rect width="100%" height="100%" fill="${transparentBg ? 'none' : project.background}"/>
          <text x="50%" y="50%" text-anchor="middle" fill="#999" font-size="24">SVG export - use PNG/PDF for full fidelity</text>
        </svg>`;
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${project.name}.svg`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('SVG exported');
        setExporting(false);
        return;
      }

      // Clone the canvas element so we can remove selection outlines for export
      const clone = canvasRef.current.cloneNode(true) as HTMLElement;
      clone.style.position = 'fixed';
      clone.style.left = '-99999px';
      clone.style.top = '0';
      clone.style.zIndex = '-1';
      // Remove selection outlines and resize handles from clone
      clone.querySelectorAll('[style*="outline"]').forEach((el: any) => {
        el.style.outline = 'none';
        el.style.outlineOffset = '0';
      });
      // Remove snap lines and resize handles
      clone.querySelectorAll('[style*="z-index: 10000"], [style*="zIndex: 10000"]').forEach(el => el.remove());
      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: bgColor,
        scale,
        width: project.width,
        height: project.height,
        logging: false,
        onclone: (doc) => {
          // Ensure fonts are loaded in clone
          const style = doc.createElement('style');
          style.textContent = `@font-face { font-family: 'Agrandir Tight'; src: url('/fonts/agrandir-tight.otf') format('opentype'); }`;
          doc.head.appendChild(style);
        },
      } as any);

      document.body.removeChild(clone);

      if (format === 'pdf') {
        const imgData = canvas.toDataURL('image/png');
        const isLandscape = project.width > project.height;
        const pdf = new jsPDF({
          orientation: isLandscape ? 'landscape' : 'portrait',
          unit: 'px',
          format: [project.width, project.height],
        });
        pdf.addImage(imgData, 'PNG', 0, 0, project.width, project.height);
        pdf.save(`${project.name}.pdf`);
        toast.success('PDF exported');
      } else {
        const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
        const ext = format === 'jpg' ? '.jpg' : '.png';
        const link = document.createElement('a');
        link.download = `${project.name}${ext}`;
        link.href = canvas.toDataURL(mimeType, format === 'jpg' ? 0.92 : undefined);
        link.click();
        toast.success(`${format.toUpperCase()} exported`);
      }
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Export failed');
    }
    setExporting(false);
  }, [canvasRef, project, format, transparentBg, quality]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
          <Download className="h-3 w-3" /> Export
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 space-y-3" align="end">
        <h4 className="text-xs font-semibold">Export Design</h4>

        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Format</Label>
          <div className="grid grid-cols-4 gap-1">
            {(['png', 'jpg', 'pdf', 'svg'] as ExportFormat[]).map(f => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`text-[10px] py-1.5 rounded border text-center uppercase font-medium transition-colors ${format === f ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {(format === 'png' || format === 'jpg') && (
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Quality</Label>
            <div className="grid grid-cols-3 gap-1">
              {(['1x', '2x', '3x'] as const).map(q => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={`text-[10px] py-1 rounded border text-center font-medium transition-colors ${quality === q ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {format === 'png' && (
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-muted-foreground">Transparent background</Label>
            <Switch checked={transparentBg} onCheckedChange={setTransparentBg} className="scale-75" />
          </div>
        )}

        <Button size="sm" className="w-full h-7 text-xs gap-1" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Exporting...' : <><Download className="h-3 w-3" /> Download {format.toUpperCase()}</>}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
