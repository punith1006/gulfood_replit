import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface UserProfile {
  organization: string;
  role: string;
  interestCategories: string[];
  attendanceIntents: string[];
}

export interface ExhibitorData {
  id: number;
  name: string;
  companyName?: string;
  sector?: string;
  country?: string;
  description?: string;
  productCategories?: string[];
  boothNumber?: string;
}

export interface SessionData {
  id: number;
  title: string;
  description?: string | null;
  location?: string | null;
  sessionDate?: string | Date;
  targetAudience?: string;
}

export interface MatchResult {
  id: number;
  relevancePercentage: number;
  data: any;
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

function buildUserProfileText(profile: UserProfile): string {
  const parts = [];
  
  parts.push(`I am a ${profile.role} at ${profile.organization}.`);
  
  if (profile.interestCategories.length > 0) {
    parts.push(`I'm interested in ${profile.interestCategories.join(', ')}.`);
  }
  
  if (profile.attendanceIntents.length > 0) {
    parts.push(`I want to ${profile.attendanceIntents.join(', ')} at Gulfood 2026.`);
  }
  
  return parts.join(' ');
}

function buildExhibitorText(exhibitor: ExhibitorData): string {
  const parts = [];
  
  const name = exhibitor.companyName || exhibitor.name;
  parts.push(`${name}`);
  
  if (exhibitor.sector) {
    parts.push(`is a ${exhibitor.sector} company`);
  }
  
  if (exhibitor.country) {
    parts.push(`from ${exhibitor.country}`);
  }
  
  if (exhibitor.description) {
    parts.push(`They offer: ${exhibitor.description}`);
  }
  
  if (exhibitor.productCategories && exhibitor.productCategories.length > 0) {
    parts.push(`Product categories: ${exhibitor.productCategories.join(', ')}`);
  }
  
  return parts.join('. ').replace(/\.\./g, '.');
}

function buildSessionText(session: SessionData): string {
  const parts = [];
  
  parts.push(session.title);
  
  if (session.description) {
    parts.push(session.description);
  }
  
  if (session.targetAudience) {
    parts.push(`Target audience: ${session.targetAudience}`);
  }
  
  if (session.location) {
    parts.push(`Location: ${session.location}`);
  }
  
  return parts.join('. ').replace(/\.\./g, '.');
}

async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
    });
    
    return response.data.map(item => item.embedding);
  } catch (error) {
    console.error('Error generating batch embeddings:', error);
    throw error;
  }
}

function transformSimilarityToRelevance(similarity: number): number {
  const clampedSimilarity = Math.max(0, Math.min(1, similarity));
  
  const transformed = Math.pow(clampedSimilarity, 1.8);
  
  const scaled = transformed * 100;
  
  return Math.round(Math.max(0, Math.min(100, scaled)));
}

export async function matchExhibitorsSemantic(
  userProfile: UserProfile,
  exhibitors: ExhibitorData[],
  topK: number = 5
): Promise<MatchResult[]> {
  const userText = buildUserProfileText(userProfile);
  console.log('User profile text:', userText);
  
  const userEmbedding = await generateEmbedding(userText);
  
  const exhibitorTexts = exhibitors.map(buildExhibitorText);
  
  const batchSize = 100;
  const allExhibitorEmbeddings: number[][] = [];
  
  for (let i = 0; i < exhibitorTexts.length; i += batchSize) {
    const batch = exhibitorTexts.slice(i, i + batchSize);
    const batchEmbeddings = await generateBatchEmbeddings(batch);
    allExhibitorEmbeddings.push(...batchEmbeddings);
  }
  
  const rawSimilarities = exhibitors.map((exhibitor, index) => ({
    exhibitor,
    similarity: cosineSimilarity(userEmbedding, allExhibitorEmbeddings[index])
  }));
  
  rawSimilarities.sort((a, b) => b.similarity - a.similarity);
  console.log('\nTop 10 raw similarities before transformation:');
  rawSimilarities.slice(0, 10).forEach((item, i) => {
    const relevance = transformSimilarityToRelevance(item.similarity);
    console.log(`${i + 1}. ${item.exhibitor.companyName || item.exhibitor.name}: ${(item.similarity * 100).toFixed(2)}% raw → ${relevance}% transformed`);
  });
  
  const matches = exhibitors.map((exhibitor, index) => {
    const similarity = cosineSimilarity(userEmbedding, allExhibitorEmbeddings[index]);
    const relevancePercentage = transformSimilarityToRelevance(similarity);
    
    return {
      id: exhibitor.id,
      relevancePercentage,
      data: {
        id: exhibitor.id,
        companyName: exhibitor.companyName || exhibitor.name,
        name: exhibitor.name,
        sector: exhibitor.sector,
        description: exhibitor.description,
        country: exhibitor.country,
        boothNumber: exhibitor.boothNumber,
        productCategories: exhibitor.productCategories,
        relevancePercentage
      }
    };
  });
  
  matches.sort((a, b) => b.relevancePercentage - a.relevancePercentage);
  
  const uniqueMatches = new Map<string, MatchResult>();
  const seenCompanyNames = new Set<string>();
  
  for (const match of matches) {
    const companyName = (match.data.companyName || match.data.name || '').toLowerCase().trim();
    
    if (!seenCompanyNames.has(companyName) && companyName) {
      seenCompanyNames.add(companyName);
      uniqueMatches.set(companyName, match);
    }
    
    if (uniqueMatches.size >= topK) {
      break;
    }
  }
  
  return Array.from(uniqueMatches.values());
}

export async function matchSessionsSemantic(
  userProfile: UserProfile,
  sessions: SessionData[],
  topK: number = 5
): Promise<MatchResult[]> {
  if (sessions.length === 0) {
    return [];
  }
  
  const userText = buildUserProfileText(userProfile);
  const userEmbedding = await generateEmbedding(userText);
  
  const sessionTexts = sessions.map(buildSessionText);
  const sessionEmbeddings = await generateBatchEmbeddings(sessionTexts);
  
  const matches = sessions.map((session, index) => {
    const similarity = cosineSimilarity(userEmbedding, sessionEmbeddings[index]);
    const relevancePercentage = Math.round(Math.max(0, Math.min(100, similarity * 100)));
    
    return {
      id: session.id,
      relevancePercentage,
      data: {
        id: session.id,
        title: session.title,
        description: session.description,
        sessionDate: session.sessionDate,
        location: session.location,
        targetAudience: session.targetAudience,
        matchScore: relevancePercentage
      }
    };
  });
  
  matches.sort((a, b) => b.relevancePercentage - a.relevancePercentage);
  
  const uniqueMatches = new Map<number, MatchResult>();
  for (const match of matches) {
    if (!uniqueMatches.has(match.id)) {
      uniqueMatches.set(match.id, match);
    }
    if (uniqueMatches.size >= topK) {
      break;
    }
  }
  
  return Array.from(uniqueMatches.values());
}

export function calculateOverallRelevanceScore(
  exhibitorMatches: MatchResult[],
  sessionMatches: MatchResult[]
): number {
  if (exhibitorMatches.length === 0 && sessionMatches.length === 0) {
    return 0;
  }
  
  const exhibitorWeight = 0.6;
  const sessionWeight = 0.4;
  
  let exhibitorScore = 0;
  if (exhibitorMatches.length > 0) {
    const sum = exhibitorMatches.reduce((acc, match) => acc + match.relevancePercentage, 0);
    exhibitorScore = sum / exhibitorMatches.length;
  }
  
  let sessionScore = 0;
  if (sessionMatches.length > 0) {
    const sum = sessionMatches.reduce((acc, match) => acc + match.relevancePercentage, 0);
    sessionScore = sum / sessionMatches.length;
  }
  
  const overallScore = (exhibitorScore * exhibitorWeight) + (sessionScore * sessionWeight);
  
  return Math.round(overallScore);
}
