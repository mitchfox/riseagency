import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Table2, Trash2, Edit2, Save, PlusCircle, MinusCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface StaffSheet {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface SheetData {
  headers: string[];
  rows: string[][];
}

export const SheetsWidget = () => {
  const [sheets, setSheets] = useState<StaffSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSheet, setEditingSheet] = useState<StaffSheet | null>(null);
  const [viewingSheet, setViewingSheet] = useState<StaffSheet | null>(null);
  const [title, setTitle] = useState("");
  const [sheetData, setSheetData] = useState<SheetData>({ headers: ["Column 1", "Column 2", "Column 3"], rows: [["", "", ""]] });

  useEffect(() => {
    fetchSheets();
  }, []);

  const fetchSheets = async () => {
    try {
      const { data, error } = await supabase
        .from("staff_documents")
        .select("*")
        .eq("doc_type", "sheet")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setSheets(data || []);
    } catch (error) {
      console.error("Error fetching sheets:", error);
    } finally {
      setLoading(false);
    }
  };

  const parseSheetContent = (content: string): SheetData => {
    try {
      return JSON.parse(content);
    } catch {
      return { headers: ["Column 1", "Column 2", "Column 3"], rows: [["", "", ""]] };
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    try {
      const content = JSON.stringify(sheetData);
      if (editingSheet) {
        const { error } = await supabase
          .from("staff_documents")
          .update({ title, content, updated_at: new Date().toISOString() })
          .eq("id", editingSheet.id);
        if (error) throw error;
        toast.success("Sheet updated");
      } else {
        const { error } = await supabase
          .from("staff_documents")
          .insert({ title, content, doc_type: "sheet" });
        if (error) throw error;
        toast.success("Sheet created");
      }
      resetForm();
      fetchSheets();
    } catch (error) {
      toast.error("Failed to save sheet");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this sheet?")) return;
    try {
      const { error } = await supabase.from("staff_documents").delete().eq("id", id);
      if (error) throw error;
      toast.success("Sheet deleted");
      fetchSheets();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const resetForm = () => {
    setTitle("");
    setSheetData({ headers: ["Column 1", "Column 2", "Column 3"], rows: [["", "", ""]] });
    setEditingSheet(null);
    setIsDialogOpen(false);
  };

  const openEdit = (sheet: StaffSheet) => {
    setEditingSheet(sheet);
    setTitle(sheet.title);
    setSheetData(parseSheetContent(sheet.content));
    setIsDialogOpen(true);
  };

  const updateHeader = (index: number, value: string) => {
    const newHeaders = [...sheetData.headers];
    newHeaders[index] = value;
    setSheetData({ ...sheetData, headers: newHeaders });
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = [...sheetData.rows];
    newRows[rowIndex][colIndex] = value;
    setSheetData({ ...sheetData, rows: newRows });
  };

  const addRow = () => {
    setSheetData({
      ...sheetData,
      rows: [...sheetData.rows, new Array(sheetData.headers.length).fill("")]
    });
  };

  const removeRow = (index: number) => {
    if (sheetData.rows.length <= 1) return;
    const newRows = sheetData.rows.filter((_, i) => i !== index);
    setSheetData({ ...sheetData, rows: newRows });
  };

  const addColumn = () => {
    setSheetData({
      headers: [...sheetData.headers, `Column ${sheetData.headers.length + 1}`],
      rows: sheetData.rows.map(row => [...row, ""])
    });
  };

  const removeColumn = (index: number) => {
    if (sheetData.headers.length <= 1) return;
    setSheetData({
      headers: sheetData.headers.filter((_, i) => i !== index),
      rows: sheetData.rows.map(row => row.filter((_, i) => i !== index))
    });
  };

  if (loading) {
    return <div className="p-4 text-muted-foreground text-sm">Loading...</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">{sheets.length} sheets</span>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1">
              <Plus className="w-3 h-3" /> New
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{editingSheet ? "Edit Sheet" : "New Sheet"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Sheet title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <div className="flex gap-2 mb-2">
                <Button size="sm" variant="outline" onClick={addColumn}>
                  <PlusCircle className="w-3 h-3 mr-1" /> Column
                </Button>
                <Button size="sm" variant="outline" onClick={addRow}>
                  <PlusCircle className="w-3 h-3 mr-1" /> Row
                </Button>
              </div>

              <ScrollArea className="max-h-[50vh] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {sheetData.headers.map((header, i) => (
                        <TableHead key={i} className="min-w-[120px]">
                          <div className="flex items-center gap-1">
                            <Input
                              value={header}
                              onChange={(e) => updateHeader(i, e.target.value)}
                              className="h-7 text-xs font-semibold"
                            />
                            {sheetData.headers.length > 1 && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 shrink-0"
                                onClick={() => removeColumn(i)}
                              >
                                <MinusCircle className="w-3 h-3 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sheetData.rows.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {row.map((cell, colIndex) => (
                          <TableCell key={colIndex} className="p-1">
                            <Input
                              value={cell}
                              onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                              className="h-8 text-xs"
                            />
                          </TableCell>
                        ))}
                        <TableCell className="p-1">
                          {sheetData.rows.length > 1 && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => removeRow(rowIndex)}
                            >
                              <MinusCircle className="w-3 h-3 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={resetForm}>Cancel</Button>
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" /> Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {sheets.map((sheet) => (
            <div
              key={sheet.id}
              className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer group"
              onClick={() => setViewingSheet(sheet)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Table2 className="w-4 h-4 text-green-500 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{sheet.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(sheet.updated_at), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); openEdit(sheet); }}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); handleDelete(sheet.id); }}
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {sheets.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">
              No sheets yet. Create your first one!
            </p>
          )}
        </div>
      </ScrollArea>

      {/* View Dialog */}
      <Dialog open={!!viewingSheet} onOpenChange={() => setViewingSheet(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Table2 className="w-5 h-5 text-green-500" />
              {viewingSheet?.title}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {viewingSheet && (() => {
              const data = parseSheetContent(viewingSheet.content);
              return (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {data.headers.map((h, i) => (
                        <TableHead key={i} className="font-semibold">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rows.map((row, ri) => (
                      <TableRow key={ri}>
                        {row.map((cell, ci) => (
                          <TableCell key={ci}>{cell || "-"}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              );
            })()}
          </ScrollArea>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => viewingSheet && openEdit(viewingSheet)}>
              <Edit2 className="w-4 h-4 mr-2" /> Edit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
