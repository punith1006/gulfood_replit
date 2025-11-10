import OpenAI from 'openai';
import { db } from './db';
import { exhibitors } from '../shared/schema';
import { sql, ilike, or } from 'drizzle-orm';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface EmailAnalysisResult {
  intent: 'exhibitor_info' | 'event_details' | 'booking' | 'complaint' | 'general';
  responseTier: 'auto_answer' | 'clarify' | 'escalate';
  aiResponse?: string;
  clarifyingQuestions?: string[];
  escalationReason?: string;
  confidence: number;
}

export async function analyzeEmail(
  from: string,
  subject: string,
  body: string
): Promise<EmailAnalysisResult> {
  
  // Query exhibitor database for context
  const exhibitorContext = await getRelevantExhibitors(body);
  
  const systemPrompt = `You are an AI email assistant for Gulfood 2026, a major food trade show in Dubai (January 26-30, 2026).

Your role is to analyze incoming emails and determine:
1. The intent of the email
2. Whether you can auto-answer, need clarification, or should escalate to a human

Event Details:
- Dates: January 26-30, 2026
- Venues: Dubai Exhibition Centre (DEC) and Dubai World Trade Centre (DWTC)
- 899 exhibitors across sectors: Beverages, Dairy, Meat & Poultry, World Food, etc.

Available Exhibitors Database:
${exhibitorContext}

Classify intent as:
- exhibitor_info: Questions about specific exhibitors, their products, booth locations
- event_details: Questions about event schedule, venue, tickets, parking
- booking: Meeting/appointment booking requests
- complaint: Issues, complaints, feedback
- general: Other inquiries

Determine response tier:
- auto_answer: You have enough information to provide a complete, helpful answer
- clarify: You need more information to provide a good answer
- escalate: Complex issue requiring human intervention (complaints, VIP requests, legal matters)

Return a JSON object with:
{
  "intent": "exhibitor_info" | "event_details" | "booking" | "complaint" | "general",
  "responseTier": "auto_answer" | "clarify" | "escalate",
  "aiResponse": "your complete response" (if auto_answer),
  "clarifyingQuestions": ["question 1", "question 2"] (if clarify),
  "escalationReason": "why this needs human attention" (if escalate),
  "confidence": 0-100
}`;

  const userMessage = `From: ${from}
Subject: ${subject}

Body:
${body}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const analysis = JSON.parse(completion.choices[0].message.content || '{}');
    
    return {
      intent: analysis.intent || 'general',
      responseTier: analysis.responseTier || 'clarify',
      aiResponse: analysis.aiResponse,
      clarifyingQuestions: analysis.clarifyingQuestions,
      escalationReason: analysis.escalationReason,
      confidence: analysis.confidence || 50
    };
  } catch (error) {
    console.error('Error analyzing email:', error);
    
    // Fallback: escalate if analysis fails
    return {
      intent: 'general',
      responseTier: 'escalate',
      escalationReason: 'AI analysis failed - requires human review',
      confidence: 0
    };
  }
}

async function getRelevantExhibitors(emailBody: string): Promise<string> {
  try {
    // Extract potential exhibitor names or keywords from email (sanitized)
    const keywords = emailBody
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && /^[a-z0-9]+$/.test(word)) // Only alphanumeric keywords
      .slice(0, 10); // Limit to 10 keywords max
    
    if (keywords.length === 0) {
      return 'No specific exhibitor context available';
    }

    // Build safe OR conditions using ilike (case-insensitive LIKE)
    const conditions = keywords.flatMap(keyword => {
      const pattern = `%${keyword}%`;
      return [
        ilike(exhibitors.name, pattern),
        ilike(exhibitors.description, pattern),
        ilike(exhibitors.sector, pattern)
      ];
    });

    const results = await db
      .select({
        name: exhibitors.name,
        sector: exhibitors.sector,
        venue: exhibitors.venue,
        hall: exhibitors.hall,
        booth: exhibitors.booth,
        country: exhibitors.country,
        description: exhibitors.description
      })
      .from(exhibitors)
      .where(or(...conditions))
      .limit(10);

    if (results.length === 0) {
      return 'No specific exhibitors found matching email content';
    }

    return results.map((ex: any) => 
      `${ex.name} - ${ex.sector} - ${ex.venue}, ${ex.hall}, Booth ${ex.booth} - ${ex.country}`
    ).join('\n');
    
  } catch (error) {
    console.error('Error fetching exhibitors:', error);
    return 'Exhibitor database temporarily unavailable';
  }
}
