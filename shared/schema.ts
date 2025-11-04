import { pgTable, text, serial, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const exhibitors = pgTable("exhibitors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sector: text("sector").notNull(),
  country: text("country").notNull(),
  booth: text("booth").notNull(),
  venue: text("venue").notNull().default("Dubai World Trade Centre"),
  hall: text("hall"),
  boothX: integer("booth_x"),
  boothY: integer("booth_y"),
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
  scoreReasoning: text("score_reasoning"),
  summary: text("summary").notNull(),
  benefits: text("benefits").array().notNull(),
  matchedExhibitorsCount: integer("matched_exhibitors_count").notNull(),
  matchedExhibitorIds: integer("matched_exhibitor_ids").array(),
  recommendations: text("recommendations").array(),
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
  userRole: text("user_role"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const chatFeedback = pgTable("chat_feedback", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  messageIndex: integer("message_index").notNull(),
  isAccurate: boolean("is_accurate").notNull(),
  feedbackText: text("feedback_text"),
  correctedResponse: text("corrected_response"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const generatedReports = pgTable("generated_reports", {
  id: serial("id").primaryKey(),
  reportType: text("report_type").notNull(),
  userRole: text("user_role").notNull(),
  sessionId: text("session_id"),
  reportData: jsonb("report_data").notNull(),
  fileName: text("file_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const venueTraffic = pgTable("venue_traffic", {
  id: serial("id").primaryKey(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  distanceMeters: integer("distance_meters").notNull(),
  distanceText: text("distance_text").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  durationText: text("duration_text").notNull(),
  durationInTrafficSeconds: integer("duration_in_traffic_seconds"),
  durationInTrafficText: text("duration_in_traffic_text"),
  trafficCondition: text("traffic_condition"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull()
});

export const salesContacts = pgTable("sales_contacts", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  inquiry: text("inquiry"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  category: text("category").notNull(),
  message: text("message"),
  sessionId: text("session_id"),
  status: text("status").notNull().default("new"),
  assignedTo: text("assigned_to"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull()
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

export const insertVenueTrafficSchema = createInsertSchema(venueTraffic).omit({
  id: true,
  lastUpdated: true
});

export const insertSalesContactSchema = createInsertSchema(salesContacts).omit({
  id: true,
  createdAt: true,
  status: true
});

export const insertChatFeedbackSchema = createInsertSchema(chatFeedback).omit({
  id: true,
  createdAt: true
});

export const insertGeneratedReportSchema = createInsertSchema(generatedReports).omit({
  id: true,
  createdAt: true
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  status: true
});

export type Exhibitor = typeof exhibitors.$inferSelect;
export type InsertExhibitor = z.infer<typeof insertExhibitorSchema>;

export type CompanyAnalysis = typeof companyAnalyses.$inferSelect;
export type InsertCompanyAnalysis = z.infer<typeof insertCompanyAnalysisSchema>;

export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;

export type ChatConversation = typeof chatConversations.$inferSelect;
export type InsertChatConversation = z.infer<typeof insertChatConversationSchema>;

export type VenueTraffic = typeof venueTraffic.$inferSelect;
export type InsertVenueTraffic = z.infer<typeof insertVenueTrafficSchema>;

export type SalesContact = typeof salesContacts.$inferSelect;
export type InsertSalesContact = z.infer<typeof insertSalesContactSchema>;

export type ChatFeedback = typeof chatFeedback.$inferSelect;
export type InsertChatFeedback = z.infer<typeof insertChatFeedbackSchema>;

export type GeneratedReport = typeof generatedReports.$inferSelect;
export type InsertGeneratedReport = z.infer<typeof insertGeneratedReportSchema>;

export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
