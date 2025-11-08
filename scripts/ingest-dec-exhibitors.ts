import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from '../server/db';
import { exhibitors } from '../shared/schema';
import { eq, or, sql, like } from 'drizzle-orm';

interface ParsedExhibitor {
  name: string;
  hall: string;
  stand?: string;
  country: string;
  venue?: string;
  logoUrl?: string;
  exhibitorUrl?: string;
}

const INPUT_FILE = join(process.cwd(), 'data', 'dec-exhibitors-clean.json');

// Normalize name for fuzzy matching
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,\-&()]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b(ltd|llc|inc|corp|co|pvt|pte|srl|sa|gmbh|ag)\b/g, '')
    .trim();
}

// Calculate similarity score between two strings (0-1)
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  // Simple character-level similarity
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  
  return matches / longer.length;
}

async function findMatchingExhibitor(parsed: ParsedExhibitor) {
  // Try exact name match first
  let existing = await db.query.exhibitors.findFirst({
    where: eq(exhibitors.name, parsed.name)
  });
  
  if (existing) {
    return { exhibitor: existing, matchType: 'exact_name' as const };
  }
  
  // Try normalized name match
  const normalizedParsedName = normalizeName(parsed.name);
  const allExhibitors = await db.query.exhibitors.findMany();
  
  for (const ex of allExhibitors) {
    const normalizedExName = normalizeName(ex.name);
    
    // Check if normalized names are very similar
    if (normalizedExName === normalizedParsedName) {
      return { exhibitor: ex, matchType: 'normalized_name' as const };
    }
    
    // Check fuzzy match with same country
    if (ex.country === parsed.country) {
      const similarity = calculateSimilarity(normalizedExName, normalizedParsedName);
      if (similarity > 0.8) {
        return { exhibitor: ex, matchType: 'fuzzy_name_country' as const };
      }
    }
  }
  
  return null;
}

async function ingestExhibitors() {
  console.log('🚀 Starting DEC exhibitor ingestion...\n');
  
  // Load parsed exhibitors
  console.log(`📖 Reading parsed data from: ${INPUT_FILE}`);
  const parsedExhibitors: ParsedExhibitor[] = JSON.parse(readFileSync(INPUT_FILE, 'utf-8'));
  console.log(`✅ Loaded ${parsedExhibitors.length} parsed exhibitors\n`);
  
  let updatedCount = 0;
  let addedCount = 0;
  let skippedCount = 0;
  
  for (const parsed of parsedExhibitors) {
    // Ensure venue is set to DEC for all exhibitors
    if (!parsed.venue) {
      parsed.venue = 'Dubai Exhibition Centre';
    }
    
    console.log(`\n📋 Processing: ${parsed.name} (${parsed.country})`);
    console.log(`   Hall: ${parsed.hall}, Stand: ${parsed.stand || 'N/A'}`);
    
    // Try to find matching exhibitor
    const match = await findMatchingExhibitor(parsed);
    
    if (match) {
      console.log(`   ✅ Found match: ${match.exhibitor.name} (${match.matchType})`);
      console.log(`   📝 Updating venue info...`);
      
      // Update existing exhibitor with DEC venue info
      await db.update(exhibitors)
        .set({
          venue: parsed.venue,
          hall: parsed.hall,
          stand: parsed.stand || match.exhibitor.stand,
          booth: parsed.stand || match.exhibitor.booth,
          logoUrl: parsed.logoUrl || match.exhibitor.logoUrl,
          website: parsed.exhibitorUrl || match.exhibitor.website
        })
        .where(eq(exhibitors.id, match.exhibitor.id));
      
      updatedCount++;
      console.log(`   ✅ Updated!`);
    } else {
      // No match found - add as new exhibitor
      console.log(`   ℹ️  No match found - adding as new exhibitor`);
      
      await db.insert(exhibitors).values({
        name: parsed.name,
        sector: 'World Food', // Default sector for DEC exhibitors
        country: parsed.country,
        venue: parsed.venue,
        hall: parsed.hall,
        stand: parsed.stand,
        booth: parsed.stand || 'TBD',
        description: `Exhibitor at ${parsed.venue}, ${parsed.hall}`,
        logoUrl: parsed.logoUrl,
        website: parsed.exhibitorUrl
      });
      
      addedCount++;
      console.log(`   ✅ Added!`);
    }
  }
  
  console.log(`\n\n✅ Ingestion complete!`);
  console.log(`📊 Summary:`);
  console.log(`   - Updated existing: ${updatedCount}`);
  console.log(`   - Added new: ${addedCount}`);
  console.log(`   - Skipped: ${skippedCount}`);
  console.log(`   - Total processed: ${parsedExhibitors.length}`);
}

ingestExhibitors()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
