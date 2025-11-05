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

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referralCode: text("referral_code"),
  platform: text("platform").notNull(),
  referrerName: text("referrer_name"),
  referrerEmail: text("referrer_email"),
  sessionId: text("session_id"),
  clickedAt: timestamp("clicked_at").defaultNow().notNull(),
  convertedAt: timestamp("converted_at"),
  refereeEmail: text("referee_email"),
  refereeCategory: text("referee_category"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent")
});

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  category: text("category").notNull(),
  priority: text("priority").notNull().default("normal"),
  isActive: boolean("is_active").notNull().default(true),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  targetAudience: text("target_audience").array().notNull().default(["visitor", "exhibitor", "organizer"]),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const scheduledSessions = pgTable("scheduled_sessions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  sessionType: text("session_type").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  venue: text("venue").notNull(),
  hall: text("hall"),
  speaker: text("speaker"),
  maxAttendees: integer("max_attendees"),
  currentAttendees: integer("current_attendees").notNull().default(0),
  registrationRequired: boolean("registration_required").notNull().default(false),
  targetAudience: text("target_audience").array().notNull().default(["visitor", "exhibitor", "organizer"]),
  tags: text("tags").array(),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const exhibitorAccessCodes = pgTable("exhibitor_access_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  exhibitorId: integer("exhibitor_id"),
  companyName: text("company_name").notNull(),
  email: text("email").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const organizers = pgTable("organizers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("staff"),
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
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
}).extend({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  category: z.enum(["Visitor", "Exhibitor", "Organizer", "Media", "Other"], {
    errorMap: () => ({ message: "Invalid category selected" })
  }),
  message: z.string().optional(),
  sessionId: z.string().optional(),
  assignedTo: z.string().optional(),
  notes: z.string().optional()
});

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  clickedAt: true,
  convertedAt: true
}).extend({
  platform: z.enum(["linkedin", "facebook", "x", "email", "whatsapp", "instagram"], {
    errorMap: () => ({ message: "Invalid platform" })
  }),
  referralCode: z.string().optional(),
  referrerName: z.string().optional(),
  referrerEmail: z.string().email().optional().or(z.literal("")),
  sessionId: z.string().optional(),
  refereeEmail: z.string().email().optional().or(z.literal("")),
  refereeCategory: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional()
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  title: z.string().min(1, "Title is required").max(200),
  message: z.string().min(1, "Message is required"),
  category: z.enum(["general", "event", "emergency", "update", "promo"], {
    errorMap: () => ({ message: "Invalid category" })
  }),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  targetAudience: z.array(z.enum(["visitor", "exhibitor", "organizer"])).default(["visitor", "exhibitor", "organizer"])
});

export const insertScheduledSessionSchema = createInsertSchema(scheduledSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  currentAttendees: true
}).extend({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().min(1, "Description is required"),
  sessionType: z.enum(["conference", "workshop", "networking", "demo", "panel", "other"], {
    errorMap: () => ({ message: "Invalid session type" })
  }),
  venue: z.string().min(1, "Venue is required"),
  targetAudience: z.array(z.enum(["visitor", "exhibitor", "organizer"])).default(["visitor", "exhibitor", "organizer"])
});

export const insertExhibitorAccessCodeSchema = createInsertSchema(exhibitorAccessCodes).omit({
  id: true,
  createdAt: true,
  usedAt: true
}).extend({
  code: z.string().min(6, "Code must be at least 6 characters").max(50),
  companyName: z.string().min(1, "Company name is required"),
  email: z.string().email("Invalid email address")
});

export const insertOrganizerSchema = createInsertSchema(organizers).omit({
  id: true,
  createdAt: true,
  lastLogin: true
}).extend({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["staff", "admin", "super_admin"]).default("staff")
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

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;

export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;

export type ScheduledSession = typeof scheduledSessions.$inferSelect;
export type InsertScheduledSession = z.infer<typeof insertScheduledSessionSchema>;

export type ExhibitorAccessCode = typeof exhibitorAccessCodes.$inferSelect;
export type InsertExhibitorAccessCode = z.infer<typeof insertExhibitorAccessCodeSchema>;

export type Organizer = typeof organizers.$inferSelect;
export type InsertOrganizer = z.infer<typeof insertOrganizerSchema>;
