import { db } from "../db";
import { chatConversations, chatFeedback } from "@shared/schema";
import { sql, and, gte, lte } from "drizzle-orm";

export interface ConversationMetrics {
  totalConversations: number;
  totalMessages: number;
  totalFeedbackActions: number;
  satisfactionRate: number;
  avgMessagesPerConversation: number;
  avgDurationPerConversation: number;
}

export async function getConversationMetrics(
  startDate: Date,
  endDate: Date
): Promise<ConversationMetrics> {
  const conversations = await db
    .select()
    .from(chatConversations)
    .where(
      and(
        gte(chatConversations.createdAt, startDate),
        lte(chatConversations.createdAt, endDate)
      )
    );

  const feedback = await db
    .select()
    .from(chatFeedback)
    .where(
      and(
        gte(chatFeedback.createdAt, startDate),
        lte(chatFeedback.createdAt, endDate)
      )
    );

  const totalConversations = conversations.length;
  
  let totalMessages = 0;
  let totalDurationMinutes = 0;
  
  for (const conv of conversations) {
    const messages = Array.isArray(conv.messages) ? conv.messages : [];
    totalMessages += messages.length;
    
    if (conv.updatedAt && conv.createdAt) {
      const durationMs = new Date(conv.updatedAt).getTime() - new Date(conv.createdAt).getTime();
      totalDurationMinutes += durationMs / (1000 * 60);
    }
  }

  const totalFeedbackActions = feedback.length;
  
  const likes = feedback.filter(f => f.isAccurate === true).length;
  const dislikes = feedback.filter(f => f.isAccurate === false).length;
  const satisfactionRate = (likes + dislikes) > 0 
    ? Math.round((likes / (likes + dislikes)) * 100) 
    : 0;

  const avgMessagesPerConversation = totalConversations > 0 
    ? Math.round((totalMessages / totalConversations) * 10) / 10 
    : 0;
    
  const avgDurationPerConversation = totalConversations > 0 
    ? Math.round((totalDurationMinutes / totalConversations) * 10) / 10 
    : 0;

  return {
    totalConversations,
    totalMessages,
    totalFeedbackActions,
    satisfactionRate,
    avgMessagesPerConversation,
    avgDurationPerConversation
  };
}
