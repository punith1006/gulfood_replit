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
  type InsertLead
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
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: number, updates: { status?: string; assignedTo?: string; notes?: string }): Promise<Lead | undefined>;
  
  getAnalytics(): Promise<{
    totalRegistrations: number;
    exhibitorSignups: number;
    aiInteractions: number;
    meetingRequests: number;
    sectorEngagement: Array<{ sector: string; count: number; percentage: number }>;
    aiAccuracy: number;
    totalFeedback: number;
  }>;
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

  async createLead(lead: InsertLead): Promise<Lead> {
    const result = await db.insert(leads).values(lead).returning();
    return result[0];
  }

  async updateLead(id: number, updates: { status?: string; assignedTo?: string; notes?: string }): Promise<Lead | undefined> {
    const result = await db
      .update(leads)
      .set(updates)
      .where(eq(leads.id, id))
      .returning();
    return result[0];
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
}

export const storage = new DatabaseStorage();
