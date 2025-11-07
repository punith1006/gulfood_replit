import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

// In-memory cache for organization enrichment data
// Key: lowercase organization name
// Value: enrichment data with timestamp
const enrichmentCache = new Map<string, {
  data: OrganizationEnrichment;
  timestamp: number;
}>();

// Cache TTL: 7 days in milliseconds
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

export interface OrganizationEnrichment {
  organizationName: string;
  industry: string[];
  companySize?: string;
  products?: string[];
  recentNews?: string[];
  marketPresence?: string;
  businessModel?: string;
  targetMarkets?: string[];
  sustainability?: string;
  searchSummary: string;
  confidenceScore: number; // 0-100, how confident we are in this data
  lastUpdated: string;
}

/**
 * Enrich organization data using web search and AI analysis
 * @param organizationName - The name of the organization to enrich
 * @param useCache - Whether to use cached data if available (default: true)
 * @returns Enriched organization data
 */
export async function enrichOrganization(
  organizationName: string,
  useCache: boolean = true
): Promise<OrganizationEnrichment> {
  const cacheKey = organizationName.toLowerCase().trim();
  
  // Check cache first
  if (useCache) {
    const cached = enrichmentCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log(`✅ Using cached enrichment data for: ${organizationName}`);
      return cached.data;
    }
  }

  console.log(`🔍 Enriching organization: ${organizationName}`);
  
  try {
    // Note: web_search is only available to the agent, not in runtime code
    // So we'll use OpenAI to synthesize information about the organization
    // In a production system, you'd integrate with a real-time web search API
    
    const enrichmentData = await synthesizeOrganizationData(organizationName);
    
    // Cache the result
    enrichmentCache.set(cacheKey, {
      data: enrichmentData,
      timestamp: Date.now()
    });
    
    console.log(`✅ Successfully enriched organization: ${organizationName}`);
    return enrichmentData;
    
  } catch (error) {
    console.error(`❌ Failed to enrich organization ${organizationName}:`, error);
    
    // Return minimal fallback data
    return {
      organizationName,
      industry: ['Unknown'],
      searchSummary: `Limited information available for ${organizationName}. Analysis will be based on user-provided context.`,
      confidenceScore: 20,
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Synthesize organization data using OpenAI's knowledge
 * In production, this would be replaced with actual web search + AI synthesis
 */
async function synthesizeOrganizationData(
  organizationName: string
): Promise<OrganizationEnrichment> {
  if (!openai) {
    throw new Error('OpenAI client not initialized');
  }

  const prompt = `Analyze the following organization: "${organizationName}"

Provide comprehensive information about this organization that would be relevant for assessing their fit with Gulfood 2026 (the world's largest food & beverage trade show in Dubai).

Focus on:
1. Industry sectors they operate in (be specific)
2. Company size/scale (if publicly known)
3. Main products or services
4. Recent business developments or news (if known from your training data)
5. Market presence (geographic regions, market position)
6. Business model (B2B, B2C, manufacturer, distributor, etc.)
7. Target markets or customer segments
8. Sustainability initiatives (if relevant)

Return a JSON object with this structure:
{
  "organizationName": "Confirmed organization name",
  "industry": ["Industry 1", "Industry 2"],
  "companySize": "Small/Medium/Large/Enterprise or unknown",
  "products": ["Product/Service 1", "Product/Service 2"],
  "recentNews": ["Recent development 1", "Recent development 2"],
  "marketPresence": "Geographic regions and market position",
  "businessModel": "B2B/B2C/Hybrid, role in supply chain",
  "targetMarkets": ["Market segment 1", "Market segment 2"],
  "sustainability": "Sustainability practices or initiatives if relevant",
  "searchSummary": "2-3 sentence summary of the organization",
  "confidenceScore": 0-100 (how confident you are in this information)
}

If you don't have information about this organization, return lower confidence (20-40) and indicate "unknown" for uncertain fields.

Return ONLY valid JSON, no markdown formatting.`;

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

  // Parse JSON response
  const cleanedContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  const enrichmentData = JSON.parse(cleanedContent);
  
  // Add timestamp
  enrichmentData.lastUpdated = new Date().toISOString();
  
  return enrichmentData as OrganizationEnrichment;
}

/**
 * Clear cached enrichment data for an organization
 * Useful when you want to force a refresh
 */
export function clearOrganizationCache(organizationName?: string): void {
  if (organizationName) {
    const cacheKey = organizationName.toLowerCase().trim();
    enrichmentCache.delete(cacheKey);
    console.log(`🗑️  Cleared cache for: ${organizationName}`);
  } else {
    enrichmentCache.clear();
    console.log('🗑️  Cleared all organization enrichment cache');
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number;
  entries: string[];
} {
  return {
    size: enrichmentCache.size,
    entries: Array.from(enrichmentCache.keys())
  };
}
