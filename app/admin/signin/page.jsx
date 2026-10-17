'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';


const EXEC_AVATARS = { qazi: '/executives/qazi.webp', creed: '/executives/creed.webp', mahbuba: '/executives/mahbuba.webp' };
function SignInForm() {
  const router = useRouter();
  const [profile, setProfile] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const profiles = [{id:'qazi',name:'Qazi',title:'CEO'}, {id:'creed',name:'Creed',title:'Founder'}, {id:'mahbuba',name:'Mahbuba',title:'Director'}];
  async function submit(e) {
    e.preventDefault();setError('');
    if (!profile || !/^\d{5}$/.test(pin)) {setError('Select a profile and enter your five-digit PIN.');return}
    setLoading(true);
    try {
      const next=new URLSearchParams(window.location.search).get('next')||'/admin';
      const res=await fetch('/api/auth/admin-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile,pin,next})});
      const data=await res.json().catch(()=>({}));setPin('');
      if(!res.ok) {setError(data.error||'Access denied.');return}
      router.replace(data.redirect||'/admin');router.refresh();
    }catch {setPin('');setError('Cannot connect to the server.')}
    finally {setLoading(false)}
  }
  return <main className="pb-auth-page" style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24}}>
    <section style={{maxWidth:780,width:'100%',background:'linear-gradient(145deg,#12213a,#091329 80%)',padding:'clamp(24px,5vw,48px)',border:'1px solid rgba(132,174,239,.23)',borderRadius:28,color:'#fff',boxShadow:'0 35px 110px #000a, inset 0 1px rgba(255,255,255,.08)'}}>
      <div style={{textAlign:'center',marginBottom:26}}><Link href="/" style={{color:'#e6eefb',fontWeight:800,textDecoration:'none'}}>PLAYBEAT DIGITAL</Link><div className="pb-exec-brand-orbit"><img src="/playbeat-orbit-logo.jpg" alt="PlayBeat Digital logo"/><span aria-hidden="true"/></div><h1 style={{fontSize:26,marginTop:16}}>Select your profile</h1><p style={{color:'#9db3d4'}}>Executive access · PIN only</p></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:16,marginBottom:30}}>
        {profiles.map(p=><button key={p.id} type="button" onClick={()=>{setProfile(p.id);setPin('');setError('')}} aria-pressed={profile===p.id}
          style={{border:profile===p.id?'2px solid #66c4ff':'1px solid #304a7b',borderRadius:16,background:profile===p.id?'#153a72':'#101e3b',padding:'18px 5px',color:'#fff',cursor:'pointer'}}>
          <img src={EXEC_AVATARS[p.id]} alt={p.name} onError={e=>{e.currentTarget.style.visibility='hidden'}} style={{display:'block',margin:'0 auto 10px',width:72,height:72,objectFit:'cover',borderRadius:'50%',background:'#243b66',border:'3px solid rgba(123,185,255,.65)',boxShadow:'0 0 0 5px rgba(53,112,213,.12)',imageRendering:'auto'}}/>
          <strong style={{display:'block'}}>{p.name}</strong><small style={{color:'#aabbd9'}}>{p.title}</small>
        </button>)}
      </div>
      {profile&&<form onSubmit={submit} style={{maxWidth:340,margin:'0 auto'}}>
        <label htmlFor="executive-pin" style={{display:'block',marginBottom:8}}>Enter {profiles.find(p=>p.id===profile)?.name}'s PIN</label>
        <input id="executive-pin" type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{5}" maxLength={5} autoFocus required value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,'').slice(0,5))}
          placeholder="•••••" style={{background:'#0a1127',color:'#fff',border:'1px solid #4b6fa5',padding:15,borderRadius:12,width:'100%',textAlign:'center',fontSize:24,letterSpacing:8}}/>
        {error&&<p role="alert" style={{color:'#ff9f9f',marginTop:12}}>{error}</p>}
        <button disabled={loading||pin.length!==5} type="submit" className="btn btn-primary w-100" style={{marginTop:14,padding:12,borderRadius:12}}>{loading?'Verifying…':'Unlock dashboard'}</button>
      </form>}
      {!profile&&error&&<p role="alert" style={{color:'#ff9f9f',textAlign:'center'}}>{error}</p>}
    </section>
  </main>;
}

export default function AdminSignIn() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
