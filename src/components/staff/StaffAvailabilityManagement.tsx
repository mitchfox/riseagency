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
  availability_date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
}

export const StaffAvailabilityManagement = ({ isAdmin }: { isAdmin: boolean }) => {
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Get next 7 days for default date
  const getDefaultDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };
  
  const [newSlot, setNewSlot] = useState({
    availability_date: getDefaultDate(),
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
        .order("availability_date")
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
          availability_date: newSlot.availability_date,
          start_time: newSlot.start_time,
          end_time: newSlot.end_time,
          notes: newSlot.notes || null,
        });

      if (error) throw error;
      
      toast.success("Availability added");
      fetchAvailability();
      setNewSlot({
        availability_date: getDefaultDate(),
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
                <Label>Date</Label>
                <Input
                  type="date"
                  value={newSlot.availability_date}
                  onChange={(e) =>
                    setNewSlot({ ...newSlot, availability_date: e.target.value })
                  }
                  min={new Date().toISOString().split('T')[0]}
                />
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
                {availabilitySlots.map((slot) => {
                  const date = new Date(slot.availability_date);
                  const formattedDate = date.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  });

                  return (
                    <div key={slot.id} className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-2">{formattedDate}</h4>
                      <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
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
