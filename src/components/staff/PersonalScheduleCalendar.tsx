import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, addDays, startOfWeek, startOfMonth, isSameDay, parseISO, addWeeks, addMonths, getDaysInMonth, getDay } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight, Plus, Trash2, Clock, X, Maximize2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface CalendarEvent {
  id: string;
  staff_id: string;
  event_date: string;
  title: string;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  event_type: string;
  is_ongoing: boolean | null;
  category: string | null;
  day_of_week: number | null;
}

const EVENT_CATEGORIES = [
  { value: 'work', label: 'Work', color: 'hsl(43, 49%, 61%)' },
  { value: 'personal', label: 'Personal', color: 'hsl(200, 70%, 50%)' },
  { value: 'meeting', label: 'Meeting', color: 'hsl(280, 60%, 55%)' },
  { value: 'training', label: 'Training', color: 'hsl(140, 60%, 45%)' },
];

interface PersonalScheduleCalendarProps {
  isFullscreen?: boolean;
  onFullscreenToggle?: () => void;
  showFullscreenButton?: boolean;
}

type ViewMode = 'week' | 'month';

export const PersonalScheduleCalendar = ({ 
  isFullscreen = false, 
  onFullscreenToggle,
  showFullscreenButton = true 
}: PersonalScheduleCalendarProps) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const isMobile = useIsMobile();

  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    is_ongoing: false,
    category: "work",
  });

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchEvents();
    }
  }, [userId]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
    }
    setLoading(false);
  };

  const fetchEvents = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('staff_calendar_events')
        .select('*')
        .eq('staff_id', userId)
        .order('event_date')
        .order('start_time');

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const addEvent = async () => {
    if (!userId || !newEvent.title.trim() || !selectedDate) {
      toast.error("Please enter a title");
      return;
    }

    try {
      const { error } = await supabase
        .from('staff_calendar_events')
        .insert({
          staff_id: userId,
          event_date: format(selectedDate, 'yyyy-MM-dd'),
          title: newEvent.title.trim(),
          description: newEvent.description || null,
          start_time: newEvent.start_time || null,
          end_time: newEvent.end_time || null,
          is_ongoing: newEvent.is_ongoing,
          category: newEvent.category,
        });

      if (error) throw error;
      
      toast.success("Event added");
      fetchEvents();
      setShowAddEvent(false);
      setNewEvent({
        title: "",
        description: "",
        start_time: "",
        end_time: "",
        is_ongoing: false,
        category: "work",
      });
    } catch (error) {
      console.error("Error adding event:", error);
      toast.error("Failed to add event");
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('staff_calendar_events')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success("Event removed");
      fetchEvents();
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  };

  const generateCalendarWeeks = () => {
    const today = new Date();
    
    if (viewMode === 'month') {
      // Month view: show all weeks of the current month
      const currentMonth = addMonths(startOfMonth(today), weekOffset);
      const daysInMonth = getDaysInMonth(currentMonth);
      const firstDayOfMonth = getDay(currentMonth);
      // Adjust for Monday start (0 = Monday, 6 = Sunday)
      const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
      
      const weeks = [];
      const monthStart = startOfWeek(currentMonth, { weekStartsOn: 1 });
      const numWeeks = Math.ceil((daysInMonth + adjustedFirstDay) / 7);
      
      for (let i = 0; i < numWeeks; i++) {
        weeks.push(addDays(monthStart, i * 7));
      }
      return weeks;
    } else {
      // Week view: show 2 or 4 weeks
      const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
      const offsetWeekStart = addWeeks(currentWeekStart, weekOffset * (isFullscreen ? 4 : 2));
      const weeks = [];
      const numWeeks = isFullscreen ? 4 : 2;

      for (let i = 0; i < numWeeks; i++) {
        const weekStart = addDays(offsetWeekStart, i * 7);
        weeks.push(weekStart);
      }
      return weeks;
    }
  };
  
  const getNavigationLabel = () => {
    if (viewMode === 'month') {
      const currentMonth = addMonths(startOfMonth(new Date()), weekOffset);
      return format(currentMonth, 'MMMM yyyy');
    } else {
      if (weekOffset === 0) return 'This week';
      const multiplier = isFullscreen ? 4 : 2;
      return weekOffset > 0 
        ? `${weekOffset * multiplier} weeks ahead` 
        : `${Math.abs(weekOffset * multiplier)} weeks ago`;
    }
  };

  const getEventsForDay = (date: Date): CalendarEvent[] => {
    const currentDayOfWeek = date.getDay();
    return events.filter(event => {
      if (event.is_ongoing && event.day_of_week !== null) {
        return event.day_of_week === currentDayOfWeek;
      }
      if (event.is_ongoing && event.day_of_week === null) {
        return true;
      }
      return isSameDay(parseISO(event.event_date), date);
    });
  };

  const getCategoryColor = (category: string | null): string => {
    const cat = EVENT_CATEGORIES.find(c => c.value === category);
    return cat?.color || 'hsl(43, 49%, 61%)';
  };

  const calendarWeeks = generateCalendarWeeks();

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setShowAddEvent(true);
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Loading schedule...
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Please log in to view your schedule
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${isFullscreen ? 'h-full flex flex-col' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setWeekOffset(weekOffset - 1)} 
            size="sm" 
            variant="outline"
            className={isMobile ? "h-7 w-7 p-0" : ""}
          >
            <ChevronLeft className={isMobile ? "w-3 h-3" : "w-4 h-4"} />
          </Button>
          <p className={`text-muted-foreground min-w-[100px] text-center ${isMobile ? "text-xs" : ""}`}>
            {getNavigationLabel()}
          </p>
          <Button 
            onClick={() => setWeekOffset(weekOffset + 1)} 
            size="sm" 
            variant="outline"
            className={isMobile ? "h-7 w-7 p-0" : ""}
          >
            <ChevronRight className={isMobile ? "w-3 h-3" : "w-4 h-4"} />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex rounded-md border border-border overflow-hidden">
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              className={`h-7 px-2 text-xs rounded-none ${viewMode === 'week' ? '' : 'hover:bg-muted'}`}
              onClick={() => { setViewMode('week'); setWeekOffset(0); }}
            >
              Week
            </Button>
            <Button
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              className={`h-7 px-2 text-xs rounded-none ${viewMode === 'month' ? '' : 'hover:bg-muted'}`}
              onClick={() => { setViewMode('month'); setWeekOffset(0); }}
            >
              Month
            </Button>
          </div>
          
          {!isFullscreen && (
            <Button 
              onClick={() => {
                setSelectedDate(new Date());
                setShowAddEvent(true);
              }} 
              size="sm" 
              variant="secondary"
              className={isMobile ? "h-7 px-2" : ""}
            >
              <Plus className={isMobile ? "w-3 h-3" : "w-4 h-4 mr-1"} />
              {!isMobile && "Add"}
            </Button>
          )}
          
          {showFullscreenButton && onFullscreenToggle && (
            <Button 
              onClick={onFullscreenToggle} 
              size="sm" 
              variant="outline"
              className={isMobile ? "h-7 w-7 p-0" : ""}
            >
              <Maximize2 className={isMobile ? "w-3 h-3" : "w-4 h-4"} />
            </Button>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className={`${isFullscreen ? 'flex-1 overflow-auto' : ''}`}>
        <div className={isMobile && !isFullscreen ? "w-full" : "min-w-[600px]"}>
          {/* Header Row */}
          <div className="grid grid-cols-8 gap-1 mb-1">
            <div 
              className="p-2 text-center font-bebas uppercase text-xs rounded"
              style={{ 
                backgroundColor: 'hsl(43, 49%, 61%)',
                color: 'hsl(0, 0%, 0%)'
              }}
            >
              Week
            </div>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div 
                key={day}
                className="p-2 text-center font-bebas uppercase text-xs rounded"
                style={{ 
                  backgroundColor: 'hsl(43, 49%, 61%)',
                  color: 'hsl(0, 0%, 0%)'
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Week Rows */}
          <div className="space-y-1">
            {calendarWeeks.map((weekStart, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-8 gap-1">
                {/* Week Start Cell */}
                <div 
                  className="p-2 rounded flex flex-col items-center justify-center border"
                  style={{ 
                    backgroundColor: 'hsl(43, 49%, 61%)',
                    color: 'hsl(0, 0%, 0%)',
                    borderColor: 'rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <div className="text-lg font-bold">
                    {format(weekStart, 'd')}
                  </div>
                  <div className="text-[10px] font-medium">
                    {format(weekStart, 'MMM')}
                  </div>
                </div>

                {/* Day Cells */}
                {[0, 1, 2, 3, 4, 5, 6].map((dayOffset) => {
                  const currentDate = addDays(weekStart, dayOffset);
                  const dayEvents = getEventsForDay(currentDate);
                  const isToday = isSameDay(currentDate, new Date());
                  const dayKey = `${weekIndex}-${dayOffset}`;
                  const isExpanded = expandedDays.has(dayKey);
                  
                  const displayEvents = isExpanded ? dayEvents : dayEvents.slice(0, 2);
                  const remainingCount = dayEvents.length - 2;

                  return (
                    <div 
                      key={dayOffset}
                      onClick={() => handleDayClick(currentDate)}
                      className={`p-1 rounded ${isFullscreen ? 'min-h-[80px]' : 'min-h-[50px]'} relative border transition-all cursor-pointer hover:border-primary/50`}
                      style={{ 
                        backgroundColor: 'hsl(0, 0%, 10%)',
                        borderColor: isToday ? 'hsl(43, 49%, 61%)' : 'rgba(255, 255, 255, 0.1)',
                        borderWidth: isToday ? '2px' : '1px'
                      }}
                    >
                      {/* Day number */}
                      <span 
                        className="absolute top-0.5 right-0.5 text-[9px] opacity-40"
                        style={{ color: 'hsl(0, 0%, 100%)' }}
                      >
                        {format(currentDate, 'd')}
                      </span>

                      {/* Events */}
                      {dayEvents.length > 0 && (
                        <div className="flex flex-col gap-0.5 mt-3">
                          {displayEvents.map((event, idx) => (
                            <div 
                              key={event.id}
                              className="text-[9px] p-1 rounded group relative"
                              style={{ 
                                backgroundColor: getCategoryColor(event.category),
                                color: 'hsl(0, 0%, 0%)'
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="font-bold truncate pr-3 flex items-center gap-0.5">
                                {event.is_ongoing && <span className="text-[7px]">🔄</span>}
                                {event.title}
                              </div>
                              {event.start_time && (
                                <div className="text-[8px] opacity-75">
                                  {event.start_time}
                                </div>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteEvent(event.id);
                                }}
                                className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-2.5 w-2.5 text-destructive" />
                              </button>
                            </div>
                          ))}
                          
                          {/* Show more button */}
                          {!isExpanded && remainingCount > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedDays(prev => new Set([...prev, dayKey]));
                              }}
                              className="text-[8px] p-0.5 rounded font-bold transition-all hover:scale-105"
                              style={{ 
                                backgroundColor: 'hsl(0, 0%, 20%)',
                                color: 'hsl(0, 0%, 80%)'
                              }}
                            >
                              +{remainingCount} more
                            </button>
                          )}
                          
                          {/* Collapse button */}
                          {isExpanded && dayEvents.length > 2 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedDays(prev => {
                                  const next = new Set(prev);
                                  next.delete(dayKey);
                                  return next;
                                });
                              }}
                              className="text-[8px] p-0.5 rounded font-bold"
                              style={{ 
                                backgroundColor: 'hsl(0, 0%, 20%)',
                                color: 'hsl(0, 0%, 80%)'
                              }}
                            >
                              Show less
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Event Dialog */}
      <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Add Event {selectedDate && `- ${format(selectedDate, 'MMM d, yyyy')}`}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="Event title"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={newEvent.category}
                  onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })}
                >
                  {EVENT_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  placeholder="Optional notes"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={newEvent.start_time}
                  onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={newEvent.end_time}
                  onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_ongoing_personal"
                checked={newEvent.is_ongoing}
                onChange={(e) => setNewEvent({ ...newEvent, is_ongoing: e.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="is_ongoing_personal" className="cursor-pointer">
                Recurring (shows every day)
              </Label>
            </div>
            
            <Button onClick={addEvent} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
