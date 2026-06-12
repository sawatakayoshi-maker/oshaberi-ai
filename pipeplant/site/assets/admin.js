/* ============================================================
   管理画面（admin.html）ロジック
   ・会社情報／お知らせ／施工事例を localStorage に保存
   ・公開ページ(site.js)が同じ端末・ブラウザで自動反映
   ・「公開用ファイルを書き出し」で本番反映用のJSを生成
   ※ デモ運用：保存は閲覧者には共有されません（同端末内）。
     全員に反映するには書き出したファイルをサーバーへ設置します。
   ============================================================ */
(function(){
"use strict";

/* ---- 簡易パスコード（本格的な認証ではありません） ---- */
var PASSCODE = "pipeplant";   // ← 必要に応じて変更してください

var LS = {
  site:'pp_site', news:'pp_news', works:'pp_works', auth:'pp_admin_auth'
};
function load(key, def){ try{ var v=JSON.parse(localStorage.getItem(key)||'null'); return v==null?def:v; }catch(e){ return def; } }
function save(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

/* ===== ログイン ===== */
var loginEl=document.getElementById('admLogin');
var appEl=document.getElementById('admApp');
function showApp(){ loginEl.style.display='none'; appEl.style.display='block'; initApp(); }
if(sessionStorage.getItem(LS.auth)==='1'){ showApp(); }
document.getElementById('admLoginBtn').addEventListener('click', tryLogin);
document.getElementById('admPass').addEventListener('keydown', function(e){ if(e.key==='Enter') tryLogin(); });
function tryLogin(){
  var v=document.getElementById('admPass').value;
  if(v===PASSCODE){ sessionStorage.setItem(LS.auth,'1'); showApp(); }
  else { document.getElementById('admErr').textContent='パスコードが違います。'; }
}
document.getElementById('admLogout').addEventListener('click', function(){
  sessionStorage.removeItem(LS.auth); location.reload();
});

/* ===== タブ切替 ===== */
function initApp(){
  document.querySelectorAll('.adm-tab').forEach(function(t){
    t.addEventListener('click', function(){
      document.querySelectorAll('.adm-tab').forEach(x=>x.classList.remove('on'));
      document.querySelectorAll('.adm-panel').forEach(x=>x.classList.remove('on'));
      t.classList.add('on');
      document.getElementById('panel-'+t.dataset.tab).classList.add('on');
    });
  });
  initSite(); initRecruit(); initNews(); initWorks(); initExport();
}

function flash(id){ var el=document.getElementById(id); if(!el)return; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),1800); }

/* ============================================================
   1) 会社情報
   ============================================================ */
var SITE_FIELDS=['companyName','group','postal','address','tel','fax','email',
  'instagramUrl','tiktokUrl','youtubeUrl','xUrl','siteUrl','mapEmbed','formEndpoint','gaId','utmCampaign',
  /* 採用（募集要項） */
  'recJobTitle','recEmployment','recSalary','recSalaryMin','recSalaryMax',
  'recHours','recHolidays','recBenefits','recDatePosted','recValidThrough'];
function initSite(){
  var base=(window.SITE||{});
  var saved=load(LS.site,{});
  SITE_FIELDS.forEach(function(k){
    var el=document.getElementById('site-'+k);
    if(el) el.value=(saved[k]!=null?saved[k]:(base[k]||''));
  });
  document.getElementById('siteSave').addEventListener('click', function(){
    var obj={};
    SITE_FIELDS.forEach(function(k){ var el=document.getElementById('site-'+k); if(el) obj[k]=el.value.trim(); });
    save(LS.site,obj); flash('siteSaved');
  });
  document.getElementById('siteReset').addEventListener('click', function(){
    if(!confirm('会社情報の変更を取り消し、初期値(config.js)に戻しますか？'))return;
    localStorage.removeItem(LS.site); initSite();
  });
}

/* ============================================================
   1.5) 採用・SNS（募集要項の保存＋SNS用UTMリンク生成）
   ============================================================ */
function initRecruit(){
  /* 「今日の日付を入れる」ボタン */
  var btn=document.getElementById('recToday');
  if(btn) btn.addEventListener('click', function(){
    var d=new Date(), z=function(n){return ('0'+n).slice(-2);};
    document.getElementById('site-recDatePosted').value=d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate());
  });
  /* 保存（会社情報と同じ pp_site に保存。採用項目もまとめて1か所管理） */
  var saveBtn=document.getElementById('recSave');
  if(saveBtn) saveBtn.addEventListener('click', function(){
    var obj=load(LS.site,{});
    SITE_FIELDS.forEach(function(k){
      var el=document.getElementById('site-'+k);
      if(el) obj[k]=el.value.trim();
    });
    /* 職種が入力済みで掲載開始日が空なら、今日の日付を自動セット */
    if(obj.recJobTitle && !obj.recDatePosted){
      var d=new Date(), z=function(n){return ('0'+n).slice(-2);};
      obj.recDatePosted=d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate());
      var el=document.getElementById('site-recDatePosted'); if(el) el.value=obj.recDatePosted;
    }
    save(LS.site,obj); flash('recSaved'); renderUtm();
  });
  renderUtm();
}
/* SNSに貼るUTM付きリンクの一覧（コピー用） */
function renderUtm(){
  var box=document.getElementById('utmList');
  if(!box) return;
  var conf=Object.assign({}, window.SITE||{}, load(LS.site,{}));
  var base=(conf.siteUrl||'').replace(/\/+$/,'');
  if(!base){
    box.innerHTML='<p class="adm-note">先に「🏢 会社情報」タブで「サイトの公開URL」を入力・保存してください。</p>';
    return;
  }
  var camp=encodeURIComponent(conf.utmCampaign||'recruit2026');
  var media=[['TikTok','tiktok','social','プロフィール・固定コメントに貼る'],
             ['Instagram','instagram','social','プロフィール・ストーリーズに貼る'],
             ['YouTube','youtube','social','概要欄・固定コメントに貼る'],
             ['X（旧Twitter）','x','social','プロフィール・固定ポストに貼る'],
             ['チラシ・名刺（QRコード用）','print','offline','QRコード化して印刷物に使う']];
  box.innerHTML=media.map(function(m){
    var url=base+'/recruit.html?utm_source='+m[1]+'&utm_medium='+m[2]+'&utm_campaign='+camp;
    return '<div class="adm-item"><div class="it-main"><div class="meta">'+m[0]+'　─　'+m[3]+'</div>'+
      '<b style="word-break:break-all;font-weight:500;font-size:.85rem">'+url+'</b></div>'+
      '<div class="it-act"><button data-copy="'+url+'">コピー</button></div></div>';
  }).join('');
  box.querySelectorAll('[data-copy]').forEach(function(b){
    b.addEventListener('click', function(){
      var t=b.getAttribute('data-copy');
      (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(
        function(){ b.textContent='✓ コピーしました'; setTimeout(function(){b.textContent='コピー';},1600); },
        function(){ prompt('このリンクをコピーしてください', t); });
    });
  });
}

/* ============================================================
   2) お知らせ
   ============================================================ */
function getNews(){ var n=load(LS.news,null); return Array.isArray(n)?n:((window.NEWS||[]).slice()); }
function initNews(){ renderNews(); bindNewsForm(); }
function renderNews(){
  var list=getNews(); var box=document.getElementById('newsItems');
  box.innerHTML = list.length? list.map(function(n,i){
    return '<div class="adm-item"><div class="it-main"><div class="meta">'+esc(n.date||'')+'　'+esc(n.tag||'')+'</div>'+
      '<b>'+esc(n.title||'')+'</b>'+(n.body?'<p>'+esc(n.body)+'</p>':'')+'</div>'+
      '<div class="it-act"><button data-up="'+i+'">↑</button><button data-edit="'+i+'">編集</button><button class="del" data-del="'+i+'">削除</button></div></div>';
  }).join('') : '<p class="adm-note">お知らせはまだありません。下のフォームから追加してください。</p>';
  box.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',function(){
    if(!confirm('このお知らせを削除しますか？'))return;
    var l=getNews(); l.splice(+b.dataset.del,1); save(LS.news,l); renderNews();
  }));
  box.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',function(){
    var n=getNews()[+b.dataset.edit];
    document.getElementById('nw-date').value=n.date||''; document.getElementById('nw-tag').value=n.tag||'';
    document.getElementById('nw-title').value=n.title||''; document.getElementById('nw-body').value=n.body||'';
    document.getElementById('nw-link').value=n.link||'';
    var l=getNews(); l.splice(+b.dataset.edit,1); save(LS.news,l); renderNews();
    window.scrollTo({top:document.getElementById('newsForm').offsetTop-80,behavior:'smooth'});
  }));
  box.querySelectorAll('[data-up]').forEach(b=>b.addEventListener('click',function(){
    var i=+b.dataset.up; if(i<=0)return; var l=getNews(); var t=l[i-1];l[i-1]=l[i];l[i]=t; save(LS.news,l); renderNews();
  }));
}
function bindNewsForm(){
  document.getElementById('newsAdd').addEventListener('click', function(){
    var item={
      date:document.getElementById('nw-date').value||today(),
      tag:document.getElementById('nw-tag').value.trim()||'お知らせ',
      title:document.getElementById('nw-title').value.trim(),
      body:document.getElementById('nw-body').value.trim(),
      link:document.getElementById('nw-link').value.trim()
    };
    if(!item.title){ alert('見出しを入力してください。'); return; }
    var l=getNews(); l.unshift(item); save(LS.news,l);
    ['nw-tag','nw-title','nw-body','nw-link'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('nw-date').value='';
    renderNews(); flash('newsSaved');
  });
}

/* ============================================================
   3) 施工事例
   ============================================================ */
function getWorks(){ return load(LS.works,[]); }
function initWorks(){ renderWorks(); bindWorksForm(); }
function renderWorks(){
  var list=getWorks(); var box=document.getElementById('worksItems');
  box.innerHTML = list.length? list.map(function(w,i){
    var img=w.img?'<img class="ico" src="'+w.img+'" alt="">':'<div class="ico"></div>';
    return '<div class="adm-item">'+img+'<div class="it-main"><div class="meta">'+esc(w.cat||'')+'</div><b>'+esc(w.title||'')+'</b>'+
      (w.desc?'<p>'+esc(w.desc)+'</p>':'')+'</div>'+
      '<div class="it-act"><button class="del" data-del="'+i+'">削除</button></div></div>';
  }).join('') : '<p class="adm-note">施工事例はまだ登録されていません。登録すると施工事例ページに反映されます。</p>';
  box.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',function(){
    if(!confirm('この施工事例を削除しますか？'))return;
    var l=getWorks(); l.splice(+b.dataset.del,1); save(LS.works,l); renderWorks();
  }));
}
function bindWorksForm(){
  var imgData='';
  var fileInput=document.getElementById('wk-img');
  fileInput.addEventListener('change', function(){
    var f=fileInput.files&&fileInput.files[0]; if(!f)return;
    resizeImage(f, 1200, function(dataUrl){ imgData=dataUrl; document.getElementById('wk-prev').src=dataUrl; document.getElementById('wk-prev').style.display='block'; });
  });
  document.getElementById('worksAdd').addEventListener('click', function(){
    var item={
      cat:document.getElementById('wk-cat').value.trim(),
      title:document.getElementById('wk-title').value.trim(),
      desc:document.getElementById('wk-desc').value.trim(),
      tags:document.getElementById('wk-tags').value.split(/[,、]/).map(s=>s.trim()).filter(Boolean),
      img:imgData
    };
    if(!item.title){ alert('工事名（タイトル）を入力してください。'); return; }
    var l=getWorks(); l.unshift(item); save(LS.works,l);
    ['wk-cat','wk-title','wk-desc','wk-tags'].forEach(id=>document.getElementById(id).value='');
    imgData=''; document.getElementById('wk-prev').style.display='none'; fileInput.value='';
    renderWorks(); flash('worksSaved');
  });
}
/* 画像を縮小してdataURL化（容量を抑える） */
function resizeImage(file, maxW, cb){
  var url=URL.createObjectURL(file); var img=new Image();
  img.onload=function(){
    var sc=Math.min(1, maxW/(img.naturalWidth||img.width));
    var w=Math.round((img.naturalWidth||img.width)*sc), h=Math.round((img.naturalHeight||img.height)*sc);
    var cv=document.createElement('canvas'); cv.width=w; cv.height=h;
    cv.getContext('2d').drawImage(img,0,0,w,h);
    URL.revokeObjectURL(url);
    cb(cv.toDataURL('image/jpeg',0.82));
  };
  img.onerror=function(){ URL.revokeObjectURL(url); alert('画像を読み込めませんでした。'); };
  img.src=url;
}

/* ============================================================
   4) 公開用ファイルの書き出し（本番反映用）
   ============================================================ */
function initExport(){
  document.getElementById('expConfig').addEventListener('click', function(){
    var base=Object.assign({}, window.SITE||{}, load(LS.site,{}));
    var body='/* config.js — 管理画面から書き出し */\nwindow.SITE = '+JSON.stringify(base,null,2)+';\n';
    download('config.js', body);
  });
  document.getElementById('expNews').addEventListener('click', function(){
    var body='/* news.js — 管理画面から書き出し */\nwindow.NEWS = '+JSON.stringify(getNews(),null,2)+';\n';
    download('news.js', body);
  });
  document.getElementById('expWorks').addEventListener('click', function(){
    var body='/* works.js — 管理画面から書き出し（works.htmlで読み込んでください） */\nwindow.WORKS = '+JSON.stringify(getWorks(),null,2)+';\n';
    download('works.js', body);
  });
  document.getElementById('expPreview').addEventListener('click', function(){
    var p=document.getElementById('expPrev');
    p.textContent='■ 会社情報(config.js)\n'+JSON.stringify(Object.assign({},window.SITE||{},load(LS.site,{})),null,2)+
      '\n\n■ お知らせ(news.js)\n'+JSON.stringify(getNews(),null,2)+
      '\n\n■ 施工事例(works.js)\n'+JSON.stringify(getWorks().map(w=>({cat:w.cat,title:w.title,desc:w.desc,tags:w.tags,img:w.img?'(画像データ)':''})),null,2);
    p.style.display='block';
  });
  document.getElementById('clearAll').addEventListener('click', function(){
    if(!confirm('管理画面で保存した内容（会社情報・お知らせ・施工事例）をすべて消去して初期状態に戻しますか？'))return;
    [LS.site,LS.news,LS.works].forEach(k=>localStorage.removeItem(k));
    alert('初期化しました。'); location.reload();
  });
}
function download(name, text){
  var blob=new Blob([text],{type:'text/javascript'});
  var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

/* ---- utils ---- */
function esc(s){ return String(s||'').replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
function today(){ var d=new Date(); var p=n=>String(n).padStart(2,'0'); return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); }

})();
