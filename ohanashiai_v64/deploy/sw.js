/* おしゃべりAI Service Worker（更新お伺い式）
   方針：保存版を優先（cache-first）。表示中のバージョンは固定し、背景で勝手に書き換えない。
   新版は、このファイルの CACHE 名を変えて再アップロードしたときだけ用意され、
   利用者が「更新する」を選んだときに切り替わる（skipWaiting）。
   ★リリースのたびに CACHE の番号を必ず1つ上げること（例 v20 → v21）。これが更新の合図になる。
   ※ AIの返答は Anthropic API への通信が必要なので、完全オフラインでは会話できません。
   ※ iOS/Safari対策：redirected なレスポンスは表示を拒否されるため、必ず通常レスポンスに作り直す。 */
const CACHE = "ohanashi-ai-v419";   // ★リリースごとに必ず番号を1つ上げる
const ASSETS = ["./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./demo.pdf", "./videos/demo_intro.mp4"];   /* v64s13g：デモ用の資料。これが無いと通信が不調な会場でプレゼンが出ない */

/* redirected フラグ付きレスポンスは Safari がナビゲーションで拒否するため、通常レスポンスへ作り直す */
async function clean(res) {
  if (!res || !res.redirected) return res;
  const body = await res.blob();
  return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

self.addEventListener("install", (e) => {
  // skipWaiting しない：新版は「待機」状態でとどまり、利用者が更新を選ぶまで切り替わらない
  // v59j：addAll をやめ、各アセットを fetch→clean(redirect解決)→put。
  //   これで index.html は redirected=false でキャッシュされ、navigate 時に res.blob() が呼ばれず、
  //   iOS standalone(ホーム画面ショートカット)の WebKitBlobResourceError 1 を防ぐ。
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(ASSETS.map(async (url) => {
      try {
        const r = await fetch(url, { redirect: "follow", cache: "reload" });
        if (r && r.ok) { const cc = (await clean(r)) || r; await c.put(url, cc); }
      } catch (_) {}
    }));
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

/* ページ側で「更新する」が押されたら、待機中の新版を有効化する */
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || !req.url.startsWith(self.location.origin)) return; // API等はそのままネットへ

  // ページ遷移/起動：このバージョンの保存版 index.html を返す（背景での自動書き換えはしない＝勝手に変わらない）
  // v64s4：/selftest.html など index 以外のページ遷移は、素直にそのページを取りに行く
  //（従来は全ての遷移に index.html を返していたため、自己点検ページを開けなかった）
  if (req.mode === "navigate") {
    const _u = new URL(req.url);
    const _isApp = _u.pathname.endsWith("/") || _u.pathname.endsWith("/index.html");
    if (!_isApp) {
      e.respondWith((async () => {
        try { const r = await fetch(req); return (await clean(r)) || r; }
        catch (_) { const c = await caches.open(CACHE); const m = await c.match(_u.pathname.slice(_u.pathname.lastIndexOf("/") + 1) ? ("./" + _u.pathname.slice(_u.pathname.lastIndexOf("/") + 1)) : "./index.html"); return m || Response.error(); }
      })());
      return;
    }
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const cachedIndex = await c.match("./index.html");
      if (cachedIndex) return (await clean(cachedIndex)) || cachedIndex;
      try { const r = await fetch(req); return (await clean(r)) || r; }
      catch (_) { return Response.error(); }
    })());
    return;
  }

  // それ以外（アイコン・manifest等）も cache-first（背景書き換えなし）
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const cached = await c.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res && res.ok) { const cc = await clean(res.clone()); c.put(req, cc || res.clone()).catch(() => {}); }
      return (await clean(res)) || res;
    } catch (_) {
      const fb = await c.match("./index.html");
      return fb || Response.error();
    }
  })());
});
