// ============================================================
// Server-side authorization — the single source of truth (README §8.4).
// The role matrix rendered in Staff/Roles is only a VIEW of this table.
//
// UPGRADE NOTE: the five roles and the seven original actions are UNCHANGED, so
// every existing guard keeps behaving exactly as before. New actions were
// appended for the Theme Studio, CMS, page builder, marketing, payments,
// finance, security and inbox modules. Column order still matches ROLES, and
// unknown actions are still denied by default.
// ============================================================

export const ROLES = ['Super Admin', 'App Admin', 'Sales', 'Support', 'Read-only'];

// action -> one explicit boolean per role, in ROLES order.
//                        SuperAdm AppAdm Sales Support ReadOnly
const MATRIX = {
  /* ---- original actions (unchanged) ---- */
  'apps:manage':       [true,  false, false, false,  false],
  'products:write':    [true,  true,  false, false,  false],
  'orders:refund':     [true,  true,  false, true,   false],
  'crm:assign':        [true,  true,  true,  false,  false],
  'broadcast:control': [true,  true,  false, false,  false],
  'ops:manage':      [true,  true,  false, false,  false ],
  'mobile:manage':   [true,  true,  false, false,  false ],
  'audit:view':      [true,  true,  false, false,  true  ],
  'tracking:write':  [true,  true,  true,  false,  false ],
  'growth:write':    [true,  true,  true,  false,  false ],
  'reports:export':    [true,  true,  true,  true,   true ],
  'dashboard:view':    [true,  true,  true,  true,   true ],

  /* ---- Theme Studio ---- */
  'theme:manage':      [true,  true,  false, false,  false], // draft, presets, import
  'theme:publish':     [true,  false, false, false,  false], // publish/revert/restore

  /* ---- Website, CMS and page builder ---- */
  'cms:write':         [true,  true,  false, false,  false],
  'pagebuilder:write': [true,  true,  false, false,  false],
  'seo:write':         [true,  true,  false, false,  false],

  /* ---- Growth ---- */
  'marketing:write':   [true,  true,  true,  false,  false],
  'inbox:reply':       [true,  true,  true,  true,   false],
  'support:reply':     [true,  true,  false, true,   false],

  /* ---- Money and control ---- */
  'payments:manage':   [true,  true,  false, false,  false],
  'finance:view':      [true,  true,  false, false,  false],
  'analytics:view':    [true,  true,  true,  true,   true ],

  /* ---- Administration ---- */
  'plan:manage':      [true,  false, false, false,  false], // set the org-wide subscription tier
  'staff:manage':      [true,  false, false, false,  false],
  'security:view':     [true,  true,  false, false,  false],
  'settings:manage':   [true,  false, false, false,  false],
};

export const ACTIONS = Object.keys(MATRIX);

export function roleCan(role, action) {
  const row = MATRIX[action];
  const col = ROLES.indexOf(role);
  if (!row || col === -1) return false;
  return row[col] === true;
}

export const ROLE_MATRIX = MATRIX;

/** Actions a role holds — used by the sidebar/nav to hide what a role cannot use. */
export function allowedActions(role) {
  return ACTIONS.filter((a) => roleCan(role, a));
}

/**
 * Default-deny permission check. A role supplied by the client is never
 * trusted — `session` is always the server-side session record.
 */
export function can(session, action, appSlug = null) {
  if (!session || session.revokedAt) return false;              // no session -> deny
  if (typeof action !== 'string' || !MATRIX[action]) return false; // unknown action -> deny
  if (!roleCan(session.role, action)) return false;              // role not allowed
  if (appSlug) {
    const scope = Array.isArray(session.apps) ? session.apps : [];
    if (!scope.includes('*') && !scope.includes(appSlug)) return false; // out of app scope
  }
  return true;
}

/** Human-readable reason, for audit entries. */
export function denyReason(session, action, appSlug) {
  if (!session) return 'no session';
  if (session.revokedAt) return 'session revoked';
  if (!MATRIX[action]) return `unknown action ${action}`;
  if (!roleCan(session.role, action)) return `role ${session.role} lacks ${action}`;
  if (appSlug) {
    const scope = Array.isArray(session.apps) ? session.apps : [];
    if (!scope.includes('*') && !scope.includes(appSlug)) return `app scope excludes ${appSlug}`;
  }
  return 'forbidden';
}
