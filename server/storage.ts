import { db } from "./db";
import { eq, ilike, or, sql, desc, and } from "drizzle-orm";
import {
  exhibitors,
  companyAnalyses,
  meetings,
  chatConversations,
  type Exhibitor,
  type InsertExhibitor,
  type CompanyAnalysis,
  type InsertCompanyAnalysis,
  type Meeting,
  type InsertMeeting,
  type ChatConversation,
  type InsertChatConversation
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
  updateChatConversation(sessionId: string, messages: any): Promise<ChatConversation | undefined>;
  
  getAnalytics(): Promise<{
    totalRegistrations: number;
    exhibitorSignups: number;
    aiInteractions: number;
    meetingRequests: number;
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

  async updateChatConversation(sessionId: string, messages: any): Promise<ChatConversation | undefined> {
    const result = await db
      .update(chatConversations)
      .set({ messages, updatedAt: new Date() })
      .where(eq(chatConversations.sessionId, sessionId))
      .returning();
    return result[0];
  }

  async getAnalytics(): Promise<{
    totalRegistrations: number;
    exhibitorSignups: number;
    aiInteractions: number;
    meetingRequests: number;
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

    return {
      totalRegistrations: Number(analysisCount?.count || 0),
      exhibitorSignups: Number(exhibitorCount?.count || 0),
      aiInteractions: Number(chatCount?.count || 0),
      meetingRequests: Number(meetingCount?.count || 0)
    };
  }
}

export const storage = new DatabaseStorage();
