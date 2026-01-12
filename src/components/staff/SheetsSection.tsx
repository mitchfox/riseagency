import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Table2, Trash2, Edit2, Save, PlusCircle, MinusCircle, ArrowLeft } from "lucide-react";
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

export const SheetsSection = () => {
  const [sheets, setSheets] = useState<StaffSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSheet, setSelectedSheet] = useState<StaffSheet | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
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
      if (selectedSheet && !isCreating) {
        const { error } = await supabase
          .from("staff_documents")
          .update({ title, content, updated_at: new Date().toISOString() })
          .eq("id", selectedSheet.id);
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
      setSelectedSheet(null);
      setIsEditing(false);
      fetchSheets();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const resetForm = () => {
    setTitle("");
    setSheetData({ headers: ["Column 1", "Column 2", "Column 3"], rows: [["", "", ""]] });
    setSelectedSheet(null);
    setIsEditing(false);
    setIsCreating(false);
  };

  const openSheet = (sheet: StaffSheet) => {
    setSelectedSheet(sheet);
    setTitle(sheet.title);
    setSheetData(parseSheetContent(sheet.content));
    setIsEditing(false);
    setIsCreating(false);
  };

  const startEditing = () => {
    setIsEditing(true);
  };

  const startCreating = () => {
    setTitle("");
    setSheetData({ headers: ["Column 1", "Column 2", "Column 3"], rows: [["", "", ""]] });
    setSelectedSheet(null);
    setIsCreating(true);
    setIsEditing(true);
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
    return <div className="p-8 text-muted-foreground">Loading...</div>;
  }

  // Show sheet editor/viewer
  if (selectedSheet || isCreating) {
    const currentData = isCreating ? sheetData : (selectedSheet ? parseSheetContent(selectedSheet.content) : sheetData);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={resetForm} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Sheets
          </Button>
          <div className="flex gap-2">
            {!isEditing && selectedSheet && (
              <>
                <Button variant="outline" onClick={startEditing}>
                  <Edit2 className="w-4 h-4 mr-2" /> Edit
                </Button>
                <Button variant="destructive" onClick={() => handleDelete(selectedSheet.id)}>
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </Button>
              </>
            )}
            {isEditing && (
              <>
                <Button variant="ghost" onClick={resetForm}>Cancel</Button>
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" /> Save
                </Button>
              </>
            )}
          </div>
        </div>

        {isEditing ? (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Input
                placeholder="Sheet title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg font-semibold"
              />

              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={addColumn}>
                  <PlusCircle className="w-3 h-3 mr-1" /> Column
                </Button>
                <Button size="sm" variant="outline" onClick={addRow}>
                  <PlusCircle className="w-3 h-3 mr-1" /> Row
                </Button>
              </div>

              <ScrollArea className="max-h-[60vh] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {sheetData.headers.map((header, i) => (
                        <TableHead key={i} className="min-w-[150px]">
                          <div className="flex items-center gap-1">
                            <Input
                              value={header}
                              onChange={(e) => updateHeader(i, e.target.value)}
                              className="h-8 text-sm font-semibold"
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
                              className="h-9 text-sm"
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
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Table2 className="w-6 h-6 text-green-500" />
                    {selectedSheet?.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    Last updated: {selectedSheet && format(new Date(selectedSheet.updated_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[60vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {currentData.headers.map((h, i) => (
                        <TableHead key={i} className="font-semibold bg-muted/50">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentData.rows.map((row, ri) => (
                      <TableRow key={ri}>
                        {row.map((cell, ci) => (
                          <TableCell key={ci}>{cell || "-"}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Show sheets list
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {sheets.length} sheet{sheets.length !== 1 ? 's' : ''}
        </span>

        <Button onClick={startCreating} className="gap-2">
          <Plus className="w-4 h-4" /> New Sheet
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sheets.map((sheet) => {
          const data = parseSheetContent(sheet.content);
          return (
            <Card
              key={sheet.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => openSheet(sheet)}
            >
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Table2 className="w-8 h-8 text-green-500 shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{sheet.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(sheet.updated_at), "MMM d, yyyy")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {data.headers.length} columns • {data.rows.length} rows
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {sheets.length === 0 && (
        <div className="text-center py-12">
          <Table2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No sheets yet</p>
          <Button onClick={startCreating} className="mt-4 gap-2">
            <Plus className="w-4 h-4" /> Create your first sheet
          </Button>
        </div>
      )}
    </div>
  );
};