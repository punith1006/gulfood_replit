import { pgTable, text, serial, integer, timestamp, jsonb, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Comprehensive Gulfood exhibitor categories
export const GULFOOD_CATEGORIES = [
  "Beverages",
  "Dairy Products",
  "Fats & Oils",
  "Health, Wellness & Free-From",
  "Meat & Poultry",
  "Pulses, Grains & Cereals",
  "World Food",
  "Bakery & Confectionery",
  "Fresh Produce",
  "Seafood",
  "Frozen Food",
  "Canned & Preserved Food",
  "Organic & Natural Products",
  "Plant-Based & Vegan",
  "Snacks & Nuts",
  "Spices & Condiments",
  "Ingredients & Food Additives",
  "Food Packaging & Machinery",
  "Catering Equipment & Supplies",
  "Coffee & Tea",
  "Halal Products",
  "Kosher Products",
  "Private Label",
  "Retail & Distribution"
] as const;

export type GulfoodCategory = typeof GULFOOD_CATEGORIES[number];

// Sector normalization map: Maps form categories to database sectors
// This handles cases where form labels differ from database values
export const SECTOR_NORMALIZATION: Record<string, string[]> = {
  "Dairy": ["Dairy Products", "Dairy"],
  "Rice, Pulses & Grain": ["Pulses, Grains & Cereals", "Rice, Pulses & Grain"],
  "Beverages": ["Beverages", "Coffee & Tea"],
  "Fats & Oils": ["Fats & Oils"],
  "Meat & Poultry": ["Meat & Poultry", "Seafood"],
  "Power Brands": ["Power Brands"],
  "Grocery Trade": ["Grocery Trade", "Retail & Distribution", "Private Label"],
  "World Food": [
    "World Food",
    "Bakery & Confectionery",
    "Fresh Produce",
    "Frozen Food",
    "Canned & Preserved Food",
    "Organic & Natural Products",
    "Plant-Based & Vegan",
    "Snacks & Nuts",
    "Spices & Condiments",
    "Ingredients & Food Additives",
    "Food Packaging & Machinery",
    "Catering Equipment & Supplies",
    "Halal Products",
    "Kosher Products",
    "Health, Wellness & Free-From"
  ]
};

// Category-specific keywords for semantic matching
// These keywords help identify exhibitors relevant to each category
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Bakery & Confectionery": ["bakery", "bread", "pastry", "cake", "cookie", "biscuit", "confectionery", "chocolate", "candy", "sweet", "dessert", "patisserie", "croissant", "donut", "muffin", "bagel", "baking"],
  "Dairy Products": ["dairy", "milk", "cheese", "yogurt", "butter", "cream", "ice cream", "lactose", "whey", "casein"],
  "Beverages": ["beverage", "drink", "juice", "water", "soda", "soft drink", "energy drink", "sports drink"],
  "Coffee & Tea": ["coffee", "tea", "espresso", "cappuccino", "latte", "herbal tea", "green tea", "black tea", "chai"],
  "Meat & Poultry": ["meat", "beef", "chicken", "pork", "lamb", "turkey", "poultry", "sausage", "ham", "bacon"],
  "Seafood": ["seafood", "fish", "salmon", "tuna", "shrimp", "crab", "lobster", "shellfish", "marine"],
  "Fresh Produce": ["fresh", "fruit", "vegetable", "produce", "organic", "farm", "harvest"],
  "Frozen Food": ["frozen", "freeze", "ice", "refrigerated", "cold storage"],
  "Canned & Preserved Food": ["canned", "preserved", "tinned", "jarred", "pickled", "canning"],
  "Organic & Natural Products": ["organic", "natural", "bio", "sustainable", "eco", "green"],
  "Plant-Based & Vegan": ["vegan", "plant-based", "vegetarian", "meat-free", "dairy-free"],
  "Snacks & Nuts": ["snack", "nut", "almond", "cashew", "peanut", "chip", "crisp", "popcorn"],
  "Spices & Condiments": ["spice", "condiment", "sauce", "seasoning", "masala", "curry", "pepper", "salt", "herb"],
  "Pulses, Grains & Cereals": ["pulse", "grain", "cereal", "rice", "wheat", "lentil", "bean", "oat", "barley"],
  "Fats & Oils": ["oil", "fat", "olive oil", "vegetable oil", "palm oil", "butter oil", "ghee"],
  "Ingredients & Food Additives": ["ingredient", "additive", "flavoring", "preservative", "emulsifier"],
  "Food Packaging & Machinery": ["packaging", "machinery", "equipment", "container", "wrapping", "bottling"],
  "Catering Equipment & Supplies": ["catering", "equipment", "supplies", "kitchen", "restaurant", "commercial"],
  "Halal Products": ["halal", "islamic", "sharia"],
  "Kosher Products": ["kosher", "jewish", "rabbinical"],
  "Health, Wellness & Free-From": ["health", "wellness", "gluten-free", "sugar-free", "low-fat", "diet", "nutrition"],
  "Private Label": ["private label", "own brand", "store brand", "white label"],
  "Retail & Distribution": ["retail", "distribution", "wholesale", "supply chain", "logistics"],
  "Power Brands": ["brand", "trademark", "label"],
  "World Food": ["food", "cuisine", "culinary"],
  "Grocery Trade": ["grocery", "supermarket", "retail", "trade"]
};

// Helper function to check if exhibitor matches category keywords
export function exhibitorMatchesCategory(
  exhibitor: { description: string; products?: string[] | null; sector: string; sectors?: string[] | null },
  category: string
): boolean {
  const keywords = CATEGORY_KEYWORDS[category] || [];
  if (keywords.length === 0) return true; // If no keywords defined, allow match
  
  const searchText = [
    exhibitor.description,
    ...(exhibitor.products || []),
    exhibitor.sector,
    ...(exhibitor.sectors || [])
  ].join(" ").toLowerCase();
  
  // Check if any keyword appears in the exhibitor's text
  return keywords.some(keyword => searchText.includes(keyword.toLowerCase()));
}

// Helper function to normalize interest categories to database sectors
export function normalizeInterestCategories(categories: string[]): string[] {
  const normalizedSectors = new Set<string>();
  
  for (const category of categories) {
    // Always include the original category to ensure specific matches work
    normalizedSectors.add(category);
    
    // Find which database sector(s) this category maps to
    for (const [dbSector, formCategories] of Object.entries(SECTOR_NORMALIZATION)) {
      if (formCategories.some(fc => 
        fc.toLowerCase() === category.toLowerCase() ||
        category.toLowerCase().includes(fc.toLowerCase()) ||
        fc.toLowerCase().includes(category.toLowerCase())
      )) {
        normalizedSectors.add(dbSector);
      }
    }
  }
  
  return Array.from(normalizedSectors);
}

export const exhibitors = pgTable("exhibitors", {
  id: serial("id").primaryKey(),
  eid: text("eid").unique(),
  name: text("name").notNull(),
  sector: text("sector").notNull(),
  sectors: text("sectors").array(),
  country: text("country").notNull(),
  booth: text("booth").notNull(),
  stand: text("stand"),
  venue: text("venue").notNull().default("Dubai World Trade Centre"),
  hall: text("hall"),
  boothX: integer("booth_x"),
  boothY: integer("booth_y"),
  description: text("description").notNull(),
  info: text("info"),
  logoUrl: text("logo_url"),
  website: text("website"),
  products: text("products").array(),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => ({
  countryIdx: index("exhibitors_country_idx").on(table.country),
  hallIdx: index("exhibitors_hall_idx").on(table.hall),
  sectorsIdx: index("exhibitors_sectors_idx").on(table.sectors)
}));

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
  email: text("email").notNull().unique(),
  company: text("company"),
  companyWebsite: text("company_website"),
  role: text("role"), // Visitor or Exhibitor
  phone: text("phone"),
  category: text("category"), // Legacy field, kept for backward compatibility
  message: text("message"),
  sessionId: text("session_id"),
  capturedVia: text("captured_via").notNull().default("direct"), // direct, conversational, contextual
  conversationId: text("conversation_id"), // Link to chat session
  userType: text("user_type"), // Visitor/Exhibitor from role selection
  leadCategory: text("lead_category"), // Auto-categorized: registration_interest, exhibitor_interest, content_interest, sponsorship_interest, general_inquiry
  sourcePage: text("source_page"), // Track originating page URL
  status: text("status").notNull().default("new"),
  assignedTo: text("assigned_to"),
  notes: text("notes"),
  capturedAt: timestamp("captured_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  targetAudience: text("target_audience").notNull().default("All"),
  priority: text("priority").notNull().default("normal"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const scheduledSessions = pgTable("scheduled_sessions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  sessionDate: timestamp("session_date").notNull(),
  sessionTime: text("session_time"),
  location: text("location"),
  targetAudience: text("target_audience").notNull().default("All"),
  isActive: boolean("is_active").notNull().default(true),
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

export const journeyPlans = pgTable("journey_plans", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id"), // Link to leads table if lead exists
  sessionId: text("session_id").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  organization: text("organization").notNull(),
  role: text("role").notNull(),
  interestCategories: text("interest_categories").array().notNull().default([]),
  attendanceIntents: text("attendance_intents").array().notNull().default([]),
  // Visit planning details
  numberOfDays: integer("number_of_days").default(5), // How many days they plan to attend (1-5)
  specificDates: text("specific_dates").array(), // Specific dates they'll attend (e.g., ['2026-01-26', '2026-01-27'])
  preferredExhibitorIds: integer("preferred_exhibitor_ids").array(), // Exhibitors they're specifically interested in
  relevanceScore: integer("relevance_score").notNull(), // 0-100
  // Organization enrichment data from web search
  organizationEnrichment: jsonb("organization_enrichment"), // Enriched organization context: industry, size, products, recent news, etc.
  // AI-generated content
  generalOverview: text("general_overview"),
  scoreJustification: text("score_justification"), // Detailed justification for relevance score with KPIs and takeaways
  benefits: text("benefits").array(),
  recommendations: text("recommendations").array(),
  // Matched exhibitors and sessions
  matchedExhibitorIds: integer("matched_exhibitor_ids").array(),
  matchedSessionIds: integer("matched_session_ids").array(),
  // Additional data stored as JSON
  reportData: jsonb("report_data"), // Full report data including exhibitor details with match scores, session details, etc.
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id"), // Link to leads table
  sessionId: text("session_id"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  organization: text("organization").notNull(),
  role: text("role").notNull(),
  meetingPurpose: text("meeting_purpose").notNull(),
  scheduledTime: timestamp("scheduled_time").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(30),
  status: text("status").notNull().default("scheduled"), // scheduled, completed, cancelled, no_show
  googleCalendarEventId: text("google_calendar_event_id"),
  googleMeetLink: text("google_meet_link"),
  timezone: text("timezone").notNull().default("Asia/Dubai"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const itineraries = pgTable("itineraries", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id"), // Link to leads table if lead exists
  journeyPlanId: integer("journey_plan_id"), // Link to journey plan
  sessionId: text("session_id").notNull(),
  userId: text("user_id").notNull(), // Email or unique identifier
  name: text("name").notNull(),
  organization: text("organization").notNull(),
  role: text("role").notNull(),
  email: text("email").notNull(),
  // Itinerary data stored as JSON
  itineraryData: jsonb("itinerary_data").notNull(), // Full itinerary with days and activities
  totalExhibitors: integer("total_exhibitors").notNull().default(0),
  totalSessions: integer("total_sessions").notNull().default(0),
  totalDays: integer("total_days").notNull().default(5),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const exhibitorAssessments = pgTable("exhibitor_assessments", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  companyName: text("company_name").notNull(),
  websiteUrl: text("website_url"),
  primaryGoal: text("primary_goal").notNull(),
  country: text("country").notNull(),
  extractedData: jsonb("extracted_data"), // AI-extracted company data: industry, products, target markets, etc.
  relevanceScore: integer("relevance_score").notNull(), // 0-100
  scoreBreakdown: jsonb("score_breakdown"), // Detailed breakdown of score components
  recommendations: jsonb("recommendations"), // Booth size, location, budget, ROI projections
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// ExhibitorAnalytics interface for analytics API
export interface ExhibitorAnalytics {
  totalAppearances: number;
  uniqueVisitors: number;
  last7DaysTrend: Array<{ date: string; count: number }>;
  visitorRoles: Array<{ role: string; count: number }>;
  visitorIntents: Array<{ intent: string; count: number }>;
  topInterestCategories: Array<{ category: string; count: number }>;
  topCompanies: Array<{ company: string; searches: number }>;
  coSearchedExhibitors: Array<{ exhibitorName: string; coSearches: number }>;
  averageRelevanceScore: number;
  matchQualityDistribution: { high: number; medium: number; low: number };
  visitorJobTitles: Array<{ title: string; count: number }>;
  weekOverWeekGrowth: number;
  peakActivityDays: Array<{ day: string; count: number }>;
}

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
  capturedAt: true,
  updatedAt: true,
  status: true
}).extend({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  company: z.string().optional(),
  companyWebsite: z.string().url("Invalid URL").optional().or(z.literal("")),
  role: z.string().optional(),
  phone: z.string().optional(),
  category: z.enum(["Visitor", "Exhibitor", "Organizer", "Media", "Other"]).optional(),
  message: z.string().optional(),
  sessionId: z.string().optional(),
  capturedVia: z.enum(["direct", "conversational", "contextual"]).default("direct"),
  conversationId: z.string().optional(),
  userType: z.string().optional(),
  leadCategory: z.string().optional(),
  sourcePage: z.string().optional(),
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
  targetAudience: z.enum(["All", "Visitor", "Exhibitor", "Organizer"]).default("All"),
  priority: z.enum(["normal", "high", "urgent"]).default("normal"),
  isActive: z.boolean().default(true)
});

export const insertScheduledSessionSchema = createInsertSchema(scheduledSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional(),
  sessionDate: z.string().or(z.date()),
  sessionTime: z.string().optional(),
  location: z.string().optional(),
  targetAudience: z.enum(["All", "Visitor", "Exhibitor", "Organizer"]).default("All"),
  isActive: z.boolean().default(true)
});

export const insertExhibitorAccessCodeSchema = createInsertSchema(exhibitorAccessCodes).omit({
  id: true,
  code: true,
  createdAt: true,
  isActive: true,
  usedAt: true
}).extend({
  exhibitorId: z.number().positive("Please select an exhibitor"),
  companyName: z.string().min(1, "Company name is required"),
  email: z.string().email("Invalid email address"),
  expiresAt: z.string().optional().transform(val => val && val.trim() !== '' ? new Date(val) : undefined)
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

export const insertJourneyPlanSchema = createInsertSchema(journeyPlans).omit({
  id: true,
  createdAt: true
}).extend({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  organization: z.string().min(2, "Organization name is required"),
  role: z.string().min(1, "Role is required"),
  interestCategories: z.array(z.string()).default([]),
  attendanceIntents: z.array(z.string()).default([]),
  numberOfDays: z.number().min(1).max(5).default(5).optional(),
  specificDates: z.array(z.string()).optional(),
  preferredExhibitorIds: z.array(z.number()).optional(),
  relevanceScore: z.number().min(0).max(100),
  sessionId: z.string(),
  leadId: z.number().optional()
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true
}).extend({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  organization: z.string().min(1, "Organization is required"),
  role: z.string().min(1, "Role is required"),
  meetingPurpose: z.string().min(5, "Please provide a meeting purpose"),
  scheduledTime: z.string().or(z.date()),
  durationMinutes: z.number().default(30),
  leadId: z.number().optional(),
  sessionId: z.string().optional(),
  googleCalendarEventId: z.string().optional(),
  googleMeetLink: z.string().optional(),
  timezone: z.string().default("Asia/Dubai")
});

export const insertItinerarySchema = createInsertSchema(itineraries).omit({
  id: true,
  createdAt: true
}).extend({
  userId: z.string().min(1, "User ID is required"),
  name: z.string().min(1, "Name is required"),
  organization: z.string().min(1, "Organization is required"),
  role: z.string().min(1, "Role is required"),
  email: z.string().email("Invalid email address"),
  sessionId: z.string(),
  leadId: z.number().optional(),
  journeyPlanId: z.number().optional(),
  itineraryData: z.any(),
  totalExhibitors: z.number().default(0),
  totalSessions: z.number().default(0),
  totalDays: z.number().default(5)
});

export const insertExhibitorAssessmentSchema = createInsertSchema(exhibitorAssessments).omit({
  id: true,
  createdAt: true
}).extend({
  sessionId: z.string(),
  companyName: z.string().min(2, "Company name is required"),
  websiteUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  primaryGoal: z.string().min(5, "Please describe your primary goal"),
  country: z.string().min(2, "Country is required"),
  relevanceScore: z.number().min(0).max(100),
  extractedData: z.any().optional(),
  scoreBreakdown: z.any().optional(),
  recommendations: z.any().optional()
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

export type JourneyPlan = typeof journeyPlans.$inferSelect;
export type InsertJourneyPlan = z.infer<typeof insertJourneyPlanSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type Itinerary = typeof itineraries.$inferSelect;
export type InsertItinerary = z.infer<typeof insertItinerarySchema>;

export type ExhibitorAssessment = typeof exhibitorAssessments.$inferSelect;
export type InsertExhibitorAssessment = z.infer<typeof insertExhibitorAssessmentSchema>;

// TypeScript interfaces for itinerary structure
export interface ItineraryActivity {
  id: string;
  type: 'exhibitor_visit' | 'session' | 'break' | 'travel';
  title: string;
  startTime: string;
  endTime: string;
  duration: number;
  location?: string;
  stand?: string;
  exhibitorId?: number;
  exhibitorName?: string;
  sessionId?: number;
  description?: string;
  relevanceScore?: number;
  travelFrom?: string;
  travelTo?: string;
}

export interface ItineraryDay {
  date: string;
  dayOfWeek: string;
  activities: ItineraryActivity[];
  summary: string;
}

export interface ItineraryData {
  userId: string;
  name: string;
  organization: string;
  role: string;
  days: ItineraryDay[];
  totalExhibitors: number;
  totalSessions: number;
  generatedAt: string;
}
