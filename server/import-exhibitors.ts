import { db } from './db';
import { exhibitors } from '@shared/schema';
import { readFileSync } from 'fs';
import { join } from 'path';
import { eq } from 'drizzle-orm';

interface JSONExhibitor {
  eid: string;
  company_name: string;
  sectors: string;
  country: string;
  hall: string;
  stand: string;
  info: string;
}

function extractDescription(info: string): string {
  if (!info || info.trim() === '') {
    return 'No description available.';
  }

  const companyOverviewMatch = info.match(/##\s*Company\s+Overview\s*\n([\s\S]*?)(?=\n##|\n\n#|$)/i);
  
  if (!companyOverviewMatch) {
    const firstParagraph = info
      .replace(/^#.*$/gm, '')
      .trim()
      .split('\n\n')[0];
    
    if (firstParagraph && firstParagraph.length > 20) {
      return firstParagraph
        .replace(/^-\s*/gm, '')
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 500);
    }
    
    return 'No description available.';
  }

  const overviewContent = companyOverviewMatch[1];
  const lines = overviewContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'));

  const sentences: string[] = [];
  
  for (const line of lines) {
    const cleanLine = line
      .replace(/^-\s*/, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .trim();
    
    if (cleanLine.length > 20) {
      const colonIndex = cleanLine.indexOf(':');
      if (colonIndex > 0 && colonIndex < 50) {
        const content = cleanLine.substring(colonIndex + 1).trim();
        if (content.length > 10) {
          sentences.push(content);
        }
      } else {
        sentences.push(cleanLine);
      }
    }
    
    if (sentences.length >= 3) break;
  }

  if (sentences.length === 0) {
    return 'No description available.';
  }

  const description = sentences
    .slice(0, 3)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return description.length > 500 ? description.slice(0, 497) + '...' : description;
}

async function importExhibitors() {
  console.log('🚀 Starting exhibitor import process...\n');

  try {
    const filePath = join(process.cwd(), 'attached_assets', 'exhibition.gulf_food_1762511163985.json');
    console.log(`📁 Reading file: ${filePath}`);
    
    const fileContent = readFileSync(filePath, 'utf-8');
    const exhibitorData: JSONExhibitor[] = JSON.parse(fileContent);
    
    console.log(`📊 Found ${exhibitorData.length} exhibitors to import\n`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const errors: Array<{ eid: string; name: string; error: string }> = [];

    for (let i = 0; i < exhibitorData.length; i++) {
      const exhibitor = exhibitorData[i];
      
      try {
        if (!exhibitor.eid || !exhibitor.company_name || !exhibitor.country) {
          console.warn(`⚠️  Skipping exhibitor at index ${i}: Missing required fields`);
          skippedCount++;
          continue;
        }

        const description = extractDescription(exhibitor.info || '');

        const exhibitorRecord = {
          eid: exhibitor.eid,
          name: exhibitor.company_name,
          sector: exhibitor.sectors || 'General',
          sectors: exhibitor.sectors ? [exhibitor.sectors] : ['General'],
          country: exhibitor.country,
          booth: exhibitor.stand || 'TBA',
          stand: exhibitor.stand || null,
          venue: 'Dubai World Trade Centre',
          hall: exhibitor.hall || null,
          description: description,
          info: exhibitor.info || null,
        };

        await db
          .insert(exhibitors)
          .values(exhibitorRecord)
          .onConflictDoUpdate({
            target: exhibitors.eid,
            set: {
              name: exhibitorRecord.name,
              sector: exhibitorRecord.sector,
              sectors: exhibitorRecord.sectors,
              country: exhibitorRecord.country,
              booth: exhibitorRecord.booth,
              stand: exhibitorRecord.stand,
              hall: exhibitorRecord.hall,
              description: exhibitorRecord.description,
              info: exhibitorRecord.info,
            }
          });

        successCount++;

        if ((i + 1) % 100 === 0) {
          console.log(`✅ Progress: ${i + 1}/${exhibitorData.length} exhibitors processed (${successCount} successful, ${errorCount} errors, ${skippedCount} skipped)`);
        }

      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({
          eid: exhibitor.eid || 'unknown',
          name: exhibitor.company_name || 'unknown',
          error: errorMessage
        });
        
        console.error(`❌ Error importing exhibitor ${exhibitor.company_name} (${exhibitor.eid}):`, errorMessage);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully imported: ${successCount} exhibitors`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`⚠️  Skipped: ${skippedCount}`);
    console.log(`📈 Total processed: ${exhibitorData.length}`);
    console.log('='.repeat(60));

    if (errors.length > 0 && errors.length <= 10) {
      console.log('\n❌ Error details:');
      errors.forEach(err => {
        console.log(`  - ${err.name} (${err.eid}): ${err.error}`);
      });
    } else if (errors.length > 10) {
      console.log(`\n❌ ${errors.length} errors occurred. First 10:`);
      errors.slice(0, 10).forEach(err => {
        console.log(`  - ${err.name} (${err.eid}): ${err.error}`);
      });
    }

    if (successCount > 0) {
      console.log('\n🎉 Import completed successfully!');
    } else {
      console.log('\n⚠️  Import completed with issues. Please review the errors above.');
    }

  } catch (error) {
    console.error('\n💥 Fatal error during import:', error);
    process.exit(1);
  }
}

importExhibitors()
  .then(() => {
    console.log('\n✨ Script finished. Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Unhandled error:', error);
    process.exit(1);
  });
