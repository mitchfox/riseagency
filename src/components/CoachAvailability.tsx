import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

interface AvailabilitySlot {
  id: string;
  availability_date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  staff_name: string | null;
}

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
          availability_date,
          start_time,
          end_time,
          notes,
          staff_id
        `)
        .order("availability_date")
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
        staff_name: profilesData?.find(p => p.id === slot.staff_id)?.full_name || "Jolon"
      })) || [];

      setAvailability(combinedData);
    } catch (error) {
      console.error("Error fetching availability:", error);
    } finally {
      setLoading(false);
    }
  };

  // Format time to 12-hour format (e.g., "6pm")
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'pm' : 'am';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return minutes === '00' ? `${displayHour}${ampm}` : `${displayHour}:${minutes}${ampm}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full max-h-screen h-screen overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl">
            <Calendar className="h-6 w-6" />
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
          <div className="space-y-4 sm:space-y-6">
            {/* Group by date */}
            {Array.from(new Set(availability.map(s => s.availability_date))).map((date) => {
              const dateSlots = availability.filter(slot => slot.availability_date === date);
              const dateObj = new Date(date + 'T00:00:00');
              const formattedDate = format(dateObj, "EEEE (dd/MM)");

              return (
                <Card key={date}>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-lg sm:text-xl mb-4">{formattedDate}</h3>
                    <div className="space-y-3">
                      {dateSlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="p-4 bg-muted/30 rounded-lg"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <Clock className="h-5 w-5 text-primary flex-shrink-0" />
                            <div className="font-semibold text-base">{slot.staff_name}</div>
                          </div>
                          <div className="ml-8">
                            <div className="text-sm sm:text-base font-medium">
                              {formatTime(slot.start_time)} - {formatTime(slot.end_time)} GMT
                            </div>
                            {slot.notes && (
                              <div className="text-sm text-muted-foreground mt-2">
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

        <div className="flex justify-end mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} size="lg">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
