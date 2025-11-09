import { db } from "../db";
import { journeyPlans, exhibitors } from "../../shared/schema";
import { and, gte, lte, sql, desc } from "drizzle-orm";

export interface JourneyOverview {
  totalJourneys: number;
  uniqueVisitors: number;
  avgJourneysPerVisitor: number;
  journeysLast24Hours: number;
}

export interface CategoryItem {
  category: string;
  count: number;
}

export interface ExhibitorRankingItem {
  exhibitorId: number;
  exhibitorName: string;
  totalReferences: number;
  matchedCount: number;
  preferredCount: number;
  weightedScore: number;
}

export async function getJourneyOverview(
  startDate: Date,
  endDate: Date
): Promise<JourneyOverview> {
  // Total journeys in date range
  const totalResult = await db
    .select({
      total: sql<number>`COUNT(*)::int`.as('total'),
      uniqueVisitors: sql<number>`COUNT(DISTINCT ${journeyPlans.sessionId})::int`.as('unique_visitors')
    })
    .from(journeyPlans)
    .where(
      and(
        gte(journeyPlans.createdAt, startDate),
        lte(journeyPlans.createdAt, endDate)
      )
    );

  const totalJourneys = totalResult[0]?.total || 0;
  const uniqueVisitors = totalResult[0]?.uniqueVisitors || 0;

  // Journeys in last 24 hours
  const last24Hours = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
  const last24Result = await db
    .select({
      count: sql<number>`COUNT(*)::int`.as('count')
    })
    .from(journeyPlans)
    .where(
      and(
        gte(journeyPlans.createdAt, last24Hours),
        lte(journeyPlans.createdAt, endDate)
      )
    );

  const journeysLast24Hours = last24Result[0]?.count || 0;

  return {
    totalJourneys,
    uniqueVisitors,
    avgJourneysPerVisitor: uniqueVisitors > 0 ? Math.round((totalJourneys / uniqueVisitors) * 10) / 10 : 0,
    journeysLast24Hours
  };
}

export async function getTopInterestCategories(
  startDate: Date,
  endDate: Date
): Promise<CategoryItem[]> {
  const results = await db
    .select({
      category: sql<string>`UNNEST(${journeyPlans.interestCategories})`.as('category'),
      count: sql<number>`COUNT(*)::int`.as('count')
    })
    .from(journeyPlans)
    .where(
      and(
        gte(journeyPlans.createdAt, startDate),
        lte(journeyPlans.createdAt, endDate)
      )
    )
    .groupBy(sql`UNNEST(${journeyPlans.interestCategories})`)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(10);

  return results.map(r => ({
    category: r.category,
    count: r.count
  }));
}

export async function getTopExhibitorRanking(
  startDate: Date,
  endDate: Date
): Promise<ExhibitorRankingItem[]> {
  // Get all exhibitor references with weights:
  // - matched_exhibitor_ids: weight 2 (AI-confirmed matches)
  // - preferred_exhibitor_ids: weight 1 (user-selected)
  const matchedRefs = await db
    .select({
      exhibitorId: sql<number>`UNNEST(${journeyPlans.matchedExhibitorIds})`.as('exhibitor_id'),
      source: sql<string>`'matched'`.as('source')
    })
    .from(journeyPlans)
    .where(
      and(
        gte(journeyPlans.createdAt, startDate),
        lte(journeyPlans.createdAt, endDate)
      )
    );

  const preferredRefs = await db
    .select({
      exhibitorId: sql<number>`UNNEST(${journeyPlans.preferredExhibitorIds})`.as('exhibitor_id'),
      source: sql<string>`'preferred'`.as('source')
    })
    .from(journeyPlans)
    .where(
      and(
        gte(journeyPlans.createdAt, startDate),
        lte(journeyPlans.createdAt, endDate)
      )
    );

  // Combine and count
  const countsMap = new Map<number, { matched: number; preferred: number }>();
  
  for (const ref of matchedRefs) {
    if (ref.exhibitorId) {
      const current = countsMap.get(ref.exhibitorId) || { matched: 0, preferred: 0 };
      current.matched++;
      countsMap.set(ref.exhibitorId, current);
    }
  }

  for (const ref of preferredRefs) {
    if (ref.exhibitorId) {
      const current = countsMap.get(ref.exhibitorId) || { matched: 0, preferred: 0 };
      current.preferred++;
      countsMap.set(ref.exhibitorId, current);
    }
  }

  // Get exhibitor names
  const exhibitorIds = Array.from(countsMap.keys());
  if (exhibitorIds.length === 0) {
    return [];
  }

  const exhibitorNames = await db
    .select({
      id: exhibitors.id,
      name: exhibitors.name
    })
    .from(exhibitors)
    .where(sql`${exhibitors.id} = ANY(${exhibitorIds})`);

  const nameMap = new Map(exhibitorNames.map(e => [e.id, e.name]));

  // Calculate weighted scores and sort
  const ranking: ExhibitorRankingItem[] = Array.from(countsMap.entries())
    .map(([exhibitorId, counts]) => ({
      exhibitorId,
      exhibitorName: nameMap.get(exhibitorId) || `Exhibitor #${exhibitorId}`,
      matchedCount: counts.matched,
      preferredCount: counts.preferred,
      totalReferences: counts.matched + counts.preferred,
      weightedScore: (counts.matched * 2) + (counts.preferred * 1)
    }))
    .sort((a, b) => b.weightedScore - a.weightedScore)
    .slice(0, 10);

  return ranking;
}
