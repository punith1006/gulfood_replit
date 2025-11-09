import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

/**
 * Robust JSON parsing with aggressive cleanup and brace-aware extraction
 * Handles common AI response issues like markdown, escaped quotes, newlines, nested structures
 */
function parseAIJSON<T>(content: string): T {
  let cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  cleaned = cleaned.trim();
  
  const extracted = extractFirstJSONStructure(cleaned);
  if (extracted) {
    cleaned = extracted;
  }
  
  try {
    return JSON.parse(cleaned);
  } catch (firstError) {
    try {
      cleaned = cleaned
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/\n/g, ' ')
        .replace(/\r/g, '');
      
      return JSON.parse(cleaned);
    } catch (secondError) {
      console.error('Failed to parse AI JSON after cleanup:', cleaned.substring(0, 500));
      throw new Error(`JSON parsing failed: ${(secondError as Error).message}`);
    }
  }
}

/**
 * Extract the first balanced JSON structure (object or array) using character-by-character scanning
 */
function extractFirstJSONStructure(content: string): string | null {
  let depth = 0;
  let startIndex = -1;
  let inString = false;
  let escapeNext = false;
  let currentBracket: '{' | '[' | null = null;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (inString) {
      continue;
    }
    
    if (char === '{' || char === '[') {
      if (depth === 0) {
        startIndex = i;
        currentBracket = char;
      }
      depth++;
    }
    
    if (char === '}' || char === ']') {
      depth--;
      
      if (depth === 0 && startIndex !== -1) {
        return content.substring(startIndex, i + 1);
      }
    }
  }
  
  return null;
}

/**
 * Validate CompanyResearchData structure
 */
function validateCompanyResearchData(data: any): data is CompanyResearchData {
  if (!data || typeof data !== 'object') {
    console.error('Validation failed: data is not an object');
    return false;
  }
  
  if (!Array.isArray(data.industry)) {
    console.error('Validation failed: industry is not an array');
    return false;
  }
  
  if (!Array.isArray(data.products)) {
    console.error('Validation failed: products is not an array');
    return false;
  }
  
  if (!Array.isArray(data.recentNews)) {
    console.error('Validation failed: recentNews is not an array');
    return false;
  }
  
  if (typeof data.companySize !== 'string') {
    console.error('Validation failed: companySize is not a string');
    return false;
  }
  
  if (typeof data.businessModel !== 'string') {
    console.error('Validation failed: businessModel is not a string');
    return false;
  }
  
  if (!Array.isArray(data.targetMarkets)) {
    console.error('Validation failed: targetMarkets is not an array');
    return false;
  }
  
  if (typeof data.marketPresence !== 'string') {
    console.error('Validation failed: marketPresence is not a string');
    return false;
  }
  
  if (typeof data.sustainability !== 'string') {
    console.error('Validation failed: sustainability is not a string');
    return false;
  }
  
  if (typeof data.confidenceScore !== 'number' || isNaN(data.confidenceScore)) {
    console.error('Validation failed: confidenceScore is not a valid number');
    return false;
  }
  
  if (data.confidenceScore < 0 || data.confidenceScore > 100) {
    console.error(`Validation failed: confidenceScore ${data.confidenceScore} is out of range (0-100)`);
    return false;
  }
  
  if (typeof data.dataSource !== 'string') {
    console.error('Validation failed: dataSource is not a string');
    return false;
  }
  
  if (typeof data.searchSummary !== 'string') {
    console.error('Validation failed: searchSummary is not a string');
    return false;
  }
  
  return true;
}

export interface CompanyResearchData {
  industry: string[];
  products: string[];
  recentNews: string[];
  companySize: string;
  businessModel: string;
  targetMarkets: string[];
  marketPresence: string;
  sustainability: string;
  confidenceScore: number;
  dataSource: string;
  searchSummary: string;
}

/**
 * Research a company to gather comprehensive information for exhibitor assessment
 * 
 * NOTE: This implementation uses OpenAI to synthesize company information based on
 * its training data. In a production environment, this would integrate with a 
 * real-time web search API to gather current information about companies.
 * 
 * @param companyName - Name of the company to research
 * @param websiteUrl - Company website URL (if available)
 * @param country - Company's country of operation
 * @param primaryGoals - User's primary goals/interests (for context)
 * @returns Promise<CompanyResearchData> - Structured company research data
 */
export async function researchCompany(
  companyName: string,
  websiteUrl: string,
  country: string,
  primaryGoals: string[]
): Promise<CompanyResearchData> {
  if (!openai) {
    console.error('OpenAI client not initialized');
    return createFallbackResponse(companyName, country);
  }

  console.log(`🔍 Researching company: ${companyName} (${country})`);

  try {
    const prompt = `You are a research analyst gathering intelligence about companies for Gulfood 2026, the world's largest food & beverage trade show in Dubai.

Research this company and provide comprehensive, factual information:

COMPANY TO RESEARCH:
- Name: ${companyName}
- Country: ${country}
${websiteUrl ? `- Website: ${websiteUrl}` : ''}
- Context: User is interested in ${primaryGoals.length > 0 ? primaryGoals.join(', ') : 'food & beverage industry'}

RESEARCH OBJECTIVES:
Gather detailed information about this company's relevance to the food & beverage industry and Gulfood 2026. Focus on:

1. **Industry/Sector** (array of strings)
   - Primary and secondary industry sectors
   - Specific F&B segments (dairy, beverages, meat, bakery, etc.)
   - Related industries if not directly in F&B

2. **Products/Services** (array of strings)
   - Main products or services offered
   - Product categories and specific items
   - Manufacturing capabilities or service offerings

3. **Recent News** (array of strings, last 12 months)
   - Recent business developments
   - Product launches or expansions
   - Partnerships or acquisitions
   - Awards or certifications
   - If no recent news available from your knowledge, indicate "No recent news available"

4. **Company Size**
   - Categorize as: "small" (<50 employees), "medium" (50-250), "large" (250-1000), "enterprise" (>1000)
   - If unknown, indicate "unknown"

5. **Business Model**
   - E.g., "manufacturer", "distributor", "retailer", "service provider", "B2B wholesaler", "importer/exporter"
   - Can combine multiple (e.g., "manufacturer and distributor")

6. **Target Markets** (array of strings)
   - Geographic markets they serve
   - Customer segments (B2B, B2C, foodservice, retail, etc.)

7. **Market Presence**
   - Categorize as: "local", "regional", "national", "international", "global"
   - Include specific regions if relevant

8. **Sustainability Initiatives**
   - Environmental programs, certifications (organic, halal, kosher, etc.)
   - Sustainability commitments or practices
   - If none known, indicate "No sustainability information available"

9. **Confidence Score** (0-100)
   - Rate your confidence in this research based on:
     * Information availability in your training data
     * Recency of information
     * Specificity and detail level
   - Be conservative: 80-100 = very confident with recent data, 60-79 = good data but may not be current, 40-59 = limited information, 20-39 = minimal information, 0-19 = very little reliable data

10. **Search Summary**
    - 2-3 sentence summary of what you found about this company
    - Highlight F&B industry relevance
    - Note any information gaps

CRITICAL INSTRUCTIONS:
- Be FACTUAL and CONSERVATIVE. Do not invent or exaggerate information.
- If you don't have information about a specific field, use "unknown" for strings or empty arrays []
- Recent news must be from the last 12 months based on your knowledge cutoff
- Assign lower confidence scores if information is sparse or outdated
- Focus on F&B industry relevance
- Do NOT make assumptions - indicate uncertainty clearly

RESPONSE FORMAT (valid JSON only):
{
  "industry": ["Industry 1", "Industry 2"],
  "products": ["Product/Service 1", "Product/Service 2"],
  "recentNews": ["News item 1", "News item 2"] or [],
  "companySize": "small/medium/large/enterprise/unknown",
  "businessModel": "manufacturer/distributor/etc.",
  "targetMarkets": ["Market 1", "Market 2"],
  "marketPresence": "local/regional/national/international/global/unknown",
  "sustainability": "Description of initiatives or 'No sustainability information available'",
  "confidenceScore": 0-100,
  "dataSource": "web_search",
  "searchSummary": "2-3 sentence summary highlighting F&B relevance and information quality"
}

CRITICAL JSON FORMATTING:
- Return ONLY valid JSON, no markdown, no explanations
- Use double quotes for all strings
- Escape quotes inside strings with backslash
- Arrays can be empty [] but not null
- Strings cannot be null - use "unknown" for missing data
- Keep summaries concise (under 200 characters)`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 2000
    });

    const content = completion.choices[0]?.message?.content;
    const finishReason = completion.choices[0]?.finish_reason;

    if (finishReason === 'length') {
      console.warn('⚠️  AI response was truncated due to max_tokens limit');
    }

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    try {
      const researchData = parseAIJSON<CompanyResearchData>(content);

      if (!validateCompanyResearchData(researchData)) {
        console.error('❌ AI returned invalid company research structure');
        throw new Error('Invalid AI response structure');
      }

      console.log(`✅ Successfully researched ${companyName}: confidence ${researchData.confidenceScore}%`);
      return researchData;

    } catch (parseError) {
      console.error('❌ Failed to parse or validate company research:', (parseError as Error).message);
      console.error('Response preview:', content.substring(0, 500));
      return createFallbackResponse(companyName, country);
    }

  } catch (error) {
    console.error('❌ Company research failed:', (error as Error).message);
    return createFallbackResponse(companyName, country);
  }
}

/**
 * Create fallback response when research fails
 */
function createFallbackResponse(companyName: string, country: string): CompanyResearchData {
  console.warn('⚠️  Returning fallback company research data');
  return {
    industry: ['Unknown'],
    products: [],
    recentNews: [],
    companySize: 'unknown',
    businessModel: 'unknown',
    targetMarkets: [country],
    marketPresence: 'unknown',
    sustainability: 'No sustainability information available',
    confidenceScore: 15,
    dataSource: 'web_search',
    searchSummary: `Limited information available for ${companyName} from ${country}. Research could not be completed due to technical issues. Manual verification recommended.`
  };
}
