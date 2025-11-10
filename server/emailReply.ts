import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface EmailReplyParams {
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  threadId?: string;
}

export async function sendEmailReply(params: EmailReplyParams): Promise<{ success: boolean; error?: string }> {
  try {
    if (!resend) {
      console.warn('⚠️  Resend API key not configured. Cannot send email reply.');
      return {
        success: false,
        error: 'Email service not configured'
      };
    }

    // Send email via Resend (AgentMail receives emails, Resend sends them)
    const result = await resend.emails.send({
      from: 'Gulfood 2026 <onboarding@resend.dev>',
      to: params.to,
      subject: params.subject,
      text: params.body,
      headers: params.inReplyTo ? {
        'In-Reply-To': params.inReplyTo,
        ...(params.threadId && { 'References': params.threadId })
      } : undefined
    });

    if (result.error) {
      console.error('❌ Resend API error:', result.error);
      return {
        success: false,
        error: result.error.message || 'Failed to send email'
      };
    }

    console.log('✅ Email reply sent via Resend. Email ID:', result.data?.id);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send email reply:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
}

export async function escalateEmail(params: {
  originalFrom: string;
  originalSubject: string;
  originalBody: string;
  escalationReason: string;
  messageId: string;
  threadId?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!resend) {
      console.warn('⚠️  Resend API key not configured. Cannot escalate email.');
      return {
        success: false,
        error: 'Email escalation service not configured'
      };
    }

    const escalationEmail = `
ESCALATED EMAIL ALERT
=====================

From: ${params.originalFrom}
Subject: ${params.originalSubject}
Message ID: ${params.messageId}
Thread ID: ${params.threadId || 'N/A'}

Escalation Reason:
${params.escalationReason}

Original Email Body:
--------------------
${params.originalBody}
    `.trim();

    const result = await resend.emails.send({
      from: 'Gulfood 2026 Email System <onboarding@resend.dev>',
      to: 'punith.vs74064@gmail.com',
      subject: `[ESCALATED] ${params.originalSubject}`,
      text: escalationEmail,
      replyTo: params.originalFrom
    });

    if (result.error) {
      console.error('❌ Resend API error:', result.error);
      return {
        success: false,
        error: result.error.message || 'Failed to escalate email'
      };
    }

    console.log('✅ Email escalated successfully. Email ID:', result.data?.id);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to escalate email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to escalate email'
    };
  }
}
