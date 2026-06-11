/* ============================================================
   株式会社パイプラント 共通スクリプト
   ナビ挙動／現在ページのハイライト／スクロール演出／
   案内チャットボット（全ページ共通・自動挿入）
   ============================================================ */
(function(){
"use strict";

/* ===== nav behavior ===== */
const nav=document.getElementById('nav');
if(nav) addEventListener('scroll',()=>{nav.classList.toggle('scrolled',scrollY>40);});
const navToggle=document.getElementById('navtoggle');
const navLinks=document.getElementById('navlinks');
if(navToggle&&navLinks){
  navToggle.addEventListener('click',()=>navLinks.classList.toggle('show'));
  navLinks.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>navLinks.classList.remove('show')));
}

/* ===== 現在ページをナビ・フッターでハイライト ===== */
const here=(location.pathname.split('/').pop()||'index.html');
document.querySelectorAll('.nav-links a.lk, .ft-links a').forEach(a=>{
  if(a.getAttribute('href')===here){
    a.classList.add('active');
    a.setAttribute('aria-current','page');
  }
});

/* ===== scroll reveal ===== */
const io=new IntersectionObserver((es)=>{es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

/* ===== hero pipe draw（トップのみ） ===== */
addEventListener('load',()=>{
  document.querySelectorAll('.hero svg.pipes .pl').forEach((p,i)=>{
    const len=p.getTotalLength();
    p.style.strokeDasharray=len;p.style.strokeDashoffset=len;
    p.style.transition='stroke-dashoffset 1.8s ease '+(i*0.25)+'s';
    requestAnimationFrame(()=>{p.style.strokeDashoffset=0;});
  });
});

/* ===== 後日差し替えリンクの無効化 ===== */
document.querySelectorAll('[data-tbd-link]').forEach(el=>{
  el.addEventListener('click',e=>e.preventDefault());
});

/* ============================================================
   会社情報を config.js から全ページへ自動反映
   （管理者は config.js だけ編集すればOK）
   ============================================================ */
const S = window.SITE || {};
function telHref(n){ return 'tel:'+String(n||'').replace(/[^0-9+]/g,''); }
/* data-site="キー名" の要素にテキストを流し込む */
document.querySelectorAll('[data-site]').forEach(el=>{
  const key=el.getAttribute('data-site');
  if(key==='tel-link'){ if(S.tel){ el.setAttribute('href',telHref(S.tel)); } return; }
  if(key==='mail-link'){ if(S.email){ el.setAttribute('href','mailto:'+S.email); } return; }
  if(key==='address-full'){ el.textContent=(S.postal?S.postal+'　':'')+(S.address||''); return; }
  if(S[key]!=null && S[key]!=='') el.textContent=S[key];
});
/* tel: で始まるリンクは config の番号で統一（表記ゆれ防止） */
if(S.tel){
  document.querySelectorAll('a[href^="tel:"]').forEach(a=>a.setAttribute('href',telHref(S.tel)));
}
/* フッターの年号を自動更新（©表記の「西暦」を最新に） */
document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());

/* ===== Instagram / 地図リンクの自動有効化 ===== */
(function(){
  const ig=document.querySelector('[data-ig]');
  if(ig){
    if(S.instagramUrl){ ig.setAttribute('href',S.instagramUrl); ig.removeAttribute('aria-disabled'); ig.target='_blank'; ig.rel='noopener'; ig.textContent='Instagramをフォロー'; }
  }
  const mapWrap=document.querySelector('[data-map]');
  if(mapWrap && S.mapEmbed){
    mapWrap.innerHTML='<iframe title="所在地の地図" src="'+S.mapEmbed+'" width="100%" height="100%" style="border:0;min-height:inherit;border-radius:14px" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>';
    mapWrap.style.padding='0';mapWrap.style.border='0';
  }
})();

/* ===== canonical / og:url を公開URLから自動設定（SEO） ===== */
(function(){
  if(!S.siteUrl) return;
  const base=S.siteUrl.replace(/\/+$/,'');
  const url=base+'/'+here;
  let c=document.querySelector('link[rel="canonical"]');
  if(!c){ c=document.createElement('link'); c.rel='canonical'; document.head.appendChild(c); }
  c.href=url;
  let og=document.querySelector('meta[property="og:url"]');
  if(!og){ og=document.createElement('meta'); og.setAttribute('property','og:url'); document.head.appendChild(og); }
  og.content=url;
})();

/* ============================================================
   構造化データ（JSON-LD / 地域ビジネス）を自動生成
   → Google検索・地図での見え方を改善（ローカルSEO）
   ============================================================ */
(function(){
  try{
    const ld={
      "@context":"https://schema.org",
      "@type":"GeneralContractor",
      "name":S.companyName||"株式会社パイプラント",
      "telephone":S.tel||"",
      "faxNumber":S.fax||"",
      "url":S.siteUrl||location.origin,
      "areaServed":"福井県",
      "parentOrganization":S.group||"",
      "address":{
        "@type":"PostalAddress",
        "postalCode":(S.postal||"").replace(/[^0-9-]/g,''),
        "addressRegion":"福井県",
        "addressLocality":"坂井市",
        "streetAddress":(S.address||"").replace(/^福井県坂井市/,'')
      },
      "description":"高圧ガス・化学プラントの配管設備工事から次世代エネルギー『水素』まで。設計・製作・施工を一貫対応。"
    };
    if(S.email) ld.email=S.email;
    if(S.instagramUrl) ld.sameAs=[S.instagramUrl];
    const sc=document.createElement('script');
    sc.type='application/ld+json';
    sc.textContent=JSON.stringify(ld);
    document.head.appendChild(sc);
  }catch(e){}
})();

/* ============================================================
   トップへ戻るボタン（全ページ自動挿入）
   ============================================================ */
(function(){
  const btn=document.createElement('button');
  btn.className='to-top';btn.id='toTop';btn.setAttribute('aria-label','ページ上部へ戻る');
  btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 19V5M6 11l6-6 6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  document.body.appendChild(btn);
  addEventListener('scroll',()=>btn.classList.toggle('show',scrollY>600));
  btn.addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));
})();

/* ============================================================
   モバイル固定アクションバー（電話／お問い合わせ）
   → スマホで常に「電話・相談」へ到達でき、問い合わせ率を高める
   ============================================================ */
(function(){
  const bar=document.createElement('div');
  bar.className='mobile-cta';
  bar.innerHTML=
    '<a class="mc-tel" href="'+telHref(S.tel||'0776-51-9550')+'">'+
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>'+
      '電話する</a>'+
    '<a class="mc-contact" href="contact.html">'+
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 4h16v12H7l-3 3V4z" stroke-linejoin="round"/></svg>'+
      'お問い合わせ</a>';
  document.body.appendChild(bar);
})();

/* ============================================================
   お問い合わせフォーム（contact.html）の送信処理
   formEndpoint があればそこへ送信、無ければメール送信に切替
   ============================================================ */
(function(){
  const form=document.getElementById('contactForm');
  if(!form) return;
  const status=document.getElementById('formStatus');
  function say(msg,ok){ if(status){ status.textContent=msg; status.className='form-status'+(ok?' ok':' err'); } }
  form.addEventListener('submit',async (e)=>{
    e.preventDefault();
    if(!form.checkValidity()){ form.reportValidity(); return; }
    const data=new FormData(form);
    /* 送信先が未設定なら、メールソフトを開く方式にフォールバック */
    if(!S.formEndpoint){
      const to=S.email||'';
      const subj=encodeURIComponent('【お問い合わせ】'+(data.get('name')||''));
      const body=encodeURIComponent(
        'お名前：'+(data.get('name')||'')+'\n'+
        'ご連絡先：'+(data.get('contact')||'')+'\n'+
        'ご用件：'+(data.get('topic')||'')+'\n\n'+
        (data.get('message')||''));
      if(to){ window.location.href='mailto:'+to+'?subject='+subj+'&body='+body;
        say('メールソフトを開きました。内容をご確認のうえ送信してください。',true); }
      else { say('現在フォーム送信先が未設定です。お手数ですがお電話（'+(S.tel||'')+'）でご連絡ください。',false); }
      return;
    }
    try{
      say('送信しています…',true);
      const res=await fetch(S.formEndpoint,{method:'POST',body:data,headers:{'Accept':'application/json'}});
      if(res.ok){ form.reset(); say('送信しました。ありがとうございます。担当者よりご連絡いたします。',true); }
      else { say('送信に失敗しました。お手数ですがお電話（'+(S.tel||'')+'）でご連絡ください。',false); }
    }catch(err){ say('送信に失敗しました。お手数ですがお電話（'+(S.tel||'')+'）でご連絡ください。',false); }
  });
})();

/* ===== SCENARIO CHATBOT（全ページに自動挿入） ===== */
const PHONE="0776-51-9550";
const tree={
  root:{
    bot:["こんにちは！株式会社パイプラントの案内チャットです🔧","ご用件をお選びください。"],
    options:[
      {t:"🏭 工事・施工を依頼したい",go:"order"},
      {t:"👷 採用・働くことについて",go:"recruit"},
      {t:"📋 事業内容を知りたい",go:"biz"},
      {t:"💧 水素の取り組みについて",go:"h2"},
      {t:"🏢 会社概要・連絡先",go:"company"},
    ]
  },
  order:{
    bot:["ありがとうございます。どのような工事をご検討ですか？"],
    options:[
      {t:"プラント配管工事",go:"order_pipe"},
      {t:"機械の組立・据付・メンテナンス",go:"order_machine"},
      {t:"製缶加工（架台・塔槽・熱交換器 等）",go:"order_kankan"},
      {t:"断熱・足場・その他",go:"order_other"},
      {t:"← 最初に戻る",go:"root",back:true},
    ]
  },
  order_pipe:{
    bot:["プラント配管工事は当社の主力です。","各種プラント向け配管の製作・施工、LNG・LPGなど高圧ガス配管、高圧水素用ステンレス『HRX19』の溶接、食品・医療向けサニタリー配管、BA巻の自動溶接によるチュービング配管まで対応します。","設計から施工まで一貫してお任せいただけます。"],
    options:[
      {t:"📞 電話で相談する",href:"tel:"+PHONE,alt:true},
      {t:"✉ お問い合わせページへ",href:"contact.html",alt:true},
      {t:"📋 事業内容ページで詳しく見る",href:"business.html",alt:true},
      {t:"他の工事も見る",go:"order"},
      {t:"← 最初に戻る",go:"root",back:true},
    ]
  },
  order_machine:{
    bot:["工場設備の組立・現地据付、メンテナンス、設備故障時の緊急対応、定期保全まで対応します。","「定期保全を任せたい」といったご相談も歓迎です。"],
    options:[
      {t:"📞 電話で相談する",href:"tel:"+PHONE,alt:true},
      {t:"✉ お問い合わせページへ",href:"contact.html",alt:true},
      {t:"← 最初に戻る",go:"root",back:true},
    ]
  },
  order_kankan:{
    bot:["各種製缶加工に対応します。","配管用架台・スタンション・サポート、ステンレス製・鉄製の塔槽類、熱交換器、各種ダクト及び煙道、各種架台・歩廊などを製作します。"],
    options:[
      {t:"📞 電話で相談する",href:"tel:"+PHONE,alt:true},
      {t:"✉ お問い合わせページへ",href:"contact.html",alt:true},
      {t:"← 最初に戻る",go:"root",back:true},
    ]
  },
  order_other:{
    bot:["断熱工事や足場工事にも対応しています。","その他のご要望についてもご相談に応じますので、まずはお気軽にお問い合わせください。"],
    options:[
      {t:"📞 電話で相談する",href:"tel:"+PHONE,alt:true},
      {t:"✉ お問い合わせページへ",href:"contact.html",alt:true},
      {t:"← 最初に戻る",go:"root",back:true},
    ]
  },
  recruit:{
    bot:["採用にご興味をお持ちいただきありがとうございます👷","どんなことが知りたいですか？"],
    options:[
      {t:"未経験でも大丈夫？",go:"rec_exp"},
      {t:"どんな仕事をするの？",go:"rec_job"},
      {t:"募集要項・応募方法",go:"rec_apply"},
      {t:"👷 採用ページを見る",href:"recruit.html",alt:true},
      {t:"← 最初に戻る",go:"root",back:true},
    ]
  },
  rec_exp:{
    bot:["未経験の方も歓迎です。","専門性の高い配管技術を、先輩のサポートを受けながら一歩ずつ習得できます。一人ひとりの技術力に加え、チームワークを大切にする現場です。"],
    options:[
      {t:"募集要項を見たい",go:"rec_apply"},
      {t:"👷 採用ページを見る",href:"recruit.html",alt:true},
      {t:"← 最初に戻る",go:"root",back:true},
    ]
  },
  rec_job:{
    bot:["工場で使われる配管の設計から製作、施工までを担います。","プラント配管工事を中心に、機械の組立・据付、製缶加工など。水素ステーションやFCVなど、次世代エネルギーの最前線に関わるチャンスもあります。"],
    options:[
      {t:"未経験でも大丈夫？",go:"rec_exp"},
      {t:"募集要項を見たい",go:"rec_apply"},
      {t:"← 最初に戻る",go:"root",back:true},
    ]
  },
  rec_apply:{
    bot:["職種・給与・勤務時間・福利厚生などの詳細は、現在準備中です（※後日掲載）。","まずはお電話、またはお問い合わせフォームよりお気軽にご連絡ください。"],
    options:[
      {t:"📞 電話する（"+PHONE+"）",href:"tel:"+PHONE,alt:true},
      {t:"👷 採用ページへ移動",href:"recruit.html",alt:true},
      {t:"← 最初に戻る",go:"root",back:true},
    ]
  },
  biz:{
    bot:["当社の主な事業内容はこちらです。","①プラント配管工事（主力）②機械組立・据付・各種メンテナンス ③各種製缶加工 ④断熱・足場ほか。","詳しく知りたい分野はありますか？"],
    options:[
      {t:"プラント配管工事",go:"order_pipe"},
      {t:"機械組立・据付・メンテナンス",go:"order_machine"},
      {t:"製缶加工",go:"order_kankan"},
      {t:"水素の取り組み",go:"h2"},
      {t:"📋 事業内容ページを見る",href:"business.html",alt:true},
      {t:"← 最初に戻る",go:"root",back:true},
    ]
  },
  h2:{
    bot:["次世代エネルギー『水素』の分野に積極的に取り組んでいます💧","・水素ステーションの増設・新規開設工事\n・自動車（FCV）向け水素タンクの共同開発\n・水素用高圧配管等の工事\n・各化学プラント向けの水素燃料への転換工事"],
    options:[
      {t:"💧 水素への挑戦ページを見る",href:"hydrogen.html",alt:true},
      {t:"📞 電話で相談する",href:"tel:"+PHONE,alt:true},
      {t:"← 最初に戻る",go:"root",back:true},
    ]
  },
  company:{
    bot:["会社概要・連絡先はこちらです🏢","【名称】株式会社パイプラント\n【所在地】〒919-0411 福井県坂井市春江町藤鷲塚37-18\n【TEL／FAX】0776-51-9550 ／ 0776-51-9551\n【所属】ナカテックグループ"],
    options:[
      {t:"🏢 会社概要ページへ",href:"company.html",alt:true},
      {t:"📞 電話する",href:"tel:"+PHONE,alt:true},
      {t:"← 最初に戻る",go:"root",back:true},
    ]
  },
};

/* チャットボットのDOMを全ページに挿入（HTML側の重複記述を不要にする） */
document.body.insertAdjacentHTML('beforeend',
'<button class="cb-launch" id="cbLaunch" aria-label="チャットで相談する">'+
  '<span class="pulse"></span>'+
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.4 8.4 0 0 1-12 7.6L3 21l1.9-6A8.4 8.4 0 1 1 21 11.5z" stroke-linecap="round" stroke-linejoin="round"/></svg>'+
  'ご相談・採用チャット'+
'</button>'+
'<div class="cb-panel" id="cbPanel" role="dialog" aria-label="相談チャット">'+
  '<div class="cb-head">'+
    '<div class="ava"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 14h6a3 3 0 0 0 0-6h-6M7 8H5M7 14H5"/><circle cx="11" cy="8" r="1.6" fill="#fff" stroke="none"/><circle cx="11" cy="14" r="1.6" fill="#fff" stroke="none"/></svg></div>'+
    '<div class="ht"><b>パイプラント案内チャット</b><span>オンライン・自動応答</span></div>'+
    '<button class="x" id="cbClose" aria-label="閉じる">×</button>'+
  '</div>'+
  '<div class="cb-body" id="cbBody"></div>'+
  '<div class="cb-quick" id="cbQuick"></div>'+
'</div>');

const cbLaunch=document.getElementById('cbLaunch');
const cbPanel=document.getElementById('cbPanel');
const cbClose=document.getElementById('cbClose');
const cbBody=document.getElementById('cbBody');
const cbQuick=document.getElementById('cbQuick');
let cbStarted=false;

function botRow(text){
  const row=document.createElement('div');row.className='cb-row';
  row.innerHTML='<div class="bava"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M11 14h6a3 3 0 0 0 0-6h-6M7 8H5M7 14H5"/></svg></div>';
  const b=document.createElement('div');b.className='bubble';b.innerText=text;
  row.appendChild(b);cbBody.appendChild(row);cbBody.scrollTop=cbBody.scrollHeight;
}
function userRow(text){
  const b=document.createElement('div');b.className='bubble user';b.innerText=text;
  cbBody.appendChild(b);cbBody.scrollTop=cbBody.scrollHeight;
}
function typing(){
  const row=document.createElement('div');row.className='cb-row';row.id='typingRow';
  row.innerHTML='<div class="bava"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M11 14h6a3 3 0 0 0 0-6h-6"/></svg></div><div class="bubble"><div class="typing"><span></span><span></span><span></span></div></div>';
  cbBody.appendChild(row);cbBody.scrollTop=cbBody.scrollHeight;
}
function clearTyping(){const t=document.getElementById('typingRow');if(t)t.remove();}

function renderNode(key){
  const node=tree[key];if(!node)return;
  cbQuick.innerHTML='';
  typing();
  let i=0;
  const showNext=()=>{
    if(i<node.bot.length){
      if(i===0)clearTyping();
      botRow(node.bot[i]);i++;
      setTimeout(showNext,420);
    }else{
      renderOptions(node.options);
    }
  };
  setTimeout(showNext,520);
}
function renderOptions(options){
  cbQuick.innerHTML='';
  options.forEach(o=>{
    const btn=document.createElement('button');
    btn.className='qbtn'+(o.alt?' alt':'')+(o.back?' back':'');
    btn.innerText=o.t;
    btn.addEventListener('click',()=>{
      if(o.href){
        window.location.href=o.href;
        return;
      }
      if(!o.back)userRow(o.t);
      renderNode(o.go);
    });
    cbQuick.appendChild(btn);
  });
}
function openPanel(){
  cbPanel.classList.add('open');cbLaunch.style.display='none';
  if(!cbStarted){cbStarted=true;renderNode('root');}
}
function closePanel(){cbPanel.classList.remove('open');cbLaunch.style.display='';}
cbLaunch.addEventListener('click',openPanel);
cbClose.addEventListener('click',closePanel);

/* ESCキー：チャット／モバイルメニューを閉じる */
document.addEventListener('keydown',(e)=>{
  if(e.key!=='Escape')return;
  if(cbPanel.classList.contains('open'))closePanel();
  if(navLinks&&navLinks.classList.contains('show'))navLinks.classList.remove('show');
});
/* チャットの外側タップで閉じる */
document.addEventListener('click',(e)=>{
  if(!cbPanel.classList.contains('open'))return;
  if(cbPanel.contains(e.target)||cbLaunch.contains(e.target))return;
  closePanel();
});

})();
