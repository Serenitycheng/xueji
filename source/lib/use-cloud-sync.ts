'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {freshState,today,type Snapshot} from './model';
import {localStore,canPersist,type Draft,type Command} from './client-store';
import {WRITE_PROTOCOL} from './versions';
export function useCloudSync(notify:(message:string)=>void){
 const [snap,setSnap]=useState<Snapshot>(()=>({state:freshState(),revision:0,hasKey:false,usage:{cost:0,calls:0,month:today().slice(0,7)},userName:'我的学习空间'}));
 const [loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[online,setOnline]=useState(true),[error,setError]=useState(''),[lastSync,setLastSync]=useState(''),[drafts,setDrafts]=useState<Draft[]>([]),[cloud,setCloud]=useState<Snapshot|null>(null);
 const shown=useRef(snap),latest=useRef<Snapshot|null>(null),pending=useRef<Draft|null>(null),editing=useRef(false),writing=useRef(false),ready=useRef(false),channel=useRef<BroadcastChannel|null>(null),refreshing=useRef<Promise<void>|null>(null);
 const reloadDrafts=useCallback(async()=>{const list=await localStore.drafts();setDrafts(list);pending.current=list[0]??null;return list;},[]);
 const accept=useCallback((value:Snapshot,force=false)=>{
  if(latest.current&&value.revision<latest.current.revision)return;
  latest.current=value;setCloud(value);
  if(force||(!editing.current&&!pending.current&&!writing.current)){
   if(value.revision>=shown.current.revision){shown.current=value;setSnap(value);setLoaded(true);}
  }
  void localStore.cache(value).catch(()=>{});
 },[]);
 const refresh=useCallback(async()=>{
  if(refreshing.current)return refreshing.current;
  const work=(async()=>{try{const r=await fetch('/api/study',{cache:'no-store',signal:AbortSignal.timeout(20000)});if(r.status===401){window.location.assign('/login');return;}const value=await r.json();if(!r.ok)throw new Error(value.error??'云端暂时无法连接');accept(value);setOnline(true);setError('');setLastSync(new Date().toISOString());}catch(e){setOnline(false);setError(e instanceof Error?e.message:'暂时无法连接云端');}})();
  refreshing.current=work;try{await work;}finally{refreshing.current=null;}
 },[accept]);
 const send=useCallback(async(draft:Draft)=>{
  if(writing.current)return null;writing.current=true;setBusy(true);notify('');
  const persist=canPersist(draft.command);
  try{
   if(persist){await localStore.save(draft);await reloadDrafts();}
   if(!navigator.onLine)throw new Error('当前离线');
   const r=await fetch(draft.command.op==='material.import'?'/api/materials':'/api/study',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(draft.command),signal:AbortSignal.timeout(185000)});
   const result=await r.json();
   if(r.status===202||r.status>=500){throw Object.assign(new Error(result.error??'保存结果尚未确认，将使用同一编号重试。'),{uncertain:result.uncertain});}
   if(!r.ok){
    if(persist){await localStore.save({...draft,status:r.status===409?'conflict':r.status===426?'upgrade':'failed',error:result.error});await reloadDrafts();}
    notify(result.error??'保存失败，草稿仍保留');if(r.status===401)window.location.assign('/login');await refresh();return null;
   }
   if(persist){await localStore.remove(draft.command.requestId);await reloadDrafts();}
   editing.current=false;if(result.snapshot)accept(result.snapshot,true);setOnline(true);setError('');setLastSync(new Date().toISOString());channel.current?.postMessage('saved');if(result.message)notify(result.message);return result;
  }catch(e){
   const message=e instanceof Error?e.message:'连接中断，草稿仍保留';
   if(persist){try{await localStore.save({...draft,status:'queued',error:message,uncertain:(e as {uncertain?:boolean})?.uncertain});await reloadDrafts();notify('保存尚未确认，本机草稿已保留。可在“同步与版本”中查看。');}catch{notify('浏览器无法保留草稿。请保持页面打开并复制输入内容后重试。');}}
   else notify(message);
   return null;
  }finally{writing.current=false;setBusy(false);}
 },[accept,notify,refresh,reloadDrafts]);
 const run=useCallback(async(op:string,data:Record<string,unknown>={})=>{
  if(!ready.current||writing.current)return null;
  if(pending.current){notify('还有一份未确认的修改，请先在“同步与版本”中处理。');return null;}
  if(!latest.current&&!loaded){notify('请先读取学习空间。');return null;}
  const command:Command={...data,op,revision:shown.current.revision,protocol:WRITE_PROTOCOL,requestId:crypto.randomUUID()};
  return send({command,base:shown.current.state,status:'queued',createdAt:new Date().toISOString()});
 },[loaded,notify,send]);
 const retry=useCallback(async()=>{const draft=pending.current;if(draft?.status==='queued')return send(draft);},[send]);
 const resolve=useCallback(async(id:string,reviewedRevision:number)=>{
  const list=await localStore.drafts(),draft=list.find(d=>d.command.requestId===id);
  if(!draft||!['conflict','upgrade'].includes(draft.status)||writing.current)return;
  // Use exactly the revision the user compared. A later update must conflict again.
  const replacement:Draft={...draft,command:{...draft.command,revision:reviewedRevision,protocol:WRITE_PROTOCOL,requestId:crypto.randomUUID()},status:'queued',error:undefined,uncertain:false};
  await localStore.save(replacement);await localStore.remove(id);await reloadDrafts();return send(replacement);
 },[reloadDrafts,send]);
 const discard=useCallback(async(id:string)=>{if(writing.current)return;await localStore.remove(id);await reloadDrafts();editing.current=false;if(latest.current)accept(latest.current,true);channel.current?.postMessage('drafts');},[accept,reloadDrafts]);
 const cancel=useCallback(async(draft:Draft)=>{try{const r=await fetch('/api/commands',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:draft.command.requestId,protocol:WRITE_PROTOCOL})}),result=await r.json();if(!r.ok)throw new Error(result.error);await send(draft);}catch(e){notify(e instanceof Error?e.message:'暂时无法停止请求');}},[send,notify]);
 const finishEditing=useCallback(()=>{editing.current=false;if(latest.current&&!pending.current&&!writing.current)accept(latest.current,true);},[accept]);
 useEffect(()=>{
  let active=true;
  void (async()=>{try{const cache=await localStore.snapshot();await reloadDrafts();if(active&&cache&&!latest.current){shown.current=cache;setSnap(cache);setLoaded(true);}}catch{notify('此浏览器无法使用本机备份；保存前会再次检查。');}finally{ready.current=true;if(active)await refresh();}})();
  const tick=()=>{if(document.visibilityState==='visible'){void refresh();const draft=pending.current;if(draft?.status==='queued'&&!draft.uncertain&&!writing.current&&navigator.onLine)void send(draft);}};
  const interval=window.setInterval(tick,15000);
  const offline=()=>setOnline(false);
  window.addEventListener('online',tick);window.addEventListener('offline',offline);window.addEventListener('focus',tick);document.addEventListener('visibilitychange',tick);
  if('BroadcastChannel' in window){channel.current=new BroadcastChannel('studyflow-sync-v2');channel.current.onmessage=()=>{void reloadDrafts().then(()=>refresh());};}
  const unload=(e:BeforeUnloadEvent)=>{if(writing.current||editing.current){e.preventDefault();}};window.addEventListener('beforeunload',unload);
  return()=>{active=false;window.clearInterval(interval);window.removeEventListener('online',tick);window.removeEventListener('offline',offline);window.removeEventListener('focus',tick);document.removeEventListener('visibilitychange',tick);window.removeEventListener('beforeunload',unload);channel.current?.close();};
 },[notify,refresh,reloadDrafts,send]);
 return {snap,loaded,busy,online,error,lastSync,cloud,drafts,run,refresh,retry,resolve,discard,cancel,finishEditing,markEditing:()=>{editing.current=true;},cloudAhead:!!cloud&&cloud.revision>snap.revision};
}
export type CloudSync=ReturnType<typeof useCloudSync>;
