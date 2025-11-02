import { pgTable, text, serial, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const exhibitors = pgTable("exhibitors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sector: text("sector").notNull(),
  country: text("country").notNull(),
  booth: text("booth").notNull(),
  description: text("description").notNull(),
  logoUrl: text("logo_url"),
  website: text("website"),
  products: text("products").array(),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const companyAnalyses = pgTable("company_analyses", {
  id: serial("id").primaryKey(),
  companyIdentifier: text("company_identifier").notNull(),
  companyName: text("company_name").notNull(),
  sector: text("sector").array().notNull(),
  relevanceScore: integer("relevance_score").notNull(),
  summary: text("summary").notNull(),
  benefits: text("benefits").array().notNull(),
  matchedExhibitorsCount: integer("matched_exhibitors_count").notNull(),
  matchedExhibitorIds: integer("matched_exhibitor_ids").array(),
  analysisData: jsonb("analysis_data"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  visitorName: text("visitor_name").notNull(),
  visitorEmail: text("visitor_email").notNull(),
  visitorCompany: text("visitor_company").notNull(),
  exhibitorId: integer("exhibitor_id").notNull(),
  meetingDate: timestamp("meeting_date").notNull(),
  duration: integer("duration").notNull(),
  status: text("status").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const chatConversations = pgTable("chat_conversations", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  messages: jsonb("messages").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const insertExhibitorSchema = createInsertSchema(exhibitors).omit({
  id: true,
  createdAt: true
});

export const insertCompanyAnalysisSchema = createInsertSchema(companyAnalyses).omit({
  id: true,
  createdAt: true
});

export const insertMeetingSchema = createInsertSchema(meetings).omit({
  id: true,
  createdAt: true
});

export const insertChatConversationSchema = createInsertSchema(chatConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type Exhibitor = typeof exhibitors.$inferSelect;
export type InsertExhibitor = z.infer<typeof insertExhibitorSchema>;

export type CompanyAnalysis = typeof companyAnalyses.$inferSelect;
export type InsertCompanyAnalysis = z.infer<typeof insertCompanyAnalysisSchema>;

export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;

export type ChatConversation = typeof chatConversations.$inferSelect;
export type InsertChatConversation = z.infer<typeof insertChatConversationSchema>;
