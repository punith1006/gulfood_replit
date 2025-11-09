import { db } from "../db";
import { chatConversations, chatFeedback } from "@shared/schema";
import { and, gte, lte, eq } from "drizzle-orm";

export interface FallbackStats {
  fallbackRate: number;
  topFallbackTopics: Array<{ topic: string; count: number }>;
  topicsWithHighestDislikes: Array<{ topic: string; dislikes: number }>;
}

const FALLBACK_KEYWORDS = [
  "i don't have",
  "i cannot",
  "i'm not sure",
  "contact our team",
  "please reach out",
  "i don't know",
  "unable to",
  "not available",
  "cannot provide",
  "please contact",
  "reach out to"
];

const TOPIC_KEYWORDS = {
  'pricing': ['price', 'cost', 'fee', 'payment', 'how much', 'pricing', 'expensive', 'cheap', 'budget'],
  'promotions & offers': ['promotion', 'offer', 'deal', 'discount', 'special', 'early bird', 'package', 'promo', 'exclusive', 'group discount', 'group rate'],
  'accommodation': ['hotel', 'stay', 'accommodation', 'lodging', 'room', 'booking', 'sleep', 'place to stay'],
  'booth location': ['booth', 'hall', 'location', 'where', 'find', 'stand', 'pavilion', 'zone', 'area'],
  'schedule': ['when', 'time', 'schedule', 'session', 'hours', 'timing', 'date', 'day', 'program', 'agenda'],
  'contact info': ['contact', 'email', 'phone', 'reach', 'call', 'number', 'address', 'get in touch'],
  'exhibitor details': ['exhibitor', 'company', 'product', 'what do they', 'who is', 'tell me about', 'information about', 'details'],
  'registration': ['register', 'sign up', 'ticket', 'attend', 'entry', 'admission', 'badge', 'pass'],
  'facilities': ['parking', 'wifi', 'restaurant', 'facilities', 'restroom', 'amenities', 'services', 'food', 'dining'],
  'product sourcing': ['buy', 'purchase', 'supplier', 'source', 'order', 'procure', 'vendor', 'seller'],
  'networking': ['meet', 'network', 'appointment', 'meeting', 'connect', 'introduction', 'business card'],
  'navigation': ['how to get', 'directions', 'route', 'way to', 'navigate', 'walk to', 'map'],
  'event info': ['what is', 'about the event', 'gulfood', 'trade show', 'exhibition', 'fair']
};

export async function detectFallback(message: any): Promise<boolean> {
  if (!message || !message.content) {
    return false;
  }

  const content = message.content.toLowerCase();
  return FALLBACK_KEYWORDS.some(keyword => content.includes(keyword));
}

function detectTopicFromMessage(text: string): string {
  const lowerText = text.toLowerCase();
  
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return topic;
    }
  }
  
  return 'general inquiry';
}

export async function getFallbackStats(
  startDate: Date,
  endDate: Date
): Promise<FallbackStats> {
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

  const conversationMap = new Map(
    conversations.map(conv => [conv.sessionId, conv])
  );

  let totalBotResponses = 0;
  let fallbackCount = 0;
  const fallbackTopicCounts = new Map<string, number>();
  const dislikeTopicCounts = new Map<string, number>();
  
  let orphanedFeedbackCount = 0;
  const orphanedSessions = new Set<string>();

  for (const conv of conversations) {
    const messages = Array.isArray(conv.messages) ? conv.messages : [];
    
    const sessionFeedback = feedback.filter(f => f.sessionId === conv.sessionId);
    const dislikedIndices = new Set(
      sessionFeedback.filter(f => f.isAccurate === false).map(f => f.messageIndex)
    );

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      
      if (msg.role === 'assistant') {
        totalBotResponses++;
        
        const isFallback = await detectFallback(msg);
        const wasDisliked = dislikedIndices.has(i);
        
        if (isFallback || wasDisliked) {
          fallbackCount++;
          
          const userMessage = i > 0 ? messages[i - 1] : null;
          const topic = userMessage 
            ? detectTopicFromMessage(userMessage.content || '')
            : 'general inquiry';
          
          fallbackTopicCounts.set(topic, (fallbackTopicCounts.get(topic) || 0) + 1);
        }
        
        if (wasDisliked) {
          const userMessage = i > 0 ? messages[i - 1] : null;
          const topic = userMessage 
            ? detectTopicFromMessage(userMessage.content || '')
            : 'general inquiry';
          
          dislikeTopicCounts.set(topic, (dislikeTopicCounts.get(topic) || 0) + 1);
        }
      }
    }
  }

  for (const fb of feedback) {
    if (fb.isAccurate === false && !conversationMap.has(fb.sessionId)) {
      orphanedFeedbackCount++;
      orphanedSessions.add(fb.sessionId);
    }
  }

  if (orphanedFeedbackCount > 0) {
    console.warn(`[Analytics] Found ${orphanedFeedbackCount} orphaned feedback records from ${orphanedSessions.size} sessions without conversations`);
    console.warn(`[Analytics] Orphaned sessions:`, Array.from(orphanedSessions));
  }

  const fallbackRate = totalBotResponses > 0 
    ? Math.round((fallbackCount / totalBotResponses) * 100) 
    : 0;

  const topFallbackTopics = Array.from(fallbackTopicCounts.entries())
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topicsWithHighestDislikes = Array.from(dislikeTopicCounts.entries())
    .map(([topic, dislikes]) => ({ topic, dislikes }))
    .sort((a, b) => b.dislikes - a.dislikes)
    .slice(0, 5);

  return {
    fallbackRate,
    topFallbackTopics,
    topicsWithHighestDislikes
  };
}
