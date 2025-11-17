import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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
            {/* Group by date */}
            {Array.from(new Set(availability.map(s => s.availability_date))).map((date) => {
              const dateSlots = availability.filter(slot => slot.availability_date === date);
              const formattedDate = new Date(date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              });

              return (
                <Card key={date}>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-lg mb-3">{formattedDate}</h3>
                    <div className="space-y-2">
                      {dateSlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
                        >
                          <Clock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="font-semibold">{slot.staff_name}</div>
                            <div className="text-sm">
                              {slot.start_time} - {slot.end_time}
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
