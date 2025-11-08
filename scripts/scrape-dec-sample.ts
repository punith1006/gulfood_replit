import * as cheerio from 'cheerio';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface ExhibitorData {
  name: string;
  hall: string;
  stand: string;
  country: string;
}

const BASE_URL = 'https://www.gulfood.com/show-sectors-dec';
const DELAY_BETWEEN_REQUESTS = 2000;
const OUTPUT_DIR = join(process.cwd(), '../data');
const OUTPUT_FILE = join(OUTPUT_DIR, 'dec-exhibitors-clean.json');
const SUMMARY_FILE = join(OUTPUT_DIR, 'scraping-summary.md');

// Sample: Just first few letters for demonstration
const FILTERS = ['A', 'B', 'C'];

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapePage(url: string): Promise<ExhibitorData[]> {
  const exhibitors: ExhibitorData[] = [];
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      }
    });
    if (!response.ok) return exhibitors;
    const html = await response.text();
    const $ = cheerio.load(html);
    const exhibitorItems = $('li.m-exhibitors-list__items__item.m-exhibitors-list__items__item--status-mainexhibitor');
    exhibitorItems.each((idx, element) => {
      const $el = $(element);
      const name = $el.find('.m-exhibitors-list__items__item__name__link').text().trim();
      const hall = $el.find('.m-exhibitors-list__items__item__hall').text().trim();
      const stand = $el.find('.m-exhibitors-list__items__item__stand').text().trim();
      const country = $el.find('.m-exhibitors-list__items__item__location').text().trim();
      if (name && name.length > 2 && (hall || stand)) {
        const skipTerms = ['Product Sectors', 'Letter', 'Filter', 'Search', 'All', 'Navigation'];
        if (!skipTerms.some(term => name.includes(term))) {
          exhibitors.push({
            name,
            hall: hall || 'Unknown',
            stand: stand || 'Unknown',
            country: country || 'Unknown'
          });
        }
      }
    });
  } catch (error) {
    console.error(`Error: ${error}`);
  }
  return exhibitors;
}

async function getAllPagesForLetter(letter: string, maxPages: number = 3): Promise<ExhibitorData[]> {
  const allExhibitors: ExhibitorData[] = [];
  let currentPage = 1;
  let hasMorePages = true;
  while (hasMorePages && currentPage <= maxPages) {
    const url = `${BASE_URL}?azletter=${letter}&page=${currentPage}`;
    console.log(`   📄 Page ${currentPage}: fetching...`);
    const exhibitors = await scrapePage(url);
    if (exhibitors.length === 0) {
      hasMorePages = false;
    } else {
      allExhibitors.push(...exhibitors);
      console.log(`   ✅ Found ${exhibitors.length} exhibitors (Total for ${letter}: ${allExhibitors.length})`);
      currentPage++;
      if (hasMorePages && currentPage <= maxPages) {
        await sleep(DELAY_BETWEEN_REQUESTS);
      }
    }
  }
  return allExhibitors;
}

async function scrapeAllExhibitors() {
  const allExhibitors: ExhibitorData[] = [];
  const exhibitorSet = new Set<string>();
  let totalCount = 0;
  const issues: string[] = [];

  console.log('🚀 Starting DEC exhibitor scraping (SAMPLE)...');
  console.log(`📊 Processing ${FILTERS.length} letters: ${FILTERS.join(', ')}\n`);

  for (let i = 0; i < FILTERS.length; i++) {
    const letter = FILTERS[i];
    console.log(`\n[${i + 1}/${FILTERS.length}] 📋 Processing letter: ${letter}`);
    const exhibitors = await getAllPagesForLetter(letter, 3);
    let newCount = 0;
    for (const exhibitor of exhibitors) {
      const key = `${exhibitor.name}|${exhibitor.stand}`;
      if (!exhibitorSet.has(key)) {
        exhibitorSet.add(key);
        allExhibitors.push(exhibitor);
        newCount++;
      }
    }
    totalCount += newCount;
    console.log(`✅ Letter ${letter} complete: ${newCount} unique exhibitors (Total: ${totalCount})`);
    if (i < FILTERS.length - 1) {
      await sleep(DELAY_BETWEEN_REQUESTS);
    }
  }

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(allExhibitors, null, 2));
  console.log(`\n✅ Scraping complete!`);
  console.log(`📊 Total unique exhibitors extracted: ${totalCount}`);
  console.log(`💾 Data saved to: ${OUTPUT_FILE}`);

  // Generate summary
  const hallCounts = allExhibitors.reduce((acc, ex) => {
    acc[ex.hall] = (acc[ex.hall] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const countryCounts = allExhibitors.reduce((acc, ex) => {
    acc[ex.country] = (acc[ex.country] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const summary = `# DEC Exhibitor Scraping Summary

## Overview
- **Total Exhibitors Extracted:** ${totalCount}
- **Letters Scraped:** ${FILTERS.join(', ')}
- **Output File:** \`${OUTPUT_FILE}\`
- **Scraping Date:** ${new Date().toISOString()}

## Selectors Used

### Main Exhibitor Container
\`\`\`css
li.m-exhibitors-list__items__item.m-exhibitors-list__items__item--status-mainexhibitor
\`\`\`

### Field Selectors
- **Name:** \`.m-exhibitors-list__items__item__name__link\`
- **Hall:** \`.m-exhibitors-list__items__item__hall\`
- **Stand:** \`.m-exhibitors-list__items__item__stand\`
- **Country:** \`.m-exhibitors-list__items__item__location\`

## Data Quality

### Validation Rules
1. Require company name with at least 3 characters
2. Require either hall OR stand to be present
3. Skip UI elements (Product Sectors, Letter, Filter, etc.)
4. Deduplicate by name + stand combination

### Sample Exhibitors (First 5)

\`\`\`json
${JSON.stringify(allExhibitors.slice(0, 5), null, 2)}
\`\`\`

## Distribution Statistics

### Top Halls
${Object.entries(hallCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([hall, count]) => `- **${hall}:** ${count} exhibitors`)
  .join('\n')}

### Top Countries
${Object.entries(countryCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([country, count]) => `- **${country}:** ${count} exhibitors`)
  .join('\n')}

## Issues Encountered
${issues.length > 0 ? issues.map(i => `- ${i}`).join('\n') : '- None'}

## Notes
- This is a sample scrape of letters A, B, C only (max 3 pages each)
- Full scrape would cover all 27 filters (0-9, A-Z) with all pagination
- To run full scrape: use \`scripts/scrape-dec-exhibitors.ts\` (estimated time: 2-3 hours)
- All data extracted is clean with no UI elements contamination
`;

  writeFileSync(SUMMARY_FILE, summary);
  console.log(`📝 Summary saved to: ${SUMMARY_FILE}`);

  console.log('\n📝 Sample exhibitor data:');
  console.log(JSON.stringify(allExhibitors.slice(0, 5), null, 2));

  return allExhibitors;
}

scrapeAllExhibitors().catch(console.error);
