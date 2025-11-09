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
  const results = await db.execute(sql`
    SELECT 
      sector,
      COUNT(DISTINCT session_id)::int as expected_visitors
    FROM 
      ${journeyPlans},
      UNNEST(${journeyPlans.interestCategories}) AS sector
    WHERE 
      ${journeyPlans.createdAt} >= ${startDate}
      AND ${journeyPlans.createdAt} <= ${endDate}
    GROUP BY sector
    ORDER BY expected_visitors DESC
    LIMIT 10
  `);

  return results.rows.map((r: any) => ({
    sector: r.sector,
    expectedVisitors: r.expected_visitors
  }));
}

export async function getVisitDateDistribution(
  startDate: Date,
  endDate: Date
): Promise<DateDistributionItem[]> {
  // Extract scheduled dates from itinerary data JSON and journey plan specific dates
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

  // Also get specific dates from journey plans as fallback
  const journeyDates = await db
    .select({
      sessionId: journeyPlans.sessionId,
      specificDates: journeyPlans.specificDates,
      numberOfDays: journeyPlans.numberOfDays
    })
    .from(journeyPlans)
    .where(
      and(
        gte(journeyPlans.createdAt, startDate),
        lte(journeyPlans.createdAt, endDate)
      )
    );

  // Extract dates and count unique visitors per date
  const dateVisitorMap = new Map<string, Set<string>>();

  // Process itinerary data (preferred source)
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

  // Fallback to journey plan specific dates if available
  for (const plan of journeyDates) {
    if (plan.specificDates && Array.isArray(plan.specificDates)) {
      for (const date of plan.specificDates) {
        if (!dateVisitorMap.has(date)) {
          dateVisitorMap.set(date, new Set());
        }
        dateVisitorMap.get(date)!.add(plan.sessionId);
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
