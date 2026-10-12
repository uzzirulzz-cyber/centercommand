'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { APPS, APP_COLORS } from '../lib/apps';
import { NOTIFICATIONS, CUSTOMERS, ORDERS, LEADS } from '../lib/data';
import { useSession } from './SessionProvider';
import { applyTheme, DEFAULT_THEME } from '../lib/theme';
import { NAV_SECTIONS as MODULE_NAV } from '../lib/modules';
import PlayBeatOrbitMark from './PlayBeatOrbitMark';

// Sidebar navigation comes from the module registry (lib/modules.js) — the
// single source of truth — so every page that exists is reachable from the
// shell instead of a hand-maintained subset. The per-application detail links
// are appended here because they are generated from the App Registry.
const NAV_SECTIONS = [
  ...MODULE_NAV,
  {
    label: 'Connected applications',
    items: [
      ...APPS.map((a) => ({ href: `/admin/apps/${a.slug}`, icon: 'bi-circle-fill', label: a.name, slug: a.slug })),
    ],
  },
];

function Brand({ collapsed = false }) {
  return (
    <Link href="/admin" className={`pb-brand ${collapsed ? 'is-collapsed' : ''}`} title={collapsed ? 'PlayBeat Digital' : undefined}>
      <PlayBeatOrbitMark size="nav" />
      {!collapsed && <span>
        <strong style={{ fontSize: '.98rem', letterSpacing: '.01em' }}>PlayBeat Digital</strong>
        <small>Central Administration</small>
      </span>}
    </Link>
  );
}

function SidebarNav({ liveStatuses, onNavigate, layout, collapsed = false }) {
  const pathname = usePathname();
  const order = layout?.navOrder || [];
  const hidden = new Set(layout?.hiddenNav || []);
  const pinned = new Set(layout?.pinnedNav || []);
  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !hidden.has(item.href)).sort((a, b) => {
      if (pinned.has(a.href) !== pinned.has(b.href)) return pinned.has(a.href) ? -1 : 1;
      const ia = order.indexOf(a.href), ib = order.indexOf(b.href);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    }),
  })).filter((section) => section.items.length);
  return (
    <nav className="pb-sidebar-body" aria-label="Admin navigation">
      {sections.map((section) => (
        <div key={section.label}>
          <div className="pb-nav-section">{collapsed ? '·' : section.label}</div>
          {section.items.map((item) => {
            const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
            // Live status drives the dot when we have it; the registry value is
            // only a fallback so a stale dot is never presented as live truth.
            const dot = item.slug ? (liveStatuses?.[item.slug]?.status || 'pending') : null;
            return (
              <Link key={item.href} href={item.href} onClick={onNavigate}
                className={`pb-navlink ${active ? 'active' : ''}`} title={collapsed ? item.label : undefined} aria-label={collapsed ? item.label : undefined}>
                <span className="pb-ico" aria-hidden="true"><i className={`bi ${item.icon}`} /></span>
                <span className="text-truncate">{item.label}</span>
                {item.slug && <span className={`pb-appdot ${dot}`} title={`Status: ${dot}`} />}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function Breadcrumbs() {
  const pathname = usePathname();
  const segs = pathname.split('/').filter(Boolean);
  const crumbs = segs.map((s, i) => ({
    label: s === 'admin' ? 'Dashboard' : decodeURIComponent(s).replace(/-/g, ' '),
    href: '/' + segs.slice(0, i + 1).join('/'),
  }));
  return (
    <nav className="pb-crumb d-none d-md-block" aria-label="Breadcrumb">
      {crumbs.map((c, i) => (
        <span key={c.href}>
          {i > 0 && <span className="mx-1">/</span>}
          {i === crumbs.length - 1 ? (
            <span style={{ color: 'var(--bs-emphasis-color)', textTransform: 'capitalize' }}>{c.label}</span>
          ) : (
            <Link href={c.href} style={{ textTransform: 'capitalize' }}>{c.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}

function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    if (!q.trim()) return [];
    const needle = q.toLowerCase();
    const out = [];
    CUSTOMERS.filter((c) => c.name.toLowerCase().includes(needle) || c.email.includes(needle))
      .slice(0, 3).forEach((c) => out.push({ label: c.name, meta: `Customer · ${c.sourceId}`, href: '/admin/customers' }));
    ORDERS.filter((o) => o.orderNo.toLowerCase().includes(needle))
      .slice(0, 3).forEach((o) => out.push({ label: o.orderNo, meta: `Order · ${fmtShort(o)}`, href: '/admin/orders' }));
    LEADS.filter((l) => l.name.toLowerCase().includes(needle))
      .slice(0, 2).forEach((l) => out.push({ label: l.name, meta: `Lead · ${l.stage}`, href: '/admin/customers' }));
    APPS.filter((a) => a.name.toLowerCase().includes(needle))
      .slice(0, 2).forEach((a) => out.push({ label: a.name, meta: 'Application', href: `/admin/apps/${a.slug}` }));
    return out.slice(0, 8);
  }, [q]);

  return (
    <div className="position-relative flex-grow-1" style={{ maxWidth: 420 }}>
      <input
        className="form-control form-control-sm"
        placeholder="Search customers, orders, apps…"
        value={q}
        aria-label="Global search"
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && results.length > 0 && (
        <div className="dropdown-menu show mt-1 w-100" role="listbox">
          {results.map((r, i) => (
            <button key={i} className="dropdown-item d-flex justify-content-between gap-3"
              onMouseDown={() => { router.push(r.href); setQ(''); }}>
              <span>{r.label}</span>
              <small style={{ color: 'var(--bs-secondary-color)' }}>{r.meta}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
const fmtShort = (o) => `${o.currency} ${o.amount.toLocaleString()}`;

function ThemeToggle({ theme }) {
  const [mode, setMode] = useState('auto');
  useEffect(() => {
    const saved = localStorage.getItem('pb_theme_mode') || theme?.appearance || 'auto';
    setMode(saved);
    applyTheme(theme || DEFAULT_THEME, saved);
  }, [theme]);
  const setAppearance = (next) => {
    setMode(next);
    localStorage.setItem('pb_theme_mode', next);
    applyTheme(theme || DEFAULT_THEME, next);
  };
  return (
    <select className="form-select form-select-sm pb-appearance-select" aria-label="Color appearance" value={mode} onChange={(e) => setAppearance(e.target.value)}>
      <option value="auto">System</option><option value="light">Light</option><option value="dark">Dark</option>
    </select>
  );
}

export default function AdminShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, status, signOut, api } = useSession();
  const [liveStatuses, setLiveStatuses] = useState(null);
  const [layout, setLayout] = useState({});
  const [publishedTheme, setPublishedTheme] = useState(DEFAULT_THEME);
  const bootstrapped = useRef(false);

  useEffect(() => {
    // Bootstrap JS is needed for the off-canvas sidebar and dropdowns.
    import('bootstrap/dist/js/bootstrap.bundle.min.js');
  }, []);

  // The security boundary is the middleware plus the Route Handlers; this
  // redirect is only so an unauthenticated tab does not sit on a blank shell.
  useEffect(() => {
    if (status === 'anonymous') {
      router.replace(`/admin/signin?next=${encodeURIComponent(pathname)}`);
    }
  }, [status, router, pathname]);

  // Real connector statuses (server-checked), not the static registry values.
  useEffect(() => {
    if (status !== 'ready' || bootstrapped.current) return;
    bootstrapped.current = true;
    (async () => {
      const out = {};
      for (const app of APPS) {
        const res = await api(`/api/connectors/${app.slug}`);
        if (res?.ok || res?.app) {
          out[app.slug] = res.status?.status ? res.status : { status: res.status };
        }
      }
      const wa = await api('/api/connectors/whatsapp');
      if (wa?.status) out.whatsapp = { status: wa.status };
      setLiveStatuses(out);
    })();
  }, [status, api]);

  useEffect(() => {
    if (status !== 'ready') return;
    let alive = true;
    api('/api/admin/config').then((res) => {
      if (!alive || !res?.ok) return;
      const theme = res.publishedTheme || DEFAULT_THEME;
      setPublishedTheme(theme);
      setLayout(res.layout || {});
      applyTheme(theme, localStorage.getItem('pb_theme_mode') || theme.appearance || 'auto');
      const density = res.layout?.density || 'comfortable';
      document.documentElement.style.setProperty('--pb-content-gap', density === 'compact' ? '12px' : density === 'spacious' ? '24px' : '16px');
    });
    const updateLayout = (event) => setLayout((current) => ({ ...current, ...(event.detail || {}) }));
    window.addEventListener('pb-layout-updated', updateLayout);
    return () => { alive = false; window.removeEventListener('pb-layout-updated', updateLayout); };
  }, [status, api]);

  // Keep the feeds fresh without a scheduler: once per session, if no worker has
  // run in the last 15 minutes, kick a run. Idempotent, and permission-guarded on
  // the server; the cron endpoint is the backstop when nobody is in the admin.
  const freshnessChecked = useRef(false);
  useEffect(() => {
    if (status !== 'ready' || freshnessChecked.current) return;
    freshnessChecked.current = true;
    (async () => {
      try {
        const res = await api('/api/admin/workers');
        const runs = (res?.workers || []).map((w) => w.lastRunAt).filter(Boolean).sort();
        const newest = runs.length ? Date.parse(runs[runs.length - 1]) : 0;
        if (Date.now() - newest < 15 * 60 * 1000) return;
        await api('/api/admin/workers', { method: 'POST', body: { action: 'run' } });
      } catch { /* best effort — the cron endpoint is the backstop */ }
    })();
  }, [status, api]);

  const saveLayoutPatch = async (patch) => {
    const next = { ...layout, ...patch };
    setLayout(next);
    const result = await api('/api/admin/config', { method: 'POST', body: { action: 'layout:save', layout: next } });
    if (!result?.ok) setLayout(layout);
  };

  if (status === 'loading' || status === 'anonymous') {
    return (
      <div className="pb-auth-wrap">
        <div className="text-center" style={{ color: 'var(--bs-secondary-color)' }}>
          <div className="spinner-border spinner-border-sm me-2" role="status" />
          Checking admin session…
        </div>
      </div>
    );
  }

  const initials = (session?.user?.email || '??').slice(0, 2).toUpperCase();
  const connected = APPS.filter((a) => (liveStatuses?.[a.slug]?.status || 'pending') === 'connected').length;
  const side = layout.sidebarSide === 'right' ? 'right' : 'left';
  const sidebarWidth = layout.sidebarCollapsed ? 76 : Number(layout.sidebarWidth || 264);
  const shellStyle = {
    '--pb-shell-sidebar-width': `${sidebarWidth}px`,
    '--pb-shell-sidebar-left': side === 'left' ? '0' : 'auto',
    '--pb-shell-sidebar-right': side === 'right' ? '0' : 'auto',
    '--pb-shell-main-left': side === 'left' ? `${sidebarWidth}px` : '0',
    '--pb-shell-main-right': side === 'right' ? `${sidebarWidth}px` : '0',
  };

  return (
    <div className="d-flex pb-app-shell" style={shellStyle}>
      {/* Desktop sidebar */}
      <aside className={`pb-sidebar d-none d-lg-flex ${layout.sidebarCollapsed ? 'is-collapsed' : ''}`}>
        <Brand collapsed={layout.sidebarCollapsed} />
        <SidebarNav liveStatuses={liveStatuses} layout={layout} collapsed={layout.sidebarCollapsed} />
        <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,.06)', fontSize: '.75rem', color: '#63718a' }}>
          {!layout.sidebarCollapsed && <div className="mb-2">{connected}/{APPS.length} apps connected · session cookie</div>}
          <button className="btn btn-sm btn-outline-secondary w-100" aria-label={layout.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={layout.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => saveLayoutPatch({ sidebarCollapsed: !layout.sidebarCollapsed })}>{layout.sidebarCollapsed ? '»' : 'Collapse sidebar'}</button>
        </div>
      </aside>

      {/* Mobile off-canvas sidebar */}
      <div className="offcanvas offcanvas-start pb-offcanvas" tabIndex="-1" id="pbOffcanvas" aria-label="Mobile navigation">
        <div className="offcanvas-header p-0">
          <Brand />
          <button type="button" className="btn-close btn-close-white me-3" data-bs-dismiss="offcanvas" aria-label="Close" />
        </div>
        <SidebarNav liveStatuses={liveStatuses} layout={layout} onNavigate={() => document.querySelector('#pbOffcanvas .btn-close')?.click()} />
      </div>

      <div className="pb-main">
        <header className={`pb-topbar ${layout.headerPosition === 'static' ? 'is-static' : ''}`}>
          <button className="btn btn-sm btn-outline-secondary d-lg-none" data-bs-toggle="offcanvas"
            data-bs-target="#pbOffcanvas" aria-label="Open navigation">☰</button>
          <Breadcrumbs />
          <GlobalSearch />

          {/* App switcher */}
          <div className="dropdown">
            <button className="btn btn-sm btn-outline-primary dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
              Apps
            </button>
            <ul className="dropdown-menu dropdown-menu-end">
              <li><h6 className="dropdown-header">Switch application</h6></li>
              {APPS.map((a) => (
                <li key={a.slug}>
                  <Link className="dropdown-item d-flex align-items-center gap-2" href={`/admin/apps/${a.slug}`}>
                    <span className="dot" style={{ width: 8, height: 8, borderRadius: '50%', background: APP_COLORS[a.slug] }} />
                    {a.name}
                    <span className={`pb-appdot ${liveStatuses?.[a.slug]?.status || 'pending'} ms-auto`} />
                  </Link>
                </li>
              ))}
              <li><hr className="dropdown-divider" /></li>
              <li><Link className="dropdown-item" href="/admin/apps">✚ App Registry…</Link></li>
            </ul>
          </div>

          {/* Notifications */}
          <div className="dropdown">
            <button className="btn btn-sm btn-outline-secondary position-relative" data-bs-toggle="dropdown" aria-label="Notifications">
              🔔
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill text-bg-danger">
                {NOTIFICATIONS.length}
              </span>
            </button>
            <ul className="dropdown-menu dropdown-menu-end">
              <li><h6 className="dropdown-header">Notifications</h6></li>
              {NOTIFICATIONS.map((n) => (
                <li key={n.id}>
                  <span className="dropdown-item pb-notif-item d-flex gap-2">
                    <span>{n.tone === 'warning' ? '⚠️' : n.tone === 'success' ? '✅' : 'ℹ️'}</span>
                    <span className="flex-grow-1">{n.text}
                      <br /><small style={{ color: 'var(--bs-secondary-color)' }}>{n.time} UTC</small></span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="dropdown">
            <button className="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">＋ Create</button>
            <ul className="dropdown-menu dropdown-menu-end"><li><h6 className="dropdown-header">Quick create</h6></li><li><Link className="dropdown-item" href="/admin/products">Product or license</Link></li><li><Link className="dropdown-item" href="/admin/orders">Review orders</Link></li><li><Link className="dropdown-item" href="/admin/customers">Customer or lead</Link></li></ul>
          </div>
          <span className="pb-system-status d-none d-xl-inline-flex" title={`${connected} of ${APPS.length} app connectors healthy`}><i />{connected}/{APPS.length} connected</span>
          <Link href="/admin/theme-studio" className="btn btn-sm btn-outline-secondary d-none d-xl-inline-flex">✦ Customize</Link>
          <ThemeToggle theme={publishedTheme} />

          {/* Account — role and scope come from the server session */}
          <div className="dropdown">
            <button className="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
              {initials}
            </button>
            <ul className="dropdown-menu dropdown-menu-end">
              <li><h6 className="dropdown-header">
                {session?.user?.email}
                <br /><small className="fw-normal">{session?.user?.role}</small>
              </h6></li>
              <li><Link className="dropdown-item" href="/admin/staff">My role & permissions</Link></li>
              <li><Link className="dropdown-item" href="/admin/settings">Settings</Link></li>
              <li><hr className="dropdown-divider" /></li>
              <li><button className="dropdown-item text-danger" onClick={signOut}>Sign out</button></li>
            </ul>
          </div>
        </header>

        <main className="pb-content">{children}</main>
      </div>
    </div>
  );
}
