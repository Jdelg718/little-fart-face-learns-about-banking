#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const manuscriptPath = '/home/sven/obsidian-vault/shared-workspace/little-fart-face-learns-about-banking-manuscript-v1.md';
const coverPath = '/home/sven/.openclaw-tg/media/tool-image-generation/little-fart-face-learns-about-banking---f43bb6a1-d4fd-4830-a473-90595d88ac1d.png';
const characterPath = '/home/sven/.openclaw-tg/media/tool-image-generation/little-fart-face-character-sheet-v1---43aaa2bd-e4f1-4e0c-9004-6fd34bf23b9e.png';
const contactPath = process.argv[2];
const outputPath = process.argv[3] || '/home/sven/.openclaw-tg/workspace-tg/output/drafts/little-fart-face-learns-about-banking-v1.pdf';
const fixItPath = process.argv[4] && fs.existsSync(process.argv[4]) ? process.argv[4] : null;

if (!contactPath || !fs.existsSync(contactPath)) {
  console.error('Usage: node src/render-little-fart-face-book.js <four-panel-image.png> [output.pdf]');
  process.exit(1);
}

const esc = (s) => s
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  .replace(/—/g, '—');

function imageDataUri(p) {
  const ext = path.extname(p).toLowerCase();
  const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png';
  return 'data:' + mime + ';base64,' + fs.readFileSync(p).toString('base64');
}

function parseSpreads(markdown) {
  const section = markdown.split('## Back matter')[0];
  return section.split(/^## Spread /m).slice(1).map((chunk) => {
    const firstBreak = chunk.indexOf('\n');
    const heading = chunk.slice(0, firstBreak).match(/^(\d+) — (.+)$/);
    if (!heading) throw new Error('Malformed spread heading: ' + chunk.slice(0, firstBreak));
    return {
      number: Number(heading[1]),
      title: heading[2].trim(),
      paragraphs: chunk.slice(firstBreak + 1).trim().split(/\n\s*\n/).map((p) => p.replace(/^- /gm, '• ')),
    };
  });
}

function panel(position) {
  if (position === 'fixit' && fixItPath) {
    return '<div class="art"><img class="standalone" src="' + imageDataUri(fixItPath) + '"></div>';
  }
  const transforms = {
    tl: 'translate(0,0)',
    tr: 'translate(-50%,0)',
    bl: 'translate(0,-50%)',
    br: 'translate(-50%,-50%)',
  };
  return '<div class="art"><img src="' + imageDataUri(contactPath) + '" style="transform:' + transforms[position] + '"></div>';
}

const panelForSpread = { 1: fixItPath ? 'fixit' : 'tl', 5: 'tr', 9: 'bl', 10: 'br' };

function spreadHtml(spread) {
  const body = spread.paragraphs.map((p) => '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>').join('');
  const hasArt = panelForSpread[spread.number];
  const text = '<section class="story ' + (hasArt ? 'with-art' : 'text-only') + '">' +
    '<div class="folio">' + String(spread.number).padStart(2, '0') + '</div>' +
    '<div class="copy"><h2>' + esc(spread.title) + '</h2>' + body + '</div>' +
    (hasArt ? panel(hasArt) : '<div class="motif">₿</div>') +
    '</section>';
  return text;
}

const spreads = parseSpreads(fs.readFileSync(manuscriptPath, 'utf8'));
if (spreads.length !== 16) throw new Error('Expected 16 spreads; found ' + spreads.length);

const html = '<!doctype html><html><head><meta charset="utf-8"><style>' +
  '@page{size:11in 8.5in;margin:0}' +
  '*{box-sizing:border-box} body{margin:0;background:#efe4c9;color:#26323b;font-family:Georgia,serif}' +
  'section{width:11in;height:8.5in;page-break-after:always;position:relative;overflow:hidden;background:#f4ead2}' +
  '.cover{display:flex;align-items:center;justify-content:center;background:#164c5a}' +
  '.cover img{height:8.5in;width:auto;box-shadow:0 0 35px #082a32}' +
  '.cast{padding:.45in .55in;background:#f4ead2}.cast h1{margin:0 0 .2in;color:#c74f2d;font:700 29pt Georgia}' +
  '.cast img{width:100%;height:6.95in;object-fit:contain;border:5px solid #dfc998;background:#fffaf0}' +
  '.story{padding:.5in .58in}.folio{position:absolute;right:.3in;top:.25in;color:#c74f2d;font:700 12pt Arial}' +
  '.copy{position:relative;z-index:2}.copy h2{font:700 28pt Georgia;color:#c74f2d;margin:0 0 .18in;border-bottom:3px solid #d9b862;padding-bottom:.09in}' +
  '.copy p{font-size:16.8pt;line-height:1.32;margin:.11in 0}.copy strong{color:#164c5a}' +
  '.with-art .copy{position:absolute;left:5.7in;right:.58in;top:.5in;bottom:.45in}' +
  '.with-art .copy h2{font-size:25pt}.with-art .copy p{font-size:15.2pt;line-height:1.27}' +
  '.art{position:absolute;left:.38in;top:.48in;width:4.95in;height:7.55in;overflow:hidden;border:6px solid #fff8e8;box-shadow:0 5px 18px #796c52;background:#ddd}' +
  '.art img{position:absolute;width:200%;height:200%;max-width:none;object-fit:cover;transform-origin:top left}' +
  '.art img.standalone{width:100%;height:100%;transform:none;object-fit:cover;object-position:center}' +
  '.text-only .copy{max-width:8.8in;margin:.55in auto 0}.text-only .copy p{font-size:18.5pt;line-height:1.38}' +
  '.motif{position:absolute;right:.45in;bottom:-.35in;font:700 190pt Arial;color:#e3d4b3;transform:rotate(-12deg)}' +
  '.end{display:flex;align-items:center;justify-content:center;text-align:center;background:#164c5a;color:#fff8e8;padding:1in}' +
  '.end h1{font-size:38pt;margin:0 0 .3in}.end p{font-size:21pt;line-height:1.4}.end .mark{font:700 80pt Arial;color:#ee8b36}' +
  '</style></head><body>' +
  '<section class="cover"><img src="' + imageDataUri(coverPath) + '"></section>' +
  '<section class="cast"><h1>Meet the Characters</h1><img src="' + imageDataUri(characterPath) + '"></section>' +
  spreads.map(spreadHtml).join('') +
  '<section class="end"><div><div class="mark">₿</div><h1>Ask Money Better Questions</h1><p>Whose promise is it?<br>Who makes the rules?<br>Can I check for myself?</p><p><strong>Little Fart Face Learns About Banking</strong><br>By FF2K · Draft edition</p></div></section>' +
  '</body></html>';

(async () => {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath.replace(/\.pdf$/i, '.preview.html'), html);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1320, height: 1020 } });
    await page.setContent(html, { waitUntil: 'load' });
    await page.pdf({ path: outputPath, width: '11in', height: '8.5in', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    console.log(outputPath);
  } finally {
    await browser.close();
  }
})();
