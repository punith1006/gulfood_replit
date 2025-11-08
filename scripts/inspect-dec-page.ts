import * as cheerio from 'cheerio';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function inspectDECPage() {
  console.log('🔍 Inspecting DEC exhibitor page structure...\n');
  
  try {
    const url = 'https://www.gulfood.com/show-sectors-dec?azletter=A';
    console.log(`📡 Fetching: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      }
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    console.log(`✅ Loaded HTML (${html.length} bytes)\n`);
    
    // Find common container selectors
    console.log('📋 Looking for exhibitor container patterns...\n');
    
    const possibleContainers = [
      '.exhibitor_list-item',
      '.exhibitor-list-item',
      '.exhibitor-card',
      '.listing-item',
      'li[class*="exhibitor"]',
      'div[class*="exhibitor"]',
      '[data-company-name]',
      '[data-exhibitor-id]'
    ];
    
    for (const selector of possibleContainers) {
      const count = $(selector).length;
      if (count > 0) {
        console.log(`✅ Found ${count} elements: ${selector}`);
        
        if (count <= 5) {
          // Show first few to understand structure
          $(selector).slice(0, 3).each((idx, el) => {
            const $el = $(el);
            console.log(`\n   Element ${idx + 1}:`);
            console.log(`   Classes: ${$el.attr('class')}`);
            console.log(`   Data attrs: ${Object.keys($el.data ? $el.data() : {}).join(', ')}`);
            console.log(`   Inner HTML preview: ${$el.html()?.substring(0, 200)}`);
          });
        }
      }
    }
    
    // Look for specific field patterns
    console.log('\n\n🔍 Analyzing field patterns...\n');
    
    // Find all links (exhibitor names are usually links)
    const links = $('a').filter((idx, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr('href') || '';
      return text.length > 3 && text.length < 100 && !href.includes('javascript');
    });
    
    console.log(`📌 Found ${links.length} potential exhibitor name links`);
    if (links.length > 0) {
      links.slice(0, 5).each((idx, el) => {
        const $el = $(el);
        console.log(`   ${idx + 1}. "${$el.text().trim()}" (href: ${$el.attr('href')})`);
        console.log(`      Parent: <${$el.parent().get(0)?.tagName}> class="${$el.parent().attr('class')}"`);
      });
    }
    
    // Look for hall/stand patterns
    console.log('\n🏢 Searching for hall/stand patterns...\n');
    const bodyText = $('body').text();
    const hallMatches = bodyText.match(/(?:North Hall|South Hall|Hall|DG)\s*\d+/gi);
    const standMatches = bodyText.match(/[NS]\d+[\-][A-Z0-9]+/g);
    
    if (hallMatches) {
      console.log(`   Found ${hallMatches.length} hall mentions: ${[...new Set(hallMatches)].slice(0, 10).join(', ')}`);
    }
    if (standMatches) {
      console.log(`   Found ${standMatches.length} stand codes: ${[...new Set(standMatches)].slice(0, 10).join(', ')}`);
    }
    
    // Save debug HTML snippet
    const firstExhibitors = $('[class*="exhibitor"]').slice(0, 5);
    if (firstExhibitors.length > 0) {
      const debugHtml = firstExhibitors.map((idx, el) => $(el).html()).get().join('\n\n===\n\n');
      writeFileSync(join(process.cwd(), 'data', 'debug-exhibitor-cards.html'), debugHtml);
      console.log('\n💾 Saved sample exhibitor HTML to: data/debug-exhibitor-cards.html');
    }
    
    // Try to find the actual exhibitor list structure
    console.log('\n📊 Attempting to find list structure...\n');
    const lists = $('ul, ol').filter((idx, el) => {
      const $list = $(el);
      const items = $list.find('li').length;
      return items > 5 && items < 100;
    });
    
    console.log(`   Found ${lists.length} potential lists with 5-100 items`);
    lists.slice(0, 3).each((idx, el) => {
      const $list = $(el);
      console.log(`\n   List ${idx + 1}:`);
      console.log(`   Tag: <${el.tagName}>, Class: "${$list.attr('class')}"`);
      console.log(`   Items: ${$list.find('li').length}`);
      console.log(`   First item class: "${$list.find('li').first().attr('class')}"`);
      console.log(`   First item text preview: "${$list.find('li').first().text().substring(0, 100)}"`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

inspectDECPage().catch(console.error);
