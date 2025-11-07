import { db } from "./db";
import { eq, ilike, or, sql, desc, and } from "drizzle-orm";
import {
  exhibitors,
  companyAnalyses,
  meetings,
  chatConversations,
  chatFeedback,
  generatedReports,
  venueTraffic,
  salesContacts,
  leads,
  referrals,
  announcements,
  scheduledSessions,
  exhibitorAccessCodes,
  organizers,
  journeyPlans,
  appointments,
  type Exhibitor,
  type InsertExhibitor,
  type CompanyAnalysis,
  type InsertCompanyAnalysis,
  type Meeting,
  type InsertMeeting,
  type ChatConversation,
  type InsertChatConversation,
  type ChatFeedback,
  type InsertChatFeedback,
  type GeneratedReport,
  type InsertGeneratedReport,
  type VenueTraffic,
  type InsertVenueTraffic,
  type SalesContact,
  type InsertSalesContact,
  type Lead,
  type InsertLead,
  type Referral,
  type InsertReferral,
  type Announcement,
  type InsertAnnouncement,
  type ScheduledSession,
  type InsertScheduledSession,
  type ExhibitorAccessCode,
  type InsertExhibitorAccessCode,
  type Organizer,
  type InsertOrganizer,
  type Appointment,
  type InsertAppointment
} from "@shared/schema";

export interface IStorage {
  getExhibitors(search?: string, sector?: string, country?: string): Promise<Exhibitor[]>;
  getExhibitor(id: number): Promise<Exhibitor | undefined>;
  createExhibitor(exhibitor: InsertExhibitor): Promise<Exhibitor>;
  
  getCompanyAnalysis(companyIdentifier: string): Promise<CompanyAnalysis | undefined>;
  createCompanyAnalysis(analysis: InsertCompanyAnalysis): Promise<CompanyAnalysis>;
  
  getMeetings(): Promise<Meeting[]>;
  getMeetingsByExhibitor(exhibitorId: number): Promise<Meeting[]>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  updateMeetingStatus(id: number, status: string): Promise<Meeting | undefined>;
  
  getChatConversation(sessionId: string): Promise<ChatConversation | undefined>;
  createChatConversation(conversation: InsertChatConversation): Promise<ChatConversation>;
  updateChatConversation(sessionId: string, messages: any, userRole?: string): Promise<ChatConversation | undefined>;
  
  getChatFeedback(sessionId: string): Promise<ChatFeedback[]>;
  createChatFeedback(feedback: InsertChatFeedback): Promise<ChatFeedback>;
  
  getGeneratedReports(userRole?: string): Promise<GeneratedReport[]>;
  createGeneratedReport(report: InsertGeneratedReport): Promise<GeneratedReport>;
  
  getVenueTraffic(origin: string, destination: string): Promise<VenueTraffic | undefined>;
  createOrUpdateVenueTraffic(traffic: InsertVenueTraffic): Promise<VenueTraffic>;
  
  getSalesContacts(): Promise<SalesContact[]>;
  createSalesContact(contact: InsertSalesContact): Promise<SalesContact>;
  
  getLeads(status?: string, category?: string): Promise<Lead[]>;
  getLeadByEmail(email: string): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: number, updates: Partial<InsertLead>): Promise<Lead | undefined>;
  updateLeadCategory(id: number, leadCategory: string): Promise<Lead | undefined>;
  
  getReferrals(platform?: string, startDate?: Date, endDate?: Date): Promise<Referral[]>;
  createReferral(referral: InsertReferral): Promise<Referral>;
  getReferralStats(): Promise<{
    totalClicks: number;
    totalConversions: number;
    conversionRate: number;
    platformBreakdown: Array<{ platform: string; clicks: number; conversions: number }>;
  }>;
  
  getAnalytics(): Promise<{
    totalRegistrations: number;
    exhibitorSignups: number;
    aiInteractions: number;
    meetingRequests: number;
    sectorEngagement: Array<{ sector: string; count: number; percentage: number }>;
    aiAccuracy: number;
    totalFeedback: number;
  }>;
  
  getExhibitorAnalytics(): Promise<{
    totalVisitors: number;
    totalLeads: number;
    totalAppointments: number;
    roleDistribution: Array<{ role: string; count: number; percentage: number }>;
    interestCategories: Array<{ category: string; count: number; visitors: number }>;
    intentDistribution: Array<{ intent: string; count: number; percentage: number }>;
    relevanceScores: { high: number; medium: number; low: number };
    dailyRegistrations: Array<{ date: string; count: number }>;
    recentActivity: { visitors24h: number; leads24h: number; appointments24h: number };
    leadStatusDistribution: Array<{ status: string; count: number; percentage: number }>;
    appointmentStats: { scheduled: number; completed: number; cancelled: number };
  }>;
  
  getAnnouncements(targetAudience?: string[], isActive?: boolean): Promise<Announcement[]>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  updateAnnouncement(id: number, updates: Partial<InsertAnnouncement>): Promise<Announcement | undefined>;
  deleteAnnouncement(id: number): Promise<boolean>;
  
  getScheduledSessions(targetAudience?: string[], isActive?: boolean, upcoming?: boolean): Promise<ScheduledSession[]>;
  createScheduledSession(session: InsertScheduledSession): Promise<ScheduledSession>;
  updateScheduledSession(id: number, updates: Partial<InsertScheduledSession>): Promise<ScheduledSession | undefined>;
  deleteScheduledSession(id: number): Promise<boolean>;
  
  getExhibitorAccessCode(code: string): Promise<ExhibitorAccessCode | undefined>;
  getAllExhibitorAccessCodes(): Promise<ExhibitorAccessCode[]>;
  createExhibitorAccessCode(accessCode: InsertExhibitorAccessCode): Promise<ExhibitorAccessCode>;
  validateAndUseAccessCode(code: string): Promise<ExhibitorAccessCode | null>;
  
  getOrganizerByEmail(email: string): Promise<Organizer | undefined>;
  createOrganizer(organizer: InsertOrganizer): Promise<Organizer>;
  updateOrganizerLastLogin(email: string): Promise<void>;
  
  getJourneyPlanByEmail(email: string): Promise<any | undefined>;
  createJourneyPlan(plan: any): Promise<any>;
  getJourneyPlans(sessionId?: string): Promise<any[]>;
  
  getAppointments(status?: string): Promise<Appointment[]>;
  getAppointment(id: number): Promise<Appointment | undefined>;
  getAppointmentsByLead(leadId: number): Promise<Appointment[]>;
  getAppointmentsByEmail(email: string): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointmentStatus(id: number, status: string): Promise<Appointment | undefined>;
  cancelAppointment(id: number): Promise<Appointment | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getExhibitors(search?: string, sector?: string, country?: string): Promise<Exhibitor[]> {
    const conditions = [];
    
    if (search) {
      const normalizedSearch = search.toLowerCase().replace(/[^a-z0-9]/g, '');
      conditions.push(
        or(
          sql`REGEXP_REPLACE(
            LOWER(TRANSLATE(${exhibitors.name}, 
              'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖØòóôõöøÙÚÛÜùúûüÝýÿÑñÇç', 
              'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOOooooooUUUUuuuuYyyNnCc')),
            '[^a-z0-9]', '', 'g'
          ) LIKE ${`%${normalizedSearch}%`}`,
          sql`REGEXP_REPLACE(
            LOWER(TRANSLATE(${exhibitors.description}, 
              'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖØòóôõöøÙÚÛÜùúûüÝýÿÑñÇç', 
              'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOOooooooUUUUuuuuYyyNnCc')),
            '[^a-z0-9]', '', 'g'
          ) LIKE ${`%${normalizedSearch}%`}`
        )
      );
    }
    
    if (sector && sector !== "all") {
      conditions.push(eq(exhibitors.sector, sector));
    }
    
    if (country && country !== "all") {
      conditions.push(eq(exhibitors.country, country));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(exhibitors).where(and(...conditions));
    }
    
    return await db.select().from(exhibitors);
  }

  async getExhibitor(id: number): Promise<Exhibitor | undefined> {
    const result = await db.select().from(exhibitors).where(eq(exhibitors.id, id));
    return result[0];
  }

  async createExhibitor(exhibitor: InsertExhibitor): Promise<Exhibitor> {
    const result = await db.insert(exhibitors).values(exhibitor).returning();
    return result[0];
  }

  async getCompanyAnalysis(companyIdentifier: string): Promise<CompanyAnalysis | undefined> {
    const result = await db
      .select()
      .from(companyAnalyses)
      .where(eq(companyAnalyses.companyIdentifier, companyIdentifier));
    return result[0];
  }

  async createCompanyAnalysis(analysis: InsertCompanyAnalysis): Promise<CompanyAnalysis> {
    const result = await db.insert(companyAnalyses).values(analysis).returning();
    return result[0];
  }

  async getMeetings(): Promise<Meeting[]> {
    return await db.select().from(meetings).orderBy(desc(meetings.createdAt));
  }

  async getMeetingsByExhibitor(exhibitorId: number): Promise<Meeting[]> {
    return await db
      .select()
      .from(meetings)
      .where(eq(meetings.exhibitorId, exhibitorId))
      .orderBy(desc(meetings.createdAt));
  }

  async createMeeting(meeting: InsertMeeting): Promise<Meeting> {
    const result = await db.insert(meetings).values(meeting).returning();
    return result[0];
  }

  async updateMeetingStatus(id: number, status: string): Promise<Meeting | undefined> {
    const result = await db
      .update(meetings)
      .set({ status })
      .where(eq(meetings.id, id))
      .returning();
    return result[0];
  }

  async getChatConversation(sessionId: string): Promise<ChatConversation | undefined> {
    const result = await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.sessionId, sessionId));
    return result[0];
  }

  async createChatConversation(conversation: InsertChatConversation): Promise<ChatConversation> {
    const result = await db.insert(chatConversations).values(conversation).returning();
    return result[0];
  }

  async updateChatConversation(sessionId: string, messages: any, userRole?: string): Promise<ChatConversation | undefined> {
    const updateData: any = { messages, updatedAt: new Date() };
    if (userRole) {
      updateData.userRole = userRole;
    }
    const result = await db
      .update(chatConversations)
      .set(updateData)
      .where(eq(chatConversations.sessionId, sessionId))
      .returning();
    return result[0];
  }

  async getChatFeedback(sessionId: string): Promise<ChatFeedback[]> {
    return await db
      .select()
      .from(chatFeedback)
      .where(eq(chatFeedback.sessionId, sessionId))
      .orderBy(desc(chatFeedback.createdAt));
  }

  async createChatFeedback(feedback: InsertChatFeedback): Promise<ChatFeedback> {
    const result = await db.insert(chatFeedback).values(feedback).returning();
    return result[0];
  }

  async getGeneratedReports(userRole?: string): Promise<GeneratedReport[]> {
    if (userRole) {
      return await db
        .select()
        .from(generatedReports)
        .where(eq(generatedReports.userRole, userRole))
        .orderBy(desc(generatedReports.createdAt));
    }
    return await db.select().from(generatedReports).orderBy(desc(generatedReports.createdAt));
  }

  async createGeneratedReport(report: InsertGeneratedReport): Promise<GeneratedReport> {
    const result = await db.insert(generatedReports).values(report).returning();
    return result[0];
  }

  async getVenueTraffic(origin: string, destination: string): Promise<VenueTraffic | undefined> {
    const result = await db
      .select()
      .from(venueTraffic)
      .where(and(
        eq(venueTraffic.origin, origin),
        eq(venueTraffic.destination, destination)
      ))
      .orderBy(desc(venueTraffic.lastUpdated))
      .limit(1);
    return result[0];
  }

  async createOrUpdateVenueTraffic(traffic: InsertVenueTraffic): Promise<VenueTraffic> {
    const existing = await this.getVenueTraffic(traffic.origin, traffic.destination);
    
    if (existing) {
      const result = await db
        .update(venueTraffic)
        .set({ ...traffic, lastUpdated: new Date() })
        .where(eq(venueTraffic.id, existing.id))
        .returning();
      return result[0];
    }
    
    const result = await db.insert(venueTraffic).values(traffic).returning();
    return result[0];
  }

  async getSalesContacts(): Promise<SalesContact[]> {
    return await db.select().from(salesContacts).orderBy(desc(salesContacts.createdAt));
  }

  async createSalesContact(contact: InsertSalesContact): Promise<SalesContact> {
    const result = await db.insert(salesContacts).values(contact).returning();
    return result[0];
  }

  async getLeads(status?: string, category?: string): Promise<Lead[]> {
    const conditions = [];
    
    if (status) {
      conditions.push(eq(leads.status, status));
    }
    
    if (category) {
      conditions.push(eq(leads.category, category));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(leads).where(and(...conditions)).orderBy(desc(leads.createdAt));
    }
    
    return await db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async getLeadByEmail(email: string): Promise<Lead | undefined> {
    const result = await db.select().from(leads).where(eq(leads.email, email.toLowerCase()));
    return result[0];
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    // Convert email to lowercase for consistency
    const normalizedLead = {
      ...lead,
      email: lead.email.toLowerCase()
    };
    const result = await db.insert(leads).values(normalizedLead).returning();
    return result[0];
  }

  async updateLead(id: number, updates: Partial<InsertLead>): Promise<Lead | undefined> {
    const result = await db
      .update(leads)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return result[0];
  }

  async updateLeadCategory(id: number, leadCategory: string): Promise<Lead | undefined> {
    const result = await db
      .update(leads)
      .set({ leadCategory, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return result[0];
  }

  async getReferrals(platform?: string, startDate?: Date, endDate?: Date): Promise<Referral[]> {
    const conditions = [];
    
    if (platform) {
      conditions.push(eq(referrals.platform, platform));
    }
    
    if (startDate) {
      conditions.push(sql`${referrals.clickedAt} >= ${startDate}`);
    }
    
    if (endDate) {
      conditions.push(sql`${referrals.clickedAt} <= ${endDate}`);
    }
    
    if (conditions.length > 0) {
      return await db.select().from(referrals).where(and(...conditions)).orderBy(desc(referrals.clickedAt));
    }
    
    return await db.select().from(referrals).orderBy(desc(referrals.clickedAt));
  }

  async createReferral(referral: InsertReferral): Promise<Referral> {
    const result = await db.insert(referrals).values(referral).returning();
    return result[0];
  }

  async getReferralStats(): Promise<{
    totalClicks: number;
    totalConversions: number;
    conversionRate: number;
    platformBreakdown: Array<{ platform: string; clicks: number; conversions: number }>;
  }> {
    const [clickCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(referrals);
    
    const [conversionCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(referrals)
      .where(sql`${referrals.convertedAt} IS NOT NULL`);
    
    const platformStats = await db
      .select({
        platform: referrals.platform,
        clicks: sql<number>`count(*)`,
        conversions: sql<number>`count(CASE WHEN ${referrals.convertedAt} IS NOT NULL THEN 1 END)`
      })
      .from(referrals)
      .groupBy(referrals.platform)
      .orderBy(desc(sql<number>`count(*)`));
    
    const totalClicks = Number(clickCount?.count || 0);
    const totalConversions = Number(conversionCount?.count || 0);
    const conversionRate = totalClicks > 0 
      ? Math.round((totalConversions / totalClicks) * 100) 
      : 0;
    
    const platformBreakdown = platformStats.map(({ platform, clicks, conversions }) => ({
      platform,
      clicks: Number(clicks),
      conversions: Number(conversions)
    }));
    
    return {
      totalClicks,
      totalConversions,
      conversionRate,
      platformBreakdown
    };
  }

  async getAnalytics(): Promise<{
    totalRegistrations: number;
    exhibitorSignups: number;
    aiInteractions: number;
    meetingRequests: number;
    sectorEngagement: Array<{ sector: string; count: number; percentage: number }>;
    aiAccuracy: number;
    totalFeedback: number;
  }> {
    const [exhibitorCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(exhibitors);
    
    const [analysisCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(companyAnalyses);
    
    const [chatCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatConversations);
    
    const [meetingCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(meetings);

    const [feedbackCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatFeedback);

    const [accurateFeedbackCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatFeedback)
      .where(eq(chatFeedback.isAccurate, true));

    const sectorCounts = await db
      .select({
        sector: exhibitors.sector,
        count: sql<number>`count(*)`
      })
      .from(exhibitors)
      .groupBy(exhibitors.sector)
      .orderBy(desc(sql<number>`count(*)`));

    const totalExhibitors = Number(exhibitorCount?.count || 1);
    const sectorEngagement = sectorCounts.map(({ sector, count }) => ({
      sector,
      count: Number(count),
      percentage: Math.round((Number(count) / totalExhibitors) * 100)
    }));

    const totalFeedback = Number(feedbackCount?.count || 0);
    const accurateFeedback = Number(accurateFeedbackCount?.count || 0);
    const aiAccuracy = totalFeedback > 0 
      ? Math.round((accurateFeedback / totalFeedback) * 100) 
      : 95;

    return {
      totalRegistrations: Number(analysisCount?.count || 0),
      exhibitorSignups: Number(exhibitorCount?.count || 0),
      aiInteractions: Number(chatCount?.count || 0),
      meetingRequests: Number(meetingCount?.count || 0),
      sectorEngagement,
      aiAccuracy,
      totalFeedback
    };
  }

  async getExhibitorAnalytics(): Promise<{
    totalVisitors: number;
    totalLeads: number;
    totalAppointments: number;
    roleDistribution: Array<{ role: string; count: number; percentage: number }>;
    interestCategories: Array<{ category: string; count: number; visitors: number }>;
    intentDistribution: Array<{ intent: string; count: number; percentage: number }>;
    relevanceScores: { high: number; medium: number; low: number };
    dailyRegistrations: Array<{ date: string; count: number }>;
    recentActivity: { visitors24h: number; leads24h: number; appointments24h: number };
    leadStatusDistribution: Array<{ status: string; count: number; percentage: number }>;
    appointmentStats: { scheduled: number; completed: number; cancelled: number };
  }> {
    const [journeyCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(journeyPlans);
    
    const [leadCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads);
    
    const [appointmentCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(appointments);

    const roleCounts = await db
      .select({
        role: journeyPlans.role,
        count: sql<number>`count(*)`
      })
      .from(journeyPlans)
      .where(sql`${journeyPlans.role} IS NOT NULL`)
      .groupBy(journeyPlans.role)
      .orderBy(desc(sql<number>`count(*)`));

    const totalJourneys = Number(journeyCount?.count || 1);
    const roleDistribution = roleCounts.map(({ role, count }) => ({
      role: role || 'Unknown',
      count: Number(count),
      percentage: Math.round((Number(count) / totalJourneys) * 100)
    }));

    const allJourneys = await db.select().from(journeyPlans);
    const categoryMap: Record<string, { count: number; visitors: Set<string> }> = {};
    
    allJourneys.forEach(journey => {
      if (journey.interestCategories && Array.isArray(journey.interestCategories)) {
        journey.interestCategories.forEach((cat: string) => {
          if (!categoryMap[cat]) {
            categoryMap[cat] = { count: 0, visitors: new Set() };
          }
          categoryMap[cat].count++;
          categoryMap[cat].visitors.add(journey.email);
        });
      }
    });

    const interestCategories = Object.entries(categoryMap)
      .map(([category, data]) => ({
        category,
        count: data.count,
        visitors: data.visitors.size
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const intentMap: Record<string, number> = {};
    allJourneys.forEach(journey => {
      if (journey.attendanceIntents && Array.isArray(journey.attendanceIntents)) {
        journey.attendanceIntents.forEach((intent: string) => {
          intentMap[intent] = (intentMap[intent] || 0) + 1;
        });
      }
    });

    const totalIntents = Object.values(intentMap).reduce((a, b) => a + b, 0) || 1;
    const intentDistribution = Object.entries(intentMap)
      .map(([intent, count]) => ({
        intent,
        count,
        percentage: Math.round((count / totalIntents) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    const high = allJourneys.filter(j => j.relevanceScore >= 80).length;
    const medium = allJourneys.filter(j => j.relevanceScore >= 50 && j.relevanceScore < 80).length;
    const low = allJourneys.filter(j => j.relevanceScore < 50).length;

    const last14Days = new Date();
    last14Days.setDate(last14Days.getDate() - 14);
    const dailyJourneys = await db
      .select({
        date: sql<string>`DATE(${journeyPlans.createdAt})`,
        count: sql<number>`count(*)`
      })
      .from(journeyPlans)
      .where(sql`${journeyPlans.createdAt} >= ${last14Days}`)
      .groupBy(sql`DATE(${journeyPlans.createdAt})`)
      .orderBy(sql`DATE(${journeyPlans.createdAt}) DESC`);

    const dailyRegistrations = dailyJourneys.map(({ date, count }) => ({
      date,
      count: Number(count)
    }));

    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const [visitors24h] = await db
      .select({ count: sql<number>`count(*)` })
      .from(journeyPlans)
      .where(sql`${journeyPlans.createdAt} >= ${last24Hours}`);

    const [leads24h] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(sql`${leads.createdAt} >= ${last24Hours}`);

    const [appointments24h] = await db
      .select({ count: sql<number>`count(*)` })
      .from(appointments)
      .where(sql`${appointments.createdAt} >= ${last24Hours}`);

    const leadStatuses = await db
      .select({
        status: leads.status,
        count: sql<number>`count(*)`
      })
      .from(leads)
      .groupBy(leads.status)
      .orderBy(desc(sql<number>`count(*)`));

    const totalLeads = Number(leadCount?.count || 1);
    const leadStatusDistribution = leadStatuses.map(({ status, count }) => ({
      status: status || 'unknown',
      count: Number(count),
      percentage: Math.round((Number(count) / totalLeads) * 100)
    }));

    const appointmentStatuses = await db
      .select({
        status: appointments.status,
        count: sql<number>`count(*)`
      })
      .from(appointments)
      .groupBy(appointments.status);

    const appointmentStats = {
      scheduled: Number(appointmentStatuses.find(s => s.status === 'scheduled')?.count || 0),
      completed: Number(appointmentStatuses.find(s => s.status === 'completed')?.count || 0),
      cancelled: Number(appointmentStatuses.find(s => s.status === 'cancelled')?.count || 0)
    };

    return {
      totalVisitors: Number(journeyCount?.count || 0),
      totalLeads: Number(leadCount?.count || 0),
      totalAppointments: Number(appointmentCount?.count || 0),
      roleDistribution,
      interestCategories,
      intentDistribution,
      relevanceScores: { high, medium, low },
      dailyRegistrations,
      recentActivity: {
        visitors24h: Number(visitors24h?.count || 0),
        leads24h: Number(leads24h?.count || 0),
        appointments24h: Number(appointments24h?.count || 0)
      },
      leadStatusDistribution,
      appointmentStats
    };
  }

  async getAnnouncements(targetAudience?: string[], isActive?: boolean): Promise<Announcement[]> {
    const conditions = [];

    if (isActive !== undefined) {
      conditions.push(eq(announcements.isActive, isActive));
    }

    let query = db.select().from(announcements);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)!);
    }

    const allAnnouncements = await query.orderBy(desc(announcements.priority), desc(announcements.createdAt));

    if (targetAudience && targetAudience.length > 0) {
      return allAnnouncements.filter(ann => 
        ann.targetAudience && (targetAudience.includes(ann.targetAudience) || ann.targetAudience === "All")
      );
    }

    return allAnnouncements;
  }

  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const [created] = await db.insert(announcements).values(announcement).returning();
    return created;
  }

  async updateAnnouncement(id: number, updates: Partial<InsertAnnouncement>): Promise<Announcement | undefined> {
    const [updated] = await db
      .update(announcements)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(announcements.id, id))
      .returning();
    return updated;
  }

  async deleteAnnouncement(id: number): Promise<boolean> {
    const result = await db.delete(announcements).where(eq(announcements.id, id));
    return result.rowCount > 0;
  }

  async getScheduledSessions(targetAudience?: string[], isActive?: boolean, upcoming?: boolean): Promise<ScheduledSession[]> {
    const conditions = [];
    const now = new Date();

    if (isActive !== undefined) {
      conditions.push(eq(scheduledSessions.isActive, isActive));
    }

    if (upcoming) {
      conditions.push(sql`${scheduledSessions.sessionDate} >= ${now}`);
    }

    let query = db.select().from(scheduledSessions);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)!);
    }

    const allSessions = await query.orderBy(scheduledSessions.sessionDate);

    if (targetAudience && targetAudience.length > 0) {
      return allSessions.filter(session => 
        session.targetAudience && (targetAudience.includes(session.targetAudience) || session.targetAudience === "All")
      );
    }

    return allSessions;
  }

  async createScheduledSession(session: InsertScheduledSession): Promise<ScheduledSession> {
    const [created] = await db.insert(scheduledSessions).values(session).returning();
    return created;
  }

  async updateScheduledSession(id: number, updates: Partial<InsertScheduledSession>): Promise<ScheduledSession | undefined> {
    const [updated] = await db
      .update(scheduledSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(scheduledSessions.id, id))
      .returning();
    return updated;
  }

  async deleteScheduledSession(id: number): Promise<boolean> {
    const result = await db.delete(scheduledSessions).where(eq(scheduledSessions.id, id));
    return result.rowCount > 0;
  }

  async getExhibitorAccessCode(code: string): Promise<ExhibitorAccessCode | undefined> {
    const [accessCode] = await db
      .select()
      .from(exhibitorAccessCodes)
      .where(eq(exhibitorAccessCodes.code, code))
      .limit(1);
    return accessCode;
  }

  async getAllExhibitorAccessCodes(): Promise<ExhibitorAccessCode[]> {
    const codes = await db
      .select()
      .from(exhibitorAccessCodes)
      .orderBy(sql`${exhibitorAccessCodes.createdAt} DESC`);
    return codes;
  }

  async createExhibitorAccessCode(accessCode: InsertExhibitorAccessCode): Promise<ExhibitorAccessCode> {
    const [created] = await db.insert(exhibitorAccessCodes).values(accessCode).returning();
    return created;
  }

  async validateAndUseAccessCode(code: string): Promise<ExhibitorAccessCode | null> {
    const accessCode = await this.getExhibitorAccessCode(code);
    
    if (!accessCode) {
      return null;
    }

    if (!accessCode.isActive) {
      return null;
    }

    if (accessCode.expiresAt && new Date(accessCode.expiresAt) < new Date()) {
      return null;
    }

    const [updated] = await db
      .update(exhibitorAccessCodes)
      .set({ usedAt: new Date() })
      .where(eq(exhibitorAccessCodes.id, accessCode.id))
      .returning();

    return updated;
  }

  async getOrganizerByEmail(email: string): Promise<Organizer | undefined> {
    const [organizer] = await db
      .select()
      .from(organizers)
      .where(eq(organizers.email, email))
      .limit(1);
    return organizer;
  }

  async createOrganizer(organizer: InsertOrganizer): Promise<Organizer> {
    const [created] = await db.insert(organizers).values(organizer).returning();
    return created;
  }

  async updateOrganizerLastLogin(email: string): Promise<void> {
    await db
      .update(organizers)
      .set({ lastLogin: new Date() })
      .where(eq(organizers.email, email));
  }

  async getJourneyPlanByEmail(email: string): Promise<any | undefined> {
    const [plan] = await db
      .select()
      .from(journeyPlans)
      .where(eq(journeyPlans.email, email))
      .orderBy(desc(journeyPlans.createdAt))
      .limit(1);
    return plan;
  }

  async createJourneyPlan(plan: any): Promise<any> {
    const [created] = await db.insert(journeyPlans).values(plan).returning();
    return created;
  }

  async getJourneyPlans(sessionId?: string): Promise<any[]> {
    if (sessionId) {
      return db
        .select()
        .from(journeyPlans)
        .where(eq(journeyPlans.sessionId, sessionId))
        .orderBy(desc(journeyPlans.createdAt));
    }
    return db
      .select()
      .from(journeyPlans)
      .orderBy(desc(journeyPlans.createdAt));
  }

  async getAppointments(status?: string): Promise<Appointment[]> {
    if (status) {
      return await db.select().from(appointments)
        .where(eq(appointments.status, status))
        .orderBy(desc(appointments.scheduledTime));
    }
    return await db.select().from(appointments).orderBy(desc(appointments.scheduledTime));
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment;
  }

  async getAppointmentsByLead(leadId: number): Promise<Appointment[]> {
    return await db.select().from(appointments)
      .where(eq(appointments.leadId, leadId))
      .orderBy(desc(appointments.scheduledTime));
  }

  async getAppointmentsByEmail(email: string): Promise<Appointment[]> {
    return await db.select().from(appointments)
      .where(eq(appointments.email, email.toLowerCase()))
      .orderBy(desc(appointments.scheduledTime));
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const normalizedAppointment = {
      ...appointment,
      email: appointment.email.toLowerCase()
    };
    
    const [created] = await db.insert(appointments).values(normalizedAppointment).returning();
    return created;
  }

  async updateAppointmentStatus(id: number, status: string): Promise<Appointment | undefined> {
    const [updated] = await db
      .update(appointments)
      .set({ status, updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();
    return updated;
  }

  async cancelAppointment(id: number): Promise<Appointment | undefined> {
    const [cancelled] = await db
      .update(appointments)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();
    return cancelled;
  }
}

export const storage = new DatabaseStorage();
