import { getConversationMetrics, type ConversationMetrics } from './conversationMetrics';
import { getSentimentDistribution, extractTopics, getSentimentJourney, type SentimentDistribution, type TopicItem, type SentimentJourneyData } from './sentimentTopics';
import { getFallbackStats, type FallbackStats } from './fallbacks';
import { getPeakHours, type HourlyActivity } from './peakHours';

export interface ChatbotAnalytics {
  metrics: ConversationMetrics;
  sentiment: SentimentDistribution;
  topics: {
    visitor: TopicItem[];
    exhibitor: TopicItem[];
  };
  fallbacks: FallbackStats;
  peakHours: HourlyActivity[];
  sentimentJourney: SentimentJourneyData;
}

export async function getChatbotAnalytics(
  startDate: Date,
  endDate: Date
): Promise<ChatbotAnalytics> {
  console.log('Computing real-time chatbot analytics...');
  
  const [metrics, sentiment, topics, fallbacks, peakHours, sentimentJourney] = await Promise.all([
    getConversationMetrics(startDate, endDate),
    getSentimentDistribution(startDate, endDate),
    extractTopics(startDate, endDate),
    getFallbackStats(startDate, endDate),
    getPeakHours(startDate, endDate),
    getSentimentJourney(startDate, endDate)
  ]);

  const result: ChatbotAnalytics = {
    metrics,
    sentiment,
    topics,
    fallbacks,
    peakHours,
    sentimentJourney
  };

  return result;
}

export * from './conversationMetrics';
export * from './sentimentTopics';
export * from './fallbacks';
export * from './peakHours';
export * from './cache';
