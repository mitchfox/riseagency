import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X } from "lucide-react";

interface ClipNameEditorProps {
  initialName: string;
  videoUrl: string;
  onRename: (newName: string) => void;
}

export const ClipNameEditor = ({ initialName, videoUrl, onRename }: ClipNameEditorProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(initialName);

  const handleSave = () => {
    if (editedName.trim() && editedName !== initialName) {
      onRename(editedName);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedName(initialName);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={editedName}
          onChange={(e) => setEditedName(e.target.value)}
          className="h-8"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleSave}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleCancel}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <a 
        href={videoUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-primary hover:underline font-medium"
      >
        {initialName}
      </a>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={() => setIsEditing(true)}
      >
        <Pencil className="h-3 w-3" />
      </Button>
    </div>
  );
};
