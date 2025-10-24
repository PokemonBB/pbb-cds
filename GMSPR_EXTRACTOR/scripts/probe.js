const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function findFirstGmspr(rootDir) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      const nested = findFirstGmspr(full);
      if (nested) return nested;
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.gmspr')) {
      return full;
    }
  }
  return null;
}

async function run() {
  const workspace = process.cwd();
  const gmsprRoot = path.join(workspace, 'GMSPR_TEMP');
  const sampleFile = await findFirstGmspr(gmsprRoot);
  if (!sampleFile) {
    console.error('No .gmspr found');
    process.exit(1);
  }
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://yal.cc/tools/gm/gmsprview/', { waitUntil: 'domcontentloaded' });
  const input = await page.waitForSelector('input[type="file"]', { timeout: 15000 });
  await input.uploadFile(sampleFile);
  await new Promise(r => setTimeout(r, 4000));
  const html = await page.evaluate(() => document.documentElement.outerHTML);
  const outPath = path.join(workspace, 'probe.dom.html');
  fs.writeFileSync(outPath, html, 'utf8');
  console.log('Wrote', outPath);
  await browser.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});


