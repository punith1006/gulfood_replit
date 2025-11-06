import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Clock, Calendar as CalendarIcon } from "lucide-react";
import { format, addDays, isBefore, startOfDay } from "date-fns";

interface AppointmentSlotPickerProps {
  onSlotSelected: (date: Date, time: string) => void;
  onCancel: () => void;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

export default function AppointmentSlotPicker({ onSlotSelected, onCancel }: AppointmentSlotPickerProps) {
  const today = startOfDay(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const { data: slotsData, isLoading } = useQuery<{ slots: TimeSlot[] }>({
    queryKey: ["/api/appointments/available-slots", format(selectedDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const response = await fetch(
        `/api/appointments/available-slots?date=${format(selectedDate, "yyyy-MM-dd")}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch available slots");
      }
      return response.json();
    },
    enabled: !!selectedDate
  });

  const handleConfirm = () => {
    if (selectedDate && selectedTime) {
      // Parse the time string (HH:MM format in Dubai timezone)
      const [hours, minutes] = selectedTime.split(':').map(Number);
      
      // Create a date string in Dubai timezone (ISO format)
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
      
      // This creates an ISO string that represents the Dubai time
      // We'll pass both the formatted string and timezone to the parent
      const dubaiDateTimeStr = `${year}-${month}-${day}T${timeStr}+04:00`; // Gulf Standard Time (GST) is UTC+4
      const dubaiDate = new Date(dubaiDateTimeStr);
      
      onSlotSelected(dubaiDate, selectedTime);
    }
  };

  const availableSlots = slotsData?.slots.filter(s => s.available) || [];
  const hasAvailableSlots = availableSlots.length > 0;

  return (
    <Card className="p-6 space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Schedule Your Consultation
        </h3>
        <p className="text-sm text-muted-foreground">
          Select a convenient date and time for a 30-minute consultation with our sales team
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Date</label>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date) {
                setSelectedDate(date);
                setSelectedTime(null);
              }
            }}
            disabled={(date) => isBefore(date, today)}
            className="rounded-md border"
            data-testid="calendar-appointment"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Available Time Slots
          </label>
          
          {isLoading ? (
            <div className="flex items-center justify-center h-[300px]">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !hasAvailableSlots ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-center">
              <Clock className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No available slots for this date
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Please select another date
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[300px] rounded-md border p-2">
              <div className="grid grid-cols-2 gap-2">
                {availableSlots.map((slot) => (
                  <Button
                    key={slot.time}
                    variant={selectedTime === slot.time ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTime(slot.time)}
                    className="justify-center"
                    data-testid={`button-slot-${slot.time}`}
                  >
                    {slot.time}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2 border-t">
        <Button
          variant="outline"
          onClick={onCancel}
          data-testid="button-cancel-appointment"
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!selectedDate || !selectedTime}
          data-testid="button-confirm-appointment"
        >
          Confirm Appointment
        </Button>
      </div>
    </Card>
  );
}
