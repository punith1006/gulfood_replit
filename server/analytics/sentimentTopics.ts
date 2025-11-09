import { db } from "../db";
import { chatConversations } from "@shared/schema";
import { and, gte, lte } from "drizzle-orm";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

export type Sentiment = 'Enthusiastic' | 'Satisfied' | 'Neutral' | 'Frustrated' | 'Confused';

export interface SentimentDistribution {
  Enthusiastic: number;
  Satisfied: number;
  Neutral: number;
  Frustrated: number;
  Confused: number;
}

export interface TopicItem {
  topic: string;
  count: number;
  userRole: 'visitor' | 'exhibitor' | null;
}

const SENTIMENT_KEYWORDS = {
  Enthusiastic: ['amazing', 'excellent', 'perfect', 'love', 'wonderful', 'fantastic', 'awesome', 'brilliant'],
  Satisfied: ['thanks', 'helpful', 'great', 'good', 'appreciate', 'thank you', 'useful'],
  Frustrated: ['not helpful', 'wrong', 'frustrated', "doesn't work", 'useless', 'terrible', 'bad', 'horrible'],
  Confused: ["don't understand", 'confused', 'unclear', 'what', 'how', 'why', 'explain']
};

const VISITOR_TOPICS = {
  'exhibitor discovery': ['find exhibitor', 'looking for', 'search', 'recommend', 'who sells'],
  'navigation': ['where is', 'how to get', 'location', 'hall', 'booth', 'map', 'directions'],
  'schedule': ['when', 'time', 'schedule', 'session', 'event', 'opening hours'],
  'product sourcing': ['product', 'supplier', 'buy', 'purchase', 'source'],
  'networking': ['meet', 'connect', 'appointment', 'meeting', 'network'],
  'accommodation': ['hotel', 'stay', 'accommodation', 'lodging'],
  'facilities': ['parking', 'restaurant', 'wifi', 'facilities', 'amenities']
};

const EXHIBITOR_TOPICS = {
  'why exhibit': ['why exhibit', 'benefits', 'advantages', 'worth'],
  'pricing': ['cost', 'price', 'fee', 'expensive', 'how much'],
  'ROI': ['roi', 'return', 'leads', 'sales', 'value'],
  'demographics': ['who visits', 'attendees', 'visitors', 'audience'],
  'marketing': ['promote', 'marketing', 'advertise', 'visibility'],
  'logistics': ['setup', 'delivery', 'shipping', 'booth setup'],
  'competition': ['competitors', 'other exhibitors', 'similar']
};

export async function analyzeSentiment(messages: any[]): Promise<Sentiment> {
  if (!messages || messages.length === 0) {
    return 'Neutral';
  }

  const userMessages = messages
    .filter((m: any) => m.role === 'user')
    .map((m: any) => m.content?.toLowerCase() || '')
    .join(' ');

  for (const [sentiment, keywords] of Object.entries(SENTIMENT_KEYWORDS)) {
    if (keywords.some(keyword => userMessages.includes(keyword))) {
      return sentiment as Sentiment;
    }
  }

  if (userMessages.includes('?')) {
    return 'Neutral';
  }

  if (openai && messages.length > 5) {
    try {
      const lastFewMessages = messages.slice(-3).map((m: any) => 
        `${m.role}: ${m.content}`
      ).join('\n');

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{
          role: "system",
          content: "Analyze the sentiment of this conversation. Reply with only one word: Enthusiastic, Satisfied, Neutral, Frustrated, or Confused."
        }, {
          role: "user",
          content: lastFewMessages
        }],
        temperature: 0,
        max_tokens: 10
      });

      const aiSentiment = response.choices[0]?.message?.content?.trim() as Sentiment;
      if (['Enthusiastic', 'Satisfied', 'Neutral', 'Frustrated', 'Confused'].includes(aiSentiment)) {
        return aiSentiment;
      }
    } catch (error) {
      console.error('OpenAI sentiment analysis error:', error);
    }
  }

  return 'Neutral';
}

export async function getSentimentDistribution(
  startDate: Date,
  endDate: Date
): Promise<SentimentDistribution> {
  const conversations = await db
    .select()
    .from(chatConversations)
    .where(
      and(
        gte(chatConversations.createdAt, startDate),
        lte(chatConversations.createdAt, endDate)
      )
    );

  const distribution: SentimentDistribution = {
    Enthusiastic: 0,
    Satisfied: 0,
    Neutral: 0,
    Frustrated: 0,
    Confused: 0
  };

  for (const conv of conversations) {
    const messages = Array.isArray(conv.messages) ? conv.messages : [];
    const sentiment = await analyzeSentiment(messages);
    distribution[sentiment]++;
  }

  return distribution;
}

function detectTopic(text: string, topicMap: Record<string, string[]>): string | null {
  const lowerText = text.toLowerCase();
  
  for (const [topic, keywords] of Object.entries(topicMap)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return topic;
    }
  }
  
  return null;
}

export async function extractTopics(
  startDate: Date,
  endDate: Date
): Promise<{ visitor: TopicItem[], exhibitor: TopicItem[] }> {
  const conversations = await db
    .select()
    .from(chatConversations)
    .where(
      and(
        gte(chatConversations.createdAt, startDate),
        lte(chatConversations.createdAt, endDate)
      )
    );

  const visitorTopicCounts = new Map<string, number>();
  const exhibitorTopicCounts = new Map<string, number>();

  for (const conv of conversations) {
    const messages = Array.isArray(conv.messages) ? conv.messages : [];
    const userRole = conv.userRole?.toLowerCase();
    const isVisitor = !userRole || userRole === 'visitor' || userRole === 'attendee';
    const isExhibitor = userRole === 'exhibitor';

    const allText = messages
      .filter((m: any) => m.role === 'user')
      .map((m: any) => m.content || '')
      .join(' ');

    if (isVisitor) {
      const topic = detectTopic(allText, VISITOR_TOPICS);
      if (topic) {
        visitorTopicCounts.set(topic, (visitorTopicCounts.get(topic) || 0) + 1);
      }
    }

    if (isExhibitor) {
      const topic = detectTopic(allText, EXHIBITOR_TOPICS);
      if (topic) {
        exhibitorTopicCounts.set(topic, (exhibitorTopicCounts.get(topic) || 0) + 1);
      }
    }
  }

  const visitorTopics: TopicItem[] = Array.from(visitorTopicCounts.entries())
    .map(([topic, count]) => ({ topic, count, userRole: 'visitor' as const }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const exhibitorTopics: TopicItem[] = Array.from(exhibitorTopicCounts.entries())
    .map(([topic, count]) => ({ topic, count, userRole: 'exhibitor' as const }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { visitor: visitorTopics, exhibitor: exhibitorTopics };
}

export interface SentimentJourneyData {
  transitions: Array<{
    from: Sentiment;
    to: Sentiment;
    count: number;
  }>;
  resolutionRate: number;
}

export async function getSentimentJourney(startDate: Date, endDate: Date): Promise<SentimentJourneyData> {
  const conversations = await db
    .select()
    .from(chatConversations)
    .where(
      and(
        gte(chatConversations.createdAt, startDate),
        lte(chatConversations.createdAt, endDate)
      )
    );

  const transitionMap = new Map<string, number>();
  let negativeToPositiveCount = 0;
  let totalNegativeCount = 0;

  for (const conv of conversations) {
    const messages = Array.isArray(conv.messages) ? conv.messages : [];
    
    if (messages.length < 2) continue;

    const messageSentiments: Sentiment[] = [];
    
    for (const message of messages) {
      const sentiment = await analyzeSentiment([message]);
      messageSentiments.push(sentiment);
    }

    for (let i = 0; i < messageSentiments.length - 1; i++) {
      const from = messageSentiments[i];
      const to = messageSentiments[i + 1];
      
      const transitionKey = `${from}->${to}`;
      transitionMap.set(transitionKey, (transitionMap.get(transitionKey) || 0) + 1);

      if (from === 'Frustrated' || from === 'Confused') {
        totalNegativeCount++;
        if (to === 'Satisfied' || to === 'Enthusiastic') {
          negativeToPositiveCount++;
        }
      }
    }
  }

  const transitions = Array.from(transitionMap.entries()).map(([key, count]) => {
    const [from, to] = key.split('->') as [Sentiment, Sentiment];
    return { from, to, count };
  });

  const resolutionRate = totalNegativeCount > 0 
    ? Math.round((negativeToPositiveCount / totalNegativeCount) * 100)
    : 0;

  return {
    transitions,
    resolutionRate
  };
}
