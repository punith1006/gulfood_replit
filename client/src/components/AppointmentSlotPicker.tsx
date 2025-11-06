import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, Clock, Calendar as CalendarIcon, ArrowLeft, User } from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";

interface AppointmentSlotPickerProps {
  onSlotSelected: (bookingData: {
    scheduledTime: Date;
    name: string;
    email: string;
    organization: string;
    role: string;
    meetingPurpose: string;
  }) => void;
  onCancel: () => void;
  leadData?: {
    name?: string;
    email?: string;
  };
}

interface TimeSlot {
  time: string;
  available: boolean;
}

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  organization: z.string().min(1, "Organization is required"),
  role: z.string().min(1, "Role is required"),
  meetingPurpose: z.string().min(10, "Please provide at least 10 characters describing your meeting purpose"),
});

type FormData = z.infer<typeof formSchema>;

export default function AppointmentSlotPicker({ onSlotSelected, onCancel, leadData }: AppointmentSlotPickerProps) {
  const today = startOfDay(new Date());
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: leadData?.name || "",
      email: leadData?.email || "",
      organization: "",
      role: "",
      meetingPurpose: "",
    },
  });

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

  const handleNextStep = () => {
    if (selectedDate && selectedTime) {
      setCurrentStep(2);
    }
  };

  const handleBackStep = () => {
    setCurrentStep(1);
  };

  const onSubmit = (data: FormData) => {
    if (selectedDate && selectedTime) {
      // Parse the time string (HH:MM format in Dubai timezone)
      const [hours, minutes] = selectedTime.split(':').map(Number);
      
      // Create a date string in Dubai timezone (ISO format)
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
      
      // This creates an ISO string that represents the Dubai time
      const dubaiDateTimeStr = `${year}-${month}-${day}T${timeStr}+04:00`; // Gulf Standard Time (GST) is UTC+4
      const dubaiDate = new Date(dubaiDateTimeStr);
      
      onSlotSelected({
        scheduledTime: dubaiDate,
        name: data.name,
        email: data.email,
        organization: data.organization,
        role: data.role,
        meetingPurpose: data.meetingPurpose,
      });
    }
  };

  const availableSlots = slotsData?.slots.filter(s => s.available) || [];
  const hasAvailableSlots = availableSlots.length > 0;

  return (
    <Card className="p-6 space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            {currentStep === 1 ? (
              <>
                <CalendarIcon className="h-5 w-5" />
                Schedule Your Consultation
              </>
            ) : (
              <>
                <User className="h-5 w-5" />
                Your Details
              </>
            )}
          </h3>
          <span className="text-sm text-muted-foreground">
            Step {currentStep} of 2
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {currentStep === 1
            ? "Select a convenient date and time for a 30-minute consultation with our sales team"
            : "Please provide your details to complete the booking"}
        </p>
      </div>

      {currentStep === 1 ? (
        <>
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
              onClick={handleNextStep}
              disabled={!selectedDate || !selectedTime}
              data-testid="button-next-step"
            >
              Next
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <p className="text-sm">
              <span className="font-medium">Selected Time:</span>{" "}
              {format(selectedDate, "MMMM d, yyyy")} at {selectedTime}
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Your full name"
                        {...field}
                        data-testid="input-appointment-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="your.email@company.com"
                        {...field}
                        data-testid="input-appointment-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="organization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Your company or organization"
                        {...field}
                        data-testid="input-appointment-organization"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Your job title or role"
                        {...field}
                        data-testid="input-appointment-role"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="meetingPurpose"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meeting Purpose *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us what you'd like to discuss..."
                        className="resize-none"
                        rows={4}
                        {...field}
                        data-testid="input-appointment-purpose"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 justify-between pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBackStep}
                  data-testid="button-back-step"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    data-testid="button-cancel-appointment-step2"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    data-testid="button-confirm-booking"
                  >
                    Confirm Booking
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </>
      )}
    </Card>
  );
}
