import { db } from "../db";
import { chatConversations } from "../../shared/schema";
import { and, gte, lte, sql } from "drizzle-orm";

export interface LanguageItem {
  language: string;
  count: number;
  percentage: number;
}

export async function getLanguageDistribution(
  startDate: Date,
  endDate: Date
): Promise<LanguageItem[]> {
  const results = await db
    .select({
      language: sql<string>`COALESCE(${chatConversations.language}, 'English')`.as('language'),
      count: sql<number>`COUNT(*)::int`.as('count')
    })
    .from(chatConversations)
    .where(
      and(
        gte(chatConversations.createdAt, startDate),
        lte(chatConversations.createdAt, endDate)
      )
    )
    .groupBy(sql`COALESCE(${chatConversations.language}, 'English')`);

  const total = results.reduce((sum, item) => sum + item.count, 0);

  const distribution: LanguageItem[] = results
    .map(item => ({
      language: item.language,
      count: item.count,
      percentage: total > 0 ? Math.round((item.count / total) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count);

  return distribution;
}
