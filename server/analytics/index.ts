import { getConversationMetrics, type ConversationMetrics } from './conversationMetrics';
import { getSentimentDistributionAndDaily, extractTopics, getSentimentJourney, type SentimentDistribution, type TopicItem, type SentimentJourneyData, type DailySentimentData } from './sentimentTopics';
import { getFallbackStats, type FallbackStats } from './fallbacks';
import { getPeakHours, type HourlyActivity } from './peakHours';
import { getTopQuickActions, type QuickActionStats } from './quickActions';
import { getLanguageDistribution, type LanguageItem } from './languageDistribution';
import { getDailyMessageVolume, type DailyVolumeItem } from './dailyVolume';

export interface ChatbotAnalytics {
  metrics: ConversationMetrics;
  sentiment: SentimentDistribution;
  dailySentiment: DailySentimentData[];
  topics: {
    visitor: TopicItem[];
    exhibitor: TopicItem[];
  };
  fallbacks: FallbackStats;
  peakHours: HourlyActivity[];
  sentimentJourney: SentimentJourneyData;
  quickActions: QuickActionStats;
  languageDistribution: LanguageItem[];
  dailyVolume: DailyVolumeItem[];
}

export async function getChatbotAnalytics(
  startDate: Date,
  endDate: Date
): Promise<ChatbotAnalytics> {
  console.log('Computing real-time chatbot analytics...');
  
  const [metrics, sentimentData, topics, fallbacks, peakHours, sentimentJourney, quickActions, languageDistribution, dailyVolume] = await Promise.all([
    getConversationMetrics(startDate, endDate),
    getSentimentDistributionAndDaily(startDate, endDate),
    extractTopics(startDate, endDate),
    getFallbackStats(startDate, endDate),
    getPeakHours(startDate, endDate),
    getSentimentJourney(startDate, endDate),
    getTopQuickActions(startDate, endDate),
    getLanguageDistribution(startDate, endDate),
    getDailyMessageVolume(startDate, endDate)
  ]);

  const result: ChatbotAnalytics = {
    metrics,
    sentiment: sentimentData.distribution,
    dailySentiment: sentimentData.daily,
    topics,
    fallbacks,
    peakHours,
    sentimentJourney,
    quickActions,
    languageDistribution,
    dailyVolume
  };

  return result;
}

export * from './conversationMetrics';
export * from './sentimentTopics';
export * from './fallbacks';
export * from './peakHours';
export * from './quickActions';
export * from './languageDistribution';
export * from './dailyVolume';
export * from './cache';
