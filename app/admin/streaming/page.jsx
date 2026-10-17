'use client';
import Link from 'next/link';
import ModuleWorkspace from '../../../components/ModuleWorkspace';

// Central admin route: uses existing authenticated record endpoints and their
// RBAC checks. No browser-side provider credentials or invented metrics.
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
    <div className="alert alert-info small" role="status"><strong>Connection policy:</strong> Records and controls below use the existing authenticated admin API. An unconfigured stream provider remains unavailable rather than displaying fictitious live-channel or audience data. Broadcasting controls require the connected application's API and the broadcast:control permission.</div>
    <section className="mb-5" aria-label="PlayBeat Live IPTV management"><ModuleWorkspace module="live" /></section>
    <section aria-label="MAGXTV Sports management"><ModuleWorkspace module="magxtv" /></section>
  </div>;
}
