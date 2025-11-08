import OpenAI from 'openai';
import type { OrganizationEnrichment } from './organizationEnrichment';
import type { Exhibitor } from '@shared/schema';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

/**
 * Robust JSON parsing with aggressive cleanup and brace-aware extraction
 * Handles common AI response issues like markdown, escaped quotes, newlines, nested structures
 */
function parseAIJSON<T>(content: string): T {
  // Remove markdown code blocks
  let cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  
  // Remove any leading/trailing whitespace
  cleaned = cleaned.trim();
  
  // Use brace-aware scanner to extract the first balanced JSON structure
  // This handles nested arrays and objects correctly
  const extracted = extractFirstJSONStructure(cleaned);
  if (extracted) {
    cleaned = extracted;
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
 * Extract the first balanced JSON structure (object or array) using character-by-character scanning
 * Handles nested structures, quotes, and escapes correctly
 */
function extractFirstJSONStructure(content: string): string | null {
  let depth = 0;
  let startIndex = -1;
  let inString = false;
  let escapeNext = false;
  let currentBracket: '{' | '[' | null = null;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    
    // Handle escape sequences
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    // Handle string boundaries
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    // Skip characters inside strings
    if (inString) {
      continue;
    }
    
    // Handle opening brackets
    if (char === '{' || char === '[') {
      if (depth === 0) {
        startIndex = i;
        currentBracket = char;
      }
      depth++;
    }
    
    // Handle closing brackets
    if (char === '}' || char === ']') {
      depth--;
      
      // Found the closing bracket for our top-level structure
      if (depth === 0 && startIndex !== -1) {
        return content.substring(startIndex, i + 1);
      }
    }
  }
  
  // No balanced structure found
  return null;
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
    max_tokens: 3000
  });

  const content = completion.choices[0]?.message?.content;
  const finishReason = completion.choices[0]?.finish_reason;
  
  // Check for truncation
  if (finishReason === 'length') {
    console.warn('⚠️  AI response was truncated due to max_tokens limit. Consider increasing max_tokens or simplifying prompt.');
    console.warn(`Response length: ${content?.length} characters`);
  }
  
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
 * Processes exhibitors in batches of 10 to avoid token limits
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

  // Process exhibitors in batches of 10 to avoid truncation
  const BATCH_SIZE = 10;
  const batches: Exhibitor[][] = [];
  
  for (let i = 0; i < exhibitors.length; i += BATCH_SIZE) {
    batches.push(exhibitors.slice(i, i + BATCH_SIZE));
  }
  
  console.log(`Processing ${exhibitors.length} exhibitors in ${batches.length} batch(es) of ${BATCH_SIZE}`);
  
  const allMatchScores: ExhibitorMatchScore[] = [];
  const failedBatches: number[] = [];
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} exhibitors)...`);
    
    try {
      const batchScores = await calculateExhibitorMatchScoresBatch({
        exhibitors: batch,
        organization,
        role,
        interestCategories,
        attendanceIntents,
        preferredExhibitorIds,
        organizationEnrichment
      });
      
      // Validate that we got scores for this batch
      if (batchScores.length === 0) {
        throw new Error(`Batch ${batchIndex + 1} returned 0 scores - this indicates a critical AI processing failure`);
      }
      
      allMatchScores.push(...batchScores);
      console.log(`✅ Batch ${batchIndex + 1} completed: ${batchScores.length} scores`);
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.error(`❌ Batch ${batchIndex + 1} failed: ${errorMessage}`);
      
      // Fail fast on all batch errors to prevent silent data loss
      // Journey generation will fall back to keyword matching in routes.ts
      throw new Error(`Exhibitor batch processing failed at batch ${batchIndex + 1}/${batches.length}: ${errorMessage}`);
    }
  }
  
  return allMatchScores;
}

/**
 * Calculate match scores for a single batch of exhibitors (max 10)
 * Internal function called by calculateExhibitorMatchScores
 */
async function calculateExhibitorMatchScoresBatch(params: {
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

  // Build exhibitor list (max 10 per batch for reliable parsing without truncation)
  const exhibitorsList = exhibitors.map((ex, idx) => {
    const isPreferred = preferredExhibitorIds.includes(ex.id);
    return `${idx + 1}. ${ex.name} (ID: ${ex.id})${isPreferred ? ' [USER PREFERRED]' : ''}
   Sector: ${ex.sector}
   Products: ${ex.products?.slice(0, 5).join(', ') || 'N/A'}
   Country: ${ex.country}
   Description: ${ex.description?.substring(0, 250)}...`;
  }).join('\n\n');

  const prompt = `You are an intelligent matchmaking system for Gulfood 2026 that finds both OBVIOUS matches and HIDDEN strategic opportunities.

${orgContext}

ATTENDEE PROFILE:
- Role: ${role}
- Interest Categories: ${interestCategories.length > 0 ? interestCategories.join(', ') : 'General (no specific sectors)'}
- Goals: ${attendanceIntents.join(', ') || 'Networking'}

═══════════════════════════════════════════════════════════════
STEP 1: SEMANTIC ANALYSIS - Understand the TRUE Business Need
═══════════════════════════════════════════════════════════════

Before scoring, analyze what this attendee REALLY needs by combining role + goals + interests:

EXAMPLE SEMANTIC INTERPRETATIONS:
- "Head of Procurement" + "Source suppliers" + "Bakery" = Needs B2B wholesale manufacturers/bulk ingredient suppliers
- "Product Manager" + "Discover innovations" + "Beverages" = Needs trend-forward brands with innovative products
- "Distributor" + "Expand portfolio" + "Dairy" = Needs manufacturers offering distribution rights
- "Restaurant Owner" + "Source products" + "Meat & Poultry" = Needs reliable food service suppliers with consistent quality
- "Retail Buyer" + "Find new products" + "Snacks" = Needs consumer brands with shelf-ready products

Your semantic interpretation of "${role}" + "${attendanceIntents.join(', ')}" + "${interestCategories.join(', ')}":
[Think: What business model do they need? B2B wholesale? Consumer brands? Ingredients? Equipment? Services?]

═══════════════════════════════════════════════════════════════
STEP 2: MULTI-DIMENSIONAL SCORING - Find Direct & Hidden Value
═══════════════════════════════════════════════════════════════

Score each exhibitor (0-100) across FIVE dimensions:

1️⃣ **SEMANTIC FIT (30 points)** - Does exhibitor's business model match the TRUE need?
   - Procurement role → Manufacturer/wholesaler = HIGH | Retail brand = MEDIUM | Service provider = LOW
   - Product Manager → Innovative brands = HIGH | Traditional suppliers = MEDIUM
   - Distributor → Manufacturers seeking distribution = HIGH | Direct-to-consumer brands = LOW
   - Restaurant owner → Food service suppliers = HIGH | Consumer packaged goods = MEDIUM

2️⃣ **CATEGORY RELEVANCE (20 points)** - Direct interest category match?
   - Exact sector match (Dairy interest + Dairy exhibitor) = 18-20 points
   - Adjacent category (Bakery interest + Ingredients exhibitor) = 10-15 points
   - Unrelated category = 0-5 points

3️⃣ **PRODUCT PORTFOLIO DEPTH (20 points)** - Specific products solve their needs?
   - Deep portfolio in target area with unique offerings = 18-20 points
   - Standard product range in target area = 10-15 points
   - Limited or generic offerings = 0-8 points

4️⃣ **HIDDEN STRATEGIC OPPORTUNITIES (20 points)** - Complementary/adjacent value?
   **CRITICAL: ALWAYS actively look for hidden opportunities beyond obvious category match!**
   
   EXAMPLES OF HIDDEN OPPORTUNITIES TO FIND:
   - Bakery buyer → Packaging suppliers, Flour/ingredient suppliers, Cold storage logistics
   - Dairy distributor → Refrigeration equipment, Packaging materials, Quality testing services
   - Beverage PM → Bottling equipment, Flavor ingredient suppliers, Sustainable packaging innovators
   - Restaurant owner → Food service equipment, Supply chain software, Waste management solutions
   
   SCORING:
   - Upstream supplier (ingredients for their production) = 15-20 points
   - Downstream partner (packaging, logistics, distribution) = 15-20 points
   - Complementary service (equipment, technology, consulting) = 10-15 points
   - Cross-sector innovation opportunity = 8-12 points
   - No hidden value = 0 points

5️⃣ **GEOGRAPHIC & MARKET ALIGNMENT (10 points)** - Markets/regions align?
   - Same target markets/regions = 8-10 points
   - Overlapping markets = 4-7 points
   - Different markets but MENA opportunity = 2-5 points
   - No alignment = 0 points

TOTAL SCORE = Sum of all five dimensions (max 100)

**MANDATORY REQUIREMENT**: For your TOP recommendations, actively identify and score hidden strategic opportunities.
Don't just default to direct category matches - think creatively about upstream/downstream/complementary value!

SCORING BANDS:
- **90-100**: Preferred exhibitors [USER PREFERRED] OR perfect semantic + category + portfolio fit
- **75-89**: Strong semantic fit + direct category match + deep product portfolio
- **60-74**: Good semantic fit + category match OR exceptional hidden opportunity despite different sector
- **40-59**: Moderate semantic fit OR strong hidden opportunity in adjacent/complementary area
- **20-39**: Weak semantic fit + limited strategic value OR only networking opportunity
- **0-19**: No alignment whatsoever - wrong business model, wrong sector, no opportunities

═══════════════════════════════════════════════════════════════
STEP 3: PERSONALIZED REASONING - Explain Direct & Hidden Value
═══════════════════════════════════════════════════════════════

EXHIBITORS TO SCORE:
${exhibitorsList}

Return a JSON array with this structure for EACH exhibitor:
[
  {
    "exhibitorId": <number>,
    "matchScore": <number 0-100, sum of five dimensions>,
    "matchReasoning": "<WHY THIS MATTERS TO YOU - explain direct match AND/OR hidden opportunity>",
    "relevanceFactors": ["<dimension 1>", "<dimension 2>", "<hidden opportunity if applicable>"]
  }
]

**PERSONALIZATION RULES - Write from Attendee's Perspective:**
✅ Use SECOND PERSON ("you", "your", "you'll") - NEVER third person
✅ Reference their role: "${role}"
✅ Connect to their goals: "${attendanceIntents.join(', ')}"
✅ Cite SPECIFIC products from exhibitor's Description/Products field
✅ Explain strategic value - WHY does this exhibitor matter for their business?
✅ **MANDATORY**: For scores 60+, if exhibitor has Hidden Opportunities score >10, MUST mention the hidden opportunity in matchReasoning

**EXPLAINING DIRECT MATCHES vs HIDDEN OPPORTUNITIES:**

**DIRECT MATCH** (High Semantic + Category Fit) - Use when Category Relevance = 18-20 points:
✅ "As a ${role} ${attendanceIntents[0] ? `aiming to ${attendanceIntents[0].toLowerCase()}` : 'attending Gulfood'}, their [specific products] directly match your ${interestCategories[0] || 'business'} needs, offering [specific business value like 'bulk wholesale pricing' or 'private label options']."

**HIDDEN OPPORTUNITY** (Complementary/Adjacent Value) - Use when Hidden Opportunities score = 10-20 points:
✅ "While not directly in ${interestCategories[0] || 'your sector'}, their [packaging/logistics/ingredient] expertise could optimize your [production/distribution/supply chain], creating strategic value for your ${attendanceIntents[0] || 'business goals'}."
✅ "As a ${role}, their [equipment/technology/service] solutions present an upstream/downstream opportunity to enhance your ${attendanceIntents[0] || 'operations'} in ${interestCategories.join(' and ')}."
✅ "Their position as [ingredient supplier/packaging partner/logistics provider] creates complementary value for your ${role} goals in ${interestCategories[0] || 'this sector'}."

**MIXED VALUE** (Both Direct + Hidden) - Use when both Category Relevance AND Hidden Opportunities are high:
✅ "Their [products] match your ${interestCategories[0]} needs, and their [complementary service/capability] adds strategic value to your [supply chain/operations]."

**CROSS-SECTOR INNOVATION** - Use when Category Relevance is low but Hidden Opportunities is 8+:
✅ "Though from a different sector, their innovative [technology/method/approach] could bring fresh value to your ${interestCategories[0] || 'business'} strategy as a ${role}."

**FORBIDDEN GENERIC PHRASES:**
❌ "World Food sector aligns" | ❌ "their offerings support your objectives" 
❌ "can help you discover" | ❌ "Dairy sector matches"
❌ "limited alignment" | ❌ "networking opportunity"

**REQUIRED SPECIFICITY:**
✅ Cite actual products: "their biscuits, cookies, confectionery" NOT "bakery products"
✅ Explain business value: "bulk wholesale pricing for procurement" NOT "aligns with goals"
✅ Identify strategic opportunity: "cold chain logistics expertise could optimize distribution" NOT "logistics services available"

**RELEVANCE FACTORS - Tag the Match Type:**
- Use descriptive tags like: "Direct category match", "B2B wholesale fit", "Innovative product portfolio", "Upstream supplier opportunity", "Packaging partner potential", "Geographic market alignment", "Distribution rights available", "Cross-sector innovation"

**SCORE DISTRIBUTION GUIDANCE:**
- 90-100 points: ~5-10% of exhibitors (exceptional fits + preferred)
- 75-89 points: ~15-20% of exhibitors (strong semantic + category match)
- 60-74 points: ~20-25% of exhibitors (good fits or strong hidden opportunities)
- 40-59 points: ~30-35% of exhibitors (moderate fits or interesting adjacent value)
- 20-39 points: ~20-25% of exhibitors (weak fits, limited value)
- 0-19 points: ~5-10% of exhibitors (no alignment)

Be REALISTIC and DIFFERENTIATED. Not everything is 80+. Hidden opportunities in adjacent sectors can score 60-75 if valuable.

CRITICAL JSON FORMATTING RULES:
- Return ONLY valid JSON array, no markdown, no explanations
- Use double quotes for all strings
- Escape any quotes inside strings with backslash
- Keep matchReasoning concise (1-2 sentences max)
- Keep relevanceFactors brief (3-5 words each, max 3 factors)
- No newlines in string values

Return format: [{"exhibitorId": 1, "matchScore": 85, "matchReasoning": "As a Head of Procurement sourcing suppliers, their biscuits and confectionery products directly match your Bakery needs with bulk wholesale capabilities.", "relevanceFactors": ["Direct category match", "B2B wholesale fit", "Deep product portfolio"]}]`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 4000
  });

  const content = completion.choices[0]?.message?.content;
  const finishReason = completion.choices[0]?.finish_reason;
  
  // Check for truncation
  if (finishReason === 'length') {
    console.warn('⚠️  AI response was truncated due to max_tokens limit in batch processing.');
    console.warn(`Batch size: ${exhibitors.length} exhibitors, Response length: ${content?.length} characters`);
    throw new Error('Batch response truncated - reduce batch size or increase max_tokens');
  }
  
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
