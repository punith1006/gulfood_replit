import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCompanyAnalysisSchema, insertMeetingSchema, insertSalesContactSchema, insertChatFeedbackSchema, insertGeneratedReportSchema, insertLeadSchema, insertReferralSchema, insertAnnouncementSchema, insertScheduledSessionSchema, insertExhibitorAccessCodeSchema, insertAppointmentSchema, normalizeInterestCategories, exhibitorMatchesCategory } from "@shared/schema";
import { googleCalendar } from "./googleCalendar";
import { sendAppointmentConfirmation } from "./emailService";
import OpenAI from "openai";
import { z } from "zod";
import { seedDatabase } from "./seed";
import bcrypt from "bcryptjs";
import { requireOrganizerAuth, requireExhibitorAuth, generateOrganizerToken, generateExhibitorToken, type AuthRequest } from "./middleware/auth";
import { enrichOrganization } from './organizationEnrichment';
import { calculateRelevanceScore as calculateIntelligentRelevanceScore, calculateExhibitorMatchScores } from './intelligentScoring';
// Semantic matcher no longer used - replaced with AI evaluation

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

const chatTranscriptDownloadSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).min(1),
  sessionId: z.string().regex(/^session_\d+_[a-zA-Z0-9]+$/, 'Invalid sessionId format'),
  userRole: z.string().nullable().optional(),
  leadInfo: z.object({
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional()
  }).optional()
});

export async function registerRoutes(app: Express): Promise<Server> {
  await seedDatabase();

  app.get("/api/exhibitors", async (req, res) => {
    try {
      const { search, sector, country, hall, stand, venue } = req.query;
      const exhibitors = await storage.getExhibitors(
        search as string | undefined,
        sector as string | undefined,
        country as string | undefined,
        hall as string | undefined,
        stand as string | undefined,
        venue as string | undefined
      );
      res.json(exhibitors);
    } catch (error) {
      console.error("Error fetching exhibitors:", error);
      res.status(500).json({ error: "Failed to fetch exhibitors" });
    }
  });

  app.get("/api/exhibitors/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const exhibitor = await storage.getExhibitor(id);
      
      if (!exhibitor) {
        return res.status(404).json({ error: "Exhibitor not found" });
      }
      
      res.json(exhibitor);
    } catch (error) {
      console.error("Error fetching exhibitor:", error);
      res.status(500).json({ error: "Failed to fetch exhibitor" });
    }
  });

  app.get("/api/exhibitor/analytics", requireExhibitorAuth, async (req: AuthRequest, res) => {
    try {
      const { companyName, exhibitorId } = req.exhibitor!;
      const exhibitor = await storage.getExhibitorByCompanyName(companyName, exhibitorId);
      
      if (!exhibitor) {
        return res.status(404).json({ error: "Exhibitor not found" });
      }
      
      const analytics = await storage.getExhibitorAnalytics(exhibitor.id);
      res.json({ exhibitor, analytics });
    } catch (error) {
      console.error("Error fetching exhibitor analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  app.post("/api/analyze-company", async (req, res) => {
    try {
      const { companyIdentifier } = req.body;
      
      if (!companyIdentifier) {
        return res.status(400).json({ error: "Company identifier is required" });
      }

      // Validate company identifier - reject gibberish/invalid inputs
      const cleanedIdentifier = companyIdentifier.trim().toLowerCase();
      
      // Check for valid website pattern (if it looks like a URL)
      const isUrl = cleanedIdentifier.includes('.') || cleanedIdentifier.startsWith('www') || cleanedIdentifier.includes('://');
      if (isUrl) {
        // Must have valid domain pattern
        const validDomainPattern = /^(https?:\/\/)?(www\.)?[a-z0-9]+([\-\.][a-z0-9]+)*\.[a-z]{2,}(\/.*)?$/i;
        if (!validDomainPattern.test(cleanedIdentifier)) {
          return res.status(400).json({ 
            error: "This doesn't appear to be a valid company name or website. Please enter a real company name or website URL (e.g., 'nestlé.com' or 'Coca-Cola')." 
          });
        }
        // URL is valid, skip the gibberish checks
      } else {
        // For company names (not URLs), check for obvious gibberish patterns
        const hasValidPattern = 
          // Has at least one vowel (a, e, i, o, u)
          /[aeiou]/.test(cleanedIdentifier) &&
          // Not too many consecutive consonants (max 4)
          !/[bcdfghjklmnpqrstvwxyz]{5,}/.test(cleanedIdentifier) &&
          // Not too many consecutive numbers (max 6)
          !/\d{7,}/.test(cleanedIdentifier) &&
          // Has reasonable length (3-100 characters)
          cleanedIdentifier.length >= 3 && cleanedIdentifier.length <= 100 &&
          // Not all numbers
          !/^\d+$/.test(cleanedIdentifier);

        // Reject if it doesn't have valid pattern
        if (!hasValidPattern) {
          return res.status(400).json({ 
            error: "This doesn't appear to be a valid company name or website. Please enter a real company name or website URL (e.g., 'Almarai' or 'pepsico.com')." 
          });
        }
      }

      const existing = await storage.getCompanyAnalysis(companyIdentifier);
      if (existing) {
        // Populate matched exhibitor details
        if (existing.matchedExhibitorIds && existing.matchedExhibitorIds.length > 0) {
          const matchedExhibitors = [];
          for (const id of existing.matchedExhibitorIds) {
            const exhibitor = await storage.getExhibitor(id);
            if (exhibitor) {
              matchedExhibitors.push({
                id: exhibitor.id,
                name: exhibitor.name,
                sector: exhibitor.sector,
                booth: exhibitor.booth
              });
            }
          }
          return res.json({ ...existing, matchedExhibitors });
        }
        return res.json(existing);
      }

      if (!openai) {
        return res.status(503).json({ 
          error: "AI analysis is currently unavailable. Please configure OPENAI_API_KEY to enable this feature." 
        });
      }

      const exhibitors = await storage.getExhibitors();
      
      const prompt = `Analyze this company/website: "${companyIdentifier}" for Gulfood 2026, the world's largest FOOD & BEVERAGE exhibition in Dubai.

CRITICAL: Gulfood 2026 is EXCLUSIVELY for the food and beverage industry. Be REALISTIC and STRICT with relevance scoring.

Available exhibitor sectors: Dairy, Beverages, Meat & Poultry, Plant-Based, Fresh Produce, Snacks, Gourmet, Organic Foods, Confectionery, Bakery, Seafood, Health & Wellness, Fats & Oils

RELEVANCE SCORING GUIDELINES (BE STRICT):
- 80-100%: Direct food/beverage manufacturers, suppliers, or distributors (e.g., dairy companies, beverage makers, food producers)
- 50-79%: Food packaging, food technology, food logistics, restaurant equipment, food safety companies
- 20-49%: Tangentially related (e.g., agricultural tech, hospitality, retail chains selling food)
- 0-19%: NOT related to food/beverage industry (e.g., IT firms, fashion, automotive, real estate, general consulting)

IMPORTANT: If the company is NOT in food/beverage or food-related industries, score should be 0-15% maximum.

Provide a JSON response with:
1. companyName: The company name (infer from identifier if needed)
2. sector: Array of relevant food/beverage sectors. Use ["General"] if not food-related
3. relevanceScore: Number 0-100. BE REALISTIC - most non-food companies should be 0-15%
4. scoreReasoning: 2-3 sentences explaining WHY this relevance score was given. For low scores, clearly state the company is not in the food/beverage industry
5. summary: Brief 2-3 sentence company description focusing on their actual business
6. benefits: Array of 4 benefits. For non-food companies, be honest about limited relevance (e.g., "Limited direct relevance to core business")
7. matchedExhibitorsCount: Realistic number. Non-food companies should have 0-50 matched exhibitors
8. recommendations: Array of 3 recommendations. For non-food companies, acknowledge limited relevance (e.g., "Recommendation: Consider alternative industry events - Logic: Gulfood focuses on food/beverage which is outside your core business")

Format as valid JSON only, no markdown.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      });

      const content = completion.choices[0].message.content || "{}";
      
      let analysisData;
      try {
        analysisData = JSON.parse(content.replace(/```json\n?/g, "").replace(/```\n?/g, ""));
      } catch (parseError) {
        console.error("Failed to parse OpenAI response:", content);
        return res.status(500).json({ error: "Failed to parse AI analysis. Please try again." });
      }

      const analysisSchema = z.object({
        companyName: z.string().min(1),
        sector: z.array(z.string()).min(1).default(["General"]),
        relevanceScore: z.number().min(0).max(100).default(50),
        scoreReasoning: z.string().min(1).default("Score based on general industry alignment with Gulfood 2026 exhibitors and event focus areas."),
        summary: z.string().min(1),
        benefits: z.array(z.string()).min(1).default(["Connect with industry professionals", "Explore new market opportunities"]),
        matchedExhibitorsCount: z.number().min(0).default(100),
        recommendations: z.array(z.string()).min(1).default(["Connect with relevant exhibitors in your sector", "Attend sector-specific networking events", "Schedule meetings with potential partners"])
      });

      let validated;
      const validationResult = analysisSchema.safeParse(analysisData);
      
      if (!validationResult.success) {
        console.error("Invalid AI response structure:", validationResult.error);
        
        const fallbackRelevance = typeof analysisData.relevanceScore === 'number' ? analysisData.relevanceScore : 50;
        const fallbackMatched = typeof analysisData.matchedExhibitorsCount === 'number' ? analysisData.matchedExhibitorsCount : 500;
        
        validated = {
          companyName: analysisData.companyName || companyIdentifier,
          sector: Array.isArray(analysisData.sector) && analysisData.sector.length > 0 ? analysisData.sector : ["General"],
          relevanceScore: Math.max(fallbackRelevance, 10),
          scoreReasoning: analysisData.scoreReasoning || "This score reflects the company's alignment with Gulfood 2026's food and beverage industry focus, potential networking opportunities with global exhibitors, and opportunities for market expansion in the region.",
          summary: analysisData.summary || `Analysis for ${companyIdentifier}. Gulfood 2026 offers opportunities to connect with global food and beverage industry leaders.`,
          benefits: Array.isArray(analysisData.benefits) && analysisData.benefits.length > 0 
            ? analysisData.benefits 
            : [
                "Network with industry professionals from around the world",
                "Discover new market trends and opportunities",
                "Showcase your products to potential buyers",
                "Learn from industry experts and thought leaders"
              ],
          matchedExhibitorsCount: Math.max(fallbackMatched, 100),
          recommendations: Array.isArray(analysisData.recommendations) && analysisData.recommendations.length > 0
            ? analysisData.recommendations
            : [
                "Visit pavilions matching your industry sector to identify key suppliers and partners",
                "Attend networking sessions and seminars specific to your business focus area",
                "Schedule pre-event meetings with exhibitors to maximize on-site efficiency"
              ]
        };
        
        console.log("Using fallback analysis data:", validated);
      } else {
        validated = validationResult.data;
        
        validated.relevanceScore = Math.max(validated.relevanceScore, 10);
        validated.matchedExhibitorsCount = Math.max(validated.matchedExhibitorsCount, 100);
      }
      const matchedExhibitorIds = exhibitors
        .filter(e => Array.isArray(validated.sector) && validated.sector.includes(e.sector))
        .slice(0, 50)
        .map(e => e.id);

      const analysis = await storage.createCompanyAnalysis({
        companyIdentifier,
        companyName: validated.companyName,
        sector: validated.sector,
        relevanceScore: validated.relevanceScore,
        scoreReasoning: validated.scoreReasoning,
        summary: validated.summary,
        benefits: validated.benefits,
        matchedExhibitorsCount: validated.matchedExhibitorsCount,
        matchedExhibitorIds,
        recommendations: validated.recommendations,
        analysisData: validated
      });

      // Populate matched exhibitor details for response
      const matchedExhibitors = [];
      for (const id of matchedExhibitorIds) {
        const exhibitor = await storage.getExhibitor(id);
        if (exhibitor) {
          matchedExhibitors.push({
            id: exhibitor.id,
            name: exhibitor.name,
            sector: exhibitor.sector,
            booth: exhibitor.booth
          });
        }
      }

      res.json({ ...analysis, matchedExhibitors });
    } catch (error) {
      console.error("Error analyzing company:", error);
      res.status(500).json({ error: "Failed to analyze company. Please try again." });
    }
  });

  app.post("/api/meetings", async (req, res) => {
    try {
      const parsedData = insertMeetingSchema.parse({
        ...req.body,
        meetingDate: new Date(req.body.meetingDate)
      });
      const meeting = await storage.createMeeting(parsedData);
      res.json(meeting);
    } catch (error) {
      console.error("Error creating meeting:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid meeting data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create meeting" });
    }
  });

  app.get("/api/meetings", async (req, res) => {
    try {
      const meetings = await storage.getMeetings();
      res.json(meetings);
    } catch (error) {
      console.error("Error fetching meetings:", error);
      res.status(500).json({ error: "Failed to fetch meetings" });
    }
  });

  app.post("/api/contact-sales", async (req, res) => {
    try {
      const parsedData = insertSalesContactSchema.parse(req.body);
      const contact = await storage.createSalesContact(parsedData);
      res.json({ 
        success: true, 
        message: "Sales contact request submitted successfully",
        id: contact.id 
      });
    } catch (error) {
      console.error("Error creating sales contact:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid contact data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to submit contact request" });
    }
  });

  app.get("/api/sales-contacts", async (req, res) => {
    try {
      const contacts = await storage.getSalesContacts();
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching sales contacts:", error);
      res.status(500).json({ error: "Failed to fetch sales contacts" });
    }
  });

  app.post("/api/leads", async (req, res) => {
    try {
      const parsedData = insertLeadSchema.parse(req.body);
      const lead = await storage.createLead(parsedData);
      res.json({ 
        success: true, 
        message: "Thank you! Your information has been captured successfully.",
        id: lead.id 
      });
    } catch (error) {
      console.error("Error creating lead:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid lead data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to capture lead" });
    }
  });

  app.get("/api/leads/check/:email", async (req, res) => {
    try {
      const email = req.params.email;
      const lead = await storage.getLeadByEmail(email);
      
      if (lead) {
        res.json({ 
          exists: true, 
          lead: {
            id: lead.id,
            name: lead.name,
            email: lead.email,
            company: lead.company,
            role: lead.role
          } 
        });
      } else {
        res.json({ exists: false, lead: null });
      }
    } catch (error) {
      console.error("Error checking lead email:", error);
      res.status(500).json({ error: "Failed to check email" });
    }
  });

  app.get("/api/leads", async (req, res) => {
    try {
      const { status, category } = req.query;
      const leads = await storage.getLeads(
        status as string | undefined,
        category as string | undefined
      );
      res.json(leads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  app.put("/api/leads/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const lead = await storage.updateLead(id, updates);
      
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      res.json({ success: true, lead });
    } catch (error) {
      console.error("Error updating lead:", error);
      res.status(500).json({ error: "Failed to update lead" });
    }
  });

  app.patch("/api/leads/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const lead = await storage.updateLead(id, updates);
      
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      res.json(lead);
    } catch (error) {
      console.error("Error updating lead:", error);
      res.status(500).json({ error: "Failed to update lead" });
    }
  });

  app.post("/api/referrals", async (req, res) => {
    try {
      const parsedData = insertReferralSchema.parse(req.body);
      const referral = await storage.createReferral(parsedData);
      res.json({ 
        success: true, 
        message: "Referral tracked successfully",
        id: referral.id 
      });
    } catch (error) {
      console.error("Error creating referral:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid referral data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to track referral" });
    }
  });

  app.get("/api/referrals", async (req, res) => {
    try {
      const { platform, startDate, endDate } = req.query;
      const referrals = await storage.getReferrals(
        platform as string | undefined,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(referrals);
    } catch (error) {
      console.error("Error fetching referrals:", error);
      res.status(500).json({ error: "Failed to fetch referrals" });
    }
  });

  app.get("/api/referrals/stats", async (req, res) => {
    try {
      const stats = await storage.getReferralStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching referral stats:", error);
      res.status(500).json({ error: "Failed to fetch referral stats" });
    }
  });

  app.post("/api/referrals/generate-code", async (req, res) => {
    try {
      const validationSchema = z.object({
        sessionId: z.string().min(1, "Session ID is required"),
        name: z.string().optional(),
        email: z.string().email().optional().or(z.literal(""))
      });

      const { sessionId, name, email } = validationSchema.parse(req.body);

      const timestamp = Date.now().toString(36);
      const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
      const referralCode = `GF2026-${timestamp}-${randomStr}`;
      
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : req.protocol + '://' + req.get('host');
      
      const referralUrl = `${baseUrl}?ref=${referralCode}`;
      
      res.json({ 
        success: true, 
        referralCode,
        referralUrl,
        name,
        email
      });
    } catch (error) {
      console.error("Error generating referral code:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to generate referral code" });
    }
  });

  app.patch("/api/meetings/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }
      
      const meeting = await storage.updateMeetingStatus(id, status);
      
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }
      
      res.json(meeting);
    } catch (error) {
      console.error("Error updating meeting:", error);
      res.status(500).json({ error: "Failed to update meeting" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { sessionId, message, userRole } = req.body;
      
      if (!sessionId || !message) {
        return res.status(400).json({ error: "Session ID and message are required" });
      }

      if (!openai) {
        return res.json({ 
          message: "I'm currently offline as the AI service needs to be configured. However, I'd be happy to help you with information about Gulfood 2026 once the system is fully set up! In the meantime, you can explore the exhibitor directory and schedule meetings." 
        });
      }

      let conversation = await storage.getChatConversation(sessionId);
      let messages: any[] = conversation?.messages as any[] || [];

      messages.push({ role: "user", content: message });

      const roleContext = userRole === "Visitor" 
        ? `You are assisting a VISITOR who is attending Gulfood 2026. Focus on:
- Helping them find relevant exhibitors based on their interests (sectors like Dairy, Meat, Beverages, etc.)

JOURNEY PLANNING ("Plan my Journey"):
When asked to plan their journey, follow this intelligent planning process:

1. GATHER INFORMATION:
   - Ask how many days they plan to attend (1-5 days from Jan 26-30, 2026)
   - Ask which sectors they're interested in (e.g., Dairy, Meat, Beverages, Plant-Based, etc.)
   - Note any specific exhibitors they want to visit

2. VENUE DISTANCE & LOGISTICS:
   - Distance between venues: Approximately 12 km (7.5 miles)
   - Travel time: 20-30 minutes by car/taxi (depending on traffic)
   - Travel options: Taxi, Uber, Dubai Metro + shuttle bus
   - IMPORTANT: Minimize back-and-forth travel between venues to save time

3. SMART ITINERARY CREATION:
   - Group exhibitors by venue location (DWTC or Expo City Dubai)
   - Dedicate specific days to specific venues when possible (e.g., Day 1-2: DWTC, Day 3: Expo City)
   - If sectors span both venues, group them efficiently to minimize travel
   - Include buffer time for travel between venues (45 mins total: 15 min taxi wait + 20-30 min drive)
   - Schedule breaks, lunch, and networking time at each venue

4. DAILY SCHEDULE FORMAT (use table):
   Present each day's itinerary in a clear table with columns:
   | Time | Activity | Venue | Sector/Exhibitor | Notes |
   
   Include:
   - Morning session (9:00 AM - 12:30 PM)
   - Lunch break (12:30 PM - 2:00 PM)
   - Afternoon session (2:00 PM - 5:30 PM)
   - If changing venues mid-day, show travel time explicitly
   - Highlight which exhibitors to visit based on their sector interests

5. OPTIMIZATION TIPS:
   - Recommend visiting related sectors on the same day at the same venue
   - Suggest staying at one venue per day if possible
   - If multi-venue day is necessary, schedule morning at one venue, afternoon at another
   - Provide venue-specific navigation tips

- Provide travel and accommodation recommendations for Dubai
- Suggesting networking opportunities and meeting scheduling
- Offering venue navigation tips between both locations
- Recommending hotels near Dubai World Trade Centre or Expo City Dubai`
        : userRole === "Exhibitor"
        ? `You are assisting an EXHIBITOR participating in Gulfood 2026. Focus on:
- Connecting them with potential buyers and distributors
- Providing competitor analysis and market insights
- Offering booth location and setup recommendations
- Suggesting marketing strategies for maximum visibility
- Facilitating networking with key industry players
- Advising on logistics and shipping for exhibition materials`
        : userRole === "Organizer"
        ? `You are assisting an EVENT ORGANIZER (DWTC staff) for Gulfood 2026. Focus on:
- Providing registration trends and attendee demographics
- Analyzing engagement metrics across different sectors
- Offering revenue analytics and ROI insights
- Sharing performance data and key indicators
- Discussing operational efficiency and visitor satisfaction
- Providing strategic recommendations for event success`
        : `You are assisting a user interested in Gulfood 2026. Provide general information about the event.`;

      const systemPrompt = `You are Faris (فارس), an AI assistant for Gulfood 2026, the world's largest food & beverage exhibition in Dubai (January 26-30, 2026).

CRITICAL FORMATTING RULES - YOU MUST FOLLOW THESE EXACTLY:
- Format ALL responses as clean MARKDOWN TABLES whenever presenting structured information
- Use simple bullet points ONLY for single-item lists or very short responses
- NO paragraph text allowed anywhere
- NO bold markdown (**text**) - use table headers instead
- Table format example:

| Category | Details |
|----------|---------|
| Signage | Follow on-site signage for clear directions to pavilions |
| Info Desks | Utilize help desks for assistance and directions |
| Mobile App | Download official Gulfood 2026 app for real-time updates |

WHEN TO USE TABLES:
- Navigation tips: Use table with "Method" and "Description" columns
- Exhibitor lists: Use table with "Company", "Sector", "Location" columns  
- Schedule information: Use table with "Time", "Activity", "Venue" columns
- Comparison data: Use table to compare options side-by-side
- Step-by-step guides: Use table with "Step" and "Action" columns

WHEN TO USE BULLET POINTS:
- Single answer to simple question
- Short list of 2-3 items max
- Format: Clean bullet point with no bold markdown

LANGUAGE RULES:
- You understand English, Arabic (العربية), Simplified Chinese (简体中文), and Hindi (हिन्दी)
- DEFAULT to English unless the user explicitly writes in another language
- Once you detect a non-English language in the user's message, respond in that language
- MAINTAIN the same language throughout the conversation unless the user switches
- Do NOT automatically switch languages mid-conversation

Key Event Information:
• Venue: Dubai World Trade Centre & Expo City Dubai
• Dates: January 26-30, 2026
• 8,500+ exhibitors across 12 sectors
• 100,000+ expected visitors from 120+ countries
• Sectors: Dairy, Beverages, Meat & Poultry, Plant-Based, Fresh Produce, Snacks, Gourmet, Organic Foods, Confectionery, Bakery, Seafood, Health & Wellness

EXHIBITOR DATABASE:
You have access to a database of 171 real exhibitors from Gulfood 2026 with detailed information. You can help users search and discover exhibitors by:
- Company name (e.g., "Find Nestlé", "Show me Almarai")
- Sector/category (e.g., "Dairy products", "Meat & Poultry", "Beverages")
- Country of origin (e.g., "Show me exhibitors from India", "Which companies are from UAE?")
- Hall location (e.g., "Who's in North Hall 7?", "Which companies are in Za'abeel Hall?")
- Stand number (e.g., "Find exhibitor at stand C1-60", "Who's in booth DG-E45?")

Hall Locations at Dubai World Trade Centre:
• North Hall 1-13 (main exhibition halls)
• Za'abeel Hall 2-3 (premium exhibition space)
• Trade Centre Arena (central exhibition area)
• Hall 1 (iconic main hall)

When users ask about exhibitors:
- Use the detailed company information available in the database
- Show their hall location and stand number so visitors can find them
- Highlight their specific sectors and product categories
- Provide their country of origin for context

Search Examples:
• "Show me exhibitors from India" - Search by country
• "Which companies are in North Hall 13?" - Search by hall
• "Find exhibitors in the Dairy sector" - Search by sector
• "Who's at stand C1-60?" - Search by stand number
• "Show me Beverage companies from UAE in North Hall 7" - Combined search

REFERRAL SHARING:
When a user asks for a referral link, invitation link, or wants to share Gulfood 2026:
1. Respond enthusiastically and explain they can share the event with their network
2. Tell them to click the "Referral" tab in the chatbot to get their personalized referral link
3. Mention they can share it on LinkedIn, Facebook, X, WhatsApp, or via email
4. Explain that sharing helps grow the Gulfood community

${roleContext}

Be helpful, concise, professional, and culturally aware. 

REMINDER: Your ENTIRE response must be bullet points or numbered lists. NO paragraph text anywhere - not even in the first sentence!`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 800
      });

      const assistantMessage = completion.choices[0].message.content || "I'm sorry, I couldn't process that.";
      messages.push({ role: "assistant", content: assistantMessage });

      if (conversation) {
        await storage.updateChatConversation(sessionId, messages, userRole);
      } else {
        await storage.createChatConversation({ sessionId, messages, userRole });
      }

      res.json({ message: assistantMessage });
    } catch (error) {
      console.error("Error processing chat:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
      console.error("Error message:", error instanceof Error ? error.message : String(error));
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  app.post("/api/chat/feedback", async (req, res) => {
    try {
      const validatedData = insertChatFeedbackSchema.parse(req.body);
      const feedback = await storage.createChatFeedback(validatedData);
      res.json(feedback);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid feedback data", details: error.errors });
      }
      console.error("Error saving chat feedback:", error);
      res.status(500).json({ error: "Failed to save feedback" });
    }
  });

  app.get("/api/chat/feedback/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const feedback = await storage.getChatFeedback(sessionId);
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching chat feedback:", error);
      res.status(500).json({ error: "Failed to fetch feedback" });
    }
  });

  app.post("/api/reports/generate", async (req, res) => {
    try {
      const { reportType, userRole, sessionId, journeyPlan, name, email, organization } = req.body;
      
      if (!reportType || !userRole) {
        return res.status(400).json({ error: "Report type and user role are required" });
      }

      let reportData: any = {};
      let pdfBuffer: Buffer;
      
      if (reportType === "analytics" && userRole === "Organizer") {
        const analytics = await storage.getAnalytics();
        
        reportData = {
          analytics,
          generatedAt: new Date().toISOString(),
          eventName: "Gulfood 2026",
          eventDates: "January 26-30, 2026"
        };

        const { generateOrganizerAnalyticsPDF } = await import('./pdfGenerator.js');
        pdfBuffer = await generateOrganizerAnalyticsPDF(analytics);
      } else if (reportType === "journey_plan") {
        // Handle journey plan PDF generation
        if (!journeyPlan) {
          return res.status(400).json({ error: "Journey plan data is required" });
        }
        
        // Sanitize journeyPlan to avoid circular references from ORM objects
        // Extract matched exhibitors and sessions from reportData if available
        const reportDataObj = typeof journeyPlan.reportData === 'object' ? journeyPlan.reportData : {};
        const matchedExhibitors = Array.isArray(reportDataObj.matchedExhibitors) 
          ? JSON.parse(JSON.stringify(reportDataObj.matchedExhibitors.map((ex: any) => ({
              id: ex.id,
              name: ex.name,
              companyName: ex.companyName,
              sector: ex.sector,
              country: ex.country,
              boothNumber: ex.boothNumber,
              description: ex.description,
              relevancePercentage: ex.relevancePercentage
            }))))
          : [];
        
        const matchedSessions = Array.isArray(reportDataObj.matchedSessions)
          ? JSON.parse(JSON.stringify(reportDataObj.matchedSessions.map((s: any) => ({
              id: s.id,
              title: s.title,
              description: s.description,
              sessionDate: s.sessionDate,
              location: s.location,
              matchScore: s.matchScore
            }))))
          : [];
        
        // Create sanitized data for PDF generation
        const pdfInputData = {
          journeyPlan: {
            relevanceScore: Number(journeyPlan.relevanceScore) || 0,
            generalOverview: String(journeyPlan.generalOverview || ''),
            scoreJustification: String(journeyPlan.scoreJustification || ''),
            benefits: Array.isArray(journeyPlan.benefits) ? [...journeyPlan.benefits] : [],
            recommendations: Array.isArray(journeyPlan.recommendations) ? [...journeyPlan.recommendations] : [],
            role: String(journeyPlan.role || ''),
            organization: String(journeyPlan.organization || ''),
            interestCategories: Array.isArray(journeyPlan.interestCategories) ? [...journeyPlan.interestCategories] : [],
            attendanceIntents: Array.isArray(journeyPlan.attendanceIntents) ? [...journeyPlan.attendanceIntents] : [],
            matchedExhibitors,
            matchedSessions
          },
          name: name || 'Guest',
          email: email || '',
          organization: organization || '',
          generatedAt: new Date().toISOString(),
          eventName: "Gulfood 2026",
          eventDates: "January 26-30, 2026"
        };

        const { generateJourneyPlanPDF } = await import('./pdfGenerator.js');
        pdfBuffer = await generateJourneyPlanPDF(pdfInputData);
        
        // Create SEPARATE clean object for database storage (don't reuse pdfInputData)
        reportData = JSON.parse(JSON.stringify({
          journeyPlan: {
            relevanceScore: Number(journeyPlan.relevanceScore) || 0,
            generalOverview: String(journeyPlan.generalOverview || ''),
            scoreJustification: String(journeyPlan.scoreJustification || ''),
            benefits: Array.isArray(journeyPlan.benefits) ? journeyPlan.benefits.map(String) : [],
            recommendations: Array.isArray(journeyPlan.recommendations) ? journeyPlan.recommendations.map(String) : [],
            role: String(journeyPlan.role || ''),
            organization: String(journeyPlan.organization || '')
          },
          name: name || 'Guest',
          email: email || '',
          organization: organization || '',
          generatedAt: new Date().toISOString(),
          eventName: "Gulfood 2026",
          eventDates: "January 26-30, 2026",
          pdfData: null
        }));
      } else if (reportType === "itinerary") {
        // Handle itinerary PDF generation
        const { itinerary } = req.body;
        
        if (!itinerary || !itinerary.days) {
          return res.status(400).json({ error: "Itinerary data with days is required" });
        }

        const pdfInputData = {
          itinerary: {
            days: itinerary.days,
            role: itinerary.role || 'Visitor',
            totalExhibitors: itinerary.totalExhibitors || 0,
            totalSessions: itinerary.totalSessions || 0
          },
          name: name || 'Guest',
          email: email || 'guest@gulfood2026.com',
          organization: organization || 'Guest Organization',
          generatedAt: new Date().toISOString()
        };

        const { generateItineraryPDF } = await import('./pdfGenerator.js');
        pdfBuffer = await generateItineraryPDF(pdfInputData);

        reportData = {
          itinerary: pdfInputData.itinerary,
          name: pdfInputData.name,
          email: pdfInputData.email,
          organization: pdfInputData.organization,
          generatedAt: pdfInputData.generatedAt,
          eventName: "Gulfood 2026",
          eventDates: "January 26-30, 2026",
          pdfData: null
        };
      } else if (reportType === "journey" && userRole === "Visitor") {
        if (!sessionId) {
          return res.status(400).json({ error: "Session ID is required for visitor reports" });
        }
        
        const conversation = await storage.getChatConversation(sessionId);
        const feedback = await storage.getChatFeedback(sessionId);
        
        reportData = {
          sessionId,
          conversationHistory: conversation?.messages || [],
          feedbackCount: feedback.length,
          generatedAt: new Date().toISOString(),
          eventName: "Gulfood 2026",
          pdfData: null
        };

        const messages = (conversation?.messages as any[]) || [];
        const hasJourneyPlan = messages.some((msg: any) => 
          msg.role === 'assistant' && (
            msg.content.includes('|') || 
            msg.content.toLowerCase().includes('day 1') ||
            msg.content.toLowerCase().includes('itinerary')
          )
        );

        if (hasJourneyPlan) {
          const { generateJourneyPlanPDF } = await import('./pdfGenerator.js');
          pdfBuffer = await generateJourneyPlanPDF(reportData);
        } else {
          const { generateVisitorJourneyPDF } = await import('./pdfGenerator.js');
          pdfBuffer = await generateVisitorJourneyPDF(reportData);
        }
      } else if (reportType === "exhibitor_assessment") {
        // Handle exhibitor assessment PDF generation
        const { exhibitorAssessment, companyName } = req.body;
        
        if (!exhibitorAssessment || !companyName) {
          return res.status(400).json({ error: "Exhibitor assessment data and company name are required" });
        }

        const pdfInputData = {
          assessment: exhibitorAssessment,
          companyName: companyName,
          generatedAt: new Date().toISOString()
        };

        const { generateExhibitorAssessmentPDF } = await import('./pdfGenerator.js');
        pdfBuffer = await generateExhibitorAssessmentPDF(pdfInputData);

        reportData = {
          exhibitorAssessment: pdfInputData.assessment,
          companyName: pdfInputData.companyName,
          generatedAt: pdfInputData.generatedAt,
          eventName: "Gulfood 2026",
          eventDates: "January 26-30, 2026",
          pdfData: null
        };
      } else {
        return res.status(400).json({ error: "Invalid report type or user role combination" });
      }

      reportData.pdfData = pdfBuffer.toString('base64');
      const fileName = `Gulfood2026_${reportType}_${userRole}_${Date.now()}.pdf`;
      
      const report = await storage.createGeneratedReport({
        reportType,
        userRole,
        sessionId: sessionId || null,
        reportData,
        fileName
      });

      res.json({ 
        success: true,
        fileName,
        reportId: report.id,
        downloadUrl: `/api/reports/${report.id}/download`
      });
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({ error: "Failed to generate report" });
    }
  });

  app.get("/api/reports", async (req, res) => {
    try {
      const { userRole } = req.query;
      const reports = await storage.getGeneratedReports(userRole as string | undefined);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  app.get("/api/reports/:id/download", async (req, res) => {
    try {
      const reports = await storage.getGeneratedReports();
      const report = reports.find(r => r.id === parseInt(req.params.id));
      
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }

      const reportData = report.reportData as any;
      if (reportData.pdfData) {
        const pdfBuffer = Buffer.from(reportData.pdfData, 'base64');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${report.fileName}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${report.fileName}"`);
        res.json(report.reportData);
      }
    } catch (error) {
      console.error("Error downloading report:", error);
      res.status(500).json({ error: "Failed to download report" });
    }
  });

  app.post("/api/chat/download-transcript", async (req, res) => {
    try {
      // Handle both JSON and form-encoded data
      let requestData = req.body;
      if (req.body.data) {
        // Form submission - parse JSON from 'data' field
        requestData = JSON.parse(req.body.data);
      }
      
      // Validate request body
      const validationResult = chatTranscriptDownloadSchema.safeParse(requestData);
      if (!validationResult.success) {
        console.error('Chat transcript validation failed:', validationResult.error);
        return res.status(400).json({ 
          error: "Invalid request format. Please check your input and try again."
        });
      }
      
      const { messages, sessionId, userRole, leadInfo } = validationResult.data;
      
      let sessionTimestamp: number;
      try {
        const timestampStr = sessionId.split('_')[1];
        sessionTimestamp = parseInt(timestampStr, 10);
        
        // Clamp to reasonable range: Jan 1, 2020 to 100 years in future
        const MIN_TIMESTAMP = new Date('2020-01-01').getTime();
        const MAX_TIMESTAMP = Date.now() + (100 * 365 * 24 * 60 * 60 * 1000);
        
        if (isNaN(sessionTimestamp) || sessionTimestamp < MIN_TIMESTAMP || sessionTimestamp > MAX_TIMESTAMP) {
          sessionTimestamp = Date.now();
        }
      } catch (error) {
        sessionTimestamp = Date.now();
      }
      
      const { generateChatTranscriptPDF } = await import('./pdfGenerator.js');
      const pdfBuffer = await generateChatTranscriptPDF(
        messages,
        sessionId,
        userRole || null,
        leadInfo ? { name: leadInfo.name || undefined, email: leadInfo.email || undefined } : {},
        sessionTimestamp
      );
      
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
      const filename = `Gulfood_2026_Chat_${dateStr}_${timeStr}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating chat transcript PDF:", error);
      res.status(500).json({ error: "Failed to generate chat transcript" });
    }
  });

  app.get("/api/analytics", async (req, res) => {
    try {
      const analytics = await storage.getAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  app.get("/api/venue-traffic", async (req, res) => {
    try {
      const { origin, destination } = req.query;
      
      if (!origin || !destination) {
        return res.status(400).json({ error: "Origin and destination are required" });
      }

      const cachedData = await storage.getVenueTraffic(origin as string, destination as string);
      
      if (cachedData) {
        const cacheAge = Date.now() - new Date(cachedData.lastUpdated).getTime();
        if (cacheAge < 2 * 60 * 1000) {
          return res.json(cachedData);
        }
      }

      if (!process.env.GOOGLE_MAPS_API_KEY) {
        return res.status(503).json({ 
          error: "Google Maps API key not configured",
          fallback: cachedData || null
        });
      }

      const requestBody = {
        origins: [
          {
            waypoint: {
              address: origin as string
            }
          }
        ],
        destinations: [
          {
            waypoint: {
              address: destination as string
            }
          }
        ],
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE"
      };

      const response = await fetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,status,condition'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Routes API error:", response.status, errorText);
        return res.status(500).json({ 
          error: "Failed to fetch traffic data from Routes API",
          fallback: cachedData || null
        });
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        console.error("Routes API returned empty response");
        return res.status(500).json({ 
          error: "No route data available",
          fallback: cachedData || null
        });
      }

      const route = data[0];
      
      if (route.condition !== "ROUTE_EXISTS") {
        console.error("Routes API route condition:", route.condition);
        return res.status(500).json({ 
          error: "Route not found",
          fallback: cachedData || null
        });
      }

      const durationSeconds = parseInt(route.duration?.replace('s', '') || '0');
      const distanceMeters = route.distanceMeters || 0;
      
      const normalDurationSeconds = Math.round(distanceMeters / 1000 * 90);
      
      let trafficCondition = "light";
      if (durationSeconds > normalDurationSeconds * 1.5) {
        trafficCondition = "heavy";
      } else if (durationSeconds > normalDurationSeconds * 1.2) {
        trafficCondition = "moderate";
      }

      const formatDuration = (seconds: number) => {
        const mins = Math.round(seconds / 60);
        return `${mins} min${mins !== 1 ? 's' : ''}`;
      };

      const formatDistance = (meters: number) => {
        const km = (meters / 1000).toFixed(1);
        return `${km} km`;
      };

      const trafficData = {
        origin: origin as string,
        destination: destination as string,
        distanceMeters: distanceMeters,
        distanceText: formatDistance(distanceMeters),
        durationSeconds: normalDurationSeconds,
        durationText: formatDuration(normalDurationSeconds),
        durationInTrafficSeconds: durationSeconds,
        durationInTrafficText: formatDuration(durationSeconds),
        trafficCondition
      };

      const savedData = await storage.createOrUpdateVenueTraffic(trafficData);
      res.json(savedData);
    } catch (error) {
      console.error("Error fetching venue traffic:", error);
      res.status(500).json({ error: "Failed to fetch venue traffic data" });
    }
  });

  app.get("/api/announcements", async (req, res) => {
    try {
      const { targetAudience, isActive } = req.query;
      const audienceArray = targetAudience 
        ? (targetAudience as string).split(',').map(a => a.trim())
        : undefined;
      const active = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
      
      const announcements = await storage.getAnnouncements(audienceArray, active);
      res.json(announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      res.status(500).json({ error: "Failed to fetch announcements" });
    }
  });

  app.post("/api/announcements", requireOrganizerAuth, async (req: AuthRequest, res) => {
    try {
      const validatedData = insertAnnouncementSchema.parse(req.body);
      const announcement = await storage.createAnnouncement(validatedData);
      res.json(announcement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid announcement data", details: error.errors });
      }
      console.error("Error creating announcement:", error);
      res.status(500).json({ error: "Failed to create announcement" });
    }
  });

  app.patch("/api/announcements/:id", requireOrganizerAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const partialData = insertAnnouncementSchema.partial().parse(req.body);
      const announcement = await storage.updateAnnouncement(id, partialData);
      
      if (!announcement) {
        return res.status(404).json({ error: "Announcement not found" });
      }
      
      res.json(announcement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid announcement data", details: error.errors });
      }
      console.error("Error updating announcement:", error);
      res.status(500).json({ error: "Failed to update announcement" });
    }
  });

  app.delete("/api/announcements/:id", requireOrganizerAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteAnnouncement(id);
      
      if (!success) {
        return res.status(404).json({ error: "Announcement not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting announcement:", error);
      res.status(500).json({ error: "Failed to delete announcement" });
    }
  });

  app.get("/api/sessions", async (req, res) => {
    try {
      const { targetAudience, isActive, upcoming } = req.query;
      const audienceArray = targetAudience 
        ? (targetAudience as string).split(',').map(a => a.trim())
        : undefined;
      const active = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
      const upcomingOnly = upcoming === 'true';
      
      const sessions = await storage.getScheduledSessions(audienceArray, active, upcomingOnly);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  app.post("/api/sessions", requireOrganizerAuth, async (req: AuthRequest, res) => {
    try {
      const validatedData = insertScheduledSessionSchema.parse(req.body);
      const session = await storage.createScheduledSession({
        ...validatedData,
        sessionDate: typeof validatedData.sessionDate === 'string' ? new Date(validatedData.sessionDate) : validatedData.sessionDate
      });
      res.json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid session data", details: error.errors });
      }
      console.error("Error creating session:", error);
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  app.patch("/api/sessions/:id", requireOrganizerAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const partialData = insertScheduledSessionSchema.partial().parse(req.body);
      const updateData = {
        ...partialData,
        ...(partialData.sessionDate && {
          sessionDate: typeof partialData.sessionDate === 'string' ? new Date(partialData.sessionDate) : partialData.sessionDate
        })
      };
      const session = await storage.updateScheduledSession(id, updateData);
      
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      res.json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid session data", details: error.errors });
      }
      console.error("Error updating session:", error);
      res.status(500).json({ error: "Failed to update session" });
    }
  });

  app.delete("/api/sessions/:id", requireOrganizerAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteScheduledSession(id);
      
      if (!success) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting session:", error);
      res.status(500).json({ error: "Failed to delete session" });
    }
  });

  app.post("/api/exhibitor/verify-code", async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: "Access code is required" });
      }
      
      const accessCode = await storage.validateAndUseAccessCode(code);
      
      if (!accessCode) {
        return res.status(401).json({ error: "Invalid or expired access code" });
      }

      const token = generateExhibitorToken(accessCode.code, accessCode.companyName, accessCode.exhibitorId || undefined);
      
      res.json({ 
        success: true,
        token,
        companyName: accessCode.companyName,
        email: accessCode.email
      });
    } catch (error) {
      console.error("Error verifying exhibitor code:", error);
      res.status(500).json({ error: "Failed to verify access code" });
    }
  });

  app.get("/api/exhibitor/access-codes", requireOrganizerAuth, async (req: AuthRequest, res) => {
    try {
      const accessCodes = await storage.getAllExhibitorAccessCodes();
      res.json(accessCodes);
    } catch (error) {
      console.error("Error fetching access codes:", error);
      res.status(500).json({ error: "Failed to fetch access codes" });
    }
  });

  app.post("/api/exhibitor/access-codes", requireOrganizerAuth, async (req: AuthRequest, res) => {
    try {
      const validatedData = insertExhibitorAccessCodeSchema.parse(req.body);
      
      const generateUniqueCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };
      
      const code = generateUniqueCode();
      
      const accessCodeData = {
        ...validatedData,
        code,
        isActive: true
      };
      
      const accessCode = await storage.createExhibitorAccessCode(accessCodeData);
      res.json(accessCode);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid access code data", details: error.errors });
      }
      console.error("Error creating access code:", error);
      res.status(500).json({ error: "Failed to create access code" });
    }
  });

  app.post("/api/organizer/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      
      const organizer = await storage.getOrganizerByEmail(email);
      
      if (!organizer) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      if (!organizer.isActive) {
        return res.status(403).json({ error: "Account is inactive" });
      }
      
      const isValid = await bcrypt.compare(password, organizer.passwordHash);
      
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      await storage.updateOrganizerLastLogin(email);

      const token = generateOrganizerToken(organizer.email, organizer.role);
      
      res.json({ 
        success: true,
        token,
        organizer: {
          email: organizer.email,
          name: organizer.name,
          role: organizer.role
        }
      });
    } catch (error) {
      console.error("Error during organizer login:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.post("/api/organizer/register", async (req, res) => {
    try {
      const { email, password, name } = req.body;
      
      if (!email || !password || !name) {
        return res.status(400).json({ error: "Email, password, and name are required" });
      }
      
      const existing = await storage.getOrganizerByEmail(email);
      if (existing) {
        return res.status(409).json({ error: "Organizer already exists" });
      }
      
      const passwordHash = await bcrypt.hash(password, 10);
      
      const organizer = await storage.createOrganizer({
        email,
        passwordHash,
        name,
        role: "staff",
        isActive: true
      });

      const token = generateOrganizerToken(organizer.email, organizer.role);
      
      res.json({ 
        success: true,
        token,
        organizer: {
          email: organizer.email,
          name: organizer.name,
          role: organizer.role
        }
      });
    } catch (error) {
      console.error("Error registering organizer:", error);
      res.status(500).json({ error: "Failed to register organizer" });
    }
  });

  app.post("/api/journey/generate", async (req, res) => {
    try {
      const {
        name,
        email,
        organization,
        role,
        interestCategories,
        attendanceIntents,
        sessionId,
        numberOfDays,
        specificDates,
        preferredExhibitorIds
      } = req.body;

      if (!email || !organization || !role || !interestCategories || !attendanceIntents) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      console.log('=== AI-POWERED JOURNEY GENERATION ===');
      console.log('User inputs:', { 
        organization, role, interestCategories, attendanceIntents,
        numberOfDays, specificDates: specificDates?.length || 0, 
        preferredExhibitors: preferredExhibitorIds?.length || 0 
      });

      let leadId: number | null = null;
      const existingLead = await storage.getLeadByEmail(email);
      if (existingLead) {
        leadId = existingLead.id;
      } else if (name) {
        const newLead = await storage.createLead({
          name,
          email,
          company: organization,
          role,
          category: "Visitor",
          capturedVia: "direct",
          sessionId,
          message: "Journey planning lead capture"
        });
        leadId = newLead.id;
      }

      // Enrich organization data with web search/AI analysis
      console.log('🔍 Enriching organization data...');
      const organizationEnrichment = await enrichOrganization(organization, true);
      console.log(`✅ Organization enriched: ${organizationEnrichment.organizationName} (confidence: ${organizationEnrichment.confidenceScore}%)`);

      if (!openai) {
        return res.status(503).json({ 
          error: "Journey generation requires AI analysis. Please configure OPENAI_API_KEY." 
        });
      }

      const exhibitors = await storage.getExhibitors();
      
      const userOrgLower = organization.toLowerCase();
      const filteredExhibitors = exhibitors.filter(e => {
        const exhibitorName = e.name.toLowerCase();
        return !exhibitorName.includes(userOrgLower) && !userOrgLower.includes(exhibitorName);
      });
      
      console.log(`Analyzing user profile against ${filteredExhibitors.length} exhibitors (excluded user's company) using intelligent scoring...`);
      
      // Calculate intelligent relevance score with detailed justification
      console.log('📊 Calculating event attendance relevance score...');
      const relevanceScoring = await calculateIntelligentRelevanceScore({
        organization,
        role,
        interestCategories,
        attendanceIntents,
        preferredExhibitorIds,
        organizationEnrichment
      });

      const relevanceScore = relevanceScoring.relevanceScore;
      const scoreReasoning = relevanceScoring.scoreJustification;
      console.log(`✅ Relevance Score: ${relevanceScore}% - ${scoreReasoning}`);

      // Prioritize exhibitors by interest categories
      let exhibitorsToScore = filteredExhibitors;
      if (interestCategories.length > 0) {
        console.log(`🎯 Prioritizing exhibitors by interest categories: ${interestCategories.join(', ')}`);
        
        // Normalize user's interest categories to database sectors
        const normalizedSectors = normalizeInterestCategories(interestCategories);
        console.log(`📋 Normalized to database sectors: ${normalizedSectors.join(', ')}`);
        
        // Separate exhibitors into matching and non-matching using both sector AND keyword matching
        const matchingExhibitors = filteredExhibitors.filter(e => {
          // Check both e.sector (string) and e.sectors (array) fields for sector match
          const exhibitorSectors = [
            e.sector,
            ...(e.sectors || [])
          ].filter(Boolean);
          
          const sectorMatches = exhibitorSectors.some(exhSector => 
            normalizedSectors.some(normSector => 
              exhSector.toLowerCase() === normSector.toLowerCase() ||
              exhSector.toLowerCase().includes(normSector.toLowerCase()) ||
              normSector.toLowerCase().includes(exhSector.toLowerCase())
            )
          );
          
          // If sector matches, also check keyword matching for granular filtering
          if (sectorMatches) {
            // Check if exhibitor matches any of the user's selected categories by keywords
            return interestCategories.some((category: string) => 
              exhibitorMatchesCategory(e, category)
            );
          }
          
          return false;
        });
        
        const nonMatchingExhibitors = filteredExhibitors.filter(e => {
          const exhibitorSectors = [
            e.sector,
            ...(e.sectors || [])
          ].filter(Boolean);
          
          const sectorMatches = exhibitorSectors.some(exhSector => 
            normalizedSectors.some(normSector => 
              exhSector.toLowerCase() === normSector.toLowerCase() ||
              exhSector.toLowerCase().includes(normSector.toLowerCase()) ||
              normSector.toLowerCase().includes(exhSector.toLowerCase())
            )
          );
          
          if (sectorMatches) {
            return !interestCategories.some((category: string) => 
              exhibitorMatchesCategory(e, category)
            );
          }
          
          return true;
        });
        
        // Prioritize matching exhibitors (40) + include some variety (10)
        exhibitorsToScore = [
          ...matchingExhibitors.slice(0, 40),
          ...nonMatchingExhibitors.slice(0, 10)
        ];
        
        console.log(`✅ Prioritized ${matchingExhibitors.length} keyword-matching exhibitors, ${nonMatchingExhibitors.length} other exhibitors`);
        console.log(`Analyzing top ${exhibitorsToScore.length} exhibitors (${Math.min(40, matchingExhibitors.length)} matching + ${Math.min(10, nonMatchingExhibitors.length)} variety)`);
      } else {
        // No specific interests - take first 50
        exhibitorsToScore = filteredExhibitors.slice(0, 50);
      }

      // Get top exhibitors using intelligent matching
      console.log('🎯 Calculating exhibitor match scores...');
      const exhibitorMatches = await calculateExhibitorMatchScores({
        exhibitors: exhibitorsToScore,
        organization,
        role,
        interestCategories,
        attendanceIntents,
        preferredExhibitorIds,
        organizationEnrichment
      });

      console.log(`✅ Generated ${exhibitorMatches.length} exhibitor matches`);

      // Apply minimum relevance score threshold to filter out low-quality matches
      const MIN_RELEVANCE_THRESHOLD = 60;
      const beforeFilterCount = exhibitorMatches.length;
      const filteredMatches = exhibitorMatches.filter(match => match.matchScore >= MIN_RELEVANCE_THRESHOLD);
      
      if (filteredMatches.length < beforeFilterCount) {
        console.log(`🔍 Filtered out ${beforeFilterCount - filteredMatches.length} exhibitors below ${MIN_RELEVANCE_THRESHOLD}% relevance threshold`);
        console.log(`✅ ${filteredMatches.length} high-relevance exhibitors remain`);
      }
      
      // Replace exhibitorMatches with filtered version
      exhibitorMatches.length = 0;
      exhibitorMatches.push(...filteredMatches);

      // Fallback: If intelligent scoring failed or all scores were below threshold, use simple keyword-based matching
      if (exhibitorMatches.length === 0) {
        console.warn('⚠️  Intelligent scoring returned no matches, using fallback matching...');
        
        // Normalize interest categories for fallback matching
        const normalizedSectors = interestCategories.length > 0 
          ? normalizeInterestCategories(interestCategories) 
          : [];
        
        // Simple fallback: score exhibitors based on interest category matches
        const fallbackMatches = filteredExhibitors.slice(0, 30).map(exhibitor => {
          let score = 50; // Base score
          
          // Check both exhibitor.sector and exhibitor.sectors array
          const exhibitorSectors = [
            exhibitor.sector,
            ...(exhibitor.sectors || [])
          ].filter(Boolean);
          
          // Boost if exhibitor sector matches any normalized sector
          const hasSectorMatch = normalizedSectors.length > 0 && exhibitorSectors.some(exhSector => 
            normalizedSectors.some(normSector => 
              exhSector.toLowerCase() === normSector.toLowerCase() ||
              exhSector.toLowerCase().includes(normSector.toLowerCase()) ||
              normSector.toLowerCase().includes(exhSector.toLowerCase())
            )
          );
          
          if (hasSectorMatch) {
            score += 20;
          }
          
          // Boost preferred exhibitors
          const isPreferred = preferredExhibitorIds && preferredExhibitorIds.includes(exhibitor.id);
          if (isPreferred) {
            score = 92;
          }
          
          // Generate contextual fallback reasoning
          let matchReasoning = "";
          if (isPreferred) {
            matchReasoning = "You specifically selected this exhibitor as a visit priority";
          } else {
            // Build contextual message using role, goals, and exhibitor details
            const roleContext = role ? `As a ${role}` : "As an attendee";
            const goalContext = attendanceIntents && attendanceIntents.length > 0 
              ? ` aiming to ${attendanceIntents[0].toLowerCase()}`
              : "";
            const exhibitorValue = exhibitor.description 
              ? `their ${exhibitor.sector.toLowerCase()} offerings`
              : `their presence in the ${exhibitor.sector} sector`;
            const interestMatch = hasSectorMatch && interestCategories.length > 0
              ? ` align with your ${interestCategories[0]} interests`
              : " may present relevant opportunities for your business goals";
            
            matchReasoning = `${roleContext}${goalContext}, ${exhibitorValue}${interestMatch}.`;
          }
          
          return {
            exhibitorId: exhibitor.id,
            matchScore: Math.min(100, score),
            matchReasoning,
            relevanceFactors: [exhibitor.sector, exhibitor.country]
          };
        }).sort((a, b) => b.matchScore - a.matchScore);
        
        exhibitorMatches.push(...fallbackMatches.slice(0, 15));
        console.log(`✅ Fallback matching generated ${exhibitorMatches.length} matches`);
      }

      // Generate highlights based on keyTakeaways
      const highlights = relevanceScoring.keyTakeaways.map((takeaway, idx) => ({
        icon: ["Target", "Users", "TrendingUp", "Globe", "Award"][idx] || "Target",
        title: takeaway.split(':')[0] || `Benefit ${idx + 1}`,
        description: takeaway
      })).slice(0, 5);

      const matchedExhibitors = [];
      const exhibitorCategories = new Set();
      
      for (const match of exhibitorMatches.slice(0, 10)) {
        const exhibitor = filteredExhibitors.find(e => e.id === match.exhibitorId);
        if (exhibitor) {
          exhibitorCategories.add(exhibitor.sector);
          matchedExhibitors.push({
            id: exhibitor.id,
            companyName: exhibitor.name,
            name: exhibitor.name,
            sector: exhibitor.sector,
            description: exhibitor.description,
            country: exhibitor.country,
            venue: exhibitor.venue,
            hall: exhibitor.hall,
            boothNumber: exhibitor.booth,
            productCategories: exhibitor.products || [],
            relevancePercentage: match.matchScore,
            personalizedReason: match.matchReasoning,
            relevanceFactors: match.relevanceFactors
          });
        }
      }

      // Boost preferred exhibitors if they're missing from AI's list
      if (preferredExhibitorIds && Array.isArray(preferredExhibitorIds) && preferredExhibitorIds.length > 0) {
        const matchedIds = new Set(matchedExhibitors.map(e => e.id));
        const allExhibitors = await storage.getExhibitors();
        
        for (const preferredId of preferredExhibitorIds) {
          // Skip if already in the matched list or if it's the user's own company
          if (matchedIds.has(preferredId)) continue;
          
          // Try to find in filteredExhibitors first, then in all exhibitors
          let exhibitor = filteredExhibitors.find(e => e.id === preferredId);
          if (!exhibitor) {
            exhibitor = allExhibitors.find(e => e.id === preferredId);
            // Skip if this is the user's own company
            if (exhibitor) {
              const exhibitorNameLower = exhibitor.name.toLowerCase();
              if (exhibitorNameLower.includes(userOrgLower) || userOrgLower.includes(exhibitorNameLower)) {
                continue;
              }
            }
          }
          
          if (exhibitor) {
            exhibitorCategories.add(exhibitor.sector);
            // Add with boosted score (90-95) and clear personalized reason
            const boostedScore = 90 + Math.floor(Math.random() * 6); // Random between 90-95
            matchedExhibitors.push({
              id: exhibitor.id,
              companyName: exhibitor.name,
              name: exhibitor.name,
              sector: exhibitor.sector,
              description: exhibitor.description,
              country: exhibitor.country,
              venue: exhibitor.venue,
              hall: exhibitor.hall,
              boothNumber: exhibitor.booth,
              productCategories: exhibitor.products || [],
              relevancePercentage: boostedScore,
              personalizedReason: "You specifically selected this exhibitor as a visit priority"
            });
            matchedIds.add(preferredId);
            
            // Stop if we reach 20 total exhibitors
            if (matchedExhibitors.length >= 20) break;
          }
        }
      }

      // Sort by relevance score (highest first) and limit to 20
      matchedExhibitors.sort((a, b) => b.relevancePercentage - a.relevancePercentage);
      if (matchedExhibitors.length > 20) {
        matchedExhibitors.length = 20;
      }

      const categories = Array.from(exhibitorCategories);

      console.log(`Matched ${matchedExhibitors.length} exhibitors with ${categories.length} unique categories`);
      console.log('Top exhibitors:', matchedExhibitors.slice(0, 3).map(e => ({
        name: e.name,
        match: `${e.relevancePercentage}%`,
        sector: e.sector
      })));

      const matchedSessions: any[] = [];

      const aiContent = await generateJourneyContent({
        organization,
        role,
        interestCategories,
        attendanceIntents,
        relevanceScore,
        matchedExhibitors,
        matchedSessions
      });

      const journeyPlan = await storage.createJourneyPlan({
        leadId,
        sessionId,
        name: name || existingLead?.name || "Guest",
        email,
        organization,
        role,
        interestCategories,
        attendanceIntents,
        numberOfDays,
        specificDates,
        preferredExhibitorIds,
        relevanceScore,
        organizationEnrichment,
        generalOverview: aiContent.overview,
        scoreJustification: aiContent.justification,
        benefits: aiContent.benefits,
        recommendations: aiContent.recommendations,
        matchedExhibitorIds: matchedExhibitors.map(e => e.id),
        matchedSessionIds: matchedSessions.map(s => s.id),
        reportData: {
          matchedExhibitors,
          matchedSessions
        }
      });

      console.log('=== JOURNEY GENERATION COMPLETE ===\n');

      res.json({
        ...journeyPlan,
        highlights,
        categories,
        matchedExhibitors,
        matchedSessions
      });
    } catch (error) {
      console.error("Error generating journey:", error);
      res.status(500).json({ error: "Failed to generate journey plan" });
    }
  });

  // Itinerary generation endpoint
  app.post("/api/itinerary/generate", async (req, res) => {
    try {
      console.log('=== ITINERARY GENERATION REQUEST ===');
      
      const { journeyPlan, sessionId, email } = req.body;
      
      if (!journeyPlan && !email) {
        return res.status(400).json({ error: "Journey plan or email is required" });
      }

      if (!openai) {
        return res.status(503).json({ 
          error: "AI itinerary generation is currently unavailable. Please configure OPENAI_API_KEY to enable this feature." 
        });
      }

      // If email provided but no journey plan, try to fetch existing journey plan
      let planData = journeyPlan;
      if (!planData && email) {
        const existingPlan = await storage.getJourneyPlanByEmail(email);
        if (existingPlan) {
          planData = existingPlan;
        } else {
          return res.status(404).json({ error: "No journey plan found for this email. Please generate a journey plan first." });
        }
      }

      // Extract data from journey plan
      const {
        name,
        email: userEmail,
        organization,
        role,
        interestCategories = [],
        attendanceIntents = [],
        matchedExhibitorIds = [],
        matchedSessionIds = [],
        preferredExhibitorIds = [],
        reportData
      } = planData;

      // Extract numberOfDays and specificDates from journey plan
      const numberOfDays = planData.numberOfDays || 5;
      const specificDates = planData.specificDates || [];

      // Fetch full exhibitor and session details
      const exhibitors = await storage.getExhibitors();
      const matchedExhibitors = exhibitors.filter(e => matchedExhibitorIds.includes(e.id));
      
      // Create a map of exhibitor ID to relevance score from journey plan
      const relevanceScoreMap = new Map<number, number>();
      if (planData.matchedExhibitors && Array.isArray(planData.matchedExhibitors)) {
        planData.matchedExhibitors.forEach((exhibitor: any) => {
          if (exhibitor.id && typeof exhibitor.relevancePercentage === 'number') {
            relevanceScoreMap.set(exhibitor.id, exhibitor.relevancePercentage);
          }
        });
      }
      
      // Attach relevance scores to matched exhibitors
      const matchedExhibitorsWithScores = matchedExhibitors.map(exhibitor => ({
        ...exhibitor,
        relevancePercentage: relevanceScoreMap.get(exhibitor.id) ?? 70
      }));
      
      // Get scheduled sessions
      const allSessions = await storage.getScheduledSessions(undefined, true, true);
      const matchedSessions = allSessions.filter(s => matchedSessionIds.includes(s.id));

      if (matchedExhibitorsWithScores.length === 0) {
        return res.status(400).json({ 
          error: "No exhibitors matched in journey plan. Please generate a journey plan first." 
        });
      }

      console.log(`Generating itinerary for ${name} (${organization})`);
      console.log(`Matched exhibitors: ${matchedExhibitorsWithScores.length}`);
      console.log(`Matched sessions: ${matchedSessions.length}`);
      console.log(`Number of days: ${numberOfDays}`);
      console.log(`Specific dates: ${specificDates.length > 0 ? specificDates.join(', ') : 'Using default dates'}`);
      console.log(`Preferred exhibitors: ${preferredExhibitorIds.length > 0 ? preferredExhibitorIds.join(', ') : 'None'}`);
      
      // Log relevance scores for debugging
      if (relevanceScoreMap.size > 0) {
        console.log(`📊 Relevance scores attached to ${relevanceScoreMap.size} exhibitors`);
        const preferredScores = preferredExhibitorIds
          .map((id: number) => relevanceScoreMap.get(id))
          .filter((score: number | undefined): score is number => score !== undefined);
        if (preferredScores.length > 0) {
          console.log(`⭐ Preferred exhibitor scores: ${preferredScores.join(', ')}`);
        }
      }

      // Generate itinerary using AI
      const itineraryData = await generateItineraryWithAI({
        name,
        organization,
        role,
        interestCategories,
        attendanceIntents,
        matchedExhibitors: matchedExhibitorsWithScores,
        matchedSessions,
        numberOfDays,
        specificDates,
        preferredExhibitorIds
      });

      // Save itinerary to database
      const itinerary = await storage.createItinerary({
        userId: userEmail,
        leadId: planData.leadId,
        journeyPlanId: planData.id,
        sessionId: sessionId || planData.sessionId,
        name,
        organization,
        role,
        email: userEmail,
        itineraryData: itineraryData as any,
        totalExhibitors: itineraryData.totalExhibitors,
        totalSessions: itineraryData.totalSessions,
        totalDays: itineraryData.days.length
      });

      console.log('=== ITINERARY GENERATION COMPLETE ===\n');

      // Return flattened structure for frontend compatibility
      res.json({
        id: itinerary.id,
        name: itineraryData.name,
        organization: itineraryData.organization,
        role: itineraryData.role,
        email: itinerary.email,
        days: itineraryData.days,
        totalExhibitors: itineraryData.totalExhibitors,
        totalSessions: itineraryData.totalSessions,
        generatedAt: itineraryData.generatedAt
      });
    } catch (error) {
      console.error("Error generating itinerary:", error);
      res.status(500).json({ error: "Failed to generate itinerary" });
    }
  });

  // Appointment booking endpoints
  app.get("/api/appointments/available-slots", async (req, res) => {
    try {
      const { date } = req.query;
      
      if (!date || typeof date !== 'string') {
        return res.status(400).json({ error: "Date parameter is required (YYYY-MM-DD format)" });
      }

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
      }

      // Check if Google Calendar is configured
      if (!googleCalendar.isConfigured()) {
        return res.status(503).json({ 
          error: "Appointment booking is temporarily unavailable. Please contact support.",
          details: "Calendar service not configured" 
        });
      }

      // Get available slots from Google Calendar
      const slots = await googleCalendar.getAvailableSlotsForDate(date);
      
      res.json({ slots });
    } catch (error) {
      console.error("Error fetching available slots:", error);
      res.status(500).json({ error: "Failed to fetch available appointment slots" });
    }
  });

  app.post("/api/exhibitor-assessment", async (req, res) => {
    try {
      const { companyName, websiteUrl, primaryGoal, country, sessionId } = req.body;
      
      if (!companyName || !primaryGoal || !country || !sessionId) {
        return res.status(400).json({ error: "Company name, primary goal, country, and session ID are required" });
      }

      if (websiteUrl) {
        try {
          new URL(websiteUrl);
        } catch {
          return res.status(400).json({ error: "Invalid website URL format" });
        }
      }

      if (!openai) {
        return res.status(503).json({ 
          error: "AI assessment is currently unavailable. Please configure OPENAI_API_KEY to enable this feature." 
        });
      }

      const existing = await storage.getExhibitorAssessmentBySessionId(sessionId);
      if (existing) {
        return res.json(existing);
      }

      console.log(`\n=== EXHIBITOR ASSESSMENT REQUEST ===`);
      console.log(`Company: ${companyName}`);
      console.log(`Website: ${websiteUrl || 'Not provided'}`);
      console.log(`Primary Goal: ${primaryGoal}`);
      console.log(`Country: ${country}`);

      const exhibitors = await storage.getExhibitors();
      const journeyPlans = await storage.getJourneyPlans();

      const prompt = `Analyze "${companyName}" (${websiteUrl || 'website not provided'}) as a prospective exhibitor for Gulfood 2026.

PRIMARY GOAL: ${primaryGoal}
COUNTRY: ${country}

Gulfood 2026 is the world's largest food & beverage exhibition in Dubai (Jan 26-30, 2026).

ANALYSIS TASKS:
1. Extract company data: Industry, primary products, target markets, company size
2. Categorize products into Gulfood categories: ${GULFOOD_CATEGORIES.slice(0, 10).join(', ')}... (and ${GULFOOD_CATEGORIES.length - 10} more)
3. Calculate relevance score (0-100%) based on:
   - Product-category fit with F&B industry (40%)
   - Geographic market alignment (20%)
   - Goal alignment with exhibition value (20%)
   - Strategic value/innovation (20%)
4. Generate specific recommendations

Return JSON:
{
  "extractedData": {
    "industry": "string",
    "products": ["array"],
    "targetMarkets": ["array"],
    "companySize": "string",
    "categories": ["Gulfood categories"]
  },
  "relevanceScore": number,
  "scoreBreakdown": {
    "productFit": number,
    "geographicAlignment": number,
    "goalAlignment": number,
    "strategicValue": number,
    "explanation": "string"
  },
  "recommendations": {
    "boothSize": "string (e.g., '18 sqm', '36 sqm')",
    "location": "string (recommended hall/area)",
    "budget": "string (range in USD)",
    "roiProjection": "string (expected outcomes)",
    "actionItems": ["array of specific next steps"]
  }
}

Be realistic. If the company is not F&B related, score below 40%.`;

      console.log('Calling OpenAI for exhibitor assessment...');
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert exhibition consultant for Gulfood 2026. Provide honest, data-driven assessments."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      });

      const aiResponse = JSON.parse(completion.choices[0].message.content || "{}");
      
      const assessment = await storage.createExhibitorAssessment({
        sessionId,
        companyName,
        websiteUrl: websiteUrl || null,
        primaryGoal,
        country,
        extractedData: aiResponse.extractedData || {},
        relevanceScore: aiResponse.relevanceScore || 0,
        scoreBreakdown: aiResponse.scoreBreakdown || {},
        recommendations: aiResponse.recommendations || {}
      });

      console.log(`Assessment complete: ${assessment.relevanceScore}% relevance`);
      console.log(`=== ASSESSMENT COMPLETE ===\n`);

      res.json(assessment);
    } catch (error) {
      console.error("Error generating exhibitor assessment:", error);
      res.status(500).json({ error: "Failed to generate exhibitor assessment" });
    }
  });

  app.post("/api/appointments/book", async (req, res) => {
    try {
      const validation = insertAppointmentSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid appointment data", 
          details: validation.error.errors 
        });
      }

      const appointmentData = validation.data;

      // Check if Google Calendar is configured
      if (!googleCalendar.isConfigured()) {
        return res.status(503).json({ 
          error: "Appointment booking is temporarily unavailable. Please contact support.",
          details: "Calendar service not configured" 
        });
      }

      // Verify the slot is still available before booking
      const scheduledTime = new Date(appointmentData.scheduledTime);
      const isAvailable = await googleCalendar.isSlotAvailable(scheduledTime);
      
      if (!isAvailable) {
        return res.status(409).json({ 
          error: "This time slot is no longer available. Please choose another time." 
        });
      }

      // Create Google Calendar event
      const calendarEvent = await googleCalendar.createAppointment({
        attendeeName: appointmentData.name,
        attendeeEmail: appointmentData.email,
        organization: appointmentData.organization,
        role: appointmentData.role,
        purpose: appointmentData.meetingPurpose,
        scheduledTime,
        durationMinutes: appointmentData.durationMinutes || 30,
        timezone: appointmentData.timezone || 'Asia/Dubai'
      });

      // Save appointment to database (use Date object, not string)
      const appointment = await storage.createAppointment({
        ...appointmentData,
        scheduledTime, // Use the Date object we created, not the string from appointmentData
        googleCalendarEventId: calendarEvent.eventId,
        googleMeetLink: calendarEvent.meetLink
      });

      // Send confirmation email with calendar invite (don't fail booking if email fails)
      try {
        const emailResult = await sendAppointmentConfirmation({
          to: appointmentData.email,
          name: appointmentData.name,
          organization: appointmentData.organization,
          role: appointmentData.role,
          meetingPurpose: appointmentData.meetingPurpose,
          scheduledTime,
          googleMeetLink: calendarEvent.meetLink,
          durationMinutes: appointmentData.durationMinutes || 30
        });

        if (emailResult.success) {
          console.log('✅ Confirmation email sent successfully to:', appointmentData.email);
        } else {
          console.warn('⚠️  Failed to send confirmation email:', emailResult.error);
        }
      } catch (emailError) {
        console.error('❌ Error sending confirmation email:', emailError);
      }

      res.json({
        ...appointment,
        message: "Appointment successfully scheduled! You will receive a confirmation email with meeting details."
      });
    } catch (error: any) {
      console.error("Error booking appointment:", error);
      
      // Handle specific error types
      if (error.message?.includes('already booked')) {
        return res.status(409).json({ error: error.message });
      }
      
      res.status(500).json({ error: "Failed to book appointment. Please try again." });
    }
  });

  app.get("/api/appointments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid appointment ID" });
      }

      const appointment = await storage.getAppointment(id);
      
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      res.json(appointment);
    } catch (error) {
      console.error("Error fetching appointment:", error);
      res.status(500).json({ error: "Failed to fetch appointment details" });
    }
  });

  app.put("/api/appointments/:id/cancel", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid appointment ID" });
      }

      const appointment = await storage.getAppointment(id);
      
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      if (appointment.status === 'cancelled') {
        return res.status(400).json({ error: "Appointment is already cancelled" });
      }

      // Cancel Google Calendar event if configured
      if (googleCalendar.isConfigured() && appointment.googleCalendarEventId) {
        try {
          await googleCalendar.cancelEvent(appointment.googleCalendarEventId);
        } catch (error) {
          console.error("Error cancelling Google Calendar event:", error);
          // Continue with database cancellation even if Google Calendar fails
        }
      }

      // Update appointment status in database
      const cancelledAppointment = await storage.cancelAppointment(id);

      res.json({
        ...cancelledAppointment,
        message: "Appointment successfully cancelled. A cancellation notification will be sent to your email."
      });
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      res.status(500).json({ error: "Failed to cancel appointment" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

function calculateRelevanceScore(data: {
  organization: string;
  role: string;
  interestCategories: string[];
  attendanceIntents: string[];
}): number {
  // FACTOR 1: Organization-Event Match (40% weight)
  let organizationScore = 20; // Default for "Other industries"
  const orgLower = data.organization.toLowerCase();
  
  // Industry mapping logic
  if (orgLower.includes('food') || orgLower.includes('beverage') || orgLower.includes('drink')) {
    organizationScore = 40; // 100% of 40
  } else if (orgLower.includes('restaurant') || orgLower.includes('hospitality') || orgLower.includes('hotel')) {
    organizationScore = 36; // 90% of 40
  } else if (orgLower.includes('retail') || orgLower.includes('distribution') || orgLower.includes('supermarket')) {
    organizationScore = 34; // 85% of 40
  } else if (orgLower.includes('packaging') || orgLower.includes('equipment') || orgLower.includes('machinery')) {
    organizationScore = 32; // 80% of 40
  } else if (orgLower.includes('agriculture') || orgLower.includes('farming') || orgLower.includes('organic')) {
    organizationScore = 30; // 75% of 40
  } else if (orgLower.includes('health') || orgLower.includes('wellness') || orgLower.includes('nutrition')) {
    organizationScore = 28; // 70% of 40
  } else if (orgLower.includes('technology') || orgLower.includes('tech') || orgLower.includes('service')) {
    organizationScore = 24; // 60% of 40
  } else if (orgLower.includes('finance') || orgLower.includes('investment') || orgLower.includes('bank')) {
    organizationScore = 20; // 50% of 40
  } else if (orgLower.includes('government') || orgLower.includes('non-profit') || orgLower.includes('ngo')) {
    organizationScore = 16; // 40% of 40
  }

  // FACTOR 2: Role Relevance (25% weight)
  let roleScore = 10; // Default for "Other"
  const roleLower = data.role.toLowerCase();
  
  if (roleLower.includes('supplier') || roleLower.includes('vendor') || roleLower.includes('manufacturer')) {
    roleScore = 25; // 100% of 25
  } else if (roleLower.includes('buyer') || roleLower.includes('procurement') || roleLower.includes('sourcing')) {
    roleScore = 24; // 95% of 25
  } else if (roleLower.includes('industry professional') || roleLower.includes('professional')) {
    roleScore = 24; // 95% of 25
  } else if (roleLower.includes('corporate') || roleLower.includes('representative') || roleLower.includes('manager')) {
    roleScore = 23; // 90% of 25
  } else if (roleLower.includes('exhibitor')) {
    roleScore = 23; // 90% of 25
  } else if (roleLower.includes('founder') || roleLower.includes('startup') || roleLower.includes('entrepreneur')) {
    roleScore = 21; // 85% of 25
  } else if (roleLower.includes('investor') || roleLower.includes('investment')) {
    roleScore = 20; // 80% of 25
  } else if (roleLower.includes('consultant') || roleLower.includes('advisor')) {
    roleScore = 19; // 75% of 25
  } else if (roleLower.includes('academic') || roleLower.includes('researcher') || roleLower.includes('scientist')) {
    roleScore = 18; // 70% of 25
  } else if (roleLower.includes('media') || roleLower.includes('press') || roleLower.includes('journalist')) {
    roleScore = 16; // 65% of 25
  } else if (roleLower.includes('student')) {
    roleScore = 15; // 60% of 25
  } else if (roleLower.includes('government') || roleLower.includes('official')) {
    roleScore = 14; // 55% of 25
  } else if (roleLower.includes('organizer') || roleLower.includes('event')) {
    roleScore = 13; // 50% of 25
  }

  // FACTOR 3: Interest Category Match (20% weight)
  let categoryScore = 10; // Neutral score if no categories
  if (data.interestCategories.length > 0) {
    const categoryRatio = data.interestCategories.length / 24; // 24 total categories
    categoryScore = Math.min(Math.round(categoryRatio * 20), 20);
    // Bonus for high engagement (5+ categories)
    if (data.interestCategories.length >= 5) {
      categoryScore = Math.min(categoryScore + 2, 20);
    }
  }

  // FACTOR 4: Intent Clarity (15% weight)
  let intentScore = 6; // Default for 0 intents (40% of 15)
  const intentCount = data.attendanceIntents.length;
  
  if (intentCount === 1) {
    intentScore = 9; // 60% of 15 (focused but limited)
  } else if (intentCount >= 2 && intentCount <= 3) {
    intentScore = 14; // 90% of 15 (clear objectives)
  } else if (intentCount >= 4 && intentCount <= 5) {
    intentScore = 15; // 100% of 15 (comprehensive goals)
  } else if (intentCount >= 6) {
    intentScore = 13; // 85% of 15 (possibly unfocused)
  }
  
  // Bonus points for high-value intents
  const highValueIntents = [
    'source new products',
    'find distribution partners',
    'explore investment',
    'launch new products'
  ];
  const hasHighValueIntent = data.attendanceIntents.some(intent =>
    highValueIntents.some(hv => intent.toLowerCase().includes(hv))
  );
  if (hasHighValueIntent && intentScore < 15) {
    intentScore = Math.min(intentScore + 1, 15);
  }

  // Calculate final score
  const totalScore = organizationScore + roleScore + categoryScore + intentScore;
  return Math.min(Math.round(totalScore), 100);
}

function matchExhibitors(exhibitors: any[], criteria: {
  interestCategories: string[];
  attendanceIntents: string[];
  organization: string;
  role: string;
}): any[] {
  return exhibitors
    .map(exhibitor => {
      let matchScore = 0;

      // Category overlap: +30 points per matching category
      const categoryMatch = criteria.interestCategories.some(cat =>
        exhibitor.sector?.toLowerCase().includes(cat.toLowerCase()) ||
        exhibitor.productCategories?.some((pc: string) => pc.toLowerCase().includes(cat.toLowerCase()))
      );
      if (categoryMatch) matchScore += 30;

      // Keywords match: +10 points per matching keyword
      const keywordMatch = criteria.attendanceIntents.some(intent =>
        exhibitor.description?.toLowerCase().includes(intent.toLowerCase().split(' ').slice(0, 2).join(' '))
      );
      if (keywordMatch) matchScore += 10;

      // Intent alignment: +20 points
      const isSourceIntent = criteria.attendanceIntents.some(intent =>
        intent.toLowerCase().includes('source') || intent.toLowerCase().includes('find')
      );
      if (isSourceIntent) matchScore += 20;

      // Geographic relevance: +15 points
      if (exhibitor.country && exhibitor.country !== 'UAE') {
        matchScore += 15;
      }

      // Role match bonus
      const roleMatch = ['buyer', 'distributor', 'procurement'].some(kw =>
        criteria.role.toLowerCase().includes(kw)
      );
      if (roleMatch && exhibitor.sector) matchScore += 15;

      // Convert to percentage (max possible score is ~90)
      const relevancePercentage = Math.min(Math.round((matchScore / 90) * 100), 100);

      return {
        id: exhibitor.id,
        companyName: exhibitor.name,  // Map 'name' to 'companyName' for frontend consistency
        name: exhibitor.name,  // Keep for backward compatibility
        sector: exhibitor.sector,
        description: exhibitor.description,
        country: exhibitor.country,
        boothNumber: exhibitor.boothNumber,
        productCategories: exhibitor.productCategories,
        matchScore,
        relevancePercentage
      };
    })
    .filter(e => e.matchScore > 15)
    .sort((a, b) => b.matchScore - a.matchScore);
}

function matchSessions(sessions: any[], criteria: {
  interestCategories: string[];
  attendanceIntents: string[];
  role: string;
}): any[] {
  return sessions
    .map(session => {
      let matchScore = 0;

      const topicMatch = criteria.interestCategories.some(cat =>
        session.title?.toLowerCase().includes(cat.toLowerCase()) ||
        session.description?.toLowerCase().includes(cat.toLowerCase())
      );
      if (topicMatch) matchScore += 50;

      const intentMatch = criteria.attendanceIntents.some(intent =>
        session.description?.toLowerCase().includes(intent.toLowerCase().split(' ').slice(0, 2).join(' '))
      );
      if (intentMatch) matchScore += 30;

      if (session.sessionDate) {
        const sessionDate = new Date(session.sessionDate);
        if (sessionDate >= new Date()) matchScore += 20;
      }

      return {
        ...session,
        matchScore,
        relevancePercentage: matchScore
      };
    })
    .filter(s => s.matchScore > 30)
    .sort((a, b) => b.matchScore - a.matchScore);
}

async function generateJourneyContent(data: {
  organization: string;
  role: string;
  interestCategories: string[];
  attendanceIntents: string[];
  relevanceScore: number;
  matchedExhibitors: any[];
  matchedSessions: any[];
}): Promise<{
  overview: string;
  justification: string;
  benefits: string[];
  recommendations: string[];
}> {
  try {
    // Determine score interpretation
    const scoreLevel = data.relevanceScore >= 80 ? 'excellent' : 
                      data.relevanceScore >= 60 ? 'good' : 
                      data.relevanceScore >= 40 ? 'fair' : 'limited';
    
    const prompt = `You are an AI assistant for Gulfood 2026, the world's largest annual food and beverage trade show in Dubai (January 26-30, 2026).

User Profile:
- Organization: ${data.organization}
- Role: ${data.role}
- Interest Categories: ${data.interestCategories.join(', ')}
- Attendance Intents: ${data.attendanceIntents.join(', ')}
- Relevance Score: ${data.relevanceScore}/100 (${scoreLevel} match)
- Matched Exhibitors: ${data.matchedExhibitors.length} companies
- Matched Sessions: ${data.matchedSessions.length} events

Generate a highly personalized journey plan following these guidelines:

1. OVERVIEW (2-3 sentences):
   - Mention ${data.organization}'s industry/sector
   - Reference their specific interest categories
   - Preview the value they'll find at Gulfood 2026

2. JUSTIFICATION (2-3 sentences):
   - Explain WHY they got ${data.relevanceScore}/100 score
   - Mention alignment with their role as ${data.role}
   - Reference their attendance intents
   - Be specific about strengths and any limitations

3. BENEFITS (4-5 bullet points):
   ${data.relevanceScore >= 80 ? '- Focus on "maximize ROI" benefits since score is excellent' : 
     data.relevanceScore >= 60 ? '- Focus on "expand horizons" benefits since score is good' :
     '- Focus on "exploratory opportunities" benefits since score is fair/limited'}
   - Tailor benefits based on role: ${data.role}
   - Include specific category benefits for: ${data.interestCategories.slice(0, 3).join(', ')}
   - Reference their intents: ${data.attendanceIntents.slice(0, 2).join(', ')}

4. RECOMMENDATIONS (3-4 actionable items):
   - Provide role-specific recommendations for ${data.role}
   - Suggest strategies based on their ${data.attendanceIntents.join(', ')}
   - If score < 60%, suggest alternative approaches or adjacent opportunities
   - Reference the ${data.matchedExhibitors.length} matched exhibitors and ${data.matchedSessions.length} sessions

Return ONLY a valid JSON object with keys: overview, justification, benefits, recommendations`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that generates personalized event recommendations in JSON format. Be specific and reference user data directly.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      console.error('OpenAI API failed:', response.status, response.statusText);
      throw new Error('OpenAI API request failed');
    }

    const result = await response.json();
    const content = JSON.parse(result.choices[0].message.content);

    return {
      overview: content.overview || `${data.organization} operates in sectors that align well with Gulfood 2026's extensive ${data.interestCategories.slice(0, 2).join(' and ')} showcase. Your role as ${data.role} positions you to leverage the event's networking and discovery opportunities.`,
      justification: content.justification || `Your ${data.relevanceScore}/100 relevance score reflects ${scoreLevel} alignment between your organization's focus and Gulfood's exhibitor base. Your interest in ${data.interestCategories.slice(0, 2).join(' and ')} matches well with the event's core offerings.`,
      benefits: content.benefits || [
        `Connect with ${data.matchedExhibitors.length}+ pre-matched exhibitors in your categories`,
        `Access to specialized sessions covering ${data.interestCategories.slice(0, 2).join(', ')}`,
        `Networking opportunities tailored for ${data.role} professionals`,
        `Direct engagement with innovations aligned to ${data.attendanceIntents[0] || 'your goals'}`
      ],
      recommendations: content.recommendations || [
        `Prioritize visiting the ${data.matchedExhibitors.length} matched exhibitors we've identified`,
        `Attend the ${data.matchedSessions.length} recommended sessions aligned with your intents`,
        `Schedule pre-event meetings with key exhibitors using Gulfood's matchmaking platform`,
        data.relevanceScore >= 70 ? `Consider VIP access for enhanced networking opportunities` : `Explore adjacent categories to broaden your sourcing options`
      ]
    };
  } catch (error) {
    console.error('Error generating AI content:', error);
    
    // Enhanced fallback content
    const scoreLevel = data.relevanceScore >= 80 ? 'Excellent' : 
                      data.relevanceScore >= 60 ? 'Good' : 
                      data.relevanceScore >= 40 ? 'Fair' : 'Limited';
    
    return {
      overview: `${data.organization} operates in sectors highly relevant to Gulfood 2026. With interests in ${data.interestCategories.slice(0, 3).join(', ')}, you'll find valuable opportunities across the event's extensive exhibitor lineup and conference programs.`,
      justification: `Your ${data.relevanceScore}/100 score indicates ${scoreLevel.toLowerCase()} alignment with Gulfood 2026. As a ${data.role}, your focus on ${data.attendanceIntents.slice(0, 2).join(' and ')} is well-supported by the event's offerings in your categories of interest.`,
      benefits: [
        `Access to ${data.matchedExhibitors.length}+ exhibitors matching your ${data.interestCategories.slice(0, 2).join(' and ')} interests`,
        `Networking with industry professionals in ${data.role} positions`,
        `${data.matchedSessions.length} curated sessions aligned with your attendance goals`,
        data.relevanceScore >= 70 ? `High ROI potential with extensive category coverage` : `Opportunities to explore adjacent markets and discover new trends`
      ],
      recommendations: [
        `Focus on the ${data.matchedExhibitors.length} exhibitors we've pre-matched for you`,
        `Attend ${data.matchedSessions.length} sessions covering ${data.interestCategories[0]}`,
        `Use Gulfood's pre-event platform to schedule meetings with key exhibitors`,
        data.relevanceScore >= 70 ? `Consider booking VIP access for premium networking opportunities` : `Explore adjacent categories to expand your sourcing possibilities`
      ]
    };
  }
}

async function generateItineraryWithAI(data: {
  name: string;
  organization: string;
  role: string;
  interestCategories: string[];
  attendanceIntents: string[];
  matchedExhibitors: any[];
  matchedSessions: any[];
  numberOfDays: number;
  specificDates: string[];
  preferredExhibitorIds?: number[];
}): Promise<{
  userId: string;
  name: string;
  organization: string;
  role: string;
  days: Array<{
    date: string;
    dayOfWeek: string;
    summary: string;
    activities: Array<{
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
    }>;
  }>;
  totalExhibitors: number;
  totalSessions: number;
  generatedAt: string;
}> {
  try {
    // Prepare exhibitor list with hall and stand information including relevance scores
    const exhibitorsList = data.matchedExhibitors.map((ex, idx) => {
      const relevance = typeof ex.relevancePercentage === 'number' ? ex.relevancePercentage : 70;
      return `${idx + 1}. ${ex.name} (ID: ${ex.id}) - Hall: ${ex.hall || 'TBA'}, Stand: ${ex.stand || 'TBA'} (Relevance: ${relevance}%)
   Sector: ${ex.sector}
   Description: ${ex.description?.substring(0, 150) || 'Premium food & beverage exhibitor'}`;
    }).join('\n');

    // Prepare session list with date and time information
    const sessionsList = data.matchedSessions.map((session, idx) => {
      const sessionDate = session.sessionDate ? new Date(session.sessionDate) : null;
      const dateStr = sessionDate ? sessionDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'TBA';
      return `${idx + 1}. ${session.title}
   Date: ${dateStr}, Time: ${session.sessionTime || 'TBA'}
   Location: ${session.location || 'Main Conference Hall'}
   Description: ${session.description?.substring(0, 100) || 'Industry session'}`;
    }).join('\n');

    // Generate date information based on numberOfDays and specificDates
    const defaultDates = ['January 26, 2026', 'January 27, 2026', 'January 28, 2026', 'January 29, 2026', 'January 30, 2026'];
    const defaultDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    let itineraryDates: string[] = [];
    let dateRange = '';
    
    if (data.specificDates && data.specificDates.length > 0) {
      // Use specific dates provided, limited to numberOfDays
      const datesToUse = data.specificDates.slice(0, data.numberOfDays);
      
      // If we need more dates than provided, fill with sequential dates after the last one
      if (datesToUse.length < data.numberOfDays) {
        const lastDate = new Date(datesToUse[datesToUse.length - 1]);
        for (let i = datesToUse.length; i < data.numberOfDays; i++) {
          const nextDate = new Date(lastDate);
          nextDate.setDate(lastDate.getDate() + (i - datesToUse.length + 1));
          datesToUse.push(nextDate.toISOString().split('T')[0]);
        }
      }
      
      // Convert to readable format
      itineraryDates = datesToUse.map(dateStr => {
        const date = new Date(dateStr + 'T00:00:00Z');
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
      });
      
      dateRange = `on these specific dates: ${datesToUse.join(', ')}`;
    } else {
      // Use default dates for the specified number of days
      itineraryDates = defaultDates.slice(0, data.numberOfDays);
      const lastDate = itineraryDates[itineraryDates.length - 1];
      dateRange = data.numberOfDays === 1 ? itineraryDates[0] : `${itineraryDates[0]} to ${lastDate}`;
    }

    // Identify preferred exhibitors for special handling
    const preferredExhibitorNames = data.preferredExhibitorIds && data.preferredExhibitorIds.length > 0
      ? data.matchedExhibitors
          .filter(e => data.preferredExhibitorIds!.includes(e.id))
          .map(e => `${e.name} (ID: ${e.id})`)
          .join(', ')
      : '';

    const prompt = `You are creating a detailed ${data.numberOfDays}-day itinerary for Gulfood 2026.

EVENT DETAILS:
- Event Dates: January 26-30, 2026
- Event Hours: 10:00 AM - 6:00 PM daily
- Location: Dubai World Trade Centre & Expo City Dubai
- Halls: North Hall 1-13, Za'abeel Hall 1-6, Trade Centre Arena
- Travel time between halls: 5-15 minutes depending on distance

USER PROFILE:
- Name: ${data.name}
- Organization: ${data.organization}
- Role: ${data.role}
- Interest Categories: ${data.interestCategories.join(', ')}
- Attendance Goals: ${data.attendanceIntents.join(', ')}
- Attendance Plan: ${data.numberOfDays} day${data.numberOfDays > 1 ? 's' : ''} ${dateRange}
${preferredExhibitorNames ? `- PRIORITY EXHIBITORS: ${preferredExhibitorNames} (User specifically selected these - MUST schedule on Day 1!)` : ''}

MATCHED EXHIBITORS (${data.matchedExhibitors.length} total):
${exhibitorsList}

SCHEDULED SESSIONS (${data.matchedSessions.length} total):
${sessionsList}

INSTRUCTIONS:
Create a detailed day-by-day itinerary following these rules:

1. SCHEDULING CONSTRAINTS:
   - Spread exhibitor visits across all ${data.numberOfDays} day${data.numberOfDays > 1 ? 's' : ''} (${dateRange})
   - Each exhibitor visit: 20-30 minutes
   - Mandatory lunch break: 12:00 PM - 1:00 PM daily
   - Include 10-15 minute networking/coffee breaks mid-morning and mid-afternoon
   - Schedule sessions at their EXACT specified times (if provided)

2. ROUTING OPTIMIZATION:
   - Group exhibitor visits by hall to minimize travel time
   - Add travel activities (5-15 min) when moving between different halls
   - Prioritize higher relevance score exhibitors earlier in each day
   - Start each day in a hall with multiple high-priority exhibitors
   - CRITICAL: If PRIORITY EXHIBITORS are specified, schedule ALL of them on Day 1 in the morning session (10:00 AM - 12:00 PM). These are exhibitors the user explicitly wants to visit first!

3. DAY STRUCTURE:
   - Start: 10:00 AM
   - Morning session: 10:00 AM - 12:00 PM (exhibitor visits)
   - Lunch: 12:00 PM - 1:00 PM
   - Afternoon session: 1:00 PM - 6:00 PM (exhibitor visits + sessions)
   - Include brief descriptions for why each exhibitor is relevant

4. ACTIVITY TYPES:
   - exhibitor_visit: Meeting with exhibitor at their booth
   - session: Attending a scheduled conference session
   - break: Lunch, networking, or coffee breaks
   - travel: Moving between different halls

5. OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
  "days": [
    {
      "date": "January 26, 2026",
      "dayOfWeek": "Monday",
      "summary": "Focus on Dairy & Beverages sectors in North Halls 1-7",
      "activities": [
        {
          "id": "act_1_1",
          "type": "exhibitor_visit",
          "title": "Visit [Company Name]",
          "startTime": "10:00 AM",
          "endTime": "10:30 AM",
          "duration": 30,
          "location": "North Hall 7",
          "stand": "B4-25",
          "exhibitorId": 123,
          "exhibitorName": "[Company Name]",
          "description": "Explore their dairy product innovations",
          "matchScore": 85
        },
        {
          "id": "act_1_2",
          "type": "travel",
          "title": "Travel to North Hall 13",
          "startTime": "10:30 AM",
          "endTime": "10:40 AM",
          "duration": 10,
          "travelFrom": "North Hall 7",
          "travelTo": "North Hall 13"
        }
      ]
    }
  ]
}

IMPORTANT:
- Ensure NO time overlaps between activities
- Use actual exhibitor names, halls, stands, and IDs from the list above
- Use actual session times and locations from the list above
- Generate unique activity IDs (e.g., "act_1_1" for day 1 activity 1)
- If an exhibitor has no hall/stand info, use "TBA" and place in a logical day
- Distribute exhibitors evenly across all ${data.numberOfDays} day${data.numberOfDays > 1 ? 's' : ''}
- Prioritize relevance scores when ordering daily activities
- For each exhibitor_visit activity, use the exhibitor's Relevance percentage from the list above as the matchScore field
- Use these exact dates for the itinerary: ${itineraryDates.join(', ')}

Return ONLY valid JSON matching the structure above.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert event planner specializing in trade show itinerary optimization. You create detailed, practical schedules that maximize attendee value while respecting time and logistics constraints. Always return valid JSON.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      console.error('OpenAI API failed:', response.status, response.statusText);
      throw new Error('OpenAI API request failed');
    }

    const result = await response.json();
    const aiResponse = JSON.parse(result.choices[0].message.content);

    // Validate and enhance the response
    let days = aiResponse.days || [];
    
    // ENFORCE: Verify preferred exhibitors are on Day 1, move them if not
    if (data.preferredExhibitorIds && data.preferredExhibitorIds.length > 0 && days.length > 0) {
      const preferredIds = new Set(data.preferredExhibitorIds);
      const day1 = days[0];
      
      // Find which preferred exhibitors are on Day 1
      const day1ExhibitorIds = new Set(
        day1.activities
          ?.filter((act: any) => act.type === 'exhibitor_visit' && act.exhibitorId)
          .map((act: any) => act.exhibitorId) || []
      );
      
      const missingPreferred = Array.from(preferredIds).filter(id => !day1ExhibitorIds.has(id));
      
      if (missingPreferred.length > 0) {
        console.warn(`⚠️ AI didn't place ${missingPreferred.length} preferred exhibitors on Day 1. Enforcing...`);
        
        // Find preferred exhibitor activities in other days
        const preferredActivities: any[] = [];
        
        for (let dayIdx = 1; dayIdx < days.length; dayIdx++) {
          const day = days[dayIdx];
          if (!day.activities) continue;
          
          for (const activity of day.activities) {
            if (activity.type === 'exhibitor_visit' && missingPreferred.includes(activity.exhibitorId)) {
              preferredActivities.push({ ...activity });
            }
          }
          
          // Keep only non-preferred activities on this day
          day.activities = day.activities.filter((act: any) => 
            !(act.type === 'exhibitor_visit' && missingPreferred.includes(act.exhibitorId))
          );
        }
        
        // Create activities for preferred exhibitors that are completely missing
        const foundIds = new Set(preferredActivities.map(a => a.exhibitorId));
        const completelyMissing = missingPreferred.filter(id => !foundIds.has(id));
        
        if (completelyMissing.length > 0) {
          console.warn(`⚠️ AI completely omitted ${completelyMissing.length} preferred exhibitors. Creating fallback activities...`);
          
          for (const exhibitorId of completelyMissing) {
            const exhibitor = data.matchedExhibitors.find(e => e.id === exhibitorId);
            if (exhibitor) {
              preferredActivities.push({
                id: `act_1_pref_${exhibitorId}`,
                type: 'exhibitor_visit',
                title: `Visit ${exhibitor.name}`,
                startTime: '10:00 AM',
                endTime: '10:30 AM',
                duration: 30,
                location: exhibitor.hall || 'TBA',
                stand: exhibitor.stand || 'TBA',
                exhibitorId: exhibitor.id,
                exhibitorName: exhibitor.name,
                description: `Priority visit to ${exhibitor.name}`,
                matchScore: typeof exhibitor.relevancePercentage === 'number' ? exhibitor.relevancePercentage : 90
              });
            }
          }
        }
        
        // Recalculate times for preferred exhibitors in Day 1 morning window (10:00-12:00 PM)
        // STRICT 2-hour window constraint: never exceed 12:00 PM
        const morningStart = 10 * 60; // 10:00 AM in minutes
        const morningEnd = 12 * 60;   // 12:00 PM in minutes
        const totalMinutes = morningEnd - morningStart; // 120 minutes
        
        // Cap at 5 exhibitors total (frontend enforces this)
        const cappedActivities = preferredActivities.slice(0, 5);
        
        // Calculate slot duration to fit all exhibitors in the 2-hour window
        // 1-4 exhibitors: 30 min each (standard)
        // 5 exhibitors: 24 min each (120 / 5 = 24) to stay within 12:00 PM
        const slotDuration = cappedActivities.length <= 4 ? 30 : Math.floor(totalMinutes / cappedActivities.length);
        
        cappedActivities.forEach((activity, index) => {
          const startMinutes = morningStart + (index * slotDuration);
          const endMinutes = startMinutes + slotDuration;
          
          // Ensure we never exceed 12:00 PM
          const cappedEndMinutes = Math.min(endMinutes, morningEnd);
          
          const startHour = Math.floor(startMinutes / 60);
          const startMin = startMinutes % 60;
          const endHour = Math.floor(cappedEndMinutes / 60);
          const endMin = cappedEndMinutes % 60;
          
          // Format time as 12-hour with AM/PM
          const formatHour = (hour: number) => hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
          const formatPeriod = (hour: number) => hour < 12 ? 'AM' : 'PM';
          
          activity.startTime = `${formatHour(startHour)}:${startMin.toString().padStart(2, '0')} ${formatPeriod(startHour)}`;
          activity.endTime = `${formatHour(endHour)}:${endMin.toString().padStart(2, '0')} ${formatPeriod(endHour)}`;
          activity.duration = cappedEndMinutes - startMinutes;
        });
        
        // If we had >5 preferred exhibitors, log a warning
        if (preferredActivities.length > 5) {
          console.warn(`⚠️ User selected ${preferredActivities.length} preferred exhibitors. Limiting to first 5 in Day 1 schedule.`);
        }
        
        // Insert preferred activities at the start of Day 1
        day1.activities = day1.activities || [];
        
        // Check for potential time overlaps with existing activities (informational only)
        const existingMorningActivities = day1.activities.filter((act: any) => {
          if (!act.startTime) return false;
          const hour = parseInt(act.startTime.split(':')[0]);
          const period = act.startTime.includes('PM') ? 'PM' : 'AM';
          const hour24 = period === 'PM' && hour !== 12 ? hour + 12 : hour;
          return hour24 >= 10 && hour24 < 12;
        });
        
        if (existingMorningActivities.length > 0) {
          console.warn(`⚠️ Detected ${existingMorningActivities.length} existing activities in 10:00-12:00 window. Preferred exhibitors take priority - potential time overlaps.`);
        }
        
        day1.activities.unshift(...cappedActivities);
        
        const slotInfo = cappedActivities.length <= 4 ? '30-min slots' : '24-min slots';
        console.log(`✅ Scheduled ${cappedActivities.length} preferred exhibitors on Day 1 morning (10:00-12:00 PM, ${slotInfo})`);
      } else {
        console.log(`✅ All ${preferredIds.size} preferred exhibitors are already on Day 1`);
      }
    }
    
    return {
      userId: data.name,
      name: data.name,
      organization: data.organization,
      role: data.role,
      days,
      totalExhibitors: data.matchedExhibitors.length,
      totalSessions: data.matchedSessions.length,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating AI itinerary:', error);
    
    // Fallback: Create a basic itinerary structure using numberOfDays and specificDates
    const days = [];
    
    // Generate dates and day names based on numberOfDays and specificDates
    const defaultDates = ['January 26, 2026', 'January 27, 2026', 'January 28, 2026', 'January 29, 2026', 'January 30, 2026'];
    const defaultDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    let fallbackDates: string[] = [];
    let fallbackDayNames: string[] = [];
    
    if (data.specificDates && data.specificDates.length > 0) {
      // Use specific dates provided, limited to numberOfDays
      const datesToUse = data.specificDates.slice(0, data.numberOfDays);
      
      // If we need more dates than provided, fill with sequential dates after the last one
      if (datesToUse.length < data.numberOfDays) {
        const lastDate = new Date(datesToUse[datesToUse.length - 1]);
        for (let i = datesToUse.length; i < data.numberOfDays; i++) {
          const nextDate = new Date(lastDate);
          nextDate.setDate(lastDate.getDate() + (i - datesToUse.length + 1));
          datesToUse.push(nextDate.toISOString().split('T')[0]);
        }
      }
      
      // Convert to readable format and get day names
      fallbackDates = datesToUse.map(dateStr => {
        const date = new Date(dateStr + 'T00:00:00Z');
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
      });
      
      fallbackDayNames = datesToUse.map(dateStr => {
        const date = new Date(dateStr + 'T00:00:00Z');
        return date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
      });
    } else {
      // Use default dates for the specified number of days
      fallbackDates = defaultDates.slice(0, data.numberOfDays);
      fallbackDayNames = defaultDayNames.slice(0, data.numberOfDays);
    }
    
    // Distribute exhibitors across the specified number of days
    const exhibitorsPerDay = Math.ceil(data.matchedExhibitors.length / data.numberOfDays);
    
    for (let dayIndex = 0; dayIndex < data.numberOfDays; dayIndex++) {
      const dayExhibitors = data.matchedExhibitors.slice(
        dayIndex * exhibitorsPerDay,
        (dayIndex + 1) * exhibitorsPerDay
      );
      
      const activities: any[] = [];
      let currentTime = 10 * 60; // 10:00 AM in minutes
      
      // Morning exhibitor visits
      for (const exhibitor of dayExhibitors) {
        if (currentTime >= 12 * 60) break; // Stop before lunch
        
        const duration = 25;
        const startHour = Math.floor(currentTime / 60);
        const startMin = currentTime % 60;
        const endTime = currentTime + duration;
        const endHour = Math.floor(endTime / 60);
        const endMin = endTime % 60;
        
        activities.push({
          id: `act_${dayIndex + 1}_${activities.length + 1}`,
          type: 'exhibitor_visit',
          title: `Visit ${exhibitor.name}`,
          startTime: `${startHour}:${startMin.toString().padStart(2, '0')} ${startHour >= 12 ? 'PM' : 'AM'}`,
          endTime: `${endHour}:${endMin.toString().padStart(2, '0')} ${endHour >= 12 ? 'PM' : 'AM'}`,
          duration,
          location: exhibitor.hall || 'TBA',
          stand: exhibitor.stand || 'TBA',
          exhibitorId: exhibitor.id,
          exhibitorName: exhibitor.name,
          description: `Explore ${exhibitor.sector} innovations`,
          relevanceScore: exhibitor.relevanceScore || 70
        });
        
        currentTime += duration + 5; // Add 5 min buffer
      }
      
      // Lunch break
      activities.push({
        id: `act_${dayIndex + 1}_lunch`,
        type: 'break',
        title: 'Lunch Break',
        startTime: '12:00 PM',
        endTime: '1:00 PM',
        duration: 60,
        description: 'Networking lunch'
      });
      
      currentTime = 13 * 60; // 1:00 PM
      
      // Afternoon sessions (if any for this day)
      // Try to match sessions to the specific date if available
      let daySessions = [];
      if (data.specificDates && data.specificDates.length > dayIndex) {
        const targetDate = new Date(data.specificDates[dayIndex]);
        daySessions = data.matchedSessions.filter(s => {
          const sessionDate = s.sessionDate ? new Date(s.sessionDate) : null;
          return sessionDate && 
                 sessionDate.getDate() === targetDate.getDate() &&
                 sessionDate.getMonth() === targetDate.getMonth();
        });
      } else {
        // Use default logic for sessions
        daySessions = data.matchedSessions.filter(s => {
          const sessionDate = s.sessionDate ? new Date(s.sessionDate) : null;
          return sessionDate && sessionDate.getDate() === 26 + dayIndex;
        });
      }
      
      for (const session of daySessions) {
        activities.push({
          id: `act_${dayIndex + 1}_${activities.length + 1}`,
          type: 'session',
          title: session.title,
          startTime: session.sessionTime || '2:00 PM',
          endTime: session.sessionTime || '3:00 PM',
          duration: 60,
          location: session.location || 'Conference Hall',
          sessionId: session.id,
          description: session.description || 'Industry conference session'
        });
      }
      
      days.push({
        date: fallbackDates[dayIndex],
        dayOfWeek: fallbackDayNames[dayIndex],
        summary: `Day ${dayIndex + 1}: Focus on ${dayExhibitors.slice(0, 2).map(e => e.sector).join(' and ')}`,
        activities
      });
    }
    
    return {
      userId: data.name,
      name: data.name,
      organization: data.organization,
      role: data.role,
      days,
      totalExhibitors: data.matchedExhibitors.length,
      totalSessions: data.matchedSessions.length,
      generatedAt: new Date().toISOString()
    };
  }
}
