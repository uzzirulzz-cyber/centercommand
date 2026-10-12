
'use client';
import LivePanel from '../../../components/LivePanel';

export default function SeoAuditPage() {
  return (
    <LivePanel
      title="SEO Audit Runs"
      subtitle="Requests a live crawl from the storefront's own audit engine (crawl, Search Console, PageSpeed) and records exactly what the provider answered. An unconfigured provider records 'pending' — never invented findings."
      endpoint="/api/admin/seo-audit"
      actions={[{ action: 'start', label: 'Request audit', variant: 'btn-primary' }]}
      columns={[
        { key: 'startedAt', label: 'When' }, { key: 'startedBy', label: 'By' },
        { key: 'provider', label: 'Provider' }, { key: 'result', label: 'Result' },
        { key: 'urls', label: 'URL rows' }, { key: 'note', label: 'Note' },
      ]}
    />
  );
}
