import { NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth/sessions';
import { can } from '../../../../../lib/rbac';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const domains=[{site:'magxtv.click',id:process.env.ADSTERRA_MAGXTV_DOMAIN_ID},{site:'playbeat.live',id:process.env.ADSTERRA_PLAYBEAT_LIVE_DOMAIN_ID}];
const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'');
const n=v=>Number.isFinite(Number(v))?Number(v):null;
export async function GET(req){
 const session=await getSession({touch:true});
 if(!session)return NextResponse.json({error:'unauthenticated'},{status:401});
 if(!can(session,'analytics:view'))return NextResponse.json({error:'forbidden'},{status:403});
 const query=new URL(req.url).searchParams;
 const end=new Date().toISOString().slice(0,10);
 const start=new Date(Date.now()-29*86400000).toISOString().slice(0,10);
 const from=validDate(query.get('from'))?query.get('from'):start;
 const to=validDate(query.get('to'))?query.get('to'):end;
 if(from>to || (Date.parse(to)-Date.parse(from))/86400000>366) return NextResponse.json({error:'Invalid date range'},{status:400});
 const token=process.env.ADSTERRA_PUBLISHER_API_KEY;
 if(!token)return NextResponse.json({ok:true,connected:false,currency:'USD',from,to,sites:domains.map(d=>({site:d.site,status:'unconfigured',reason:'Adsterra publisher API key not configured'}))});
 const sites=await Promise.all(domains.map(async d=>{
  if(!d.id || !/^\d+$/.test(d.id))return {site:d.site,status:'unconfigured',reason:'Adsterra domain ID not configured'};
  try{
   const url=new URL('https://api3.adsterratools.com/publisher/stats.json');
   url.searchParams.set('domain',d.id);
   url.searchParams.set('start_date',from);url.searchParams.set('finish_date',to);url.searchParams.set('group_by','date');
   const response=await fetch(url,{headers:{Accept:'application/json','X-API-Key':token},cache:'no-store',signal:AbortSignal.timeout(12000)});
   if(!response.ok)throw Error('Adsterra returned HTTP '+response.status);
   const payload=await response.json();
   const rows=Array.isArray(payload)?payload:Array.isArray(payload?.items)?payload.items:Array.isArray(payload?.data)?payload.data:Array.isArray(payload?.result)?payload.result:null;
   if(!rows) return {site:d.site,status:'unavailable',reason:'Adsterra response format needs review'};
   const daily=rows.filter(x=>x && typeof x==='object').map(x=>({date:String(x.date||x.day||''),impressions:n(x.impressions),clicks:n(x.clicks),revenue:n(x.revenue),cpm:n(x.cpm),ctr:n(x.ctr)}));
   const sum=key=>daily.every(x=>x[key]!==null)?daily.reduce((t,x)=>t+x[key],0):null;
   const impressions=sum('impressions'),clicks=sum('clicks'),revenue=sum('revenue');
   return {site:d.site,status:'connected',impressions,clicks,revenue,ctr:impressions&&clicks!==null?100*clicks/impressions:null,rpm:impressions&&revenue!==null?1000*revenue/impressions:null,daily};
  }catch(e){return {site:d.site,status:'unavailable',reason:e.message};}
 }));
 return NextResponse.json({ok:true,connected:sites.some(s=>s.status==='connected'),currency:'USD',from,to,sites},{headers:{'Cache-Control':'no-store'}});
}
