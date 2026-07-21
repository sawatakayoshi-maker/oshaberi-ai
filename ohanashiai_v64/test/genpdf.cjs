/* テスト用PDF（fixtures/test.pdf）を生成する。無ければ smoke 実行前に一度だけ実行。
   使い方: node genpdf.cjs */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
(async () => {
  const dir = path.join(__dirname, 'fixtures');
  if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setContent('<html><body style="font-family:sans-serif"><h1>Test Slide 1</h1><p>自動テスト用スライド1</p></body></html>');
  await p.pdf({ path: path.join(dir, 'test.pdf'), width: '300px', height: '200px', printBackground: true });
  await b.close();
  console.log('生成: fixtures/test.pdf');
})();
