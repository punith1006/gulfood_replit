import * as cheerio from 'cheerio';

async function testScraper() {
  const url = 'https://www.gulfood.com/show-sectors-dec?azletter=A&page=1';
  console.log('🔍 Testing scraper on:', url);
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html',
    }
  });
  
  const html = await response.text();
  const $ = cheerio.load(html);
  
  const exhibitorItems = $('li.m-exhibitors-list__items__item.m-exhibitors-list__items__item--status-mainexhibitor');
  console.log(`\n✅ Found ${exhibitorItems.length} exhibitor items\n`);
  
  exhibitorItems.slice(0, 5).each((idx, element) => {
    const $el = $(element);
    const name = $el.find('.m-exhibitors-list__items__item__name__link').text().trim();
    const hall = $el.find('.m-exhibitors-list__items__item__hall').text().trim();
    const stand = $el.find('.m-exhibitors-list__items__item__stand').text().trim();
    const country = $el.find('.m-exhibitors-list__items__item__location').text().trim();
    
    console.log(`${idx + 1}. ${name}`);
    console.log(`   Hall: ${hall}`);
    console.log(`   Stand: ${stand}`);
    console.log(`   Country: ${country}\n`);
  });
}

testScraper().catch(console.error);
