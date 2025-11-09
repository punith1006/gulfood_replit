import { db } from "../db";
import { chatConversations } from "@shared/schema";
import { and, gte, lte } from "drizzle-orm";

export interface HourlyActivity {
  hour: number;
  count: number;
}

export async function getPeakHours(
  startDate: Date,
  endDate: Date
): Promise<HourlyActivity[]> {
  const conversations = await db
    .select()
    .from(chatConversations)
    .where(
      and(
        gte(chatConversations.createdAt, startDate),
        lte(chatConversations.createdAt, endDate)
      )
    );

  const hourCounts = new Map<number, number>();
  
  for (let hour = 0; hour < 24; hour++) {
    hourCounts.set(hour, 0);
  }

  for (const conv of conversations) {
    if (conv.createdAt) {
      // Convert UTC to GST (Gulf Standard Time = UTC+4)
      const utcHour = new Date(conv.createdAt).getUTCHours();
      const gstHour = (utcHour + 4) % 24;
      hourCounts.set(gstHour, (hourCounts.get(gstHour) || 0) + 1);
    }
  }

  const hourlyActivity: HourlyActivity[] = Array.from(hourCounts.entries())
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour - b.hour);

  return hourlyActivity;
}
