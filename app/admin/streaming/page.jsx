'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from '../../../components/SessionProvider';
import ModuleWorkspace from '../../../components/ModuleWorkspace';

// Central admin route: uses existing authenticated record endpoints and their
// RBAC checks. No browser-side provider credentials or invented metrics.
function AdsterraAnalytics(){
 const {api,can}=useSession();
 const [data,setData]=useState(null);
 const [error,setError]=useState('');
 const [days,setDays]=useState('30');
 useEffect(()=>{if(!can('analytics:view'))return;let active=true;
  const to=new Date(),from=new Date(to.getTime()-(Number(days)-1)*86400000);
  api('/api/admin/adsterra?from='+from.toISOString().slice(0,10)+'&to='+to.toISOString().slice(0,10))
   .then(r=>{if(active){if(r?.ok)setData(r);else setError(r?.error||'Unable to load Adsterra stats');}})
   .catch(()=>{if(active)setError('Unable to load Adsterra statistics')});
  return()=>{active=false};
 },[api,can,days]);
 if(!can('analytics:view'))return <div className="alert alert-warning">Analytics permission required.</div>;
 const money=v=>v==null?'Not available':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v);
 const count=v=>v==null?'Not available':Number(v).toLocaleString();
 return <section className="card border-0 shadow-sm mb-4" aria-label="Adsterra advertising revenue">
  <div className="card-body">
   <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3"><div><h2 className="h5 mb-1">Adsterra · Viewership vs Earnings</h2><p className="small text-secondary mb-0">Publisher-reported ad impressions and earnings, separately by website. Ad impressions are not unique viewers.</p></div>
   <select className="form-select form-select-sm" style={{maxWidth:155}} aria-label="Analytics date range" value={days} onChange={e=>setDays(e.target.value)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></div>
   {error&&<div className="alert alert-warning">{error}</div>}
   {!data&&!error&&<p className="text-secondary">Loading publisher statistics…</p>}
   {data&&<><div className="table-responsive"><table className="table table-hover align-middle"><thead><tr><th>Website</th><th>Status</th><th>Ad impressions</th><th>Clicks</th><th>CTR</th><th>Ad revenue (USD)</th><th>Ad RPM</th></tr></thead><tbody>
    {(data.sites||[]).map(row=><tr key={row.site}><th>{row.site}</th><td><span className={row.status==='connected'?'badge bg-success':'badge bg-secondary'}>{row.status}</span></td><td>{count(row.impressions)}</td><td>{count(row.clicks)}</td><td>{row.ctr==null?'—':row.ctr.toFixed(2)+'%'}</td><td>{money(row.revenue)}</td><td>{money(row.rpm)}</td></tr>)}</tbody></table></div>
    {(data.sites||[]).filter(row=>row.reason).map(row=><p key={row.site} className="small text-secondary mb-1">{row.site}: {row.reason}</p>)}
    <p className="small text-secondary mb-0">Ad RPM = reported ad revenue ÷ ad impressions × 1,000. Viewer-to-revenue RPM requires separately connected visitor analytics. Figures are unavailable until Adsterra credentials and domain IDs are configured.</p></>}
  </div></section>;
}
export default function StreamingCommandCenter() {
  return <div className="container-fluid py-3">
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
      <div><div className="text-uppercase small fw-semibold text-secondary">PlayBeat Arena / Streaming & IPTV</div>
        <h1 className="h3 fw-bold mt-2 mb-1">Streaming Command Center</h1>
        <p className="text-secondary mb-0">One workspace for PlayBeat.live channels and MAGXTV.click sports feeds.</p></div>
      <div className="d-flex flex-wrap gap-2">
        <Link href="/admin/applications" className="btn btn-outline-secondary btn-sm"><i className="bi bi-plug me-2" />Connections</Link>
        <Link href="/admin/integration-health" className="btn btn-outline-primary btn-sm"><i className="bi bi-activity me-2" />Integration health</Link>
      </div>
    </div>
    <div className="row g-3 mb-4">
      {[{name:'PlayBeat Live',desc:'IPTV, movies, series and broadcast sources',path:'/admin/live',url:'https://playbeat.live',icon:'bi-tv'},
        {name:'MAGXTV Sports',desc:'Sports channels, match schedules and broadcast diagnostics',path:'/admin/magxtv',url:'https://magxtv.click',icon:'bi-trophy'}].map(app=>
        <div className="col-12 col-lg-6" key={app.path}>
          <div className="card h-100 shadow-sm border-0"><div className="card-body">
            <div className="d-flex align-items-center gap-2 mb-2"><i className={`bi ${app.icon} fs-4 text-primary`}/><h2 className="h5 mb-0">{app.name}</h2></div>
            <p className="text-secondary">{app.desc}</p>
            <div className="d-flex gap-2 flex-wrap"><Link href={app.path} className="btn btn-primary btn-sm">Manage records</Link>
            <a href={app.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline-secondary btn-sm">Open site ↗</a></div>
          </div></div>
        </div>)}
    </div>
    <section className="card shadow-sm border-warning-subtle mb-4" aria-label="MAGXTV infrastructure status">
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
          <h2 className="h5 mb-0"><i className="bi bi-broadcast me-2" />MAGXTV · Recovery & Playlist</h2>
          <span className="badge text-bg-warning">Temporary recovery routing · Playback unverified</span>
        </div>
        <p className="small text-secondary mb-3">The domain currently uses the magxtv-recovery Worker in the new Cloudflare account to reach the previous Pages deployment. This is a routing configuration, not proof that the upstream IPTV playlist contains playable channels.</p>
        <div className="d-flex flex-wrap gap-2">
          <a href="https://magxtv.click" target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">Open MAGXTV ↗</a>
          <a href="https://dash.cloudflare.com/20c83732a1af52f80655768cd4dfc251/workers-and-pages" target="_blank" rel="noopener noreferrer" className="btn btn-outline-secondary btn-sm">Cloudflare · New account ↗</a>
          <a href="https://magxtv-proxy.uzzirulzz.workers.dev/api/live/streams" target="_blank" rel="noopener noreferrer" className="btn btn-outline-secondary btn-sm">Inspect provider catalog ↗</a>
          <a href="https://github.com/uzzirulzz-cyber/llivesports/tree/magxtv/cloudflare-worker/magxtv" target="_blank" rel="noopener noreferrer" className="btn btn-outline-secondary btn-sm">Production source ↗</a>
        </div>
        <p className="small text-secondary mt-3 mb-0">If the playlist is empty, investigate the provider's /api/live/streams and /api/live/categories responses, token issuance, CORS and playback upstream. The old dated allowlist was removed; this admin does not claim channels are live unless verified.</p>
      </div>
    </section>
    <div className="alert alert-info small" role="status"><strong>Connection policy:</strong> Records and controls below use the existing authenticated admin API. An unconfigured stream provider remains unavailable rather than displaying fictitious live-channel or audience data. Broadcasting controls require the connected application's API and the broadcast:control permission.</div>
    <AdsterraAnalytics />
    <section className="mb-5" aria-label="PlayBeat Live IPTV management"><ModuleWorkspace module="live" /></section>
    <section aria-label="MAGXTV Sports management"><ModuleWorkspace module="magxtv" /></section>
  </div>;
}
