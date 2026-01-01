import { useState, useRef, useCallback, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Trash2, GripVertical, Type, Calendar, PenTool, User, Users, ArrowRight, CheckCircle2 } from "lucide-react";
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
  signer_party: 'owner' | 'counterparty'; // who signs this field
}

interface PDFDocumentViewerProps {
  fileUrl: string;
  fields?: FieldPosition[];
  onFieldsChange?: (fields: FieldPosition[]) => void;
  mode: 'edit' | 'view' | 'sign' | 'owner-sign';
  fieldValues?: Record<string, string>;
  onFieldValueChange?: (fieldId: string, value: string) => void;
  onSignatureStart?: (fieldId: string) => void;
  signerPartyFilter?: 'owner' | 'counterparty' | 'all';
  onNavigateToField?: (fieldId: string, pageNumber: number) => void;
}

export const PDFDocumentViewer = ({
  fileUrl,
  fields = [],
  onFieldsChange,
  mode,
  fieldValues = {},
  onFieldValueChange,
  onSignatureStart,
  signerPartyFilter = 'all',
}: PDFDocumentViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggingField, setDraggingField] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [addingFieldType, setAddingFieldType] = useState<'text' | 'date' | 'signature' | null>(null);
  const [addingFieldParty, setAddingFieldParty] = useState<'owner' | 'counterparty'>('owner');
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  // Get editable fields for navigation in sign modes
  const editableFields = fields.filter(f => {
    if (mode === 'owner-sign') return f.signer_party === 'owner';
    if (mode === 'sign') return f.signer_party === 'counterparty';
    return false;
  });
  
  const unfilledFields = editableFields.filter(f => !fieldValues[f.id]);

  // Auto-fill date fields when entering sign mode (run once when fields load)
  useEffect(() => {
    if (mode !== 'sign' && mode !== 'owner-sign') return;
    if (fields.length === 0) return;
    
    const today = new Date().toISOString().split('T')[0];
    const dateFieldsToFill = fields.filter(f => {
      const isEditable = mode === 'owner-sign' ? f.signer_party === 'owner' : f.signer_party === 'counterparty';
      return f.field_type === 'date' && isEditable && !fieldValues[f.id];
    });
    
    dateFieldsToFill.forEach(field => {
      onFieldValueChange?.(field.id, today);
    });
    // Only run when mode or fields change, not on every fieldValues update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, fields.length]);

  const navigateToNextField = () => {
    if (unfilledFields.length === 0) return;
    const nextField = unfilledFields[0];
    if (nextField.page_number !== currentPage) {
      setCurrentPage(nextField.page_number);
    }
    // Scroll to field after page change
    setTimeout(() => {
      const fieldEl = document.querySelector(`[data-field-id="${nextField.id}"]`);
      fieldEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

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
    // Don't add field if we're dragging or if target is inside a field
    if (mode !== 'edit' || !addingFieldType || !pageRef.current || draggingField) return;
    
    // Check if click is on the page itself, not on a field
    const target = e.target as HTMLElement;
    if (target.closest('[data-field-id]')) return;

    const rect = pageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newField: FieldPosition = {
      id: `field-${Date.now()}`,
      field_type: addingFieldType,
      label: `${addingFieldType.charAt(0).toUpperCase() + addingFieldType.slice(1)} Field`,
      page_number: currentPage,
      x_position: Math.max(0, Math.min(x - 10, 80)),
      y_position: Math.max(0, Math.min(y - 2, 90)),
      width: addingFieldType === 'signature' ? 25 : 20,
      height: addingFieldType === 'signature' ? 8 : 4,
      signer_party: addingFieldParty,
    };

    onFieldsChange?.([...fields, newField]);
    setAddingFieldType(null);
  }, [mode, addingFieldType, addingFieldParty, currentPage, fields, onFieldsChange, draggingField]);

  const handleFieldMouseDown = (fieldId: string, e: React.MouseEvent) => {
    if (mode !== 'edit') return;
    e.preventDefault();
    e.stopPropagation();
    
    const field = fields.find(f => f.id === fieldId);
    if (!field || !pageRef.current) return;

    const rect = pageRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;
    
    setDragOffset({
      x: clickX - field.x_position,
      y: clickY - field.y_position,
    });
    setDraggingField(fieldId);
  };

  // Use document-level mouse events for smooth dragging
  useEffect(() => {
    if (!draggingField) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!draggingField || !pageRef.current) return;

      const rect = pageRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      const field = fields.find(f => f.id === draggingField);
      if (!field) return;

      const newX = x - dragOffset.x;
      const newY = y - dragOffset.y;

      const updatedFields = fields.map(f => {
        if (f.id === draggingField) {
          return {
            ...f,
            x_position: Math.max(0, Math.min(newX, 100 - f.width)),
            y_position: Math.max(0, Math.min(newY, 100 - f.height)),
          };
        }
        return f;
      });

      onFieldsChange?.(updatedFields);
    };

    const handleGlobalMouseUp = () => {
      setDraggingField(null);
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggingField, dragOffset, fields, onFieldsChange]);

  const deleteField = (fieldId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onFieldsChange?.(fields.filter(f => f.id !== fieldId));
  };

  const updateFieldLabel = (fieldId: string, label: string) => {
    onFieldsChange?.(fields.map(f => f.id === fieldId ? { ...f, label } : f));
  };

  const toggleFieldParty = (fieldId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onFieldsChange?.(fields.map(f => 
      f.id === fieldId 
        ? { ...f, signer_party: f.signer_party === 'owner' ? 'counterparty' : 'owner' } 
        : f
    ));
  };

  // Filter fields based on page and signer party
  // In owner-sign mode, show ALL fields but only owner fields are editable
  const currentPageFields = fields.filter(f => {
    if (f.page_number !== currentPage) return false;
    // In owner-sign mode, show all fields (owner editable, counterparty read-only)
    if (mode === 'owner-sign') return true;
    if (signerPartyFilter === 'all') return true;
    return f.signer_party === signerPartyFilter;
  });

  // Check if a field should be interactive based on mode and party
  const isFieldEditable = (field: FieldPosition) => {
    if (mode === 'edit') return true;
    if (mode === 'owner-sign') return field.signer_party === 'owner';
    if (mode === 'sign') return field.signer_party === 'counterparty';
    return false;
  };

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'text': return <Type className="w-3 h-3" />;
      case 'date': return <Calendar className="w-3 h-3" />;
      case 'signature': return <PenTool className="w-3 h-3" />;
      default: return null;
    }
  };

  const getPartyColor = (party: string) => {
    return party === 'owner' ? 'border-green-500 bg-green-50' : 'border-orange-500 bg-orange-50';
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
          <div className="flex items-center gap-2">
            {/* Party toggle */}
            <div className="flex items-center border rounded-md overflow-hidden">
              <Button
                variant={addingFieldParty === 'owner' ? 'default' : 'ghost'}
                size="sm"
                className={cn("rounded-none h-8", addingFieldParty === 'owner' && "bg-green-600 hover:bg-green-700")}
                onClick={() => setAddingFieldParty('owner')}
              >
                <User className="w-4 h-4 mr-1" />
                Me
              </Button>
              <Button
                variant={addingFieldParty === 'counterparty' ? 'default' : 'ghost'}
                size="sm"
                className={cn("rounded-none h-8", addingFieldParty === 'counterparty' && "bg-orange-600 hover:bg-orange-700")}
                onClick={() => setAddingFieldParty('counterparty')}
              >
                <Users className="w-4 h-4 mr-1" />
                Other Party
              </Button>
            </div>
            
            {/* Field type buttons */}
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
          </div>
        )}
      </div>

      {addingFieldType && mode === 'edit' && (
        <div className={cn(
          "text-sm px-3 py-1.5 text-center",
          addingFieldParty === 'owner' ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
        )}>
          Click anywhere on the document to place a {addingFieldType} field for {addingFieldParty === 'owner' ? 'yourself' : 'other party'}
        </div>
      )}

      {/* Next field navigation for sign modes */}
      {(mode === 'sign' || mode === 'owner-sign') && editableFields.length > 0 && (
        <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
          <div className="flex items-center gap-2 text-sm">
            {unfilledFields.length > 0 ? (
              <>
                <span className="text-muted-foreground">
                  {editableFields.length - unfilledFields.length} of {editableFields.length} fields completed
                </span>
              </>
            ) : (
              <span className="text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                All fields completed!
              </span>
            )}
          </div>
          {unfilledFields.length > 0 && (
            <Button
              size="sm"
              variant="default"
              onClick={navigateToNextField}
              className="gap-1"
            >
              Next Field
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}

      {/* Document viewer */}
      <div 
        ref={containerRef}
        className={cn("flex-1 overflow-auto p-4", draggingField && "cursor-grabbing")}
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
              style={{ userSelect: 'none' }}
            >
              {/* PDF Document - text/annotation layers disabled to allow field interaction */}
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
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </Document>

              {/* Field overlay container - positioned above PDF */}
              {!loading && currentPageFields.map((field) => {
                const editable = isFieldEditable(field);
                return (
                <div
                  key={field.id}
                  data-field-id={field.id}
                  className={cn(
                    "absolute border-2 rounded transition-colors select-none z-10",
                    mode === 'edit' 
                      ? cn("cursor-grab hover:opacity-90", getPartyColor(field.signer_party))
                      : (mode === 'sign' || mode === 'owner-sign')
                      ? cn(getPartyColor(field.signer_party), !editable && "opacity-60")
                      : "border-muted bg-muted/20",
                    draggingField === field.id && "ring-2 ring-blue-500 opacity-70 cursor-grabbing z-50"
                  )}
                  style={{
                    left: `${field.x_position}%`,
                    top: `${field.y_position}%`,
                    width: field.field_type === 'text' 
                      ? `${Math.max(field.width, (fieldValues[field.id]?.length || 0) * 1.2 + 5)}%`
                      : `${field.width}%`,
                    minWidth: '120px',
                    height: `${field.height}%`,
                    minHeight: '30px',
                  }}
                  onMouseDown={(e) => {
                    // Only handle drag in edit mode
                    if (mode !== 'edit') return;
                    e.preventDefault();
                    e.stopPropagation();
                    handleFieldMouseDown(field.id, e);
                  }}
                >
                  {mode === 'edit' ? (
                    <div className="absolute inset-0 flex items-center justify-between px-1 gap-1">
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0 cursor-grab" />
                        {getFieldIcon(field.field_type)}
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => updateFieldLabel(field.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="flex-1 min-w-0 bg-transparent text-xs border-none outline-none"
                          placeholder="Label"
                        />
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                          type="button"
                          className={cn(
                            "h-6 w-6 rounded flex items-center justify-center hover:bg-white/50",
                            field.signer_party === 'owner' ? "text-green-600" : "text-orange-600"
                          )}
                          onClick={(e) => toggleFieldParty(field.id, e)}
                          onMouseDown={(e) => e.stopPropagation()}
                          title={`Switch to ${field.signer_party === 'owner' ? 'other party' : 'me'}`}
                        >
                          {field.signer_party === 'owner' ? <User className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          className="h-6 w-6 rounded flex items-center justify-center hover:bg-white/50 text-destructive"
                          onClick={(e) => deleteField(field.id, e)}
                          onMouseDown={(e) => e.stopPropagation()}
                          title="Delete field"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (mode === 'sign' || mode === 'owner-sign') ? (
                    <div className="absolute inset-0 flex items-center p-1">
                      {field.field_type === 'text' && (
                        editable ? (
                          <input
                            type="text"
                            value={fieldValues[field.id] || ''}
                            onChange={(e) => onFieldValueChange?.(field.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onFocus={(e) => e.stopPropagation()}
                            className="w-full h-full bg-white text-sm text-black border rounded px-2 focus:ring-2 focus:ring-primary"
                            placeholder={field.label}
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 text-sm text-black border rounded px-2 flex items-center">
                            {fieldValues[field.id] || field.label}
                          </div>
                        )
                      )}
                      {field.field_type === 'date' && (
                        editable ? (
                          <div className="w-full h-full flex items-center gap-1">
                            <input
                              type="date"
                              value={fieldValues[field.id] || new Date().toISOString().split('T')[0]}
                              onChange={(e) => onFieldValueChange?.(field.id, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              onFocus={(e) => e.stopPropagation()}
                              className="flex-1 h-full bg-white text-sm text-black border rounded px-2 focus:ring-2 focus:ring-primary"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full bg-gray-100 text-sm text-black border rounded px-2 flex items-center">
                            {fieldValues[field.id] || field.label}
                          </div>
                        )
                      )}
                      {field.field_type === 'signature' && (
                        fieldValues[field.id] ? (
                          <img 
                            src={fieldValues[field.id]} 
                            alt="Signature" 
                            className="w-full h-full object-contain bg-white rounded"
                          />
                        ) : editable ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSignatureStart?.(field.id);
                            }}
                            className={cn(
                              "w-full h-full border-2 border-dashed rounded flex items-center justify-center text-xs hover:opacity-80 cursor-pointer",
                              field.signer_party === 'owner' 
                                ? "border-green-400 text-green-600 bg-green-50 hover:bg-green-100" 
                                : "border-orange-400 text-orange-600 bg-orange-50 hover:bg-orange-100"
                            )}
                          >
                            <PenTool className="w-4 h-4 mr-1" />
                            Click to Sign
                          </button>
                        ) : (
                          <div className="w-full h-full border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-xs text-black bg-gray-50">
                            <PenTool className="w-4 h-4 mr-1" />
                            {field.label}
                          </div>
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
              );})}
            </div>
          </div>
        )}
      </div>

      {/* Field list for edit mode */}
      {mode === 'edit' && fields.length > 0 && (
        <div className="border-t bg-background p-2 max-h-32 overflow-y-auto">
          <div className="flex items-center gap-4 mb-2">
            <p className="text-xs text-muted-foreground">
              {fields.length} field(s) placed. Drag to reposition.
            </p>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-100 border border-green-500 rounded"></div>
                Me ({fields.filter(f => f.signer_party === 'owner').length})
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-orange-100 border border-orange-500 rounded"></div>
                Other ({fields.filter(f => f.signer_party === 'counterparty').length})
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {fields.map((f) => (
              <span 
                key={f.id} 
                className={cn(
                  "text-xs px-2 py-1 rounded flex items-center gap-1 border",
                  f.signer_party === 'owner' ? "bg-green-50 border-green-300" : "bg-orange-50 border-orange-300",
                  f.page_number !== currentPage && "opacity-50"
                )}
              >
                {f.signer_party === 'owner' ? <User className="w-3 h-3" /> : <Users className="w-3 h-3" />}
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
