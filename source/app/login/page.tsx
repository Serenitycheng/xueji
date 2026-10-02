'use client';
import {useState} from 'react';
import {BookOpen,LockKeyhole,ArrowRight} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {PageColorPicker} from '@/components/appearance';
export default function Login(){
 const [password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 return <main className="login-page"><div className="login-appearance"><PageColorPicker/></div><section className="login-card"><span className="brand-symbol"><BookOpen size={25}/></span><p className="eyebrow">XUEJI · 学迹</p><h1>回到你的学习空间</h1><p className="panel-description">输入个人访问密码，继续学习计划。电脑与手机使用同一个密码。</p><form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});const data=await r.json();if(!r.ok)throw new Error(data.error);window.location.assign('/');}catch(e){setError(e instanceof Error?e.message:'登录暂时失败');}finally{setBusy(false);}}}><label htmlFor="password">个人访问密码</label><Input id="password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/>{error&&<p role="alert" className="login-error">{error}</p>}<Button type="submit" disabled={busy||!password}>{busy?'正在登录…':'进入学习空间'}<ArrowRight size={16}/></Button></form><p className="hint"><LockKeyhole size={14}/>学习记录和资料仅在登录后可读取。</p></section></main>;
}
