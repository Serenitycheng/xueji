import type {Snapshot,StudyState} from './model';
import {readStoredState} from './data-protection';
export type Command=Record<string,unknown>&{op:string;requestId:string;revision:number;protocol:number};
export type Draft={command:Command;base:StudyState;createdAt:string;status:'queued'|'conflict'|'failed'|'upgrade';error?:string;uncertain?:boolean};
export function canPersist(command:Command){return !command.op.startsWith('key.');}
function openStore():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const r=indexedDB.open('studyflow-local-v2',1);r.onupgradeneeded=()=>r.result.createObjectStore('records');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function access<T>(mode:IDBTransactionMode,action:(s:IDBObjectStore,done:(v:T)=>void)=>void):Promise<T>{const db=await openStore();return new Promise((resolve,reject)=>{const tx=db.transaction('records',mode);let value:T;tx.oncomplete=()=>{db.close();resolve(value);};tx.onerror=tx.onabort=()=>{db.close();reject(tx.error??new Error('无法保留本机草稿'));};action(tx.objectStore('records'),v=>{value=v;});});}
export const localStore={
 async cache(snapshot:Snapshot){return access<void>('readwrite',(s,done)=>{const r=s.get('snapshot');r.onsuccess=()=>{if(!r.result||r.result.revision<=snapshot.revision)s.put(snapshot,'snapshot');done();};});},
 async snapshot(){return access<Snapshot|undefined>('readonly',(s,done)=>{const r=s.get('snapshot');r.onsuccess=()=>{if(!r.result)return done(undefined);try{done({...r.result,state:readStoredState(JSON.stringify(r.result.state))});}catch{done(undefined);}};});},
 async save(draft:Draft){if(!canPersist(draft.command))throw new Error('密钥不能写入本机草稿');return access<void>('readwrite',(s,done)=>{s.put(draft,'draft:'+draft.command.requestId);done();});},
 async drafts(){return access<Draft[]>('readonly',(s,done)=>{const r=s.openCursor();const rows:Draft[]=[];r.onsuccess=()=>{const c=r.result;if(c){if(String(c.key).startsWith('draft:'))rows.push(c.value);c.continue();}else done(rows.sort((a,b)=>a.createdAt.localeCompare(b.createdAt)));};});},
 async remove(id:string){return access<void>('readwrite',(s,done)=>{s.delete('draft:'+id);done();});},
 async clear(){return access<void>('readwrite',(s,done)=>{s.clear();done();});},
};
