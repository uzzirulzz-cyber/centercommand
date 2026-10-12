'use client';

// ============================================================
// Staff, roles and the audit log — now backed by real server state.
//
// The matrix is rendered FROM the enforcement table in lib/rbac.js (passed in
// by the server), so the view cannot drift from the actual rules.
// ============================================================
import { useEffect, useState } from 'react';
import { PageHeader, Panel, DataTable, SourceBadge, StatusBadge, asText } from '../../../components/ui';
import { useSession } from '../../../components/SessionProvider';

const ROLE_BADGE = { 'Super Admin': 'danger', 'App Admin': 'primary', Sales: 'success', Support: 'warning', 'Read-only': 'secondary' };

export default function Staff() {
  const { api, can, session } = useSession();
  const [users, setUsers] = useState([]);
  const [audit, setAudit] = useState([]);
  const [matrix, setMatrix] = useState(null);
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      const res = await api('/api/admin/staff');
      if (res?.error) { setError(res.reason || res.error); return; }
      setUsers(res.users || []);
      setAudit(res.audit || []);
      setMatrix(res.matrix || null);
      setRoles(res.roles || []);
    })();
  }, [api]);

  const changeRole = async (userId, role) => {
    const res = await api('/api/admin/staff', { method: 'POST', body: { action: 'set-role', userId, role, apps: ['*'] } });
    if (!res.ok) { setError(res.reason || res.error); return; }
    setError(null);
    const refreshed = await api('/api/admin/staff');
    setUsers(refreshed.users || []);
    setAudit(refreshed.audit || []);
  };

  // Rows in the order lib/rbac.js declares them — the real enforcement table.
  const ACTION_LABELS = {
    'apps:manage': 'Manage apps & registry',
    'products:write': 'Products & pricing writes',
    'orders:refund': 'Orders & refunds',
    'crm:assign': 'CRM leads & assignments',
    'broadcast:control': 'Broadcast controls',
    'reports:export': 'Exports & reports',
    'dashboard:view': 'View dashboards',
  };

  return (
    <>
      <PageHeader title="Staff, Roles, Security & Audit Logs"
        subtitle="Permissions are enforced server-side and deny by default. This matrix is rendered from the same table the Route Handlers consult (lib/rbac.js)."
        actions={can('apps:manage') ? <button className="btn btn-sm btn-primary">+ Invite staff</button> : null} />

      {error && <div className="alert alert-danger py-2">{asText(error)}</div>}

      <div className="row g-3">
        <div className="col-lg-7">
          <Panel title="Admin accounts" pad={false}>
            <DataTable
              pageSize={10}
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'email', label: 'Email', render: (r) => <span className="pb-mono">{r.email}</span> },
                {
                  key: 'role', label: 'Role',
                  render: (r) => (
                    can('apps:manage') && r.email !== session?.user?.email ? (
                      <select className="form-select form-select-sm" value={r.role} style={{ width: 130 }}
                        onChange={(e) => changeRole(r.id, e.target.value)}>
                        {roles.map((role) => <option key={role} value={role}>{role}</option>)}
                      </select>
                    ) : (
                      <span className={`badge text-bg-${ROLE_BADGE[r.role] || 'secondary'}`}>{r.role}</span>
                    )
                  ),
                },
                { key: 'apps', label: 'App scope', render: (r) => <span className="pb-mono small">{(r.apps || []).join(', ')}</span> },
                { key: 'mfaSecret', label: 'MFA', render: (r) => (r.mfaSecret ? '✅ on' : '—') },
                {
                  key: 'disabled', label: 'Status',
                  render: (r) => <span className={`badge text-bg-${r.disabled ? 'secondary' : 'success'}`}>{r.disabled ? 'disabled' : 'active'}</span>,
                },
              ]}
              rows={users}
              empty="No admin accounts seeded yet — run `npm run seed:admin`."
            />
          </Panel>
        </div>

        <div className="col-lg-5">
          <Panel title="Role permission matrix (enforcement table)" pad={false}>
            <div className="pb-table-wrap">
              <table className="table">
                <thead><tr><th>Action</th><th>Super</th><th>App Adm</th><th>Sales</th><th>Supp</th><th>Read</th></tr></thead>
                <tbody>
                  {matrix
                    ? Object.entries(matrix).map(([action, flags]) => (
                      <tr key={action}>
                        <td>{ACTION_LABELS[action] || action}</td>
                        {flags.map((f, i) => <td key={i}>{f ? '✅' : '—'}</td>)}
                      </tr>
                    ))
                    : <tr><td colSpan={6}>Loading…</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="px-3 pb-3">
              <small style={{ color: 'var(--bs-secondary-color)' }}>
                Default-deny: an action with no explicit allow fails. App scope is checked in
                addition to the action.
              </small>
            </div>
          </Panel>
        </div>

        <div className="col-12">
          <Panel title="Audit log (live, append-only)" pad={false}>
            <DataTable
              pageSize={10}
              columns={[
                { key: 'at', label: 'Time (UTC)', render: (r) => <span className="pb-mono">{String(r.at || '').replace('T', ' ').slice(0, 19)}</span> },
                { key: 'actor', label: 'Actor', render: (r) => <span className="pb-mono">{r.actor || '—'}</span> },
                { key: 'action', label: 'Action' },
                { key: 'target', label: 'Target' },
                { key: 'reason', label: 'Detail', render: (r) => <small style={{ color: 'var(--bs-secondary-color)' }}>{r.reason || '—'}</small> },
                { key: 'result', label: 'Result', render: (r) => <StatusBadge status={r.result || 'success'} /> },
              ]}
              rows={audit}
              empty="No audit entries yet."
            />
          </Panel>
        </div>
      </div>
    </>
  );
}
