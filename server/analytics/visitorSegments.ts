import { db } from "../db";
import { journeyPlans } from "../../shared/schema";
import { and, gte, lte, sql, desc } from "drizzle-orm";

export interface SegmentItem {
  name: string;
  count: number;
}

export async function getTopVisitorRoles(
  startDate: Date,
  endDate: Date
): Promise<SegmentItem[]> {
  const results = await db
    .select({
      role: journeyPlans.role,
      count: sql<number>`COUNT(*)::int`.as('count')
    })
    .from(journeyPlans)
    .where(
      and(
        gte(journeyPlans.createdAt, startDate),
        lte(journeyPlans.createdAt, endDate)
      )
    )
    .groupBy(journeyPlans.role)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(10);

  return results.map(r => ({
    name: r.role || 'Unknown',
    count: r.count
  }));
}

export async function getTopVisitorOrganizations(
  startDate: Date,
  endDate: Date
): Promise<SegmentItem[]> {
  const results = await db
    .select({
      organization: journeyPlans.organization,
      count: sql<number>`COUNT(*)::int`.as('count')
    })
    .from(journeyPlans)
    .where(
      and(
        gte(journeyPlans.createdAt, startDate),
        lte(journeyPlans.createdAt, endDate)
      )
    )
    .groupBy(journeyPlans.organization)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(10);

  return results.map(r => ({
    name: r.organization || 'Unknown',
    count: r.count
  }));
}

export async function getTopJourneyIntents(
  startDate: Date,
  endDate: Date
): Promise<SegmentItem[]> {
  const results = await db
    .select({
      intent: sql<string>`UNNEST(${journeyPlans.attendanceIntents})`.as('intent'),
      count: sql<number>`COUNT(*)::int`.as('count')
    })
    .from(journeyPlans)
    .where(
      and(
        gte(journeyPlans.createdAt, startDate),
        lte(journeyPlans.createdAt, endDate)
      )
    )
    .groupBy(sql`UNNEST(${journeyPlans.attendanceIntents})`)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(10);

  return results.map(r => ({
    name: r.intent,
    count: r.count
  }));
}
