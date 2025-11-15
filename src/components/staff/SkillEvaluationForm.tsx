import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { SkillEvaluation, SKILL_GRADES } from "@/data/scoutingSkills";

interface SkillEvaluationFormProps {
  skillEvaluations: SkillEvaluation[];
  onChange: (evaluations: SkillEvaluation[]) => void;
}

export const SkillEvaluationForm = ({ skillEvaluations, onChange }: SkillEvaluationFormProps) => {
  const [activeNote, setActiveNote] = useState<{ skillIndex: number; note: string }>({ skillIndex: -1, note: "" });

  const domains = ["Physical", "Psychological", "Technical", "Tactical"] as const;

  const updateGrade = (skillIndex: number, grade: string) => {
    const updated = [...skillEvaluations];
    updated[skillIndex].grade = grade;
    onChange(updated);
  };

  const addNote = (skillIndex: number) => {
    if (!activeNote.note.trim()) return;
    
    const updated = [...skillEvaluations];
    updated[skillIndex].notes = [...updated[skillIndex].notes, activeNote.note.trim()];
    onChange(updated);
    setActiveNote({ skillIndex: -1, note: "" });
  };

  const removeNote = (skillIndex: number, noteIndex: number) => {
    const updated = [...skillEvaluations];
    updated[skillIndex].notes = updated[skillIndex].notes.filter((_, i) => i !== noteIndex);
    onChange(updated);
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith("A")) return "bg-green-500/20 text-green-700 border-green-500/50";
    if (grade.startsWith("B")) return "bg-blue-500/20 text-blue-700 border-blue-500/50";
    if (grade.startsWith("C")) return "bg-yellow-500/20 text-yellow-700 border-yellow-500/50";
    return "bg-red-500/20 text-red-700 border-red-500/50";
  };

  return (
    <div className="space-y-6">
      {domains.map((domain) => {
        const domainSkills = skillEvaluations.filter(s => s.domain === domain);
        
        return (
          <Card key={domain} className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{domain}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {domainSkills.map((skill) => {
                const skillIndex = skillEvaluations.findIndex(s => 
                  s.domain === skill.domain && s.skill_name === skill.skill_name
                );
                
                return (
                  <div key={skill.skill_name} className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm">{skill.skill_name}</h4>
                          {skill.grade && (
                            <Badge variant="outline" className={getGradeColor(skill.grade)}>
                              {skill.grade}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {skill.description}
                        </p>
                      </div>
                      
                      <div className="w-24 shrink-0">
                        <Select
                          value={skill.grade}
                          onValueChange={(value) => updateGrade(skillIndex, value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Grade" />
                          </SelectTrigger>
                          <SelectContent>
                            {SKILL_GRADES.map((grade) => (
                              <SelectItem key={grade} value={grade} className="text-xs">
                                {grade}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Notes section */}
                    {skill.notes.length > 0 && (
                      <div className="space-y-2 mt-3">
                        {skill.notes.map((note, noteIndex) => (
                          <div key={noteIndex} className="flex items-start gap-2 text-xs bg-background/50 p-2 rounded border border-border/30">
                            <span className="flex-1">{note}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 shrink-0"
                              onClick={() => removeNote(skillIndex, noteIndex)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add note input */}
                    {activeNote.skillIndex === skillIndex ? (
                      <div className="space-y-2 mt-3">
                        <Textarea
                          value={activeNote.note}
                          onChange={(e) => setActiveNote({ skillIndex, note: e.target.value })}
                          placeholder="Add observation note..."
                          className="text-xs min-h-[60px]"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => addNote(skillIndex)}
                            disabled={!activeNote.note.trim()}
                          >
                            Save Note
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setActiveNote({ skillIndex: -1, note: "" })}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveNote({ skillIndex, note: "" })}
                        className="mt-2 h-7 text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Note
                      </Button>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
