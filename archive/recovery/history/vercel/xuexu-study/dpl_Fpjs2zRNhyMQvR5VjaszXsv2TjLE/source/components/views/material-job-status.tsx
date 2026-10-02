'use client';
import {useEffect,useRef,useState} from 'react';
import {type Material} from '@/lib/model';
import {type Actions} from '@/components/study-app';
import {Button} from '@/components/ui/button';
export type JobStatus={materialId:string;status:string;done:number;pages:number;error?:string};
export function useMaterialJobs(materials:Material[],actions:Actions){
 const [jobs,setJobs]=useState<JobStatus[]>([]);const attempted=useRef(new Set<string>()),latest=useRef({materials,actions});latest.current={materials,actions};
 async function start(id:string){try{const r=await fetch('/api/material-jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});const data=await r.json();if(!r.ok)throw new Error(data.error);latest.current.actions.notify('已加入电脑处理队列，处理结果会同步回网站。');}catch(e){latest.current.actions.notify(e instanceof Error?e.message:'后台任务启动失败。');}}
 useEffect(()=>{let stop=false;const finished=new Set<string>();async function poll(){try{const r=await fetch('/api/material-jobs');if(!r.ok)return;const data=await r.json();if(stop)return;const list:JobStatus[]=data.jobs??[];setJobs(list);
  for(const m of latest.current.materials)if(!m.url&&!m.analysis&&!list.some(j=>j.materialId===m.id)&&!attempted.current.has(m.id)){attempted.current.add(m.id);void start(m.id);}
  for(const j of list)if(j.status==='complete'&&!finished.has(j.materialId)){finished.add(j.materialId);void latest.current.actions.refresh();}
 }catch{/* The next poll retries without changing user content. */}}void poll();const interval=setInterval(()=>void poll(),6000);return()=>{stop=true;clearInterval(interval);};},[]);
 return {jobs,start};
}
export function MaterialJobStatus({material,job,onRetry}:{material:Material;job?:JobStatus;onRetry:()=>void}){
 if(!job)return <span className={'content-status '+(material.status==='ready'?'green':'amber')}>{material.status==='ready'?'可用于规划':material.kind==='pdf'?'等待自动识别':'尚无可读正文'}</span>;
 const label:Record<string,string>={'awaiting-device':'等待电脑处理','device-processing':'电脑正在识别与整理',queued:'等待处理',starting:'正在启动',extracting:'正在提取文字',recognizing:'正在识别扫描页',publishing:'正在整理内容',complete:'全文已处理',paused:'处理暂停',conflict:'正文有更新，结果已保留'};
 return <div className="material-job" role="status"><span className={'content-status '+(job.status==='complete'?'green':'amber')}>{label[job.status]??job.status}{job.pages?' · '+job.done+'/'+job.pages+' 页':''}</span>{!['complete','paused','conflict'].includes(job.status)&&<small>电脑在线并运行处理任务后继续，网页可关闭</small>}{job.error&&<p>{job.error}</p>}{job.done>0&&<a className="text-link" href={'/api/material-jobs?id='+material.id+'&text=1'} target="_blank" rel="noopener noreferrer">查看已识别文字</a>}{job.status==='paused'&&<Button size="sm" variant="outline" onClick={onRetry}>继续处理</Button>}</div>;
}
