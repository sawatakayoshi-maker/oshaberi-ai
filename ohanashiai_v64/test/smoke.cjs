/* =====================================================================
   おはなしAI 自動スモークテスト（Playwright / Chromium）
   ---------------------------------------------------------------------
   ・アプリ(index.html)を内蔵HTTPサーバで配信し、Chromiumで自動操作。
   ・外部通信（Anthropic API / TTS Worker）はモックして、料金・実通信なしで検証。
   ・UI/DOM レベルで機械判定できる項目のみを自動チェック（合否レポート出力）。
   ・音声の読み上げ/マイク割り込み/iPhone固有 は原理的に自動化不可 → 手動項目として明記。

   使い方（PCでも同じ）:
     npm i -D playwright        （初回のみ。ブラウザは npx playwright install chromium）
     node test/smoke.cjs
   出力: コンソール表・test/report.html・test/report.json
   ===================================================================== */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

// アプリのルート（index.html がある場所）。既定は test の1つ上。環境変数 OHANASHI_DIR で上書き可。
const ROOT = process.env.OHANASHI_DIR ? path.resolve(process.env.OHANASHI_DIR) : path.resolve(__dirname, '..');
const PDF  = path.join(__dirname, 'fixtures', 'test.pdf');
const MOCK_REPLY = 'これはモックのAI返答です。（自動テスト用）';

/* ---- 簡易静的HTTPサーバ（file://のlocalStorage制約回避＋SW/HTTP相当の環境） ---- */
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.json':'application/json',
  '.webmanifest':'application/manifest+json', '.png':'image/png', '.pdf':'application/pdf', '.css':'text/css' };
function startServer(){
  return new Promise((resolve)=>{
    const srv = http.createServer((req,res)=>{
      let p = decodeURIComponent(req.url.split('?')[0]);
      if(p==='/') p='/index.html';
      const fp = path.join(ROOT, p);
      if(!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()){ res.writeHead(404); res.end('nf'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
      fs.createReadStream(fp).pipe(res);
    });
    srv.listen(0, '127.0.0.1', ()=> resolve({ srv, port: srv.address().port }));
  });
}

/* ---- チェック定義（auto=自動可 / tag=チェックリスト分類） ---- */
const checks = [];
const C = (id, tag, name, fn, opts) => checks.push({ id, tag, name, fn, needsCDN: !!(opts && opts.needsCDN) });

/* A. 起動・基本・PWA */
C('app-loads', 'A', 'アプリが起動しバージョン表示が出る', async (p) => {
  const v = (await p.textContent('#appVer').catch(()=>'')) || '';
  if(!/v\d+/.test(v)) throw new Error('appVer が読めない: "'+v+'"');
  return 'version='+v.trim();
});
C('onboarding-bypass', 'A', 'APIキー設定済みならメイン画面に入れる（入力欄あり）', async (p) => {
  const hasInput = await p.$('#input');
  const keyBlock = await p.$('#_keybtn');   // 登録して始める（未設定時のみ）
  const keyVisible = keyBlock ? await keyBlock.isVisible().catch(()=>false) : false;
  if(!hasInput) throw new Error('#input が無い');
  if(keyVisible) throw new Error('APIキー登録画面が前面（バイパス失敗）');
  return 'input=あり / キー画面=非表示';
});
C('main-controls', 'A', '主要ボタンが存在する（待受/割込/検索/コンテンツ/プレゼン）', async (p) => {
  const ids = ['standbyBtn','bargeBtn','webBtn','contentBtn','presentBtn'];
  const missing = [];
  for(const id of ids){ if(!(await p.$('#'+id))) missing.push(id); }
  if(missing.length) throw new Error('欠落: '+missing.join(','));
  return '5/5 存在';
});
C('pwa-manifest-sw', 'A', 'manifestリンクとService Worker登録がある', async (p) => {
  const man = await p.$('link[rel="manifest"]');
  if(!man) throw new Error('manifest link 無し');
  await p.waitForTimeout(800);
  const regs = await p.evaluate(async () => {
    try{ const r = await navigator.serviceWorker.getRegistrations(); return r.length; }catch(e){ return -1; }
  });
  if(regs <= 0) throw new Error('SW登録数='+regs);
  return 'manifest=あり / SW登録='+regs;
});
C('version-sync', 'A', 'appVerの番号 と sw.jsのCACHE番号 の整合（存在確認）', async (p) => {
  const badge = ((await p.textContent('#appVer').catch(()=>''))||'').trim();
  const swtext = await p.evaluate(async () => { try{ return await (await fetch('/sw.js')).text(); }catch(e){ return ''; } });
  const m = swtext.match(/ohanashi-ai-v(\d+)/);
  if(!m) throw new Error('sw.js の CACHE 版番号が読めない');
  return 'appVer='+badge+' / sw=v'+m[1];
});

/* B. 会話（モックAI）・トグル */
C('chat-reply-mock', 'B', 'テキスト送信→AI返答が表示される（通信モック）', async (p) => {
  await p.fill('#input', 'テスト送信です');
  await p.click('#send');
  await p.waitForFunction((txt) => {
    const rows = document.querySelectorAll('#log .row.ai .bubble');
    return Array.from(rows).some(b => (b.textContent||'').includes(txt));
  }, MOCK_REPLY, { timeout: 8000 });
  return '返答バブル表示OK';
});
C('barge-toggle', 'B', '🤚割り込みトグルが状態を切替できる', async (p) => {
  const before = await p.evaluate(() => document.getElementById('bargeBtn').classList.contains('on'));
  await p.click('#bargeBtn');
  const after = await p.evaluate(() => document.getElementById('bargeBtn').classList.contains('on'));
  if(before === after) throw new Error('on状態が変化しない');
  await p.click('#bargeBtn').catch(()=>{});   // 元に戻す
  return 'on: '+before+' → '+after;
});

/* F/G/J. 各モーダルが開く */
C('content-open', 'F', 'コンテンツ管理が開く', async (p) => { await openModal(p, '#contentBtn', '#contentModal'); return 'contentModal 表示'; });
C('news-open', 'G', '業界ニュース独立画面が開く', async (p) => {
  await p.evaluate(() => { try{ window.openNewsTab && window.openNewsTab(); }catch(e){} });
  await waitVisible(p, '#newsModal');
  await closeAny(p);
  return 'newsModal 表示';
});
C('minutes-open', 'J', '議事録が開く', async (p) => { await openModal(p, '#minutesBtn', '#minutesModal'); return 'minutesModal 表示'; });

/* M. プレゼン（重点） */
C('present-open', 'M', 'プレゼンが開く', async (p) => { await waitVisible(p, '#presentModal', async()=>{ await p.click('#presentBtn'); }); return 'presentModal 表示'; });
C('pres-langrow-top', 'M', '台本の言語スイッチが台本パネル最上部にある(v61u)', async (p) => {
  const ok = await p.evaluate(() => {
    const sc = document.querySelector('.pres-script'); if(!sc) return false;
    const row = sc.querySelector('#presLangRow'); const head = sc.querySelector('.pres-script-head');
    if(!row || !head) return false;
    return (row.compareDocumentPosition(head) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;  // row が head より前
  });
  if(!ok) throw new Error('presLangRow が 📝台本見出しより前に無い');
  return '最上部に配置 OK';
});
C('pres-webtoggle', 'M', 'Web参照トグルが存在する(v61t)', async (p) => {
  if(!(await p.$('#presGenWeb'))) throw new Error('#presGenWeb 無し');
  return 'presGenWeb あり';
});
C('pres-langswitch', 'M', '言語切替ボタンが存在（初期=日本語）', async (p) => {
  const t = ((await p.textContent('#presLangCur').catch(()=>''))||'').trim();
  if(!/日本語/.test(t)) throw new Error('presLangCur が日本語でない: '+t);
  return 'presLangCur='+t;
});
C('pres-pdf-load', 'M', 'PDFを読み込むとスライドが描画される', async (p) => {
  await p.setInputFiles('#presOpenInput', PDF);   // v64対応: presFileInput → presOpenInput に改名済み
  await p.waitForFunction(() => {
    const cv = document.getElementById('presCanvas');
    return cv && !cv.hidden && cv.width > 0 && cv.getBoundingClientRect().width > 0;
  }, null, { timeout: 12000 });
  return 'presCanvas 描画 OK';
}, { needsCDN: true });   // pdf.js を cdnjs/jsdelivr から読むため、CDN到達が必要
C('pres-close', 'M', 'プレゼンを閉じられる', async (p) => {
  await p.evaluate(() => { const b=document.getElementById('presCloseBtn'); if(b) b.click(); });
  await p.waitForFunction(() => { const m=document.getElementById('presentModal'); return !m || getComputedStyle(m).display==='none' || !m.offsetParent; }, null, { timeout: 5000 });
  return 'presentModal 非表示';
});

/* N. v62v〜v63 新機能（v63e更新で追加） */
C('org-open', 'N', '🏢組織図が開く（v62v/y）', async (p) => {
  await p.click('#chatOrgBtn').catch(async()=>{ await p.click('#orgChartBtn'); });
  await waitVisible(p, '#orgModal');
  const cards = await p.$$('#orgModal .org-card');
  await closeAny(p);
  if(cards.length < 10) throw new Error('org-card が少ない: '+cards.length);
  return 'orgModal 表示 / カード'+cards.length+'枚';
});
C('rspeed-exists', 'N', '⚡返答の速さボタンが存在する（v62z）', async (p) => {
  const b = await p.$('#rspeedBtn');
  if(!b) throw new Error('#rspeedBtn が無い');
  const t = (await b.textContent())||'';
  if(!/返答/.test(t)) throw new Error('ラベル不正: '+t);
  return 'label='+t.trim();
});
C('control-v63-actions', 'N', '声の全ボタン操作にv63c/dの新操作が登録済み', async (p) => {
  const r = await p.evaluate(() => {
    const need = ['open_org','monthly_review','rspeed_toggle','minutes_summary','news_refresh',
      'usecase_mental','usecase_hearing_customer','open_glossary','open_desk','open_jisseki','minutes_new','monthly_review_save','backup_auto_export','open_thread'];
    const en = (typeof CONTROL_TOOL!=='undefined' && CONTROL_TOOL.input_schema.properties.action.enum) || [];
    return { total: en.length, missing: need.filter(a => !en.includes(a)) };
  });
  if(r.missing.length) throw new Error('未登録: '+r.missing.join(','));
  return 'enum '+r.total+'操作 / v63c・v63dの14操作すべて登録済み';
});

/* S. v64s1〜v64s3 新機能（書類スキャン係／組織図PC幅／読み上げ対策／アバター所属会社） */
C('scan-open', 'S', '📄書類スキャン係が組織図の2択から開いて閉じる（v64s6導線）', async (p) => {
  await p.click('#chatOrgBtn').catch(async()=>{ await p.click('#orgChartBtn'); });
  await waitVisible(p, '#orgModal');
  await p.click('[data-act="photo_menu"]');
  await p.waitForFunction(() => { const o=document.getElementById('pmOverlay'); return o && o.style.display!=='none'; }, null, { timeout: 5000 });
  await p.click('#pmScan');
  await p.waitForFunction(() => { const o=document.getElementById('scOverlay'); return o && o.classList.contains('sc-open'); }, null, { timeout: 5000 });
  const parts = await p.evaluate(() => ['scShootBtn','scPdfBtn','scInbox'].filter(id => !document.getElementById(id)));
  await p.click('#scBack');
  await p.waitForFunction(() => { const o=document.getElementById('scOverlay'); return o && !o.classList.contains('sc-open'); }, null, { timeout: 5000 });
  if(parts.length) throw new Error('部品欠落: '+parts.join(','));
  return 'scOverlay 開閉OK / 部品3点あり';
});
C('voice-memo', 'S', '🎙声メモの部品と声操作が登録されている（v64s6）', async (p) => {
  const miss = await p.evaluate(() => ['vmOverlay','vmStop','vmCancel','vmText','pmOverlay','pmPlain','pmScan'].filter(id=>!document.getElementById(id)));
  if(miss.length) throw new Error('部品欠落: '+miss.join(','));
  const en = await p.evaluate(() => (typeof CONTROL_TOOL!=='undefined' && CONTROL_TOOL.input_schema.properties.action.enum) || []);
  const need=['voice_memo','open_scan','video_pause','marquee_news','photo_menu'].filter(a=>en.indexOf(a)<0);
  if(need.length===1 && need[0]==='photo_menu'){ /* photo_menuはカード専用でenum外＝許容 */ }
  else if(need.length) throw new Error('声操作 未登録: '+need.join(','));
  return '部品7点あり / enum '+en.length+'操作（voice_memo・open_scan 登録済み）';
});
C('org-pc-width', 'S', '組織図がPC幅で980pxに広がる（v64s2）', async (p) => {
  await p.click('#chatOrgBtn').catch(async()=>{ await p.click('#orgChartBtn'); });
  await waitVisible(p, '#orgModal');
  const r = await p.evaluate(() => {
    const el=document.getElementById('orgPanel');
    return { vw: window.innerWidth, mw: el ? getComputedStyle(el).maxWidth : '(orgPanelなし)' };
  });
  await closeAny(p);
  if(r.vw < 761) return 'viewport '+r.vw+'px＝スマホ幅のため対象外（PCで再確認）';
  if(r.mw !== '980px') throw new Error('max-width='+r.mw+'（期待: 980px, viewport='+r.vw+'）');
  return 'viewport '+r.vw+'px / orgPanel max-width=980px';
});
C('tts-guards', 'S', '読み上げの途中停止対策が組み込まれている（v64s2）', async (p) => {
  const r = await p.evaluate(() => {
    const b = (typeof browserSpeak==='function') ? String(browserSpeak) : '';
    const o = (typeof openaiTTSSpeak==='function') ? String(openaiTTSSpeak) : '';
    const need = [
      ['見張り世代(_gen)',        b.includes('browserSpeak._gen')],
      ['続きから再開(enqueueFrom)', b.includes('enqueueFrom')],
      ['PCキック(pause→resume)',   b.includes('ss.pause(); ss.resume();')],
      ['長文の再分割(120字)',      b.includes('120')],
      ['iPhone側チャンク(600字)',  o.includes('600')],
      ['チャンク先読み(nextP)',    o.includes('nextP')],
    ];
    return need.filter(x=>!x[1]).map(x=>x[0]);
  });
  if(r.length) throw new Error('未検出: '+r.join(','));
  return '6マーカーすべて検出';
});
C('avatar-company-field', 'S', 'アバター追加に「所属会社」欄がある（v64s3）', async (p) => {
  await p.click('#avatarManageBtn');
  await waitVisible(p, '#avatarModal');
  const r = await p.evaluate(() => {
    const sel=document.getElementById('avAddCompany');
    if(!sel) return { err:'#avAddCompany が無い' };
    const vals=Array.from(sel.options).map(o=>o.value);
    const t=document.getElementById('avAddNewCompanyName');
    return { vals, hasNew: vals.includes('__new__'), hasSeed: vals.includes('nakatech') && vals.includes('asean'),
             newNameHidden: t ? (getComputedStyle(t).display==='none') : null };
  });
  if(r.err) throw new Error(r.err);
  if(!r.hasNew || !r.hasSeed) throw new Error('選択肢不足: '+r.vals.join(','));
  if(r.newNameHidden!==true) throw new Error('新会社名の入力欄が初期表示されている（__new__選択時のみ表示のはず）');
  await p.selectOption('#avAddCompany','__new__');
  const shown = await p.evaluate(() => { const t=document.getElementById('avAddNewCompanyName'); return t && getComputedStyle(t).display!=='none'; });
  await closeAny(p);
  if(!shown) throw new Error('__new__選択で会社名欄が表示されない');
  return '選択肢 '+r.vals.length+'件（seed＋新規作成）／新会社名欄の表示切替OK';
});
C('avatar-new-company', 'S', '新会社つきアバター追加→社長と同じ仕組みで動く（v64s3）', async (p) => {
  const PNG1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==','base64');
  await p.click('#avatarManageBtn');
  await waitVisible(p, '#avatarModal');
  await p.selectOption('#avAddCompany','__new__');
  await p.fill('#avAddNewCompanyName','株式会社テスト商事');
  await p.fill('#avAddName','試験 太郎');
  await p.setInputFiles('#avAddImg', { name:'test.png', mimeType:'image/png', buffer: PNG1x1 });
  await p.click('#avAddBtn');
  await p.waitForFunction(() => {
    try{ return typeof customCompanies!=='undefined' && customCompanies.some(c=>c && c.name==='株式会社テスト商事'); }catch(e){ return false; }
  }, null, { timeout: 8000 });
  const r = await p.evaluate(() => {
    const co = customCompanies.find(c=>c.name==='株式会社テスト商事');
    const prompt = (typeof avatarNamePrompt==='function') ? avatarNamePrompt() : '';
    return {
      companyId: co && co.id,
      avatarBound: !!(co && co.avatar),
      switched: (typeof activeProfileId!=='undefined') && activeProfileId===co.id,
      presidentWording: prompt.includes('株式会社テスト商事') && prompt.includes('社長'),
      restricted: (typeof isPresidentLike==='function') && isPresidentLike(typeof avatarType!=='undefined'?avatarType:''),
      inPicker: (typeof allCompanies==='function') && allCompanies().some(c=>c.name==='株式会社テスト商事'),
    };
  });
  await closeAny(p);
  const ng=[];
  if(!r.companyId) ng.push('会社が保存されない');
  if(!r.avatarBound) ng.push('会社にアバター紐付けなし');
  if(!r.switched) ng.push('会社スレッドへ切替されない');
  if(!r.presidentWording) ng.push('人格に社長文言・会社名が入らない');
  if(!r.restricted) ng.push('アクセス制限（社長と同じ）が付かない');
  if(!r.inPicker) ng.push('会社一覧に出ない');
  if(ng.length) throw new Error(ng.join(' / '));
  return '会社作成・紐付け・スレッド切替・社長文言・制限・一覧表示の6点OK';
});
C('presidents-regression', 'S', '既存3社長・秘書の挙動が不変（v64s3の確認⑤）', async (p) => {
  const r = await p.evaluate(() => {
    try{
      setAvatar('nishio');
      const t = avatarNamePrompt();
      const out = {
        nishio: t.includes('アセアンテクノロジー株式会社') && t.includes('社長'),
        coN: avatarCompanyOf('nishio')==='asean',
        coK: avatarCompanyOf('kitamoto')==='pipeplant',
        coO: avatarCompanyOf('okazaki')==='arterliebe',
        seeds: COMPANY_PROFILES.length===5,
        secretaryFull: isPresidentLike('photoF')===false && isPresidentLike('photoM')===false && isPresidentLike('illust')===false,
      };
      setAvatar('photoF');
      return out;
    }catch(e){ return { err:String(e) }; }
  });
  if(r.err) throw new Error(r.err);
  const ng = Object.entries(r).filter(([k,v])=>v!==true).map(([k])=>k);
  if(ng.length) throw new Error('不一致: '+ng.join(','));
  return '西尾=アセアン社長文言 / 3社長の会社対応 / seed5社 / 秘書ら全アクセスのまま — すべて従来どおり';
});


/* ---- ヘルパ ---- */
async function waitVisible(p, sel, opener){ if(opener) await opener(); await p.waitForFunction((s)=>{ const el=document.querySelector(s); if(!el) return false; const st=getComputedStyle(el); return st.display!=='none' && st.visibility!=='hidden' && el.getBoundingClientRect().width>0; }, sel, { timeout: 6000 }); }
async function openModal(p, btnSel, modalSel){ await p.click(btnSel); await waitVisible(p, modalSel); await closeAny(p); }
async function closeAny(p){
  // cp-overlay / pres-overlay は hidden 属性で閉じる（アプリの close と同じ）
  await p.evaluate(() => { document.querySelectorAll('.cp-overlay, .pres-overlay').forEach(m => { m.hidden = true; }); });
  await p.waitForTimeout(120);
}

/* ---- 実行 ---- */
(async () => {
  const { srv, port } = await startServer();
  const base = 'http://127.0.0.1:'+port+'/index.html';
  const browser = await chromium.launch(process.env.OHANASHI_CHROMIUM ? { executablePath: process.env.OHANASHI_CHROMIUM } : {});   // v63e更新: 環境変数でブラウザ指定可（既定は従来どおり）
  const ctx = await browser.newContext();
  // APIキーを事前投入（オンボーディング回避）
  await ctx.addInitScript(() => { try{ localStorage.setItem('oshaberi:apikey','TEST-KEY'); localStorage.setItem('oshaberi:model','claude-sonnet-4-6'); }catch(e){} });
  // 外部通信モック
  await ctx.route(/api\.anthropic\.com\/.*/, route => route.fulfill({ status:200, contentType:'application/json',
    body: JSON.stringify({ id:'msg_mock', type:'message', role:'assistant', model:'mock',
      content:[{type:'text', text: MOCK_REPLY}], stop_reason:'end_turn', usage:{input_tokens:5, output_tokens:6} }) }));
  await ctx.route(/tsawa0314\.workers\.dev.*/, route => route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ text:'モック認識' }) }));

  const page = await ctx.newPage();
  page.setDefaultTimeout(12000);
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e.message||e)));
  await page.goto(base, { waitUntil:'domcontentloaded' });
  await page.waitForTimeout(900);

  // CDN(cdnjs/jsdelivr)到達性を判定（遮断環境ではCDN依存チェックをSKIP）
  const cdnOK = await page.evaluate(async () => {
    try{ await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', { method:'GET', mode:'no-cors', cache:'no-store' }); return true; }
    catch(e){ return false; }
  });
  if(!cdnOK) console.log('  \x1b[33m(注)CDN(cdnjs/jsdelivr)に到達できない環境のため、CDN依存チェックはSKIPします\x1b[0m');

  const results = [];
  for(const c of checks){
    if(c.needsCDN && !cdnOK){
      results.push({ ...c, ok:null, skipped:true, detail:'CDN未到達のためSKIP（実PCでは実行される）', ms:0 });
      console.log('  \x1b[33m⚠ SKIP\x1b[0m ['+c.tag+'] '+c.name + '  — CDN未到達');
      continue;
    }
    const t0 = Date.now();
    try{
      const detail = await c.fn(page);
      results.push({ ...c, ok:true, detail: detail||'', ms: Date.now()-t0 });
      console.log('  \x1b[32m✓ PASS\x1b[0m ['+c.tag+'] '+c.name + (detail? '  — '+detail : ''));
    }catch(e){
      results.push({ ...c, ok:false, detail: String(e.message||e), ms: Date.now()-t0 });
      console.log('  \x1b[31m✗ FAIL\x1b[0m ['+c.tag+'] '+c.name + '  — ' + String(e.message||e));
    }
  }
  await browser.close(); srv.close();

  const pass = results.filter(r=>r.ok===true).length;
  const fail = results.filter(r=>r.ok===false).length;
  const skip = results.filter(r=>r.skipped).length;
  const tot = results.length;
  console.log('\n===== 結果: '+pass+' PASS / '+fail+' FAIL / '+skip+' SKIP （全'+tot+'）'+(pageErrors.length? ('  ／ page errors: '+pageErrors.length):'')+' =====');

  // 手動のみ項目（自動化不可）— レポートに明記
  const manual = [
    ['B','読み上げ音声が鳴る／言語・声が正しい','スピーカー出力の実聴が必要（RPA不可）'],
    ['B/C','🤚割り込み・🎙️待受・通訳（マイク入力）','実マイク音声が必要（RPA不可・iPhoneは特に不可）'],
    ['C/G/M','実API・実Web検索・実ニュース取得の内容','内容は毎回変わる。モックは「表示される」まで'],
    ['iOS','iPhone固有（音量duck・キーボード・PWA・iOS割り込み）','実機/実機クラウドが必要（デスクトップ自動化の対象外）'],
    ['K','名刺OCR・写真補正・カメラ','実画像/カメラと実APIが必要'],
    ['D','VoiceVox/OpenAI TTS音声','外部エンジン/実音声が必要'],
  ];

  // JSON + HTML レポート
  fs.writeFileSync(path.join(__dirname,'report.json'), JSON.stringify({ when:new Date().toISOString(), pass, fail, skip, tot, cdnOK, pageErrors, results, manual }, null, 2));
  const rows = results.map(r=>{ const cls=r.skipped?'sk':(r.ok?'ok':'ng'); const ic=r.skipped?'⚠':(r.ok?'✅':'❌'); return `<tr class="${cls}"><td>${ic}</td><td>${r.tag}</td><td>${esc(r.name)}</td><td>${esc(r.detail)}</td><td>${r.ms}ms</td></tr>`; }).join('');
  const mrows = manual.map(m=>`<tr><td>🖐</td><td>${m[0]}</td><td>${esc(m[1])}</td><td>${esc(m[2])}</td></tr>`).join('');
  const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><title>おはなしAI 自動テスト結果</title>
  <style>body{font-family:"Yu Gothic",sans-serif;margin:20px;color:#222}h1{color:#0B3556}
  .sum{font-size:20px;font-weight:800;margin:8px 0}.bar{height:14px;background:#eee;border-radius:8px;overflow:hidden;max-width:420px}
  .bar>i{display:block;height:100%;background:#3fa66a;width:${(pass+fail)?Math.round(pass/(pass+fail)*100):0}%}
  table{border-collapse:collapse;width:100%;margin:12px 0;font-size:13px}td,th{border:1px solid #dde;padding:6px 8px;text-align:left}
  tr.ok td{background:#f3faf5}tr.ng td{background:#fdecea}tr.sk td{background:#fff8e1}th{background:#0B3556;color:#fff}
  h2{color:#0B3556;margin-top:22px}.note{background:#fff8e1;border:1px solid #f0d98a;padding:10px;border-radius:8px;font-size:13px}</style></head>
  <body><h1>おはなしAI 自動スモークテスト結果</h1>
  <div class="sum">${pass} PASS ／ ${fail} FAIL ／ ${skip} SKIP（全${tot}）</div><div class="bar"><i></i></div>
  <p style="color:#667">実行: ${new Date().toLocaleString('ja-JP')} ／ CDN到達: ${cdnOK?'あり':'なし（CDN依存はSKIP）'} ／ page errors: ${pageErrors.length}</p>
  <h2>自動チェック（UI/DOM・通信モック）</h2>
  <table><tr><th></th><th>分類</th><th>項目</th><th>詳細</th><th>時間</th></tr>${rows}</table>
  <h2>🖐 手動確認が必要な項目（自動化できない）</h2>
  <div class="note">下記は仕組み上ブラウザ自動化では確認できません。実機チェックリスト（HTML）で確認してください。</div>
  <table><tr><th></th><th>分類</th><th>項目</th><th>理由</th></tr>${mrows}</table>
  ${pageErrors.length? '<h2>ページ内エラー</h2><pre style="background:#fdecea;padding:10px;border-radius:8px">'+esc(pageErrors.join('\n'))+'</pre>':''}
  </body></html>`;
  fs.writeFileSync(path.join(__dirname,'report.html'), html);
  console.log('レポート: test/report.html ／ test/report.json');
  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  process.exit(fail===0 ? 0 : 1);
})();
