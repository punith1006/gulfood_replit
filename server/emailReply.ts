import { getUncachableAgentMailClient } from './agentmail';
import { marked } from 'marked';

interface EmailReplyParams {
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  threadId?: string;
}

function convertMarkdownToHtml(markdown: string): string {
  // Configure marked for email-safe HTML
  marked.setOptions({
    breaks: true,
    gfm: true,
  });
  
  // Convert markdown to HTML
  let html = marked.parse(markdown) as string;
  
  // Post-process HTML to add inline styles for email compatibility
  // Use regex that handles tags with or without attributes
  html = html
    // Headings
    .replace(/<h1(\s[^>]*)?\>/g, '<h1 style="font-size: 24px; font-weight: bold; margin: 16px 0 12px 0; color: #222;">')
    .replace(/<h2(\s[^>]*)?\>/g, '<h2 style="font-size: 20px; font-weight: bold; margin: 14px 0 10px 0; color: #222;">')
    .replace(/<h3(\s[^>]*)?\>/g, '<h3 style="font-size: 18px; font-weight: bold; margin: 12px 0 8px 0; color: #333;">')
    .replace(/<h4(\s[^>]*)?\>/g, '<h4 style="font-size: 16px; font-weight: bold; margin: 10px 0 6px 0; color: #333;">')
    .replace(/<h5(\s[^>]*)?\>/g, '<h5 style="font-size: 14px; font-weight: bold; margin: 8px 0 4px 0; color: #444;">')
    .replace(/<h6(\s[^>]*)?\>/g, '<h6 style="font-size: 14px; font-weight: bold; margin: 8px 0 4px 0; color: #555;">')
    // Paragraphs
    .replace(/<p(\s[^>]*)?\>/g, '<p style="margin: 12px 0; line-height: 1.6;">')
    // Lists
    .replace(/<ul(\s[^>]*)?\>/g, '<ul style="margin: 12px 0; padding-left: 24px;">')
    .replace(/<ol(\s[^>]*)?\>/g, '<ol style="margin: 12px 0; padding-left: 24px;">')
    .replace(/<li(\s[^>]*)?\>/g, '<li style="margin: 6px 0;">')
    // Links (preserve existing href and other attributes)
    .replace(/<a\s/g, '<a style="color: #0066cc; text-decoration: underline;" ')
    // Bold and italic
    .replace(/<strong(\s[^>]*)?\>/g, '<strong style="font-weight: bold;">')
    .replace(/<em(\s[^>]*)?\>/g, '<em style="font-style: italic;">')
    // Blockquotes
    .replace(/<blockquote(\s[^>]*)?\>/g, '<blockquote style="border-left: 4px solid #ddd; margin: 12px 0; padding-left: 16px; color: #666;">')
    // Code blocks and inline code
    .replace(/<pre(\s[^>]*)?\>/g, '<pre style="background-color: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto;">')
    .replace(/<code(\s[^>]*)?\>/g, '<code style="background-color: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 14px;">');
  
  // Wrap in container with base styles
  return `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px;">${html}</div>`;
}

export async function sendEmailReply(params: EmailReplyParams): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getUncachableAgentMailClient();

    // Use AgentMail's reply API - signature is reply(inboxId, messageId, request, requestOptions)
    if (params.inReplyTo) {
      // Always convert markdown to HTML for proper email formatting
      const replyPayload = {
        text: params.body,
        html: convertMarkdownToHtml(params.body)
      };
      
      await client.inboxes.messages.reply(
        'gulfood2026@agentmail.to',  // inboxId
        params.inReplyTo,              // messageId
        replyPayload                   // request object with text and html
      );
      console.log('✅ Email reply sent via AgentMail to:', params.to, '(with formatted HTML from markdown)');
    } else {
      // For new messages without inReplyTo, use send method
      console.warn('⚠️  Cannot send new email without message_id via AgentMail. Skipping.');
      return {
        success: false,
        error: 'AgentMail requires message_id for replies'
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('❌ AgentMail API error:', error);
    return {
      success: false,
      error: error?.message || 'Failed to send email via AgentMail'
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
    const client = await getUncachableAgentMailClient();

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

--------------------
Please handle this inquiry manually and reply directly to: ${params.originalFrom}
    `.trim();

    // Send escalation as a reply to the original message
    // This maintains threading - signature is reply(inboxId, messageId, request)
    await client.inboxes.messages.reply(
      'gulfood2026@agentmail.to',  // inboxId
      params.messageId,              // messageId
      { text: escalationEmail }      // request object
    );

    console.log('✅ Email escalated successfully via AgentMail (sent as reply to original thread)');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Failed to escalate email via AgentMail:', error);
    return {
      success: false,
      error: error?.message || 'Failed to escalate email'
    };
  }
}
