/* =========================================================
   layout.js — 共通ヘッダー/フッター/固定CTA/言語切替を全ページに注入。
   各ページは <div id="site-header"></div> / <div id="site-footer"></div> を置くだけ。
   ========================================================= */
(function () {
  const NAV = [
    { href: "/index.html",   key: "nav.home",    label: "トップ" },
    { href: "/about.html",   key: "nav.about",   label: "私たちについて" },
    { href: "/members.html", key: "nav.members", label: "仲間図鑑" },
    { href: "/jobs.html",    key: "nav.jobs",    label: "働き方・職種" },
    { href: "/grow.html",    key: "nav.grow",    label: "定着と成長" },
    { href: "/future.html",  key: "nav.future",  label: "新しい挑戦" },
    { href: "/numbers.html", key: "nav.numbers", label: "数字で見る" },
    { href: "/faq.html",     key: "nav.faq",     label: "よくある質問" },
  ];

  const here = location.pathname.replace(/\/$/, "") || "/index.html";
  const isCurrent = (href) => here.endsWith(href) || (href === "/index.html" && (here === "" || here === "/"));

  function headerHTML() {
    const links = NAV.map(
      (n) => `<a href="${n.href}" data-i18n="${n.key}"${isCurrent(n.href) ? ' aria-current="page"' : ""}>${n.label}</a>`
    ).join("");
    return `
    <a class="skip-link" href="#main" data-i18n="a11y.skip">本文へスキップ</a>
    <header class="site-header">
      <div class="container nav">
        <a class="nav__brand" href="/index.html">
          <span class="nav__logo" aria-hidden="true">AT</span>
          <span><b>アセアンテクノロジー</b><span data-i18n="brand.tagline">仲間を集める採用サイト</span></span>
        </a>
        <nav class="nav__links" id="nav-links" aria-label="メインナビゲーション">${links}</nav>
        <div class="nav__actions">
          <div class="lang-switch">
            <button class="lang-switch__btn" id="lang-btn" aria-haspopup="true" aria-expanded="false">
              <span id="lang-flag">🇯🇵</span><span id="lang-label">日本語</span><span aria-hidden="true">▾</span>
            </button>
            <div class="lang-switch__menu" id="lang-menu" role="menu"></div>
          </div>
          <a class="btn btn--primary nav__entry" href="/entry.html" data-i18n="cta.entry">エントリー</a>
        </div>
        <button class="nav__burger" id="nav-burger" aria-label="メニュー" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </div>
    </header>`;
  }

  function footerHTML() {
    const links1 = NAV.slice(0, 4).map((n) => `<li><a href="${n.href}" data-i18n="${n.key}">${n.label}</a></li>`).join("");
    const links2 = NAV.slice(4).concat([{ href: "/entry.html", key: "nav.entry", label: "エントリー" }])
      .map((n) => `<li><a href="${n.href}" data-i18n="${n.key}">${n.label}</a></li>`).join("");
    return `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <b>アセアンテクノロジー株式会社</b>
            <p>
              人・モノ・企業のブリッジ役として、<br>
              あらゆる産業のグローバルビジネスを<br>
              トータルにサポートする。
            </p>
            <p class="muted">
              〒910-0833 福井県福井市新田塚1丁目25番18号（葵ビル4F）<br>
              設立：2006年7月
            </p>
          </div>
          <div><h4 data-i18n="footer.site">サイトマップ</h4><ul>${links1}</ul></div>
          <div><h4 data-i18n="footer.more">もっと知る</h4><ul>${links2}</ul></div>
        </div>
        <div class="footer-bottom">
          <span>© 2006–2026 ASEAN Technology Co., Ltd.</span>
          <span data-i18n="footer.note">本サイトの一部の数値・制度は検討中／確認中の項目を含みます。</span>
        </div>
      </div>
    </footer>`;
  }

  function buildLangMenu() {
    const menu = document.getElementById("lang-menu");
    menu.innerHTML = window.I18N.SUPPORTED.map(
      (l) => `<button role="menuitem" data-lang="${l}">
        <span>${window.I18N.LANG_FLAGS[l]}</span><span>${window.I18N.LANG_LABELS[l]}</span></button>`
    ).join("");
    menu.querySelectorAll("button").forEach((b) => {
      b.addEventListener("click", async () => {
        await window.I18N.setLang(b.dataset.lang);
        closeLangMenu();
      });
    });
  }

  function syncLangButton() {
    const l = window.I18N.lang;
    document.getElementById("lang-flag").textContent = window.I18N.LANG_FLAGS[l];
    document.getElementById("lang-label").textContent = window.I18N.LANG_LABELS[l];
    document.querySelectorAll("#lang-menu button").forEach((b) =>
      b.setAttribute("aria-selected", String(b.dataset.lang === l))
    );
  }

  function closeLangMenu() {
    document.getElementById("lang-menu").classList.remove("open");
    document.getElementById("lang-btn").setAttribute("aria-expanded", "false");
  }

  function wireInteractions() {
    const langBtn = document.getElementById("lang-btn");
    const langMenu = document.getElementById("lang-menu");
    langBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = langMenu.classList.toggle("open");
      langBtn.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".lang-switch")) closeLangMenu();
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLangMenu(); });

    const burger = document.getElementById("nav-burger");
    const links = document.getElementById("nav-links");
    burger.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      burger.setAttribute("aria-expanded", String(open));
    });
    links.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => { links.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); })
    );
  }

  async function boot() {
    document.getElementById("site-header").innerHTML = headerHTML();
    document.getElementById("site-footer").innerHTML = footerHTML();
    buildLangMenu();
    wireInteractions();
    await window.I18N.init();
    syncLangButton();
    document.addEventListener("i18n:changed", syncLangButton);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.LAYOUT = { NAV };
})();
