import { db } from "../db";
import { journeyPlans, itineraries } from "../../shared/schema";
import { and, gte, lte, sql, desc } from "drizzle-orm";

export interface SectorExpectationItem {
  sector: string;
  expectedVisitors: number;
}

export interface DateDistributionItem {
  date: string;
  visitorCount: number;
}

export async function getExpectedVisitorsBySector(
  startDate: Date,
  endDate: Date
): Promise<SectorExpectationItem[]> {
  // Aggregate interest categories to estimate expected visitors per sector
  const results = await db
    .select({
      sector: sql<string>`UNNEST(${journeyPlans.interestCategories})`.as('sector'),
      count: sql<number>`COUNT(DISTINCT ${journeyPlans.sessionId})::int`.as('count')
    })
    .from(journeyPlans)
    .where(
      and(
        gte(journeyPlans.createdAt, startDate),
        lte(journeyPlans.createdAt, endDate)
      )
    )
    .groupBy(sql`UNNEST(${journeyPlans.interestCategories})`)
    .orderBy(desc(sql`COUNT(DISTINCT ${journeyPlans.sessionId})`))
    .limit(10);

  return results.map(r => ({
    sector: r.sector,
    expectedVisitors: r.count
  }));
}

export async function getVisitDateDistribution(
  startDate: Date,
  endDate: Date
): Promise<DateDistributionItem[]> {
  // Extract scheduled dates from itinerary data JSON
  // Itinerary data structure: { days: [{ date: "2026-01-26", activities: [...] }] }
  const itineraryRecords = await db
    .select({
      sessionId: itineraries.sessionId,
      itineraryData: itineraries.itineraryData,
      createdAt: itineraries.createdAt
    })
    .from(itineraries)
    .where(
      and(
        gte(itineraries.createdAt, startDate),
        lte(itineraries.createdAt, endDate)
      )
    );

  // Extract dates and count unique visitors per date
  const dateVisitorMap = new Map<string, Set<string>>();

  for (const record of itineraryRecords) {
    const data = record.itineraryData as any;
    
    if (data && Array.isArray(data.days)) {
      for (const day of data.days) {
        if (day.date) {
          if (!dateVisitorMap.has(day.date)) {
            dateVisitorMap.set(day.date, new Set());
          }
          dateVisitorMap.get(day.date)!.add(record.sessionId);
        }
      }
    }
  }

  // Convert to array and sort by date
  const distribution: DateDistributionItem[] = Array.from(dateVisitorMap.entries())
    .map(([date, visitors]) => ({
      date,
      visitorCount: visitors.size
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return distribution;
}
