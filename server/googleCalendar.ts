import { google } from 'googleapis';

interface CalendarSlot {
  start: Date;
  end: Date;
  available: boolean;
}

interface CreateEventParams {
  summary: string;
  description: string;
  start: Date;
  end: Date;
  attendeeEmail: string;
  timezone?: string;
}

interface CalendarEvent {
  id: string;
  meetLink?: string;
  htmlLink: string;
}

class GoogleCalendarService {
  private calendar: any;
  private initialized: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      // Check if we have the required credentials
      const clientEmail = process.env.GOOGLE_CALENDAR_CLIENT_EMAIL;
      const privateKey = process.env.GOOGLE_CALENDAR_PRIVATE_KEY;
      const calendarId = process.env.GOOGLE_CALENDAR_ID;

      if (!clientEmail || !privateKey || !calendarId) {
        console.warn('⚠️  Google Calendar credentials not configured. Set GOOGLE_CALENDAR_CLIENT_EMAIL, GOOGLE_CALENDAR_PRIVATE_KEY, and GOOGLE_CALENDAR_ID environment variables.');
        this.initialized = false;
        return;
      }

      // Initialize OAuth2 client with service account
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey.replace(/\\n/g, '\n')
        },
        scopes: ['https://www.googleapis.com/auth/calendar']
      });

      this.calendar = google.calendar({ version: 'v3', auth });
      this.initialized = true;
      console.log('✅ Google Calendar API initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Calendar API:', error);
      this.initialized = false;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  isConfigured(): boolean {
    return this.initialized;
  }

  async getAvailableSlots(
    startDate: Date,
    endDate: Date,
    slotDurationMinutes: number = 30,
    workingHoursStart: number = 9,
    workingHoursEnd: number = 17
  ): Promise<CalendarSlot[]> {
    if (!this.initialized) {
      throw new Error('Google Calendar API not initialized');
    }

    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    // Get busy periods using FreeBusy API
    const response = await this.calendar.freebusy.query({
      requestBody: {
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        items: [{ id: calendarId }]
      }
    });

    const busyPeriods = response.data.calendars?.[calendarId]?.busy || [];

    // Generate all possible time slots within business hours
    // All times are in Dubai timezone (GST, UTC+4)
    const allSlots: CalendarSlot[] = [];
    let current = new Date(startDate);

    while (current < endDate) {
      // Get the date in Dubai timezone
      const dubaiDateStr = current.toLocaleDateString('en-CA', { timeZone: 'Asia/Dubai' }); // YYYY-MM-DD
      const dayOfWeek = new Date(`${dubaiDateStr}T12:00:00+04:00`).getDay();
      
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        current = new Date(current.getTime() + 24 * 60 * 60 * 1000); // Add 1 day
        continue;
      }

      // Create the exact end of business hours for this day in Dubai timezone
      const dayEnd = new Date(`${dubaiDateStr}T${String(workingHoursEnd).padStart(2, '0')}:00:00+04:00`);
      
      // Generate slots for this day in Dubai timezone
      for (let hour = workingHoursStart; hour < workingHoursEnd; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
          // Create slot times with explicit Dubai timezone offset
          const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
          const slotStart = new Date(`${dubaiDateStr}T${timeStr}+04:00`);
          
          const slotEnd = new Date(slotStart.getTime() + slotDurationMinutes * 60 * 1000);

          // Check if slot end is still within working hours (in Dubai time)
          // Compare full datetime, not just hours, to prevent slots ending after 17:00
          if (slotEnd <= dayEnd) {
            // Check if slot overlaps with any busy period
            const isAvailable = !busyPeriods.some((busy: any) => {
              const busyStart = new Date(busy.start);
              const busyEnd = new Date(busy.end);
              
              // Slot is busy if it overlaps with any busy period
              return (slotStart < busyEnd && slotEnd > busyStart);
            });

            allSlots.push({
              start: slotStart,
              end: slotEnd,
              available: isAvailable
            });
          }
        }
      }

      // Move to next day
      current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
    }

    // Filter to only return available slots
    return allSlots.filter(slot => slot.available);
  }

  async createEvent(params: CreateEventParams): Promise<CalendarEvent> {
    if (!this.initialized) {
      throw new Error('Google Calendar API not initialized');
    }

    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
    const timezone = params.timezone || 'Asia/Dubai';

    const event = {
      summary: params.summary,
      description: params.description,
      start: {
        dateTime: params.start.toISOString(),
        timeZone: timezone
      },
      end: {
        dateTime: params.end.toISOString(),
        timeZone: timezone
      },
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 30 } // 30 minutes before
        ]
      }
    };

    const response = await this.calendar.events.insert({
      calendarId,
      requestBody: event,
      conferenceDataVersion: 1,
      sendUpdates: 'none'
    });

    return {
      id: response.data.id!,
      meetLink: response.data.hangoutLink,
      htmlLink: response.data.htmlLink!
    };
  }

  async deleteEvent(eventId: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('Google Calendar API not initialized');
    }

    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    await this.calendar.events.delete({
      calendarId,
      eventId,
      sendUpdates: 'all'
    });
  }

  async updateEvent(eventId: string, params: Partial<CreateEventParams>): Promise<CalendarEvent> {
    if (!this.initialized) {
      throw new Error('Google Calendar API not initialized');
    }

    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    // First get the existing event
    const existing = await this.calendar.events.get({
      calendarId,
      eventId
    });

    const timezone = params.timezone || existing.data.start?.timeZone || 'Asia/Dubai';

    const event: any = {
      summary: params.summary || existing.data.summary,
      description: params.description || existing.data.description
    };

    if (params.start && params.end) {
      event.start = {
        dateTime: params.start.toISOString(),
        timeZone: timezone
      };
      event.end = {
        dateTime: params.end.toISOString(),
        timeZone: timezone
      };
    }

    if (params.attendeeEmail) {
      event.attendees = [
        { email: params.attendeeEmail }
      ];
    }

    const response = await this.calendar.events.update({
      calendarId,
      eventId,
      requestBody: event,
      sendUpdates: 'all'
    });

    return {
      id: response.data.id!,
      meetLink: response.data.hangoutLink,
      htmlLink: response.data.htmlLink!
    };
  }

  // Helper method to get available slots for a specific date in the format expected by the API
  async getAvailableSlotsForDate(dateString: string): Promise<{ time: string; available: boolean }[]> {
    // Parse the date string and create Dubai timezone bounds
    // Input format: YYYY-MM-DD
    const startOfDay = new Date(`${dateString}T00:00:00+04:00`); // Start of day in Dubai (GST)
    const endOfDay = new Date(`${dateString}T23:59:59+04:00`); // End of day in Dubai (GST)

    const slots = await this.getAvailableSlots(startOfDay, endOfDay);
    
    // Convert to the format expected by the frontend
    return slots.map(slot => ({
      time: slot.start.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false,
        timeZone: 'Asia/Dubai'
      }),
      available: slot.available
    }));
  }

  // Helper method to check if a specific time slot is available
  async isSlotAvailable(scheduledTime: Date, durationMinutes: number = 30): Promise<boolean> {
    const endTime = new Date(scheduledTime);
    endTime.setMinutes(endTime.getMinutes() + durationMinutes);

    const slots = await this.getAvailableSlots(scheduledTime, endTime);
    
    // Check if there's an available slot that matches this time
    return slots.some(slot => 
      slot.start.getTime() === scheduledTime.getTime() && 
      slot.available
    );
  }

  // Helper method to create an appointment with the expected parameters
  async createAppointment(params: {
    attendeeName: string;
    attendeeEmail: string;
    organization: string;
    role: string;
    purpose: string;
    scheduledTime: Date;
    durationMinutes: number;
    timezone: string;
  }): Promise<{ eventId: string; meetLink?: string }> {
    const endTime = new Date(params.scheduledTime);
    endTime.setMinutes(endTime.getMinutes() + params.durationMinutes);

    const summary = `Gulfood 2026 Consultation - ${params.attendeeName}`;
    const description = `
Sales Consultation Meeting

Organization: ${params.organization}
Role: ${params.role}
Purpose: ${params.purpose}

This is a scheduled 30-minute consultation with the Gulfood 2026 sales team.
    `.trim();

    const event = await this.createEvent({
      summary,
      description,
      start: params.scheduledTime,
      end: endTime,
      attendeeEmail: params.attendeeEmail,
      timezone: params.timezone
    });

    return {
      eventId: event.id,
      meetLink: event.meetLink
    };
  }

  // Helper method to cancel an event
  async cancelEvent(eventId: string): Promise<void> {
    return this.deleteEvent(eventId);
  }
}

// Export singleton instance
export const googleCalendar = new GoogleCalendarService();
