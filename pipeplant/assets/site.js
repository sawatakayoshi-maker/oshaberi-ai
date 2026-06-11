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

})();
