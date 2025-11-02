import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCompanyAnalysisSchema, insertMeetingSchema } from "@shared/schema";
import OpenAI from "openai";
import { z } from "zod";
import { seedDatabase } from "./seed";

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

      const existing = await storage.getCompanyAnalysis(companyIdentifier);
      if (existing) {
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

      res.json(analysis);
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
- Helping them find relevant exhibitors based on their interests
- Providing travel and accommodation recommendations for Dubai
- Explaining the event schedule and must-see pavilions
- Suggesting networking opportunities and meeting scheduling
- Offering venue navigation tips
- Recommending hotels near Dubai World Trade Centre`
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
        await storage.updateChatConversation(sessionId, messages);
      } else {
        await storage.createChatConversation({ sessionId, messages });
      }

      res.json({ message: assistantMessage });
    } catch (error) {
      console.error("Error processing chat:", error);
      res.status(500).json({ error: "Failed to process chat message" });
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

  const httpServer = createServer(app);

  return httpServer;
}
