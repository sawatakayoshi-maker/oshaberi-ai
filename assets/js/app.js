/* =========================================================
   app.js — JSONデータを各ページに描画。
   コンテナ要素が存在するページだけ初期化される。
   ========================================================= */
(function () {
  const t = (k, fb) => (window.I18N ? window.I18N.t(k, fb) : fb);
  const isEn = () => window.I18N && window.I18N.lang === "en";

  async function getJSON(path) {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) throw new Error(`${path}: ${res.status}`);
    return res.json();
  }
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function initials(name) {
    if (!name || name.includes("[要確認]")) return "?";
    return name.trim().charAt(0);
  }
  const FLAG = { VN: "🇻🇳", TH: "🇹🇭", BR: "🇧🇷", ASEAN: "🌏" };

  // 画像が無い/読み込めない時は部署カラー背景＋イニシャルにフォールバック。
  // イニシャルを下地に置き、画像を絶対配置で重ねる。onerror で画像を外すとイニシャルが見える。
  function avatarHTML(member, deptColor, cls) {
    const ini = initials(member.name);
    const img = member.image
      ? `<img src="${esc(member.image)}" alt="${esc(member.name)}" loading="lazy"
             onerror="this.remove()"
             style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">`
      : "";
    return `<div class="${cls}" style="background:${deptColor};position:relative">
      <span aria-hidden="true">${esc(ini)}</span>${img}</div>`;
  }

  /* ---------------- 仲間図鑑 ---------------- */
  async function initMembers() {
    const grid = document.getElementById("member-grid");
    if (!grid) return;
    const data = await getJSON("/data/members.json");
    const depts = data.departments || {};
    const origins = data.origins || {};
    let fDept = "all", fOrigin = "all";

    // フィルタUI
    const deptWrap = document.getElementById("filter-dept");
    const originWrap = document.getElementById("filter-origin");
    function chip(value, label, active) {
      return `<button class="chip-toggle" data-value="${value}" aria-pressed="${active}">${esc(label)}</button>`;
    }
    function buildFilters() {
      deptWrap.innerHTML =
        `<span class="filter-label">${t("members.filterDept", "部署")}</span>` +
        chip("all", t("members.all", "すべて"), fDept === "all") +
        Object.entries(depts).map(([k, d]) =>
          chip(k, isEn() ? d.labelEn : d.label, fDept === k)).join("");
      originWrap.innerHTML =
        `<span class="filter-label">${t("members.filterOrigin", "出身")}</span>` +
        chip("all", t("members.all", "すべて"), fOrigin === "all") +
        Object.entries(origins).map(([k, o]) =>
          chip(k, `${o.flag} ${o.label}`, fOrigin === k)).join("");
      deptWrap.querySelectorAll("button").forEach((b) =>
        b.addEventListener("click", () => { fDept = b.dataset.value; render(); }));
      originWrap.querySelectorAll("button").forEach((b) =>
        b.addEventListener("click", () => { fOrigin = b.dataset.value; render(); }));
    }

    function cardHTML(m) {
      const dept = depts[m.department] || {};
      const color = dept.color || "#ccc";
      const deptLabel = isEn() ? dept.labelEn : dept.label;
      const flag = m.flagBadge ? `<span class="member-card__flag" title="${esc(m.flagBadge)}">${FLAG[m.flagBadge] || "🌏"}</span>` : "";
      const comment = m.comment && !m.comment.includes("[要確認]")
        ? `<p class="member-card__comment">${esc(m.comment)}</p>`
        : `<p class="member-card__comment todo-inline">[要確認]</p>`;
      return `<button class="member-card" style="--dept:${color}" data-id="${esc(m.id)}">
        ${flag}
        ${avatarHTML(m, color, "member-card__avatar")}
        <p class="member-card__name">${esc(m.name)}</p>
        <p class="member-card__role">${esc(deptLabel || "")}・${esc(m.role || "")}</p>
        ${comment}
      </button>`;
    }

    function render() {
      buildFilters();
      const list = data.members.filter((m) =>
        (fDept === "all" || m.department === fDept) &&
        (fOrigin === "all" || m.origin === fOrigin));
      grid.innerHTML = list.length
        ? list.map(cardHTML).join("")
        : `<p class="member-empty">${t("members.empty", "条件に合う仲間が見つかりませんでした。")}</p>`;
      grid.querySelectorAll(".member-card").forEach((c) =>
        c.addEventListener("click", () => openModal(c.dataset.id)));
    }

    function openModal(id) {
      const m = data.members.find((x) => x.id === id);
      if (!m) return;
      const dept = depts[m.department] || {};
      const color = dept.color || "#ccc";
      const field = (label, val) => {
        const todo = !val || String(val).includes("[要確認]");
        return `<div class="modal__field"><h4>${esc(label)}</h4>
          <p class="${todo ? "todo-inline" : ""}">${todo ? "[要確認]" : esc(val)}</p></div>`;
      };
      document.getElementById("modal-content").innerHTML = `
        <div class="modal__head">
          <button class="modal__close" aria-label="${t("a11y.close", "閉じる")}">✕</button>
          ${avatarHTML(m, color, "modal__avatar")}
          <h3 class="mt-0">${esc(m.name)}</h3>
          <p class="muted">${esc(isEn() ? dept.labelEn : dept.label)}・${esc(m.role || "")}
            ${m.flagBadge ? FLAG[m.flagBadge] || "🌏" : ""}</p>
        </div>
        <div class="modal__body">
          ${field(t("members.story.join", "入社理由"), m.story && m.story.joinReason)}
          ${field(t("members.story.day", "1日の流れ"), m.story && m.story.aDay)}
          ${field(t("members.story.message", "これから入る仲間へ"), m.story && m.story.message)}
        </div>`;
      const backdrop = document.getElementById("member-modal");
      backdrop.classList.add("open");
      backdrop.querySelector(".modal__close").addEventListener("click", closeModal);
      backdrop.querySelector(".modal__close").focus();
    }
    function closeModal() { document.getElementById("member-modal").classList.remove("open"); }
    const backdrop = document.getElementById("member-modal");
    if (backdrop) {
      backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeModal(); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
    }

    render();
    document.addEventListener("i18n:changed", render);
  }

  /* ---------------- カード系（services / jobs / programs / future） ---------------- */
  async function initCards(opts) {
    const wrap = document.getElementById(opts.id);
    if (!wrap) return;
    const data = await getJSON(opts.path);
    const items = data[opts.key];
    function render() {
      wrap.innerHTML = items.map(opts.tpl).join("");
    }
    render();
    document.addEventListener("i18n:changed", render);
  }

  /* ---------------- 数字カウンター ---------------- */
  async function initNumbers() {
    const wrap = document.getElementById("counter-grid");
    if (!wrap) return;
    const data = await getJSON("/data/numbers.json");
    wrap.innerHTML = data.stats.map((s) => {
      const has = s.value != null;
      return `<div class="counter">
        <div class="counter__value" data-target="${has ? s.value : ""}">
          ${has ? "0" : '<span class="todo-inline">[要確認]</span>'}${has ? `<span class="counter__unit">${esc(s.unit)}</span>` : ""}
        </div>
        <div class="counter__label">${esc(s.label)}
          ${s.hint ? `<small class="counter__todo muted">${esc(s.hint)}</small>` : ""}</div>
      </div>`;
    }).join("");

    // カウントアップ（値があるものだけ）
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        const target = parseFloat(el.dataset.target);
        if (!isNaN(target)) {
          let cur = 0; const step = target / 40;
          const unit = el.querySelector(".counter__unit");
          const unitHTML = unit ? unit.outerHTML : "";
          const tick = () => {
            cur += step;
            if (cur >= target) { el.innerHTML = target + unitHTML; }
            else { el.innerHTML = Math.round(cur) + unitHTML; requestAnimationFrame(tick); }
          };
          tick();
        }
        io.unobserve(el);
      });
    }, { threshold: 0.4 });
    wrap.querySelectorAll(".counter__value[data-target]").forEach((el) => {
      if (el.dataset.target) io.observe(el);
    });
  }

  /* ---------------- FAQ ---------------- */
  async function initFaq() {
    const wrap = document.getElementById("faq-list");
    if (!wrap) return;
    const data = await getJSON("/data/faq.json");
    wrap.innerHTML = data.faqs.map((f, i) => `
      <div class="faq-item" aria-expanded="false">
        <button class="faq-q" aria-controls="faq-a-${i}">
          <span>${esc(f.q)}</span><span class="chevron" aria-hidden="true">▾</span>
        </button>
        <div class="faq-a" id="faq-a-${i}">${esc(f.a)}</div>
      </div>`).join("");
    wrap.querySelectorAll(".faq-item").forEach((item) => {
      item.querySelector(".faq-q").addEventListener("click", () => {
        const open = item.getAttribute("aria-expanded") === "true";
        item.setAttribute("aria-expanded", String(!open));
      });
    });
  }

  /* ---------------- エントリーフォーム ---------------- */
  function initEntry() {
    const form = document.getElementById("entry-form");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      // 実送信先は [要確認]。デモのためコンソール出力のみ。
      console.log("[エントリー送信内容 / Entry payload]", data);
      const msg = document.getElementById("form-msg");
      msg.textContent = t("entry.sent", "送信内容を確認しました（デモのためコンソールに出力しました）。");
      msg.classList.add("ok");
      form.reset();
    });
  }

  /* ---------------- 初期化 ---------------- */
  async function boot() {
    // i18n初期化を待つ（layout.js が先に init する）
    try {
      await initMembers();
      await initNumbers();
      await initFaq();
      initEntry();
      await initCards({
        id: "services-grid", path: "/data/services.json", key: "services",
        tpl: (s) => `<article class="card card--hover">
          <div class="card__icon" style="background:${s.color}">${s.icon}</div>
          <h3>${esc(s.title)} <small class="muted">${esc(s.titleEn)}</small></h3>
          <p><strong>${esc(s.lead)}</strong></p>
          <p>${esc(s.forSeeker)}</p>
          <ul class="muted" style="padding-left:1.1em;margin:8px 0 0">
            ${s.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
        </article>`,
      });
      await initCards({
        id: "jobs-grid", path: "/data/jobs.json", key: "jobs",
        tpl: (j) => `<article class="card card--hover">
          <div class="card__icon" style="background:${j.color}">${j.icon}</div>
          <h3>${esc(j.title)}</h3>
          <p><strong>${t("jobs.fit", "向いている人")}：</strong>${esc(j.fit)}</p>
          <p><strong>${t("jobs.work", "仕事内容")}：</strong>${esc(j.work)}</p>
          <p><span class="req-flag">${t("jobs.experience", "未経験可否")}</span> ${esc(j.experience)}</p>
        </article>`,
      });
      await initCards({
        id: "programs-grid", path: "/data/programs.json", key: "programs",
        tpl: (p) => `<article class="card card--hover">
          <div class="card__icon" style="background:${p.color}">${p.icon}</div>
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.desc)}</p>
          <span class="badge-note">${esc(p.status)}</span>
        </article>`,
      });
      await initCards({
        id: "future-grid", path: "/data/future.json", key: "ideas",
        tpl: (f) => `<article class="card card--hover">
          <div class="card__icon" style="background:${f.color}">${f.icon}</div>
          <h3>${esc(f.title)}</h3>
          <p><strong>${esc(f.overview)}</strong></p>
          <p>${esc(f.benefit)}</p>
        </article>`,
      });
    } catch (e) {
      console.error("[app] 初期化エラー", e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }
})();
