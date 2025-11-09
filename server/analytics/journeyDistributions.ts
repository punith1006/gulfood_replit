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

  // Helper function to normalize dates to ISO format (YYYY-MM-DD)
  const normalizeDate = (dateStr: string): string | null => {
    try {
      // If already in ISO format (YYYY-MM-DD), return as-is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
      }
      
      // Parse other formats (e.g., "January 26, 2026")
      const parsed = new Date(dateStr);
      if (isNaN(parsed.getTime())) {
        return null;
      }
      
      // Convert to ISO format YYYY-MM-DD
      return parsed.toISOString().split('T')[0];
    } catch {
      return null;
    }
  };

  // Extract dates and count unique visitors per date
  const dateVisitorMap = new Map<string, Set<string>>();
  const processedSessions = new Set<string>();

  // Process itinerary data (preferred source)
  for (const record of itineraryRecords) {
    const data = record.itineraryData as any;
    
    if (data && Array.isArray(data.days)) {
      for (const day of data.days) {
        if (day.date) {
          const normalizedDate = normalizeDate(day.date);
          if (normalizedDate) {
            if (!dateVisitorMap.has(normalizedDate)) {
              dateVisitorMap.set(normalizedDate, new Set());
            }
            dateVisitorMap.get(normalizedDate)!.add(record.sessionId);
            processedSessions.add(record.sessionId);
          }
        }
      }
    }
  }

  // Fallback to journey plan specific dates ONLY for sessions without itineraries
  for (const plan of journeyDates) {
    // Skip if this session already has itinerary data
    if (processedSessions.has(plan.sessionId)) {
      continue;
    }
    
    if (plan.specificDates && Array.isArray(plan.specificDates)) {
      for (const date of plan.specificDates) {
        const normalizedDate = normalizeDate(date);
        if (normalizedDate) {
          if (!dateVisitorMap.has(normalizedDate)) {
            dateVisitorMap.set(normalizedDate, new Set());
          }
          dateVisitorMap.get(normalizedDate)!.add(plan.sessionId);
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
