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
      
      const prompt = `Analyze this company/website: "${companyIdentifier}" for Gulfood 2026, the world's largest food & beverage exhibition in Dubai.

Available exhibitor sectors: Dairy, Beverages, Meat & Poultry, Plant-Based, Fresh Produce, etc.

Provide a JSON response with:
1. companyName: The company name (infer from identifier if needed)
2. sector: Array of relevant food/beverage sectors (e.g., ["Dairy", "Beverages"])
3. relevanceScore: Number 0-100 indicating how relevant Gulfood 2026 is for this company
4. summary: Brief 2-3 sentence company description
5. benefits: Array of 4 specific benefits of attending Gulfood 2026 for this company
6. matchedExhibitorsCount: Estimate number of relevant exhibitors from 8,500+ total

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
        summary: z.string().min(1),
        benefits: z.array(z.string()).min(1).default(["Connect with industry professionals", "Explore new market opportunities"]),
        matchedExhibitorsCount: z.number().min(0).default(100)
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
          summary: analysisData.summary || `Analysis for ${companyIdentifier}. Gulfood 2026 offers opportunities to connect with global food and beverage industry leaders.`,
          benefits: Array.isArray(analysisData.benefits) && analysisData.benefits.length > 0 
            ? analysisData.benefits 
            : [
                "Network with industry professionals from around the world",
                "Discover new market trends and opportunities",
                "Showcase your products to potential buyers",
                "Learn from industry experts and thought leaders"
              ],
          matchedExhibitorsCount: Math.max(fallbackMatched, 100)
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
        summary: validated.summary,
        benefits: validated.benefits,
        matchedExhibitorsCount: validated.matchedExhibitorsCount,
        matchedExhibitorIds,
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

IMPORTANT: You are MULTILINGUAL and can understand and respond in:
- English
- Arabic (العربية)
- Simplified Chinese (简体中文)
- Hindi (हिन्दी)

Detect the language of the user's message and respond in the SAME language. If they ask in Arabic, respond in Arabic. If they ask in Chinese, respond in Chinese. If they ask in Hindi, respond in Hindi.

Key Event Information:
- Venue: Dubai World Trade Centre & Expo City Dubai
- Dates: January 26-30, 2026
- 8,500+ exhibitors across 12 sectors
- 100,000+ expected visitors from 120+ countries
- Sectors: Dairy, Beverages, Meat & Poultry, Plant-Based, Fresh Produce, Snacks, Gourmet, Organic Foods, Confectionery, Bakery, Seafood, Health & Wellness

${roleContext}

Be helpful, concise, professional, and culturally aware. Always respond in the user's language.`;

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
