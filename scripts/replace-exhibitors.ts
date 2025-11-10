import { db } from '../server/db';
import { exhibitors } from '../shared/schema';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

interface SourceExhibitor {
  "Exhibitor Name": string;
  "Hall": string;
  "Stand": string;
  "Sectors": string;
  "Country": string;
  "Venue": string;
  "More Info": string;
}

interface TransformedExhibitor {
  name: string;
  sector: string;
  country: string;
  booth: string;
  description: string;
  venue: string;
  hall: string | null;
  stand: string | null;
  sectors: string[] | null;
  info: string | null;
}

// Zod schema for validation
const exhibitorSchema = z.object({
  name: z.string().min(1),
  sector: z.string().min(1),
  country: z.string().min(1),
  booth: z.string().min(1),
  description: z.string(),
  venue: z.string().min(1),
  hall: z.string().nullable(),
  stand: z.string().nullable(),
  sectors: z.array(z.string()).nullable(),
  info: z.string().nullable(),
});

function isNullValue(value: string | undefined | null): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  return trimmed === '' || trimmed === 'N/A' || trimmed === 'Not Available';
}

function parseSectors(sectorsStr: string): string[] | null {
  if (isNullValue(sectorsStr)) return null;
  
  // Split by comma and clean up
  const sectors = sectorsStr
    .split(',')
    .map(s => s.trim())
    .filter(s => s && s !== 'N/A' && s !== 'Not Available');
  
  return sectors.length > 0 ? sectors : null;
}

function deriveSectorFromSectors(sectors: string[] | null): string {
  if (sectors && sectors.length > 0) {
    return sectors[0];
  }
  return 'General';
}

function transformExhibitor(source: SourceExhibitor): TransformedExhibitor {
  const sectors = parseSectors(source.Sectors);
  const sector = deriveSectorFromSectors(sectors);
  const moreInfo = source["More Info"];
  
  // Map "More Info" to description, normalize placeholders to empty string
  const description = isNullValue(moreInfo) ? '' : moreInfo.trim();
  
  return {
    name: source["Exhibitor Name"].trim(),
    sector,
    country: source.Country.trim(),
    booth: source.Stand.trim() || 'TBD',
    description,
    venue: source.Venue.trim(),
    hall: isNullValue(source.Hall) ? null : source.Hall.trim(),
    stand: isNullValue(source.Stand) ? null : source.Stand.trim(),
    sectors,
    info: isNullValue(moreInfo) ? null : moreInfo.trim(),
  };
}

async function replaceExhibitors() {
  console.log('🚀 Starting exhibitor data replacement...');
  
  // Read JSON file
  const jsonPath = path.join(process.cwd(), 'attached_assets', 'exhibitors_data 2_1762757749348.json');
  console.log(`📖 Reading file: ${jsonPath}`);
  
  const fileContent = fs.readFileSync(jsonPath, 'utf-8');
  const sourceData: SourceExhibitor[] = JSON.parse(fileContent);
  
  console.log(`✅ Parsed ${sourceData.length} exhibitor records from JSON`);
  
  // Transform data
  console.log('🔄 Transforming exhibitor data...');
  const transformedData: TransformedExhibitor[] = sourceData.map(transformExhibitor);
  
  // Validate with Zod schema
  console.log('✅ Validating records with Zod schema...');
  const invalidRecords: { index: number; error: string }[] = [];
  
  transformedData.forEach((record, index) => {
    const result = exhibitorSchema.safeParse(record);
    if (!result.success) {
      invalidRecords.push({
        index,
        error: result.error.message,
      });
    }
  });
  
  if (invalidRecords.length > 0) {
    console.error(`❌ Found ${invalidRecords.length} invalid records:`);
    invalidRecords.slice(0, 5).forEach(({ index, error }) => {
      console.error(`  Record ${index}: ${error}`);
    });
    throw new Error(`${invalidRecords.length} records failed validation`);
  }
  
  console.log(`✅ All ${transformedData.length} records validated successfully`);
  
  // Execute database replacement in a transaction
  console.log('🗄️  Starting database transaction...');
  
  try {
    await db.transaction(async (tx) => {
      // Delete all existing exhibitors
      console.log('🗑️  Deleting all existing exhibitors...');
      await tx.delete(exhibitors);
      console.log('✅ Existing data cleared');
      
      // Insert in batches of 500
      const batchSize = 500;
      const totalBatches = Math.ceil(transformedData.length / batchSize);
      
      console.log(`📦 Inserting ${transformedData.length} records in ${totalBatches} batches...`);
      
      for (let i = 0; i < transformedData.length; i += batchSize) {
        const batch = transformedData.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        
        await tx.insert(exhibitors).values(batch);
        console.log(`✅ Batch ${batchNum}/${totalBatches} inserted (${batch.length} records)`);
      }
      
      console.log('✅ All records inserted successfully');
    });
    
    // Verify final count
    const finalCount = await db.select({ count: sql<number>`count(*)` }).from(exhibitors);
    const actualCount = Number(finalCount[0].count);
    
    console.log(`\n📊 Verification:`);
    console.log(`   Source records: ${sourceData.length}`);
    console.log(`   Database records: ${actualCount}`);
    
    if (actualCount === sourceData.length) {
      console.log(`✅ SUCCESS! All ${actualCount} exhibitors imported correctly`);
    } else {
      console.error(`❌ MISMATCH! Expected ${sourceData.length} but got ${actualCount}`);
      throw new Error('Record count mismatch after import');
    }
    
  } catch (error) {
    console.error('❌ Transaction failed:', error);
    throw error;
  }
}

// Execute
replaceExhibitors()
  .then(() => {
    console.log('\n🎉 Exhibitor data replacement completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error during exhibitor replacement:', error);
    process.exit(1);
  });
