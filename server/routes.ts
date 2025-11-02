import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCompanyAnalysisSchema, insertMeetingSchema } from "@shared/schema";
import OpenAI from "openai";
import { z } from "zod";
import { seedDatabase } from "./seed";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function registerRoutes(app: Express): Promise<Server> {
  await seedDatabase();

  app.get("/api/exhibitors", async (req, res) => {
    try {
      const { search, sector } = req.query;
      const exhibitors = await storage.getExhibitors(
        search as string | undefined,
        sector as string | undefined
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
        sector: z.array(z.string()).min(1),
        relevanceScore: z.number().min(0).max(100),
        summary: z.string().min(1),
        benefits: z.array(z.string()).min(1),
        matchedExhibitorsCount: z.number().min(0)
      });

      const validationResult = analysisSchema.safeParse(analysisData);
      
      if (!validationResult.success) {
        console.error("Invalid AI response structure:", validationResult.error);
        return res.status(500).json({ error: "AI analysis returned invalid data. Please try again." });
      }

      const validated = validationResult.data;
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
      const meetingData = insertMeetingSchema.parse(req.body);
      const meeting = await storage.createMeeting(meetingData);
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
      const { sessionId, message } = req.body;
      
      if (!sessionId || !message) {
        return res.status(400).json({ error: "Session ID and message are required" });
      }

      let conversation = await storage.getChatConversation(sessionId);
      let messages: any[] = conversation?.messages as any[] || [];

      messages.push({ role: "user", content: message });

      const systemPrompt = `You are an AI assistant for Gulfood 2026, the world's largest food & beverage exhibition in Dubai (January 26-30, 2026). 

Key information:
- Venue: Dubai World Trade Centre & Expo City Dubai
- 8,500+ exhibitors across 12 sectors
- 100,000+ expected visitors from 120+ countries
- Sectors: Dairy, Beverages, Meat & Poultry, Plant-Based, Fresh Produce, Snacks, etc.

Help visitors with:
- Registration and event information
- Exhibitor recommendations
- Scheduling and navigation
- General inquiries

Be helpful, concise, and professional.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 500
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
