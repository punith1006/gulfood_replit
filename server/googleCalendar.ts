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
    const allSlots: CalendarSlot[] = [];
    const currentDate = new Date(startDate);

    while (currentDate < endDate) {
      const dayOfWeek = currentDate.getDay();
      
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(0, 0, 0, 0);
        continue;
      }

      // Generate slots for this day
      for (let hour = workingHoursStart; hour < workingHoursEnd; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
          const slotStart = new Date(currentDate);
          slotStart.setHours(hour, minute, 0, 0);
          
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + slotDurationMinutes);

          // Check if slot end is still within working hours
          if (slotEnd.getHours() <= workingHoursEnd) {
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
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(0, 0, 0, 0);
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
      attendees: [
        { email: params.attendeeEmail }
      ],
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
      sendUpdates: 'all'
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
}

// Export singleton instance
export const googleCalendar = new GoogleCalendarService();
