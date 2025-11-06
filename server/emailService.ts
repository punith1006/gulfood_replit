import { Resend } from 'resend';
import { formatInTimeZone } from 'date-fns-tz';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface AppointmentDetails {
  scheduledTime: Date;
  durationMinutes: number;
  name: string;
  organization: string;
  meetingPurpose: string;
  googleMeetLink: string;
}

interface EmailParams {
  to: string;
  name: string;
  organization: string;
  role: string;
  meetingPurpose: string;
  scheduledTime: Date;
  googleMeetLink: string;
  durationMinutes: number;
}

function formatDateToICS(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

export function generateICSFile(appointment: AppointmentDetails): string {
  const startDate = new Date(appointment.scheduledTime);
  const endDate = new Date(startDate.getTime() + appointment.durationMinutes * 60 * 1000);
  const now = new Date();
  
  const uid = `appointment-${Date.now()}-${Math.random().toString(36).substring(7)}@gulfood2026.com`;
  const dtstamp = formatDateToICS(now);
  const dtstart = formatDateToICS(startDate);
  const dtend = formatDateToICS(endDate);
  
  const description = `${appointment.meetingPurpose}\\n\\nGoogle Meet: ${appointment.googleMeetLink}`;
  
  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Gulfood 2026//Event Assistant//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtstamp}
DTSTART:${dtstart}
DTEND:${dtend}
SUMMARY:Gulfood 2026 Consultation - ${appointment.name}
DESCRIPTION:${description}
LOCATION:${appointment.googleMeetLink}
STATUS:CONFIRMED
SEQUENCE:0
TRANSP:OPAQUE
END:VEVENT
END:VCALENDAR`;

  return icsContent;
}

function generateEmailHTML(params: EmailParams): string {
  const formattedDateTime = formatInTimeZone(
    params.scheduledTime, 
    'Asia/Dubai',
    "EEEE, MMMM d, yyyy 'at' h:mm a 'GST'"
  );
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Appointment Confirmed - Gulfood 2026</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Consultation Confirmed</h1>
    <p style="color: white; margin: 10px 0 0 0;">Gulfood 2026 - Dubai</p>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Dear ${params.name},</p>
    
    <p>Your consultation with the Gulfood 2026 sales team has been confirmed!</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FF6B35;">
      <h2 style="color: #FF6B35; margin-top: 0; font-size: 18px;">Meeting Details</h2>
      <p style="margin: 8px 0;"><strong>Date & Time:</strong> ${formattedDateTime}</p>
      <p style="margin: 8px 0;"><strong>Duration:</strong> ${params.durationMinutes} minutes</p>
      <p style="margin: 8px 0;"><strong>Organization:</strong> ${params.organization}</p>
      <p style="margin: 8px 0;"><strong>Role:</strong> ${params.role}</p>
      <p style="margin: 8px 0;"><strong>Purpose:</strong> ${params.meetingPurpose}</p>
    </div>
    
    <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <p style="margin: 0 0 15px 0; font-size: 14px; color: #2e7d32;"><strong>Join via Google Meet</strong></p>
      <a href="${params.googleMeetLink}" style="display: inline-block; background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">Join Meeting</a>
      <p style="margin: 15px 0 0 0; font-size: 12px; color: #666;">Or copy this link: ${params.googleMeetLink}</p>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 20px;">A calendar invitation (.ics file) is attached to this email. Add it to your calendar so you don't miss the meeting!</p>
    
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #999; text-align: center;">
      Gulfood 2026 | January 26-30, 2026<br>
      Dubai World Trade Centre & Expo City Dubai
    </p>
  </div>
</body>
</html>`;
}

export async function sendAppointmentConfirmation(params: EmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    if (!resend) {
      console.warn('⚠️  Resend API key not configured. Skipping email confirmation.');
      return { 
        success: false, 
        error: 'Email service not configured' 
      };
    }

    const icsFile = generateICSFile({
      scheduledTime: params.scheduledTime,
      durationMinutes: params.durationMinutes,
      name: params.name,
      organization: params.organization,
      meetingPurpose: params.meetingPurpose,
      googleMeetLink: params.googleMeetLink
    });

    const htmlContent = generateEmailHTML(params);

    const result = await resend.emails.send({
      from: 'Gulfood 2026 <onboarding@resend.dev>',
      to: params.to,
      subject: 'Your Gulfood 2026 Consultation is Confirmed',
      html: htmlContent,
      attachments: [
        {
          filename: 'gulfood-consultation.ics',
          content: Buffer.from(icsFile).toString('base64')
        }
      ]
    });

    console.log('✅ Appointment confirmation email sent successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send appointment confirmation email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
