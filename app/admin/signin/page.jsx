'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';


const EXEC_AVATARS = {"qazi":"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABYPEBMQDhYTEhMYFxYaIDYjIB4eIEIvMic2TkVSUU1FTEpWYXxpVlx1XUpMbJNtdYCEi4yLVGiZo5eHonyIi4b/2wBDARcYGCAcID8jIz+GWUxZhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhob/wAARCAAwACYDASIAAhEBAxEB/8QAGgABAAMBAQEAAAAAAAAAAAAABQADBAIGAf/EACcQAAIBAwMEAQUBAAAAAAAAAAECAwAEERIhMQUTIkFRFBUjMmGx/8QAFwEBAQEBAAAAAAAAAAAAAAAAAgABA//EABkRAAMBAQEAAAAAAAAAAAAAAAABEQIhA//aAAwDAQACEQMRAD8ALcgFzt/BWyxufpJtUwV9PA1CjpZDETGMHIwc1zGxeUKoLH0MVBPXpfW07IElGp/RHFZpndncs2EHG+1DW79pnMitlRsMYrfCpu1ijn8VOwVTzt7rnrXYPKKJbxi2m3GccmpX2XqNj09uyY3Lgb4WpVGIwPAZZwEQt62+TXdjC0F3hmDuAdKlvY/tJm2SKNpCmCATzQEFw0cqyj9kbNPPQvjF1vSGWLRmVjsgGc54q3uPHLCxXyD+WngUTPN3OpxnGTrQZpnX2l0EK2Wyc0N5SaK1h972nuZHVUYkgZZTxUra0VqZfxoVJGW8id6lRr6zQW1giTAFecukSKaRIwQoY4B5pO6uyrEH/KIlbMrE8k0vNQDdZb00r9xiLjVuefnFNzFXUgUBYEi9j+QadNxnAODn3Q9V2kVNJ2sHSQSMHFSqZpWeVsED4NSsRtZ//9k=","creed":"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABYPEBMQDhYTEhMYFxYaIDYjIB4eIEIvMic2TkVSUU1FTEpWYXxpVlx1XUpMbJNtdYCEi4yLVGiZo5eHonyIi4b/2wBDARcYGCAcID8jIz+GWUxZhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhob/wAARCAAvADADASIAAhEBAxEB/8QAGQAAAwEBAQAAAAAAAAAAAAAABAUGAwIA/8QALRAAAgEDAgQDCAMAAAAAAAAAAQIDAAQREiEFEzFBBiLBFGFxc4GhseEkUXL/xAAWAQEBAQAAAAAAAAAAAAAAAAACAAH/xAAZEQEBAQEBAQAAAAAAAAAAAAABABECMUH/2gAMAwEAAhEDEQA/AK2p6wGY3+Y35p6HzSPhxzE/zX/NVQ3Gh/Hb/PrSWIqy7EGn/FLYXQETTcpdOS3pSc2nsM6yQOsoGQ2oBqO4yxS505Fa2ogvJsahbjTkg743x+63Sa7lXVFCGHTKwg+lYve3SMVZtDDqNIBH2qdoKvklRAd9zUxFeFGKhgPMTj90+vZLWNSlw4V3HlyOuKk5opBCWXzSZI2YVsIqbjMckyxiEyZGDnpQl3fE2+pUCrqwcDAOe32ofh9rMbyHmRlRrBLHpge+mPiqGKFYBCMIctt0ztU8mzOkMsuG8YuIngt49HLeQAgrvud62Jim4rf8wKwU7Z+NT0cjJKrId1II+NFyMksjShHGs5ODmtsqrxEQ9vE6gnQ2CfcaQmXA/uqHi8ZjsZuYMjTtg96jjO+d1B+takRjy+a64jHPfWVoIlL8sMpx2370vFyR1U0RDfEQOi6sHt0+uaLvyZj7BTWslpJpmwCQCMHOQe9aW8g5ZzgYOxrKbW75ds4GBmvSFhEhIwO2KrL/2Q==","mahbuba":"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABYPEBMQDhYTEhMYFxYaIDYjIB4eIEIvMic2TkVSUU1FTEpWYXxpVlx1XUpMbJNtdYCEi4yLVGiZo5eHonyIi4b/2wBDARcYGCAcID8jIz+GWUxZhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhob/wAARCAAwABsDASIAAhEBAxEB/8QAGQAAAwEBAQAAAAAAAAAAAAAAAgQFBgMB/8QAKBAAAgECBQMDBQAAAAAAAAAAAQIAAxEEBRIhMRNRgSJBcRRDUmHB/8QAFwEBAQEBAAAAAAAAAAAAAAAABAABA//EABwRAAMBAQEAAwAAAAAAAAAAAAABAhEDEiExQf/aAAwDAQACEQMRAD8ARweFfF1hTTyewloZPhERVdzrbglrX+BFMlIVKhB3vuJMzDErmOZjq1ekiNpUnhQPj9wle7tpPEjVCmU3+lHMMrOGXqUyWT3vyJNtNdURWoFSbqU2PiZVl3MuHV0sZXzX2gsHX6FUMb6fe0l4zp6qbU2JZ1LOOxJP8tGuoCux9RGwk4ox1E3uOYhT86Z62cNYcw14KklM/bAv4iBUE8xbAORhvVwDt8Qfrh+F/M4zzxtIS7nFosrC8DUDSqsRuTtOCuV4hBxoKkcxQPBo1iaSqBbbecoAqCwvPda95Ef/2Q=="};
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
    <section style={{maxWidth:650,width:'100%',background:'#0b1530',padding:32,border:'1px solid #38558c',borderRadius:24,color:'#fff',boxShadow:'0 25px 90px #0008'}}>
      <div style={{textAlign:'center',marginBottom:26}}><Link href="/" style={{color:'#e6eefb',fontWeight:800,textDecoration:'none'}}>PLAYBEAT DIGITAL</Link><h1 style={{fontSize:26,marginTop:16}}>Select your profile</h1><p style={{color:'#9db3d4'}}>Executive access · PIN only</p></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:12,marginBottom:26}}>
        {profiles.map(p=><button key={p.id} type="button" onClick={()=>{setProfile(p.id);setPin('');setError('')}} aria-pressed={profile===p.id}
          style={{border:profile===p.id?'2px solid #66c4ff':'1px solid #304a7b',borderRadius:16,background:profile===p.id?'#153a72':'#101e3b',padding:'18px 5px',color:'#fff',cursor:'pointer'}}>
          <img src={EXEC_AVATARS[p.id]} alt={p.name} onError={e=>{e.currentTarget.style.visibility='hidden'}} style={{display:'block',margin:'0 auto 10px',width:72,height:72,objectFit:'cover',borderRadius:'50%',background:'#243b66'}}/>
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
