import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: true });
    console.log('✅ Puppeteer launched successfully');
    await browser.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Puppeteer failed to launch:', error.message);
    process.exit(1);
  }
})();
