import { db } from "../db";
import { journeyPlans, exhibitors } from "../../shared/schema";
import { and, gte, lte, sql, desc } from "drizzle-orm";

export interface JourneyOverview {
  totalJourneys: number;
  uniqueVisitors: number;
  averageJourneysPerVisitor: number;
  journeysLast24h: number;
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
    averageJourneysPerVisitor: uniqueVisitors > 0 ? Math.round((totalJourneys / uniqueVisitors) * 10) / 10 : 0,
    journeysLast24h: journeysLast24Hours
  };
}

export async function getTopInterestCategories(
  startDate: Date,
  endDate: Date
): Promise<CategoryItem[]> {
  const results = await db.execute(sql`
    SELECT 
      category,
      COUNT(*)::int as count
    FROM 
      ${journeyPlans},
      UNNEST(${journeyPlans.interestCategories}) AS category
    WHERE 
      ${journeyPlans.createdAt} >= ${startDate}
      AND ${journeyPlans.createdAt} <= ${endDate}
    GROUP BY category
    ORDER BY count DESC
    LIMIT 10
  `);

  return results.rows.map((r: any) => ({
    category: r.category,
    count: r.count
  }));
}

export async function getTopExhibitorRanking(
  startDate: Date,
  endDate: Date
): Promise<ExhibitorRankingItem[]> {
  // Get all exhibitor references with weights using lateral joins
  const results = await db.execute(sql`
    WITH exhibitor_refs AS (
      SELECT 
        matched_id AS exhibitor_id,
        2 AS weight,
        'matched' AS source
      FROM 
        ${journeyPlans},
        UNNEST(${journeyPlans.matchedExhibitorIds}) AS matched_id
      WHERE 
        ${journeyPlans.createdAt} >= ${startDate}
        AND ${journeyPlans.createdAt} <= ${endDate}
      
      UNION ALL
      
      SELECT 
        preferred_id AS exhibitor_id,
        1 AS weight,
        'preferred' AS source
      FROM 
        ${journeyPlans},
        UNNEST(${journeyPlans.preferredExhibitorIds}) AS preferred_id
      WHERE 
        ${journeyPlans.createdAt} >= ${startDate}
        AND ${journeyPlans.createdAt} <= ${endDate}
    ),
    exhibitor_counts AS (
      SELECT 
        exhibitor_id,
        COUNT(*) FILTER (WHERE source = 'matched')::int AS matched_count,
        COUNT(*) FILTER (WHERE source = 'preferred')::int AS preferred_count,
        SUM(weight)::int AS weighted_score
      FROM exhibitor_refs
      WHERE exhibitor_id IS NOT NULL
      GROUP BY exhibitor_id
    )
    SELECT 
      ec.exhibitor_id,
      COALESCE(e.name, 'Exhibitor #' || ec.exhibitor_id) AS exhibitor_name,
      ec.matched_count,
      ec.preferred_count,
      (ec.matched_count + ec.preferred_count) AS total_references,
      ec.weighted_score
    FROM exhibitor_counts ec
    LEFT JOIN ${exhibitors} e ON e.id = ec.exhibitor_id
    ORDER BY ec.weighted_score DESC
    LIMIT 10
  `);

  return results.rows.map((r: any) => ({
    exhibitorId: r.exhibitor_id,
    exhibitorName: r.exhibitor_name,
    matchedCount: r.matched_count,
    preferredCount: r.preferred_count,
    totalReferences: r.total_references,
    weightedScore: r.weighted_score
  }));
}
