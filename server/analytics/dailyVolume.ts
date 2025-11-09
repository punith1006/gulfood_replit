import { db } from "../db";
import { chatConversations } from "../../shared/schema";
import { and, gte, lte, sql } from "drizzle-orm";

export interface DailyVolumeItem {
  date: string;
  count: number;
}

export async function getDailyMessageVolume(
  startDate: Date,
  endDate: Date
): Promise<DailyVolumeItem[]> {
  const results = await db
    .select({
      date: sql<string>`DATE(${chatConversations.createdAt})`.as('date'),
      count: sql<number>`COUNT(*)::int`.as('count')
    })
    .from(chatConversations)
    .where(
      and(
        gte(chatConversations.createdAt, startDate),
        lte(chatConversations.createdAt, endDate)
      )
    )
    .groupBy(sql`DATE(${chatConversations.createdAt})`);

  const volumeMap = new Map<string, number>();
  for (const item of results) {
    volumeMap.set(item.date, item.count);
  }

  const dailyVolume: DailyVolumeItem[] = [];
  const currentDay = new Date(Date.UTC(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth(),
    startDate.getUTCDate()
  ));
  
  const endDay = new Date(Date.UTC(
    endDate.getUTCFullYear(),
    endDate.getUTCMonth(),
    endDate.getUTCDate()
  ));
  
  while (currentDay <= endDay) {
    const dayKey = currentDay.toISOString().split('T')[0];
    const count = volumeMap.get(dayKey) || 0;
    
    dailyVolume.push({
      date: dayKey,
      count
    });
    
    currentDay.setUTCDate(currentDay.getUTCDate() + 1);
  }

  return dailyVolume;
}
