import { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Plus, Trash2, GripVertical, Type, Calendar, PenTool } from "lucide-react";
import { cn } from "@/lib/utils";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export interface FieldPosition {
  id: string;
  field_type: 'text' | 'date' | 'signature';
  label: string;
  page_number: number;
  x_position: number; // percentage from left
  y_position: number; // percentage from top
  width: number; // percentage
  height: number; // percentage
}

interface PDFDocumentViewerProps {
  fileUrl: string;
  fields?: FieldPosition[];
  onFieldsChange?: (fields: FieldPosition[]) => void;
  mode: 'edit' | 'view' | 'sign';
  fieldValues?: Record<string, string>;
  onFieldValueChange?: (fieldId: string, value: string) => void;
  onSignatureStart?: (fieldId: string) => void;
}

export const PDFDocumentViewer = ({
  fileUrl,
  fields = [],
  onFieldsChange,
  mode,
  fieldValues = {},
  onFieldValueChange,
  onSignatureStart,
}: PDFDocumentViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggingField, setDraggingField] = useState<string | null>(null);
  const [addingFieldType, setAddingFieldType] = useState<'text' | 'date' | 'signature' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    setError('Failed to load PDF. Please ensure the file is a valid PDF.');
    setLoading(false);
  };

  const handlePageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== 'edit' || !addingFieldType || !pageRef.current) return;

    const rect = pageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newField: FieldPosition = {
      id: `field-${Date.now()}`,
      field_type: addingFieldType,
      label: `${addingFieldType.charAt(0).toUpperCase() + addingFieldType.slice(1)} Field`,
      page_number: currentPage,
      x_position: Math.max(0, Math.min(x - 10, 80)), // Center field on click, keep within bounds
      y_position: Math.max(0, Math.min(y - 2, 90)),
      width: addingFieldType === 'signature' ? 25 : 20,
      height: addingFieldType === 'signature' ? 8 : 4,
    };

    onFieldsChange?.([...fields, newField]);
    setAddingFieldType(null);
  }, [mode, addingFieldType, currentPage, fields, onFieldsChange]);

  const handleFieldDragStart = (fieldId: string, e: React.MouseEvent) => {
    if (mode !== 'edit') return;
    e.stopPropagation();
    setDraggingField(fieldId);
  };

  const handleFieldDrag = useCallback((e: React.MouseEvent) => {
    if (!draggingField || !pageRef.current) return;

    const rect = pageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const updatedFields = fields.map(f => {
      if (f.id === draggingField) {
        return {
          ...f,
          x_position: Math.max(0, Math.min(x - f.width / 2, 100 - f.width)),
          y_position: Math.max(0, Math.min(y - f.height / 2, 100 - f.height)),
        };
      }
      return f;
    });

    onFieldsChange?.(updatedFields);
  }, [draggingField, fields, onFieldsChange]);

  const handleFieldDragEnd = () => {
    setDraggingField(null);
  };

  const deleteField = (fieldId: string) => {
    onFieldsChange?.(fields.filter(f => f.id !== fieldId));
  };

  const updateFieldLabel = (fieldId: string, label: string) => {
    onFieldsChange?.(fields.map(f => f.id === fieldId ? { ...f, label } : f));
  };

  const currentPageFields = fields.filter(f => f.page_number === currentPage);

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'text': return <Type className="w-3 h-3" />;
      case 'date': return <Calendar className="w-3 h-3" />;
      case 'signature': return <PenTool className="w-3 h-3" />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-muted/30 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-background border-b gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm min-w-[80px] text-center">
            {currentPage} / {numPages || '?'}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
            disabled={currentPage >= numPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale(s => Math.min(2, s + 0.25))}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        {mode === 'edit' && (
          <div className="flex items-center gap-1">
            <Button
              variant={addingFieldType === 'text' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAddingFieldType(addingFieldType === 'text' ? null : 'text')}
            >
              <Type className="w-4 h-4 mr-1" />
              Text
            </Button>
            <Button
              variant={addingFieldType === 'date' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAddingFieldType(addingFieldType === 'date' ? null : 'date')}
            >
              <Calendar className="w-4 h-4 mr-1" />
              Date
            </Button>
            <Button
              variant={addingFieldType === 'signature' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAddingFieldType(addingFieldType === 'signature' ? null : 'signature')}
            >
              <PenTool className="w-4 h-4 mr-1" />
              Signature
            </Button>
          </div>
        )}
      </div>

      {addingFieldType && mode === 'edit' && (
        <div className="bg-primary/10 text-primary text-sm px-3 py-1.5 text-center">
          Click on the document to place a {addingFieldType} field
        </div>
      )}

      {/* Document viewer */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-4"
        onMouseMove={draggingField ? handleFieldDrag : undefined}
        onMouseUp={handleFieldDragEnd}
        onMouseLeave={handleFieldDragEnd}
      >
        {error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-destructive">
              <p>{error}</p>
              <Button variant="outline" className="mt-4" onClick={() => window.open(fileUrl, '_blank')}>
                Download PDF Instead
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div 
              ref={pageRef}
              className={cn(
                "relative bg-white shadow-lg",
                addingFieldType && "cursor-crosshair"
              )}
              onClick={handlePageClick}
            >
              <Document
                file={fileUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex items-center justify-center p-12">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                }
              >
                <Page
                  pageNumber={currentPage}
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </Document>

              {/* Overlay fields */}
              {!loading && currentPageFields.map((field) => (
                <div
                  key={field.id}
                  className={cn(
                    "absolute border-2 rounded transition-colors",
                    mode === 'edit' 
                      ? "border-primary bg-primary/10 cursor-move hover:bg-primary/20" 
                      : mode === 'sign'
                      ? "border-blue-500 bg-blue-50"
                      : "border-muted bg-muted/20",
                    draggingField === field.id && "ring-2 ring-primary"
                  )}
                  style={{
                    left: `${field.x_position}%`,
                    top: `${field.y_position}%`,
                    width: `${field.width}%`,
                    height: `${field.height}%`,
                    minHeight: '30px',
                    minWidth: '80px',
                  }}
                  onMouseDown={(e) => handleFieldDragStart(field.id, e)}
                >
                  {mode === 'edit' ? (
                    <div className="absolute inset-0 flex items-center justify-between px-1 gap-1">
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <GripVertical className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        {getFieldIcon(field.field_type)}
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => updateFieldLabel(field.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 min-w-0 bg-transparent text-xs border-none outline-none"
                          placeholder="Label"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteField(field.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  ) : mode === 'sign' ? (
                    <div className="absolute inset-0 flex items-center p-1">
                      {field.field_type === 'text' && (
                        <input
                          type="text"
                          value={fieldValues[field.id] || ''}
                          onChange={(e) => onFieldValueChange?.(field.id, e.target.value)}
                          className="w-full h-full bg-white/80 text-sm border rounded px-2"
                          placeholder={field.label}
                        />
                      )}
                      {field.field_type === 'date' && (
                        <input
                          type="date"
                          value={fieldValues[field.id] || ''}
                          onChange={(e) => onFieldValueChange?.(field.id, e.target.value)}
                          className="w-full h-full bg-white/80 text-sm border rounded px-2"
                        />
                      )}
                      {field.field_type === 'signature' && (
                        fieldValues[field.id] ? (
                          <img 
                            src={fieldValues[field.id]} 
                            alt="Signature" 
                            className="w-full h-full object-contain bg-white rounded"
                          />
                        ) : (
                          <button
                            onClick={() => onSignatureStart?.(field.id)}
                            className="w-full h-full bg-white/80 border-2 border-dashed border-blue-400 rounded flex items-center justify-center text-xs text-blue-600 hover:bg-blue-50"
                          >
                            <PenTool className="w-4 h-4 mr-1" />
                            Click to Sign
                          </button>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                      {getFieldIcon(field.field_type)}
                      <span className="ml-1">{field.label}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Field list for edit mode */}
      {mode === 'edit' && fields.length > 0 && (
        <div className="border-t bg-background p-2 max-h-32 overflow-y-auto">
          <p className="text-xs text-muted-foreground mb-2">
            {fields.length} field(s) placed. Drag to reposition.
          </p>
          <div className="flex flex-wrap gap-1">
            {fields.map((f) => (
              <span 
                key={f.id} 
                className={cn(
                  "text-xs px-2 py-1 rounded flex items-center gap-1",
                  f.page_number === currentPage ? "bg-primary/20" : "bg-muted"
                )}
              >
                {getFieldIcon(f.field_type)}
                {f.label}
                <span className="text-muted-foreground">(p{f.page_number})</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
