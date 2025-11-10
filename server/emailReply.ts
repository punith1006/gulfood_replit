import { getUncachableAgentMailClient } from './agentmail';

interface EmailReplyParams {
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  threadId?: string;
}

export async function sendEmailReply(params: EmailReplyParams): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getUncachableAgentMailClient();

    // Use AgentMail's reply API - signature is reply(inboxId, messageId, request, requestOptions)
    if (params.inReplyTo) {
      await client.inboxes.messages.reply(
        'gulfood2026@agentmail.to',  // inboxId
        params.inReplyTo,              // messageId
        { text: params.body }          // request object with email body
      );
      console.log('✅ Email reply sent via AgentMail to:', params.to);
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
