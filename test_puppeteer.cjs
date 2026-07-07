const puppeteer = require('puppeteer');

(async () => {
  console.log('Starting puppeteer...');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

  console.log('Navigating to localhost:5174...');
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
  
  console.log('Taking screenshot of initial load...');
  await page.screenshot({ path: 'test_after_login.png' });
  
  console.log('Trying to click on sidebar "견적"...');
  try {
    const link = await page.$$("::-p-xpath(//a[contains(., '견적')])");
    if (link.length > 0) {
      await link[0].click();
      console.log('Clicked 견적');
      await new Promise(r => setTimeout(r, 1000));
      await page.screenshot({ path: 'test_after_click.png' });
    } else {
      console.log('Could not find 견적 link');
    }
  } catch (e) {
    console.log('Error clicking:', e);
  }

  await browser.close();
  console.log('Done.');
})();
