import { chromium } from 'playwright';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface ExhibitorData {
  name: string;
  sector: string;
  country: string;
  booth?: string;
  hall?: string;
  stand?: string;
  venue: string;
  products?: string[];
  description?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
}

const BASE_URL = 'https://www.gulfood.com/show-sectors-dec';
const DELAY_BETWEEN_PAGES = 5000; // 5 seconds
const OUTPUT_DIR = join(process.cwd(), 'data');
const OUTPUT_FILE = join(OUTPUT_DIR, 'dec-exhibitors-raw.json');

// All alphabetical filters to crawl
const FILTERS = ['0-9', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeExhibitorPage(url: string): Promise<ExhibitorData[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const exhibitors: ExhibitorData[] = [];

  try {
    console.log(`\n📄 Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    // Wait for exhibitor list to load (adjust selector based on actual HTML)
    await page.waitForSelector('.exhibitor-list, .exhibitor-card, [data-exhibitor]', { timeout: 10000 }).catch(() => {
      console.log('⚠️  No exhibitor elements found - page might be empty or structure different');
    });

    // Extract exhibitor data
    const exhibitorElements = await page.$$('.exhibitor-card, .exhibitor-item, [data-exhibitor], .card');

    console.log(`✅ Found ${exhibitorElements.length} exhibitor elements`);

    for (const element of exhibitorElements) {
      try {
        const name = await element.$eval('h2, h3, .company-name, .exhibitor-name', el => el.textContent?.trim() || '').catch(() => '');
        const sector = await element.$eval('.sector, .category, .product-category', el => el.textContent?.trim() || '').catch(() => '');
        const country = await element.$eval('.country, .location, [data-country]', el => el.textContent?.trim() || '').catch(() => '');
        const booth = await element.$eval('.booth, .stand, [data-booth]', el => el.textContent?.trim() || '').catch(() => '');
        const hall = await element.$eval('.hall, [data-hall]', el => el.textContent?.trim() || '').catch(() => '');
        const description = await element.$eval('.description, .about, p', el => el.textContent?.trim() || '').catch(() => '');
        const website = await element.$eval('a[href*="http"]', el => (el as HTMLAnchorElement).href).catch(() => '');

        if (name && name.length > 2) {
          exhibitors.push({
            name,
            sector: sector || 'Unknown',
            country: country || 'Unknown',
            booth: booth || undefined,
            hall: hall || undefined,
            stand: booth || undefined,
            venue: 'Dubai Exhibition Centre',
            description: description || undefined,
            website: website || undefined,
          });
        }
      } catch (error) {
        console.log(`⚠️  Error extracting exhibitor data:`, error);
      }
    }

    // If no exhibitors found, try alternative extraction method
    if (exhibitors.length === 0) {
      console.log('⚠️  Trying alternative extraction method...');
      const allText = await page.evaluate(() => document.body.innerText);
      console.log('📝 Page text preview:', allText.substring(0, 500));
    }

  } catch (error) {
    console.error(`❌ Error scraping ${url}:`, error);
  } finally {
    await browser.close();
  }

  return exhibitors;
}

async function scrapeAllExhibitors() {
  const allExhibitors: ExhibitorData[] = [];
  let totalCount = 0;

  console.log('🚀 Starting DEC exhibitor scraping...');
  console.log(`📊 Will crawl ${FILTERS.length} filter pages`);

  for (const filter of FILTERS) {
    const url = `${BASE_URL}?azletter=${filter}`;
    console.log(`\n📋 [${totalCount + 1}/${FILTERS.length}] Processing filter: ${filter}`);

    const exhibitors = await scrapeExhibitorPage(url);
    
    if (exhibitors.length > 0) {
      allExhibitors.push(...exhibitors);
      totalCount += exhibitors.length;
      console.log(`✅ Extracted ${exhibitors.length} exhibitors (Total: ${totalCount})`);
    } else {
      console.log(`⚠️  No exhibitors found for filter: ${filter}`);
    }

    // Rate limiting - wait before next request
    if (filter !== FILTERS[FILTERS.length - 1]) {
      console.log(`⏳ Waiting ${DELAY_BETWEEN_PAGES / 1000}s before next page...`);
      await sleep(DELAY_BETWEEN_PAGES);
    }
  }

  // Save results
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(allExhibitors, null, 2));
  console.log(`\n✅ Scraping complete!`);
  console.log(`📊 Total exhibitors extracted: ${totalCount}`);
  console.log(`💾 Data saved to: ${OUTPUT_FILE}`);

  // Show sample data
  if (allExhibitors.length > 0) {
    console.log('\n📝 Sample exhibitor data:');
    console.log(JSON.stringify(allExhibitors.slice(0, 3), null, 2));
  }

  return allExhibitors;
}

// Run the scraper
scrapeAllExhibitors().catch(console.error);
