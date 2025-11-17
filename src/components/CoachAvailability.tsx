import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface AvailabilitySlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  notes: string | null;
  staff_name: string | null;
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

interface CoachAvailabilityProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CoachAvailability = ({ open, onOpenChange }: CoachAvailabilityProps) => {
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchAvailability();
    }
  }, [open]);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      
      // Fetch all staff availability
      const { data: availabilityData, error: availabilityError } = await supabase
        .from("staff_availability")
        .select(`
          id,
          day_of_week,
          start_time,
          end_time,
          notes,
          staff_id
        `)
        .order("day_of_week")
        .order("start_time");

      if (availabilityError) throw availabilityError;

      // Get staff names
      const staffIds = [...new Set(availabilityData?.map(a => a.staff_id) || [])];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", staffIds);

      // Combine data
      const combinedData = availabilityData?.map(slot => ({
        ...slot,
        staff_name: profilesData?.find(p => p.id === slot.staff_id)?.full_name || "Staff Member"
      })) || [];

      setAvailability(combinedData);
    } catch (error) {
      console.error("Error fetching availability:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Coach Availability
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">Loading availability...</div>
        ) : availability.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No coach availability set yet.
          </div>
        ) : (
          <div className="space-y-4">
            {DAYS.map((day) => {
              const daySlots = availability.filter(
                (slot) => slot.day_of_week === day.value
              );
              
              if (daySlots.length === 0) return null;

              return (
                <Card key={day.value}>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-lg mb-3">{day.label}</h3>
                    <div className="space-y-2">
                      {daySlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
                        >
                          <Clock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="font-medium">
                              {slot.start_time} - {slot.end_time}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {slot.staff_name}
                            </div>
                            {slot.notes && (
                              <div className="text-sm text-muted-foreground mt-1">
                                {slot.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
