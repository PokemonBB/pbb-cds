const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const extractZip = require('extract-zip');

function listGmsprFiles(rootDir) {
  const out = [];
  const stack = [rootDir];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.gmspr')) out.push(full);
    }
  }
  return out.sort();
}

async function waitForZip(downloadDir, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const files = fs.existsSync(downloadDir) ? fs.readdirSync(downloadDir) : [];
    const zip = files.find(f => f.toLowerCase().endsWith('.zip') && !f.toLowerCase().endsWith('.crdownload'));
    if (zip) return path.join(downloadDir, zip);
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('ZIP not found');
}

async function extractOne(page, filePath, outDir, downloadDir) {
  if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });
  for (const f of fs.readdirSync(downloadDir)) {
    try { fs.unlinkSync(path.join(downloadDir, f)); } catch {}
  }
  const input = await page.waitForSelector('input[type="file"]', { timeout: 20000 });
  await input.uploadFile(filePath);
  await new Promise(r => setTimeout(r, 800));
  await page.evaluate(() => { const m = document.getElementById('menu'); if (m) m.style.display = ''; });
  await page.evaluate(() => { const el = document.getElementById('save-frames'); if (el) el.click(); });
  const zipPath = await waitForZip(downloadDir, 20000);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  await extractZip(zipPath, { dir: outDir });
}

async function run() {
  const workspace = process.cwd();
  const gmsprRoot = path.join(workspace, 'GMSPR_TEMP');
  const framesRoot = path.join(workspace, 'FRAMES');
  const files = listGmsprFiles(gmsprRoot);
  if (files.length === 0) {
    console.error('No .gmspr files found');
    process.exit(1);
  }
  const downloadsDir = path.join(workspace, 'downloads');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const cdp = await page.target().createCDPSession();
  await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadsDir });
  await page.goto('https://yal.cc/tools/gm/gmsprview/', { waitUntil: 'domcontentloaded' });
  for (const file of files) {
    const base = path.basename(file, '.gmspr');
    const outDir = path.join(framesRoot, base);
    console.log('Extracting', base);
    try {
      await extractOne(page, file, outDir, downloadsDir);
      console.log('Done', base);
    } catch (e) {
      console.error('Failed', base, e.message);
    }
  }
  await browser.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});


