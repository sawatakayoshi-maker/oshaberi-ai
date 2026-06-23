/* =========================================================
   i18n — 自前の軽量多言語。ビルドなし。
   /i18n/<lang>.json を fetch して data-i18n 属性に適用。
   JA/EN を実装、VN(vi)/TH(th)/PT(pt) はキー構造のみ（空文字フォールバック）。
   ========================================================= */
(function () {
  const SUPPORTED = ["ja", "en", "vi", "th", "pt"];
  const DEFAULT_LANG = "ja";
  const STORAGE_KEY = "asean.lang";

  const LANG_LABELS = {
    ja: "日本語", en: "English", vi: "Tiếng Việt", th: "ภาษาไทย", pt: "Português",
  };
  const LANG_FLAGS = { ja: "🇯🇵", en: "🇬🇧", vi: "🇻🇳", th: "🇹🇭", pt: "🇧🇷" };

  const state = { lang: DEFAULT_LANG, dict: {}, fallback: {} };

  function detectLang() {
    const url = new URLSearchParams(location.search).get("lang");
    if (url && SUPPORTED.includes(url)) return url;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED.includes(saved)) return saved;
    return DEFAULT_LANG;
  }

  async function loadDict(lang) {
    try {
      const res = await fetch(`/i18n/${lang}.json`, { cache: "no-cache" });
      if (!res.ok) throw new Error(res.status);
      return await res.json();
    } catch (e) {
      console.warn(`[i18n] ${lang}.json を読み込めませんでした`, e);
      return {};
    }
  }

  // ドット記法 "nav.home" を解決
  function resolve(dict, key) {
    return key.split(".").reduce((o, k) => (o && o[k] != null ? o[k] : undefined), dict);
  }

  function t(key, fallbackText) {
    const v = resolve(state.dict, key);
    if (v != null && v !== "") return v;
    const fb = resolve(state.fallback, key);
    if (fb != null && fb !== "") return fb;
    return fallbackText != null ? fallbackText : key;
  }

  function applyTranslations(root) {
    root = root || document;
    // テキスト
    root.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const val = t(key, el.textContent);
      if (val) el.textContent = val;
    });
    // HTML（改行や強調を含む文）
    root.querySelectorAll("[data-i18n-html]").forEach((el) => {
      const key = el.getAttribute("data-i18n-html");
      const val = t(key, el.innerHTML);
      if (val) el.innerHTML = val;
    });
    // 属性 data-i18n-attr="placeholder:entry.namePh;aria-label:..."
    root.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      el.getAttribute("data-i18n-attr").split(";").forEach((pair) => {
        const [attr, key] = pair.split(":").map((s) => s.trim());
        if (attr && key) {
          const val = t(key, el.getAttribute(attr) || "");
          if (val) el.setAttribute(attr, val);
        }
      });
    });
  }

  async function setLang(lang, opts) {
    opts = opts || {};
    if (!SUPPORTED.includes(lang)) lang = DEFAULT_LANG;
    state.lang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    if (lang === DEFAULT_LANG) {
      state.fallback = state.dict = await loadDict(DEFAULT_LANG);
    } else {
      if (!Object.keys(state.fallback).length) state.fallback = await loadDict(DEFAULT_LANG);
      state.dict = await loadDict(lang);
    }
    applyTranslations(document);
    document.dispatchEvent(new CustomEvent("i18n:changed", { detail: { lang } }));
  }

  async function init() {
    await setLang(detectLang());
  }

  window.I18N = {
    SUPPORTED, LANG_LABELS, LANG_FLAGS, DEFAULT_LANG,
    t, setLang, applyTranslations, init,
    get lang() { return state.lang; },
  };
})();
