import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Trash2, Plus, Clock } from "lucide-react";
import { StaffSchedule } from "./StaffSchedule";

interface AvailabilitySlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  notes: string | null;
}

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export const StaffAvailabilityManagement = ({ isAdmin }: { isAdmin: boolean }) => {
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSlot, setNewSlot] = useState({
    day_of_week: 1,
    start_time: "09:00",
    end_time: "17:00",
    notes: "",
  });

  useEffect(() => {
    fetchAvailability();
  }, []);

  const fetchAvailability = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("staff_availability")
        .select("*")
        .eq("staff_id", user.id)
        .order("day_of_week")
        .order("start_time");

      if (error) throw error;
      setAvailabilitySlots(data || []);
    } catch (error) {
      console.error("Error fetching availability:", error);
      toast.error("Failed to load availability");
    } finally {
      setLoading(false);
    }
  };

  const addAvailability = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("staff_availability")
        .insert({
          staff_id: user.id,
          day_of_week: newSlot.day_of_week,
          start_time: newSlot.start_time,
          end_time: newSlot.end_time,
          notes: newSlot.notes || null,
        });

      if (error) throw error;
      
      toast.success("Availability added");
      fetchAvailability();
      setNewSlot({
        day_of_week: 1,
        start_time: "09:00",
        end_time: "17:00",
        notes: "",
      });
    } catch (error) {
      console.error("Error adding availability:", error);
      toast.error("Failed to add availability");
    }
  };

  const deleteAvailability = async (id: string) => {
    try {
      const { error } = await supabase
        .from("staff_availability")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Availability removed");
      fetchAvailability();
    } catch (error) {
      console.error("Error deleting availability:", error);
      toast.error("Failed to delete availability");
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading availability...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Calendar View */}
      <StaffSchedule isAdmin={isAdmin} />

      {/* Availability Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Your Availability Hours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add New Availability */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <h3 className="font-semibold">Add Availability</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Day</Label>
                <Select
                  value={newSlot.day_of_week.toString()}
                  onValueChange={(value) =>
                    setNewSlot({ ...newSlot, day_of_week: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={newSlot.start_time}
                  onChange={(e) =>
                    setNewSlot({ ...newSlot, start_time: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={newSlot.end_time}
                  onChange={(e) =>
                    setNewSlot({ ...newSlot, end_time: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Input
                  placeholder="e.g., Remote only"
                  value={newSlot.notes}
                  onChange={(e) =>
                    setNewSlot({ ...newSlot, notes: e.target.value })
                  }
                />
              </div>
            </div>
            <Button onClick={addAvailability} className="w-full md:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Availability
            </Button>
          </div>

          {/* Current Availability Slots */}
          <div className="space-y-2">
            <h3 className="font-semibold">Current Availability</h3>
            {availabilitySlots.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No availability hours set. Add your first slot above.
              </p>
            ) : (
              <div className="space-y-2">
                {DAYS.map((day) => {
                  const daySlots = availabilitySlots.filter(
                    (slot) => slot.day_of_week === day.value
                  );
                  if (daySlots.length === 0) return null;

                  return (
                    <div key={day.value} className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-2">{day.label}</h4>
                      <div className="space-y-2">
                        {daySlots.map((slot) => (
                          <div
                            key={slot.id}
                            className="flex items-center justify-between p-2 bg-muted/50 rounded"
                          >
                            <div className="flex-1">
                              <div className="font-medium">
                                {slot.start_time} - {slot.end_time}
                              </div>
                              {slot.notes && (
                                <div className="text-sm text-muted-foreground">
                                  {slot.notes}
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteAvailability(slot.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
