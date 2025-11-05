import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCompanyAnalysisSchema, insertMeetingSchema, insertSalesContactSchema, insertChatFeedbackSchema, insertGeneratedReportSchema, insertLeadSchema, insertReferralSchema, insertAnnouncementSchema, insertScheduledSessionSchema, insertExhibitorAccessCodeSchema } from "@shared/schema";
import OpenAI from "openai";
import { z } from "zod";
import { seedDatabase } from "./seed";
import bcrypt from "bcryptjs";
import { requireOrganizerAuth, requireExhibitorAuth, generateOrganizerToken, generateExhibitorToken, type AuthRequest } from "./middleware/auth";

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

export async function registerRoutes(app: Express): Promise<Server> {
  await seedDatabase();

  app.get("/api/exhibitors", async (req, res) => {
    try {
      const { search, sector, country } = req.query;
      const exhibitors = await storage.getExhibitors(
        search as string | undefined,
        sector as string | undefined,
        country as string | undefined
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
      const { reportType, userRole, sessionId } = req.body;
      
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
      const announcement = await storage.createAnnouncement({
        ...validatedData,
        createdBy: req.organizerEmail
      });
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

      const token = generateExhibitorToken(accessCode.code, accessCode.companyName);
      
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
        sessionId
      } = req.body;

      if (!email || !organization || !role || !interestCategories || !attendanceIntents) {
        return res.status(400).json({ error: "Missing required fields" });
      }

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

      const relevanceScore = calculateRelevanceScore({
        organization,
        role,
        interestCategories,
        attendanceIntents
      });

      const exhibitors = await storage.getExhibitors();
      const matchedExhibitors = matchExhibitors(exhibitors, {
        interestCategories,
        attendanceIntents,
        organization,
        role
      });

      const sessions = await storage.getScheduledSessions();
      const matchedSessions = matchSessions(sessions, {
        interestCategories,
        attendanceIntents,
        role
      });

      const aiContent = await generateJourneyContent({
        organization,
        role,
        interestCategories,
        attendanceIntents,
        relevanceScore,
        matchedExhibitors: matchedExhibitors.slice(0, 5),
        matchedSessions: matchedSessions.slice(0, 3)
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
        relevanceScore,
        generalOverview: aiContent.overview,
        scoreJustification: aiContent.justification,
        benefits: aiContent.benefits,
        recommendations: aiContent.recommendations,
        matchedExhibitorIds: matchedExhibitors.slice(0, 10).map(e => e.id),
        matchedSessionIds: matchedSessions.slice(0, 5).map(s => s.id),
        reportData: {
          matchedExhibitors: matchedExhibitors.slice(0, 10),
          matchedSessions: matchedSessions.slice(0, 5)
        }
      });

      res.json({
        ...journeyPlan,
        matchedExhibitors: matchedExhibitors.slice(0, 10),
        matchedSessions: matchedSessions.slice(0, 5)
      });
    } catch (error) {
      console.error("Error generating journey:", error);
      res.status(500).json({ error: "Failed to generate journey plan" });
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
  let score = 0;

  const organizationMatch = data.organization.length > 2 ? 40 : 0;
  score += organizationMatch;

  const roleKeywords = ['buyer', 'distributor', 'chef', 'manager', 'director', 'owner', 'procurement'];
  const roleRelevance = roleKeywords.some(kw => 
    data.role.toLowerCase().includes(kw)
  ) ? 25 : 15;
  score += roleRelevance;

  const categoryMatch = Math.min(data.interestCategories.length * 5, 20);
  score += categoryMatch;

  const intentClarity = data.attendanceIntents.length > 0 ? 15 : 0;
  score += intentClarity;

  return Math.min(score, 100);
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

      const categoryMatch = criteria.interestCategories.some(cat =>
        exhibitor.sector?.toLowerCase().includes(cat.toLowerCase()) ||
        exhibitor.productCategories?.some((pc: string) => pc.toLowerCase().includes(cat.toLowerCase()))
      );
      if (categoryMatch) matchScore += 40;

      const keywordMatch = criteria.attendanceIntents.some(intent =>
        exhibitor.description?.toLowerCase().includes(intent.toLowerCase().split(' ').slice(0, 2).join(' '))
      );
      if (keywordMatch) matchScore += 30;

      if (exhibitor.country && exhibitor.country !== 'UAE') {
        matchScore += 15;
      }

      const roleMatch = ['buyer', 'distributor', 'procurement'].some(kw =>
        criteria.role.toLowerCase().includes(kw)
      );
      if (roleMatch && exhibitor.sector) matchScore += 15;

      return {
        ...exhibitor,
        matchScore,
        relevancePercentage: matchScore
      };
    })
    .filter(e => e.matchScore > 20)
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
    const prompt = `You are an AI assistant for Gulfood 2026, the world's largest annual food and beverage trade show in Dubai (January 26-30, 2026).

User Profile:
- Organization: ${data.organization}
- Role: ${data.role}
- Interest Categories: ${data.interestCategories.join(', ')}
- Attendance Intents: ${data.attendanceIntents.join(', ')}
- Relevance Score: ${data.relevanceScore}/100

Matched Exhibitors: ${data.matchedExhibitors.length} companies
Matched Sessions: ${data.matchedSessions.length} events

Generate a personalized journey plan with:
1. A brief overview (2-3 sentences) of why Gulfood 2026 is perfect for them
2. Score justification (1-2 sentences) explaining their ${data.relevanceScore}/100 relevance score
3. Three key benefits they'll gain from attending (array of strings)
4. Three actionable recommendations for maximizing their experience (array of strings)

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
          { role: 'system', content: 'You are a helpful assistant that generates personalized event recommendations in JSON format.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error('OpenAI API request failed');
    }

    const result = await response.json();
    const content = JSON.parse(result.choices[0].message.content);

    return {
      overview: content.overview || "Gulfood 2026 offers unparalleled opportunities for your organization.",
      justification: content.justification || "Your profile aligns well with the event's offerings.",
      benefits: content.benefits || ["Network with industry leaders", "Discover innovative products", "Expand your business reach"],
      recommendations: content.recommendations || ["Visit top-matched exhibitors", "Attend relevant sessions", "Plan your itinerary in advance"]
    };
  } catch (error) {
    console.error('Error generating AI content:', error);
    return {
      overview: "Gulfood 2026 brings together the global food and beverage industry under one roof, offering you direct access to innovations, suppliers, and networking opportunities that align with your professional goals.",
      justification: `Your relevance score of ${data.relevanceScore}/100 reflects strong alignment between your interests and Gulfood's exhibitor base and program content.`,
      benefits: [
        "Access to over 5,000+ exhibitors across your categories of interest",
        "Networking opportunities with industry professionals in your role",
        "Insights into the latest market trends and innovations"
      ],
      recommendations: [
        "Focus on the matched exhibitors we've identified for maximum ROI",
        "Attend sessions that align with your attendance intents",
        "Plan your journey across both Dubai World Trade Centre and Expo City venues"
      ]
    };
  }
}
