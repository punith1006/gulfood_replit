import OpenAI from 'openai';
import type { OrganizationEnrichment } from './organizationEnrichment';
import type { Exhibitor } from '@shared/schema';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

/**
 * Robust JSON parsing with aggressive cleanup
 * Handles common AI response issues like markdown, escaped quotes, newlines
 */
function parseAIJSON<T>(content: string): T {
  // Remove markdown code blocks
  let cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  
  // Remove any leading/trailing whitespace
  cleaned = cleaned.trim();
  
  // Try to find JSON array or object boundaries if embedded in other text
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  
  if (arrayMatch) {
    cleaned = arrayMatch[0];
  } else if (objectMatch) {
    cleaned = objectMatch[0];
  }
  
  try {
    return JSON.parse(cleaned);
  } catch (firstError) {
    // Try more aggressive cleanup
    try {
      // Fix common issues: unescaped quotes in strings, trailing commas
      cleaned = cleaned
        .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
        .replace(/\n/g, ' ') // Replace newlines with spaces
        .replace(/\r/g, ''); // Remove carriage returns
      
      return JSON.parse(cleaned);
    } catch (secondError) {
      console.error('Failed to parse AI JSON after cleanup:', cleaned.substring(0, 500));
      throw new Error(`JSON parsing failed: ${(secondError as Error).message}`);
    }
  }
}

/**
 * Validate RelevanceScoring structure
 * Ensures all required fields exist and have valid types and values
 */
function validateRelevanceScoring(data: any): data is RelevanceScoring {
  if (!data || typeof data !== 'object') {
    console.error('Validation failed: data is not an object');
    return false;
  }
  
  // Validate relevanceScore
  if (typeof data.relevanceScore !== 'number' || isNaN(data.relevanceScore)) {
    console.error('Validation failed: relevanceScore is not a valid number');
    return false;
  }
  if (data.relevanceScore < 0 || data.relevanceScore > 100) {
    console.error(`Validation failed: relevanceScore ${data.relevanceScore} is out of range (0-100)`);
    return false;
  }
  
  // Validate scoreJustification
  if (typeof data.scoreJustification !== 'string' || data.scoreJustification.length === 0) {
    console.error('Validation failed: scoreJustification is not a non-empty string');
    return false;
  }
  
  // Validate keyTakeaways - must be non-empty array of non-empty strings
  if (!Array.isArray(data.keyTakeaways) || data.keyTakeaways.length === 0) {
    console.error('Validation failed: keyTakeaways is not a non-empty array');
    return false;
  }
  if (!data.keyTakeaways.every((item: any) => typeof item === 'string' && item.length > 0)) {
    console.error('Validation failed: keyTakeaways contains non-string or empty elements');
    return false;
  }
  
  // Validate attendanceValue
  if (typeof data.attendanceValue !== 'string' || data.attendanceValue.length === 0) {
    console.error('Validation failed: attendanceValue is not a non-empty string');
    return false;
  }
  
  // Validate confidenceScore
  if (typeof data.confidenceScore !== 'number' || isNaN(data.confidenceScore)) {
    console.error('Validation failed: confidenceScore is not a valid number');
    return false;
  }
  if (data.confidenceScore < 0 || data.confidenceScore > 100) {
    console.error(`Validation failed: confidenceScore ${data.confidenceScore} is out of range (0-100)`);
    return false;
  }
  
  return true;
}

/**
 * Validate ExhibitorMatchScore array
 * Ensures all items have required fields with valid types and values
 */
function validateExhibitorMatchScores(data: any): data is ExhibitorMatchScore[] {
  if (!Array.isArray(data)) {
    console.error('Validation failed: data is not an array');
    return false;
  }
  
  if (data.length === 0) {
    console.error('Validation failed: exhibitor match scores array is empty');
    return false;
  }
  
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    
    if (!item || typeof item !== 'object') {
      console.error(`Validation failed: item ${i} is not an object`);
      return false;
    }
    
    // Validate exhibitorId
    if (typeof item.exhibitorId !== 'number' || isNaN(item.exhibitorId)) {
      console.error(`Validation failed: item ${i} exhibitorId is not a valid number`);
      return false;
    }
    
    // Validate matchScore with range check
    if (typeof item.matchScore !== 'number' || isNaN(item.matchScore)) {
      console.error(`Validation failed: item ${i} matchScore is not a valid number`);
      return false;
    }
    if (item.matchScore < 0 || item.matchScore > 100) {
      console.error(`Validation failed: item ${i} matchScore ${item.matchScore} is out of range (0-100)`);
      return false;
    }
    
    // Validate matchReasoning
    if (typeof item.matchReasoning !== 'string' || item.matchReasoning.length === 0) {
      console.error(`Validation failed: item ${i} matchReasoning is not a non-empty string`);
      return false;
    }
    
    // Validate relevanceFactors - must be array of strings
    if (!Array.isArray(item.relevanceFactors)) {
      console.error(`Validation failed: item ${i} relevanceFactors is not an array`);
      return false;
    }
    if (!item.relevanceFactors.every((factor: any) => typeof factor === 'string' && factor.length > 0)) {
      console.error(`Validation failed: item ${i} relevanceFactors contains non-string or empty elements`);
      return false;
    }
  }
  
  return true;
}

export interface RelevanceScoring {
  relevanceScore: number; // 0-100
  scoreJustification: string; // Detailed explanation with KPIs
  keyTakeaways: string[]; // Specific benefits and KPIs
  attendanceValue: string; // Overall value proposition
  confidenceScore: number; // 0-100, confidence in this assessment
}

export interface ExhibitorMatchScore {
  exhibitorId: number;
  matchScore: number; // 0-100
  matchReasoning: string; // Why this score
  relevanceFactors: string[]; // Specific alignment points
}

/**
 * Calculate event attendance relevance score with detailed justification
 * Analyzes why the user should attend Gulfood 2026 based on their profile
 */
export async function calculateRelevanceScore(params: {
  organization: string;
  role: string;
  interestCategories: string[];
  attendanceIntents: string[];
  preferredExhibitorIds?: number[];
  organizationEnrichment?: OrganizationEnrichment;
}): Promise<RelevanceScoring> {
  if (!openai) {
    throw new Error('OpenAI client not initialized');
  }

  const {
    organization,
    role,
    interestCategories,
    attendanceIntents,
    preferredExhibitorIds,
    organizationEnrichment
  } = params;

  // Build context about the organization
  const orgContext = organizationEnrichment ? `
ORGANIZATION CONTEXT (from research):
- Name: ${organizationEnrichment.organizationName}
- Industry: ${organizationEnrichment.industry.join(', ')}
${organizationEnrichment.companySize ? `- Company Size: ${organizationEnrichment.companySize}` : ''}
${organizationEnrichment.products && organizationEnrichment.products.length > 0 ? `- Products/Services: ${organizationEnrichment.products.join(', ')}` : ''}
${organizationEnrichment.marketPresence ? `- Market Presence: ${organizationEnrichment.marketPresence}` : ''}
${organizationEnrichment.businessModel ? `- Business Model: ${organizationEnrichment.businessModel}` : ''}
${organizationEnrichment.targetMarkets && organizationEnrichment.targetMarkets.length > 0 ? `- Target Markets: ${organizationEnrichment.targetMarkets.join(', ')}` : ''}
- Summary: ${organizationEnrichment.searchSummary}
- Research Confidence: ${organizationEnrichment.confidenceScore}%
` : `ORGANIZATION CONTEXT: ${organization} (limited research available)`;

  const prompt = `You are an expert analyst for Gulfood 2026, the world's largest food & beverage trade show in Dubai (January 26-30, 2026).

Analyze this attendee profile and calculate their **EVENT ATTENDANCE RELEVANCE SCORE** (0-100):

${orgContext}

ATTENDEE PROFILE:
- Role at Event: ${role}
- Interest Categories: ${interestCategories.length > 0 ? interestCategories.join(', ') : 'Not specified'}
- Attendance Goals: ${attendanceIntents.length > 0 ? attendanceIntents.join(', ') : 'General exploration'}
- Preferred Exhibitors: ${preferredExhibitorIds && preferredExhibitorIds.length > 0 ? `${preferredExhibitorIds.length} specific exhibitors selected` : 'None specified'}

GULFOOD 2026 OVERVIEW:
- 5,000+ exhibitors from 120+ countries
- Focus: Food & Beverage (Dairy, Beverages, Meat, Plant-Based, Seafood, Bakery, Confectionery, Organic, Snacks, etc.)
- 100,000+ attendees from global F&B industry
- Networking, business matchmaking, product launches, industry trends
- MENA region's premier F&B event

SCORING RUBRIC - Be realistic and evidence-based:

**80-100% (Exceptional Fit)**
- Organization is DIRECTLY in food/beverage manufacturing, supply, distribution
- Role involves procurement, product development, or business development in F&B
- Clear strategic alignment with event's exhibitor base
- Multiple tangible business objectives (sourcing, partnerships, market expansion)
- Strong potential ROI with specific, measurable KPIs

**60-79% (Strong Fit)**
- Organization in F&B-adjacent industries (packaging, equipment, logistics, retail)
- Role involves F&B sector but not core business operations
- Several relevant interest categories align with exhibitors
- Good networking potential and learning opportunities
- Moderate ROI with general business benefits

**40-59% (Moderate Fit)**
- Organization has some F&B connections (hospitality, foodservice, tangential sectors)
- Role may benefit from F&B insights but limited direct application
- Some overlap with event content but not core focus
- Networking value exists but limited business opportunities
- ROI primarily educational/exploratory

**20-39% (Weak Fit)**
- Organization minimally related to F&B (tangential at best)
- Role has limited F&B relevance
- Attendance goals vague or misaligned with event focus
- Limited practical takeaways for their organization
- Low ROI, mostly generic networking

**0-19% (Poor Fit)**
- Organization NOT in F&B or related industries
- Role has no connection to F&B sector
- No clear reason to attend this specific event
- Minimal alignment with exhibitors or content
- Negligible ROI, better events exist for their needs

RESPONSE FORMAT (valid JSON only):
{
  "relevanceScore": <number 0-100>,
  "scoreJustification": "<3-4 sentences explaining the score with specific evidence from their profile and organization context. Mention specific alignment points (industry fit, role relevance, potential suppliers/partners at event, market opportunities in MENA region, etc.). Be candid about limitations if score is low.>",
  "keyTakeaways": [
    "<Specific KPI or benefit 1 with numbers if possible, e.g., 'Access to 500+ beverage suppliers for product diversification'>",
    "<Specific KPI or benefit 2, e.g., 'Networking with 1,000+ F&B decision-makers in MENA region'>",
    "<Specific KPI or benefit 3, e.g., 'Insights into halal and organic food trends for market expansion'>"
  ],
  "attendanceValue": "<1-2 sentence summary of overall value proposition. What is the #1 reason they should attend? What's in it for them?>",
  "confidenceScore": <number 0-100, how confident are you in this assessment based on available information>
}

Be REALISTIC. Don't inflate scores. If the organization isn't in F&B, say so and score accordingly.

CRITICAL JSON FORMATTING RULES:
- Return ONLY valid JSON object, no markdown, no explanations
- Use double quotes for all strings
- Escape any quotes inside strings with backslash
- Keep justification and attendanceValue concise (2-3 sentences max)
- Keep keyTakeaways brief (10-15 words each)
- No newlines in string values

Return format: {"relevanceScore": 65, "scoreJustification": "...", "keyTakeaways": ["...", "...", "..."], "attendanceValue": "...", "confidenceScore": 80}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 1500
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  try {
    const scoringData = parseAIJSON<RelevanceScoring>(content);
    
    // Validate the parsed structure
    if (!validateRelevanceScoring(scoringData)) {
      console.error('❌ AI returned invalid relevance scoring structure');
      console.error('Parsed data:', JSON.stringify(scoringData, null, 2).substring(0, 500));
      throw new Error('Invalid AI response structure - missing or malformed fields');
    }
    
    console.log(`✅ Successfully parsed and validated relevance score: ${scoringData.relevanceScore}%`);
    return scoringData;
  } catch (parseError) {
    console.error('❌ Failed to parse or validate relevance scoring:', (parseError as Error).message);
    console.error('Response preview:', content.substring(0, 500));
    
    // Return fallback values - ensures journey generation doesn't crash
    console.warn('⚠️  Returning fallback relevance scoring values');
    return {
      relevanceScore: 50,
      scoreJustification: `Unable to fully analyze your profile due to technical issues. As a ${role} at ${organization}, you may find relevant opportunities at Gulfood 2026. We recommend exploring the exhibitor list to identify potential matches.`,
      keyTakeaways: [
        'Access to 5,000+ food & beverage exhibitors from 120+ countries',
        'Networking opportunities with global F&B industry professionals',
        'Insights into latest food trends and innovations'
      ],
      attendanceValue: 'Gulfood 2026 offers broad exposure to the global F&B industry with opportunities for business connections and market insights.',
      confidenceScore: 30
    };
  }
}

/**
 * Calculate match scores for exhibitors based on user profile
 * More nuanced than simple keyword matching
 */
export async function calculateExhibitorMatchScores(params: {
  exhibitors: Exhibitor[];
  organization: string;
  role: string;
  interestCategories: string[];
  attendanceIntents: string[];
  preferredExhibitorIds?: number[];
  organizationEnrichment?: OrganizationEnrichment;
}): Promise<ExhibitorMatchScore[]> {
  if (!openai) {
    throw new Error('OpenAI client not initialized');
  }

  const {
    exhibitors,
    organization,
    role,
    interestCategories,
    attendanceIntents,
    preferredExhibitorIds = [],
    organizationEnrichment
  } = params;

  // Build organization context
  const orgContext = organizationEnrichment ? `
ATTENDEE ORGANIZATION:
- Name: ${organizationEnrichment.organizationName}
- Industry: ${organizationEnrichment.industry.join(', ')}
- Business Model: ${organizationEnrichment.businessModel || 'Not specified'}
- Products: ${organizationEnrichment.products?.join(', ') || 'Not specified'}
- Target Markets: ${organizationEnrichment.targetMarkets?.join(', ') || 'Not specified'}
` : `ATTENDEE ORGANIZATION: ${organization}`;

  // Build exhibitor list (limit to 30 for token efficiency and reliable parsing)
  const exhibitorsList = exhibitors.slice(0, 30).map((ex, idx) => {
    const isPreferred = preferredExhibitorIds.includes(ex.id);
    return `${idx + 1}. ${ex.name} (ID: ${ex.id})${isPreferred ? ' [USER PREFERRED]' : ''}
   Sector: ${ex.sector}
   Products: ${ex.products?.slice(0, 3).join(', ') || 'N/A'}
   Country: ${ex.country}
   Description: ${ex.description?.substring(0, 100)}...`;
  }).join('\n\n');

  const prompt = `You are an intelligent matchmaking system for Gulfood 2026.

${orgContext}

ATTENDEE PROFILE:
- Role: ${role}
- Interests: ${interestCategories.join(', ') || 'General'}
- Goals: ${attendanceIntents.join(', ') || 'Networking'}

TASK: Score each exhibitor's match with this attendee (0-100) based on:
1. **Industry Alignment** - Does exhibitor's sector match attendee's industry/interests?
2. **Product Relevance** - Do exhibitor's products solve attendee's needs or complement their business?
3. **Business Model Fit** - Are they potential suppliers, partners, customers, or competitors?
4. **Geographic Synergy** - Do their target markets or origins align?
5. **Strategic Value** - Could this connection drive real business outcomes?

SCORING GUIDELINES:
- **90-100%**: Perfect strategic fit - clear business case for meeting (preferred exhibitors, direct suppliers/partners)
- **75-89%**: Strong alignment - high potential value, multiple synergy points
- **60-74%**: Good fit - relevant but not critical, worth exploring
- **40-59%**: Moderate relevance - some potential but limited alignment
- **20-39%**: Weak fit - tangential connection at best
- **0-19%**: Poor fit - no meaningful alignment

EXHIBITORS TO SCORE:
${exhibitorsList}

Return a JSON array with this structure for EACH exhibitor:
[
  {
    "exhibitorId": <number>,
    "matchScore": <number 0-100>,
    "matchReasoning": "<1-2 sentences explaining the score>",
    "relevanceFactors": ["<factor 1>", "<factor 2>"]
  }
]

Be REALISTIC. Most exhibitors should score 40-70 unless there's exceptional alignment.
Preferred exhibitors should score 90-95% (user explicitly interested).

CRITICAL JSON FORMATTING RULES:
- Return ONLY valid JSON array, no markdown, no explanations
- Use double quotes for all strings
- Escape any quotes inside strings with backslash
- Keep matchReasoning short (1-2 sentences max)
- Keep relevanceFactors brief (3-5 words each)
- No newlines in string values

Return format: [{"exhibitorId": 1, "matchScore": 85, "matchReasoning": "...", "relevanceFactors": ["...", "..."]}]`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 4000
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  try {
    const matchScores = parseAIJSON<ExhibitorMatchScore[]>(content);
    
    // Validate the parsed structure
    if (!validateExhibitorMatchScores(matchScores)) {
      console.error('❌ AI returned invalid exhibitor match scores structure');
      console.error('Parsed data preview:', JSON.stringify(matchScores, null, 2).substring(0, 500));
      throw new Error('Invalid AI response structure - missing or malformed match score fields');
    }
    
    console.log(`✅ Successfully parsed and validated ${matchScores.length} exhibitor match scores`);
    return matchScores;
  } catch (parseError) {
    console.error('❌ Failed to parse or validate exhibitor match scores:', (parseError as Error).message);
    console.error('Response preview:', content.substring(0, 500));
    
    // Return empty array as fallback - the route will handle boosting preferred exhibitors
    console.warn('⚠️  Returning empty match scores - preferred exhibitors will be added by route');
    return [];
  }
}
