import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { t } from "@/lib/portalTranslations";

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
  portalLanguage?: string | null;
}

export const CoachAvailability = ({ open, onOpenChange, portalLanguage }: CoachAvailabilityProps) => {
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
      // Pull the auto-calculated 09:00–21:00 free windows minus busy blocks.
      // The RPC purposefully omits item titles/notes so players never see what staff are doing.
      const { data, error } = await (supabase as any)
        .rpc("get_player_visible_availability", { _player_id: null });
      if (error) throw error;
      const mapped: AvailabilitySlot[] = (data || []).map((row: any, idx: number) => ({
        id: `${row.staff_id}_${row.availability_date}_${row.start_time}_${idx}`,
        availability_date: row.availability_date,
        start_time: row.start_time,
        end_time: row.end_time,
        notes: null,
        staff_name: row.staff_name || "Coach",
      }));
      setAvailability(mapped);
    } catch (error) {
      console.error("Error fetching availability:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'pm' : 'am';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return minutes === '00' ? `${displayHour}${ampm}` : `${displayHour}:${minutes}${ampm}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-screen h-screen max-w-none p-6 flex flex-col">
        <DialogHeader className="mb-4">
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Calendar className="h-6 w-6" />
            {t(portalLanguage, "coach_availability")}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-4">{t(portalLanguage, "loading")}</div>
        ) : availability.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            {t(portalLanguage, "no_upcoming_fixtures")}
          </div>
        ) : (
          <div className="space-y-2 flex-1 overflow-y-auto">
            {Array.from(new Set(availability.map(s => s.availability_date))).map((date) => {
              const dateSlots = availability.filter(slot => slot.availability_date === date);
              const dateObj = new Date(date + 'T00:00:00');
              const formattedDate = format(dateObj, "EEEE (dd/MM)");

              return (
                <div key={date} className="border border-border rounded-lg p-3">
                  <div className="flex items-start gap-6">
                    <div className="font-semibold text-base min-w-[140px]">{formattedDate}</div>
                    <div className="flex-1 flex flex-wrap gap-4">
                      {dateSlots.map((slot) => (
                        <div key={slot.id} className="bg-muted/30 rounded px-3 py-2">
                          <div className="font-medium">{slot.staff_name}</div>
                          <div className="text-sm">
                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)} GMT
                          </div>
                          {slot.notes && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {slot.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t(portalLanguage, "close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
