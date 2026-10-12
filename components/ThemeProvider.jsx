'use client';

// ============================================================
// ThemeProvider — applies the PUBLISHED theme at runtime.
//
// Why custom properties and not compiled SCSS: the brief requires every visual
// setting to be changeable from the dashboard "without manually editing CSS"
// and previewed live. Compiled SCSS variables are frozen at build time; CSS
// custom properties are not. tokensToVars() projects the saved token set onto
// --bs-* and --pb-* variables, so stock Bootstrap components follow the theme
// without patching Bootstrap.
//
// The provider ALSO owns the surface-level controls the topbar exposes:
// light/dark/auto, language, and a local density preference. Those are stored
// per browser (cosmetics only) — never roles or credentials.
// ============================================================
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_TOKENS, sanitizeCustomCss } from '../lib/theme/schema';
import { tokensToVars, resolvedMode } from '../lib/theme/css';

const ThemeContext = createContext(null);

const LANG_KEY = 'pb_lang';
const MODE_KEY = 'pb_mode';
const CACHE_KEY = 'pb_theme_cache';

export const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'ur', label: 'اردو (Urdu)' },
  { id: 'ar', label: 'العربية (Arabic)' },
];

/** Apply a token set to a DOM element (root or a preview sandbox). */
export function applyVarsTo(target, tokens, mode) {
  if (!target) return {};
  const vars = tokensToVars(tokens);
  for (const [key, value] of Object.entries(vars)) {
    target.style.setProperty(key, value);
  }
  if (mode) target.setAttribute('data-bs-theme', mode);
  return vars;
}

export function ThemeProvider({ children }) {
  const [tokens, setTokens] = useState(DEFAULT_TOKENS);
  const [source, setSource] = useState('default'); // default | published
  const [loading, setLoading] = useState(true);
  const [mode, setModeState] = useState('light');
  const [systemMode, setSystemMode] = useState('light');
  const [language, setLanguage] = useState('en');
  const [quickPanel, setQuickPanel] = useState(false);
  const systemTokens = useRef(DEFAULT_TOKENS);

  /* ---------- load the published (public, cosmetic-only) theme ---------- */
  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/theme', { cache: 'no-store' });
      if (!res.ok) throw new Error('theme unavailable');
      const data = await res.json();
      // The endpoint returns projected vars + mode; rebuild tokens for editing.
      const next = data.tokens || null;
      const resolved = next || DEFAULT_TOKENS;
      systemTokens.current = resolved;
      setTokens(resolved);
      setSource('published');
      setModeState(data.mode || 'dark');
      // Paint immediately for this tab.
      applyVarsTo(document.documentElement, resolved, resolvedMode(resolved));
      // Cache for the no-flash script on the next navigation/load.
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          vars: tokensToVars(resolved),
          mode: resolvedMode(resolved),
          css: sanitizeCustomCss(resolved?.custom?.css || ''),
        }));
      } catch { /* private mode: paint still works, only the cache is skipped */ }
    } catch {
      setTokens(DEFAULT_TOKENS);
      setSource('default');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ---------- user preference (light / dark / auto) ---------- */
  useEffect(() => {
    const saved = localStorage.getItem(MODE_KEY);
    if (saved) setModeState(saved);
    const savedLang = localStorage.getItem(LANG_KEY);
    if (savedLang) setLanguage(savedLang);
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    setSystemMode(mq.matches ? 'light' : 'dark');
    const onChange = (e) => setSystemMode(e.matches ? 'light' : 'dark');
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  const effectiveMode = mode === 'auto' ? systemMode : mode;

  useEffect(() => {
    if (!loading) {
      document.documentElement.setAttribute('data-bs-theme', effectiveMode);
      document.documentElement.setAttribute('lang', language);
      document.documentElement.setAttribute('dir', language === 'ar' || language === 'ur' ? 'rtl' : 'ltr');
    }
  }, [effectiveMode, language, loading]);

  /* ---------- custom CSS from the published theme ---------- */
  useEffect(() => {
    const css = sanitizeCustomCss(tokens?.custom?.css || '');
    const id = 'pb-custom-css';
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('style');
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = css;
  }, [tokens]);

  const setMode = useCallback((next) => {
    setModeState(next);
    try { localStorage.setItem(MODE_KEY, next); } catch { /* ignore */ }
  }, []);

  const setLang = useCallback((next) => {
    setLanguage(next);
    try { localStorage.setItem(LANG_KEY, next); } catch { /* ignore */ }
  }, []);

  /** Preview a token set on the live DOM without persisting anything. */
  const previewTokens = useCallback((preview) => {
    applyVarsTo(document.documentElement, preview, resolvedMode(preview));
  }, []);

  /** Put the real published theme back after previewing. */
  const restoreTokens = useCallback(() => {
    applyVarsTo(document.documentElement, systemTokens.current, resolvedMode(systemTokens.current));
  }, []);

  /** Called after a successful publish so the whole app updates. */
  const adoptPublished = useCallback((nextTokens) => {
    const resolved = nextTokens || DEFAULT_TOKENS;
    systemTokens.current = resolved;
    setTokens(resolved);
    setModeState(resolvedMode(resolved));
    applyVarsTo(document.documentElement, resolved, resolvedMode(resolved));
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        vars: tokensToVars(resolved),
        mode: resolvedMode(resolved),
        css: sanitizeCustomCss(resolved?.custom?.css || ''),
      }));
    } catch { /* ignore */ }
  }, []);

  const vars = useMemo(() => tokensToVars(tokens), [tokens]);

  const value = useMemo(() => ({
    tokens,
    vars,
    loading,
    source,
    mode,
    effectiveMode,
    systemMode,
    language,
    quickPanel,
    setQuickPanel,
    setMode,
    setLang,
    reload: load,
    previewTokens,
    restoreTokens,
    adoptPublished,
    branding: tokens?.branding || DEFAULT_TOKENS.branding,
    tokensToVars,
  }), [tokens, vars, loading, source, mode, effectiveMode, systemMode, language, quickPanel, setMode, setLang, load, previewTokens, restoreTokens, adoptPublished]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

export { tokensToVars };
