
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--use-fake-ui-for-media-stream'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
  
  await page.goto('https://root-facts-starter.netlify.app/');
  
  // Wait for the app to be ready
  await page.waitForSelector('.status-dot.active', { hidden: true, timeout: 30000 });
  console.log('App is ready.');
  
  // Try to toggle camera
  await page.click('#btn-toggle');
  console.log('Clicked toggle camera.');
  
  // Wait a bit to let it scan
  await new Promise(r => setTimeout(r, 5000));
  
  await browser.close();
  console.log('Test complete.');
})();
