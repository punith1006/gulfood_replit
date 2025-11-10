import OpenAI from 'openai';
import { generateEmailResponseFromRAG } from './ragEmailService';

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
  
  try {
    // Call custom RAG API for document-based response generation
    const ragResponse = await generateEmailResponseFromRAG(subject, body);
    
    // Guard against RAG API failures or missing data
    if (!ragResponse.success || !ragResponse.email_response) {
      console.error('⚠️  RAG API returned success=false or missing email_response');
      return {
        intent: 'general',
        responseTier: 'escalate',
        escalationReason: 'RAG API failed to generate response - requires human review',
        confidence: 0
      };
    }
    
    // Determine response tier based on RAG flags
    if (!ragResponse.has_sufficient_context) {
      // Insufficient context - escalate to human
      return {
        intent: 'general',
        responseTier: 'escalate',
        escalationReason: 'Insufficient context in knowledge base - requires human expertise',
        confidence: 30
      };
    }
    
    if (ragResponse.needs_clarification) {
      // Needs clarification - use OpenAI to generate clarifying questions
      const clarifyingQuestions = await generateClarifyingQuestions(subject, body, ragResponse.email_response);
      
      return {
        intent: classifyIntent(subject, body),
        responseTier: 'clarify',
        clarifyingQuestions,
        confidence: 70
      };
    }
    
    // Has sufficient context and doesn't need clarification - auto-answer
    return {
      intent: classifyIntent(subject, body),
      responseTier: 'auto_answer',
      aiResponse: ragResponse.email_response,
      confidence: 95
    };
    
  } catch (error) {
    console.error('Error analyzing email with RAG API:', error);
    
    // Fallback: escalate if RAG API fails
    return {
      intent: 'general',
      responseTier: 'escalate',
      escalationReason: 'RAG API error - requires human review',
      confidence: 0
    };
  }
}

async function generateClarifyingQuestions(
  subject: string,
  body: string,
  ragContext: string
): Promise<string[]> {
  try {
    const systemPrompt = `You are an AI email assistant for Gulfood 2026. The RAG system has indicated that this email needs clarification before we can provide a complete answer.

Your task: Generate 2-3 specific, helpful clarifying questions that will help us provide a better response.

Context from RAG:
${ragContext}`;

    const userMessage = `Subject: ${subject}

Email:
${body}

Generate 2-3 clarifying questions as a JSON array.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const response = JSON.parse(completion.choices[0].message.content || '{}');
    return response.questions || [
      "Could you provide more details about your specific inquiry?",
      "What aspect of Gulfood 2026 are you most interested in?"
    ];
  } catch (error) {
    console.error('Error generating clarifying questions:', error);
    return [
      "Could you provide more details about your specific inquiry?",
      "What aspect of Gulfood 2026 are you most interested in?"
    ];
  }
}

function classifyIntent(subject: string, body: string): 'exhibitor_info' | 'event_details' | 'booking' | 'complaint' | 'general' {
  const combined = `${subject} ${body}`.toLowerCase();
  
  if (combined.includes('exhibitor') || combined.includes('booth') || combined.includes('company')) {
    return 'exhibitor_info';
  }
  if (combined.includes('register') || combined.includes('ticket') || combined.includes('venue') || combined.includes('parking')) {
    return 'event_details';
  }
  if (combined.includes('meeting') || combined.includes('appointment') || combined.includes('schedule')) {
    return 'booking';
  }
  if (combined.includes('complaint') || combined.includes('issue') || combined.includes('problem')) {
    return 'complaint';
  }
  
  return 'general';
}
