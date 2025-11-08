import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

interface ExhibitorData {
  name: string;
  hall: string;
  stand?: string;
  country: string;
  venue: string;
  logoUrl?: string;
  exhibitorUrl?: string;
}

const INPUT_FILE = join(process.cwd(), 'attached_assets', 'content-1762581882016.md');
const OUTPUT_DIR = join(process.cwd(), 'data');
const OUTPUT_FILE = join(OUTPUT_DIR, 'dec-exhibitors-parsed.json');

function parseExhibitors(): ExhibitorData[] {
  console.log('📖 Reading markdown file...');
  const content = readFileSync(INPUT_FILE, 'utf-8');
  const lines = content.split('\n');
  
  const exhibitors: ExhibitorData[] = [];
  let i = 0;
  
  // Find the start of exhibitor listings by looking for the "Exhibitor Name" header
  let startMarker = -1;
  for (let j = 0; j < lines.length; j++) {
    if (lines[j].includes('Exhibitor Name')) {
      // Look ahead for Hall and Stand headers
      let foundHall = false;
      let foundStand = false;
      for (let k = j; k < j + 20 && k < lines.length; k++) {
        if (lines[k].includes('Hall')) foundHall = true;
        if (lines[k].includes('Stand')) foundStand = true;
      }
      if (foundHall && foundStand) {
        startMarker = j;
        break;
      }
    }
  }
  
  if (startMarker === -1) {
    console.error('❌ Could not find exhibitor list start marker');
    console.log('Searching for any exhibitor links...');
    // Fallback: look for first exhibitor link
    startMarker = lines.findIndex(line => line.includes('www.gulfood.com/exhibitors/'));
    if (startMarker > 0) {
      startMarker -= 5; // Start a few lines before
      console.log(`✅ Found exhibitor links at line ${startMarker}`);
    } else {
      return [];
    }
  } else {
    console.log(`✅ Found exhibitor list header at line ${startMarker}`);
  }
  
  i = startMarker + 5; // Skip header rows
  
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Look for exhibitor name pattern: [Name](url)
    const nameMatch = line.match(/\[([^\]]+)\]\(https:\/\/www\.gulfood\.com\/exhibitors\/([^)]+)\)/);
    
    if (nameMatch) {
      const name = nameMatch[1];
      const slug = nameMatch[2];
      const exhibitorUrl = `https://www.gulfood.com/exhibitors/${slug}`;
      
      // Logo URL is in the previous line
      let logoUrl: string | undefined;
      const prevLine = lines[i - 2]?.trim() || '';
      const logoMatch = prevLine.match(/!\[\]\((https:\/\/[^)]+)\)/);
      if (logoMatch) {
        logoUrl = logoMatch[1];
      }
      
      // Hall is in the next non-empty line
      let hall = '';
      let j = i + 1;
      while (j < lines.length && !hall) {
        const testLine = lines[j].trim();
        if (testLine && !testLine.includes('##') && !testLine.includes('[') && !testLine.includes('!') && testLine.length > 1) {
          hall = testLine;
          break;
        }
        j++;
      }
      
      // Stand is after hall
      let stand: string | undefined;
      j++;
      while (j < lines.length && !stand) {
        const testLine = lines[j].trim();
        if (testLine && !testLine.includes('##') && !testLine.includes('[') && !testLine.includes('!') && testLine.length > 1 && testLine !== hall) {
          stand = testLine;
          break;
        }
        j++;
      }
      
      // Country is after stand
      let country = 'Unknown';
      j++;
      while (j < lines.length) {
        const testLine = lines[j].trim();
        if (testLine && !testLine.includes('##') && !testLine.includes('[') && !testLine.includes('!') && !testLine.includes('Not Available') && testLine.length > 1 && testLine !== hall && testLine !== stand) {
          country = testLine;
          break;
        }
        j++;
      }
      
      if (hall) {
        exhibitors.push({
          name,
          hall,
          stand,
          country,
          venue: 'Dubai Exhibition Centre',
          logoUrl,
          exhibitorUrl
        });
        
        if (exhibitors.length % 10 === 0) {
          console.log(`📊 Parsed ${exhibitors.length} exhibitors...`);
        }
      }
    }
    
    i++;
  }
  
  return exhibitors;
}

function main() {
  console.log('🚀 Starting DEC exhibitor parsing...\n');
  
  const exhibitors = parseExhibitors();
  
  // Create output directory if it doesn't exist
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Save to JSON file
  writeFileSync(OUTPUT_FILE, JSON.stringify(exhibitors, null, 2));
  
  console.log(`\n✅ Parsing complete!`);
  console.log(`📊 Total exhibitors extracted: ${exhibitors.length}`);
  console.log(`💾 Data saved to: ${OUTPUT_FILE}`);
  
  // Show sample data
  if (exhibitors.length > 0) {
    console.log('\n📝 Sample exhibitor data:');
    console.log(JSON.stringify(exhibitors.slice(0, 5), null, 2));
    
    // Show hall distribution
    const hallCounts = exhibitors.reduce((acc, ex) => {
      acc[ex.hall] = (acc[ex.hall] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n📍 Hall distribution:');
    Object.entries(hallCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([hall, count]) => {
        console.log(`  ${hall}: ${count} exhibitors`);
      });
    
    // Show country distribution (top 10)
    const countryCounts = exhibitors.reduce((acc, ex) => {
      acc[ex.country] = (acc[ex.country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n🌍 Top 10 countries:');
    Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([country, count]) => {
        console.log(`  ${country}: ${count} exhibitors`);
      });
  }
}

main();
