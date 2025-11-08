import { chromium } from 'playwright';

async function testPageStructure() {
  console.log('🚀 Launching browser to analyze gulfood.com structure...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const url = 'https://www.gulfood.com/show-sectors-dec?azletter=A';
    console.log(`📄 Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    // Wait a bit for dynamic content
    await page.waitForTimeout(3000);

    // Get page HTML
    const html = await page.content();
    console.log('\n📝 Page HTML length:', html.length);

    // Try to find exhibitor elements with various selectors
    const selectors = [
      '.exhibitor-card',
      '.exhibitor-item',
      '[data-exhibitor]',
      '.card',
      '.company-card',
      '.exhibitor',
      '[class*="exhibitor"]',
      '[class*="company"]',
      'article',
      '.result-item',
      '.list-item'
    ];

    console.log('\n🔍 Testing selectors:');
    for (const selector of selectors) {
      const count = await page.$$eval(selector, els => els.length);
      if (count > 0) {
        console.log(`✅ Found ${count} elements with: ${selector}`);
        
        // Get first element's HTML
        const sampleHTML = await page.$eval(selector, el => el.outerHTML).catch(() => 'N/A');
        console.log(`   Sample HTML (first 200 chars): ${sampleHTML.substring(0, 200)}...`);
      }
    }

    // Get all class names on the page
    const allClasses = await page.evaluate(() => {
      const classes = new Set<string>();
      document.querySelectorAll('[class]').forEach(el => {
        el.className.split(' ').forEach(c => c.trim() && classes.add(c));
      });
      return Array.from(classes).sort();
    });
    
    console.log('\n📋 Page classes (sample):', allClasses.slice(0, 30).join(', '));

    // Get page text to see if exhibitor data is there
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('\n📝 Page text preview (first 1000 chars):');
    console.log(bodyText.substring(0, 1000));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

testPageStructure();
