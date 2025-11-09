import { db } from '../db';
import { quickActionClicks } from '@shared/schema';
import { sql, and, gte, lte } from 'drizzle-orm';

export interface QuickActionItem {
  action: string;
  count: number;
}

export interface QuickActionStats {
  visitor: QuickActionItem[];
  exhibitor: QuickActionItem[];
}

export async function getTopQuickActions(
  startDate: Date,
  endDate: Date
): Promise<QuickActionStats> {
  console.log('Computing top quick actions analytics...');
  
  const results = await db
    .select({
      action: quickActionClicks.action,
      userRole: quickActionClicks.userRole,
      count: sql<number>`count(*)::int`
    })
    .from(quickActionClicks)
    .where(
      and(
        gte(quickActionClicks.createdAt, startDate),
        lte(quickActionClicks.createdAt, endDate)
      )
    )
    .groupBy(quickActionClicks.action, quickActionClicks.userRole)
    .orderBy(sql`count(*) desc`);

  const visitorActions: QuickActionItem[] = [];
  const exhibitorActions: QuickActionItem[] = [];

  for (const row of results) {
    const item = { action: row.action, count: row.count };
    const normalizedRole = row.userRole.toLowerCase();
    if (normalizedRole === 'visitor') {
      visitorActions.push(item);
    } else if (normalizedRole === 'exhibitor') {
      exhibitorActions.push(item);
    }
  }

  return {
    visitor: visitorActions.slice(0, 10),
    exhibitor: exhibitorActions.slice(0, 10)
  };
}
